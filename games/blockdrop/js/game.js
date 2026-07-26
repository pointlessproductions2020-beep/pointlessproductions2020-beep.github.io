"use strict";

/* =========================================================
   BLOCK DROP REMASTERED
   Pointless Productions
========================================================= */


/* =========================================================
   1. CANVAS AND DOM REFERENCES
========================================================= */

const canvas = document.querySelector("#tetris");
const context = canvas.getContext("2d");

const previewCanvas = document.querySelector("#preview");
const previewContext = previewCanvas.getContext("2d");

const holdCanvas = document.querySelector("#hold-canvas");
const holdContext = holdCanvas.getContext("2d");

const scoreElement = document.querySelector("#score");
const highScoreElement = document.querySelector("#high-score");
const levelElement = document.querySelector("#level");
const linesElement = document.querySelector("#lines");
const comboElement = document.querySelector("#combo");

const finalScoreElement = document.querySelector("#final-score");
const highScoreMessage = document.querySelector(
  "#new-high-score-message"
);

const statusElement = document.querySelector("#game-status");
const statusLight = document.querySelector("#status-light");

const startOverlay = document.querySelector("#start-overlay");
const pauseOverlay = document.querySelector("#pause-overlay");
const gameOverOverlay = document.querySelector(
  "#game-over-overlay"
);

const startButton = document.querySelector("#start-button");
const resumeButton = document.querySelector("#resume-button");
const playAgainButton = document.querySelector(
  "#play-again-button"
);

const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const soundButton = document.querySelector("#sound-button");

const holdEmptyMessage = document.querySelector(
  "#hold-empty-message"
);

const lineAnnouncement = document.querySelector(
  "#line-announcement"
);

const screenFlash = document.querySelector("#screen-flash");
const gameTipElement = document.querySelector("#game-tip");

if (
  !canvas ||
  !context ||
  !previewCanvas ||
  !previewContext ||
  !holdCanvas ||
  !holdContext
) {
  throw new Error("Block Drop could not find its canvas elements.");
}


/* =========================================================
   2. GAME CONSTANTS
========================================================= */

const BOARD_COLUMNS = 12;
const BOARD_ROWS = 20;

const BOARD_BLOCK_SIZE = canvas.width / BOARD_COLUMNS;
const PREVIEW_BLOCK_SIZE = 28;
const HOLD_BLOCK_SIZE = 24;

const PIECE_TYPES = ["T", "J", "L", "O", "S", "Z", "I"];

const PIECE_COLOURS = {
  T: {
    main: "#c64fff",
    light: "#e9a8ff",
    dark: "#702097"
  },

  J: {
    main: "#3285ff",
    light: "#8fc1ff",
    dark: "#164698"
  },

  L: {
    main: "#ff922e",
    light: "#ffc27d",
    dark: "#a34d0d"
  },

  O: {
    main: "#ffd84f",
    light: "#fff19e",
    dark: "#a77c08"
  },

  S: {
    main: "#63ed69",
    light: "#aeffb1",
    dark: "#248b31"
  },

  Z: {
    main: "#ff4f67",
    light: "#ff9baa",
    dark: "#a51c32"
  },

  I: {
    main: "#35e7ff",
    light: "#a0f6ff",
    dark: "#147b8a"
  }
};

const LINE_SCORE_VALUES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800
};

const ANNOUNCEMENT_TEXT = {
  1: "Single!",
  2: "Double!",
  3: "Triple!",
  4: "Block Drop!"
};

const GAME_TIPS = [
  "Leave a gap for the long piece. It will arrive immediately after you stop waiting for it.",

  "The ghost piece shows where a block will land. It cannot show whether the decision is wise.",

  "Holding a piece is strategic. Holding every piece because you panicked is less strategic.",

  "Clearing four lines at once earns the biggest standard line bonus.",

  "The blocks speed up every ten cleared lines. This is apparently considered encouragement.",

  "Soft drops score a little. Hard drops score more and look considerably more dramatic.",

  "Do not build a beautiful tower. The game is specifically asking you to destroy it.",

  "A flat board is usually safer than a skyline inspired by central London."
];


/* =========================================================
   3. PIECE SHAPES
========================================================= */

const PIECE_SHAPES = {
  T: [
    [0, 1, 0],
    [1, 1, 1]
  ],

  J: [
    [1, 0, 0],
    [1, 1, 1]
  ],

  L: [
    [0, 0, 1],
    [1, 1, 1]
  ],

  O: [
    [1, 1],
    [1, 1]
  ],

  S: [
    [0, 1, 1],
    [1, 1, 0]
  ],

  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ],

  I: [
    [1, 1, 1, 1]
  ]
};


/* =========================================================
   4. GAME STATE
========================================================= */

const arena = createMatrix(BOARD_COLUMNS, BOARD_ROWS);

const player = {
  matrix: null,
  type: null,

  position: {
    x: 0,
    y: 0
  }
};

let nextPiece = null;
let heldPieceType = null;

let canHold = true;
let pieceBag = [];

let score = 0;
let highScore = loadHighScore();

let level = 1;
let clearedLines = 0;

let combo = -1;
let bestCombo = 0;

let dropCounter = 0;
let lastFrameTime = performance.now();

let gameStarted = false;
let gamePaused = false;
let gameOver = false;

let soundMuted = false;

let announcementTimer = null;
let tipTimer = null;

let particles = [];

let audioContext = null;


/* =========================================================
   5. MATRIX UTILITIES
========================================================= */

function createMatrix(width, height) {
  return Array.from(
    {
      length: height
    },
    () => new Array(width).fill(0)
  );
}


function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}


function clearArena() {
  arena.forEach((row) => {
    row.fill(0);
  });
}


function createPiece(type) {
  const shape = PIECE_SHAPES[type];

  if (!shape) {
    throw new Error(`Unknown Block Drop piece: ${type}`);
  }

  return {
    type,
    matrix: cloneMatrix(shape)
  };
}


/* =========================================================
   6. SEVEN-BAG RANDOM PIECES
========================================================= */

function shuffleArray(array) {
  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index]
    ];
  }

  return copy;
}


function getNextPieceType() {
  if (pieceBag.length === 0) {
    pieceBag = shuffleArray(PIECE_TYPES);
  }

  return pieceBag.pop();
}


/* =========================================================
   7. COLLISION AND MERGING
========================================================= */

function collides(
  matrix = player.matrix,
  position = player.position
) {
  if (!matrix) {
    return false;
  }

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] === 0) {
        continue;
      }

      const arenaX = x + position.x;
      const arenaY = y + position.y;

      if (
        arenaX < 0 ||
        arenaX >= BOARD_COLUMNS ||
        arenaY >= BOARD_ROWS
      ) {
        return true;
      }

      if (
        arenaY >= 0 &&
        arena[arenaY][arenaX] !== 0
      ) {
        return true;
      }
    }
  }

  return false;
}


function mergePlayerIntoArena() {
  if (!player.matrix || !player.type) {
    return;
  }

  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }

      const arenaX = x + player.position.x;
      const arenaY = y + player.position.y;

      if (
        arenaY >= 0 &&
        arenaY < BOARD_ROWS &&
        arenaX >= 0 &&
        arenaX < BOARD_COLUMNS
      ) {
        arena[arenaY][arenaX] = player.type;
      }
    });
  });
}


/* =========================================================
   8. PIECE SPAWNING
========================================================= */

function centrePlayerPiece() {
  player.position.x =
    Math.floor(BOARD_COLUMNS / 2) -
    Math.ceil(player.matrix[0].length / 2);

  player.position.y = -getTopEmptyRows(player.matrix);
}


function getTopEmptyRows(matrix) {
  let emptyRows = 0;

  for (const row of matrix) {
    if (row.every((value) => value === 0)) {
      emptyRows += 1;
    } else {
      break;
    }
  }

  return emptyRows;
}


function spawnNextPiece() {
  if (!nextPiece) {
    nextPiece = createPiece(getNextPieceType());
  }

  player.type = nextPiece.type;
  player.matrix = cloneMatrix(nextPiece.matrix);

  nextPiece = createPiece(getNextPieceType());

  centrePlayerPiece();

  canHold = true;

  drawPreviewPiece();
  drawHeldPiece();

  if (collides()) {
    endGame();
  }
}


/* =========================================================
   9. MOVEMENT
========================================================= */

function movePlayer(direction) {
  if (!canControlPlayer()) {
    return;
  }

  player.position.x += direction;

  if (collides()) {
    player.position.x -= direction;
    playSound("blocked");
    return;
  }

  playSound("move");
}


function softDropPlayer({
  reward = true
} = {}) {
  if (!canControlPlayer()) {
    return false;
  }

  player.position.y += 1;

  if (collides()) {
    player.position.y -= 1;
    lockCurrentPiece();

    return false;
  }

  if (reward) {
    addScore(1);
  }

  dropCounter = 0;

  return true;
}


function hardDropPlayer() {
  if (!canControlPlayer()) {
    return;
  }

  let distance = 0;

  while (!collides()) {
    player.position.y += 1;
    distance += 1;
  }

  player.position.y -= 1;
  distance -= 1;

  if (distance > 0) {
    addScore(distance * 2);
  }

  playSound("hardDrop");
  shakeScreen();

  lockCurrentPiece();
}


/* =========================================================
   10. ROTATION
========================================================= */

function rotateMatrix(matrix, direction) {
  const rows = matrix.length;
  const columns = matrix[0].length;

  const rotated = Array.from(
    {
      length: columns
    },
    () => new Array(rows).fill(0)
  );

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (direction > 0) {
        rotated[x][rows - 1 - y] = matrix[y][x];
      } else {
        rotated[columns - 1 - x][y] = matrix[y][x];
      }
    }
  }

  return rotated;
}


function rotatePlayer(direction) {
  if (!canControlPlayer() || player.type === "O") {
    return;
  }

  const originalMatrix = player.matrix;
  const originalX = player.position.x;

  player.matrix = rotateMatrix(
    player.matrix,
    direction
  );

  const wallKickOffsets = [
    0,
    1,
    -1,
    2,
    -2
  ];

  for (const offset of wallKickOffsets) {
    player.position.x = originalX + offset;

    if (!collides()) {
      playSound("rotate");
      return;
    }
  }

  player.matrix = originalMatrix;
  player.position.x = originalX;

  playSound("blocked");
}


/* =========================================================
   11. HOLD PIECE
========================================================= */

function holdCurrentPiece() {
  if (!canControlPlayer() || !canHold) {
    return;
  }

  const currentPieceType = player.type;

  if (!heldPieceType) {
    heldPieceType = currentPieceType;
    spawnNextPiece();
  } else {
    player.type = heldPieceType;
    player.matrix = cloneMatrix(
      PIECE_SHAPES[heldPieceType]
    );

    heldPieceType = currentPieceType;

    centrePlayerPiece();

    if (collides()) {
      endGame();
      return;
    }
  }

  canHold = false;

  drawHeldPiece();

  playSound("hold");
}


/* =========================================================
   12. GHOST PIECE
========================================================= */

function getGhostPosition() {
  if (!player.matrix) {
    return {
      x: 0,
      y: 0
    };
  }

  const ghostPosition = {
    x: player.position.x,
    y: player.position.y
  };

  while (
    !collides(
      player.matrix,
      ghostPosition
    )
  ) {
    ghostPosition.y += 1;
  }

  ghostPosition.y -= 1;

  return ghostPosition;
}


/* =========================================================
   13. PIECE LOCKING AND LINE CLEARING
========================================================= */

function lockCurrentPiece() {
  if (!player.matrix || gameOver) {
    return;
  }

  mergePlayerIntoArena();

  createLandingParticles();

  const lineClearResult = clearCompletedLines();

  if (lineClearResult.count === 0) {
    combo = -1;
    updateComboDisplay();
    playSound("land");
  }

  spawnNextPiece();
  updateInterface();
}


function clearCompletedLines() {
  const clearedRowIndexes = [];

  for (let y = BOARD_ROWS - 1; y >= 0; y -= 1) {
    if (
      arena[y].every((cell) => cell !== 0)
    ) {
      clearedRowIndexes.push(y);
    }
  }

  if (clearedRowIndexes.length === 0) {
    return {
      count: 0
    };
  }

  createLineParticles(clearedRowIndexes);

  clearedRowIndexes
    .sort((a, b) => b - a)
    .forEach((rowIndex) => {
      arena.splice(rowIndex, 1);
      arena.unshift(
        new Array(BOARD_COLUMNS).fill(0)
      );
    });

  const numberOfLines =
    clearedRowIndexes.length;

  clearedLines += numberOfLines;

  combo += 1;

  if (combo > bestCombo) {
    bestCombo = combo;
  }

  const baseLineScore =
    LINE_SCORE_VALUES[numberOfLines] ||
    numberOfLines * 250;

  const comboBonus =
    combo > 0
      ? combo * 50 * level
      : 0;

  addScore(
    baseLineScore * level + comboBonus
  );

  updateLevel();

  showLineAnnouncement(
    numberOfLines,
    combo
  );

  triggerScreenFlash();
  shakeScreen(
    numberOfLines === 4
      ? 300
      : 180
  );

  playSound(
    numberOfLines === 4
      ? "fourLines"
      : "lineClear"
  );

  updateComboDisplay();
  updateInterface();

  return {
    count: numberOfLines
  };
}


/* =========================================================
   14. SCORING AND LEVELS
========================================================= */

function addScore(points) {
  score += Math.max(0, Math.floor(points));

  if (score > highScore) {
    highScore = score;
    saveHighScore();
  }

  updateInterface();
}


function updateLevel() {
  const newLevel =
    Math.floor(clearedLines / 10) + 1;

  if (newLevel > level) {
    level = newLevel;

    showTemporaryAnnouncement(
      `Level ${level}!`
    );

    playSound("levelUp");
  } else {
    level = newLevel;
  }
}


function getDropInterval() {
  return Math.max(
    90,
    1000 - (level - 1) * 75
  );
}


/* =========================================================
   15. GAME FLOW
========================================================= */

function startNewGame() {
  clearArena();

  pieceBag = [];
  particles = [];

  nextPiece = null;
  heldPieceType = null;

  canHold = true;

  score = 0;
  level = 1;
  clearedLines = 0;

  combo = -1;
  bestCombo = 0;

  dropCounter = 0;
  lastFrameTime = performance.now();

  gameStarted = true;
  gamePaused = false;
  gameOver = false;

  document.body.classList.add("game-running");

  hideAllOverlays();

  setGameStatus("Playing", "playing");

  highScoreMessage.hidden = true;

  chooseRandomTip();

  spawnNextPiece();

  updateComboDisplay();
  updateInterface();

  playSound("start");
}


function restartGame() {
  startNewGame();
}


function togglePause() {
  if (!gameStarted || gameOver) {
    return;
  }

  if (gamePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}


function pauseGame() {
  if (!gameStarted || gameOver) {
    return;
  }

  gamePaused = true;

  pauseOverlay.classList.add("is-visible");
  pauseOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  setGameStatus("Paused", "paused");

  if (pauseButton) {
    pauseButton.innerHTML =
      '<span aria-hidden="true">▶</span> Resume';
  }

  playSound("pause");
}


function resumeGame() {
  if (!gameStarted || gameOver) {
    return;
  }

  gamePaused = false;
  dropCounter = 0;
  lastFrameTime = performance.now();

  pauseOverlay.classList.remove("is-visible");
  pauseOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  setGameStatus("Playing", "playing");

  if (pauseButton) {
    pauseButton.innerHTML =
      '<span aria-hidden="true">⏸</span> Pause';
  }

  playSound("resume");
}


function endGame() {
  gameOver = true;
  gamePaused = false;
  gameStarted = false;

  document.body.classList.remove("game-running");

  finalScoreElement.textContent =
    formatScore(score);

  const previousStoredScore =
    Number.parseInt(
      localStorage.getItem(
        "blockDropHighScore"
      ) || "0",
      10
    );

  const achievedNewHighScore =
    score > 0 &&
    score >= previousStoredScore;

  highScoreMessage.hidden =
    !achievedNewHighScore;

  if (score > highScore) {
    highScore = score;
    saveHighScore();
  }

  gameOverOverlay.classList.add("is-visible");
  gameOverOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  setGameStatus("Game Over", "game-over");

  updateInterface();

  playSound("gameOver");
  shakeScreen(380);
}


function canControlPlayer() {
  return (
    gameStarted &&
    !gamePaused &&
    !gameOver &&
    player.matrix
  );
}


/* =========================================================
   16. OVERLAY UTILITIES
========================================================= */

function hideAllOverlays() {
  [
    startOverlay,
    pauseOverlay,
    gameOverOverlay
  ].forEach((overlay) => {
    if (!overlay) {
      return;
    }

    overlay.classList.remove("is-visible");
    overlay.setAttribute(
      "aria-hidden",
      "true"
    );
  });
}


/* =========================================================
   17. DRAWING
========================================================= */

function drawGame() {
  clearCanvas(
    context,
    canvas
  );

  drawBoardBackground();

  drawArena();

  if (
    player.matrix &&
    !gameOver
  ) {
    drawGhostPiece();
    drawPlayerPiece();
  }

  drawParticles();
}


function clearCanvas(
  drawingContext,
  drawingCanvas
) {
  drawingContext.clearRect(
    0,
    0,
    drawingCanvas.width,
    drawingCanvas.height
  );
}


function drawBoardBackground() {
  const gradient =
    context.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );

  gradient.addColorStop(
    0,
    "rgba(18, 8, 29, 0.8)"
  );

  gradient.addColorStop(
    1,
    "rgba(2, 1, 5, 0.96)"
  );

  context.fillStyle = gradient;

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.strokeStyle =
    "rgba(181, 98, 255, 0.08)";

  context.lineWidth = 1;

  for (
    let x = 0;
    x <= BOARD_COLUMNS;
    x += 1
  ) {
    context.beginPath();

    context.moveTo(
      x * BOARD_BLOCK_SIZE,
      0
    );

    context.lineTo(
      x * BOARD_BLOCK_SIZE,
      canvas.height
    );

    context.stroke();
  }

  for (
    let y = 0;
    y <= BOARD_ROWS;
    y += 1
  ) {
    context.beginPath();

    context.moveTo(
      0,
      y * BOARD_BLOCK_SIZE
    );

    context.lineTo(
      canvas.width,
      y * BOARD_BLOCK_SIZE
    );

    context.stroke();
  }
}


function drawArena() {
  arena.forEach((row, y) => {
    row.forEach((pieceType, x) => {
      if (pieceType === 0) {
        return;
      }

      drawBlock(
        context,
        x * BOARD_BLOCK_SIZE,
        y * BOARD_BLOCK_SIZE,
        BOARD_BLOCK_SIZE,
        pieceType
      );
    });
  });
}


function drawPlayerPiece() {
  drawMatrix(
    context,
    player.matrix,
    player.position,
    BOARD_BLOCK_SIZE,
    player.type
  );
}


function drawGhostPiece() {
  const ghostPosition =
    getGhostPosition();

  drawMatrix(
    context,
    player.matrix,
    ghostPosition,
    BOARD_BLOCK_SIZE,
    player.type,
    {
      ghost: true
    }
  );
}


function drawMatrix(
  drawingContext,
  matrix,
  position,
  blockSize,
  type,
  options = {}
) {
  if (!matrix || !type) {
    return;
  }

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }

      drawBlock(
        drawingContext,
        (x + position.x) * blockSize,
        (y + position.y) * blockSize,
        blockSize,
        type,
        options
      );
    });
  });
}


function drawBlock(
  drawingContext,
  pixelX,
  pixelY,
  blockSize,
  type,
  {
    ghost = false
  } = {}
) {
  const colours =
    PIECE_COLOURS[type];

  if (!colours) {
    return;
  }

  const gap =
    Math.max(2, blockSize * 0.075);

  const x = pixelX + gap;
  const y = pixelY + gap;

  const size =
    blockSize - gap * 2;

  if (ghost) {
    drawingContext.save();

    drawingContext.globalAlpha = 0.25;

    drawingContext.strokeStyle =
      colours.light;

    drawingContext.lineWidth =
      Math.max(2, blockSize * 0.07);

    roundedRectanglePath(
      drawingContext,
      x,
      y,
      size,
      size,
      Math.max(3, blockSize * 0.14)
    );

    drawingContext.stroke();

    drawingContext.restore();

    return;
  }

  drawingContext.save();

  drawingContext.shadowColor =
    colours.main;

  drawingContext.shadowBlur =
    Math.max(7, blockSize * 0.42);

  const gradient =
    drawingContext.createLinearGradient(
      x,
      y,
      x + size,
      y + size
    );

  gradient.addColorStop(
    0,
    colours.light
  );

  gradient.addColorStop(
    0.35,
    colours.main
  );

  gradient.addColorStop(
    1,
    colours.dark
  );

  roundedRectanglePath(
    drawingContext,
    x,
    y,
    size,
    size,
    Math.max(3, blockSize * 0.14)
  );

  drawingContext.fillStyle = gradient;
  drawingContext.fill();

  drawingContext.shadowBlur = 0;

  drawingContext.strokeStyle =
    "rgba(255, 255, 255, 0.3)";

  drawingContext.lineWidth =
    Math.max(1, blockSize * 0.035);

  drawingContext.stroke();

  const highlightSize =
    Math.max(3, size * 0.16);

  const highlightGradient =
    drawingContext.createLinearGradient(
      x,
      y,
      x + size,
      y + size
    );

  highlightGradient.addColorStop(
    0,
    "rgba(255, 255, 255, 0.55)"
  );

  highlightGradient.addColorStop(
    1,
    "rgba(255, 255, 255, 0)"
  );

  drawingContext.fillStyle =
    highlightGradient;

  roundedRectanglePath(
    drawingContext,
    x + highlightSize * 0.4,
    y + highlightSize * 0.4,
    size - highlightSize * 0.8,
    Math.max(3, highlightSize),
    Math.max(2, blockSize * 0.08)
  );

  drawingContext.fill();

  drawingContext.restore();
}


function roundedRectanglePath(
  drawingContext,
  x,
  y,
  width,
  height,
  radius
) {
  const safeRadius = Math.min(
    radius,
    width / 2,
    height / 2
  );

  drawingContext.beginPath();

  drawingContext.roundRect(
    x,
    y,
    width,
    height,
    safeRadius
  );
}


/* =========================================================
   18. PREVIEW AND HOLD DRAWING
========================================================= */

function drawPreviewPiece() {
  clearCanvas(
    previewContext,
    previewCanvas
  );

  if (!nextPiece) {
    return;
  }

  drawCentredMiniPiece(
    previewContext,
    previewCanvas,
    nextPiece.matrix,
    nextPiece.type,
    PREVIEW_BLOCK_SIZE
  );
}


function drawHeldPiece() {
  clearCanvas(
    holdContext,
    holdCanvas
  );

  if (!heldPieceType) {
    holdEmptyMessage.hidden = false;
    return;
  }

  holdEmptyMessage.hidden = true;

  drawCentredMiniPiece(
    holdContext,
    holdCanvas,
    PIECE_SHAPES[heldPieceType],
    heldPieceType,
    HOLD_BLOCK_SIZE
  );
}


function drawCentredMiniPiece(
  drawingContext,
  drawingCanvas,
  matrix,
  type,
  preferredBlockSize
) {
  const maximumWidth =
    drawingCanvas.width * 0.82;

  const maximumHeight =
    drawingCanvas.height * 0.82;

  const fittedBlockSize = Math.min(
    preferredBlockSize,
    maximumWidth / matrix[0].length,
    maximumHeight / matrix.length
  );

  const pieceWidth =
    matrix[0].length * fittedBlockSize;

  const pieceHeight =
    matrix.length * fittedBlockSize;

  const offsetX =
    (drawingCanvas.width - pieceWidth) / 2;

  const offsetY =
    (drawingCanvas.height - pieceHeight) / 2;

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }

      drawBlock(
        drawingContext,
        offsetX + x * fittedBlockSize,
        offsetY + y * fittedBlockSize,
        fittedBlockSize,
        type
      );
    });
  });
}


/* =========================================================
   19. PARTICLES
========================================================= */

function createLandingParticles() {
  if (!player.matrix || !player.type) {
    return;
  }

  const colour =
    PIECE_COLOURS[player.type].main;

  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }

      for (
        let index = 0;
        index < 2;
        index += 1
      ) {
        particles.push({
          x:
            (x + player.position.x + 0.5) *
            BOARD_BLOCK_SIZE,

          y:
            (y + player.position.y + 0.9) *
            BOARD_BLOCK_SIZE,

          velocityX:
            (Math.random() - 0.5) * 2.7,

          velocityY:
            -Math.random() * 2.1,

          gravity: 0.08,

          size:
            2 + Math.random() * 4,

          alpha: 0.7,

          decay:
            0.025 + Math.random() * 0.02,

          colour
        });
      }
    });
  });
}


function createLineParticles(rowIndexes) {
  rowIndexes.forEach((rowIndex) => {
    for (
      let x = 0;
      x < BOARD_COLUMNS;
      x += 1
    ) {
      const pieceType =
        arena[rowIndex][x];

      const colour =
        PIECE_COLOURS[pieceType]?.main ||
        "#ffffff";

      for (
        let index = 0;
        index < 4;
        index += 1
      ) {
        particles.push({
          x:
            (x + 0.5) *
            BOARD_BLOCK_SIZE,

          y:
            (rowIndex + 0.5) *
            BOARD_BLOCK_SIZE,

          velocityX:
            (Math.random() - 0.5) * 7,

          velocityY:
            -1.5 - Math.random() * 5,

          gravity: 0.13,

          size:
            3 + Math.random() * 7,

          alpha: 1,

          decay:
            0.018 + Math.random() * 0.025,

          colour
        });
      }
    }
  });
}


function drawParticles() {
  for (
    let index = particles.length - 1;
    index >= 0;
    index -= 1
  ) {
    const particle = particles[index];

    particle.x += particle.velocityX;
    particle.y += particle.velocityY;

    particle.velocityY += particle.gravity;

    particle.alpha -= particle.decay;

    if (particle.alpha <= 0) {
      particles.splice(index, 1);
      continue;
    }

    context.save();

    context.globalAlpha =
      Math.max(0, particle.alpha);

    context.fillStyle = particle.colour;
    context.shadowColor = particle.colour;
    context.shadowBlur = 10;

    context.fillRect(
      particle.x,
      particle.y,
      particle.size,
      particle.size
    );

    context.restore();
  }
}


/* =========================================================
   20. USER INTERFACE
========================================================= */

function formatScore(value) {
  return String(
    Math.max(0, Math.floor(value))
  ).padStart(6, "0");
}


function updateInterface() {
  scoreElement.textContent =
    formatScore(score);

  highScoreElement.textContent =
    formatScore(highScore);

  levelElement.textContent =
    String(level);

  linesElement.textContent =
    String(clearedLines);
}


function updateComboDisplay() {
  const displayCombo =
    Math.max(0, combo);

  comboElement.textContent =
    `x${displayCombo}`;
}


function setGameStatus(
  text,
  state
) {
  statusElement.textContent = text;

  statusLight.className =
    `status-light status-light--${state}`;
}


function showLineAnnouncement(
  lineCount,
  currentCombo
) {
  const standardText =
    ANNOUNCEMENT_TEXT[lineCount] ||
    `${lineCount} Lines!`;

  const comboText =
    currentCombo > 0
      ? ` • Combo x${currentCombo}`
      : "";

  showTemporaryAnnouncement(
    standardText + comboText
  );
}


function showTemporaryAnnouncement(text) {
  if (announcementTimer) {
    window.clearTimeout(
      announcementTimer
    );
  }

  lineAnnouncement.textContent = text;
  lineAnnouncement.classList.add(
    "is-visible"
  );

  announcementTimer =
    window.setTimeout(() => {
      lineAnnouncement.classList.remove(
        "is-visible"
      );
    }, 900);
}


function chooseRandomTip() {
  if (!gameTipElement) {
    return;
  }

  const tip =
    GAME_TIPS[
      Math.floor(
        Math.random() *
        GAME_TIPS.length
      )
    ];

  gameTipElement.textContent = tip;

  if (tipTimer) {
    window.clearTimeout(tipTimer);
  }

  tipTimer = window.setTimeout(
    chooseRandomTip,
    18000
  );
}


/* =========================================================
   21. VISUAL EFFECTS
========================================================= */

function triggerScreenFlash() {
  screenFlash.classList.remove(
    "is-active"
  );

  void screenFlash.offsetWidth;

  screenFlash.classList.add(
    "is-active"
  );
}


function shakeScreen(duration = 180) {
  document.body.classList.remove(
    "is-shaking"
  );

  void document.body.offsetWidth;

  document.body.classList.add(
    "is-shaking"
  );

  window.setTimeout(() => {
    document.body.classList.remove(
      "is-shaking"
    );
  }, duration);
}


/* =========================================================
   22. LOCAL HIGH SCORE
========================================================= */

function loadHighScore() {
  try {
    const storedValue =
      localStorage.getItem(
        "blockDropHighScore"
      );

    const parsedValue =
      Number.parseInt(
        storedValue || "0",
        10
      );

    return Number.isFinite(parsedValue)
      ? Math.max(0, parsedValue)
      : 0;
  } catch (error) {
    console.warn(
      "Block Drop could not load the high score.",
      error
    );

    return 0;
  }
}


function saveHighScore() {
  try {
    localStorage.setItem(
      "blockDropHighScore",
      String(highScore)
    );
  } catch (error) {
    console.warn(
      "Block Drop could not save the high score.",
      error
    );
  }
}


/* =========================================================
   23. GENERATED SOUND EFFECTS
========================================================= */

function initialiseAudio() {
  if (audioContext) {
    if (
      audioContext.state === "suspended"
    ) {
      audioContext.resume().catch(() => {});
    }

    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  audioContext =
    new AudioContextClass();
}


function playTone({
  frequency = 440,
  duration = 0.08,
  volume = 0.04,
  type = "square",
  slideTo = null,
  delay = 0
} = {}) {
  if (
    soundMuted ||
    !audioContext
  ) {
    return;
  }

  const startTime =
    audioContext.currentTime + delay;

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.type = type;

  oscillator.frequency.setValueAtTime(
    frequency,
    startTime
  );

  if (slideTo !== null) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, slideTo),
      startTime + duration
    );
  }

  gain.gain.setValueAtTime(
    Math.max(0.0001, volume),
    startTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + duration
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}


function playSound(soundName) {
  if (soundMuted) {
    return;
  }

  initialiseAudio();

  if (!audioContext) {
    return;
  }

  const sounds = {
    move() {
      playTone({
        frequency: 180,
        slideTo: 145,
        duration: 0.035,
        volume: 0.018,
        type: "square"
      });
    },

    blocked() {
      playTone({
        frequency: 95,
        duration: 0.045,
        volume: 0.018,
        type: "square"
      });
    },

    rotate() {
      playTone({
        frequency: 290,
        slideTo: 420,
        duration: 0.055,
        volume: 0.022,
        type: "triangle"
      });
    },

    hold() {
      playTone({
        frequency: 340,
        slideTo: 210,
        duration: 0.1,
        volume: 0.025,
        type: "sine"
      });
    },

    land() {
      playTone({
        frequency: 115,
        slideTo: 75,
        duration: 0.085,
        volume: 0.035,
        type: "square"
      });
    },

    hardDrop() {
      playTone({
        frequency: 280,
        slideTo: 70,
        duration: 0.13,
        volume: 0.045,
        type: "sawtooth"
      });
    },

    lineClear() {
      [440, 590, 740].forEach(
        (frequency, index) => {
          playTone({
            frequency,
            duration: 0.12,
            volume: 0.035,
            type: "triangle",
            delay: index * 0.055
          });
        }
      );
    },

    fourLines() {
      [220, 330, 440, 660, 880].forEach(
        (frequency, index) => {
          playTone({
            frequency,
            duration: 0.22,
            volume: 0.043,
            type: "sawtooth",
            delay: index * 0.05
          });
        }
      );
    },

    levelUp() {
      [392, 523, 659, 784].forEach(
        (frequency, index) => {
          playTone({
            frequency,
            duration: 0.16,
            volume: 0.035,
            type: "triangle",
            delay: index * 0.07
          });
        }
      );
    },

    start() {
      [220, 330, 440].forEach(
        (frequency, index) => {
          playTone({
            frequency,
            duration: 0.16,
            volume: 0.035,
            type: "triangle",
            delay: index * 0.08
          });
        }
      );
    },

    pause() {
      playTone({
        frequency: 330,
        slideTo: 180,
        duration: 0.14,
        volume: 0.028,
        type: "sine"
      });
    },

    resume() {
      playTone({
        frequency: 220,
        slideTo: 440,
        duration: 0.14,
        volume: 0.028,
        type: "sine"
      });
    },

    gameOver() {
      [330, 247, 196, 130].forEach(
        (frequency, index) => {
          playTone({
            frequency,
            duration: 0.3,
            volume: 0.04,
            type: "sawtooth",
            delay: index * 0.13
          });
        }
      );
    }
  };

  sounds[soundName]?.();
}


/* =========================================================
   24. KEYBOARD CONTROLS
========================================================= */

function handleKeyboardInput(event) {
  const controlledKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowDown",
    "ArrowUp",
    " ",
    "Spacebar",
    "q",
    "Q",
    "e",
    "E",
    "w",
    "W",
    "c",
    "C",
    "p",
    "P",
    "Escape",
    "Enter"
  ];

  if (
    controlledKeys.includes(event.key)
  ) {
    event.preventDefault();
  }

  if (
    !gameStarted &&
    !gameOver &&
    (
      event.key === "Enter" ||
      event.key === " "
    )
  ) {
    startNewGame();
    return;
  }

  if (
    gameOver &&
    (
      event.key === "Enter" ||
      event.key === " "
    )
  ) {
    startNewGame();
    return;
  }

  if (
    event.key === "p" ||
    event.key === "P" ||
    event.key === "Escape"
  ) {
    togglePause();
    return;
  }

  if (!canControlPlayer()) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      movePlayer(-1);
      break;

    case "ArrowRight":
      movePlayer(1);
      break;

    case "ArrowDown":
      softDropPlayer();
      break;

    case "ArrowUp":
    case "e":
    case "E":
    case "w":
    case "W":
      rotatePlayer(1);
      break;

    case "q":
    case "Q":
      rotatePlayer(-1);
      break;

    case " ":
    case "Spacebar":
      hardDropPlayer();
      break;

    case "c":
    case "C":
      holdCurrentPiece();
      break;

    default:
      break;
  }
}


/* =========================================================
   25. TOUCH CONTROLS
========================================================= */

function handleTouchAction(action) {
  switch (action) {
    case "left":
      movePlayer(-1);
      break;

    case "right":
      movePlayer(1);
      break;

    case "soft-drop":
      softDropPlayer();
      break;

    case "hard-drop":
      hardDropPlayer();
      break;

    case "rotate-left":
      rotatePlayer(-1);
      break;

    case "rotate-right":
      rotatePlayer(1);
      break;

    case "hold":
      holdCurrentPiece();
      break;

    case "pause":
      togglePause();
      break;

    default:
      break;
  }
}


function initialiseTouchControls() {
  const touchButtons =
    document.querySelectorAll(
      "[data-action]"
    );

  touchButtons.forEach((button) => {
    const action =
      button.dataset.action;

    let repeatTimer = null;
    let repeatInterval = null;

    const repeatableActions = [
      "left",
      "right",
      "soft-drop"
    ];

    const stopRepeating = () => {
      if (repeatTimer) {
        window.clearTimeout(
          repeatTimer
        );

        repeatTimer = null;
      }

      if (repeatInterval) {
        window.clearInterval(
          repeatInterval
        );

        repeatInterval = null;
      }

      button.classList.remove(
        "is-pressed"
      );
    };

    button.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();

        initialiseAudio();

        button.classList.add(
          "is-pressed"
        );

        handleTouchAction(action);

        if (
          repeatableActions.includes(action)
        ) {
          repeatTimer =
            window.setTimeout(() => {
              repeatInterval =
                window.setInterval(() => {
                  handleTouchAction(action);
                }, 75);
            }, 240);
        }
      }
    );

    button.addEventListener(
      "pointerup",
      stopRepeating
    );

    button.addEventListener(
      "pointercancel",
      stopRepeating
    );

    button.addEventListener(
      "pointerleave",
      stopRepeating
    );

    button.addEventListener(
      "contextmenu",
      (event) => {
        event.preventDefault();
      }
    );
  });
}


/* =========================================================
   26. BUTTON EVENTS
========================================================= */

startButton?.addEventListener(
  "click",
  startNewGame
);

resumeButton?.addEventListener(
  "click",
  resumeGame
);

playAgainButton?.addEventListener(
  "click",
  startNewGame
);

pauseButton?.addEventListener(
  "click",
  togglePause
);

restartButton?.addEventListener(
  "click",
  restartGame
);

soundButton?.addEventListener(
  "click",
  () => {
    soundMuted = !soundMuted;

    soundButton.setAttribute(
      "aria-pressed",
      String(soundMuted)
    );

    soundButton.setAttribute(
      "aria-label",
      soundMuted
        ? "Enable sound"
        : "Mute sound"
    );

    if (!soundMuted) {
      initialiseAudio();
      playSound("resume");
    }
  }
);

document.addEventListener(
  "keydown",
  handleKeyboardInput
);

document.addEventListener(
  "pointerdown",
  initialiseAudio,
  {
    once: true
  }
);


/* =========================================================
   27. AUTOMATIC PAUSE
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.hidden &&
      gameStarted &&
      !gamePaused &&
      !gameOver
    ) {
      pauseGame();
    }
  }
);


/* =========================================================
   28. ANIMATION LOOP
========================================================= */

function updateGame(currentTime = 0) {
  const deltaTime = Math.min(
    currentTime - lastFrameTime,
    100
  );

  lastFrameTime = currentTime;

  if (
    gameStarted &&
    !gamePaused &&
    !gameOver
  ) {
    dropCounter += deltaTime;

    if (
      dropCounter >= getDropInterval()
    ) {
      softDropPlayer({
        reward: false
      });

      dropCounter = 0;
    }
  }

  drawGame();

  window.requestAnimationFrame(
    updateGame
  );
}


/* =========================================================
   29. INITIALISATION
========================================================= */

function initialiseGame() {
  updateInterface();
  updateComboDisplay();

  drawPreviewPiece();
  drawHeldPiece();
  drawGame();

  setGameStatus("Ready", "ready");

  initialiseTouchControls();
  chooseRandomTip();

  window.requestAnimationFrame(
    updateGame
  );
}

initialiseGame();
