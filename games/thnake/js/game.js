"use strict";


/* =========================================================
   THNAKE
   Pointless Arcade

   PROCEDURAL HEIST PROTOTYPE

   Features:

   - Procedurally generated museums
   - Permanent player trail
   - Main target and optional treasure
   - Return-to-exit objective
   - Turn-based guard patrols
   - Visible guard vision
   - Guard collision and detection
   - Keyboard controls
   - Mobile swipe controls
   - Pause and restart
   - Local best score
   - Temporary canvas artwork
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const gameCanvas =
  document.querySelector("#gameCanvas");

const gameContext =
  gameCanvas?.getContext("2d");


const gameArea =
  document.querySelector(".game-area");


const startOverlay =
  document.querySelector("#startOverlay");

const pauseOverlay =
  document.querySelector("#pauseOverlay");

const gameOverOverlay =
  document.querySelector("#gameOverOverlay");


const startGameButton =
  document.querySelector("#startGameButton");

const resumeButton =
  document.querySelector("#resumeButton");

const restartButton =
  document.querySelector("#restartButton");


const gameOverReasonElement =
  document.querySelector("#gameOverReason");


const missionNameElement =
  document.querySelector("#missionName");

const scoreElement =
  document.querySelector("#score");

const movesElement =
  document.querySelector("#moves");

const treasureCountElement =
  document.querySelector("#treasureCount");


const mobileScoreElement =
  document.querySelector("#mobileScore");

const mobileMovesElement =
  document.querySelector("#mobileMoves");

const mobileTreasureElement =
  document.querySelector("#mobileTreasure");


const tipTextElement =
  document.querySelector("#tipText");


const missionObjectives =
  document.querySelectorAll(".objective");


if (
  !gameCanvas ||
  !gameContext ||
  !gameArea
) {
  throw new Error(
    "Thnake could not find its required page elements."
  );
}


/* =========================================================
   2. TILE CONSTANTS
========================================================= */

const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_EXIT = 2;
const TILE_TARGET = 3;
const TILE_BONUS_TREASURE = 4;
const TILE_LOCKED_DOOR = 5;
const TILE_PRESSURE_PLATE = 6;
const TILE_LASER = 7;
const TILE_OBSTACLE = 8;


/* =========================================================
   3. MOVEMENT CONSTANTS
========================================================= */

const DIRECTION_UP = {
  x: 0,
  y: -1,
  name: "up"
};

const DIRECTION_DOWN = {
  x: 0,
  y: 1,
  name: "down"
};

const DIRECTION_LEFT = {
  x: -1,
  y: 0,
  name: "left"
};

const DIRECTION_RIGHT = {
  x: 1,
  y: 0,
  name: "right"
};


const VALID_DIRECTIONS = [
  DIRECTION_UP,
  DIRECTION_RIGHT,
  DIRECTION_DOWN,
  DIRECTION_LEFT
];


const SWIPE_THRESHOLD = 28;

const LONG_PRESS_DELAY = 650;

const CURRENT_LEVEL_INDEX = 0;

const BEST_SCORE_STORAGE_KEY =
  "thnakeBestScore";


/* =========================================================
   4. GUARD SETTINGS
========================================================= */

const GUARD_MINIMUM_ENTRANCE_DISTANCE = 7;

const GUARD_MINIMUM_TARGET_DISTANCE = 4;

const GUARD_MINIMUM_PATROL_LENGTH = 4;

const GUARD_MAXIMUM_PATROL_LENGTH = 9;

const GUARD_VISION_DISTANCE = 5;

const GUARD_PLACEMENT_ATTEMPTS = 120;

const GUARD_TURN_PAUSE_MOVES = 1;


/* =========================================================
   5. COLOURS
========================================================= */

const COLOURS = {

  floorDark:
    "#07110c",

  floorLight:
    "#0c1c13",

  floorGrid:
    "rgba(77, 255, 145, 0.055)",

  wallMain:
    "#1d3126",

  wallLight:
    "#395544",

  wallDark:
    "#0b1710",

  wallEdge:
    "rgba(166, 255, 200, 0.24)",

  trailMain:
    "#4dff91",

  trailLight:
    "#b7ffd1",

  trailDark:
    "#168448",

  playerMain:
    "#55ff92",

  playerDark:
    "#13783e",

  playerLight:
    "#c4ffda",

  guardMain:
    "#ff596f",

  guardDark:
    "#8f1f32",

  guardLight:
    "#ffb5bf",

  guardVision:
    "rgba(255, 83, 104, 0.22)",

  guardVisionEdge:
    "rgba(255, 120, 136, 0.54)",

  gold:
    "#ffd369",

  goldLight:
    "#fff1ad",

  red:
    "#ff5368",

  blue:
    "#4fdcff",

  exitInactive:
    "#7d8d84",

  exitActive:
    "#4dff91"

};


/* =========================================================
   6. GAME STATE
========================================================= */

let currentLevel = null;

let currentLevelIndex =
  CURRENT_LEVEL_INDEX;


let player = {

  x: 0,

  y: 0,

  previousX: 0,

  previousY: 0,

  facing: "right"

};


let guards = [];


let trail = [];

let trailLookup =
  new Set();


let targetCollected = false;

let collectedBonusTreasureIds =
  new Set();


let score = 0;

let moves = 0;

let bestScore =
  loadBestScore();


let missionStarted = false;

let missionPaused = false;

let missionFailed = false;

let missionComplete = false;


let lastFrameTime = 0;

let animationTime = 0;


let missionCompleteOverlay = null;

let missionBriefingOverlay = null;


let canvasMessage = {

  title: "",

  subtitle: "",

  visibleUntil: 0

};


/* =========================================================
   7. POINTER STATE
========================================================= */

const pointerState = {

  active: false,

  pointerId: null,

  startX: 0,

  startY: 0,

  currentX: 0,

  currentY: 0,

  startTime: 0,

  moved: false,

  longPressTriggered: false,

  longPressTimer: null

};


/* =========================================================
   8. GENERAL HELPERS
========================================================= */

function clamp(
  value,
  minimum,
  maximum
) {

  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );

}


function positionsMatch(
  first,
  second
) {

  return (
    first.x === second.x &&
    first.y === second.y
  );

}


function positionKey(
  x,
  y
) {

  return `${x},${y}`;

}


function manhattanDistance(
  first,
  second
) {

  return (
    Math.abs(first.x - second.x) +
    Math.abs(first.y - second.y)
  );

}


function isMobileDevice() {

  return (
    window.matchMedia(
      "(pointer: coarse)"
    ).matches ||
    window.matchMedia(
      "(max-width: 1024px)"
    ).matches
  );

}


function vibrate(pattern) {

  if (
    "vibrate" in navigator &&
    isMobileDevice()
  ) {

    navigator.vibrate(pattern);

  }

}


function showElement(element) {

  if (!element) {
    return;
  }

  element.classList.remove(
    "hidden"
  );

}


function hideElement(element) {

  if (!element) {
    return;
  }

  element.classList.add(
    "hidden"
  );

}


function shuffleArray(array) {

  const shuffled =
    [...array];


  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {

    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );


    [
      shuffled[index],
      shuffled[randomIndex]
    ] = [
      shuffled[randomIndex],
      shuffled[index]
    ];

  }


  return shuffled;

}


/* =========================================================
   9. LOCAL STORAGE
========================================================= */

function loadBestScore() {

  try {

    const savedScore =
      Number.parseInt(
        localStorage.getItem(
          BEST_SCORE_STORAGE_KEY
        ) || "",
        10
      );


    return Number.isFinite(savedScore)
      ? savedScore
      : 0;

  } catch (error) {

    return 0;

  }

}


function saveBestScore() {

  try {

    localStorage.setItem(
      BEST_SCORE_STORAGE_KEY,
      String(bestScore)
    );

  } catch (error) {

    console.warn(
      "Thnake could not save the best score.",
      error
    );

  }

}


/* =========================================================
   10. LEVEL LOADING
========================================================= */

function loadLevel(index) {

  if (
    typeof window.getThnakeLevelByIndex !==
    "function"
  ) {

    throw new Error(
      "Thnake could not access levels.js."
    );

  }


  const generatedLevel =
    window.getThnakeLevelByIndex(index);


  if (!generatedLevel) {

    throw new Error(
      `Thnake mission ${index} could not be generated.`
    );

  }


  validateLevel(
    generatedLevel
  );


  currentLevel =
    generatedLevel;

  currentLevelIndex =
    index;


  gameCanvas.width =
    768;

  gameCanvas.height =
    768;


  resetPlayer();

  resetMissionState();

  generateMissionGuards();

  updateMissionInformation();

  updateMissionBriefing();

  updateInterface();

  drawGame();

}


function validateLevel(level) {

  if (
    !Array.isArray(level.map) ||
    level.map.length !== level.height
  ) {

    throw new Error(
      `Invalid map height in mission: ${level.name}`
    );

  }


  level.map.forEach(
    (row, rowIndex) => {

      if (
        !Array.isArray(row) ||
        row.length !== level.width
      ) {

        throw new Error(
          `Invalid map width on row ${rowIndex} in mission: ${level.name}`
        );

      }

    }
  );

}


function resetPlayer() {

  player.x =
    currentLevel.playerStart.x;

  player.y =
    currentLevel.playerStart.y;

  player.previousX =
    player.x;

  player.previousY =
    player.y;

  player.facing =
    "right";

}


function resetMissionState() {

  targetCollected =
    false;


  collectedBonusTreasureIds =
    new Set();


  trail = [];

  trailLookup =
    new Set();


  addTrailPosition(
    player.x,
    player.y
  );


  score = 0;

  moves = 0;


  missionStarted =
    false;

  missionPaused =
    false;

  missionFailed =
    false;

  missionComplete =
    false;


  canvasMessage = {

    title: "",

    subtitle: "",

    visibleUntil: 0

  };

}


/* =========================================================
   11. MAP HELPERS
========================================================= */

function getTile(
  x,
  y
) {

  if (!currentLevel) {
    return TILE_WALL;
  }


  if (
    x < 0 ||
    y < 0 ||
    x >= currentLevel.width ||
    y >= currentLevel.height
  ) {

    return TILE_WALL;

  }


  return currentLevel.map[y][x];

}


function isWallTile(tile) {

  return (
    tile === TILE_WALL ||
    tile === TILE_LOCKED_DOOR ||
    tile === TILE_OBSTACLE
  );

}


function isWalkablePosition(
  x,
  y
) {

  return !isWallTile(
    getTile(x, y)
  );

}


function isExitPosition(
  x,
  y
) {

  return (
    x === currentLevel.exit.x &&
    y === currentLevel.exit.y
  );

}


function isTargetPosition(
  x,
  y
) {

  return (
    x === currentLevel.target.x &&
    y === currentLevel.target.y
  );

}


function getCardinalNeighbours(
  position
) {

  return VALID_DIRECTIONS
    .map((direction) => {

      return {

        x:
          position.x +
          direction.x,

        y:
          position.y +
          direction.y,

        direction

      };

    })
    .filter((position) => {

      return isWalkablePosition(
        position.x,
        position.y
      );

    });

}


function getAllWalkablePositions() {

  const positions = [];


  for (
    let y = 0;
    y < currentLevel.height;
    y += 1
  ) {

    for (
      let x = 0;
      x < currentLevel.width;
      x += 1
    ) {

      if (
        isWalkablePosition(x, y)
      ) {

        positions.push({
          x,
          y
        });

      }

    }

  }


  return positions;

}


/* =========================================================
   12. TRAIL MANAGEMENT
========================================================= */

function addTrailPosition(
  x,
  y
) {

  const key =
    positionKey(x, y);


  if (
    trailLookup.has(key)
  ) {
    return;
  }


  trail.push({
    x,
    y
  });


  trailLookup.add(key);

}


function isTrailPosition(
  x,
  y
) {

  return trailLookup.has(
    positionKey(x, y)
  );

}


function canPlayerEnterPosition(
  x,
  y
) {

  if (
    !isWalkablePosition(x, y)
  ) {
    return false;
  }


  const returningToExit =
    targetCollected &&
    isExitPosition(x, y);


  if (
    isTrailPosition(x, y) &&
    !returningToExit
  ) {

    return false;

  }


  return true;

}


function getAvailablePlayerDirections() {

  return VALID_DIRECTIONS.filter(
    (direction) => {

      return canPlayerEnterPosition(
        player.x + direction.x,
        player.y + direction.y
      );

    }
  );

}


/* =========================================================
   13. GUARD GENERATION
========================================================= */

function generateMissionGuards() {

  guards = [];


  const desiredGuardCount =
    getDesiredGuardCount();


  for (
    let index = 0;
    index < desiredGuardCount;
    index += 1
  ) {

    const guard =
      createGuard(index);


    if (guard) {

      guards.push(
        guard
      );

    }

  }


  currentLevel.guards =
    guards.map((guard) => {

      return {

        id:
          guard.id,

        x:
          guard.x,

        y:
          guard.y,

        patrol:
          guard.patrol.map(
            (position) => ({
              ...position
            })
          )

      };

    });

}


function getDesiredGuardCount() {

  const securityRating =
    Number(
      currentLevel.securityRating
    ) || 1;


  if (securityRating >= 3) {
    return 2;
  }


  return 1;

}


function createGuard(index) {

  const candidatePositions =
    shuffleArray(
      getAllWalkablePositions()
    );


  for (
    let attempt = 0;
    attempt <
      Math.min(
        GUARD_PLACEMENT_ATTEMPTS,
        candidatePositions.length
      );
    attempt += 1
  ) {

    const startPosition =
      candidatePositions[attempt];


    if (
      !isValidGuardStart(
        startPosition
      )
    ) {
      continue;
    }


    const patrol =
      generateGuardPatrol(
        startPosition
      );


    if (
      patrol.length <
      GUARD_MINIMUM_PATROL_LENGTH
    ) {
      continue;
    }


    const secondGuardConflict =
      guards.some((guard) => {

        return manhattanDistance(
          startPosition,
          guard
        ) < 5;

      });


    if (secondGuardConflict) {
      continue;
    }


    const initialDirection =
      directionBetweenPositions(
        patrol[0],
        patrol[1]
      );


    return {

      id:
        `guard-${index + 1}`,

      x:
        patrol[0].x,

      y:
        patrol[0].y,

      previousX:
        patrol[0].x,

      previousY:
        patrol[0].y,

      patrol,

      patrolIndex:
        0,

      patrolDirection:
        1,

      facing:
        initialDirection?.name ||
        "right",

      pauseMovesRemaining:
        0,

      alerted:
        false

    };

  }


  return null;

}


function isValidGuardStart(position) {

  if (
    isExitPosition(
      position.x,
      position.y
    )
  ) {
    return false;
  }


  if (
    isTargetPosition(
      position.x,
      position.y
    )
  ) {
    return false;
  }


  if (
    manhattanDistance(
      position,
      currentLevel.exit
    ) <
    GUARD_MINIMUM_ENTRANCE_DISTANCE
  ) {
    return false;
  }


  if (
    manhattanDistance(
      position,
      currentLevel.target
    ) <
    GUARD_MINIMUM_TARGET_DISTANCE
  ) {
    return false;
  }


  return (
    getCardinalNeighbours(
      position
    ).length >= 2
  );

}


function generateGuardPatrol(
  startPosition
) {

  const maximumLength =
    GUARD_MAXIMUM_PATROL_LENGTH;


  const patrol = [
    {
      x:
        startPosition.x,

      y:
        startPosition.y
    }
  ];


  const visited =
    new Set([
      positionKey(
        startPosition.x,
        startPosition.y
      )
    ]);


  let current =
    startPosition;


  for (
    let step = 1;
    step < maximumLength;
    step += 1
  ) {

    const possibleNextPositions =
      shuffleArray(
        getCardinalNeighbours(
          current
        )
      )
        .filter((candidate) => {

          const key =
            positionKey(
              candidate.x,
              candidate.y
            );


          if (
            visited.has(key)
          ) {
            return false;
          }


          if (
            isExitPosition(
              candidate.x,
              candidate.y
            )
          ) {
            return false;
          }


          if (
            manhattanDistance(
              candidate,
              currentLevel.exit
            ) <
            GUARD_MINIMUM_ENTRANCE_DISTANCE - 1
          ) {
            return false;
          }


          return true;

        });


    if (
      possibleNextPositions.length === 0
    ) {
      break;
    }


    const next =
      possibleNextPositions[0];


    patrol.push({

      x:
        next.x,

      y:
        next.y

    });


    visited.add(
      positionKey(
        next.x,
        next.y
      )
    );


    current =
      next;

  }


  return patrol;

}


/* =========================================================
   14. GUARD MOVEMENT
========================================================= */

function moveGuards() {

  for (
    const guard
    of guards
  ) {

    if (
      missionFailed ||
      missionComplete
    ) {
      return;
    }


    moveSingleGuard(
      guard
    );


    if (
      guard.x === player.x &&
      guard.y === player.y
    ) {

      failMission(
        "A guard walked directly into you.",
        "caught"
      );

      return;

    }

  }


  checkGuardDetection();

}


function moveSingleGuard(guard) {

  if (
    guard.pauseMovesRemaining > 0
  ) {

    guard.pauseMovesRemaining -= 1;

    return;

  }


  const nextPatrolIndex =
    guard.patrolIndex +
    guard.patrolDirection;


  if (
    nextPatrolIndex < 0 ||
    nextPatrolIndex >=
      guard.patrol.length
  ) {

    guard.patrolDirection *= -1;

    guard.pauseMovesRemaining =
      GUARD_TURN_PAUSE_MOVES;


    const futureIndex =
      guard.patrolIndex +
      guard.patrolDirection;


    if (
      guard.patrol[futureIndex]
    ) {

      const direction =
        directionBetweenPositions(
          guard,
          guard.patrol[futureIndex]
        );


      if (direction) {

        guard.facing =
          direction.name;

      }

    }


    return;

  }


  const nextPosition =
    guard.patrol[
      nextPatrolIndex
    ];


  guard.previousX =
    guard.x;

  guard.previousY =
    guard.y;


  const direction =
    directionBetweenPositions(
      guard,
      nextPosition
    );


  if (direction) {

    guard.facing =
      direction.name;

  }


  guard.x =
    nextPosition.x;

  guard.y =
    nextPosition.y;


  guard.patrolIndex =
    nextPatrolIndex;

}


function directionBetweenPositions(
  first,
  second
) {

  const deltaX =
    second.x -
    first.x;


  const deltaY =
    second.y -
    first.y;


  return VALID_DIRECTIONS.find(
    (direction) => {

      return (
        direction.x === deltaX &&
        direction.y === deltaY
      );

    }
  ) || null;

}


/* =========================================================
   15. GUARD VISION
========================================================= */

function getGuardFacingDirection(
  guard
) {

  return VALID_DIRECTIONS.find(
    (direction) => {

      return (
        direction.name ===
        guard.facing
      );

    }
  ) || DIRECTION_RIGHT;

}


function getGuardVisibleTiles(guard) {

  const visibleTiles = [];

  const direction =
    getGuardFacingDirection(
      guard
    );


  for (
    let distance = 1;
    distance <=
      GUARD_VISION_DISTANCE;
    distance += 1
  ) {

    const x =
      guard.x +
      direction.x *
      distance;


    const y =
      guard.y +
      direction.y *
      distance;


    if (
      !isWalkablePosition(x, y)
    ) {
      break;
    }


    visibleTiles.push({
      x,
      y,
      distance
    });

  }


  return visibleTiles;

}


function canGuardSeePlayer(guard) {

  return getGuardVisibleTiles(
    guard
  ).some((position) => {

    return (
      position.x === player.x &&
      position.y === player.y
    );

  });

}


function checkGuardDetection() {

  for (
    const guard
    of guards
  ) {

    const guardTouchedPlayer =
      (
        guard.x === player.x &&
        guard.y === player.y
      );


    if (
      guardTouchedPlayer ||
      canGuardSeePlayer(guard)
    ) {

      guard.alerted =
        true;


      failMission(
        guardTouchedPlayer
          ? "You collided with a security guard."
          : "A security guard spotted you.",
        "caught"
      );


      return true;

    }

  }


  return false;

}


/* =========================================================
   16. MISSION INFORMATION
========================================================= */

function updateMissionInformation() {

  if (!currentLevel) {
    return;
  }


  if (missionNameElement) {

    missionNameElement.textContent =
      currentLevel.name;

  }


  if (tipTextElement) {

    const tips =
      currentLevel.tips || [];


    tipTextElement.textContent =
      tips.length > 0
        ? tips[
            Math.floor(
              Math.random() *
              tips.length
            )
          ]
        : "Every step matters.";

  }


  updateObjectives();

}


function updateObjectives() {

  if (
    missionObjectives.length < 2
  ) {
    return;
  }


  missionObjectives[0].classList.toggle(
    "is-complete",
    targetCollected
  );


  missionObjectives[1].classList.toggle(
    "is-complete",
    missionComplete
  );

}


/* =========================================================
   17. SCORE
========================================================= */

function calculateCurrentScore() {

  if (!currentLevel) {
    return 0;
  }


  let calculatedScore = 0;


  if (targetCollected) {

    calculatedScore +=
      currentLevel.targetValue;

  }


  currentLevel.bonusTreasures.forEach(
    (treasure) => {

      if (
        collectedBonusTreasureIds.has(
          treasure.id
        )
      ) {

        calculatedScore +=
          treasure.value;

      }

    }
  );


  calculatedScore -=
    moves * 12;


  return Math.max(
    0,
    calculatedScore
  );

}


function calculateFinalScore() {

  let finalScore =
    calculateCurrentScore();


  if (
    currentLevel.parMoves &&
    moves <= currentLevel.parMoves
  ) {

    const movesUnderPar =
      currentLevel.parMoves -
      moves;


    finalScore +=
      1000 +
      movesUnderPar * 60;

  }


  if (
    collectedBonusTreasureIds.size ===
    currentLevel.bonusTreasures.length
  ) {

    finalScore +=
      1500;

  }


  finalScore +=
    guards.length * 500;


  return Math.max(
    0,
    finalScore
  );

}


/* =========================================================
   18. INTERFACE
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

  if (!currentLevel) {
    return;
  }


  score =
    missionComplete
      ? score
      : calculateCurrentScore();


  const formattedScore =
    formatScore(score);


  const collectedTreasureCount =
    (
      targetCollected
        ? 1
        : 0
    ) +
    collectedBonusTreasureIds.size;


  const totalTreasureCount =
    1 +
    currentLevel.bonusTreasures.length;


  if (scoreElement) {

    scoreElement.textContent =
      formattedScore;

  }


  if (movesElement) {

    movesElement.textContent =
      String(moves);

  }


  if (treasureCountElement) {

    treasureCountElement.textContent =
      `${collectedTreasureCount} / ${totalTreasureCount}`;

  }


  if (mobileScoreElement) {

    mobileScoreElement.textContent =
      formattedScore;

  }


  if (mobileMovesElement) {

    mobileMovesElement.textContent =
      String(moves);

  }


  if (mobileTreasureElement) {

    mobileTreasureElement.textContent =
      `${collectedTreasureCount} / ${totalTreasureCount}`;

  }


  updateObjectives();

}


/* =========================================================
   19. MISSION BRIEFING OVERLAY
========================================================= */

function createMissionBriefingOverlay() {

  const overlay =
    document.createElement("div");


  overlay.id =
    "missionBriefingOverlay";


  overlay.className =
    "overlay hidden";


  overlay.innerHTML = `
    <div class="overlay-card">

      <h2 id="missionBriefingTitle">
        Mission Briefing
      </h2>

      <p id="missionBriefingText">
        Classified mission details.
      </p>

      <button
        id="missionBriefingStartButton"
        type="button"
      >
        Begin Mission
      </button>

    </div>
  `;


  gameArea.appendChild(
    overlay
  );


  overlay
    .querySelector(
      "#missionBriefingStartButton"
    )
    ?.addEventListener(
      "click",
      activateMission
    );


  return overlay;

}


function updateMissionBriefing() {

  if (
    !missionBriefingOverlay ||
    !currentLevel
  ) {
    return;
  }


  const title =
    missionBriefingOverlay.querySelector(
      "#missionBriefingTitle"
    );


  const text =
    missionBriefingOverlay.querySelector(
      "#missionBriefingText"
    );


  if (title) {

    title.textContent =
      currentLevel.name;

  }


  if (text) {

    const displayedSeed =
      currentLevel.seed ||
      "CLASSIFIED";


    text.textContent =
      `MISSION #${String(
        currentLevel.number
      ).padStart(5, "0")}

LOCATION
${currentLevel.location}

OBJECTIVE
Steal the ${currentLevel.targetName}

SECURITY
${guards.length} guard${guards.length === 1 ? "" : "s"}

DIFFICULTY
${currentLevel.difficulty}

MISSION SEED
${displayedSeed}`;

  }

}


/* =========================================================
   20. STARTING A MISSION
========================================================= */

function startMission() {

  loadLevel(
    currentLevelIndex
  );


  hideElement(
    startOverlay
  );


  hideElement(
    pauseOverlay
  );


  hideElement(
    gameOverOverlay
  );


  hideElement(
    missionCompleteOverlay
  );


  updateMissionBriefing();

  showElement(
    missionBriefingOverlay
  );

}


function activateMission() {

  missionStarted =
    true;

  missionPaused =
    false;

  missionFailed =
    false;

  missionComplete =
    false;


  document.body.classList.add(
    "game-running"
  );


  hideElement(
    missionBriefingOverlay
  );


  gameCanvas.focus();


  if (window.ThnakeAudio) {

    window.ThnakeAudio
      .missionStart();

  }


  showCanvasMessage(
    "MISSION START",
    guards.length === 1
      ? "Avoid the guard."
      : `Avoid ${guards.length} guards.`
  );


  vibrate([18]);


  window.setTimeout(() => {

    checkGuardDetection();

  }, 100);


  updateInterface();

  drawGame();

}


/* =========================================================
   21. PAUSE
========================================================= */

function pauseMission() {

  if (
    !missionStarted ||
    missionFailed ||
    missionComplete ||
    missionPaused
  ) {
    return;
  }


  clearPointerState();


  missionPaused =
    true;


  showElement(
    pauseOverlay
  );


  if (window.ThnakeAudio) {

    window.ThnakeAudio.pause();

  }

}


function resumeMission() {

  if (
    !missionStarted ||
    missionFailed ||
    missionComplete ||
    !missionPaused
  ) {
    return;
  }


  missionPaused =
    false;


  hideElement(
    pauseOverlay
  );


  gameCanvas.focus();


  if (window.ThnakeAudio) {

    window.ThnakeAudio.resume();

  }

}


function togglePause() {

  if (missionPaused) {

    resumeMission();

  } else {

    pauseMission();

  }

}


/* =========================================================
   22. PLAYER MOVEMENT
========================================================= */

function attemptMove(direction) {

  if (
    !missionStarted ||
    missionPaused ||
    missionFailed ||
    missionComplete
  ) {
    return false;
  }


  const nextX =
    player.x +
    direction.x;


  const nextY =
    player.y +
    direction.y;


  updatePlayerFacing(
    direction
  );


  if (
    !canPlayerEnterPosition(
      nextX,
      nextY
    )
  ) {

    handleBlockedMovement();

    return false;

  }


  player.previousX =
    player.x;

  player.previousY =
    player.y;


  player.x =
    nextX;

  player.y =
    nextY;


  moves += 1;


  const returnedToExit =
    targetCollected &&
    isExitPosition(
      player.x,
      player.y
    );


  if (!returnedToExit) {

    addTrailPosition(
      player.x,
      player.y
    );

  }


  if (window.ThnakeAudio) {

    window.ThnakeAudio
      .playerMove();

  }


  vibrate([7]);


  if (
    guardOccupiesPosition(
      player.x,
      player.y
    )
  ) {

    failMission(
      "You walked directly into a security guard.",
      "caught"
    );

    return false;

  }


  handleCurrentTile();


  if (
    missionFailed ||
    missionComplete
  ) {

    updateInterface();

    drawGame();

    return true;

  }


  moveGuards();


  if (
    !missionFailed &&
    !missionComplete
  ) {

    checkWhetherPlayerIsTrapped();

  }


  updateInterface();

  drawGame();


  return true;

}


function updatePlayerFacing(direction) {

  player.facing =
    direction.name;

}


function guardOccupiesPosition(
  x,
  y
) {

  return guards.some(
    (guard) => {

      return (
        guard.x === x &&
        guard.y === y
      );

    }
  );

}


function handleBlockedMovement() {

  if (window.ThnakeAudio) {

    window.ThnakeAudio.blocked();

  }


  vibrate([12]);


  gameCanvas.classList.remove(
    "blocked"
  );


  void gameCanvas.offsetWidth;


  gameCanvas.classList.add(
    "blocked"
  );


  window.setTimeout(() => {

    gameCanvas.classList.remove(
      "blocked"
    );

  }, 150);

}


/* =========================================================
   23. TILE INTERACTIONS
========================================================= */

function handleCurrentTile() {

  collectMainTargetIfPresent();

  collectBonusTreasureIfPresent();


  if (
    targetCollected &&
    isExitPosition(
      player.x,
      player.y
    )
  ) {

    completeMission();

  }

}


function collectMainTargetIfPresent() {

  if (
    targetCollected ||
    !positionsMatch(
      player,
      currentLevel.target
    )
  ) {
    return;
  }


  targetCollected =
    true;


  if (window.ThnakeAudio) {

    window.ThnakeAudio
      .targetCollected();

  }


  vibrate([
    28,
    30,
    45
  ]);


  showCanvasMessage(
    "TARGET ACQUIRED",
    "Return to the entrance!"
  );

}


function collectBonusTreasureIfPresent() {

  const treasure =
    currentLevel.bonusTreasures.find(
      (item) => {

        return (
          item.x === player.x &&
          item.y === player.y &&
          !collectedBonusTreasureIds.has(
            item.id
          )
        );

      }
    );


  if (!treasure) {
    return;
  }


  collectedBonusTreasureIds.add(
    treasure.id
  );


  if (window.ThnakeAudio) {

    window.ThnakeAudio
      .bonusTreasure();

  }


  vibrate([
    16,
    20,
    24
  ]);


  showCanvasMessage(
    treasure.name.toUpperCase(),
    `+${treasure.value.toLocaleString("en-GB")}`
  );

}


/* =========================================================
   24. TRAPPED CHECK
========================================================= */

function checkWhetherPlayerIsTrapped() {

  const availableDirections =
    getAvailablePlayerDirections();


  if (
    availableDirections.length > 0
  ) {
    return;
  }


  failMission(
    "You trapped yourself.",
    "trapped"
  );

}


/* =========================================================
   25. MISSION FAILURE
========================================================= */

function failMission(
  reason,
  failureType = "trapped"
) {

  if (
    missionFailed ||
    missionComplete
  ) {
    return;
  }


  clearPointerState();


  missionFailed =
    true;

  missionStarted =
    false;


  document.body.classList.remove(
    "game-running"
  );


  if (gameOverReasonElement) {

    gameOverReasonElement.textContent =
      reason;

  }


  showElement(
    gameOverOverlay
  );


  if (window.ThnakeAudio) {

    if (
      failureType === "caught"
    ) {

      window.ThnakeAudio.alarm();

      window.setTimeout(() => {

        window.ThnakeAudio
          .missionFailed(
            "caught"
          );

      }, 500);

    } else {

      window.ThnakeAudio
        .missionFailed(
          failureType
        );

    }

  }


  vibrate([
    60,
    50,
    100
  ]);


  drawGame();

}


/* =========================================================
   26. MISSION COMPLETION
========================================================= */

function completeMission() {

  if (
    missionComplete ||
    missionFailed
  ) {
    return;
  }


  clearPointerState();


  missionComplete =
    true;

  missionStarted =
    false;


  const previousBestScore =
    bestScore;


  score =
    calculateFinalScore();


  const achievedNewBest =
    score > previousBestScore;


  if (achievedNewBest) {

    bestScore =
      score;

    saveBestScore();

  }


  document.body.classList.remove(
    "game-running"
  );


  updateInterface();


  if (window.ThnakeAudio) {

    window.ThnakeAudio
      .missionComplete();

  }


  vibrate([
    35,
    25,
    35,
    25,
    80
  ]);


  updateMissionCompleteOverlay(
    achievedNewBest
  );


  showElement(
    missionCompleteOverlay
  );


  drawGame();

}


/* =========================================================
   27. MISSION COMPLETE OVERLAY
========================================================= */

function createMissionCompleteOverlay() {

  const overlay =
    document.createElement("div");


  overlay.id =
    "missionCompleteOverlay";


  overlay.className =
    "overlay hidden";


  overlay.innerHTML = `
    <div class="overlay-card">

      <h2>Mission Complete</h2>

      <p id="missionCompleteSummary">
        The rubber duck has been recovered.
      </p>

      <button
        id="missionCompleteRestartButton"
        type="button"
      >
        New Mission
      </button>

    </div>
  `;


  gameArea.appendChild(
    overlay
  );


  overlay
    .querySelector(
      "#missionCompleteRestartButton"
    )
    ?.addEventListener(
      "click",
      startMission
    );


  return overlay;

}


function updateMissionCompleteOverlay(
  achievedNewBest
) {

  if (!missionCompleteOverlay) {
    return;
  }


  const summary =
    missionCompleteOverlay.querySelector(
      "#missionCompleteSummary"
    );


  if (!summary) {
    return;
  }


  const allBonusTreasureCollected =
    collectedBonusTreasureIds.size ===
    currentLevel.bonusTreasures.length;


  const parResult =
    moves <= currentLevel.parMoves
      ? `Under par by ${currentLevel.parMoves - moves} moves.`
      : `${moves - currentLevel.parMoves} moves over par.`;


  const treasureResult =
    allBonusTreasureCollected
      ? "All optional treasure stolen."
      : `${collectedBonusTreasureIds.size} of ${currentLevel.bonusTreasures.length} optional treasures stolen.`;


  const bestMessage =
    achievedNewBest
      ? "\nNEW BEST SCORE!"
      : `\nBest score: ${formatScore(bestScore)}`;


  summary.textContent =
    `The ${currentLevel.targetName.toLowerCase()} has been recovered.

Score: ${formatScore(score)}
Moves: ${moves}
Guards avoided: ${guards.length}
${parResult}
${treasureResult}${bestMessage}

Mission seed:
${currentLevel.seed}`;

}


/* =========================================================
   28. TEMPORARY CANVAS MESSAGE
========================================================= */

function showCanvasMessage(
  title,
  subtitle = ""
) {

  canvasMessage.title =
    title;

  canvasMessage.subtitle =
    subtitle;

  canvasMessage.visibleUntil =
    performance.now() +
    1500;

}


/* =========================================================
   29. DRAWING MAIN FRAME
========================================================= */

function drawGame(
  timestamp = performance.now()
) {

  if (!currentLevel) {
    return;
  }


  const tileWidth =
    gameCanvas.width /
    currentLevel.width;


  const tileHeight =
    gameCanvas.height /
    currentLevel.height;


  gameContext.clearRect(
    0,
    0,
    gameCanvas.width,
    gameCanvas.height
  );


  drawFloor(
    tileWidth,
    tileHeight
  );


  drawExit(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawMapObjects(
    tileWidth,
    tileHeight
  );


  drawGuardVision(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawTrail(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawTreasures(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawGuards(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawPlayer(
    tileWidth,
    tileHeight,
    timestamp
  );


  drawCanvasMessage(
    timestamp
  );

}


/* =========================================================
   30. DRAWING FLOOR
========================================================= */

function drawFloor(
  tileWidth,
  tileHeight
) {

  const floorGradient =
    gameContext.createLinearGradient(
      0,
      0,
      gameCanvas.width,
      gameCanvas.height
    );


  floorGradient.addColorStop(
    0,
    COLOURS.floorLight
  );


  floorGradient.addColorStop(
    1,
    COLOURS.floorDark
  );


  gameContext.fillStyle =
    floorGradient;


  gameContext.fillRect(
    0,
    0,
    gameCanvas.width,
    gameCanvas.height
  );


  gameContext.save();


  gameContext.strokeStyle =
    COLOURS.floorGrid;


  gameContext.lineWidth =
    1;


  for (
    let x = 0;
    x <= currentLevel.width;
    x += 1
  ) {

    gameContext.beginPath();


    gameContext.moveTo(
      x * tileWidth,
      0
    );


    gameContext.lineTo(
      x * tileWidth,
      gameCanvas.height
    );


    gameContext.stroke();

  }


  for (
    let y = 0;
    y <= currentLevel.height;
    y += 1
  ) {

    gameContext.beginPath();


    gameContext.moveTo(
      0,
      y * tileHeight
    );


    gameContext.lineTo(
      gameCanvas.width,
      y * tileHeight
    );


    gameContext.stroke();

  }


  gameContext.restore();

}


/* =========================================================
   31. DRAWING MAP OBJECTS
========================================================= */

function drawMapObjects(
  tileWidth,
  tileHeight
) {

  currentLevel.map.forEach(
    (row, y) => {

      row.forEach(
        (tile, x) => {

          if (
            tile === TILE_WALL
          ) {

            drawWallTile(
              x,
              y,
              tileWidth,
              tileHeight
            );

          } else if (
            tile === TILE_OBSTACLE
          ) {

            drawObstacleTile(
              x,
              y,
              tileWidth,
              tileHeight
            );

          }

        }
      );

    }
  );

}


function drawWallTile(
  gridX,
  gridY,
  tileWidth,
  tileHeight
) {

  const x =
    gridX *
    tileWidth;


  const y =
    gridY *
    tileHeight;


  const inset =
    Math.max(
      2,
      tileWidth * 0.055
    );


  const width =
    tileWidth -
    inset * 2;


  const height =
    tileHeight -
    inset * 2;


  const gradient =
    gameContext.createLinearGradient(
      x,
      y,
      x + tileWidth,
      y + tileHeight
    );


  gradient.addColorStop(
    0,
    COLOURS.wallLight
  );


  gradient.addColorStop(
    0.45,
    COLOURS.wallMain
  );


  gradient.addColorStop(
    1,
    COLOURS.wallDark
  );


  gameContext.save();


  gameContext.shadowColor =
    "rgba(0, 0, 0, 0.65)";


  gameContext.shadowBlur =
    tileWidth * 0.15;


  gameContext.shadowOffsetY =
    tileHeight * 0.08;


  createRoundedRectangle(
    x + inset,
    y + inset,
    width,
    height,
    tileWidth * 0.13
  );


  gameContext.fillStyle =
    gradient;


  gameContext.fill();


  gameContext.shadowBlur =
    0;


  gameContext.strokeStyle =
    COLOURS.wallEdge;


  gameContext.lineWidth =
    Math.max(
      1,
      tileWidth * 0.025
    );


  gameContext.stroke();


  gameContext.fillStyle =
    "rgba(255,255,255,0.06)";


  gameContext.fillRect(
    x + inset * 1.7,
    y + inset * 1.7,
    width - inset * 1.4,
    Math.max(
      2,
      tileHeight * 0.045
    )
  );


  gameContext.restore();

}


function drawObstacleTile(
  gridX,
  gridY,
  tileWidth,
  tileHeight
) {

  const centreX =
    gridX *
    tileWidth +
    tileWidth / 2;


  const centreY =
    gridY *
    tileHeight +
    tileHeight / 2;


  gameContext.save();


  gameContext.fillStyle =
    "#78513a";


  gameContext.fillRect(
    centreX -
    tileWidth * 0.28,
    centreY -
    tileHeight * 0.28,
    tileWidth * 0.56,
    tileHeight * 0.56
  );


  gameContext.restore();

}


/* =========================================================
   32. DRAWING EXIT
========================================================= */

function drawExit(
  tileWidth,
  tileHeight,
  timestamp
) {

  const x =
    currentLevel.exit.x *
    tileWidth;


  const y =
    currentLevel.exit.y *
    tileHeight;


  const centreX =
    x +
    tileWidth / 2;


  const centreY =
    y +
    tileHeight / 2;


  const active =
    targetCollected;


  const pulse =
    0.5 +
    Math.sin(
      timestamp * 0.006
    ) * 0.5;


  gameContext.save();


  gameContext.shadowColor =
    active
      ? COLOURS.exitActive
      : COLOURS.exitInactive;


  gameContext.shadowBlur =
    active
      ? 16 + pulse * 12
      : 5;


  gameContext.strokeStyle =
    active
      ? COLOURS.exitActive
      : COLOURS.exitInactive;


  gameContext.lineWidth =
    Math.max(
      3,
      tileWidth * 0.08
    );


  gameContext.strokeRect(
    x +
    tileWidth * 0.15,
    y +
    tileHeight * 0.15,
    tileWidth * 0.7,
    tileHeight * 0.7
  );


  gameContext.shadowBlur =
    0;


  gameContext.fillStyle =
    active
      ? COLOURS.playerLight
      : COLOURS.exitInactive;


  gameContext.font =
    `${tileWidth * 0.34}px "Segoe UI Emoji", sans-serif`;


  gameContext.textAlign =
    "center";


  gameContext.textBaseline =
    "middle";


  gameContext.fillText(
    active
      ? "🚪"
      : "🔒",
    centreX,
    centreY
  );


  gameContext.restore();

}


/* =========================================================
   33. DRAWING GUARD VISION
========================================================= */

function drawGuardVision(
  tileWidth,
  tileHeight,
  timestamp
) {

  const pulse =
    0.82 +
    Math.sin(
      timestamp * 0.007
    ) * 0.08;


  guards.forEach((guard) => {

    const visibleTiles =
      getGuardVisibleTiles(
        guard
      );


    visibleTiles.forEach(
      (position, index) => {

        const x =
          position.x *
          tileWidth;


        const y =
          position.y *
          tileHeight;


        const distanceAlpha =
          1 -
          index /
          Math.max(
            visibleTiles.length + 1,
            1
          );


        gameContext.save();


        gameContext.globalAlpha =
          pulse *
          distanceAlpha;


        const gradient =
          gameContext.createRadialGradient(
            x + tileWidth / 2,
            y + tileHeight / 2,
            0,
            x + tileWidth / 2,
            y + tileHeight / 2,
            tileWidth * 0.75
          );


        gradient.addColorStop(
          0,
          COLOURS.guardVision
        );


        gradient.addColorStop(
          1,
          "rgba(255,83,104,0)"
        );


        gameContext.fillStyle =
          gradient;


        gameContext.fillRect(
          x,
          y,
          tileWidth,
          tileHeight
        );


        gameContext.strokeStyle =
          COLOURS.guardVisionEdge;


        gameContext.lineWidth =
          Math.max(
            1,
            tileWidth * 0.025
          );


        gameContext.strokeRect(
          x + 2,
          y + 2,
          tileWidth - 4,
          tileHeight - 4
        );


        gameContext.restore();

      }
    );

  });

}


/* =========================================================
   34. DRAWING TRAIL
========================================================= */

function drawTrail(
  tileWidth,
  tileHeight,
  timestamp
) {

  const pulse =
    0.65 +
    Math.sin(
      timestamp * 0.007
    ) * 0.15;


  trail.forEach(
    (position, index) => {

      const centreX =
        position.x *
        tileWidth +
        tileWidth / 2;


      const centreY =
        position.y *
        tileHeight +
        tileHeight / 2;


      const size =
        tileWidth *
        0.35;


      gameContext.save();


      gameContext.globalAlpha =
        clamp(
          pulse -
          index /
            Math.max(
              trail.length,
              1
            ) *
            0.18,
          0.35,
          0.9
        );


      gameContext.shadowColor =
        COLOURS.trailMain;


      gameContext.shadowBlur =
        tileWidth * 0.32;


      const gradient =
        gameContext.createRadialGradient(
          centreX,
          centreY,
          0,
          centreX,
          centreY,
          size
        );


      gradient.addColorStop(
        0,
        COLOURS.trailLight
      );


      gradient.addColorStop(
        0.42,
        COLOURS.trailMain
      );


      gradient.addColorStop(
        1,
        "rgba(22,132,72,0)"
      );


      gameContext.fillStyle =
        gradient;


      gameContext.beginPath();


      gameContext.arc(
        centreX,
        centreY,
        size,
        0,
        Math.PI * 2
      );


      gameContext.fill();


      gameContext.restore();

    }
  );


  if (
    trail.length < 2
  ) {
    return;
  }


  gameContext.save();


  gameContext.strokeStyle =
    "rgba(77,255,145,0.52)";


  gameContext.lineWidth =
    tileWidth * 0.12;


  gameContext.lineCap =
    "round";


  gameContext.lineJoin =
    "round";


  gameContext.shadowColor =
    COLOURS.trailMain;


  gameContext.shadowBlur =
    tileWidth * 0.22;


  gameContext.beginPath();


  trail.forEach(
    (position, index) => {

      const centreX =
        position.x *
        tileWidth +
        tileWidth / 2;


      const centreY =
        position.y *
        tileHeight +
        tileHeight / 2;


      if (
        index === 0
      ) {

        gameContext.moveTo(
          centreX,
          centreY
        );

      } else {

        gameContext.lineTo(
          centreX,
          centreY
        );

      }

    }
  );


  gameContext.stroke();

  gameContext.restore();

}


/* =========================================================
   35. DRAWING TREASURES
========================================================= */

function drawTreasures(
  tileWidth,
  tileHeight,
  timestamp
) {

  if (!targetCollected) {

    drawTreasureIcon(
      currentLevel.target.x,
      currentLevel.target.y,
      currentLevel.targetIcon,
      tileWidth,
      tileHeight,
      timestamp,
      true
    );

  }


  currentLevel.bonusTreasures.forEach(
    (treasure) => {

      if (
        collectedBonusTreasureIds.has(
          treasure.id
        )
      ) {
        return;
      }


      drawTreasureIcon(
        treasure.x,
        treasure.y,
        treasure.icon,
        tileWidth,
        tileHeight,
        timestamp,
        false
      );

    }
  );

}


function drawTreasureIcon(
  gridX,
  gridY,
  icon,
  tileWidth,
  tileHeight,
  timestamp,
  isMainTarget
) {

  const centreX =
    gridX *
    tileWidth +
    tileWidth / 2;


  const centreY =
    gridY *
    tileHeight +
    tileHeight / 2;


  const bob =
    Math.sin(
      timestamp * 0.004 +
      gridX +
      gridY
    ) *
    tileHeight *
    0.06;


  gameContext.save();


  gameContext.shadowColor =
    isMainTarget
      ? COLOURS.gold
      : COLOURS.blue;


  gameContext.shadowBlur =
    isMainTarget
      ? 20
      : 13;


  gameContext.fillStyle =
    isMainTarget
      ? COLOURS.goldLight
      : "#ffffff";


  gameContext.font =
    `${tileWidth * 0.58}px "Segoe UI Emoji", sans-serif`;


  gameContext.textAlign =
    "center";


  gameContext.textBaseline =
    "middle";


  gameContext.fillText(
    icon,
    centreX,
    centreY + bob
  );


  gameContext.restore();

}


/* =========================================================
   36. DRAWING GUARDS
========================================================= */

function drawGuards(
  tileWidth,
  tileHeight,
  timestamp
) {

  guards.forEach((guard) => {

    drawGuard(
      guard,
      tileWidth,
      tileHeight,
      timestamp
    );

  });

}


function drawGuard(
  guard,
  tileWidth,
  tileHeight,
  timestamp
) {

  const centreX =
    guard.x *
    tileWidth +
    tileWidth / 2;


  const centreY =
    guard.y *
    tileHeight +
    tileHeight / 2;


  const breathing =
    1 +
    Math.sin(
      timestamp * 0.006 +
      guard.patrolIndex
    ) *
    0.025;


  const radius =
    tileWidth *
    0.31 *
    breathing;


  gameContext.save();


  gameContext.shadowColor =
    guard.alerted
      ? "#ff152f"
      : COLOURS.guardMain;


  gameContext.shadowBlur =
    guard.alerted
      ? tileWidth * 0.7
      : tileWidth * 0.38;


  const bodyGradient =
    gameContext.createRadialGradient(
      centreX -
      radius * 0.28,
      centreY -
      radius * 0.35,
      radius * 0.08,
      centreX,
      centreY,
      radius
    );


  bodyGradient.addColorStop(
    0,
    COLOURS.guardLight
  );


  bodyGradient.addColorStop(
    0.38,
    COLOURS.guardMain
  );


  bodyGradient.addColorStop(
    1,
    COLOURS.guardDark
  );


  gameContext.fillStyle =
    bodyGradient;


  gameContext.beginPath();


  gameContext.arc(
    centreX,
    centreY,
    radius,
    0,
    Math.PI * 2
  );


  gameContext.fill();


  gameContext.shadowBlur =
    0;


  gameContext.strokeStyle =
    "rgba(255,255,255,0.36)";


  gameContext.lineWidth =
    Math.max(
      1.5,
      tileWidth * 0.035
    );


  gameContext.stroke();


  drawGuardHat(
    centreX,
    centreY,
    radius
  );


  drawGuardFace(
    guard,
    centreX,
    centreY,
    radius
  );


  gameContext.restore();

}


function drawGuardHat(
  centreX,
  centreY,
  radius
) {

  gameContext.fillStyle =
    "#171b1a";


  createRoundedRectangle(
    centreX -
    radius * 0.68,
    centreY -
    radius * 0.83,
    radius * 1.36,
    radius * 0.43,
    radius * 0.16
  );


  gameContext.fill();


  gameContext.fillRect(
    centreX -
    radius * 0.86,
    centreY -
    radius * 0.47,
    radius * 1.72,
    radius * 0.16
  );


  gameContext.fillStyle =
    COLOURS.gold;


  gameContext.beginPath();


  gameContext.arc(
    centreX,
    centreY -
    radius * 0.62,
    radius * 0.1,
    0,
    Math.PI * 2
  );


  gameContext.fill();

}


function drawGuardFace(
  guard,
  centreX,
  centreY,
  radius
) {

  const facingOffset =
    getFacingOffsetForDirection(
      guard.facing,
      radius * 0.18
    );


  const eyeY =
    centreY -
    radius * 0.08 +
    facingOffset.y;


  const leftEyeX =
    centreX -
    radius * 0.23 +
    facingOffset.x;


  const rightEyeX =
    centreX +
    radius * 0.23 +
    facingOffset.x;


  const eyeRadius =
    radius * 0.11;


  gameContext.fillStyle =
    "#ffffff";


  gameContext.beginPath();


  gameContext.arc(
    leftEyeX,
    eyeY,
    eyeRadius,
    0,
    Math.PI * 2
  );


  gameContext.arc(
    rightEyeX,
    eyeY,
    eyeRadius,
    0,
    Math.PI * 2
  );


  gameContext.fill();


  const pupilOffset =
    getFacingOffsetForDirection(
      guard.facing,
      eyeRadius * 0.55
    );


  gameContext.fillStyle =
    "#140306";


  gameContext.beginPath();


  gameContext.arc(
    leftEyeX +
    pupilOffset.x,
    eyeY +
    pupilOffset.y,
    eyeRadius * 0.46,
    0,
    Math.PI * 2
  );


  gameContext.arc(
    rightEyeX +
    pupilOffset.x,
    eyeY +
    pupilOffset.y,
    eyeRadius * 0.46,
    0,
    Math.PI * 2
  );


  gameContext.fill();

}


/* =========================================================
   37. DRAWING PLAYER
========================================================= */

function drawPlayer(
  tileWidth,
  tileHeight,
  timestamp
) {

  const centreX =
    player.x *
    tileWidth +
    tileWidth / 2;


  const centreY =
    player.y *
    tileHeight +
    tileHeight / 2;


  const breathing =
    1 +
    Math.sin(
      timestamp * 0.006
    ) *
    0.025;


  const radius =
    tileWidth *
    0.31 *
    breathing;


  gameContext.save();


  gameContext.shadowColor =
    COLOURS.playerMain;


  gameContext.shadowBlur =
    tileWidth * 0.42;


  const bodyGradient =
    gameContext.createRadialGradient(
      centreX -
      radius * 0.3,
      centreY -
      radius * 0.35,
      radius * 0.12,
      centreX,
      centreY,
      radius
    );


  bodyGradient.addColorStop(
    0,
    COLOURS.playerLight
  );


  bodyGradient.addColorStop(
    0.38,
    COLOURS.playerMain
  );


  bodyGradient.addColorStop(
    1,
    COLOURS.playerDark
  );


  gameContext.fillStyle =
    bodyGradient;


  gameContext.beginPath();


  gameContext.arc(
    centreX,
    centreY,
    radius,
    0,
    Math.PI * 2
  );


  gameContext.fill();


  gameContext.shadowBlur =
    0;


  gameContext.strokeStyle =
    "rgba(255,255,255,0.34)";


  gameContext.lineWidth =
    Math.max(
      1.5,
      tileWidth * 0.035
    );


  gameContext.stroke();


  drawPlayerFace(
    centreX,
    centreY,
    radius
  );


  gameContext.restore();

}


function drawPlayerFace(
  centreX,
  centreY,
  radius
) {

  const facingOffset =
    getFacingOffsetForDirection(
      player.facing,
      radius * 0.18
    );


  const eyeY =
    centreY -
    radius * 0.16 +
    facingOffset.y;


  const firstEyeX =
    centreX -
    radius * 0.28 +
    facingOffset.x;


  const secondEyeX =
    centreX +
    radius * 0.28 +
    facingOffset.x;


  const eyeRadius =
    radius * 0.16;


  gameContext.fillStyle =
    "#ffffff";


  gameContext.beginPath();


  gameContext.arc(
    firstEyeX,
    eyeY,
    eyeRadius,
    0,
    Math.PI * 2
  );


  gameContext.arc(
    secondEyeX,
    eyeY,
    eyeRadius,
    0,
    Math.PI * 2
  );


  gameContext.fill();


  const pupilOffset =
    getFacingOffsetForDirection(
      player.facing,
      eyeRadius * 0.65
    );


  gameContext.fillStyle =
    "#06120b";


  gameContext.beginPath();


  gameContext.arc(
    firstEyeX +
    pupilOffset.x,
    eyeY +
    pupilOffset.y,
    eyeRadius * 0.46,
    0,
    Math.PI * 2
  );


  gameContext.arc(
    secondEyeX +
    pupilOffset.x,
    eyeY +
    pupilOffset.y,
    eyeRadius * 0.46,
    0,
    Math.PI * 2
  );


  gameContext.fill();


  gameContext.strokeStyle =
    "#062113";


  gameContext.lineWidth =
    radius * 0.09;


  gameContext.lineCap =
    "round";


  gameContext.beginPath();


  gameContext.arc(
    centreX +
    facingOffset.x * 0.4,
    centreY +
    radius * 0.2 +
    facingOffset.y * 0.3,
    radius * 0.2,
    0.1,
    Math.PI - 0.1
  );


  gameContext.stroke();

}


function getFacingOffsetForDirection(
  direction,
  amount
) {

  if (
    direction === "left"
  ) {

    return {
      x: -amount,
      y: 0
    };

  }


  if (
    direction === "right"
  ) {

    return {
      x: amount,
      y: 0
    };

  }


  if (
    direction === "up"
  ) {

    return {
      x: 0,
      y: -amount
    };

  }


  return {
    x: 0,
    y: amount
  };

}


/* =========================================================
   38. DRAWING CANVAS MESSAGE
========================================================= */

function drawCanvasMessage(timestamp) {

  if (
    timestamp >
    canvasMessage.visibleUntil
  ) {
    return;
  }


  const remaining =
    canvasMessage.visibleUntil -
    timestamp;


  const alpha =
    clamp(
      remaining / 350,
      0,
      1
    );


  gameContext.save();


  gameContext.globalAlpha =
    alpha;


  const panelWidth =
    gameCanvas.width * 0.64;


  const panelHeight =
    gameCanvas.height * 0.14;


  const panelX =
    (
      gameCanvas.width -
      panelWidth
    ) / 2;


  const panelY =
    gameCanvas.height * 0.41;


  createRoundedRectangle(
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    22
  );


  gameContext.fillStyle =
    "rgba(3, 10, 6, 0.92)";


  gameContext.fill();


  gameContext.strokeStyle =
    "rgba(77, 255, 145, 0.5)";


  gameContext.lineWidth =
    2;


  gameContext.stroke();


  gameContext.textAlign =
    "center";


  gameContext.textBaseline =
    "middle";


  gameContext.fillStyle =
    COLOURS.playerLight;


  gameContext.font =
    '900 26px "Segoe UI", sans-serif';


  gameContext.fillText(
    canvasMessage.title,
    gameCanvas.width / 2,
    panelY +
    panelHeight * 0.4
  );


  gameContext.fillStyle =
    COLOURS.gold;


  gameContext.font =
    '800 16px "Segoe UI", sans-serif';


  gameContext.fillText(
    canvasMessage.subtitle,
    gameCanvas.width / 2,
    panelY +
    panelHeight * 0.68
  );


  gameContext.restore();

}


/* =========================================================
   39. ROUNDED RECTANGLE HELPER
========================================================= */

function createRoundedRectangle(
  x,
  y,
  width,
  height,
  radius
) {

  gameContext.beginPath();


  if (
    typeof gameContext.roundRect ===
    "function"
  ) {

    gameContext.roundRect(
      x,
      y,
      width,
      height,
      radius
    );

    return;

  }


  const safeRadius =
    Math.min(
      radius,
      width / 2,
      height / 2
    );


  gameContext.moveTo(
    x + safeRadius,
    y
  );


  gameContext.lineTo(
    x + width - safeRadius,
    y
  );


  gameContext.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + safeRadius
  );


  gameContext.lineTo(
    x + width,
    y + height - safeRadius
  );


  gameContext.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );


  gameContext.lineTo(
    x + safeRadius,
    y + height
  );


  gameContext.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - safeRadius
  );


  gameContext.lineTo(
    x,
    y + safeRadius
  );


  gameContext.quadraticCurveTo(
    x,
    y,
    x + safeRadius,
    y
  );


  gameContext.closePath();

}


/* =========================================================
   40. KEYBOARD CONTROLS
========================================================= */

function handleKeyDown(event) {

  const key =
    event.key;


  const controlledKeys = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "W",
    "a",
    "A",
    "s",
    "S",
    "d",
    "D",
    "p",
    "P",
    "r",
    "R",
    "Escape"
  ];


  if (
    controlledKeys.includes(key)
  ) {

    event.preventDefault();

  }


  if (
    key === "p" ||
    key === "P" ||
    key === "Escape"
  ) {

    togglePause();

    return;

  }


  if (
    key === "r" ||
    key === "R"
  ) {

    startMission();

    return;

  }


  if (
    key === "ArrowUp" ||
    key === "w" ||
    key === "W"
  ) {

    attemptMove(
      DIRECTION_UP
    );

  } else if (
    key === "ArrowDown" ||
    key === "s" ||
    key === "S"
  ) {

    attemptMove(
      DIRECTION_DOWN
    );

  } else if (
    key === "ArrowLeft" ||
    key === "a" ||
    key === "A"
  ) {

    attemptMove(
      DIRECTION_LEFT
    );

  } else if (
    key === "ArrowRight" ||
    key === "d" ||
    key === "D"
  ) {

    attemptMove(
      DIRECTION_RIGHT
    );

  }

}


/* =========================================================
   41. SWIPE CONTROLS
========================================================= */

function clearLongPressTimer() {

  if (
    pointerState.longPressTimer
  ) {

    window.clearTimeout(
      pointerState.longPressTimer
    );

  }


  pointerState.longPressTimer =
    null;

}


function clearPointerState() {

  clearLongPressTimer();


  pointerState.active =
    false;

  pointerState.pointerId =
    null;

  pointerState.startX =
    0;

  pointerState.startY =
    0;

  pointerState.currentX =
    0;

  pointerState.currentY =
    0;

  pointerState.startTime =
    0;

  pointerState.moved =
    false;

  pointerState.longPressTriggered =
    false;

}


function handlePointerDown(event) {

  if (
    !missionStarted ||
    missionFailed ||
    missionComplete
  ) {
    return;
  }


  event.preventDefault();


  clearPointerState();


  pointerState.active =
    true;

  pointerState.pointerId =
    event.pointerId;

  pointerState.startX =
    event.clientX;

  pointerState.startY =
    event.clientY;

  pointerState.currentX =
    event.clientX;

  pointerState.currentY =
    event.clientY;

  pointerState.startTime =
    performance.now();


  try {

    gameCanvas.setPointerCapture(
      event.pointerId
    );

  } catch (error) {

    console.debug(
      "Thnake pointer capture was unavailable.",
      error
    );

  }


  pointerState.longPressTimer =
    window.setTimeout(() => {

      if (
        !pointerState.active ||
        pointerState.moved
      ) {
        return;
      }


      pointerState.longPressTriggered =
        true;


      togglePause();


      vibrate([18]);

    }, LONG_PRESS_DELAY);

}


function handlePointerMove(event) {

  if (
    !pointerState.active ||
    pointerState.pointerId !==
      event.pointerId
  ) {
    return;
  }


  event.preventDefault();


  pointerState.currentX =
    event.clientX;

  pointerState.currentY =
    event.clientY;


  const deltaX =
    pointerState.currentX -
    pointerState.startX;


  const deltaY =
    pointerState.currentY -
    pointerState.startY;


  if (
    Math.hypot(
      deltaX,
      deltaY
    ) > 12
  ) {

    pointerState.moved =
      true;


    clearLongPressTimer();

  }

}


function handlePointerUp(event) {

  if (
    !pointerState.active ||
    pointerState.pointerId !==
      event.pointerId
  ) {
    return;
  }


  event.preventDefault();


  pointerState.currentX =
    event.clientX;

  pointerState.currentY =
    event.clientY;


  const deltaX =
    pointerState.currentX -
    pointerState.startX;


  const deltaY =
    pointerState.currentY -
    pointerState.startY;


  const absoluteX =
    Math.abs(deltaX);


  const absoluteY =
    Math.abs(deltaY);


  const longPressTriggered =
    pointerState.longPressTriggered;


  clearPointerState();


  if (
    longPressTriggered ||
    missionPaused
  ) {
    return;
  }


  if (
    absoluteX < SWIPE_THRESHOLD &&
    absoluteY < SWIPE_THRESHOLD
  ) {

    return;

  }


  if (
    absoluteX > absoluteY
  ) {

    attemptMove(
      deltaX > 0
        ? DIRECTION_RIGHT
        : DIRECTION_LEFT
    );

  } else {

    attemptMove(
      deltaY > 0
        ? DIRECTION_DOWN
        : DIRECTION_UP
    );

  }

}


/* =========================================================
   42. EVENT LISTENERS
========================================================= */

function initialiseEvents() {

  startGameButton?.addEventListener(
    "click",
    startMission
  );


  resumeButton?.addEventListener(
    "click",
    resumeMission
  );


  restartButton?.addEventListener(
    "click",
    startMission
  );


  document.addEventListener(
    "keydown",
    handleKeyDown
  );


  gameCanvas.addEventListener(
    "pointerdown",
    handlePointerDown,
    {
      passive: false
    }
  );


  gameCanvas.addEventListener(
    "pointermove",
    handlePointerMove,
    {
      passive: false
    }
  );


  gameCanvas.addEventListener(
    "pointerup",
    handlePointerUp,
    {
      passive: false
    }
  );


  gameCanvas.addEventListener(
    "pointercancel",
    clearPointerState
  );


  gameCanvas.addEventListener(
    "lostpointercapture",
    clearPointerState
  );


  gameCanvas.addEventListener(
    "contextmenu",
    (event) => {

      event.preventDefault();

    }
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden &&
        missionStarted &&
        !missionPaused &&
        !missionFailed &&
        !missionComplete
      ) {

        pauseMission();

      }

    }
  );


  window.addEventListener(
    "resize",
    drawGame
  );

}


/* =========================================================
   43. ANIMATION LOOP
========================================================= */

function animationLoop(timestamp) {

  const deltaTime =
    Math.min(
      timestamp -
      lastFrameTime,
      100
    );


  lastFrameTime =
    timestamp;


  animationTime +=
    deltaTime;


  drawGame(timestamp);


  window.requestAnimationFrame(
    animationLoop
  );

}


/* =========================================================
   44. INITIALISATION
========================================================= */

function initialiseThnake() {

  missionCompleteOverlay =
    createMissionCompleteOverlay();


  missionBriefingOverlay =
    createMissionBriefingOverlay();


  loadLevel(
    CURRENT_LEVEL_INDEX
  );


  initialiseEvents();


  showElement(
    startOverlay
  );


  hideElement(
    pauseOverlay
  );


  hideElement(
    gameOverOverlay
  );


  hideElement(
    missionCompleteOverlay
  );


  hideElement(
    missionBriefingOverlay
  );


  window.requestAnimationFrame(
    animationLoop
  );

}


initialiseThnake();
