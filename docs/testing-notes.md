# Testing notes

## Automated (pytest)

Run `python -m pytest -q` from the project root. Current result: **85 passed**.

| File | What it covers |
|---|---|
| `tests/test_game.py` | Engine: new game, correct/incorrect guesses, case-insensitivity, win, loss, win on last life, invalid/duplicate guesses (state unchanged), no guesses after the end, word hidden while playing and revealed after |
| `tests/test_words.py` | Word loading (clean, deduplicated), all 3 difficulties, random selection, invalid difficulty, empty list |
| `tests/test_api.py` | Every endpoint with Flask's test client: create for each difficulty (201), guess (200), GET state, bad JSON / wrong content type / bad difficulty / bad letter (400), unknown id (404), JSON 404/405, win and loss paths, new game after finishing, hidden word during play, 60 complete random games |

## Manual browser checks (built-in browser, server on http://127.0.0.1:5000)

- Page loads and starts a game automatically; New Game starts another without reloading.
- Mouse (on-screen letters) and physical keyboard both guess; used letters are disabled and coloured.
- Duplicate key press: no request is sent; a short message is shown.
- Non-letter keys (1, Enter, ?, arrows, space, Tab): 0 `fetch` calls.
- Loss: 6th wrong letter shows all six body parts, the word, and a red message. Missed letters are shown in red.
- Win: green message; New Game afterwards gives a fresh board (0 body parts, 26 enabled keys).
- Mobile width (375 px): layout stacks and stays usable.
- Network tab: `POST /api/games` -> 201; `POST /api/games/<id>/guess` -> 200 with JSON such as
  `{"difficulty":"easy","guessed_letters":[...],"incorrect_letters":[...],"max_guesses":6,"pattern":"f r e s h","remaining_guesses":2,"status":"won","word":"fresh"}`.
  The `word` key appears only when `status` is `won` or `lost`.

## Bugs / issues found while testing

1. **Cosmetic:** the stats panel showed "6 OF 6" and "NONE" because of a blanket `text-transform: uppercase`. Fixed: only letters are upper-cased (in JS).
2. **Stale game after a server restart:** after stopping and restarting the server, a guess in an open page returned the raw message "unknown game". Fixed: the page now says the game no longer exists and tells the player to press New Game. (Render's free tier also restarts and forgets games, so this can really happen.)
3. **Design hardening (not an observed failure):** fast typing could in principle fire overlapping requests whose responses arrive out of order. The client therefore queues guesses so they are sent and rendered in order, and drops queued guesses if a new game starts.
4. **Usability:** after a loss the board only showed the word in the message. Now the missing letters are also drawn in red in the word slots.
