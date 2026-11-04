-- Supabase grants EXECUTE on new functions to `anon` through default privileges, so
-- "revoke ... from public" in the first migration does not remove it. The instructor RPCs
-- already reject callers without a session (AUTH_REQUIRED), but defence in depth:
-- remove the grant so anonymous callers cannot even invoke them.

revoke execute on function activate_survey(uuid) from anon;
revoke execute on function close_survey(uuid) from anon;
revoke execute on function save_survey(uuid, text, text, jsonb) from anon;
revoke execute on function duplicate_survey(uuid) from anon;
revoke execute on function get_survey_results(uuid) from anon;
