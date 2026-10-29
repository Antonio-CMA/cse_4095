"""Unit tests for the game engine (no Flask involved)."""

import pytest

from game import HangmanGame, InvalidGuess, LOST, PLAYING, WON


def test_new_game_is_fully_hidden():
    game = HangmanGame("apple")
    assert game.pattern == "_ _ _ _ _"
    assert game.status == PLAYING
    assert game.remaining_guesses == 6
    assert game.guessed_letters == []
    assert game.incorrect_letters == []


def test_correct_guess_reveals_every_occurrence():
    game = HangmanGame("apple")
    assert game.guess("p") is True
    assert game.pattern == "_ p p _ _"
    assert game.guessed_letters == ["p"]
    assert game.incorrect_letters == []
    assert game.remaining_guesses == 6


def test_incorrect_guess_costs_a_life():
    game = HangmanGame("apple")
    assert game.guess("z") is False
    assert game.incorrect_letters == ["z"]
    assert game.remaining_guesses == 5
    assert game.pattern == "_ _ _ _ _"


def test_guess_is_case_insensitive():
    game = HangmanGame("apple")
    game.guess("A")
    assert game.guessed_letters == ["a"]
    assert game.pattern == "a _ _ _ _"


def test_win_when_all_letters_found():
    game = HangmanGame("cat")
    for letter in "cat":
        game.guess(letter)
    assert game.status == WON
    assert game.pattern == "c a t"


def test_loss_after_six_incorrect_guesses():
    game = HangmanGame("cat")
    for letter in "bdefgh":
        assert game.status == PLAYING
        game.guess(letter)
    assert game.status == LOST
    assert game.remaining_guesses == 0


def test_win_on_the_last_life():
    game = HangmanGame("cat")
    for letter in "bdefg":  # five wrong guesses
        game.guess(letter)
    for letter in "cat":
        game.guess(letter)
    assert game.status == WON
    assert game.remaining_guesses == 1


@pytest.mark.parametrize("bad", ["", "ab", "1", "!", " ", "é", None, 5, ["a"]])
def test_invalid_guess_rejected_and_state_unchanged(bad):
    game = HangmanGame("apple")
    with pytest.raises(InvalidGuess):
        game.guess(bad)
    assert game.guessed_letters == []
    assert game.remaining_guesses == 6


def test_duplicate_guess_rejected_and_not_penalised():
    game = HangmanGame("apple")
    game.guess("z")
    with pytest.raises(InvalidGuess, match="already guessed"):
        game.guess("z")
    assert game.incorrect_letters == ["z"]
    assert game.remaining_guesses == 5
    game.guess("a")
    with pytest.raises(InvalidGuess):
        game.guess("A")  # same letter, different case


def test_no_guesses_after_a_win():
    game = HangmanGame("a")
    game.guess("a")
    with pytest.raises(InvalidGuess, match="over"):
        game.guess("b")


def test_no_guesses_after_a_loss():
    game = HangmanGame("a")
    for letter in "bcdefg":
        game.guess(letter)
    assert game.status == LOST
    with pytest.raises(InvalidGuess, match="over"):
        game.guess("a")
    assert game.status == LOST


def test_state_hides_word_while_playing():
    game = HangmanGame("apple", difficulty="easy")
    game.guess("a")
    game.guess("z")
    state = game.to_dict()
    assert "word" not in state
    assert "apple" not in str(state)
    assert state == {
        "difficulty": "easy",
        "pattern": "a _ _ _ _",
        "guessed_letters": ["a", "z"],
        "incorrect_letters": ["z"],
        "remaining_guesses": 5,
        "max_guesses": 6,
        "status": "playing",
    }


def test_state_reveals_word_when_won_or_lost():
    won = HangmanGame("hi")
    won.guess("h")
    won.guess("i")
    assert won.to_dict()["word"] == "hi"

    lost = HangmanGame("hi")
    for letter in "abcdef":
        lost.guess(letter)
    assert lost.to_dict()["word"] == "hi"
    assert lost.to_dict()["status"] == "lost"


def test_to_dict_returns_copies():
    game = HangmanGame("apple")
    game.guess("a")
    game.to_dict()["guessed_letters"].append("q")
    assert game.guessed_letters == ["a"]


@pytest.mark.parametrize("bad_word", ["", "two words", "abc1", "caf\u00e9"])
def test_rejects_bad_secret_words(bad_word):
    with pytest.raises(ValueError):
        HangmanGame(bad_word)
