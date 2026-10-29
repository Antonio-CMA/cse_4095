# Web-Based Hangman

A Hangman game for CSE 4095. A **Python/Flask server** holds all the game rules and the
secret word; a **browser client** (HTML, CSS, JavaScript with `fetch()`) only displays the
state the server sends back.

```
Browser (static/)  --HTTP/JSON-->  server.py (Flask)  -->  game.py (engine)
                                                      -->  word_manager.py + words/*.txt
```

| File | Role |
|---|---|
| `game.py` | Game engine: one game's rules. Knows nothing about Flask or the browser. |
| `word_manager.py` | Loads `words/easy.txt`, `medium.txt`, `hard.txt` and picks a random word. |
| `server.py` | Flask app: REST API, in-memory game storage, serves the web page. |
| `static/index.html`, `style.css`, `app.js` | The browser client. No game logic and no word list. |
| `tests/` | pytest tests for the engine, word manager and API. |
| `TODO.md` | The revised phase plan (with items marked out of scope). |
| `docs/` | Original specification and TODO, plus testing notes and the development report. |

## Run it locally

Requires Python 3.10 or newer.

```bash
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1      Windows (Git Bash): source .venv/Scripts/activate
# macOS / Linux:         source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Open <http://127.0.0.1:5000>. Pick a difficulty, press **New Game**, then click the on-screen
letters or type on your keyboard.

### Run the tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

## Game rules

- The server picks a random word for the chosen difficulty (easy 4-7 letters, medium 5-9, hard 8-12).
- Guess one letter at a time (a-z, case-insensitive). You may make **6 incorrect guesses**.
- Repeating a letter or sending something that is not a single letter is rejected (HTTP 400)
  and does not cost a guess.
- You win when every letter is found, and lose on the 6th incorrect guess. After that no more
  guesses are accepted.
- The word is sent to the browser **only after the game has ended**.

## REST API

All bodies are JSON. Errors always look like `{"error": "message"}`.

### `POST /api/games` - start a game

Request: `{"difficulty": "easy" | "medium" | "hard"}` (required, case-insensitive)

Response `201 Created`:

```json
{
  "game_id": "3c195c67727e",
  "difficulty": "easy",
  "pattern": "_ _ _ _ _",
  "guessed_letters": [],
  "incorrect_letters": [],
  "remaining_guesses": 6,
  "max_guesses": 6,
  "status": "playing"
}
```

### `GET /api/games/{game_id}` - current state

Response `200 OK`: the same object as above without `game_id`. Unknown id: `404`.

### `POST /api/games/{game_id}/guess` - guess a letter

Request: `{"letter": "e"}`

Response `200 OK`:

```json
{
  "difficulty": "easy",
  "pattern": "_ _ _ _ e",
  "guessed_letters": ["e"],
  "incorrect_letters": [],
  "remaining_guesses": 6,
  "max_guesses": 6,
  "status": "playing"
}
```

When `status` becomes `"won"` or `"lost"` the response also contains `"word": "voice"`.
That is the only time `word` is ever present.

### Status codes

| Code | When |
|---|---|
| 200 | State returned / guess accepted |
| 201 | Game created |
| 400 | Body is not a JSON object, `difficulty` missing or not easy/medium/hard, `letter` missing or not a single letter, duplicate letter, or the game is already over |
| 404 | Unknown game id or unknown route |
| 405 | Wrong HTTP method for a route |

### Try it with curl

```bash
curl -s -X POST http://127.0.0.1:5000/api/games -H "Content-Type: application/json" -d '{"difficulty":"easy"}'
curl -s -X POST http://127.0.0.1:5000/api/games/GAME_ID/guess -H "Content-Type: application/json" -d '{"letter":"e"}'
curl -s http://127.0.0.1:5000/api/games/GAME_ID
```

### Differences from the specification

The spec's examples are a subset of what this server returns. I added `difficulty` and
`max_guesses` (so the browser need not hard-code 6) and return the full state from
`POST /api/games` together with `game_id`. Duplicate guesses are **rejected** (the spec allows
"ignored or rejected"). `difficulty` is required when creating a game.

## Deploy to Render

The app is a standard Flask app, so it runs on a Render **Web Service**.

1. Push this project to GitHub. If it lives in a sub-folder of a larger repository (as it does in
   `cse_4095/Web Based Hangman`), remember the folder name for the next step.
2. In Render: **New > Web Service**, connect the GitHub repository.
3. Settings:
   - **Root Directory:** `Web Based Hangman` (leave empty if the project is the repository root)
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 server:app`
   - **Instance type:** Free
4. Deploy, then open the `https://<name>.onrender.com` URL.

**Why exactly one worker?** Games are stored in a Python dict inside the server process. Two
worker processes would each have their own dict, so a guess could reach a worker that never saw
the game and return 404.

No environment variables or secrets are needed.

## Known limitations

- **Games live in memory.** Restarting or redeploying the server (or Render's free tier going to
  sleep after about 15 minutes of inactivity) erases all games. The browser then reports that the
  game no longer exists and the player starts a new one.
- **Free-tier cold start:** the first request after a sleep can take 30-60 seconds.
- **Single process only** (see above). Scaling out would need a shared store such as a database.
- The server keeps at most 5000 games and silently drops the oldest beyond that.
- No accounts: anyone who knows a game id can play that game.
- `gunicorn` does not run on Windows, so locally the app is started with `python server.py`
  (Flask's development server); gunicorn is used only on Render.
- Out of scope for this assignment (see `TODO.md`): terminal client, bots, evaluation, scoring,
  leaderboard, replay/logging.

## Specification

The original assignment specification is kept in `Specification.md`; the
original 14-phase TODO is in `docs/Original_TODO.md`; the revised plan is `TODO.md`.
