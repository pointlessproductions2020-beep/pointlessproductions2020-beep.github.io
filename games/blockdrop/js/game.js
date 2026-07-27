"use strict";

/* =========================================================
   BLOCK DROP REMASTERED
   MOBILE + TABLET GAME MODE
   AUDIO MIXER EDITION
   Pointless Productions
========================================================= */


/* =========================================================
   1. CANVAS AND DOM REFERENCES
========================================================= */

const canvas = document.querySelector("#tetris");
const context = canvas?.getContext("2d");

const previewCanvas = document.querySelector("#preview");
const previewContext = previewCanvas?.getContext("2d");

const mobilePreviewCanvas = document.querySelector("#mobile-preview");
const mobilePreviewContext = mobilePreviewCanvas?.getContext("2d");

const holdCanvas = document.querySelector("#hold-canvas");
const holdContext = holdCanvas?.getContext("2d");

const scoreElement = document.querySelector("#score");
const highScoreElement = document.querySelector("#high-score");
const levelElement = document.querySelector("#level");
const linesElement = document.querySelector("#lines");
const comboElement = document.querySelector("#combo");

const mobileScoreElement = document.querySelector("#mobile-score");
const mobileLevelElement = document.querySelector("#mobile-level");
const mobileLinesElement = document.querySelector("#mobile-lines");

const finalScoreElement = document.querySelector("#final-score");

const highScoreMessage = document.querySelector(
  "#new-high-score-message"
);

const statusElement = document.querySelector("#game-status");
const statusLight = document.querySelector("#status-light");

const startOverlay = document.querySelector("#start-overlay");

const countdownOverlay = document.querySelector(
  "#countdown-overlay"
);

const countdownNumber = document.querySelector(
  "#countdown-number"
);

const pauseOverlay = document.querySelector("#pause-overlay");

const gameOverOverlay = document.querySelector(
  "#game-over-overlay"
);

const audioOnButton = document.querySelector("#audio-on-button");
const audioOffButton = document.querySelector("#audio-off-button");

const resumeButton = document.querySelector("#resume-button");

const playAgainButton = document.querySelector(
  "#play-again-button"
);

const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");

const soundButton = document.querySelector("#sound-button");

const audioSettingsButton = document.querySelector(
  "#audio-settings-button"
);

const mobilePauseButton = document.querySelector(
  "#mobile-pause-button"
);

const mobileAudioButton = document.querySelector(
  "#mobile-audio-button"
);

const mobileExitButton = document.querySelector(
  "#mobile-exit-button"
);

const pauseExitButton = document.querySelector(
  "#pause-exit-button"
);

const gameOverExitButton = document.querySelector(
  "#game-over-exit-button"
);

const holdEmptyMessage = document.querySelector(
  "#hold-empty-message"
);

const lineAnnouncement = document.querySelector(
  "#line-announcement"
);

const screenFlash = document.querySelector("#screen-flash");
const gameTipElement = document.querySelector("#game-tip");

const audioSettingsPanel = document.querySelector(
  "#audio-settings-panel"
);

const audioSettingsBackdrop = document.querySelector(
  "#audio-settings-backdrop"
);

const audioSettingsClose = document.querySelector(
  "#audio-settings-close"
);

const musicVolumeSlider = document.querySelector(
  "#music-volume"
);

const effectsVolumeSlider = document.querySelector(
  "#effects-volume"
);

const voiceVolumeSlider = document.querySelector(
  "#voice-volume"
);

const musicVolumeOutput = document.querySelector(
  "#music-volume-output"
);

const effectsVolumeOutput = document.querySelector(
  "#effects-volume-output"
);

const voiceVolumeOutput = document.querySelector(
  "#voice-volume-output"
);

const muteAllButton = document.querySelector("#mute-all-button");

const resetAudioButton = document.querySelector(
  "#reset-audio-button"
);

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

const PREVIEW_BLOCK_SIZE = 28;
const HOLD_BLOCK_SIZE = 24;
const MOBILE_PREVIEW_BLOCK_SIZE = 15;

const MOBILE_GAME_BREAKPOINT = 1024;

const PIECE_TYPES = [
  "T",
  "J",
  "L",
  "O",
  "S",
  "Z",
  "I"
];

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
   3. AUDIO DEFAULTS AND STORAGE
========================================================= */

const AUDIO_STORAGE_KEY = "blockDropAudioSettings";

const DEFAULT_AUDIO_SETTINGS = {
  music: 0.3,
  effects: 0.55,
  voice: 0.85,
  muted: false
};

const MUSIC_FADE_DURATION = 850;

let audioSettings = loadAudioSettings();


/* =========================================================
   4. AUDIO FILES
========================================================= */

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
    "assets/sounds/voices/thatll-do.mp3"
};


/* =========================================================
   5. PIECE SHAPES
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
   6. GAME STATE
========================================================= */

const arena = createMatrix(
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

let canHold = true;
let pieceBag = [];

let score = 0;
let highScore = loadHighScore();
let runStartingHighScore = highScore;

let level = 1;
let clearedLines = 0;

let combo = -1;
let bestCombo = 0;

let dropCounter = 0;
let lastFrameTime = performance.now();

let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let countdownRunning = false;

let mobileGameModeActive = false;

let particles = [];

let announcementTimer = null;
let tipTimer = null;

let dangerActive = false;
let dangerVoicePlayed = false;

let activeMusic = null;
let activeMusicName = null;

let audioContext = null;

let activeVoice = null;

const activeImportedClips = new Set();
const audioFadeFrames = new WeakMap();


/* =========================================================
   7. RESPONSIVE GAME MODE
========================================================= */

function shouldUseMobileGameMode() {
  return (
    window.matchMedia(
      `(max-width: ${MOBILE_GAME_BREAKPOINT}px)`
    ).matches ||
    window.matchMedia("(pointer: coarse)").matches
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

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });

  preventGameplayScrolling();
}


function exitMobileGameMode({
  pauseFirst = true
} = {}) {
  if (
    pauseFirst &&
    gameStarted &&
    !gamePaused &&
    !gameOver
  ) {
    pauseGame();
  }

  mobileGameModeActive = false;

  document.body.classList.remove(
    "mobile-game-mode"
  );

  closeAudioSettings();

  restoreGameplayScrolling();

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth"
  });
}


function handleViewportChange() {
  if (
    mobileGameModeActive &&
    !shouldUseMobileGameMode()
  ) {
    exitMobileGameMode({
      pauseFirst: false
    });
  }

  drawPreviewPiece();
}


function preventGameplayScrolling() {
  document.documentElement.style.overscrollBehavior =
    "none";
}


function restoreGameplayScrolling() {
  document.documentElement.style.overscrollBehavior =
    "";
}


/* =========================================================
   8. BASIC AUDIO UTILITIES
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
    Math.max(0, Number(value) || 0)
  );
}


function getMusicTargetVolume(trackName) {
  const baseVolume =
    audioSettings.music;

  if (trackName === "danger") {
    return clampVolume(
      baseVolume * 1.12
    );
  }

  return clampVolume(baseVolume);
}


function safelyPlay(audio) {
  if (
    !audio ||
    audioSettings.muted
  ) {
    return;
  }

  const playPromise = audio.play();

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


function stopAudioFade(audio) {
  const frameId =
    audioFadeFrames.get(audio);

  if (frameId) {
    cancelAnimationFrame(frameId);

    audioFadeFrames.delete(audio);
  }
}


function fadeAudio(
  audio,
  targetVolume,
  duration = MUSIC_FADE_DURATION,
  onComplete = null
) {
  if (!audio) {
    return;
  }

  stopAudioFade(audio);

  const startingVolume =
    audio.volume;

  const startedAt =
    performance.now();

  function fadeStep(currentTime) {
    const progress = Math.min(
      (currentTime - startedAt) /
        duration,
      1
    );

    audio.volume =
      startingVolume +
      (
        targetVolume -
        startingVolume
      ) *
        progress;

    audio.volume =
      clampVolume(audio.volume);

    if (progress < 1) {
      const frameId =
        requestAnimationFrame(
          fadeStep
        );

      audioFadeFrames.set(
        audio,
        frameId
      );

      return;
    }

    audioFadeFrames.delete(audio);

    if (
      typeof onComplete ===
      "function"
    ) {
      onComplete();
    }
  }

  const frameId =
    requestAnimationFrame(
      fadeStep
    );

  audioFadeFrames.set(
    audio,
    frameId
  );
}


function playImportedClip(
  path,
  channel = "effects",
  delay = 0
) {
  if (
    audioSettings.muted ||
    !path
  ) {
    return null;
  }

  const channelVolume =
    channel === "voice"
      ? audioSettings.voice
      : audioSettings.effects;

  if (channelVolume <= 0) {
    return null;
  }

  const timeoutId =
    window.setTimeout(() => {
      if (audioSettings.muted) {
        return;
      }

      const clip = createAudio(
        path,
        false
      );

      clip.volume =
        clampVolume(
          channelVolume
        );

      activeImportedClips.add(clip);

      clip.addEventListener(
        "ended",
        () => {
          activeImportedClips.delete(
            clip
          );
        },
        {
          once: true
        }
      );

      safelyPlay(clip);
    }, delay);

  return timeoutId;
}


function playVoiceClip(
  path,
  delay = 0
) {
  if (
    audioSettings.muted ||
    audioSettings.voice <= 0 ||
    !path
  ) {
    return;
  }

  window.setTimeout(() => {
    if (
      audioSettings.muted ||
      activeVoice
    ) {
      return;
    }

    const clip = createAudio(
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


function stopAllImportedClips() {
  activeImportedClips.forEach(
    (clip) => {
      clip.pause();
      clip.currentTime = 0;
    }
  );

  activeImportedClips.clear();

  if (activeVoice) {
    activeVoice.pause();
    activeVoice.currentTime = 0;
    activeVoice = null;
  }
}


function stopAllMusic() {
  Object.values(musicTracks).forEach(
    (track) => {
      stopAudioFade(track);

      track.pause();
      track.currentTime = 0;
      track.volume = 0;
    }
  );

  activeMusic = null;
  activeMusicName = null;
}


function synchroniseTrackPosition(
  previousTrack,
  nextTrack
) {
  if (
    !previousTrack ||
    !nextTrack ||
    !Number.isFinite(
      previousTrack.currentTime
    )
  ) {
    nextTrack.currentTime = 0;
    return;
  }

  const nextDuration =
    nextTrack.duration;

  if (
    Number.isFinite(nextDuration) &&
    nextDuration > 0
  ) {
    nextTrack.currentTime =
      previousTrack.currentTime %
      nextDuration;
  } else {
    nextTrack.currentTime = 0;
  }
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

  const targetVolume =
    getMusicTargetVolume(
      trackName
    );

  if (
    activeMusicName === trackName
  ) {
    if (nextTrack.paused) {
      safelyPlay(nextTrack);
    }

    fadeAudio(
      nextTrack,
      targetVolume,
      350
    );

    return;
  }

  const previousTrack =
    activeMusic;

  synchroniseTrackPosition(
    previousTrack,
    nextTrack
  );

  nextTrack.volume = 0;

  safelyPlay(nextTrack);

  activeMusic = nextTrack;
  activeMusicName = trackName;

  fadeAudio(
    nextTrack,
    targetVolume,
    MUSIC_FADE_DURATION
  );

  if (
    previousTrack &&
    previousTrack !== nextTrack
  ) {
    fadeAudio(
      previousTrack,
      0,
      MUSIC_FADE_DURATION,
      () => {
        previousTrack.pause();
        previousTrack.volume = 0;
      }
    );
  }
}


function refreshCurrentMusicVolume() {
  if (
    !activeMusic ||
    !activeMusicName ||
    audioSettings.muted
  ) {
    return;
  }

  fadeAudio(
    activeMusic,
    getMusicTargetVolume(
      activeMusicName
    ),
    250
  );
}


/* =========================================================
   9. AUDIO SETTINGS
========================================================= */

function loadAudioSettings() {
  try {
    const saved =
      localStorage.getItem(
        AUDIO_STORAGE_KEY
      );

    if (!saved) {
      return {
        ...DEFAULT_AUDIO_SETTINGS
      };
    }

    const parsed =
      JSON.parse(saved);

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
    Object.values(
      musicTracks
    ).forEach((track) => {
      stopAudioFade(track);

      track.pause();
    });

    stopAllImportedClips();

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

  if (!audioSettings.muted) {
    refreshCurrentMusicVolume();

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

  mobileAudioButton?.setAttribute(
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

  mobileAudioButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "audio-panel-open"
  );
}


/* =========================================================
   10. MATRIX UTILITIES
========================================================= */

function createMatrix(
  width,
  height
) {
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
      `Unknown Block Drop piece: ${type}`
    );
  }

  return {
    type,
    matrix: cloneMatrix(shape)
  };
}


/* =========================================================
   11. SEVEN-BAG RANDOM PIECES
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
   12. COLLISION AND MERGING
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
   13. PIECE SPAWNING
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
    nextPiece = createPiece(
      getNextPieceType()
    );
  }

  player.type =
    nextPiece.type;

  player.matrix =
    cloneMatrix(
      nextPiece.matrix
    );

  nextPiece = createPiece(
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
   14. MOVEMENT
========================================================= */

function movePlayer(direction) {
  if (!canControlPlayer()) {
    return;
  }

  player.position.x += direction;

  if (collides()) {
    player.position.x -= direction;

    playGeneratedSound(
      "blocked"
    );

    return;
  }

  playGeneratedSound("move");
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
    addScore(
      distance * 2
    );
  }

  playGeneratedSound(
    "hardDrop"
  );

  vibrateDevice([18]);

  shakeScreen();

  lockCurrentPiece();
}


/* =========================================================
   15. ROTATION
========================================================= */

function rotateMatrix(
  matrix,
  direction
) {
  const rows = matrix.length;
  const columns =
    matrix[0].length;

  const rotated = Array.from(
    {
      length: columns
    },
    () => new Array(rows).fill(0)
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
        rotated[columns - 1 - x][y] =
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
    return;
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

      return;
    }
  }

  player.matrix =
    originalMatrix;

  player.position.x =
    originalX;

  playGeneratedSound(
    "blocked"
  );
}


/* =========================================================
   16. HOLD PIECE
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

  playGeneratedSound("hold");
}


/* =========================================================
   17. GHOST PIECE
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
   18. PIECE LOCKING AND LINE CLEARING
========================================================= */

function lockCurrentPiece() {
  if (
    !player.matrix ||
    gameOver
  ) {
    return;
  }

  mergePlayerIntoArena();

  createLandingParticles();

  const lineClearResult =
    clearCompletedLines();

  if (
    lineClearResult.count === 0
  ) {
    combo = -1;

    updateComboDisplay();

    playGeneratedSound("land");
  }

  spawnNextPiece();

  updateDynamicMusic();

  updateInterface();
}


function clearCompletedLines() {
  const clearedRowIndexes = [];

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
      clearedRowIndexes.push(y);
    }
  }

  if (
    clearedRowIndexes.length === 0
  ) {
    return {
      count: 0
    };
  }

  createLineParticles(
    clearedRowIndexes
  );

  clearedRowIndexes
    .sort((a, b) => b - a)
    .forEach((rowIndex) => {
      arena.splice(
        rowIndex,
        1
      );

      arena.unshift(
        new Array(
          BOARD_COLUMNS
        ).fill(0)
      );
    });

  const numberOfLines =
    clearedRowIndexes.length;

  clearedLines +=
    numberOfLines;

  combo += 1;

  if (combo > bestCombo) {
    bestCombo = combo;
  }

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
    numberOfLines,
    combo
  );

  triggerScreenFlash();

  shakeScreen(
    numberOfLines === 4
      ? 300
      : 180
  );

  vibrateDevice(
    numberOfLines === 4
      ? [35, 30, 55]
      : [22]
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

  updateComboDisplay();
  updateInterface();

  return {
    count: numberOfLines
  };
}


/* =========================================================
   19. SCORING AND LEVELS
========================================================= */

function addScore(points) {
  score += Math.max(
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
    level = newLevel;

    showTemporaryAnnouncement(
      `Level ${level}!`
    );

    playImportedClip(
      effectPaths.levelUp,
      "effects"
    );
  } else {
    level = newLevel;
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
   20. DYNAMIC MUSIC
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
    nowDangerous ===
      dangerActive
  ) {
    return;
  }

  dangerActive =
    nowDangerous;

  if (dangerActive) {
    changeMusic("danger");

    if (!dangerVoicePlayed) {
      dangerVoicePlayed = true;

      playVoiceClip(
        voicePaths.dangerous,
        650
      );
    }
  } else {
    dangerVoicePlayed = false;

    changeMusic("gameplay");
  }
}


/* =========================================================
   21. VOICE REACTIONS
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
    chance = 0.35;
  }

  if (numberOfLines === 3) {
    chance = 0.62;
  }

  if (Math.random() > chance) {
    return;
  }

  let choices = [
    voicePaths.okay,
    voicePaths.nice
  ];

  if (numberOfLines >= 2) {
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
    550
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
    Math.random() < 0.65
      ? voicePaths.beautiful
      : voicePaths.thatllDo;

  playVoiceClip(
    selectedVoice,
    650
  );
}


/* =========================================================
   22. COUNTDOWN
========================================================= */

async function beginGameSequence(
  audioEnabled
) {
  if (countdownRunning) {
    return;
  }

  setMasterMuted(
    !audioEnabled
  );

  enterMobileGameMode();

  hideAllOverlays();

  countdownRunning = true;

  countdownOverlay.classList.add(
    "is-visible"
  );

  countdownOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  if (audioEnabled) {
    initialiseAudioContext();

    changeMusic("menu");
  }

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
    countdownNumber.textContent =
      item;

    countdownNumber.classList.toggle(
      "is-drop",
      item === "DROP!"
    );

    restartCountdownAnimation();

    if (
      audioEnabled &&
      item !== "DROP!"
    ) {
      playGeneratedSound(
        "countdown"
      );
    }

    if (
      audioEnabled &&
      item === "DROP!"
    ) {
      const titleEffect =
        Math.random() < 0.5
          ? effectPaths.titleOne
          : effectPaths.titleTwo;

      playImportedClip(
        titleEffect,
        "effects"
      );
    }

    await wait(
      item === "DROP!"
        ? 700
        : 650
    );
  }

  countdownOverlay.classList.remove(
    "is-visible"
  );

  countdownOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  countdownNumber.classList.remove(
    "is-drop"
  );

  countdownRunning = false;

  startNewGame();
}


function restartCountdownAnimation() {
  countdownNumber.style.animation =
    "none";

  void countdownNumber.offsetWidth;

  countdownNumber.style.animation = "";
}


function wait(milliseconds) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


/* =========================================================
   23. GAME FLOW
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

  lastFrameTime =
    performance.now();

  gameStarted = true;
  gamePaused = false;
  gameOver = false;

  dangerActive = false;
  dangerVoicePlayed = false;

  runStartingHighScore =
    highScore;

  document.body.classList.add(
    "game-running"
  );

  hideAllOverlays();

  setGameStatus(
    "Playing",
    "playing"
  );

  highScoreMessage.hidden =
    true;

  chooseRandomTip();

  spawnNextPiece();

  updateComboDisplay();
  updateInterface();

  updatePauseButtons();

  if (!audioSettings.muted) {
    changeMusic("gameplay");
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


function pauseGame() {
  if (
    !gameStarted ||
    gameOver
  ) {
    return;
  }

  gamePaused = true;

  pauseOverlay.classList.add(
    "is-visible"
  );

  pauseOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  setGameStatus(
    "Paused",
    "paused"
  );

  updatePauseButtons();

  if (
    activeMusic &&
    !audioSettings.muted
  ) {
    fadeAudio(
      activeMusic,
      Math.min(
        0.1,
        getMusicTargetVolume(
          activeMusicName
        )
      ),
      300
    );
  }

  playGeneratedSound("pause");
}


function resumeGame() {
  if (
    !gameStarted ||
    gameOver
  ) {
    return;
  }

  gamePaused = false;
  dropCounter = 0;

  lastFrameTime =
    performance.now();

  pauseOverlay.classList.remove(
    "is-visible"
  );

  pauseOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  setGameStatus(
    "Playing",
    "playing"
  );

  updatePauseButtons();

  updateDynamicMusic(true);

  playGeneratedSound("resume");
}


function updatePauseButtons() {
  const pausedMarkup =
    '<span aria-hidden="true">▶</span> Resume';

  const playingMarkup =
    '<span aria-hidden="true">⏸</span> Pause';

  if (pauseButton) {
    pauseButton.innerHTML =
      gamePaused
        ? pausedMarkup
        : playingMarkup;
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
}


function endGame() {
  gameOver = true;
  gamePaused = false;
  gameStarted = false;

  document.body.classList.remove(
    "game-running"
  );

  finalScoreElement.textContent =
    formatScore(score);

  const achievedNewHighScore =
    score > 0 &&
    score > runStartingHighScore;

  highScoreMessage.hidden =
    !achievedNewHighScore;

  if (score > highScore) {
    highScore = score;

    saveHighScore();
  }

  gameOverOverlay.classList.add(
    "is-visible"
  );

  gameOverOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  setGameStatus(
    "Game Over",
    "game-over"
  );

  updateInterface();
  updatePauseButtons();

  vibrateDevice([60, 70, 90]);

  if (!audioSettings.muted) {
    playImportedClip(
      effectPaths.gameOver,
      "effects"
    );

    playImportedClip(
      effectPaths.gameOverWhispered,
      "voice",
      700
    );

    window.setTimeout(() => {
      if (!audioSettings.muted) {
        changeMusic("menu");
      }
    }, 1300);
  }

  shakeScreen(380);
}


function canControlPlayer() {
  return (
    gameStarted &&
    !gamePaused &&
    !gameOver &&
    !countdownRunning &&
    Boolean(player.matrix)
  );
}


/* =========================================================
   24. OVERLAY UTILITIES
========================================================= */

function hideAllOverlays() {
  [
    startOverlay,
    countdownOverlay,
    pauseOverlay,
    gameOverOverlay
  ].forEach((overlay) => {
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
  });
}


/* =========================================================
   25. DRAWING
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
    row.forEach(
      (pieceType, x) => {
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
      }
    );
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
  drawMatrix(
    context,
    player.matrix,
    getGhostPosition(),
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
    row.forEach(
      (value, x) => {
        if (value === 0) {
          return;
        }

        drawBlock(
          drawingContext,
          (x + position.x) *
            blockSize,
          (y + position.y) *
            blockSize,
          blockSize,
          type,
          options
        );
      }
    );
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
    Math.max(
      2,
      blockSize * 0.075
    );

  const x = pixelX + gap;
  const y = pixelY + gap;

  const size =
    blockSize - gap * 2;

  if (ghost) {
    drawingContext.save();

    drawingContext.globalAlpha =
      0.25;

    drawingContext.strokeStyle =
      colours.light;

    drawingContext.lineWidth =
      Math.max(
        2,
        blockSize * 0.07
      );

    roundedRectanglePath(
      drawingContext,
      x,
      y,
      size,
      size,
      Math.max(
        3,
        blockSize * 0.14
      )
    );

    drawingContext.stroke();
    drawingContext.restore();

    return;
  }

  drawingContext.save();

  drawingContext.shadowColor =
    colours.main;

  drawingContext.shadowBlur =
    Math.max(
      7,
      blockSize * 0.42
    );

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
    Math.max(
      3,
      blockSize * 0.14
    )
  );

  drawingContext.fillStyle =
    gradient;

  drawingContext.fill();

  drawingContext.shadowBlur = 0;

  drawingContext.strokeStyle =
    "rgba(255, 255, 255, 0.3)";

  drawingContext.lineWidth =
    Math.max(
      1,
      blockSize * 0.035
    );

  drawingContext.stroke();

  const highlightSize =
    Math.max(
      3,
      size * 0.16
    );

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
    size -
      highlightSize * 0.8,
    Math.max(
      3,
      highlightSize
    ),
    Math.max(
      2,
      blockSize * 0.08
    )
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
  const safeRadius =
    Math.min(
      radius,
      width / 2,
      height / 2
    );

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
      safeRadius
    );

    return;
  }

  drawingContext.rect(
    x,
    y,
    width,
    height
  );
}


/* =========================================================
   26. PREVIEW AND HOLD DRAWING
========================================================= */

function drawPreviewPiece() {
  clearCanvas(
    previewContext,
    previewCanvas
  );

  if (
    mobilePreviewContext &&
    mobilePreviewCanvas
  ) {
    clearCanvas(
      mobilePreviewContext,
      mobilePreviewCanvas
    );
  }

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

  if (
    mobilePreviewContext &&
    mobilePreviewCanvas
  ) {
    drawCentredMiniPiece(
      mobilePreviewContext,
      mobilePreviewCanvas,
      nextPiece.matrix,
      nextPiece.type,
      MOBILE_PREVIEW_BLOCK_SIZE
    );
  }
}


function drawHeldPiece() {
  clearCanvas(
    holdContext,
    holdCanvas
  );

  if (!heldPieceType) {
    holdEmptyMessage.hidden =
      false;

    return;
  }

  holdEmptyMessage.hidden = true;

  drawCentredMiniPiece(
    holdContext,
    holdCanvas,
    PIECE_SHAPES[
      heldPieceType
    ],
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

  const fittedBlockSize =
    Math.min(
      preferredBlockSize,
      maximumWidth /
        matrix[0].length,
      maximumHeight /
        matrix.length
    );

  const pieceWidth =
    matrix[0].length *
    fittedBlockSize;

  const pieceHeight =
    matrix.length *
    fittedBlockSize;

  const offsetX =
    (
      drawingCanvas.width -
      pieceWidth
    ) / 2;

  const offsetY =
    (
      drawingCanvas.height -
      pieceHeight
    ) / 2;

  matrix.forEach((row, y) => {
    row.forEach(
      (value, x) => {
        if (value === 0) {
          return;
        }

        drawBlock(
          drawingContext,
          offsetX +
            x * fittedBlockSize,
          offsetY +
            y * fittedBlockSize,
          fittedBlockSize,
          type
        );
      }
    );
  });
}


/* =========================================================
   27. PARTICLES
========================================================= */

function createLandingParticles() {
  if (
    !player.matrix ||
    !player.type
  ) {
    return;
  }

  const colour =
    PIECE_COLOURS[
      player.type
    ].main;

  player.matrix.forEach(
    (row, y) => {
      row.forEach(
        (value, x) => {
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
                (
                  x +
                  player.position.x +
                  0.5
                ) *
                BOARD_BLOCK_SIZE,

              y:
                (
                  y +
                  player.position.y +
                  0.9
                ) *
                BOARD_BLOCK_SIZE,

              velocityX:
                (
                  Math.random() -
                  0.5
                ) * 2.7,

              velocityY:
                -Math.random() *
                2.1,

              gravity: 0.08,

              size:
                2 +
                Math.random() *
                  4,

              alpha: 0.7,

              decay:
                0.025 +
                Math.random() *
                  0.02,

              colour
            });
          }
        }
      );
    }
  );
}


function createLineParticles(
  rowIndexes
) {
  rowIndexes.forEach(
    (rowIndex) => {
      for (
        let x = 0;
        x < BOARD_COLUMNS;
        x += 1
      ) {
        const pieceType =
          arena[rowIndex][x];

        const colour =
          PIECE_COLOURS[
            pieceType
          ]?.main ||
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
              (
                rowIndex +
                0.5
              ) *
              BOARD_BLOCK_SIZE,

            velocityX:
              (
                Math.random() -
                0.5
              ) * 7,

            velocityY:
              -1.5 -
              Math.random() *
                5,

            gravity: 0.13,

            size:
              3 +
              Math.random() *
                7,

            alpha: 1,

            decay:
              0.018 +
              Math.random() *
                0.025,

            colour
          });
        }
      }
    }
  );
}


function drawParticles() {
  for (
    let index =
      particles.length - 1;
    index >= 0;
    index -= 1
  ) {
    const particle =
      particles[index];

    particle.x +=
      particle.velocityX;

    particle.y +=
      particle.velocityY;

    particle.velocityY +=
      particle.gravity;

    particle.alpha -=
      particle.decay;

    if (particle.alpha <= 0) {
      particles.splice(
        index,
        1
      );

      continue;
    }

    context.save();

    context.globalAlpha =
      Math.max(
        0,
        particle.alpha
      );

    context.fillStyle =
      particle.colour;

    context.shadowColor =
      particle.colour;

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
   28. USER INTERFACE
========================================================= */

function formatScore(value) {
  return String(
    Math.max(
      0,
      Math.floor(value)
    )
  ).padStart(6, "0");
}


function updateInterface() {
  const formattedScore =
    formatScore(score);

  scoreElement.textContent =
    formattedScore;

  highScoreElement.textContent =
    formatScore(highScore);

  levelElement.textContent =
    String(level);

  linesElement.textContent =
    String(clearedLines);

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


function updateComboDisplay() {
  comboElement.textContent =
    `x${Math.max(0, bestCombo)}`;
}


function setGameStatus(
  text,
  state
) {
  statusElement.textContent =
    text;

  statusLight.className =
    `status-light status-light--${state}`;
}


function showLineAnnouncement(
  lineCount,
  currentCombo
) {
  const standardText =
    ANNOUNCEMENT_TEXT[
      lineCount
    ] ||
    `${lineCount} Lines!`;

  const comboText =
    currentCombo > 0
      ? ` • Combo x${currentCombo}`
      : "";

  showTemporaryAnnouncement(
    standardText + comboText
  );
}


function showTemporaryAnnouncement(
  text
) {
  if (announcementTimer) {
    window.clearTimeout(
      announcementTimer
    );
  }

  lineAnnouncement.textContent =
    text;

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

  gameTipElement.textContent =
    tip;

  if (tipTimer) {
    window.clearTimeout(
      tipTimer
    );
  }

  tipTimer =
    window.setTimeout(
      chooseRandomTip,
      18000
    );
}


/* =========================================================
   29. VISUAL AND DEVICE EFFECTS
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
   30. LOCAL HIGH SCORE
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

    return Number.isFinite(
      parsedValue
    )
      ? Math.max(
          0,
          parsedValue
        )
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
   31. GENERATED MICRO SOUND EFFECTS
========================================================= */

function initialiseAudioContext() {
  if (audioSettings.muted) {
    return;
  }

  if (audioContext) {
    if (
      audioContext.state ===
      "suspended"
    ) {
      audioContext
        .resume()
        .catch(() => {});
    }

    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (AudioContextClass) {
    audioContext =
      new AudioContextClass();
  }
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
    audioSettings.muted ||
    audioSettings.effects <= 0 ||
    !audioContext
  ) {
    return;
  }

  const startTime =
    audioContext.currentTime +
    delay;

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
    oscillator.frequency
      .exponentialRampToValueAtTime(
        Math.max(
          1,
          slideTo
        ),
        startTime + duration
      );
  }

  const adjustedVolume =
    volume *
    audioSettings.effects;

  gain.gain.setValueAtTime(
    Math.max(
      0.0001,
      adjustedVolume
    ),
    startTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + duration
  );

  oscillator.connect(gain);
  gain.connect(
    audioContext.destination
  );

  oscillator.start(startTime);

  oscillator.stop(
    startTime + duration
  );
}


function playGeneratedSound(
  soundName
) {
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

    countdown() {
      playTone({
        frequency: 520,
        slideTo: 420,
        duration: 0.1,
        volume: 0.04,
        type: "square"
      });
    }
  };

  sounds[soundName]?.();
}


/* =========================================================
   32. KEYBOARD CONTROLS
========================================================= */

function handleKeyboardInput(
  event
) {
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
    "Escape"
  ];

  if (
    controlledKeys.includes(
      event.key
    )
  ) {
    event.preventDefault();
  }

  if (
    event.key === "p" ||
    event.key === "P"
  ) {
    togglePause();
    return;
  }

  if (event.key === "Escape") {
    if (
      audioSettingsPanel?.classList.contains(
        "is-open"
      )
    ) {
      closeAudioSettings();
      return;
    }

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
   33. TOUCH CONTROLS
========================================================= */

function handleTouchAction(
  action
) {
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

  touchButtons.forEach(
    (button) => {
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

          initialiseAudioContext();

          button.classList.add(
            "is-pressed"
          );

          handleTouchAction(
            action
          );

          if (
            repeatableActions.includes(
              action
            )
          ) {
            repeatTimer =
              window.setTimeout(() => {
                repeatInterval =
                  window.setInterval(
                    () => {
                      handleTouchAction(
                        action
                      );
                    },
                    72
                  );
              }, 220);
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
    }
  );
}


/* =========================================================
   34. AUDIO SLIDER EVENTS
========================================================= */

function initialiseAudioSliders() {
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
}


/* =========================================================
   35. BUTTON EVENTS
========================================================= */

audioOnButton?.addEventListener(
  "click",
  () => {
    initialiseAudioContext();

    beginGameSequence(true);
  }
);


audioOffButton?.addEventListener(
  "click",
  () => {
    beginGameSequence(false);
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


mobilePauseButton?.addEventListener(
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

    if (!audioSettings.muted) {
      playGeneratedSound(
        "resume"
      );
    }
  }
);


audioSettingsButton?.addEventListener(
  "click",
  openAudioSettings
);


mobileAudioButton?.addEventListener(
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


mobileExitButton?.addEventListener(
  "click",
  () => {
    exitMobileGameMode();
  }
);


pauseExitButton?.addEventListener(
  "click",
  () => {
    exitMobileGameMode({
      pauseFirst: false
    });
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


document.addEventListener(
  "keydown",
  handleKeyboardInput
);


/* =========================================================
   36. PAGE AND VIEWPORT EVENTS
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


window.addEventListener(
  "resize",
  debounce(
    handleViewportChange,
    120
  )
);


window.addEventListener(
  "orientationchange",
  () => {
    window.setTimeout(
      handleViewportChange,
      250
    );
  }
);


window.addEventListener(
  "beforeunload",
  () => {
    stopAllMusic();
    stopAllImportedClips();
  }
);


/* =========================================================
   37. ANIMATION LOOP
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
    !gameOver
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

  drawGame();

  window.requestAnimationFrame(
    updateGame
  );
}


/* =========================================================
   38. GENERAL UTILITIES
========================================================= */

function debounce(
  callback,
  delay
) {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId) {
      window.clearTimeout(
        timeoutId
      );
    }

    timeoutId =
      window.setTimeout(
        () => {
          callback(...args);
        },
        delay
      );
  };
}


/* =========================================================
   39. INITIALISATION
========================================================= */

function initialiseGame() {
  updateInterface();
  updateComboDisplay();

  drawPreviewPiece();
  drawHeldPiece();
  drawGame();

  setGameStatus(
    "Ready",
    "ready"
  );

  initialiseTouchControls();
  initialiseAudioSliders();

  applyAudioSettingsToInterface();

  chooseRandomTip();

  Object.values(
    musicTracks
  ).forEach((track) => {
    track.volume = 0;
  });

  updatePauseButtons();

  window.requestAnimationFrame(
    updateGame
  );
}


initialiseGame();
