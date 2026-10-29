"""Loads the word lists and picks a random word for a difficulty level."""

import random
from pathlib import Path

WORDS_DIR = Path(__file__).parent / "words"
DIFFICULTIES = ("easy", "medium", "hard")


class InvalidDifficulty(ValueError):
    """Raised when a difficulty other than easy/medium/hard is requested."""


def load_words(path):
    """Read one word file: lowercase, letters only, no duplicates, order kept."""
    words = []
    seen = set()
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        word = line.strip().lower()
        if word.isascii() and word.isalpha() and word not in seen:
            seen.add(word)
            words.append(word)
    return words


class WordManager:
    """Holds the word list for each difficulty."""

    def __init__(self, words_dir=WORDS_DIR):
        self._words = {name: load_words(Path(words_dir) / f"{name}.txt") for name in DIFFICULTIES}
        for name, words in self._words.items():
            if not words:
                raise ValueError(f"word list '{name}' is empty")

    def words(self, difficulty):
        return list(self._words[self._check(difficulty)])

    def random_word(self, difficulty):
        return random.choice(self._words[self._check(difficulty)])

    @staticmethod
    def _check(difficulty):
        if not isinstance(difficulty, str) or difficulty.lower() not in DIFFICULTIES:
            raise InvalidDifficulty("difficulty must be one of: easy, medium, hard")
        return difficulty.lower()
