"use strict";


/* =========================================================
   BLOCK DROP V2
   DESKTOP + PORTRAIT GESTURES + LANDSCAPE CONTROLS
   Pointless Productions
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const canvas = document.querySelector("#tetris");
const context = canvas?.getContext("2d");

const previewCanvas = document.querySelector("#preview");
const previewContext = previewCanvas?.getContext("2d");

const mobilePreviewCanvas =
  document.querySelector("#mobile-preview");

const mobilePreviewContext =
  mobilePreviewCanvas?.getContext("2d");

const holdCanvas =
  document.querySelector("#hold-canvas");

const holdContext =
  holdCanvas?.getContext("2d");


const gestureSurface =
  document.querySelector("#gesture-surface");

const landscapeTouchpadSurface =
  document.querySelector("#landscape-touchpad-surface");

const gestureTutorial =
  document.querySelector("#gesture-tutorial");


const scoreElement =
  document.querySelector("#score");

const highScoreElement =
  document.querySelector("#high-score");

const levelElement =
  document.querySelector("#level");

const linesElement =
  document.querySelector("#lines");

const comboElement =
  document.querySelector("#combo");


const mobileScoreElement =
  document.querySelector("#mobile-score");

const mobileLevelElement =
  document.querySelector("#mobile-level");

const mobileLinesElement =
  document.querySelector("#mobile-lines");


const finalScoreElement =
  document.querySelector("#final-score");

const highScoreMessage =
  document.querySelector("#new-high-score-message");

const holdEmptyMessage =
  document.querySelector("#hold-empty-message");

const gameTipElement =
  document.querySelector("#game-tip");


const statusElement =
  document.querySelector("#game-status");

const statusLight =
  document.querySelector("#status-light");


const startOverlay =
  document.querySelector("#start-overlay");

const rotateDeviceOverlay =
  document.querySelector("#rotate-device-overlay");

const countdownOverlay =
  document.querySelector("#countdown-overlay");

const countdownNumber =
  document.querySelector("#countdown-number");

const pauseOverlay =
  document.querySelector("#pause-overlay");

const controlsOverlay =
  document.querySelector("#controls-overlay");

const gameOverOverlay =
  document.querySelector("#game-over-overlay");


const audioOnButton =
  document.querySelector("#audio-on-button");

const audioOffButton =
  document.querySelector("#audio-off-button");

const continuePortraitButton =
  document.querySelector("#continue-portrait-button");

const switchToPortraitGestureButton =
  document.querySelector(
    "#switch-to-portrait-gesture-button"
  );


const resumeButton =
  document.querySelector("#resume-button");

const playAgainButton =
  document.querySelector("#play-again-button");

const pauseButton =
  document.querySelector("#pause-button");

const restartButton =
  document.querySelector("#restart-button");

const soundButton =
  document.querySelector("#sound-button");


const pauseControlsButton =
  document.querySelector("#pause-controls-button");

const pauseAudioButton =
  document.querySelector("#pause-audio-button");

const pauseExitButton =
  document.querySelector("#pause-exit-button");

const gameOverControlsButton =
  document.querySelector("#game-over-controls-button");

const gameOverExitButton =
  document.querySelector("#game-over-exit-button");


const choosePortraitGestureButton =
  document.querySelector(
    "#choose-portrait-gesture-button"
  );

const chooseLandscapeTouchpadButton =
  document.querySelector(
    "#choose-landscape-touchpad-button"
  );

const chooseLandscapeButtonsButton =
  document.querySelector(
    "#choose-landscape-buttons-button"
  );

const closeControlsOverlayButton =
  document.querySelector(
    "#close-controls-overlay-button"
  );


const mobilePauseButton =
  document.querySelector("#mobile-pause-button");

const mobileMenuButton =
  document.querySelector("#mobile-menu-button");

const mobileExitButton =
  document.querySelector("#mobile-exit-button");


const gestureMenuButton =
  document.querySelector("#gesture-menu-button");

const mobileQuickMenu =
  document.querySelector("#mobile-quick-menu");

const mobileQuickMenuBackdrop =
  document.querySelector(
    "#mobile-quick-menu-backdrop"
  );

const closeMobileMenuButton =
  document.querySelector(
    "#close-mobile-menu-button"
  );

const quickMenuPauseButton =
  document.querySelector(
    "#quick-menu-pause-button"
  );

const quickMenuAudioButton =
  document.querySelector(
    "#quick-menu-audio-button"
  );

const quickMenuRotationButton =
  document.querySelector(
    "#quick-menu-rotation-button"
  );

const quickMenuRotationIcon =
  document.querySelector(
    "#quick-menu-rotation-icon"
  );

const quickMenuRotationLabel =
  document.querySelector(
    "#quick-menu-rotation-label"
  );

const quickMenuControlsButton =
  document.querySelector(
    "#quick-menu-controls-button"
  );

const quickMenuExitButton =
  document.querySelector(
    "#quick-menu-exit-button"
  );


const desktopRotationButton =
  document.querySelector(
    "#desktop-rotation-button"
  );

const desktopRotationIcon =
  document.querySelector(
    "#desktop-rotation-icon"
  );

const desktopRotationLabel =
  document.querySelector(
    "#desktop-rotation-label"
  );


const rotationDirectionButton =
  document.querySelector(
    "#rotation-direction-button"
  );

const rotationDirectionIcon =
  document.querySelector(
    "#rotation-direction-icon"
  );

const rotationDirectionLabel =
  document.querySelector(
    "#rotation-direction-label"
  );


const touchpadRotationButton =
  document.querySelector(
    "#touchpad-rotation-direction-button"
  );

const touchpadRotationIcon =
  document.querySelector(
    "#touchpad-rotation-direction-icon"
  );

const touchpadRotationLabel =
  document.querySelector(
    "#touchpad-rotation-direction-label"
  );


const controlModeInputs =
  document.querySelectorAll(
    'input[name="control-mode"]'
  );

const controlSideInputs =
  document.querySelectorAll(
    'input[name="control-side"]'
  );

const settingsControlSideInputs =
  document.querySelectorAll(
    'input[name="settings-control-side"]'
  );


const lineAnnouncement =
  document.querySelector("#line-announcement");

const screenFlash =
  document.querySelector("#screen-flash");


const audioSettingsButton =
  document.querySelector(
    "#audio-settings-button"
  );

const audioSettingsPanel =
  document.querySelector(
    "#audio-settings-panel"
  );

const audioSettingsBackdrop =
  document.querySelector(
    "#audio-settings-backdrop"
  );

const audioSettingsClose =
  document.querySelector(
    "#audio-settings-close"
  );

const musicVolumeSlider =
  document.querySelector("#music-volume");

const effectsVolumeSlider =
  document.querySelector("#effects-volume");

const voiceVolumeSlider =
  document.querySelector("#voice-volume");

const musicVolumeOutput =
  document.querySelector(
    "#music-volume-output"
  );

const effectsVolumeOutput =
  document.querySelector(
    "#effects-volume-output"
  );

const voiceVolumeOutput =
  document.querySelector(
    "#voice-volume-output"
  );

const muteAllButton =
  document.querySelector("#mute-all-button");

const resetAudioButton =
  document.querySelector("#reset-audio-button");


const anaglyphToggleButton =
  document.querySelector("#anaglyph-toggle-button");

const anaglyphToggleLabel =
  document.querySelector("#anaglyph-toggle-label");

const anaglyphDepthSlider =
  document.querySelector("#anaglyph-depth-slider");

const anaglyphDepthOutput =
  document.querySelector("#anaglyph-depth-output");

const quickMenuAnaglyphButton =
  document.querySelector("#quick-menu-anaglyph-button");

const quickMenuAnaglyphLabel =
  document.querySelector("#quick-menu-anaglyph-label");

const quickMenuAnaglyphDepthSlider =
  document.querySelector("#quick-menu-anaglyph-depth-slider");

const quickMenuAnaglyphDepthOutput =
  document.querySelector("#quick-menu-anaglyph-depth-output");


if (
  !canvas ||
  !context ||
  !previewCanvas ||
  !previewContext ||
  !holdCanvas ||
  !holdContext
) {
  throw new Error(
    "Block Drop could not find its required canvas elements."
  );
}


/* =========================================================
   2. GAME CONSTANTS
========================================================= */

const BOARD_COLUMNS = 12;
const BOARD_ROWS = 20;

const BOARD_BLOCK_SIZE =
  canvas.width / BOARD_COLUMNS;

const PIECE_TYPES = [
  "T",
  "J",
  "L",
  "O",
  "S",
  "Z",
  "I"
];


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


const LINE_ANNOUNCEMENTS = {
  1: "Single!",
  2: "Double!",
  3: "Triple!",
  4: "Block Drop!"
};


const GAME_TIPS = [

  "Leave a gap for the long piece. It will arrive immediately after you stop waiting for it.",

  "The ghost piece shows where a block will land. It cannot show whether the decision is wise.",

  "Holding a piece is strategic. Holding every piece because you panicked is less strategic.",

  "Clear four lines together for the largest standard line bonus.",

  "The blocks speed up every ten cleared lines. This is apparently considered encouragement.",

  "Soft drops earn a little score. Hard drops earn more and look considerably more dramatic.",

  "Do not build a beautiful tower. The game is specifically asking you to destroy it.",

  "A flat board is normally safer than a skyline inspired by central London."

];


/* =========================================================
   3. CONTROL CONSTANTS
========================================================= */

const MOBILE_GAME_BREAKPOINT = 1024;

const CONTROL_MODE_STORAGE_KEY =
  "blockDropControlMode";

const CONTROL_SIDE_STORAGE_KEY =
  "blockDropControlSide";

const ROTATION_STORAGE_KEY =
  "blockDropRotationDirection";

const GESTURE_TUTORIAL_STORAGE_KEY =
  "blockDropGestureTutorialSeen";


const CONTROL_MODE_PORTRAIT_GESTURE =
  "portrait-gesture";

const CONTROL_MODE_LANDSCAPE_TOUCHPAD =
  "landscape-touchpad";

const CONTROL_MODE_LANDSCAPE_BUTTONS =
  "landscape-buttons";


const VALID_CONTROL_MODES = [
  CONTROL_MODE_PORTRAIT_GESTURE,
  CONTROL_MODE_LANDSCAPE_TOUCHPAD,
  CONTROL_MODE_LANDSCAPE_BUTTONS
];


const VALID_CONTROL_SIDES = [
  "left",
  "right"
];


const TAP_MOVEMENT_LIMIT = 14;
const TAP_DURATION_LIMIT = 360;

const SWIPE_THRESHOLD = 34;
const SWIPE_STEP_DISTANCE = 52;
const MAX_SWIPE_STEPS = 5;

const HOLD_DELAY = 300;
const HOLD_DROP_INTERVAL = 85;


/* =========================================================
   4. AUDIO CONSTANTS
========================================================= */

const AUDIO_STORAGE_KEY =
  "blockDropAudioSettings";


const ANAGLYPH_STORAGE_KEY =
  "blockDropAnaglyphSettings";

const ANAGLYPH_DEPTHS = {
  grid: -2,
  settled: 1,
  ghost: 1,
  falling: 1,
  rotating: 2
};

const ANAGLYPH_MAX_PIXEL_SHIFT = 5;
const ANAGLYPH_ROTATION_BOOST_MS = 170;


const DEFAULT_AUDIO_SETTINGS = {
  music: 0.3,
  effects: 0.55,
  voice: 0.85,
  muted: false
};


const musicTracks = {

  menu: createAudio(
    "assets/sounds/music/block-drop-menu.mp3",
    true
  ),

  gameplay: createAudio(
    "assets/sounds/music/block-drop-gameplay.mp3",
    true
  ),

  danger: createAudio(
    "assets/sounds/music/block-drop-danger.mp3",
    true
  )

};


const effectPaths = {

  titleOne:
    "assets/sounds/effects/blockdrop.mp3",

  titleTwo:
    "assets/sounds/effects/blockdrop2.mp3",

  lineClear:
    "assets/sounds/effects/line-clear.mp3",

  fourLineClear:
    "assets/sounds/effects/four-line-clear.mp3",

  levelUp:
    "assets/sounds/effects/level-up.mp3",

  gameOver:
    "assets/sounds/effects/game-over.mp3",

  gameOverWhispered:
    "assets/sounds/effects/game-over-whispered.mp3"

};


const voicePaths = {

  beautiful:
    "assets/sounds/voices/beautiful.mp3",

  dangerous:
    "assets/sounds/voices/dangerous.mp3",

  nice:
    "assets/sounds/voices/nice.mp3",

  okay:
    "assets/sounds/voices/okay.mp3",

  thatllDo:
    "assets/sounds/voices/thatll-do.mp3",

  clockwise:
    "assets/sounds/voices/clockwise.mp3",

  anticlockwise:
    "assets/sounds/voices/anticlockwise.mp3"

};


/* =========================================================
   5. GAME STATE
========================================================= */

const arena =
  createMatrix(
    BOARD_COLUMNS,
    BOARD_ROWS
  );


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

let pieceBag = [];
let canHold = true;


let score = 0;
let highScore = loadHighScore();
let runStartingHighScore = highScore;

let level = 1;
let clearedLines = 0;

let combo = -1;
let bestCombo = 0;


let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let countdownRunning = false;

let mobileGameModeActive = false;


let currentControlMode =
  loadControlMode();

let currentControlSide =
  loadControlSide();

let tapRotationDirection =
  loadRotationDirection();


let pendingAudioEnabled = true;
let waitingForLandscapeRotation = false;

let controlsOverlayReturnTarget = "pause";


let dropCounter = 0;
let lastFrameTime = performance.now();


let dangerActive = false;
let dangerVoicePlayed = false;

let announcementTimer = null;
let tutorialTimer = null;


let audioSettings =
  loadAudioSettings();

let audioContext = null;

let activeMusic = null;
let activeMusicName = "";

let activeVoice = null;


let anaglyphSettings =
  loadAnaglyphSettings();

let rotationDepthBoostUntil = 0;

const stereoLayerCanvas =
  document.createElement("canvas");

const stereoLayerContext =
  stereoLayerCanvas.getContext("2d");

const stereoTintCanvas =
  document.createElement("canvas");

const stereoTintContext =
  stereoTintCanvas.getContext("2d");


/* =========================================================
   6. GESTURE STATE
========================================================= */

const gestureState = {

  pointerId: null,

  surface: null,

  startX: 0,
  startY: 0,

  currentX: 0,
  currentY: 0,

  startTime: 0,

  moved: false,
  holding: false,

  holdTimeout: null,
  holdInterval: null

};


/* =========================================================
   7. MATRIX UTILITIES
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

  return matrix.map(
    (row) => [...row]
  );

}


function clearArena() {

  arena.forEach((row) => {
    row.fill(0);
  });

}


function createPiece(type) {

  const shape =
    PIECE_SHAPES[type];

  if (!shape) {

    throw new Error(
      `Unknown Block Drop piece type: ${type}`
    );

  }

  return {
    type,
    matrix: cloneMatrix(shape)
  };

}


/* =========================================================
   8. RANDOM PIECE BAG
========================================================= */

function shuffleArray(array) {

  const copy = [...array];

  for (
    let index = copy.length - 1;
    index > 0;
    index -= 1
  ) {

    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );

    [
      copy[index],
      copy[randomIndex]
    ] = [
      copy[randomIndex],
      copy[index]
    ];

  }

  return copy;

}


function getNextPieceType() {

  if (pieceBag.length === 0) {

    pieceBag =
      shuffleArray(PIECE_TYPES);

  }

  return pieceBag.pop();

}


/* =========================================================
   9. SAVED PREFERENCES
========================================================= */

function loadHighScore() {

  try {

    const storedValue =
      Number.parseInt(
        localStorage.getItem(
          "blockDropHighScore"
        ) || "",
        10
      );

    return Number.isFinite(storedValue)
      ? storedValue
      : 0;

  } catch (error) {

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


function loadControlMode() {

  try {

    const stored =
      localStorage.getItem(
        CONTROL_MODE_STORAGE_KEY
      );

    return VALID_CONTROL_MODES.includes(stored)
      ? stored
      : CONTROL_MODE_PORTRAIT_GESTURE;

  } catch (error) {

    return CONTROL_MODE_PORTRAIT_GESTURE;

  }

}


function saveControlMode() {

  try {

    localStorage.setItem(
      CONTROL_MODE_STORAGE_KEY,
      currentControlMode
    );

  } catch (error) {

    console.warn(
      "Block Drop could not save the control mode.",
      error
    );

  }

}


function loadControlSide() {

  try {

    const stored =
      localStorage.getItem(
        CONTROL_SIDE_STORAGE_KEY
      );

    return VALID_CONTROL_SIDES.includes(stored)
      ? stored
      : "right";

  } catch (error) {

    return "right";

  }

}


function saveControlSide() {

  try {

    localStorage.setItem(
      CONTROL_SIDE_STORAGE_KEY,
      currentControlSide
    );

  } catch (error) {

    console.warn(
      "Block Drop could not save the control side.",
      error
    );

  }

}


function loadRotationDirection() {

  try {

    const stored =
      localStorage.getItem(
        ROTATION_STORAGE_KEY
      );

    return stored === "anticlockwise"
      ? -1
      : 1;

  } catch (error) {

    return 1;

  }

}


function saveRotationDirection() {

  try {

    localStorage.setItem(
      ROTATION_STORAGE_KEY,
      tapRotationDirection === 1
        ? "clockwise"
        : "anticlockwise"
    );

  } catch (error) {

    console.warn(
      "Block Drop could not save rotation direction.",
      error
    );

  }

}


/* =========================================================
   9B. ANAGLYPH 3D SETTINGS
========================================================= */

function loadAnaglyphSettings() {

  try {

    const stored =
      localStorage.getItem(
        ANAGLYPH_STORAGE_KEY
      );

    if (!stored) {
      return {
        enabled: false,
        depth: 1
      };
    }

    const parsed =
      JSON.parse(stored);

    return {
      enabled:
        Boolean(parsed.enabled),
      depth:
        Math.min(
          2,
          Math.max(
            0,
            Number(parsed.depth) || 1
          )
        )
    };

  } catch (error) {

    return {
      enabled: false,
      depth: 1
    };

  }

}


function saveAnaglyphSettings() {

  try {

    localStorage.setItem(
      ANAGLYPH_STORAGE_KEY,
      JSON.stringify(
        anaglyphSettings
      )
    );

  } catch (error) {

    console.warn(
      "Block Drop could not save 3D settings.",
      error
    );

  }

}


function updateAnaglyphInterface() {

  const enabled =
    anaglyphSettings.enabled;

  const depthPercent =
    Math.round(
      anaglyphSettings.depth * 100
    );

  document.body.classList.toggle(
    "anaglyph-enabled",
    enabled
  );

  anaglyphToggleButton?.classList.toggle(
    "is-active",
    enabled
  );

  anaglyphToggleButton?.setAttribute(
    "aria-pressed",
    String(enabled)
  );

  anaglyphToggleButton?.setAttribute(
    "aria-label",
    enabled
      ? "Disable anaglyph 3D mode"
      : "Enable anaglyph 3D mode"
  );

  quickMenuAnaglyphButton?.classList.toggle(
    "is-active",
    enabled
  );

  quickMenuAnaglyphButton?.setAttribute(
    "aria-pressed",
    String(enabled)
  );

  if (anaglyphToggleLabel) {
    anaglyphToggleLabel.textContent =
      enabled
        ? "3D On"
        : "3D Off";
  }

  if (quickMenuAnaglyphLabel) {
    quickMenuAnaglyphLabel.textContent =
      enabled
        ? "3D On"
        : "3D Off";
  }

  if (anaglyphDepthSlider) {
    anaglyphDepthSlider.value =
      String(depthPercent);
  }

  if (quickMenuAnaglyphDepthSlider) {
    quickMenuAnaglyphDepthSlider.value =
      String(depthPercent);
  }

  if (anaglyphDepthOutput) {
    anaglyphDepthOutput.textContent =
      `${depthPercent}%`;
  }

  if (quickMenuAnaglyphDepthOutput) {
    quickMenuAnaglyphDepthOutput.textContent =
      `${depthPercent}%`;
  }

}


function setAnaglyphEnabled(enabled) {

  anaglyphSettings.enabled =
    Boolean(enabled);

  saveAnaglyphSettings();
  updateAnaglyphInterface();
  drawGameBoard();

}


function setAnaglyphDepthFromPercent(percent) {

  const numericPercent =
    Math.min(
      200,
      Math.max(
        0,
        Number(percent) || 0
      )
    );

  anaglyphSettings.depth =
    numericPercent / 100;

  saveAnaglyphSettings();
  updateAnaglyphInterface();
  drawGameBoard();

}


function prepareStereoCanvases() {

  if (
    stereoLayerCanvas.width !==
      canvas.width ||
    stereoLayerCanvas.height !==
      canvas.height
  ) {

    stereoLayerCanvas.width =
      canvas.width;

    stereoLayerCanvas.height =
      canvas.height;

  }

  if (
    stereoTintCanvas.width !==
      canvas.width ||
    stereoTintCanvas.height !==
      canvas.height
  ) {

    stereoTintCanvas.width =
      canvas.width;

    stereoTintCanvas.height =
      canvas.height;

  }

}


function drawTintedStereoCopy(
  sourceCanvas,
  tint,
  offsetX
) {

  stereoTintContext.clearRect(
    0,
    0,
    stereoTintCanvas.width,
    stereoTintCanvas.height
  );

  stereoTintContext.globalCompositeOperation =
    "source-over";

  stereoTintContext.drawImage(
    sourceCanvas,
    0,
    0
  );

  stereoTintContext.globalCompositeOperation =
    "source-in";

  stereoTintContext.fillStyle =
    tint;

  stereoTintContext.fillRect(
    0,
    0,
    stereoTintCanvas.width,
    stereoTintCanvas.height
  );

  stereoTintContext.globalCompositeOperation =
    "source-over";

  context.drawImage(
    stereoTintCanvas,
    offsetX,
    0
  );

}


function drawStereoLayer(
  drawLayer,
  logicalDepth
) {

  if (
    !anaglyphSettings.enabled ||
    !stereoLayerContext ||
    !stereoTintContext
  ) {

    drawLayer(context);
    return;

  }

  prepareStereoCanvases();

  stereoLayerContext.clearRect(
    0,
    0,
    stereoLayerCanvas.width,
    stereoLayerCanvas.height
  );

  drawLayer(
    stereoLayerContext
  );

  const pixelShift =
    logicalDepth *
    anaglyphSettings.depth *
    ANAGLYPH_MAX_PIXEL_SHIFT;

  context.save();

  context.globalCompositeOperation =
    "screen";

  drawTintedStereoCopy(
    stereoLayerCanvas,
    "rgb(255,0,0)",
    -pixelShift
  );

  drawTintedStereoCopy(
    stereoLayerCanvas,
    "rgb(0,255,255)",
    pixelShift
  );

  context.restore();

}


/* =========================================================
   10. CONTROL MODE INTERFACE
========================================================= */

function applyControlPreferences() {

  document.body.classList.remove(
    "control-mode-portrait-gesture",
    "control-mode-landscape-touchpad",
    "control-mode-landscape-buttons",
    "control-side-left",
    "control-side-right"
  );


  document.body.classList.add(
    `control-mode-${currentControlMode}`,
    `control-side-${currentControlSide}`
  );


  controlModeInputs.forEach((input) => {

    input.checked =
      input.value === currentControlMode;

  });


  controlSideInputs.forEach((input) => {

    input.checked =
      input.value === currentControlSide;

  });


  settingsControlSideInputs.forEach(
    (input) => {

      input.checked =
        input.value === currentControlSide;

    }
  );


  choosePortraitGestureButton?.classList.toggle(
    "is-active",
    currentControlMode ===
      CONTROL_MODE_PORTRAIT_GESTURE
  );


  chooseLandscapeTouchpadButton?.classList.toggle(
    "is-active",
    currentControlMode ===
      CONTROL_MODE_LANDSCAPE_TOUCHPAD
  );


  chooseLandscapeButtonsButton?.classList.toggle(
    "is-active",
    currentControlMode ===
      CONTROL_MODE_LANDSCAPE_BUTTONS
  );

}


function setControlMode(mode, options = {}) {

  if (!VALID_CONTROL_MODES.includes(mode)) {
    return;
  }


  const {
    save = true,
    closeOverlay = true
  } = options;


  cancelGesture();

  currentControlMode = mode;

  if (save) {
    saveControlMode();
  }

  applyControlPreferences();


  if (
    mobileGameModeActive &&
    isLandscapeControlMode() &&
    isPortraitOrientation()
  ) {

    showRotateDeviceOverlay();

  } else {

    hideRotateDeviceOverlay();

  }


  if (closeOverlay) {
    closeControlsOverlay();
  }

}


function setControlSide(side) {

  if (!VALID_CONTROL_SIDES.includes(side)) {
    return;
  }

  currentControlSide = side;

  saveControlSide();
  applyControlPreferences();

}


function isLandscapeControlMode() {

  return (
    currentControlMode ===
      CONTROL_MODE_LANDSCAPE_TOUCHPAD ||
    currentControlMode ===
      CONTROL_MODE_LANDSCAPE_BUTTONS
  );

}


function isPortraitOrientation() {

  return window.matchMedia(
    "(orientation: portrait)"
  ).matches;

}


function readStartScreenPreferences() {

  const selectedMode =
    document.querySelector(
      'input[name="control-mode"]:checked'
    )?.value;


  const selectedSide =
    document.querySelector(
      'input[name="control-side"]:checked'
    )?.value;


  if (VALID_CONTROL_MODES.includes(selectedMode)) {

    currentControlMode =
      selectedMode;

  }


  if (VALID_CONTROL_SIDES.includes(selectedSide)) {

    currentControlSide =
      selectedSide;

  }


  saveControlMode();
  saveControlSide();

  applyControlPreferences();

}


/* =========================================================
   11. MOBILE GAME MODE
========================================================= */

function shouldUseMobileGameMode() {

  return (
    window.matchMedia(
      `(max-width: ${MOBILE_GAME_BREAKPOINT}px)`
    ).matches ||
    window.matchMedia(
      "(pointer: coarse)"
    ).matches
  );

}


function enterMobileGameMode() {

  if (!shouldUseMobileGameMode()) {
    return;
  }


  mobileGameModeActive = true;

  document.body.classList.add(
    "mobile-game-mode"
  );

  applyControlPreferences();

  document.documentElement.style.overscrollBehavior =
    "none";


  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });

}


function exitMobileGameMode(options = {}) {

  const {
    pauseFirst = true
  } = options;


  if (
    pauseFirst &&
    gameStarted &&
    !gamePaused &&
    !gameOver
  ) {

    pauseGame();

  }


  mobileGameModeActive = false;

  cancelGesture();

  closeMobileQuickMenu();
  closeAudioSettings();

  document.body.classList.remove(
    "mobile-game-mode"
  );

  document.documentElement.style.overscrollBehavior =
    "";


  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   12. ROTATE DEVICE OVERLAY
========================================================= */

function showRotateDeviceOverlay() {

  if (!rotateDeviceOverlay) {
    return;
  }

  waitingForLandscapeRotation = true;

  rotateDeviceOverlay.classList.add(
    "is-visible"
  );

  rotateDeviceOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

}


function hideRotateDeviceOverlay() {

  if (!rotateDeviceOverlay) {
    return;
  }

  waitingForLandscapeRotation = false;

  rotateDeviceOverlay.classList.remove(
    "is-visible"
  );

  rotateDeviceOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* =========================================================
   PART 1 ENDS HERE
   PASTE PART 2 DIRECTLY BELOW THIS COMMENT
========================================================= */

/* =========================================================
   13. BASIC AUDIO UTILITIES
========================================================= */

function createAudio(
  path,
  shouldLoop = false
) {

  const audio = new Audio(path);

  audio.preload = "auto";
  audio.loop = shouldLoop;
  audio.volume = 0;

  return audio;

}


function clampVolume(value) {

  return Math.min(
    1,
    Math.max(
      0,
      Number(value) || 0
    )
  );

}


function safelyPlay(audio) {

  if (
    !audio ||
    audioSettings.muted
  ) {
    return;
  }


  const playPromise =
    audio.play();


  if (
    playPromise &&
    typeof playPromise.catch === "function"
  ) {

    playPromise.catch((error) => {

      console.warn(
        "Block Drop audio could not play.",
        error
      );

    });

  }

}


function initialiseAudioContext() {

  if (audioSettings.muted) {
    return;
  }


  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioContextClass) {
    return;
  }


  if (!audioContext) {

    audioContext =
      new AudioContextClass();

  }


  if (audioContext.state === "suspended") {

    audioContext
      .resume()
      .catch(() => {});

  }

}


function playImportedClip(
  path,
  channel = "effects",
  delay = 0
) {

  if (
    !path ||
    audioSettings.muted
  ) {
    return;
  }


  const channelVolume =
    channel === "voice"
      ? audioSettings.voice
      : audioSettings.effects;


  if (channelVolume <= 0) {
    return;
  }


  window.setTimeout(() => {

    if (audioSettings.muted) {
      return;
    }


    const clip =
      createAudio(
        path,
        false
      );


    clip.volume =
      clampVolume(channelVolume);


    safelyPlay(clip);

  }, delay);

}


function playVoiceClip(
  path,
  delay = 0,
  options = {}
) {

  const {
    interrupt = false
  } = options;


  if (
    !path ||
    audioSettings.muted ||
    audioSettings.voice <= 0
  ) {
    return;
  }


  window.setTimeout(() => {

    if (
      audioSettings.muted ||
      audioSettings.voice <= 0
    ) {
      return;
    }


    if (
      activeVoice &&
      !interrupt
    ) {
      return;
    }


    if (
      activeVoice &&
      interrupt
    ) {

      activeVoice.pause();
      activeVoice.currentTime = 0;
      activeVoice = null;

    }


    const clip =
      createAudio(
        path,
        false
      );


    clip.volume =
      clampVolume(
        audioSettings.voice
      );


    activeVoice = clip;


    const releaseVoice = () => {

      if (activeVoice === clip) {
        activeVoice = null;
      }

    };


    clip.addEventListener(
      "ended",
      releaseVoice,
      {
        once: true
      }
    );


    clip.addEventListener(
      "error",
      releaseVoice,
      {
        once: true
      }
    );


    safelyPlay(clip);

  }, delay);

}


function stopActiveVoice() {

  if (!activeVoice) {
    return;
  }

  activeVoice.pause();
  activeVoice.currentTime = 0;
  activeVoice = null;

}


function getMusicVolume(trackName) {

  const baseVolume =
    audioSettings.music;


  if (trackName === "danger") {

    return clampVolume(
      baseVolume * 1.12
    );

  }


  return clampVolume(baseVolume);

}


function changeMusic(trackName) {

  if (
    audioSettings.muted ||
    audioSettings.music <= 0
  ) {
    return;
  }


  const nextTrack =
    musicTracks[trackName];


  if (!nextTrack) {
    return;
  }


  if (
    activeMusic &&
    activeMusic !== nextTrack
  ) {

    activeMusic.pause();

  }


  activeMusic = nextTrack;
  activeMusicName = trackName;


  nextTrack.volume =
    getMusicVolume(trackName);


  safelyPlay(nextTrack);

}


function refreshCurrentMusicVolume() {

  if (!activeMusic) {
    return;
  }


  if (
    audioSettings.muted ||
    audioSettings.music <= 0
  ) {

    activeMusic.pause();
    return;

  }


  activeMusic.volume =
    getMusicVolume(
      activeMusicName
    );


  if (activeMusic.paused) {

    safelyPlay(activeMusic);

  }

}


function stopAllMusic() {

  Object.values(
    musicTracks
  ).forEach((track) => {

    track.pause();
    track.currentTime = 0;
    track.volume = 0;

  });


  activeMusic = null;
  activeMusicName = "";

}


/* =========================================================
   14. GENERATED GAME SOUNDS
========================================================= */

function playGeneratedSound(name) {

  if (
    audioSettings.muted ||
    audioSettings.effects <= 0
  ) {
    return;
  }


  initialiseAudioContext();


  if (!audioContext) {
    return;
  }


  const sounds = {

    move: {
      startFrequency: 180,
      endFrequency: 145,
      duration: 0.035,
      volume: 0.018,
      type: "square"
    },

    blocked: {
      startFrequency: 95,
      endFrequency: 95,
      duration: 0.045,
      volume: 0.018,
      type: "square"
    },

    rotate: {
      startFrequency: 290,
      endFrequency: 420,
      duration: 0.055,
      volume: 0.022,
      type: "triangle"
    },

    hold: {
      startFrequency: 340,
      endFrequency: 210,
      duration: 0.1,
      volume: 0.025,
      type: "sine"
    },

    land: {
      startFrequency: 115,
      endFrequency: 75,
      duration: 0.085,
      volume: 0.035,
      type: "square"
    },

    hardDrop: {
      startFrequency: 280,
      endFrequency: 70,
      duration: 0.13,
      volume: 0.045,
      type: "sawtooth"
    },

    pause: {
      startFrequency: 330,
      endFrequency: 180,
      duration: 0.14,
      volume: 0.028,
      type: "sine"
    },

    resume: {
      startFrequency: 220,
      endFrequency: 440,
      duration: 0.14,
      volume: 0.028,
      type: "sine"
    },

    countdown: {
      startFrequency: 520,
      endFrequency: 420,
      duration: 0.1,
      volume: 0.04,
      type: "square"
    }

  };


  const sound =
    sounds[name];


  if (!sound) {
    return;
  }


  const oscillator =
    audioContext.createOscillator();


  const gain =
    audioContext.createGain();


  const startTime =
    audioContext.currentTime;


  oscillator.type =
    sound.type;


  oscillator.frequency.setValueAtTime(
    sound.startFrequency,
    startTime
  );


  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(
      1,
      sound.endFrequency
    ),
    startTime + sound.duration
  );


  gain.gain.setValueAtTime(
    Math.max(
      0.0001,
      sound.volume *
        audioSettings.effects
    ),
    startTime
  );


  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + sound.duration
  );


  oscillator.connect(gain);
  gain.connect(audioContext.destination);


  oscillator.start(startTime);
  oscillator.stop(
    startTime + sound.duration
  );

}


/* =========================================================
   15. AUDIO SETTINGS
========================================================= */

function loadAudioSettings() {

  try {

    const stored =
      localStorage.getItem(
        AUDIO_STORAGE_KEY
      );


    if (!stored) {

      return {
        ...DEFAULT_AUDIO_SETTINGS
      };

    }


    const parsed =
      JSON.parse(stored);


    return {

      music:
        clampVolume(
          parsed.music ??
            DEFAULT_AUDIO_SETTINGS.music
        ),

      effects:
        clampVolume(
          parsed.effects ??
            DEFAULT_AUDIO_SETTINGS.effects
        ),

      voice:
        clampVolume(
          parsed.voice ??
            DEFAULT_AUDIO_SETTINGS.voice
        ),

      muted:
        Boolean(
          parsed.muted ??
            DEFAULT_AUDIO_SETTINGS.muted
        )

    };

  } catch (error) {

    console.warn(
      "Block Drop could not load audio settings.",
      error
    );


    return {
      ...DEFAULT_AUDIO_SETTINGS
    };

  }

}


function saveAudioSettings() {

  try {

    localStorage.setItem(
      AUDIO_STORAGE_KEY,
      JSON.stringify(
        audioSettings
      )
    );

  } catch (error) {

    console.warn(
      "Block Drop could not save audio settings.",
      error
    );

  }

}


function applyAudioSettingsToInterface() {

  const musicPercent =
    Math.round(
      audioSettings.music * 100
    );


  const effectsPercent =
    Math.round(
      audioSettings.effects * 100
    );


  const voicePercent =
    Math.round(
      audioSettings.voice * 100
    );


  if (musicVolumeSlider) {

    musicVolumeSlider.value =
      String(musicPercent);

  }


  if (effectsVolumeSlider) {

    effectsVolumeSlider.value =
      String(effectsPercent);

  }


  if (voiceVolumeSlider) {

    voiceVolumeSlider.value =
      String(voicePercent);

  }


  if (musicVolumeOutput) {

    musicVolumeOutput.textContent =
      `${musicPercent}%`;

  }


  if (effectsVolumeOutput) {

    effectsVolumeOutput.textContent =
      `${effectsPercent}%`;

  }


  if (voiceVolumeOutput) {

    voiceVolumeOutput.textContent =
      `${voicePercent}%`;

  }


  updateMuteButtons();

}


function updateMuteButtons() {

  const isMuted =
    audioSettings.muted;


  soundButton?.setAttribute(
    "aria-pressed",
    String(isMuted)
  );


  soundButton?.setAttribute(
    "aria-label",
    isMuted
      ? "Enable all audio"
      : "Mute all audio"
  );


  muteAllButton?.setAttribute(
    "aria-pressed",
    String(isMuted)
  );


  if (muteAllButton) {

    muteAllButton.innerHTML =
      isMuted
        ? `
            <span aria-hidden="true">🔊</span>
            Unmute All
          `
        : `
            <span aria-hidden="true">🔇</span>
            Mute All
          `;

  }

}


function setMasterMuted(isMuted) {

  audioSettings.muted =
    Boolean(isMuted);


  saveAudioSettings();
  updateMuteButtons();


  if (audioSettings.muted) {

    stopAllMusic();
    stopActiveVoice();

    return;

  }


  initialiseAudioContext();


  if (
    gameStarted &&
    !gameOver
  ) {

    updateDynamicMusic(true);

  } else {

    changeMusic("menu");

  }

}


function resetAudioMix() {

  audioSettings = {
    ...DEFAULT_AUDIO_SETTINGS
  };


  saveAudioSettings();

  applyAudioSettingsToInterface();

  refreshCurrentMusicVolume();


  if (!audioSettings.muted) {

    playGeneratedSound("resume");

  }

}


function openAudioSettings() {

  if (
    !audioSettingsPanel ||
    !audioSettingsBackdrop
  ) {
    return;
  }


  cancelGesture();
  closeMobileQuickMenu();


  audioSettingsPanel.classList.add(
    "is-open"
  );


  audioSettingsBackdrop.classList.add(
    "is-visible"
  );


  audioSettingsPanel.setAttribute(
    "aria-hidden",
    "false"
  );


  audioSettingsBackdrop.setAttribute(
    "aria-hidden",
    "false"
  );


  audioSettingsButton?.setAttribute(
    "aria-expanded",
    "true"
  );


  document.body.classList.add(
    "audio-panel-open"
  );

}


function closeAudioSettings() {

  if (
    !audioSettingsPanel ||
    !audioSettingsBackdrop
  ) {
    return;
  }


  audioSettingsPanel.classList.remove(
    "is-open"
  );


  audioSettingsBackdrop.classList.remove(
    "is-visible"
  );


  audioSettingsPanel.setAttribute(
    "aria-hidden",
    "true"
  );


  audioSettingsBackdrop.setAttribute(
    "aria-hidden",
    "true"
  );


  audioSettingsButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  document.body.classList.remove(
    "audio-panel-open"
  );

}


/* =========================================================
   16. ROTATION DIRECTION
========================================================= */

function updateRotationDirectionInterface() {

  const clockwise =
    tapRotationDirection === 1;


  const icon =
    clockwise
      ? "↻"
      : "↺";


  const label =
    clockwise
      ? "Clockwise"
      : "Anticlockwise";


  const ariaLabel =
    clockwise
      ? "Rotation direction is clockwise. Press to change to anticlockwise."
      : "Rotation direction is anticlockwise. Press to change to clockwise.";


  if (desktopRotationIcon) {
    desktopRotationIcon.textContent =
      icon;
  }


  if (desktopRotationLabel) {
    desktopRotationLabel.textContent =
      label;
  }


  desktopRotationButton?.setAttribute(
    "aria-pressed",
    String(!clockwise)
  );


  desktopRotationButton?.setAttribute(
    "aria-label",
    ariaLabel
  );


  if (rotationDirectionIcon) {
    rotationDirectionIcon.textContent =
      icon;
  }


  if (rotationDirectionLabel) {
    rotationDirectionLabel.textContent =
      label;
  }


  rotationDirectionButton?.setAttribute(
    "aria-pressed",
    String(!clockwise)
  );


  rotationDirectionButton?.setAttribute(
    "aria-label",
    ariaLabel
  );


  if (touchpadRotationIcon) {
    touchpadRotationIcon.textContent =
      icon;
  }


  if (touchpadRotationLabel) {
    touchpadRotationLabel.textContent =
      label;
  }


  touchpadRotationButton?.setAttribute(
    "aria-pressed",
    String(!clockwise)
  );


  touchpadRotationButton?.setAttribute(
    "aria-label",
    ariaLabel
  );


  if (quickMenuRotationIcon) {
    quickMenuRotationIcon.textContent =
      icon;
  }


  if (quickMenuRotationLabel) {
    quickMenuRotationLabel.textContent =
      label;
  }


  quickMenuRotationButton?.setAttribute(
    "aria-pressed",
    String(!clockwise)
  );

}


function animateRotationButton(button) {

  if (!button) {
    return;
  }


  button.classList.remove(
    "is-switching"
  );


  void button.offsetWidth;


  button.classList.add(
    "is-switching"
  );


  window.setTimeout(() => {

    button.classList.remove(
      "is-switching"
    );

  }, 340);

}


function toggleRotationDirection(
  sourceButton = null
) {

  tapRotationDirection *= -1;


  saveRotationDirection();
  updateRotationDirectionInterface();


  animateRotationButton(
    sourceButton
  );


  vibrateDevice([15]);


  playVoiceClip(
    tapRotationDirection === 1
      ? voicePaths.clockwise
      : voicePaths.anticlockwise,
    0,
    {
      interrupt: true
    }
  );

}


/* =========================================================
   17. COLLISION AND MERGING
========================================================= */

function collides(
  matrix = player.matrix,
  position = player.position
) {

  if (!matrix) {
    return false;
  }


  for (
    let y = 0;
    y < matrix.length;
    y += 1
  ) {

    for (
      let x = 0;
      x < matrix[y].length;
      x += 1
    ) {

      if (matrix[y][x] === 0) {
        continue;
      }


      const arenaX =
        x + position.x;


      const arenaY =
        y + position.y;


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

  if (
    !player.matrix ||
    !player.type
  ) {
    return;
  }


  player.matrix.forEach(
    (row, y) => {

      row.forEach(
        (value, x) => {

          if (value === 0) {
            return;
          }


          const arenaX =
            x + player.position.x;


          const arenaY =
            y + player.position.y;


          if (
            arenaY >= 0 &&
            arenaY < BOARD_ROWS &&
            arenaX >= 0 &&
            arenaX < BOARD_COLUMNS
          ) {

            arena[arenaY][arenaX] =
              player.type;

          }

        }
      );

    }
  );

}


/* =========================================================
   18. PIECE SPAWNING
========================================================= */

function getTopEmptyRows(matrix) {

  let emptyRows = 0;


  for (const row of matrix) {

    if (
      row.every(
        (value) => value === 0
      )
    ) {

      emptyRows += 1;

    } else {

      break;

    }

  }


  return emptyRows;

}


function centrePlayerPiece() {

  player.position.x =
    Math.floor(
      BOARD_COLUMNS / 2
    ) -
    Math.ceil(
      player.matrix[0].length / 2
    );


  player.position.y =
    -getTopEmptyRows(
      player.matrix
    );

}


function spawnNextPiece() {

  if (!nextPiece) {

    nextPiece =
      createPiece(
        getNextPieceType()
      );

  }


  player.type =
    nextPiece.type;


  player.matrix =
    cloneMatrix(
      nextPiece.matrix
    );


  nextPiece =
    createPiece(
      getNextPieceType()
    );


  centrePlayerPiece();


  canHold = true;


  drawPreviewPiece();
  drawHeldPiece();


  if (collides()) {

    endGame();

  }

}


/* =========================================================
   19. PLAYER CONTROLS
========================================================= */

function canControlPlayer() {

  return (
    gameStarted &&
    !gamePaused &&
    !gameOver &&
    !countdownRunning &&
    !waitingForLandscapeRotation &&
    !document.body.classList.contains(
      "audio-panel-open"
    ) &&
    !document.body.classList.contains(
      "mobile-menu-open"
    ) &&
    Boolean(player.matrix)
  );

}


function movePlayer(direction) {

  if (!canControlPlayer()) {
    return false;
  }


  player.position.x +=
    direction;


  if (collides()) {

    player.position.x -=
      direction;


    playGeneratedSound(
      "blocked"
    );


    return false;

  }


  playGeneratedSound(
    "move"
  );


  return true;

}


function movePlayerMultiple(
  direction,
  numberOfSteps
) {

  let moved = false;


  for (
    let index = 0;
    index < numberOfSteps;
    index += 1
  ) {

    if (!movePlayer(direction)) {
      break;
    }


    moved = true;

  }


  if (moved) {

    vibrateDevice([7]);

  }

}


function softDropPlayer(
  options = {}
) {

  const {
    reward = true
  } = options;


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

    addScore(
      distance * 2
    );

  }


  playGeneratedSound(
    "hardDrop"
  );


  vibrateDevice([28]);

  shakeScreen();

  lockCurrentPiece();

}


/* =========================================================
   20. ROTATING PIECES
========================================================= */

function rotateMatrix(
  matrix,
  direction
) {

  const rows =
    matrix.length;


  const columns =
    matrix[0].length;


  const rotated =
    Array.from(
      {
        length: columns
      },
      () =>
        new Array(rows).fill(0)
    );


  for (
    let y = 0;
    y < rows;
    y += 1
  ) {

    for (
      let x = 0;
      x < columns;
      x += 1
    ) {

      if (direction > 0) {

        rotated[x][rows - 1 - y] =
          matrix[y][x];

      } else {

        rotated[
          columns - 1 - x
        ][y] =
          matrix[y][x];

      }

    }

  }


  return rotated;

}


function rotatePlayer(direction) {

  if (
    !canControlPlayer() ||
    player.type === "O"
  ) {
    return false;
  }


  const originalMatrix =
    player.matrix;


  const originalX =
    player.position.x;


  player.matrix =
    rotateMatrix(
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


  for (
    const offset
    of wallKickOffsets
  ) {

    player.position.x =
      originalX + offset;


    if (!collides()) {

      playGeneratedSound(
        "rotate"
      );


      vibrateDevice([9]);


      rotationDepthBoostUntil =
        performance.now() +
        ANAGLYPH_ROTATION_BOOST_MS;


      return true;

    }

  }


  player.matrix =
    originalMatrix;


  player.position.x =
    originalX;


  playGeneratedSound(
    "blocked"
  );


  return false;

}


/* =========================================================
   21. HOLD PIECE
========================================================= */

function holdCurrentPiece() {

  if (
    !canControlPlayer() ||
    !canHold
  ) {
    return;
  }


  const currentPieceType =
    player.type;


  if (!heldPieceType) {

    heldPieceType =
      currentPieceType;


    spawnNextPiece();

  } else {

    player.type =
      heldPieceType;


    player.matrix =
      cloneMatrix(
        PIECE_SHAPES[
          heldPieceType
        ]
      );


    heldPieceType =
      currentPieceType;


    centrePlayerPiece();


    if (collides()) {

      endGame();
      return;

    }

  }


  canHold = false;


  drawHeldPiece();


  playGeneratedSound(
    "hold"
  );


  vibrateDevice([12]);

}


/* =========================================================
   22. GHOST PIECE
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
   23. LOCKING AND LINE CLEARING
========================================================= */

function lockCurrentPiece() {

  if (
    !player.matrix ||
    gameOver
  ) {
    return;
  }


  mergePlayerIntoArena();


  const linesCleared =
    clearCompletedLines();


  if (linesCleared === 0) {

    combo = -1;

    playGeneratedSound(
      "land"
    );

  }


  spawnNextPiece();

  updateDynamicMusic();

  updateInterface();

}


function clearCompletedLines() {

  const completedRows = [];


  for (
    let y = BOARD_ROWS - 1;
    y >= 0;
    y -= 1
  ) {

    if (
      arena[y].every(
        (cell) => cell !== 0
      )
    ) {

      completedRows.push(y);

    }

  }


  if (completedRows.length === 0) {

    return 0;

  }


  /*
   * Keep every row that was not completed.
   *
   * We remove all completed rows together before inserting
   * replacements. This prevents row indexes shifting halfway
   * through a double, triple or four-line clear.
   */

  const completedRowSet =
    new Set(completedRows);


  const remainingRows =
    arena.filter(
      (row, rowIndex) =>
        !completedRowSet.has(rowIndex)
    );


  /*
   * Create one new empty row for every cleared line.
   */

  const emptyRows =
    Array.from(
      {
        length: completedRows.length
      },
      () =>
        new Array(
          BOARD_COLUMNS
        ).fill(0)
    );


  /*
   * Replace the arena contents without replacing the arena
   * array itself, because other parts of the game reference it.
   */

  arena.splice(
    0,
    arena.length,
    ...emptyRows,
    ...remainingRows
  );


  const numberOfLines =
    completedRows.length;


  clearedLines +=
    numberOfLines;


  combo += 1;


  bestCombo =
    Math.max(
      bestCombo,
      combo
    );


  const baseLineScore =
    LINE_SCORE_VALUES[
      numberOfLines
    ] ||
    numberOfLines * 250;


  const comboBonus =
    combo > 0
      ? combo * 50 * level
      : 0;


  addScore(
    baseLineScore *
      level +
      comboBonus
  );


  updateLevel();


  showLineAnnouncement(
    numberOfLines
  );


  triggerScreenFlash();


  shakeScreen(
    numberOfLines === 4
      ? 300
      : 180
  );


  vibrateDevice(
    numberOfLines === 4
      ? [45, 30, 65]
      : [22, 24]
  );


  if (numberOfLines === 4) {

    playImportedClip(
      effectPaths.fourLineClear,
      "effects"
    );


    playFourLineVoice();

  } else {

    playImportedClip(
      effectPaths.lineClear,
      "effects"
    );


    maybePlayPositiveVoice(
      numberOfLines
    );

  }


  updateInterface();


  return numberOfLines;

}

/* =========================================================
   24. SCORING AND LEVELS
========================================================= */

function addScore(points) {

  score +=
    Math.max(
      0,
      Math.floor(points)
    );


  if (score > highScore) {

    highScore = score;

    saveHighScore();

  }


  updateInterface();

}


function updateLevel() {

  const newLevel =
    Math.floor(
      clearedLines / 10
    ) + 1;


  if (newLevel > level) {

    level =
      newLevel;


    showTemporaryAnnouncement(
      `Level ${level}!`
    );


    playImportedClip(
      effectPaths.levelUp,
      "effects"
    );


    vibrateDevice([
      20,
      30,
      20
    ]);

  } else {

    level =
      newLevel;

  }

}


function getDropInterval() {

  return Math.max(
    90,
    1000 -
      (level - 1) * 75
  );

}


/* =========================================================
   25. DYNAMIC MUSIC
========================================================= */

function isBoardInDanger() {

  return arena
    .slice(0, 5)
    .some((row) =>

      row.some(
        (cell) => cell !== 0
      )

    );

}


function updateDynamicMusic(
  forceUpdate = false
) {

  if (
    !gameStarted ||
    gamePaused ||
    gameOver ||
    audioSettings.muted
  ) {
    return;
  }


  const nowDangerous =
    isBoardInDanger();


  if (
    !forceUpdate &&
    nowDangerous === dangerActive
  ) {
    return;
  }


  dangerActive =
    nowDangerous;


  if (dangerActive) {

    changeMusic(
      "danger"
    );


    if (!dangerVoicePlayed) {

      dangerVoicePlayed = true;


      playVoiceClip(
        voicePaths.dangerous,
        650
      );

    }

  } else {

    dangerVoicePlayed = false;


    changeMusic(
      "gameplay"
    );

  }

}


/* =========================================================
   26. VOICE REACTIONS
========================================================= */

function maybePlayPositiveVoice(
  numberOfLines
) {

  if (
    audioSettings.muted ||
    activeVoice
  ) {
    return;
  }


  let chance = 0;


  if (numberOfLines === 1) {
    chance = 0.08;
  }


  if (numberOfLines === 2) {
    chance = 0.38;
  }


  if (numberOfLines === 3) {
    chance = 0.68;
  }


  if (Math.random() > chance) {
    return;
  }


  let choices = [
    voicePaths.okay,
    voicePaths.nice
  ];


  if (numberOfLines === 2) {

    choices = [
      voicePaths.nice,
      voicePaths.thatllDo
    ];

  }


  if (numberOfLines >= 3) {

    choices = [
      voicePaths.beautiful,
      voicePaths.nice
    ];

  }


  const selectedVoice =
    choices[
      Math.floor(
        Math.random() *
        choices.length
      )
    ];


  playVoiceClip(
    selectedVoice,
    600
  );

}


function playFourLineVoice() {

  if (
    audioSettings.muted ||
    activeVoice
  ) {
    return;
  }


  const selectedVoice =
    Math.random() < 0.7
      ? voicePaths.beautiful
      : voicePaths.thatllDo;


  playVoiceClip(
    selectedVoice,
    700
  );

}


/* =========================================================
   PART 2 ENDS HERE
   PASTE PART 3 DIRECTLY BELOW THIS COMMENT
========================================================= */

/* =========================================================
   27. ANNOUNCEMENTS AND VISUAL FEEDBACK
========================================================= */

function showLineAnnouncement(numberOfLines) {

  const announcement =
    LINE_ANNOUNCEMENTS[numberOfLines] ||
    `${numberOfLines} Lines!`;


  showTemporaryAnnouncement(
    announcement
  );

}


function showTemporaryAnnouncement(text) {

  if (!lineAnnouncement) {
    return;
  }


  window.clearTimeout(
    announcementTimer
  );


  lineAnnouncement.textContent =
    text;


  lineAnnouncement.classList.remove(
    "is-visible"
  );


  void lineAnnouncement.offsetWidth;


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


function triggerScreenFlash() {

  if (!screenFlash) {
    return;
  }


  screenFlash.classList.remove(
    "is-active"
  );


  void screenFlash.offsetWidth;


  screenFlash.classList.add(
    "is-active"
  );

}


function shakeScreen(
  duration = 180
) {

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


function vibrateDevice(pattern) {

  if (
    "vibrate" in navigator &&
    shouldUseMobileGameMode()
  ) {

    navigator.vibrate(pattern);

  }

}


/* =========================================================
   28. DRAWING UTILITIES
========================================================= */

function createRoundedRectangle(
  drawingContext,
  x,
  y,
  width,
  height,
  radius
) {

  drawingContext.beginPath();


  if (
    typeof drawingContext.roundRect ===
    "function"
  ) {

    drawingContext.roundRect(
      x,
      y,
      width,
      height,
      radius
    );

  } else {

    drawingContext.rect(
      x,
      y,
      width,
      height
    );

  }

}


function drawBlock(
  drawingContext,
  pixelX,
  pixelY,
  blockSize,
  type,
  isGhost = false
) {

  const colours =
    PIECE_COLOURS[type];


  if (!colours) {
    return;
  }


  const gap =
    Math.max(
      2,
      blockSize * 0.075
    );


  const x =
    pixelX + gap;


  const y =
    pixelY + gap;


  const size =
    blockSize - gap * 2;


  const cornerRadius =
    Math.max(
      3,
      blockSize * 0.14
    );


  drawingContext.save();


  if (isGhost) {

    drawingContext.globalAlpha =
      0.25;


    drawingContext.strokeStyle =
      colours.light;


    drawingContext.lineWidth =
      Math.max(
        2,
        blockSize * 0.07
      );


    createRoundedRectangle(
      drawingContext,
      x,
      y,
      size,
      size,
      cornerRadius
    );


    drawingContext.stroke();

    drawingContext.restore();

    return;

  }


  drawingContext.shadowColor =
    colours.main;


  drawingContext.shadowBlur =
    Math.max(
      7,
      blockSize * 0.42
    );


  const blockGradient =
    drawingContext.createLinearGradient(
      x,
      y,
      x + size,
      y + size
    );


  blockGradient.addColorStop(
    0,
    colours.light
  );


  blockGradient.addColorStop(
    0.35,
    colours.main
  );


  blockGradient.addColorStop(
    1,
    colours.dark
  );


  createRoundedRectangle(
    drawingContext,
    x,
    y,
    size,
    size,
    cornerRadius
  );


  drawingContext.fillStyle =
    blockGradient;


  drawingContext.fill();


  drawingContext.shadowBlur = 0;


  drawingContext.strokeStyle =
    "rgba(255,255,255,0.3)";


  drawingContext.lineWidth =
    Math.max(
      1,
      blockSize * 0.035
    );


  drawingContext.stroke();


  drawingContext.restore();

}


function drawPieceMatrix(
  matrix,
  position,
  type,
  isGhost = false,
  drawingContext = context
) {

  if (!matrix) {
    return;
  }


  matrix.forEach(
    (row, y) => {

      row.forEach(
        (value, x) => {

          if (value === 0) {
            return;
          }


          drawBlock(
            drawingContext,
            (
              x +
              position.x
            ) *
              BOARD_BLOCK_SIZE,
            (
              y +
              position.y
            ) *
              BOARD_BLOCK_SIZE,
            BOARD_BLOCK_SIZE,
            type,
            isGhost
          );

        }
      );

    }
  );

}


/* =========================================================
   29. DRAWING THE GAME BOARD
========================================================= */

function drawGameBoard() {

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  const boardGradient =
    context.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );


  boardGradient.addColorStop(
    0,
    "rgba(18,8,29,0.8)"
  );


  boardGradient.addColorStop(
    1,
    "rgba(2,1,5,0.96)"
  );


  context.fillStyle =
    boardGradient;


  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  if (!anaglyphSettings.enabled) {

    drawBoardGrid();


    arena.forEach(
      (row, y) => {

        row.forEach(
          (type, x) => {

            if (type === 0) {
              return;
            }


            drawBlock(
              context,
              x * BOARD_BLOCK_SIZE,
              y * BOARD_BLOCK_SIZE,
              BOARD_BLOCK_SIZE,
              type,
              false
            );

          }
        );

      }
    );


    if (
      player.matrix &&
      !gameOver
    ) {

      const ghostPosition =
        getGhostPosition();


      drawPieceMatrix(
        player.matrix,
        ghostPosition,
        player.type,
        true
      );


      drawPieceMatrix(
        player.matrix,
        player.position,
        player.type,
        false
      );

    }


    return;

  }


  drawStereoLayer(
    (drawingContext) => {
      drawBoardGrid(
        drawingContext
      );
    },
    ANAGLYPH_DEPTHS.grid
  );


  drawStereoLayer(
    (drawingContext) => {

      arena.forEach(
        (row, y) => {

          row.forEach(
            (type, x) => {

              if (type === 0) {
                return;
              }


              drawBlock(
                drawingContext,
                x * BOARD_BLOCK_SIZE,
                y * BOARD_BLOCK_SIZE,
                BOARD_BLOCK_SIZE,
                type,
                false
              );

            }
          );

        }
      );

    },
    ANAGLYPH_DEPTHS.settled
  );


  if (
    player.matrix &&
    !gameOver
  ) {

    const ghostPosition =
      getGhostPosition();


    drawStereoLayer(
      (drawingContext) => {

        drawPieceMatrix(
          player.matrix,
          ghostPosition,
          player.type,
          true,
          drawingContext
        );

      },
      ANAGLYPH_DEPTHS.ghost
    );


    const activePieceDepth =
      performance.now() <
        rotationDepthBoostUntil
        ? ANAGLYPH_DEPTHS.rotating
        : ANAGLYPH_DEPTHS.falling;


    drawStereoLayer(
      (drawingContext) => {

        drawPieceMatrix(
          player.matrix,
          player.position,
          player.type,
          false,
          drawingContext
        );

      },
      activePieceDepth
    );

  }

}


function drawBoardGrid(
  drawingContext = context
) {

  drawingContext.save();


  drawingContext.strokeStyle =
    "rgba(181,98,255,0.08)";


  drawingContext.lineWidth = 1;


  for (
    let column = 0;
    column <= BOARD_COLUMNS;
    column += 1
  ) {

    drawingContext.beginPath();


    drawingContext.moveTo(
      column * BOARD_BLOCK_SIZE,
      0
    );


    drawingContext.lineTo(
      column * BOARD_BLOCK_SIZE,
      canvas.height
    );


    drawingContext.stroke();

  }


  for (
    let row = 0;
    row <= BOARD_ROWS;
    row += 1
  ) {

    drawingContext.beginPath();


    drawingContext.moveTo(
      0,
      row * BOARD_BLOCK_SIZE
    );


    drawingContext.lineTo(
      canvas.width,
      row * BOARD_BLOCK_SIZE
    );


    drawingContext.stroke();

  }


  drawingContext.restore();

}


/* =========================================================
   30. DRAWING PREVIEWS
========================================================= */

function drawMiniPiece(
  drawingContext,
  drawingCanvas,
  matrix,
  type,
  preferredBlockSize
) {

  if (
    !drawingContext ||
    !drawingCanvas ||
    !matrix
  ) {
    return;
  }


  drawingContext.clearRect(
    0,
    0,
    drawingCanvas.width,
    drawingCanvas.height
  );


  const blockSize =
    Math.min(
      preferredBlockSize,
      (
        drawingCanvas.width *
        0.82
      ) /
        matrix[0].length,
      (
        drawingCanvas.height *
        0.82
      ) /
        matrix.length
    );


  const offsetX =
    (
      drawingCanvas.width -
      matrix[0].length *
        blockSize
    ) / 2;


  const offsetY =
    (
      drawingCanvas.height -
      matrix.length *
        blockSize
    ) / 2;


  matrix.forEach(
    (row, y) => {

      row.forEach(
        (value, x) => {

          if (value === 0) {
            return;
          }


          drawBlock(
            drawingContext,
            offsetX +
              x * blockSize,
            offsetY +
              y * blockSize,
            blockSize,
            type,
            false
          );

        }
      );

    }
  );

}


function drawPreviewPiece() {

  previewContext.clearRect(
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );


  mobilePreviewContext?.clearRect(
    0,
    0,
    mobilePreviewCanvas.width,
    mobilePreviewCanvas.height
  );


  if (!nextPiece) {
    return;
  }


  drawMiniPiece(
    previewContext,
    previewCanvas,
    nextPiece.matrix,
    nextPiece.type,
    28
  );


  if (
    mobilePreviewContext &&
    mobilePreviewCanvas
  ) {

    drawMiniPiece(
      mobilePreviewContext,
      mobilePreviewCanvas,
      nextPiece.matrix,
      nextPiece.type,
      15
    );

  }

}


function drawHeldPiece() {

  holdContext.clearRect(
    0,
    0,
    holdCanvas.width,
    holdCanvas.height
  );


  if (!heldPieceType) {

    if (holdEmptyMessage) {

      holdEmptyMessage.hidden =
        false;

    }


    return;

  }


  if (holdEmptyMessage) {

    holdEmptyMessage.hidden =
      true;

  }


  drawMiniPiece(
    holdContext,
    holdCanvas,
    PIECE_SHAPES[
      heldPieceType
    ],
    heldPieceType,
    24
  );

}


/* =========================================================
   31. INTERFACE UPDATES
========================================================= */

function formatScore(value) {

  return String(
    Math.max(
      0,
      Math.floor(value)
    )
  ).padStart(
    6,
    "0"
  );

}


function updateInterface() {

  const formattedScore =
    formatScore(score);


  if (scoreElement) {

    scoreElement.textContent =
      formattedScore;

  }


  if (highScoreElement) {

    highScoreElement.textContent =
      formatScore(highScore);

  }


  if (levelElement) {

    levelElement.textContent =
      String(level);

  }


  if (linesElement) {

    linesElement.textContent =
      String(clearedLines);

  }


  if (comboElement) {

    comboElement.textContent =
      `x${Math.max(
        0,
        bestCombo
      )}`;

  }


  if (mobileScoreElement) {

    mobileScoreElement.textContent =
      formattedScore;

  }


  if (mobileLevelElement) {

    mobileLevelElement.textContent =
      String(level);

  }


  if (mobileLinesElement) {

    mobileLinesElement.textContent =
      String(clearedLines);

  }

}


function updateGameStatus(
  text,
  state
) {

  if (statusElement) {

    statusElement.textContent =
      text;

  }


  if (statusLight) {

    statusLight.className =
      `status-light status-light--${state}`;

  }

}


function updatePauseButtons() {

  if (pauseButton) {

    pauseButton.innerHTML =
      gamePaused
        ? `
            <span aria-hidden="true">▶</span>
            Resume
          `
        : `
            <span aria-hidden="true">⏸</span>
            Pause
          `;

  }


  if (mobilePauseButton) {

    mobilePauseButton.innerHTML =
      gamePaused
        ? `
            <span aria-hidden="true">▶</span>
            <small>Resume</small>
          `
        : `
            <span aria-hidden="true">⏸</span>
            <small>Pause</small>
          `;

  }


  document
    .querySelectorAll(
      '[data-action="pause"]'
    )
    .forEach((button) => {

      button.innerHTML =
        gamePaused
          ? `
              <span aria-hidden="true">▶</span>
              <strong>Resume</strong>
            `
          : `
              <span aria-hidden="true">Ⅱ</span>
              <strong>Pause</strong>
            `;

    });


  if (quickMenuPauseButton) {

    quickMenuPauseButton.innerHTML =
      gamePaused
        ? `
            <span aria-hidden="true">▶</span>
            <strong>Resume</strong>
          `
        : `
            <span aria-hidden="true">⏸</span>
            <strong>Pause</strong>
          `;

  }

}


function chooseRandomTip() {

  if (!gameTipElement) {
    return;
  }


  gameTipElement.textContent =
    GAME_TIPS[
      Math.floor(
        Math.random() *
        GAME_TIPS.length
      )
    ];

}


/* =========================================================
   32. OVERLAY UTILITIES
========================================================= */

function hideOverlay(overlay) {

  if (!overlay) {
    return;
  }


  overlay.classList.remove(
    "is-visible"
  );


  overlay.setAttribute(
    "aria-hidden",
    "true"
  );

}


function showOverlay(overlay) {

  if (!overlay) {
    return;
  }


  overlay.classList.add(
    "is-visible"
  );


  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

}


function hideAllGameOverlays() {

  [
    startOverlay,
    rotateDeviceOverlay,
    countdownOverlay,
    pauseOverlay,
    controlsOverlay,
    gameOverOverlay
  ].forEach((overlay) => {

    hideOverlay(overlay);

  });

}


function openControlsOverlay(
  returnTarget = "pause"
) {

  cancelGesture();
  closeMobileQuickMenu();


  controlsOverlayReturnTarget =
    returnTarget;


  hideOverlay(pauseOverlay);
  hideOverlay(gameOverOverlay);


  showOverlay(
    controlsOverlay
  );


  applyControlPreferences();

}


function closeControlsOverlay() {

  hideOverlay(
    controlsOverlay
  );


  if (
    controlsOverlayReturnTarget ===
      "game-over" &&
    gameOver
  ) {

    showOverlay(
      gameOverOverlay
    );

    return;

  }


  if (
    gamePaused &&
    gameStarted
  ) {

    showOverlay(
      pauseOverlay
    );

  }

}


/* =========================================================
   33. FIRST-TIME GESTURE TUTORIAL
========================================================= */

function hasSeenGestureTutorial() {

  try {

    return (
      localStorage.getItem(
        GESTURE_TUTORIAL_STORAGE_KEY
      ) === "true"
    );

  } catch (error) {

    return false;

  }

}


function markGestureTutorialSeen() {

  try {

    localStorage.setItem(
      GESTURE_TUTORIAL_STORAGE_KEY,
      "true"
    );

  } catch (error) {

    console.warn(
      "Block Drop could not remember the gesture tutorial.",
      error
    );

  }

}


function shouldShowGestureTutorial() {

  return (
    shouldUseMobileGameMode() &&
    currentControlMode ===
      CONTROL_MODE_PORTRAIT_GESTURE &&
    !hasSeenGestureTutorial()
  );

}


function showGestureTutorial() {

  if (
    !gestureTutorial ||
    !shouldShowGestureTutorial()
  ) {
    return Promise.resolve();
  }


  gestureTutorial.classList.add(
    "is-visible"
  );


  gestureTutorial.setAttribute(
    "aria-hidden",
    "false"
  );


  return new Promise((resolve) => {

    window.clearTimeout(
      tutorialTimer
    );


    tutorialTimer =
      window.setTimeout(() => {

        gestureTutorial.classList.remove(
          "is-visible"
        );


        gestureTutorial.setAttribute(
          "aria-hidden",
          "true"
        );


        markGestureTutorialSeen();

        resolve();

      }, 2600);

  });

}


/* =========================================================
   34. GAME START SEQUENCE
========================================================= */

function wait(milliseconds) {

  return new Promise((resolve) => {

    window.setTimeout(
      resolve,
      milliseconds
    );

  });

}


async function beginGameSequence(
  audioEnabled
) {

  if (countdownRunning) {
    return;
  }


  readStartScreenPreferences();


  pendingAudioEnabled =
    Boolean(audioEnabled);


  setMasterMuted(
    !pendingAudioEnabled
  );


  enterMobileGameMode();


  if (
    mobileGameModeActive &&
    isLandscapeControlMode() &&
    isPortraitOrientation()
  ) {

    showRotateDeviceOverlay();

    return;

  }


  await continueGameSequence();

}


async function continueGameSequence() {

  hideRotateDeviceOverlay();

  hideAllGameOverlays();

  closeMobileQuickMenu();
  closeAudioSettings();


  if (
    pendingAudioEnabled &&
    !audioSettings.muted
  ) {

    initialiseAudioContext();

    changeMusic(
      "menu"
    );

  }


  await showGestureTutorial();


  countdownRunning = true;


  showOverlay(
    countdownOverlay
  );


  const countdownItems = [
    "3",
    "2",
    "1",
    "DROP!"
  ];


  for (
    const item
    of countdownItems
  ) {

    if (countdownNumber) {

      countdownNumber.textContent =
        item;


      countdownNumber.classList.toggle(
        "is-drop",
        item === "DROP!"
      );


      countdownNumber.style.animation =
        "none";


      void countdownNumber.offsetWidth;


      countdownNumber.style.animation =
        "";

    }


    if (
      !audioSettings.muted &&
      item !== "DROP!"
    ) {

      playGeneratedSound(
        "countdown"
      );

    }


    if (
      !audioSettings.muted &&
      item === "DROP!"
    ) {

      playImportedClip(
        Math.random() < 0.5
          ? effectPaths.titleOne
          : effectPaths.titleTwo,
        "effects"
      );

    }


    await wait(
      item === "DROP!"
        ? 650
        : 600
    );

  }


  hideOverlay(
    countdownOverlay
  );


  countdownNumber?.classList.remove(
    "is-drop"
  );


  countdownRunning = false;


  startNewGame();

}


/* =========================================================
   35. GAME LIFECYCLE
========================================================= */

function startNewGame() {

  cancelGesture();

  clearArena();


  pieceBag = [];
  nextPiece = null;
  heldPieceType = null;
  canHold = true;


  score = 0;
  level = 1;
  clearedLines = 0;

  combo = -1;
  bestCombo = 0;


  dangerActive = false;
  dangerVoicePlayed = false;


  runStartingHighScore =
    highScore;


  dropCounter = 0;
  lastFrameTime =
    performance.now();


  gameStarted = true;
  gamePaused = false;
  gameOver = false;


  document.body.classList.add(
    "game-running"
  );


  hideAllGameOverlays();


  if (highScoreMessage) {

    highScoreMessage.hidden =
      true;

  }


  updateGameStatus(
    "Playing",
    "playing"
  );


  chooseRandomTip();

  spawnNextPiece();

  updatePauseButtons();
  updateInterface();


  if (!audioSettings.muted) {

    changeMusic(
      "gameplay"
    );

  }

}


function pauseGame() {

  if (
    !gameStarted ||
    gameOver ||
    countdownRunning
  ) {
    return;
  }


  cancelGesture();
  closeMobileQuickMenu();


  gamePaused = true;


  showOverlay(
    pauseOverlay
  );


  updateGameStatus(
    "Paused",
    "paused"
  );


  updatePauseButtons();


  if (
    activeMusic &&
    !audioSettings.muted
  ) {

    activeMusic.volume =
      Math.min(
        0.1,
        getMusicVolume(
          activeMusicName
        )
      );

  }


  playGeneratedSound(
    "pause"
  );

}


function resumeGame() {

  if (
    !gameStarted ||
    gameOver
  ) {
    return;
  }


  cancelGesture();


  gamePaused = false;


  dropCounter = 0;
  lastFrameTime =
    performance.now();


  hideOverlay(
    pauseOverlay
  );


  updateGameStatus(
    "Playing",
    "playing"
  );


  updatePauseButtons();

  updateDynamicMusic(true);


  playGeneratedSound(
    "resume"
  );

}


function togglePause() {

  if (
    !gameStarted ||
    gameOver ||
    countdownRunning
  ) {
    return;
  }


  if (gamePaused) {

    resumeGame();

  } else {

    pauseGame();

  }

}


function restartGame() {

  if (countdownRunning) {
    return;
  }


  beginGameSequence(
    !audioSettings.muted
  );

}


function endGame() {

  cancelGesture();


  gameOver = true;
  gamePaused = false;
  gameStarted = false;


  document.body.classList.remove(
    "game-running"
  );


  if (finalScoreElement) {

    finalScoreElement.textContent =
      formatScore(score);

  }


  if (highScoreMessage) {

    highScoreMessage.hidden =
      !(
        score > 0 &&
        score >
          runStartingHighScore
      );

  }


  showOverlay(
    gameOverOverlay
  );


  updateGameStatus(
    "Game Over",
    "game-over"
  );


  updatePauseButtons();
  updateInterface();


  vibrateDevice([
    70,
    70,
    110
  ]);


  shakeScreen(380);


  if (!audioSettings.muted) {

    playImportedClip(
      effectPaths.gameOver,
      "effects"
    );


    playVoiceClip(
      effectPaths.gameOverWhispered,
      700,
      {
        interrupt: true
      }
    );


    window.setTimeout(() => {

      changeMusic(
        "menu"
      );

    }, 1300);

  }

}


/* =========================================================
   36. MOBILE QUICK MENU
========================================================= */

function openMobileQuickMenu() {

  if (
    !mobileQuickMenu ||
    !mobileQuickMenuBackdrop
  ) {
    return;
  }


  cancelGesture();


  mobileQuickMenu.classList.add(
    "is-open"
  );


  mobileQuickMenuBackdrop.classList.add(
    "is-visible"
  );


  mobileQuickMenu.setAttribute(
    "aria-hidden",
    "false"
  );


  mobileQuickMenuBackdrop.setAttribute(
    "aria-hidden",
    "false"
  );


  mobileMenuButton?.setAttribute(
    "aria-expanded",
    "true"
  );


  gestureMenuButton?.setAttribute(
    "aria-expanded",
    "true"
  );


  document.body.classList.add(
    "mobile-menu-open"
  );

}


function closeMobileQuickMenu() {

  if (
    !mobileQuickMenu ||
    !mobileQuickMenuBackdrop
  ) {
    return;
  }


  mobileQuickMenu.classList.remove(
    "is-open"
  );


  mobileQuickMenuBackdrop.classList.remove(
    "is-visible"
  );


  mobileQuickMenu.setAttribute(
    "aria-hidden",
    "true"
  );


  mobileQuickMenuBackdrop.setAttribute(
    "aria-hidden",
    "true"
  );


  mobileMenuButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  gestureMenuButton?.setAttribute(
    "aria-expanded",
    "false"
  );


  document.body.classList.remove(
    "mobile-menu-open"
  );

}


function toggleMobileQuickMenu() {

  if (
    mobileQuickMenu?.classList.contains(
      "is-open"
    )
  ) {

    closeMobileQuickMenu();

  } else {

    openMobileQuickMenu();

  }

}


/* =========================================================
   37. GESTURE CONTROLS
========================================================= */

function clearGestureTimers() {

  if (gestureState.holdTimeout) {

    window.clearTimeout(
      gestureState.holdTimeout
    );

  }


  if (gestureState.holdInterval) {

    window.clearInterval(
      gestureState.holdInterval
    );

  }


  gestureState.holdTimeout = null;
  gestureState.holdInterval = null;

}


function resetGestureState() {

  gestureState.pointerId = null;
  gestureState.surface = null;

  gestureState.startX = 0;
  gestureState.startY = 0;

  gestureState.currentX = 0;
  gestureState.currentY = 0;

  gestureState.startTime = 0;

  gestureState.moved = false;
  gestureState.holding = false;

}


function cancelGesture() {

  clearGestureTimers();
  resetGestureState();

}


function handleGesturePointerDown(
  event
) {

  if (!canControlPlayer()) {
    return;
  }


  event.preventDefault();


  cancelGesture();


  gestureState.pointerId =
    event.pointerId;


  gestureState.surface =
    event.currentTarget;


  gestureState.startX =
    event.clientX;


  gestureState.startY =
    event.clientY;


  gestureState.currentX =
    event.clientX;


  gestureState.currentY =
    event.clientY;


  gestureState.startTime =
    performance.now();


  try {

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

  } catch (error) {

    console.debug(
      "Pointer capture was unavailable.",
      error
    );

  }


  gestureState.holdTimeout =
    window.setTimeout(() => {

      if (
        !canControlPlayer() ||
        gestureState.moved
      ) {
        return;
      }


      gestureState.holding =
        true;


      softDropPlayer({
        reward: true
      });


      vibrateDevice([8]);


      gestureState.holdInterval =
        window.setInterval(() => {

          if (!canControlPlayer()) {

            cancelGesture();
            return;

          }


          softDropPlayer({
            reward: true
          });

        }, HOLD_DROP_INTERVAL);

    }, HOLD_DELAY);

}


function handleGesturePointerMove(
  event
) {

  if (
    gestureState.pointerId !==
    event.pointerId
  ) {
    return;
  }


  event.preventDefault();


  gestureState.currentX =
    event.clientX;


  gestureState.currentY =
    event.clientY;


  const deltaX =
    gestureState.currentX -
    gestureState.startX;


  const deltaY =
    gestureState.currentY -
    gestureState.startY;


  if (
    Math.hypot(
      deltaX,
      deltaY
    ) >
    TAP_MOVEMENT_LIMIT
  ) {

    gestureState.moved =
      true;


    clearGestureTimers();

  }

}


function handleGesturePointerUp(
  event
) {

  if (
    gestureState.pointerId !==
    event.pointerId
  ) {
    return;
  }


  event.preventDefault();


  gestureState.currentX =
    event.clientX;


  gestureState.currentY =
    event.clientY;


  const deltaX =
    gestureState.currentX -
    gestureState.startX;


  const deltaY =
    gestureState.currentY -
    gestureState.startY;


  const absoluteX =
    Math.abs(deltaX);


  const absoluteY =
    Math.abs(deltaY);


  const gestureDuration =
    performance.now() -
    gestureState.startTime;


  const wasHolding =
    gestureState.holding;


  clearGestureTimers();
  resetGestureState();


  if (
    !canControlPlayer() ||
    wasHolding
  ) {
    return;
  }


  const wasTap =
    absoluteX <=
      TAP_MOVEMENT_LIMIT &&
    absoluteY <=
      TAP_MOVEMENT_LIMIT &&
    gestureDuration <=
      TAP_DURATION_LIMIT;


  if (wasTap) {

    rotatePlayer(
      tapRotationDirection
    );

    return;

  }


  const wasDownSwipe =
    deltaY >
      SWIPE_THRESHOLD &&
    absoluteY >
      absoluteX * 1.05;


  if (wasDownSwipe) {

    hardDropPlayer();

    return;

  }


  const wasHorizontalSwipe =
    absoluteX >
      SWIPE_THRESHOLD &&
    absoluteX >
      absoluteY;


  if (wasHorizontalSwipe) {

    const direction =
      deltaX > 0
        ? 1
        : -1;


    const numberOfSteps =
      Math.min(
        MAX_SWIPE_STEPS,
        Math.max(
          1,
          Math.round(
            absoluteX /
              SWIPE_STEP_DISTANCE
          )
        )
      );


    movePlayerMultiple(
      direction,
      numberOfSteps
    );

  }

}


function initialiseGestureSurface(
  surface
) {

  if (!surface) {
    return;
  }


  surface.addEventListener(
    "pointerdown",
    handleGesturePointerDown,
    {
      passive: false
    }
  );


  surface.addEventListener(
    "pointermove",
    handleGesturePointerMove,
    {
      passive: false
    }
  );


  surface.addEventListener(
    "pointerup",
    handleGesturePointerUp,
    {
      passive: false
    }
  );


  surface.addEventListener(
    "pointercancel",
    cancelGesture
  );


  surface.addEventListener(
    "lostpointercapture",
    cancelGesture
  );


  surface.addEventListener(
    "contextmenu",
    (event) => {

      event.preventDefault();

    }
  );

}


/* =========================================================
   38. TOUCH BUTTON CONTROLS
========================================================= */

function pressVisualButton(button) {

  if (!button) {
    return;
  }


  button.classList.add(
    "is-pressed"
  );


  window.setTimeout(() => {

    button.classList.remove(
      "is-pressed"
    );

  }, 110);

}


function runTouchAction(
  action,
  button
) {

  pressVisualButton(button);


  if (action === "left") {

    movePlayer(-1);
    return;

  }


  if (action === "right") {

    movePlayer(1);
    return;

  }


  if (action === "soft-drop") {

    softDropPlayer({
      reward: true
    });

    return;

  }


  if (action === "hard-drop") {

    hardDropPlayer();
    return;

  }


  if (action === "rotate") {

    rotatePlayer(
      tapRotationDirection
    );

    return;

  }


  if (action === "hold") {

    holdCurrentPiece();
    return;

  }


  if (action === "pause") {

    togglePause();

  }

}


function initialiseTouchButtons() {

  document
    .querySelectorAll(
      "[data-action]"
    )
    .forEach((button) => {

      const action =
        button.dataset.action;


      if (!action) {
        return;
      }


      button.addEventListener(
        "pointerdown",
        (event) => {

          event.preventDefault();


          runTouchAction(
            action,
            button
          );

        },
        {
          passive: false
        }
      );

    });

}


/* =========================================================
   39. KEYBOARD CONTROLS
========================================================= */

function handleKeyboardInput(event) {

  const key =
    event.key;


  const gameKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowDown",
    "ArrowUp",
    " ",
    "q",
    "Q",
    "e",
    "E",
    "c",
    "C",
    "p",
    "P",
    "Escape"
  ];


  if (gameKeys.includes(key)) {

    event.preventDefault();

  }


  if (
    key === "p" ||
    key === "P"
  ) {

    togglePause();
    return;

  }


  if (key === "Escape") {

    if (
      document.body.classList.contains(
        "audio-panel-open"
      )
    ) {

      closeAudioSettings();

      return;

    }


    if (
      document.body.classList.contains(
        "mobile-menu-open"
      )
    ) {

      closeMobileQuickMenu();

      return;

    }


    if (
      controlsOverlay?.classList.contains(
        "is-visible"
      )
    ) {

      closeControlsOverlay();

      return;

    }


    togglePause();

    return;

  }


  if (!canControlPlayer()) {
    return;
  }


  if (key === "ArrowLeft") {

    movePlayer(-1);

  } else if (
    key === "ArrowRight"
  ) {

    movePlayer(1);

  } else if (
    key === "ArrowDown"
  ) {

    softDropPlayer({
      reward: true
    });

  } else if (
    key === "ArrowUp" ||
    key === "e" ||
    key === "E"
  ) {

    rotatePlayer(1);

  } else if (
    key === "q" ||
    key === "Q"
  ) {

    rotatePlayer(-1);

  } else if (
    key === " "
  ) {

    hardDropPlayer();

  } else if (
    key === "c" ||
    key === "C"
  ) {

    holdCurrentPiece();

  }

}


/* =========================================================
   40. ORIENTATION CHANGES
========================================================= */

function handleOrientationChange() {

  cancelGesture();


  window.setTimeout(() => {

    if (
      !mobileGameModeActive
    ) {
      return;
    }


    if (
      isLandscapeControlMode() &&
      isPortraitOrientation()
    ) {

      showRotateDeviceOverlay();

      return;

    }


    if (
      waitingForLandscapeRotation &&
      !isPortraitOrientation()
    ) {

      hideRotateDeviceOverlay();


      if (!gameStarted) {

        continueGameSequence();

      }

    }

  }, 180);

}


/* =========================================================
   41. EVENT LISTENERS
========================================================= */

function initialiseInterfaceEvents() {

  audioOnButton?.addEventListener(
    "click",
    () => {

      beginGameSequence(true);

    }
  );


  audioOffButton?.addEventListener(
    "click",
    () => {

      beginGameSequence(false);

    }
  );


  continuePortraitButton?.addEventListener(
    "click",
    () => {

      continueGameSequence();

    }
  );


  switchToPortraitGestureButton?.addEventListener(
    "click",
    () => {

      setControlMode(
        CONTROL_MODE_PORTRAIT_GESTURE,
        {
          closeOverlay: false
        }
      );


      continueGameSequence();

    }
  );


  resumeButton?.addEventListener(
    "click",
    resumeGame
  );


  playAgainButton?.addEventListener(
    "click",
    () => {

      beginGameSequence(
        !audioSettings.muted
      );

    }
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

      setMasterMuted(
        !audioSettings.muted
      );

    }
  );


  anaglyphToggleButton?.addEventListener(
    "click",
    () => {

      setAnaglyphEnabled(
        !anaglyphSettings.enabled
      );

    }
  );


  quickMenuAnaglyphButton?.addEventListener(
    "click",
    () => {

      setAnaglyphEnabled(
        !anaglyphSettings.enabled
      );

    }
  );


  anaglyphDepthSlider?.addEventListener(
    "input",
    () => {

      setAnaglyphDepthFromPercent(
        anaglyphDepthSlider.value
      );

    }
  );


  quickMenuAnaglyphDepthSlider?.addEventListener(
    "input",
    () => {

      setAnaglyphDepthFromPercent(
        quickMenuAnaglyphDepthSlider.value
      );

    }
  );


  pauseControlsButton?.addEventListener(
    "click",
    () => {

      openControlsOverlay(
        "pause"
      );

    }
  );


  pauseAudioButton?.addEventListener(
    "click",
    openAudioSettings
  );


  pauseExitButton?.addEventListener(
    "click",
    () => {

      exitMobileGameMode({
        pauseFirst: false
      });

    }
  );


  gameOverControlsButton?.addEventListener(
    "click",
    () => {

      openControlsOverlay(
        "game-over"
      );

    }
  );


  gameOverExitButton?.addEventListener(
    "click",
    () => {

      exitMobileGameMode({
        pauseFirst: false
      });

    }
  );


  choosePortraitGestureButton?.addEventListener(
    "click",
    () => {

      setControlMode(
        CONTROL_MODE_PORTRAIT_GESTURE
      );

    }
  );


  chooseLandscapeTouchpadButton?.addEventListener(
    "click",
    () => {

      setControlMode(
        CONTROL_MODE_LANDSCAPE_TOUCHPAD
      );

    }
  );


  chooseLandscapeButtonsButton?.addEventListener(
    "click",
    () => {

      setControlMode(
        CONTROL_MODE_LANDSCAPE_BUTTONS
      );

    }
  );


  closeControlsOverlayButton?.addEventListener(
    "click",
    closeControlsOverlay
  );


  mobilePauseButton?.addEventListener(
    "click",
    togglePause
  );


  mobileMenuButton?.addEventListener(
    "click",
    toggleMobileQuickMenu
  );


  gestureMenuButton?.addEventListener(
    "click",
    toggleMobileQuickMenu
  );


  mobileExitButton?.addEventListener(
    "click",
    () => {

      exitMobileGameMode();

    }
  );


  closeMobileMenuButton?.addEventListener(
    "click",
    closeMobileQuickMenu
  );


  mobileQuickMenuBackdrop?.addEventListener(
    "click",
    closeMobileQuickMenu
  );


  quickMenuPauseButton?.addEventListener(
    "click",
    () => {

      closeMobileQuickMenu();

      togglePause();

    }
  );


  quickMenuAudioButton?.addEventListener(
    "click",
    openAudioSettings
  );


  quickMenuRotationButton?.addEventListener(
    "click",
    () => {

      toggleRotationDirection(
        quickMenuRotationButton
      );

    }
  );


  quickMenuControlsButton?.addEventListener(
    "click",
    () => {

      closeMobileQuickMenu();

      if (
        gameStarted &&
        !gamePaused
      ) {

        pauseGame();

      }


      openControlsOverlay(
        gameOver
          ? "game-over"
          : "pause"
      );

    }
  );


  quickMenuExitButton?.addEventListener(
    "click",
    () => {

      closeMobileQuickMenu();


      exitMobileGameMode();

    }
  );


  desktopRotationButton?.addEventListener(
    "click",
    () => {

      toggleRotationDirection(
        desktopRotationButton
      );

    }
  );


  rotationDirectionButton?.addEventListener(
    "click",
    () => {

      toggleRotationDirection(
        rotationDirectionButton
      );

    }
  );


  touchpadRotationButton?.addEventListener(
    "click",
    () => {

      toggleRotationDirection(
        touchpadRotationButton
      );

    }
  );


  controlModeInputs.forEach(
    (input) => {

      input.addEventListener(
        "change",
        () => {

          if (input.checked) {

            currentControlMode =
              input.value;


            saveControlMode();

            applyControlPreferences();

          }

        }
      );

    }
  );


  controlSideInputs.forEach(
    (input) => {

      input.addEventListener(
        "change",
        () => {

          if (input.checked) {

            setControlSide(
              input.value
            );

          }

        }
      );

    }
  );


  settingsControlSideInputs.forEach(
    (input) => {

      input.addEventListener(
        "change",
        () => {

          if (input.checked) {

            setControlSide(
              input.value
            );

          }

        }
      );

    }
  );


  audioSettingsButton?.addEventListener(
    "click",
    openAudioSettings
  );


  audioSettingsClose?.addEventListener(
    "click",
    closeAudioSettings
  );


  audioSettingsBackdrop?.addEventListener(
    "click",
    closeAudioSettings
  );


  muteAllButton?.addEventListener(
    "click",
    () => {

      setMasterMuted(
        !audioSettings.muted
      );

    }
  );


  resetAudioButton?.addEventListener(
    "click",
    resetAudioMix
  );


  musicVolumeSlider?.addEventListener(
    "input",
    () => {

      audioSettings.music =
        clampVolume(
          Number(
            musicVolumeSlider.value
          ) / 100
        );


      musicVolumeOutput.textContent =
        `${musicVolumeSlider.value}%`;


      saveAudioSettings();

      refreshCurrentMusicVolume();

    }
  );


  effectsVolumeSlider?.addEventListener(
    "input",
    () => {

      audioSettings.effects =
        clampVolume(
          Number(
            effectsVolumeSlider.value
          ) / 100
        );


      effectsVolumeOutput.textContent =
        `${effectsVolumeSlider.value}%`;


      saveAudioSettings();

    }
  );


  voiceVolumeSlider?.addEventListener(
    "input",
    () => {

      audioSettings.voice =
        clampVolume(
          Number(
            voiceVolumeSlider.value
          ) / 100
        );


      voiceVolumeOutput.textContent =
        `${voiceVolumeSlider.value}%`;


      if (activeVoice) {

        activeVoice.volume =
          audioSettings.voice;

      }


      saveAudioSettings();

    }
  );


  document.addEventListener(
    "keydown",
    handleKeyboardInput
  );


  window.addEventListener(
    "orientationchange",
    handleOrientationChange
  );


  window.addEventListener(
    "resize",
    () => {

      drawPreviewPiece();
      drawHeldPiece();

    }
  );


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

}


/* =========================================================
   42. GAME LOOP
========================================================= */

function updateGame(
  currentTime = 0
) {

  const deltaTime =
    Math.min(
      currentTime -
        lastFrameTime,
      100
    );


  lastFrameTime =
    currentTime;


  if (
    gameStarted &&
    !gamePaused &&
    !gameOver &&
    !countdownRunning
  ) {

    dropCounter +=
      deltaTime;


    if (
      dropCounter >=
      getDropInterval()
    ) {

      softDropPlayer({
        reward: false
      });


      dropCounter = 0;

    }

  }


  drawGameBoard();


  window.requestAnimationFrame(
    updateGame
  );

}


/* =========================================================
   43. INITIALISATION
========================================================= */

function initialiseBlockDrop() {

  applyControlPreferences();

  applyAudioSettingsToInterface();

  updateAnaglyphInterface();

  updateRotationDirectionInterface();

  updateInterface();

  updatePauseButtons();

  updateGameStatus(
    "Ready",
    "ready"
  );


  chooseRandomTip();


  drawGameBoard();

  drawPreviewPiece();

  drawHeldPiece();


  initialiseGestureSurface(
    gestureSurface
  );


  initialiseGestureSurface(
    landscapeTouchpadSurface
  );


  initialiseTouchButtons();

  initialiseInterfaceEvents();


  window.requestAnimationFrame(
    updateGame
  );

}


initialiseBlockDrop();
