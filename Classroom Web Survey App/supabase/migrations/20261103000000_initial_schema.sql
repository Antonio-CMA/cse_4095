-- Classroom Survey Web App — initial schema, RLS policies and RPC functions.
-- Run this whole file once in the Supabase SQL Editor (or `supabase db push`).
-- Source of truth: DATABASE.md and API.md.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table surveys (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    status text not null default 'draft'
        check (status in ('draft', 'active', 'closed', 'archived')),
    public_slug text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index surveys_status_idx on surveys(status);

create table questions (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    question_text text not null,
    question_type text not null
        check (question_type in ('multiple_choice', 'true_false')),
    position integer not null,
    created_at timestamptz not null default now()
);
create index questions_survey_id_idx on questions(survey_id);

create table choices (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references questions(id) on delete cascade,
    choice_text text not null,
    position integer not null,
    created_at timestamptz not null default now()
);
create index choices_question_id_idx on choices(question_id);

create table responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references surveys(id) on delete cascade,
    anonymous_token text,
    submitted_at timestamptz not null default now()
);
create index responses_survey_id_idx on responses(survey_id);
create index responses_submitted_at_idx on responses(submitted_at);
-- Duplicate-submission protection: one response per browser token per survey.
create unique index responses_unique_student_per_survey
    on responses(survey_id, anonymous_token)
    where anonymous_token is not null;

create table answers (
    id uuid primary key default gen_random_uuid(),
    response_id uuid not null references responses(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    choice_id uuid references choices(id) on delete set null,
    text_answer text,
    created_at timestamptz not null default now(),
    unique (response_id, question_id)
);
create index answers_response_id_idx on answers(response_id);
create index answers_question_id_idx on answers(question_id);
create index answers_choice_id_idx on answers(choice_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger surveys_updated_at
before update on surveys
for each row
execute function update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. Only one active survey at a time (enforced by the database)
-- ---------------------------------------------------------------------------

create unique index only_one_active_survey
    on surveys ((status))
    where status = 'active';

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table surveys   enable row level security;
alter table questions enable row level security;
alter table choices   enable row level security;
alter table responses enable row level security;
alter table answers   enable row level security;

-- Students (anon) may READ only active surveys, and only their questions/choices.
-- They get NO policy at all on responses/answers: they cannot read results and
-- cannot insert directly. Submissions go through submit_survey_response() below.
create policy "students read active surveys"
on surveys for select to anon
using (status = 'active');

create policy "students read active survey questions"
on questions for select to anon
using (exists (
    select 1 from surveys
    where surveys.id = questions.survey_id and surveys.status = 'active'
));

create policy "students read active survey choices"
on choices for select to anon
using (exists (
    select 1 from questions
    join surveys on surveys.id = questions.survey_id
    where questions.id = choices.question_id and surveys.status = 'active'
));

-- Instructor (any authenticated user; disable public sign-ups in Supabase Auth!).
create policy "authenticated users manage surveys"
on surveys for all to authenticated using (true) with check (true);

create policy "authenticated users manage questions"
on questions for all to authenticated using (true) with check (true);

create policy "authenticated users manage choices"
on choices for all to authenticated using (true) with check (true);

create policy "authenticated users manage responses"
on responses for all to authenticated using (true) with check (true);

create policy "authenticated users manage answers"
on answers for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. RPC: student-facing
-- ---------------------------------------------------------------------------

-- Tells the student page *why* a slug is not available (closed vs. not found)
-- without exposing any survey content.
create or replace function survey_public_status(p_slug text)
returns text
language sql
security definer
set search_path = public
as $$
    select status from surveys where public_slug = p_slug limit 1;
$$;

-- Atomic, validated submission. Error codes (raised as the exception message):
-- SURVEY_NOT_ACTIVE, DUPLICATE_RESPONSE, INVALID_QUESTION, INVALID_CHOICE,
-- MISSING_REQUIRED_ANSWER.
create or replace function submit_survey_response(
    p_survey_id uuid,
    p_anonymous_token text,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_response_id uuid;
    v_item jsonb;
    v_question_id uuid;
    v_choice_id uuid;
    v_question_count integer;
    v_answer_count integer;
begin
    if not exists (select 1 from surveys where id = p_survey_id and status = 'active') then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;

    if p_anonymous_token is null or length(p_anonymous_token) < 8 or length(p_anonymous_token) > 100 then
        raise exception 'INVALID_QUESTION';
    end if;

    if jsonb_typeof(p_answers) is distinct from 'array' then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    if exists (select 1 from responses
               where survey_id = p_survey_id and anonymous_token = p_anonymous_token) then
        raise exception 'DUPLICATE_RESPONSE';
    end if;

    select count(*) into v_question_count from questions where survey_id = p_survey_id;
    select count(distinct (e->>'question_id')) into v_answer_count
        from jsonb_array_elements(p_answers) e;

    if v_answer_count < v_question_count then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;
    if jsonb_array_length(p_answers) <> v_question_count then
        raise exception 'INVALID_QUESTION';
    end if;

    insert into responses (survey_id, anonymous_token)
    values (p_survey_id, p_anonymous_token)
    returning id into v_response_id;

    for v_item in select * from jsonb_array_elements(p_answers) loop
        begin
            v_question_id := (v_item->>'question_id')::uuid;
            v_choice_id := (v_item->>'choice_id')::uuid;
        exception when others then
            raise exception 'INVALID_QUESTION';
        end;

        if not exists (select 1 from questions
                       where id = v_question_id and survey_id = p_survey_id) then
            raise exception 'INVALID_QUESTION';
        end if;

        if v_choice_id is null or not exists (select 1 from choices
                       where id = v_choice_id and question_id = v_question_id) then
            raise exception 'INVALID_CHOICE';
        end if;

        insert into answers (response_id, question_id, choice_id)
        values (v_response_id, v_question_id, v_choice_id);
    end loop;

    return jsonb_build_object('success', true, 'response_id', v_response_id);
exception
    when unique_violation then
        -- two taps racing with the same token
        raise exception 'DUPLICATE_RESPONSE';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: instructor-facing
-- ---------------------------------------------------------------------------

-- Close any active survey, give the requested one a slug, and activate it.
create or replace function activate_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_survey surveys;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    select * into v_survey from surveys where id = p_survey_id for update;
    if not found then
        raise exception 'SURVEY_NOT_FOUND';
    end if;
    if v_survey.status = 'archived' then
        raise exception 'SURVEY_ARCHIVED';
    end if;
    if not exists (select 1 from questions where survey_id = p_survey_id) then
        raise exception 'SURVEY_HAS_NO_QUESTIONS';
    end if;

    update surveys set status = 'closed'
        where status = 'active' and id <> p_survey_id;

    update surveys
        set status = 'active',
            public_slug = coalesce(public_slug,
                substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
        where id = p_survey_id
        returning * into v_survey;

    return jsonb_build_object(
        'id', v_survey.id,
        'status', v_survey.status,
        'public_slug', v_survey.public_slug
    );
end;
$$;

create or replace function close_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_survey surveys;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;
    update surveys set status = 'closed'
        where id = p_survey_id and status = 'active'
        returning * into v_survey;
    if not found then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;
    return jsonb_build_object('id', v_survey.id, 'status', v_survey.status);
end;
$$;

-- Create or replace a DRAFT survey with all of its questions/choices atomically.
-- p_questions: [{ "question_text": "...", "question_type": "multiple_choice"|"true_false",
--                 "choices": ["A", "B", ...] }, ...]   (array order = position)
-- Runs as the caller (SECURITY INVOKER), so RLS restricts it to the instructor.
create or replace function save_survey(
    p_survey_id uuid,
    p_title text,
    p_description text,
    p_questions jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
    v_id uuid := p_survey_id;
    v_status text;
    v_q jsonb;
    v_qpos integer;
    v_qid uuid;
    v_type text;
    v_choice jsonb;
    v_cpos integer;
    v_choice_count integer;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;
    if p_title is null or length(btrim(p_title)) = 0 then
        raise exception 'TITLE_REQUIRED';
    end if;
    if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) = 0 then
        raise exception 'QUESTIONS_REQUIRED';
    end if;

    if v_id is null then
        insert into surveys (title, description)
        values (btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''))
        returning id into v_id;
    else
        select status into v_status from surveys where id = v_id for update;
        if not found then
            raise exception 'SURVEY_NOT_FOUND';
        end if;
        if v_status <> 'draft' then
            raise exception 'SURVEY_NOT_EDITABLE';
        end if;
        update surveys
            set title = btrim(p_title),
                description = nullif(btrim(coalesce(p_description, '')), '')
            where id = v_id;
        delete from questions where survey_id = v_id;  -- cascades to choices
    end if;

    v_qpos := 0;
    for v_q in select * from jsonb_array_elements(p_questions) loop
        v_qpos := v_qpos + 1;
        v_type := v_q->>'question_type';
        if v_type not in ('multiple_choice', 'true_false') then
            raise exception 'INVALID_QUESTION_TYPE';
        end if;
        if length(btrim(coalesce(v_q->>'question_text', ''))) = 0 then
            raise exception 'QUESTION_TEXT_REQUIRED';
        end if;

        insert into questions (survey_id, question_text, question_type, position)
        values (v_id, btrim(v_q->>'question_text'), v_type, v_qpos)
        returning id into v_qid;

        if v_type = 'true_false' then
            insert into choices (question_id, choice_text, position)
            values (v_qid, 'True', 1), (v_qid, 'False', 2);
        else
            v_cpos := 0;
            v_choice_count := 0;
            for v_choice in select * from jsonb_array_elements(coalesce(v_q->'choices', '[]'::jsonb)) loop
                if length(btrim(v_choice #>> '{}')) = 0 then
                    raise exception 'CHOICE_TEXT_REQUIRED';
                end if;
                v_cpos := v_cpos + 1;
                v_choice_count := v_choice_count + 1;
                insert into choices (question_id, choice_text, position)
                values (v_qid, btrim(v_choice #>> '{}'), v_cpos);
            end loop;
            if v_choice_count < 2 then
                raise exception 'AT_LEAST_TWO_CHOICES';
            end if;
        end if;
    end loop;

    return v_id;
end;
$$;

-- Copy a survey (title, description, questions, choices — never responses) as a draft.
create or replace function duplicate_survey(p_survey_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
    v_new_id uuid;
    v_q questions;
    v_new_qid uuid;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    insert into surveys (title, description)
    select 'Copy of ' || title, description from surveys where id = p_survey_id
    returning id into v_new_id;
    if v_new_id is null then
        raise exception 'SURVEY_NOT_FOUND';
    end if;

    for v_q in select * from questions where survey_id = p_survey_id order by position loop
        insert into questions (survey_id, question_text, question_type, position)
        values (v_new_id, v_q.question_text, v_q.question_type, v_q.position)
        returning id into v_new_qid;

        insert into choices (question_id, choice_text, position)
        select v_new_qid, choice_text, position from choices where question_id = v_q.id;
    end loop;

    return v_new_id;
end;
$$;

-- Aggregated results (counts + percentages) computed in the database.
-- SECURITY INVOKER: RLS means only the instructor can see any rows.
create or replace function get_survey_results(p_survey_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
    v_count integer;
    v_questions jsonb;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    select count(*) into v_count from responses where survey_id = p_survey_id;

    select coalesce(jsonb_agg(qj order by (qj->>'position')::int), '[]'::jsonb)
    into v_questions
    from (
        select jsonb_build_object(
            'question_id', q.id,
            'question_text', q.question_text,
            'question_type', q.question_type,
            'position', q.position,
            'response_count', (select count(*) from answers a where a.question_id = q.id),
            'choices', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'choice_id', c.id,
                    'choice_text', c.choice_text,
                    'count', cnt.n,
                    'percentage', case when tot.n = 0 then 0
                                       else round(cnt.n * 100.0 / tot.n, 1) end
                ) order by c.position), '[]'::jsonb)
                from choices c
                cross join lateral (
                    select count(*) as n from answers a where a.choice_id = c.id
                ) cnt
                cross join lateral (
                    select count(*) as n from answers a where a.question_id = q.id
                ) tot
                where c.question_id = q.id
            )
        ) as qj
        from questions q
        where q.survey_id = p_survey_id
    ) s;

    return jsonb_build_object(
        'survey_id', p_survey_id,
        'response_count', v_count,
        'questions', v_questions
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Function privileges (functions are executable by PUBLIC by default)
-- ---------------------------------------------------------------------------

revoke all on function survey_public_status(text) from public;
revoke all on function submit_survey_response(uuid, text, jsonb) from public;
revoke all on function activate_survey(uuid) from public;
revoke all on function close_survey(uuid) from public;
revoke all on function save_survey(uuid, text, text, jsonb) from public;
revoke all on function duplicate_survey(uuid) from public;
revoke all on function get_survey_results(uuid) from public;

grant execute on function survey_public_status(text) to anon, authenticated;
grant execute on function submit_survey_response(uuid, text, jsonb) to anon, authenticated;
grant execute on function activate_survey(uuid) to authenticated;
grant execute on function close_survey(uuid) to authenticated;
grant execute on function save_survey(uuid, text, text, jsonb) to authenticated;
grant execute on function duplicate_survey(uuid) to authenticated;
grant execute on function get_survey_results(uuid) to authenticated;
