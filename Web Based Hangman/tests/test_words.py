"""Tests for word loading and random selection."""

import pytest

from word_manager import DIFFICULTIES, InvalidDifficulty, WordManager, load_words


@pytest.fixture(scope="module")
def manager():
    return WordManager()


@pytest.mark.parametrize("difficulty", DIFFICULTIES)
def test_each_list_loads_clean_words(manager, difficulty):
    words = manager.words(difficulty)
    assert len(words) > 50
    assert all(w.isalpha() and w.isascii() and w == w.lower() for w in words)
    assert len(words) == len(set(words))


@pytest.mark.parametrize("difficulty", DIFFICULTIES)
def test_random_word_comes_from_the_right_list(manager, difficulty):
    allowed = set(manager.words(difficulty))
    for _ in range(50):
        assert manager.random_word(difficulty) in allowed


def test_difficulty_is_case_insensitive(manager):
    assert manager.random_word("HARD") in manager.words("hard")


def test_harder_lists_have_longer_words(manager):
    def average(difficulty):
        words = manager.words(difficulty)
        return sum(map(len, words)) / len(words)

    assert average("easy") < average("medium") < average("hard")


@pytest.mark.parametrize("bad", ["", "impossible", None, 3])
def test_invalid_difficulty_rejected(manager, bad):
    with pytest.raises(InvalidDifficulty):
        manager.random_word(bad)


def test_load_words_cleans_the_file(tmp_path):
    path = tmp_path / "w.txt"
    path.write_text("Apple\napple\n\n  pear \nco-op\nr2d2\nplum\n", encoding="utf-8")
    assert load_words(path) == ["apple", "pear", "plum"]


def test_empty_list_is_an_error(tmp_path):
    for name in DIFFICULTIES:
        (tmp_path / f"{name}.txt").write_text("apple\n", encoding="utf-8")
    (tmp_path / "hard.txt").write_text("\n", encoding="utf-8")
    with pytest.raises(ValueError):
        WordManager(tmp_path)
