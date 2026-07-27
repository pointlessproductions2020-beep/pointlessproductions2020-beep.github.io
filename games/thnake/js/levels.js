"use strict";


/* =========================================================
   THNAKE LEVEL DATA
   Pointless Arcade

   This file contains only level layouts and mission data.
   The main game engine will read these objects from
   window.THNAKE_LEVELS.
========================================================= */


/* =========================================================
   TILE LEGEND

   0 = Floor
   1 = Wall
   2 = Exit / starting tile
   3 = Main target
   4 = Bonus treasure
   5 = Locked door
   6 = Pressure plate
   7 = Laser emitter
   8 = Decorative obstacle
========================================================= */


/* =========================================================
   LEVEL ONE
   THE RUBBER DUCK JOB
========================================================= */

const rubberDuckJob = {

  id: "rubber-duck-job",

  number: 1,

  name: "The Rubber Duck Job",

  location: "Museum Storage Wing",

  difficulty: "Training Mission",

  briefing:
    "Retrieve the priceless rubber duck and return to the entrance without crossing your own trail.",

  targetName: "Priceless Rubber Duck",

  targetIcon: "🦆",

  targetValue: 5000,

  parMoves: 42,

  timeLimit: null,

  width: 16,

  height: 16,

  playerStart: {
    x: 1,
    y: 1
  },

  exit: {
    x: 1,
    y: 1
  },

  target: {
    id: "rubber-duck",
    x: 13,
    y: 13,
    collected: false
  },

  bonusTreasures: [

    {
      id: "gold-watch",
      name: "Suspiciously Expensive Watch",
      icon: "⌚",
      x: 4,
      y: 12,
      value: 1250,
      collected: false
    },

    {
      id: "museum-vase",
      name: "Ancient Vase",
      icon: "🏺",
      x: 12,
      y: 4,
      value: 2000,
      collected: false
    }

  ],

  guards: [],

  cameras: [],

  lasers: [],

  doors: [],

  pressurePlates: [],

  tips: [

    "The trail cannot be crossed once it has been created.",

    "Plan your return route before stealing the duck.",

    "Bonus treasure increases your score but may make escaping harder.",

    "The entrance becomes the exit once the target has been collected.",

    "Greed is optional. Regret is included free of charge."

  ],


  /* =======================================================
     MAP

     The outer edge is surrounded by walls.

     The exit begins at the top-left area.

     The rubber duck is in the lower-right chamber.

     The central walls create several tempting routes,
     but careless movement can block the return path.
  ======================================================= */

  map: [

    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],

    [1, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],

    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],

    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],

    [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 4, 1, 0, 1],

    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],

    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],

    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],

    [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],

    [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],

    [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],

    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],

    [1, 0, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],

    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 1],

    [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],

    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

  ]

};


/* =========================================================
   FUTURE LEVEL TEMPLATE

   This is not currently included in the playable level list.
   Keep it here as a guide when we begin building Level Two.
========================================================= */

const futureLevelTemplate = {

  id: "future-level",

  number: 2,

  name: "Future Mission",

  location: "Unknown",

  difficulty: "Classified",

  briefing:
    "Mission information has been removed by someone with extremely questionable handwriting.",

  targetName: "Unknown Target",

  targetIcon: "❓",

  targetValue: 0,

  parMoves: 0,

  timeLimit: null,

  width: 12,

  height: 12,

  playerStart: {
    x: 1,
    y: 1
  },

  exit: {
    x: 1,
    y: 1
  },

  target: {
    id: "future-target",
    x: 10,
    y: 10,
    collected: false
  },

  bonusTreasures: [],

  guards: [],

  cameras: [],

  lasers: [],

  doors: [],

  pressurePlates: [],

  tips: [],

  map: []

};


/* =========================================================
   LEVEL COLLECTION

   game.js will use this array to load missions.

   Add future playable levels underneath rubberDuckJob.
========================================================= */

const THNAKE_LEVELS = [

  rubberDuckJob

];


/* =========================================================
   LEVEL HELPER FUNCTIONS
========================================================= */

function cloneThnakeLevel(level) {

  if (!level) {
    return null;
  }


  return JSON.parse(
    JSON.stringify(level)
  );

}


function getThnakeLevelByIndex(index) {

  const selectedLevel =
    THNAKE_LEVELS[index];


  return selectedLevel
    ? cloneThnakeLevel(selectedLevel)
    : null;

}


function getThnakeLevelById(levelId) {

  const selectedLevel =
    THNAKE_LEVELS.find(
      (level) => level.id === levelId
    );


  return selectedLevel
    ? cloneThnakeLevel(selectedLevel)
    : null;

}


function getThnakeLevelCount() {

  return THNAKE_LEVELS.length;

}


/* =========================================================
   GLOBAL EXPORTS

   These globals allow game.js to access the level data
   without using JavaScript modules.
========================================================= */

window.THNAKE_LEVELS =
  THNAKE_LEVELS;


window.getThnakeLevelByIndex =
  getThnakeLevelByIndex;


window.getThnakeLevelById =
  getThnakeLevelById;


window.getThnakeLevelCount =
  getThnakeLevelCount;
