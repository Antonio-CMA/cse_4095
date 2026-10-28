# Demo video checklist (2-3 minutes)

Record the **deployed Render page** (https://YOUR-SERVICE.onrender.com), not localhost.
Tip: open the page once a minute before recording, because Render's free tier sleeps and the
first request can take up to a minute.

Before recording: open Chrome DevTools (F12) and pick the **Network** tab with the **Fetch/XHR**
filter, so requests appear as you play. Keep DevTools docked at the side or bottom.

| Time | Show | Say (in your own words) |
|---|---|---|
| 0:00 | Deployed page in the address bar (https, onrender.com) | What the project is: Flask server holds the game, browser only displays it. |
| 0:15 | Pick **Medium**, press **New Game** | A `POST /api/games` request appears in the Network tab. Click it: Payload `{"difficulty":"medium"}`, Response has `game_id`, `pattern`, 6 guesses, status `playing`, and **no word**. |
| 0:45 | Click a few letters, then type a few on the keyboard | Both input methods work. Right letters turn green and fill the word; wrong letters turn red and add a body part to the drawing. Point out guesses left / wrong letters. |
| 1:15 | Click one `guess` request in Network | Show the request `{"letter":"e"}` and the JSON response (`pattern`, `incorrect_letters`, `remaining_guesses`, `status`). Say the word is only sent when the game ends. |
| 1:35 | Try a letter you already used | Nothing is sent / the page says it was already guessed. (Optional: mention the server also rejects it with 400.) |
| 1:50 | Finish a game (win or lose) | Show the final message, the full drawing on a loss, and the final response containing `"word"`. |
| 2:15 | Press **New Game** (try **Hard**) | A fresh board appears without a page reload. |
| 2:35 | Quick wrap-up | Mention `pytest` (85 tests), the repo on GitHub, and that deployment uses gunicorn with one worker because games are stored in memory. |

Optional extras if you have time: resize the window to show it works on a phone-sized screen;
open `/api/games/<game_id>` in a new tab to show the GET endpoint.
