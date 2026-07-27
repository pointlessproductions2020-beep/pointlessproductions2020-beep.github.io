"use strict";


/* =========================================================
   THNAKE AUDIO SYSTEM
   Pointless Arcade

   This file manages:

   - Menu music
   - Sneaking music
   - Alarm music
   - Sound effects
   - Voice reactions
   - Master mute
   - Separate volume channels
   - Saved audio preferences

   The game remains fully playable when audio files
   have not yet been added.
========================================================= */


/* =========================================================
   1. AUDIO FILE PATHS

   These filenames can be added later inside:

   assets/sounds/music/
   assets/sounds/effects/
   assets/sounds/voices/
========================================================= */

const THNAKE_AUDIO_PATHS = {

  music: {

    menu:
      "assets/sounds/music/menu.mp3",

    sneaking:
      "assets/sounds/music/sneaking.mp3",

    alarm:
      "assets/sounds/music/alarm.mp3",

    missionComplete:
      "assets/sounds/music/mission-complete.mp3"

  },


  effects: {

    move:
      "assets/sounds/effects/step.mp3",

    blocked:
      "assets/sounds/effects/blocked.mp3",

    treasure:
      "assets/sounds/effects/treasure.mp3",

    target:
      "assets/sounds/effects/target-collected.mp3",

    exitUnlocked:
      "assets/sounds/effects/exit-unlocked.mp3",

    missionComplete:
      "assets/sounds/effects/level-complete.mp3",

    missionFailed:
      "assets/sounds/effects/mission-failed.mp3",

    pause:
      "assets/sounds/effects/pause.mp3",

    resume:
      "assets/sounds/effects/resume.mp3",

    spotted:
      "assets/sounds/effects/spotted.mp3",

    laser:
      "assets/sounds/effects/laser.mp3",

    door:
      "assets/sounds/effects/door.mp3",

    pressurePlate:
      "assets/sounds/effects/pressure-plate.mp3"

  },


  voices: {

    missionStart:
      "assets/sounds/voices/mission-start.mp3",

    stealTheDuck:
      "assets/sounds/voices/steal-the-duck.mp3",

    targetAcquired:
      "assets/sounds/voices/target-acquired.mp3",

    nobodySawThat:
      "assets/sounds/voices/nobody-saw-that.mp3",

    excellent:
      "assets/sounds/voices/excellent.mp3",

    greedy:
      "assets/sounds/voices/greedy.mp3",

    youTrappedYourself:
      "assets/sounds/voices/you-trapped-yourself.mp3",

    caught:
      "assets/sounds/voices/caught.mp3",

    missionComplete:
      "assets/sounds/voices/mission-complete.mp3",

    thnake:
      "assets/sounds/voices/thnake.mp3"

  }

};


/* =========================================================
   2. STORAGE AND DEFAULT SETTINGS
========================================================= */

const THNAKE_AUDIO_STORAGE_KEY =
  "thnakeAudioSettings";


const THNAKE_DEFAULT_AUDIO_SETTINGS = {

  musicVolume: 0.32,

  effectsVolume: 0.62,

  voiceVolume: 0.88,

  muted: false

};


/* =========================================================
   3. AUDIO STATE
========================================================= */

let thnakeAudioSettings =
  loadThnakeAudioSettings();


let thnakeAudioContext = null;

let thnakeCurrentMusic = null;

let thnakeCurrentMusicName = "";

let thnakeActiveVoice = null;

let thnakeAudioUnlocked = false;


/* =========================================================
   4. AUDIO ELEMENT CACHE
========================================================= */

const thnakeMusicTracks = {

  menu:
    createThnakeAudioElement(
      THNAKE_AUDIO_PATHS.music.menu,
      true
    ),

  sneaking:
    createThnakeAudioElement(
      THNAKE_AUDIO_PATHS.music.sneaking,
      true
    ),

  alarm:
    createThnakeAudioElement(
      THNAKE_AUDIO_PATHS.music.alarm,
      true
    ),

  missionComplete:
    createThnakeAudioElement(
      THNAKE_AUDIO_PATHS.music.missionComplete,
      false
    )

};


/* =========================================================
   5. GENERAL UTILITIES
========================================================= */

function clampThnakeAudioVolume(value) {

  return Math.max(
    0,
    Math.min(
      1,
      Number(value) || 0
    )
  );

}


function createThnakeAudioElement(
  source,
  shouldLoop = false
) {

  const audio =
    new Audio();


  audio.src =
    source;


  audio.preload =
    "auto";


  audio.loop =
    shouldLoop;


  audio.volume =
    0;


  audio.addEventListener(
    "error",
    () => {

      /*
       Missing audio files are expected while the game
       is being developed. Do not interrupt gameplay.
      */

    }
  );


  return audio;

}


function safelyPlayThnakeAudio(audio) {

  if (
    !audio ||
    thnakeAudioSettings.muted
  ) {
    return;
  }


  try {

    const playPromise =
      audio.play();


    if (
      playPromise &&
      typeof playPromise.catch === "function"
    ) {

      playPromise.catch(() => {

        /*
         Browsers can block audio until the player
         has interacted with the page.
        */

      });

    }

  } catch (error) {

    console.warn(
      "Thnake audio could not play.",
      error
    );

  }

}


function stopThnakeAudioElement(
  audio,
  resetPosition = true
) {

  if (!audio) {
    return;
  }


  try {

    audio.pause();


    if (resetPosition) {

      audio.currentTime = 0;

    }

  } catch (error) {

    console.warn(
      "Thnake audio could not be stopped.",
      error
    );

  }

}


/* =========================================================
   6. LOAD AND SAVE SETTINGS
========================================================= */

function loadThnakeAudioSettings() {

  try {

    const savedSettings =
      localStorage.getItem(
        THNAKE_AUDIO_STORAGE_KEY
      );


    if (!savedSettings) {

      return {
        ...THNAKE_DEFAULT_AUDIO_SETTINGS
      };

    }


    const parsedSettings =
      JSON.parse(savedSettings);


    return {

      musicVolume:
        clampThnakeAudioVolume(
          parsedSettings.musicVolume ??
          THNAKE_DEFAULT_AUDIO_SETTINGS.musicVolume
        ),

      effectsVolume:
        clampThnakeAudioVolume(
          parsedSettings.effectsVolume ??
          THNAKE_DEFAULT_AUDIO_SETTINGS.effectsVolume
        ),

      voiceVolume:
        clampThnakeAudioVolume(
          parsedSettings.voiceVolume ??
          THNAKE_DEFAULT_AUDIO_SETTINGS.voiceVolume
        ),

      muted:
        Boolean(
          parsedSettings.muted ??
          THNAKE_DEFAULT_AUDIO_SETTINGS.muted
        )

    };

  } catch (error) {

    console.warn(
      "Thnake could not load its audio settings.",
      error
    );


    return {
      ...THNAKE_DEFAULT_AUDIO_SETTINGS
    };

  }

}


function saveThnakeAudioSettings() {

  try {

    localStorage.setItem(
      THNAKE_AUDIO_STORAGE_KEY,
      JSON.stringify(
        thnakeAudioSettings
      )
    );

  } catch (error) {

    console.warn(
      "Thnake could not save its audio settings.",
      error
    );

  }

}


/* =========================================================
   7. WEB AUDIO CONTEXT

   Generated fallback sounds use Web Audio so the game
   still has feedback before custom files are created.
========================================================= */

function initialiseThnakeAudioContext() {

  if (thnakeAudioSettings.muted) {
    return;
  }


  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioContextClass) {
    return;
  }


  if (!thnakeAudioContext) {

    thnakeAudioContext =
      new AudioContextClass();

  }


  if (
    thnakeAudioContext.state ===
    "suspended"
  ) {

    thnakeAudioContext
      .resume()
      .catch(() => {});

  }


  thnakeAudioUnlocked = true;

}


/* =========================================================
   8. MUSIC
========================================================= */

function getThnakeMusicVolume(trackName) {

  const baseVolume =
    thnakeAudioSettings.musicVolume;


  if (trackName === "alarm") {

    return clampThnakeAudioVolume(
      baseVolume * 1.15
    );

  }


  if (trackName === "menu") {

    return clampThnakeAudioVolume(
      baseVolume * 0.82
    );

  }


  return clampThnakeAudioVolume(
    baseVolume
  );

}


function playThnakeMusic(
  trackName,
  options = {}
) {

  const {
    restart = false
  } = options;


  if (
    thnakeAudioSettings.muted ||
    thnakeAudioSettings.musicVolume <= 0
  ) {
    return;
  }


  const selectedTrack =
    thnakeMusicTracks[trackName];


  if (!selectedTrack) {

    console.warn(
      `Unknown Thnake music track: ${trackName}`
    );

    return;

  }


  initialiseThnakeAudioContext();


  if (
    thnakeCurrentMusic &&
    thnakeCurrentMusic !== selectedTrack
  ) {

    stopThnakeAudioElement(
      thnakeCurrentMusic,
      false
    );

  }


  if (restart) {

    try {

      selectedTrack.currentTime = 0;

    } catch (error) {

      /*
       The file may not have loaded yet.
      */

    }

  }


  selectedTrack.volume =
    getThnakeMusicVolume(
      trackName
    );


  thnakeCurrentMusic =
    selectedTrack;


  thnakeCurrentMusicName =
    trackName;


  safelyPlayThnakeAudio(
    selectedTrack
  );

}


function stopThnakeMusic(
  resetPosition = false
) {

  Object.values(
    thnakeMusicTracks
  ).forEach((track) => {

    stopThnakeAudioElement(
      track,
      resetPosition
    );

  });


  thnakeCurrentMusic = null;

  thnakeCurrentMusicName = "";

}


function pauseThnakeMusic() {

  if (!thnakeCurrentMusic) {
    return;
  }


  stopThnakeAudioElement(
    thnakeCurrentMusic,
    false
  );

}


function resumeThnakeMusic() {

  if (
    !thnakeCurrentMusic ||
    thnakeAudioSettings.muted
  ) {
    return;
  }


  thnakeCurrentMusic.volume =
    getThnakeMusicVolume(
      thnakeCurrentMusicName
    );


  safelyPlayThnakeAudio(
    thnakeCurrentMusic
  );

}


function updateThnakeMusicVolume() {

  if (!thnakeCurrentMusic) {
    return;
  }


  if (
    thnakeAudioSettings.muted ||
    thnakeAudioSettings.musicVolume <= 0
  ) {

    pauseThnakeMusic();

    return;

  }


  thnakeCurrentMusic.volume =
    getThnakeMusicVolume(
      thnakeCurrentMusicName
    );


  if (thnakeCurrentMusic.paused) {

    safelyPlayThnakeAudio(
      thnakeCurrentMusic
    );

  }

}


/* =========================================================
   9. IMPORTED EFFECTS
========================================================= */

function playThnakeEffect(
  effectName,
  options = {}
) {

  const {
    delay = 0,
    volumeMultiplier = 1
  } = options;


  if (
    thnakeAudioSettings.muted ||
    thnakeAudioSettings.effectsVolume <= 0
  ) {
    return;
  }


  const effectPath =
    THNAKE_AUDIO_PATHS.effects[
      effectName
    ];


  if (!effectPath) {

    console.warn(
      `Unknown Thnake effect: ${effectName}`
    );

    return;

  }


  window.setTimeout(() => {

    if (
      thnakeAudioSettings.muted ||
      thnakeAudioSettings.effectsVolume <= 0
    ) {
      return;
    }


    const effect =
      createThnakeAudioElement(
        effectPath,
        false
      );


    effect.volume =
      clampThnakeAudioVolume(
        thnakeAudioSettings.effectsVolume *
        volumeMultiplier
      );


    safelyPlayThnakeAudio(
      effect
    );

  }, delay);

}


/* =========================================================
   10. VOICE CLIPS
========================================================= */

function playThnakeVoice(
  voiceName,
  options = {}
) {

  const {
    delay = 0,
    interrupt = false,
    volumeMultiplier = 1
  } = options;


  if (
    thnakeAudioSettings.muted ||
    thnakeAudioSettings.voiceVolume <= 0
  ) {
    return;
  }


  const voicePath =
    THNAKE_AUDIO_PATHS.voices[
      voiceName
    ];


  if (!voicePath) {

    console.warn(
      `Unknown Thnake voice clip: ${voiceName}`
    );

    return;

  }


  window.setTimeout(() => {

    if (
      thnakeAudioSettings.muted ||
      thnakeAudioSettings.voiceVolume <= 0
    ) {
      return;
    }


    if (
      thnakeActiveVoice &&
      !interrupt
    ) {
      return;
    }


    if (
      thnakeActiveVoice &&
      interrupt
    ) {

      stopThnakeAudioElement(
        thnakeActiveVoice
      );


      thnakeActiveVoice = null;

    }


    const voice =
      createThnakeAudioElement(
        voicePath,
        false
      );


    voice.volume =
      clampThnakeAudioVolume(
        thnakeAudioSettings.voiceVolume *
        volumeMultiplier
      );


    thnakeActiveVoice =
      voice;


    const releaseVoice = () => {

      if (
        thnakeActiveVoice === voice
      ) {

        thnakeActiveVoice = null;

      }

    };


    voice.addEventListener(
      "ended",
      releaseVoice,
      {
        once: true
      }
    );


    voice.addEventListener(
      "error",
      releaseVoice,
      {
        once: true
      }
    );


    safelyPlayThnakeAudio(
      voice
    );

  }, delay);

}


function stopThnakeVoice() {

  if (!thnakeActiveVoice) {
    return;
  }


  stopThnakeAudioElement(
    thnakeActiveVoice
  );


  thnakeActiveVoice = null;

}


/* =========================================================
   11. GENERATED FALLBACK SOUNDS

   These small sounds provide feedback before the custom
   MP3 files exist. game.js can use these for movement,
   collisions and menu actions.
========================================================= */

function playThnakeGeneratedSound(
  soundName
) {

  if (
    thnakeAudioSettings.muted ||
    thnakeAudioSettings.effectsVolume <= 0
  ) {
    return;
  }


  initialiseThnakeAudioContext();


  if (!thnakeAudioContext) {
    return;
  }


  const soundDefinitions = {

    move: {

      startFrequency: 155,

      endFrequency: 128,

      duration: 0.035,

      volume: 0.025,

      waveform: "triangle"

    },


    blocked: {

      startFrequency: 95,

      endFrequency: 70,

      duration: 0.09,

      volume: 0.04,

      waveform: "square"

    },


    treasure: {

      startFrequency: 420,

      endFrequency: 720,

      duration: 0.17,

      volume: 0.05,

      waveform: "sine"

    },


    target: {

      startFrequency: 350,

      endFrequency: 880,

      duration: 0.28,

      volume: 0.055,

      waveform: "triangle"

    },


    pause: {

      startFrequency: 300,

      endFrequency: 180,

      duration: 0.12,

      volume: 0.035,

      waveform: "sine"

    },


    resume: {

      startFrequency: 180,

      endFrequency: 360,

      duration: 0.12,

      volume: 0.035,

      waveform: "sine"

    },


    complete: {

      startFrequency: 440,

      endFrequency: 980,

      duration: 0.34,

      volume: 0.06,

      waveform: "triangle"

    },


    failed: {

      startFrequency: 210,

      endFrequency: 65,

      duration: 0.38,

      volume: 0.055,

      waveform: "sawtooth"

    },


    menu: {

      startFrequency: 240,

      endFrequency: 310,

      duration: 0.08,

      volume: 0.025,

      waveform: "sine"

    }

  };


  const definition =
    soundDefinitions[
      soundName
    ];


  if (!definition) {
    return;
  }


  const oscillator =
    thnakeAudioContext
      .createOscillator();


  const gain =
    thnakeAudioContext
      .createGain();


  const startTime =
    thnakeAudioContext.currentTime;


  oscillator.type =
    definition.waveform;


  oscillator.frequency.setValueAtTime(
    definition.startFrequency,
    startTime
  );


  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(
      1,
      definition.endFrequency
    ),
    startTime +
    definition.duration
  );


  gain.gain.setValueAtTime(
    Math.max(
      0.0001,
      definition.volume *
      thnakeAudioSettings.effectsVolume
    ),
    startTime
  );


  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime +
    definition.duration
  );


  oscillator.connect(gain);

  gain.connect(
    thnakeAudioContext.destination
  );


  oscillator.start(
    startTime
  );


  oscillator.stop(
    startTime +
    definition.duration
  );

}


/* =========================================================
   12. AUDIO EVENT HELPERS

   These provide simple named functions for game.js.
========================================================= */

function thnakeAudioMissionStart() {

  initialiseThnakeAudioContext();

  playThnakeMusic(
    "sneaking",
    {
      restart: true
    }
  );


  playThnakeVoice(
    "missionStart",
    {
      delay: 350,
      interrupt: true
    }
  );

}


function thnakeAudioPlayerMove() {

  playThnakeGeneratedSound(
    "move"
  );

}


function thnakeAudioBlocked() {

  playThnakeGeneratedSound(
    "blocked"
  );

}


function thnakeAudioBonusTreasure() {

  playThnakeGeneratedSound(
    "treasure"
  );


  playThnakeEffect(
    "treasure"
  );


  if (Math.random() < 0.32) {

    playThnakeVoice(
      "greedy",
      {
        delay: 400
      }
    );

  }

}


function thnakeAudioTargetCollected() {

  playThnakeGeneratedSound(
    "target"
  );


  playThnakeEffect(
    "target"
  );


  playThnakeEffect(
    "exitUnlocked",
    {
      delay: 240
    }
  );


  playThnakeVoice(
    "targetAcquired",
    {
      delay: 500,
      interrupt: true
    }
  );

}


function thnakeAudioPause() {

  playThnakeGeneratedSound(
    "pause"
  );


  playThnakeEffect(
    "pause"
  );


  if (thnakeCurrentMusic) {

    thnakeCurrentMusic.volume =
      Math.min(
        0.08,
        getThnakeMusicVolume(
          thnakeCurrentMusicName
        )
      );

  }

}


function thnakeAudioResume() {

  playThnakeGeneratedSound(
    "resume"
  );


  playThnakeEffect(
    "resume"
  );


  updateThnakeMusicVolume();

}


function thnakeAudioAlarm() {

  stopThnakeVoice();


  playThnakeEffect(
    "spotted"
  );


  playThnakeMusic(
    "alarm",
    {
      restart: true
    }
  );


  playThnakeVoice(
    "caught",
    {
      delay: 350,
      interrupt: true
    }
  );

}


function thnakeAudioMissionFailed(
  reason = "trapped"
) {

  stopThnakeMusic();

  stopThnakeVoice();


  playThnakeGeneratedSound(
    "failed"
  );


  playThnakeEffect(
    "missionFailed"
  );


  if (reason === "trapped") {

    playThnakeVoice(
      "youTrappedYourself",
      {
        delay: 500,
        interrupt: true
      }
    );

  } else {

    playThnakeVoice(
      "caught",
      {
        delay: 500,
        interrupt: true
      }
    );

  }

}


function thnakeAudioMissionComplete() {

  stopThnakeMusic();

  stopThnakeVoice();


  playThnakeGeneratedSound(
    "complete"
  );


  playThnakeEffect(
    "missionComplete"
  );


  playThnakeMusic(
    "missionComplete",
    {
      restart: true
    }
  );


  playThnakeVoice(
    "missionComplete",
    {
      delay: 550,
      interrupt: true
    }
  );

}


/* =========================================================
   13. MASTER AUDIO CONTROLS
========================================================= */

function setThnakeMuted(isMuted) {

  thnakeAudioSettings.muted =
    Boolean(isMuted);


  saveThnakeAudioSettings();


  if (thnakeAudioSettings.muted) {

    stopThnakeMusic(false);

    stopThnakeVoice();

  } else {

    initialiseThnakeAudioContext();

  }


  updateThnakeAudioButton();

}


function toggleThnakeMuted() {

  setThnakeMuted(
    !thnakeAudioSettings.muted
  );

}


function setThnakeMusicVolume(value) {

  thnakeAudioSettings.musicVolume =
    clampThnakeAudioVolume(value);


  saveThnakeAudioSettings();

  updateThnakeMusicVolume();

}


function setThnakeEffectsVolume(value) {

  thnakeAudioSettings.effectsVolume =
    clampThnakeAudioVolume(value);


  saveThnakeAudioSettings();

}


function setThnakeVoiceVolume(value) {

  thnakeAudioSettings.voiceVolume =
    clampThnakeAudioVolume(value);


  if (thnakeActiveVoice) {

    thnakeActiveVoice.volume =
      thnakeAudioSettings.voiceVolume;

  }


  saveThnakeAudioSettings();

}


function resetThnakeAudioSettings() {

  thnakeAudioSettings = {
    ...THNAKE_DEFAULT_AUDIO_SETTINGS
  };


  saveThnakeAudioSettings();

  updateThnakeMusicVolume();

  updateThnakeAudioButton();

}


/* =========================================================
   14. AUDIO BUTTON
========================================================= */

function updateThnakeAudioButton() {

  const audioButton =
    document.querySelector(
      "#audioButton"
    );


  if (!audioButton) {
    return;
  }


  const isMuted =
    thnakeAudioSettings.muted;


  audioButton.innerHTML =
    isMuted
      ? "🔇 Audio Off"
      : "🔊 Audio On";


  audioButton.setAttribute(
    "aria-pressed",
    String(isMuted)
  );


  audioButton.setAttribute(
    "aria-label",
    isMuted
      ? "Enable Thnake audio"
      : "Mute Thnake audio"
  );

}


function initialiseThnakeAudioButton() {

  const audioButton =
    document.querySelector(
      "#audioButton"
    );


  if (!audioButton) {
    return;
  }


  updateThnakeAudioButton();


  audioButton.addEventListener(
    "click",
    () => {

      initialiseThnakeAudioContext();

      toggleThnakeMuted();


      if (!thnakeAudioSettings.muted) {

        playThnakeGeneratedSound(
          "menu"
        );

      }

    }
  );

}


/* =========================================================
   15. PAGE VISIBILITY

   Music pauses when the browser tab is hidden.
========================================================= */

function handleThnakeAudioVisibilityChange() {

  if (document.hidden) {

    pauseThnakeMusic();

    return;

  }


  if (
    !thnakeAudioSettings.muted &&
    thnakeCurrentMusic
  ) {

    resumeThnakeMusic();

  }

}


/* =========================================================
   16. INITIALISATION
========================================================= */

function initialiseThnakeAudio() {

  initialiseThnakeAudioButton();


  document.addEventListener(
    "visibilitychange",
    handleThnakeAudioVisibilityChange
  );


  document.addEventListener(
    "pointerdown",
    initialiseThnakeAudioContext,
    {
      once: true
    }
  );


  document.addEventListener(
    "keydown",
    initialiseThnakeAudioContext,
    {
      once: true
    }
  );

}


initialiseThnakeAudio();


/* =========================================================
   17. GLOBAL EXPORTS

   game.js can call these functions directly or through
   window.ThnakeAudio.
========================================================= */

window.ThnakeAudio = {

  paths:
    THNAKE_AUDIO_PATHS,


  getSettings() {

    return {
      ...thnakeAudioSettings
    };

  },


  initialise:
    initialiseThnakeAudioContext,


  playMusic:
    playThnakeMusic,


  stopMusic:
    stopThnakeMusic,


  pauseMusic:
    pauseThnakeMusic,


  resumeMusic:
    resumeThnakeMusic,


  playEffect:
    playThnakeEffect,


  playVoice:
    playThnakeVoice,


  stopVoice:
    stopThnakeVoice,


  playGeneratedSound:
    playThnakeGeneratedSound,


  missionStart:
    thnakeAudioMissionStart,


  playerMove:
    thnakeAudioPlayerMove,


  blocked:
    thnakeAudioBlocked,


  bonusTreasure:
    thnakeAudioBonusTreasure,


  targetCollected:
    thnakeAudioTargetCollected,


  pause:
    thnakeAudioPause,


  resume:
    thnakeAudioResume,


  alarm:
    thnakeAudioAlarm,


  missionFailed:
    thnakeAudioMissionFailed,


  missionComplete:
    thnakeAudioMissionComplete,


  setMuted:
    setThnakeMuted,


  toggleMuted:
    toggleThnakeMuted,


  setMusicVolume:
    setThnakeMusicVolume,


  setEffectsVolume:
    setThnakeEffectsVolume,


  setVoiceVolume:
    setThnakeVoiceVolume,


  resetSettings:
    resetThnakeAudioSettings

};
