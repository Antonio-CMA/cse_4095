# TODO — Web-Based Hangman (CSE 4095)

Revised plan for the **web-based Hangman** assignment. The original 14-phase plan
(`docs/Original_TODO.md`) covers a much larger system. This file keeps only the
required features and groups them into five phases. The authoritative requirements are
in `docs/Original_Specification.md`.

## Implementation rules

- One phase at a time. Tests are written in the same phase as the code they cover.
- A box is checked **only after** the item has been run/verified. Each phase ends with a commit.
- The game engine (`game.py`) must not import Flask or know about HTTP or the browser.
- The server is authoritative. The hidden word is never sent while `status` is `playing`.
- The browser contains no game engine and never receives the word until the game ends.
- Games are stored in memory, so the production server must run with **one** gunicorn worker.
- No secrets in the repository.

## Out of scope (kept from the original plan, deliberately NOT implemented)

| Original item | Original phase | Status |
|---|---|---|
| Human terminal client (`terminal_client.py`) | 4 | Out of scope |
| Reference bots: random / frequency / dictionary | 6, 7 | Out of scope |
| Evaluation mode, sessions and anti-cheating safeguards | 8, 11 | Out of scope |
| Scoring system | 9 | Out of scope |
| Leaderboard | 10 | Out of scope |
| Logging and replay (`/log`, `/replay`, `replay.py`) | 12 | Out of scope |
| Terminal-client / bot / evaluation / leaderboard tests | 13 | Out of scope |
| Persistent storage, accounts, tournaments, multiplayer | Future | Out of scope |

---

## Phase 1 — Game engine and word management

Replaces original phases 1 and 2. Files: `game.py`, `words/`, `tests/test_game.py`, `tests/test_words.py`.

- [ ] Project skeleton: `game.py`, `words/easy.txt|medium.txt|hard.txt`, `tests/`, `requirements.txt`, `.gitignore`
- [ ] Word loader: read a list, lowercase, keep only alphabetic words, drop duplicates
- [ ] Random word by difficulty (`easy` / `medium` / `hard`); clear error for an unknown difficulty
- [ ] `HangmanGame` class holding the hidden word, guessed letters, incorrect letters, 6-guess limit
- [ ] Guess validation: exactly one letter a–z (case-insensitive), otherwise rejected
- [ ] Duplicate guesses rejected (and do not change state)
- [ ] Masked pattern such as `_ a _ _ e` (letters separated by spaces)
- [ ] Win detection, loss detection, `status` = `playing` / `won` / `lost`
- [ ] No guesses accepted after the game has ended
- [ ] `to_dict()` client-safe state; includes `word` only once the game is over
- [ ] pytest: all three difficulties, correct/incorrect/repeated/invalid guesses, win path, loss path, no guess after end, word hidden while playing

**Done when:** a whole game can be played in a Python shell or unit test with no web server.

## Phase 2 — Flask server and REST API

Replaces original phase 3. Files: `server.py`, `tests/test_api.py`.

- [ ] Flask app object `app` in `server.py`, in-memory dict of games
- [ ] Unique, unguessable game ids (`secrets.token_hex`)
- [ ] `POST /api/games` → 201 with `game_id`, `pattern`, `remaining_guesses`, `status`
- [ ] `GET /api/games/<id>` → 200 with full client-safe state
- [ ] `POST /api/games/<id>/guess` → 200 with updated state
- [ ] Request validation: bad/missing JSON, non-object body, bad difficulty, bad letter → 400 `{"error": ...}`
- [ ] Unknown game id → 404 `{"error": ...}`; unknown API route and wrong method return JSON errors too
- [ ] Serve `static/index.html` at `/` (and the other static files)
- [ ] pytest (Flask test client): create for each difficulty, guess flow, win, loss, new game after finishing, bad JSON, bad difficulty, unknown id, bad letter, duplicate guess, word hidden during play and shown after the end
- [ ] Manually play a full game with `curl`

**Done when:** a full game can be played using only `curl`.

## Phase 3 — Browser client

Replaces original phase 5. Files: `static/index.html`, `static/style.css`, `static/app.js`.

- [ ] Page layout and difficulty selector (Easy / Medium / Hard)
- [ ] **New Game** button using `fetch()` (no page reload)
- [ ] Masked word, guessed letters, incorrect letters, remaining guesses
- [ ] On-screen A–Z keyboard; guessed letters become disabled and colored right/wrong
- [ ] Physical keyboard input (letters only)
- [ ] SVG hangman drawing that adds one part per wrong guess (6 parts)
- [ ] Win and loss messages; the word is shown only at the end; New Game works afterwards
- [ ] Error handling for server/network errors (visible message, no crash)
- [ ] Works at phone and desktop widths; accessible labels and live status text
- [ ] No game logic and no word list in the JavaScript
- [ ] Verified by driving the running app in a browser and inspecting a guess request and its JSON response

**Done when:** a person can play complete games in the browser against the Flask server.

## Phase 4 — Testing and debugging

Replaces original phase 13 (required parts only).

- [ ] Full `pytest` run is green; note the test count in the README
- [ ] Browser walkthrough: win game, loss game, new game after each, keyboard + mouse input, wrong-guess drawing sequence
- [ ] Edge cases checked in the browser: duplicate key press, non-letter keys, server stopped mid-game
- [ ] Bugs found during testing are written down (feeds the development report) and fixed with a regression test where possible
- [ ] Confirm over the real HTTP interface that `word` never appears while `status` is `playing`

**Done when:** automated tests pass and the manual browser checklist has been completed.

## Phase 5 — Documentation and cloud deployment

Replaces original phase 14 (required parts only) plus the Render deployment.

- [ ] `requirements.txt` with `flask` and `gunicorn`
- [ ] Render start command `gunicorn --bind 0.0.0.0:$PORT --workers 1 server:app` (workers must be 1: games live in memory)
- [ ] README: local run instructions, API documentation, deployment notes, known limitations
- [ ] Copy of the original specification included in the repo (`docs/Original_Specification.md`)
- [ ] `.gitignore`; check that there are no secrets
- [ ] Repository layout prepared for GitHub (`Web Based Hangman/` folder in `Antonio-CMA/cse_4095`) — **not pushed until confirmed**
- [ ] Public Render HTTPS service created and verified (done by the student, then smoke-tested)
- [ ] Deployed site verified: page loads, a game can be played, `/api/games` returns JSON over HTTPS
- [ ] Development report (1–2 pages, PDF) with student-written reflection sections
- [ ] Demo-video checklist/script for the student

**Done when:** the repository contains everything required, and the Render URL serves a playable game.

---

## Optional future work (not part of this assignment)

- Persistent database, accounts, multiplayer, WebSocket updates, daily challenge
- Terminal client and bots (the original plan's phases 4, 6, 7), evaluation/leaderboard (8–12)
