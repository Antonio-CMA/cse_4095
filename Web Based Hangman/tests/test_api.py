"""API tests using Flask's test client (no real network needed)."""

import json

import pytest

import server
from word_manager import DIFFICULTIES

STATE_KEYS = {
    "difficulty", "pattern", "guessed_letters", "incorrect_letters",
    "remaining_guesses", "max_guesses", "status",
}


@pytest.fixture
def client():
    server.games.clear()
    return server.app.test_client()


@pytest.fixture
def fixed_word(monkeypatch):
    """Make the 'random' word predictable: always 'cat'."""
    monkeypatch.setattr(server.words, "random_word", lambda difficulty: "cat")


def new_game(client, difficulty="easy"):
    response = client.post("/api/games", json={"difficulty": difficulty})
    assert response.status_code == 201
    return response.get_json()


def guess(client, game_id, letter):
    return client.post(f"/api/games/{game_id}/guess", json={"letter": letter})


# --- creating games ---------------------------------------------------------

@pytest.mark.parametrize("difficulty", DIFFICULTIES)
def test_create_game_for_each_difficulty(client, difficulty):
    response = client.post("/api/games", json={"difficulty": difficulty})
    assert response.status_code == 201
    data = response.get_json()
    assert data["status"] == "playing"
    assert data["remaining_guesses"] == 6
    assert set(data["pattern"].split(" ")) == {"_"}
    assert data["guessed_letters"] == [] and data["incorrect_letters"] == []
    assert data["difficulty"] == difficulty
    assert data["game_id"]
    assert "word" not in data


def test_pattern_length_matches_difficulty(client):
    # Word lengths: easy 4-7, hard 8-12, so the two ranges never overlap.
    easy = len(new_game(client, "easy")["pattern"].split(" "))
    hard = len(new_game(client, "hard")["pattern"].split(" "))
    assert 4 <= easy <= 7 and 8 <= hard <= 12


def test_difficulty_is_case_insensitive(client):
    assert new_game(client, "MEDIUM")["difficulty"] == "medium"


def test_game_ids_are_unique(client):
    ids = {new_game(client)["game_id"] for _ in range(100)}
    assert len(ids) == 100


# --- invalid requests -------------------------------------------------------

def test_create_with_bad_difficulty(client):
    response = client.post("/api/games", json={"difficulty": "impossible"})
    assert response.status_code == 400
    assert "difficulty" in response.get_json()["error"]


@pytest.mark.parametrize("difficulty", [None, 3, ["easy"], ""])
def test_create_with_wrong_type_of_difficulty(client, difficulty):
    assert client.post("/api/games", json={"difficulty": difficulty}).status_code == 400


def test_create_without_difficulty(client):
    assert client.post("/api/games", json={}).status_code == 400


@pytest.mark.parametrize("raw", ["not json", "[1, 2]", '"easy"', "", "{bad"])
def test_create_with_bad_json_body(client, raw):
    response = client.post("/api/games", data=raw, content_type="application/json")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_create_with_wrong_content_type(client):
    response = client.post("/api/games", data='{"difficulty":"easy"}', content_type="text/plain")
    assert response.status_code == 400


def test_unknown_game_id(client):
    assert client.get("/api/games/doesnotexist").status_code == 404
    response = guess(client, "doesnotexist", "a")
    assert response.status_code == 404
    assert response.get_json() == {"error": "unknown game"}


@pytest.mark.parametrize("letter", ["", "ab", "1", "!", " ", None, 5, ["a"]])
def test_invalid_letters_rejected(client, letter):
    game_id = new_game(client)["game_id"]
    response = guess(client, game_id, letter)
    assert response.status_code == 400
    assert "error" in response.get_json()
    state = client.get(f"/api/games/{game_id}").get_json()
    assert state["guessed_letters"] == [] and state["remaining_guesses"] == 6


def test_guess_without_letter_field(client):
    game_id = new_game(client)["game_id"]
    assert client.post(f"/api/games/{game_id}/guess", json={}).status_code == 400
    bad = client.post(f"/api/games/{game_id}/guess", data="oops", content_type="application/json")
    assert bad.status_code == 400


# --- playing ----------------------------------------------------------------

def test_correct_and_incorrect_guesses(client, fixed_word):
    game_id = new_game(client)["game_id"]

    response = guess(client, game_id, "a")
    assert response.status_code == 200
    data = response.get_json()
    assert data["pattern"] == "_ a _"
    assert data["guessed_letters"] == ["a"]
    assert data["incorrect_letters"] == []
    assert data["remaining_guesses"] == 6

    data = guess(client, game_id, "z").get_json()
    assert data["incorrect_letters"] == ["z"]
    assert data["remaining_guesses"] == 5
    assert data["status"] == "playing"


def test_get_state_matches_last_guess(client, fixed_word):
    game_id = new_game(client)["game_id"]
    from_guess = guess(client, game_id, "c").get_json()
    assert client.get(f"/api/games/{game_id}").get_json() == from_guess


def test_duplicate_guess_is_rejected_without_penalty(client, fixed_word):
    game_id = new_game(client)["game_id"]
    guess(client, game_id, "z")
    response = guess(client, game_id, "z")
    assert response.status_code == 400
    assert "already guessed" in response.get_json()["error"]
    assert client.get(f"/api/games/{game_id}").get_json()["remaining_guesses"] == 5


def test_uppercase_guess_is_accepted(client, fixed_word):
    game_id = new_game(client)["game_id"]
    assert guess(client, game_id, "C").get_json()["pattern"] == "c _ _"


def test_win_path(client, fixed_word):
    game_id = new_game(client)["game_id"]
    guess(client, game_id, "c")
    guess(client, game_id, "a")
    data = guess(client, game_id, "t").get_json()
    assert data["status"] == "won"
    assert data["pattern"] == "c a t"
    assert data["word"] == "cat"


def test_loss_path(client, fixed_word):
    game_id = new_game(client)["game_id"]
    for letter in "bdefg":
        assert guess(client, game_id, letter).get_json()["status"] == "playing"
    data = guess(client, game_id, "h").get_json()
    assert data["status"] == "lost"
    assert data["remaining_guesses"] == 0
    assert data["word"] == "cat"


def test_no_guesses_after_game_over(client, fixed_word):
    game_id = new_game(client)["game_id"]
    for letter in "cat":
        guess(client, game_id, letter)
    response = guess(client, game_id, "z")
    assert response.status_code == 400
    assert "over" in response.get_json()["error"]
    assert client.get(f"/api/games/{game_id}").get_json()["status"] == "won"


def test_new_game_after_finishing_is_independent(client, fixed_word):
    first = new_game(client)["game_id"]
    for letter in "cat":
        guess(client, first, letter)
    second = new_game(client)
    assert second["game_id"] != first
    assert second["status"] == "playing"
    assert second["guessed_letters"] == []
    assert client.get(f"/api/games/{first}").get_json()["status"] == "won"


def test_games_do_not_interfere(client, fixed_word):
    a, b = new_game(client)["game_id"], new_game(client)["game_id"]
    guess(client, a, "z")
    assert client.get(f"/api/games/{b}").get_json()["remaining_guesses"] == 6


# --- the secret word --------------------------------------------------------

def test_word_never_exposed_while_playing(client, fixed_word):
    created = new_game(client)
    game_id = created["game_id"]
    responses = [created, client.get(f"/api/games/{game_id}").get_json()]
    responses.append(guess(client, game_id, "c").get_json())  # correct
    responses.append(guess(client, game_id, "z").get_json())  # incorrect
    responses.append(guess(client, game_id, "z").get_json())  # rejected duplicate
    for body in responses:
        assert "word" not in body
        # The pattern is allowed to show "c _ _", but the whole word must not appear.
        assert "cat" not in json.dumps(body)


def test_playing_state_only_has_the_documented_keys(client):
    created = new_game(client, "hard")
    assert set(created) == STATE_KEYS | {"game_id"}
    state = client.get(f"/api/games/{created['game_id']}").get_json()
    assert set(state) == STATE_KEYS


# --- errors and pages -------------------------------------------------------

def test_unknown_route_returns_json_404(client):
    response = client.get("/api/nothing")
    assert response.status_code == 404
    assert response.is_json


def test_wrong_method_returns_json_405(client):
    response = client.delete("/api/games/abc")
    assert response.status_code == 405
    assert response.is_json


def test_index_page_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"<html" in response.data.lower() or b"<!doctype" in response.data.lower()
    response.close()


# --- whole games ------------------------------------------------------------

@pytest.mark.parametrize("difficulty", DIFFICULTIES)
def test_complete_random_games_follow_the_rules(client, difficulty):
    """Play 20 games per difficulty with letters in random order, checking every response."""
    import random
    import string

    for _ in range(20):
        data = new_game(client, difficulty)
        game_id = data["game_id"]
        letters = random.sample(string.ascii_lowercase, 26)
        for letter in letters:
            assert "word" not in data  # still playing, so the answer must be hidden
            data = guess(client, game_id, letter).get_json()
            if data["status"] != "playing":
                break
        assert data["status"] in ("won", "lost")
        if data["status"] == "won":
            assert data["pattern"] == " ".join(data["word"])
        assert len(data["incorrect_letters"]) <= 6
        # Once over, further guesses are rejected and the state stays as it was.
        assert guess(client, game_id, "a").status_code == 400
        assert client.get(f"/api/games/{game_id}").get_json() == data
