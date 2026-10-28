"""Flask server: the REST API for Hangman plus the static web page.

The server is authoritative. Each game lives here, in memory, and the browser
only ever sees the client-safe state produced by HangmanGame.to_dict().

Because games are kept in a plain dict, run ONE worker process (see README).
"""

import secrets
from collections import OrderedDict
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from game import HangmanGame, InvalidGuess
from word_manager import InvalidDifficulty, WordManager

MAX_STORED_GAMES = 5000  # oldest games are dropped so memory cannot grow forever

app = Flask(__name__, static_folder="static", static_url_path="/static")
words = WordManager()
games = OrderedDict()  # game_id -> HangmanGame
games_lock = Lock()


def error(message, status):
    return jsonify({"error": message}), status


def get_json_object():
    """Return the request body as a dict, or None if it is not a JSON object."""
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else None


def find_game(game_id):
    with games_lock:
        return games.get(game_id)


# --- pages ------------------------------------------------------------------

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# --- REST API ---------------------------------------------------------------

@app.post("/api/games")
def create_game():
    body = get_json_object()
    if body is None:
        return error("request body must be a JSON object", 400)
    if "difficulty" not in body:
        return error("difficulty is required", 400)

    difficulty = body["difficulty"]
    try:
        word = words.random_word(difficulty)
    except InvalidDifficulty as exc:
        return error(str(exc), 400)

    game = HangmanGame(word, difficulty=difficulty.lower())
    with games_lock:
        game_id = secrets.token_hex(6)
        while game_id in games:  # practically never, but ids must be unique
            game_id = secrets.token_hex(6)
        games[game_id] = game
        while len(games) > MAX_STORED_GAMES:
            games.popitem(last=False)
    return jsonify({"game_id": game_id, **game.to_dict()}), 201


@app.get("/api/games/<game_id>")
def get_game(game_id):
    game = find_game(game_id)
    if game is None:
        return error("unknown game", 404)
    return jsonify(game.to_dict())


@app.post("/api/games/<game_id>/guess")
def guess_letter(game_id):
    game = find_game(game_id)
    if game is None:
        return error("unknown game", 404)

    body = get_json_object()
    if body is None:
        return error("request body must be a JSON object", 400)
    if "letter" not in body:
        return error("letter is required", 400)

    try:
        with games_lock:  # one guess at a time, so two requests cannot interleave
            game.guess(body["letter"])
    except InvalidGuess as exc:
        return error(str(exc), 400)
    return jsonify(game.to_dict())


# --- errors: always answer with JSON ----------------------------------------

@app.errorhandler(HTTPException)
def handle_http_error(exc):
    return error(exc.description, exc.code)


@app.errorhandler(Exception)
def handle_unexpected_error(exc):
    app.logger.exception("unexpected error")
    return error("internal server error", 500)


if __name__ == "__main__":
    # Local development only. In production Render runs gunicorn (see README).
    app.run(host="127.0.0.1", port=5000, debug=False)
