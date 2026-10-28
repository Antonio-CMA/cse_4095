// Browser client. It only shows what the server sends back: all Hangman rules
// (the secret word, win/loss, remaining guesses) live on the server.

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

const els = {
  difficulty: document.getElementById("difficulty"),
  newGame: document.getElementById("new-game"),
  word: document.getElementById("word"),
  message: document.getElementById("message"),
  remaining: document.getElementById("remaining"),
  incorrect: document.getElementById("incorrect"),
  guessed: document.getElementById("guessed"),
  keyboard: document.getElementById("keyboard"),
  parts: document.querySelectorAll(".part"),
};

let gameId = null;   // id of the game being played (given by the server)
let game = null;     // the last state the server sent us
let pending = Promise.resolve();  // guesses are sent one after another, in order
const keyButtons = {};

// --- talking to the server ---------------------------------------------------

async function api(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Could not reach the server. Please try again.");
  }
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // Not JSON: handled below.
  }
  if (!response.ok) {
    const error = new Error((data && data.error) || `Server error (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function startGame() {
  els.newGame.disabled = true;
  setMessage("Starting a new game...", "");
  try {
    const data = await api("POST", "/api/games", { difficulty: els.difficulty.value });
    gameId = data.game_id;
    render(data);
  } catch (err) {
    setMessage(err.message, "error");
  } finally {
    els.newGame.disabled = false;
  }
}

function guessLetter(letter) {
  const id = gameId;
  // Queue the request so fast typing is sent (and shown) in order.
  pending = pending.then(() => sendGuess(id, letter));
}

async function sendGuess(id, letter) {
  // Skip if a new game was started meanwhile, or the guess makes no sense.
  if (id !== gameId || !game || game.status !== "playing") return;
  if (game.guessed_letters.includes(letter)) {
    setMessage(`You already guessed "${letter.toUpperCase()}".`, "");
    return;
  }
  try {
    const data = await api("POST", `/api/games/${id}/guess`, { letter });
    if (id === gameId) render(data);
  } catch (err) {
    // 404 means the server no longer knows this game (for example it restarted).
    const text = err.status === 404
      ? "This game no longer exists on the server. Press New Game to start again."
      : err.message;
    setMessage(text, "error");
  }
}

// --- drawing the page --------------------------------------------------------

function setMessage(text, kind) {
  els.message.textContent = text;
  els.message.className = "message " + kind;
}

function render(state) {
  game = state;

  // The pattern arrives as "_ a _ _": one slot per character.
  els.word.replaceChildren();
  // After a loss the server also sends the word, so show the letters we missed.
  const shown = state.pattern.split(" ");
  shown.forEach((ch, index) => {
    const slot = document.createElement("span");
    slot.className = "slot";
    if (ch !== "_") {
      slot.textContent = ch;
    } else if (state.word) {
      slot.textContent = state.word[index];
      slot.classList.add("missed");
    }
    els.word.appendChild(slot);
  });
  els.word.setAttribute("aria-label", "Word: " + state.pattern.replaceAll("_", "blank"));

  els.remaining.textContent = `${state.remaining_guesses} of ${state.max_guesses}`;
  els.incorrect.textContent = state.incorrect_letters.join(" ").toUpperCase() || "none";
  els.guessed.textContent = state.guessed_letters.join(" ").toUpperCase() || "none";

  // Show one body part per wrong guess.
  const wrong = state.max_guesses - state.remaining_guesses;
  els.parts.forEach((part, index) => part.classList.toggle("shown", index < wrong));

  // Keyboard: guessed letters are disabled and coloured; everything locks at the end.
  const over = state.status !== "playing";
  for (const letter of ALPHABET) {
    const button = keyButtons[letter];
    const used = state.guessed_letters.includes(letter);
    button.disabled = used || over;
    button.classList.toggle("wrong", state.incorrect_letters.includes(letter));
    button.classList.toggle("correct", used && !state.incorrect_letters.includes(letter));
  }

  if (state.status === "won") {
    setMessage(`You won! The word was "${state.word.toUpperCase()}".`, "won");
  } else if (state.status === "lost") {
    setMessage(`You lost. The word was "${state.word.toUpperCase()}".`, "lost");
  } else {
    setMessage("", "");
  }
}

function buildKeyboard() {
  for (const letter of ALPHABET) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    button.textContent = letter;
    button.setAttribute("aria-label", `Guess ${letter.toUpperCase()}`);
    button.disabled = true;  // enabled once a game exists
    button.addEventListener("click", () => guessLetter(letter));
    els.keyboard.appendChild(button);
    keyButtons[letter] = button;
  }
}

// --- start-up ----------------------------------------------------------------

els.newGame.addEventListener("click", startGame);

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;      // keep browser shortcuts
  if (event.target === els.difficulty) return;                     // typing in the dropdown
  if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
    guessLetter(event.key.toLowerCase());
  }
});

buildKeyboard();
startGame();
