"""Hangman game engine.

This module knows nothing about Flask, HTTP or the browser. It only holds the
rules of one game, so it can be unit-tested (and reused) on its own.
"""

import string

MAX_INCORRECT = 6  # number of wrong guesses a player may make

PLAYING = "playing"
WON = "won"
LOST = "lost"


class InvalidGuess(ValueError):
    """Raised when a guess is not allowed (bad input, repeat, or game over).

    The message is safe to show to the player; the server sends it back as the
    "error" field of a 400 response.
    """


class HangmanGame:
    """The state and rules of a single Hangman game."""

    def __init__(self, word, difficulty=None, max_incorrect=MAX_INCORRECT):
        word = word.strip().lower()
        if not word or not all(ch in string.ascii_lowercase for ch in word):
            raise ValueError("word must contain only the letters a-z")
        self._word = word  # the secret: never exposed until the game ends
        self.difficulty = difficulty
        self.max_incorrect = max_incorrect
        self.guessed_letters = []    # every accepted guess, in order
        self.incorrect_letters = []  # the subset that is not in the word

    # --- derived state ------------------------------------------------------

    @property
    def remaining_guesses(self):
        return self.max_incorrect - len(self.incorrect_letters)

    @property
    def status(self):
        if all(ch in self.guessed_letters for ch in self._word):
            return WON
        if self.remaining_guesses <= 0:
            return LOST
        return PLAYING

    @property
    def is_over(self):
        return self.status != PLAYING

    @property
    def pattern(self):
        """The word with unguessed letters hidden, e.g. 'a _ _ l e'."""
        return " ".join(ch if ch in self.guessed_letters else "_" for ch in self._word)

    # --- actions ------------------------------------------------------------

    def guess(self, letter):
        """Apply one guess. Returns True if the letter is in the word.

        Raises InvalidGuess (and leaves the game unchanged) when the guess is
        not a single letter, was already guessed, or the game is already over.
        """
        if self.is_over:
            raise InvalidGuess("The game is already over.")
        if not isinstance(letter, str) or len(letter) != 1 or letter.lower() not in string.ascii_lowercase:
            raise InvalidGuess("A guess must be a single letter from a to z.")
        letter = letter.lower()
        if letter in self.guessed_letters:
            raise InvalidGuess(f"The letter '{letter}' was already guessed.")

        self.guessed_letters.append(letter)
        if letter in self._word:
            return True
        self.incorrect_letters.append(letter)
        return False

    # --- serialization ------------------------------------------------------

    def to_dict(self):
        """Client-safe state. The word is included only once the game is over."""
        state = {
            "difficulty": self.difficulty,
            "pattern": self.pattern,
            "guessed_letters": list(self.guessed_letters),
            "incorrect_letters": list(self.incorrect_letters),
            "remaining_guesses": self.remaining_guesses,
            "max_guesses": self.max_incorrect,
            "status": self.status,
        }
        if self.is_over:
            state["word"] = self._word
        return state
