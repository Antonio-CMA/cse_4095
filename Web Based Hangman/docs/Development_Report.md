# Web-Based Hangman: Development Report

**Course:** CSE 4095 | **Author:** Antonio Ayala | **AI agent:** Claude Code (Claude Sonnet 5.5)
**GitHub:** https://github.com/Antonio-CMA/cse_4095 (folder `Web Based Hangman`) | **Live site:** `[ADD RENDER URL]`

> **How to read this draft.** Sections marked **[STUDENT: review/rewrite]** are first-person
> content drafted for you. Replace them with your own words and delete this note before submitting.

## 1. Development process with the AI agent

I treated the agent as a pair programmer working to a written plan. I gave it the specification and
the original 14-phase TODO and asked it to **plan first and not implement yet**. It produced a revised
`TODO.md` with five phases (engine and words, Flask API, browser client, testing and debugging,
deployment). Items from the original plan outside this assignment (terminal client, bots, evaluation,
scoring, leaderboard, replay) were kept in an "out of scope" table instead of being silently deleted.
I approved the plan before any code was written. The instructor's Cursor transcript was used only as a
guide to the process (plan, then one phase at a time), not as a source of code.

Each phase followed the same loop: implement, write tests in the same phase, run them, tick the boxes in
`TODO.md` only after they were verified, and make one git commit. The history therefore reads as
the plan: one commit per phase.

## 2. Implementation

- **Engine (`game.py`)**: a `HangmanGame` class with no Flask or browser imports. It validates guesses
  (one letter a-z, no repeats, none after the game ends), tracks correct and incorrect letters, builds the
  masked pattern, detects win/loss (6 incorrect guesses) and returns a *client-safe* dict that includes
  `word` only when the game is over. `word_manager.py` loads the three word lists and picks a random word.
- **Server (`server.py`)**: Flask with an in-memory dict of games and random 12-hex-character game ids.
  `POST /api/games` (201), `GET /api/games/<id>` (200) and `POST /api/games/<id>/guess` (200) validate input
  and return `400` / `404` JSON errors (bad JSON, bad difficulty, bad letter, duplicate, unknown id). The
  server also serves the web page.
- **Browser (`static/`)**: HTML, CSS and `app.js` using `fetch()`. Difficulty selector, New Game without reload,
  on-screen and physical keyboard, masked word, guessed/wrong letters, guesses left, an SVG drawing that adds
  one body part per wrong guess, and win/loss messages. The JavaScript contains no rules and no word list.

## 3. Testing

85 automated pytest tests cover the engine, word loading and the API: all three difficulties, correct and
incorrect guesses, repeated and invalid letters, win and loss paths, new game after finishing, bad JSON, bad
difficulty, unknown ids, and that `word` is absent while playing. I also drove the running app in a browser:
mouse and keyboard play, a win, a loss, New Game afterwards, a phone-sized window, non-letter keys sending no
requests, and I inspected the guess requests and JSON responses in the network log (`word` appeared only
when `status` was `won` or `lost`).

## 4. Deployment

The app runs on a Render Web Service from the GitHub repository (root directory `Web Based Hangman`). Build
command `pip install -r requirements.txt`; start command
`gunicorn --bind 0.0.0.0:$PORT --workers 1 server:app`. One worker is required because games are stored in
memory inside the process. No secrets or environment variables are needed. **[ADD: date deployed and what you
checked on the live URL.]**

## 5. A challenge and how it was resolved  **[STUDENT: review/rewrite]**

*Draft:* The hardest design issue was keeping the game state on the server. Games live in a Python dict, so
the server forgets them when it restarts, and with more than one gunicorn worker a guess can be routed to a
process that never saw the game. When I restarted the local server with the page still open, a guess returned a
confusing "unknown game" error. I resolved it in two ways: the deployment uses exactly one worker (and the
README explains why), and the browser now recognises the 404 and tells the player to press New Game. I added
this as a documented limitation rather than adding a database, which was out of scope.

## 6. Reflection on AI-assisted development  **[STUDENT: review/rewrite]**

*Draft:* Planning first made the AI much more useful: a short, approved plan kept it from building features the
assignment did not ask for, and verifying before ticking a box meant the TODO file stayed trustworthy. The agent
was fastest at boilerplate (tests, validation, CSS) and at checking edge cases I would have missed, such as
rejecting duplicate guesses without a penalty. I still had to decide the scope, review the design choices (for
example, rejecting duplicates and keeping the word out of every playing-state response) and be able to explain
each file. The risk is accepting code I do not understand, so I read every phase before committing. **[ADD: what
you would do differently next time.]**

## 7. Representative prompts  **[STUDENT: replace with your exact wording]**

1. *Planning:* "Read the specification and TODO. Revise TODO.md into phases for only the required features:
   game engine, Flask API, browser client, testing, deployment. Mark the rest out of scope. Do not implement
   anything yet."
2. *Implementation:* "Implement Phase 2 (Flask server and REST API). Write pytest tests for each endpoint,
   including bad JSON, bad difficulty and unknown ids. Run the tests, update TODO.md only after they pass,
   then commit."
3. *Verification:* "Run the app, play a game in the browser, and show me one guess request and its JSON response
   to prove the hidden word is not sent while the game is in progress."
