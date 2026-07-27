"use strict";


/* =========================================================
   THNAKE PROCEDURAL MISSION GENERATOR
   Pointless Arcade

   Generates a fresh museum for every mission.

   Current features:

   - Seeded procedural generation
   - Random wall sections and corridors
   - Entrance placement
   - Main target placement
   - Bonus treasure placement
   - Reachability checks
   - Two-route validation for outward and return journeys
   - Reproducible mission seeds
   - Difficulty-ready mission settings
   - Future-ready guard, camera, laser and door arrays
========================================================= */


/* =========================================================
   1. TILE LEGEND
========================================================= */

const THNAKE_TILE_FLOOR = 0;
const THNAKE_TILE_WALL = 1;
const THNAKE_TILE_EXIT = 2;
const THNAKE_TILE_TARGET = 3;
const THNAKE_TILE_BONUS_TREASURE = 4;
const THNAKE_TILE_LOCKED_DOOR = 5;
const THNAKE_TILE_PRESSURE_PLATE = 6;
const THNAKE_TILE_LASER = 7;
const THNAKE_TILE_OBSTACLE = 8;


/* =========================================================
   2. GENERATOR SETTINGS
========================================================= */

const THNAKE_GENERATOR_SETTINGS = {

  width: 16,

  height: 16,

  maximumGenerationAttempts: 180,

  minimumTargetDistance: 16,

  maximumTargetDistance: 34,

  minimumOpenTileRatio: 0.48,

  maximumOpenTileRatio: 0.72,

  wallRectangleAttempts: 24,

  minimumWallRectangleWidth: 1,

  maximumWallRectangleWidth: 4,

  minimumWallRectangleHeight: 1,

  maximumWallRectangleHeight: 4,

  bonusTreasureCount: 2,

  minimumTreasureDistanceFromExit: 7,

  minimumTreasureSpacing: 5,

  edgeOpeningChance: 0.35

};


/* =========================================================
   3. MISSION NAMES AND CONTENT
========================================================= */

const THNAKE_MISSION_NAMES = [

  "The Rubber Duck Job",

  "Operation Squeaky Business",

  "The Quack Exchange",

  "The Museum's Most Wanted",

  "A Questionable Acquisition",

  "The Golden Bath-Time Heist",

  "Operation Absolutely Necessary",

  "The Duck That Wasn't Missing",

  "The Great Quack Robbery",

  "Mission: Mildly Illegal"

];


const THNAKE_LOCATIONS = [

  "Museum Storage Wing",

  "Royal Exhibition Hall",

  "National Curiosity Archive",

  "Department of Unnecessary Artefacts",

  "Municipal Museum Annex",

  "Private Collector's Gallery",

  "The Extremely Secure Duck Room",

  "Museum of Questionable Value"

];


const THNAKE_TARGET_NAMES = [

  "Priceless Rubber Duck",

  "Royal Ceremonial Duck",

  "Golden Bath-Time Relic",

  "Limited-Edition Squeaky Duck",

  "Historically Important Duck",

  "The Duck of Considerable Value"

];


const THNAKE_BONUS_TREASURE_TEMPLATES = [

  {
    idPrefix: "gold-watch",
    name: "Suspiciously Expensive Watch",
    icon: "⌚",
    minimumValue: 900,
    maximumValue: 1500
  },

  {
    idPrefix: "ancient-vase",
    name: "Ancient Vase",
    icon: "🏺",
    minimumValue: 1400,
    maximumValue: 2400
  },

  {
    idPrefix: "diamond",
    name: "Definitely Real Diamond",
    icon: "💎",
    minimumValue: 1800,
    maximumValue: 3200
  },

  {
    idPrefix: "crown",
    name: "Small Ceremonial Crown",
    icon: "👑",
    minimumValue: 2200,
    maximumValue: 3600
  },

  {
    idPrefix: "painting",
    name: "Suspiciously Familiar Painting",
    icon: "🖼️",
    minimumValue: 1100,
    maximumValue: 2100
  },

  {
    idPrefix: "briefcase",
    name: "Unattended Briefcase",
    icon: "💼",
    minimumValue: 700,
    maximumValue: 1700
  },

  {
    idPrefix: "gemstone",
    name: "Unreasonably Shiny Gemstone",
    icon: "🔷",
    minimumValue: 1200,
    maximumValue: 2500
  },

  {
    idPrefix: "golden-key",
    name: "Key to Absolutely Nothing",
    icon: "🗝️",
    minimumValue: 800,
    maximumValue: 1400
  }

];


const THNAKE_MISSION_TIPS = [

  "The trail cannot be crossed once it has been created.",

  "Plan a different route home before stealing the duck.",

  "The museum changes every mission. Your bad decisions remain consistent.",

  "Bonus treasure increases your score but may remove your safest escape route.",

  "The entrance becomes active again after the target has been collected.",

  "Two routes exist. Whether you notice either of them is another matter.",

  "A shorter route is not always the safer route.",

  "Greed is optional. Regret is included free of charge.",

  "Dead ends are considerably less charming when you are standing inside one.",

  "The museum has supplied several exits from responsibility, but only one actual exit."

];


/* =========================================================
   4. SEED UTILITIES
========================================================= */

function createThnakeMissionSeed() {

  const timePart =
    Date.now().toString(36);


  const randomPart =
    Math.floor(
      Math.random() * 0xFFFFFF
    )
      .toString(36)
      .padStart(5, "0");


  return `${timePart}-${randomPart}`;

}


function hashThnakeSeed(seed) {

  const text =
    String(seed);


  let hash =
    2166136261;


  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {

    hash ^=
      text.charCodeAt(index);


    hash =
      Math.imul(
        hash,
        16777619
      );

  }


  return hash >>> 0;

}


function createSeededRandom(seed) {

  let state =
    hashThnakeSeed(seed) || 1;


  return function seededRandom() {

    state +=
      0x6D2B79F5;


    let value =
      state;


    value =
      Math.imul(
        value ^ value >>> 15,
        value | 1
      );


    value ^=
      value +
      Math.imul(
        value ^ value >>> 7,
        value | 61
      );


    return (
      (
        value ^ value >>> 14
      ) >>> 0
    ) / 4294967296;

  };

}


/* =========================================================
   5. RANDOM HELPERS
========================================================= */

function randomInteger(
  random,
  minimum,
  maximum
) {

  return Math.floor(
    random() *
    (
      maximum -
      minimum +
      1
    )
  ) + minimum;

}


function randomChoice(
  random,
  array
) {

  if (
    !Array.isArray(array) ||
    array.length === 0
  ) {
    return null;
  }


  return array[
    randomInteger(
      random,
      0,
      array.length - 1
    )
  ];

}


function shuffleWithRandom(
  random,
  array
) {

  const shuffled =
    [...array];


  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {

    const randomIndex =
      randomInteger(
        random,
        0,
        index
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
   6. GRID HELPERS
========================================================= */

function createThnakeGrid(
  width,
  height,
  fillValue = THNAKE_TILE_FLOOR
) {

  return Array.from(
    {
      length: height
    },
    () =>
      new Array(width).fill(fillValue)
  );

}


function cloneThnakeGrid(grid) {

  return grid.map(
    (row) => [...row]
  );

}


function isInsideThnakeGrid(
  x,
  y,
  width,
  height
) {

  return (
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height
  );

}


function isInteriorThnakePosition(
  x,
  y,
  width,
  height
) {

  return (
    x > 0 &&
    y > 0 &&
    x < width - 1 &&
    y < height - 1
  );

}


function thnakePositionKey(
  x,
  y
) {

  return `${x},${y}`;

}


function thnakeManhattanDistance(
  first,
  second
) {

  return (
    Math.abs(
      first.x -
      second.x
    ) +
    Math.abs(
      first.y -
      second.y
    )
  );

}


function getThnakeCardinalNeighbours(
  position,
  width,
  height
) {

  const possibleNeighbours = [

    {
      x: position.x + 1,
      y: position.y
    },

    {
      x: position.x - 1,
      y: position.y
    },

    {
      x: position.x,
      y: position.y + 1
    },

    {
      x: position.x,
      y: position.y - 1
    }

  ];


  return possibleNeighbours.filter(
    (neighbour) => {

      return isInsideThnakeGrid(
        neighbour.x,
        neighbour.y,
        width,
        height
      );

    }
  );

}


/* =========================================================
   7. BASE MUSEUM CREATION
========================================================= */

function createBaseMuseumGrid(
  width,
  height
) {

  const grid =
    createThnakeGrid(
      width,
      height,
      THNAKE_TILE_FLOOR
    );


  for (
    let x = 0;
    x < width;
    x += 1
  ) {

    grid[0][x] =
      THNAKE_TILE_WALL;


    grid[height - 1][x] =
      THNAKE_TILE_WALL;

  }


  for (
    let y = 0;
    y < height;
    y += 1
  ) {

    grid[y][0] =
      THNAKE_TILE_WALL;


    grid[y][width - 1] =
      THNAKE_TILE_WALL;

  }


  return grid;

}


/* =========================================================
   8. RANDOM WALL GENERATION
========================================================= */

function addRandomWallRectangles(
  grid,
  random,
  settings
) {

  const width =
    settings.width;


  const height =
    settings.height;


  for (
    let attempt = 0;
    attempt < settings.wallRectangleAttempts;
    attempt += 1
  ) {

    const rectangleWidth =
      randomInteger(
        random,
        settings.minimumWallRectangleWidth,
        settings.maximumWallRectangleWidth
      );


    const rectangleHeight =
      randomInteger(
        random,
        settings.minimumWallRectangleHeight,
        settings.maximumWallRectangleHeight
      );


    const startX =
      randomInteger(
        random,
        2,
        Math.max(
          2,
          width -
          rectangleWidth -
          3
        )
      );


    const startY =
      randomInteger(
        random,
        2,
        Math.max(
          2,
          height -
          rectangleHeight -
          3
        )
      );


    const horizontalShape =
      random() < 0.55;


    const effectiveWidth =
      horizontalShape
        ? rectangleWidth
        : Math.min(
            rectangleWidth,
            2
          );


    const effectiveHeight =
      horizontalShape
        ? Math.min(
            rectangleHeight,
            2
          )
        : rectangleHeight;


    paintWallRectangle(
      grid,
      startX,
      startY,
      effectiveWidth,
      effectiveHeight
    );

  }


  createRandomOpenings(
    grid,
    random,
    settings
  );

}


function paintWallRectangle(
  grid,
  startX,
  startY,
  rectangleWidth,
  rectangleHeight
) {

  for (
    let y = startY;
    y < startY + rectangleHeight;
    y += 1
  ) {

    for (
      let x = startX;
      x < startX + rectangleWidth;
      x += 1
    ) {

      if (
        grid[y] &&
        typeof grid[y][x] !== "undefined"
      ) {

        grid[y][x] =
          THNAKE_TILE_WALL;

      }

    }

  }

}


function createRandomOpenings(
  grid,
  random,
  settings
) {

  for (
    let y = 2;
    y < settings.height - 2;
    y += 1
  ) {

    for (
      let x = 2;
      x < settings.width - 2;
      x += 1
    ) {

      if (
        grid[y][x] !==
        THNAKE_TILE_WALL
      ) {
        continue;
      }


      const horizontalWalls =
        grid[y][x - 1] === THNAKE_TILE_WALL &&
        grid[y][x + 1] === THNAKE_TILE_WALL;


      const verticalWalls =
        grid[y - 1][x] === THNAKE_TILE_WALL &&
        grid[y + 1][x] === THNAKE_TILE_WALL;


      if (
        (
          horizontalWalls ||
          verticalWalls
        ) &&
        random() <
          settings.edgeOpeningChance
      ) {

        grid[y][x] =
          THNAKE_TILE_FLOOR;

      }

    }

  }

}


/* =========================================================
   9. REMOVE AWKWARD WALL FORMATIONS
========================================================= */

function cleanMuseumGrid(
  grid,
  settings
) {

  const cleanedGrid =
    cloneThnakeGrid(grid);


  for (
    let y = 1;
    y < settings.height - 1;
    y += 1
  ) {

    for (
      let x = 1;
      x < settings.width - 1;
      x += 1
    ) {

      const wallNeighbours =
        getThnakeCardinalNeighbours(
          {
            x,
            y
          },
          settings.width,
          settings.height
        )
          .filter(
            (position) => {

              return (
                grid[position.y][position.x] ===
                THNAKE_TILE_WALL
              );

            }
          )
          .length;


      if (
        grid[y][x] ===
          THNAKE_TILE_WALL &&
        wallNeighbours === 0
      ) {

        cleanedGrid[y][x] =
          THNAKE_TILE_FLOOR;

      }


      if (
        grid[y][x] ===
          THNAKE_TILE_FLOOR &&
        wallNeighbours === 4
      ) {

        cleanedGrid[y][x] =
          THNAKE_TILE_WALL;

      }

    }

  }


  return cleanedGrid;

}


/* =========================================================
   10. FLOOR POSITION HELPERS
========================================================= */

function getAllFloorPositions(grid) {

  const positions = [];


  for (
    let y = 0;
    y < grid.length;
    y += 1
  ) {

    for (
      let x = 0;
      x < grid[y].length;
      x += 1
    ) {

      if (
        grid[y][x] ===
        THNAKE_TILE_FLOOR
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


function calculateOpenTileRatio(grid) {

  let openTiles = 0;

  let interiorTiles = 0;


  for (
    let y = 1;
    y < grid.length - 1;
    y += 1
  ) {

    for (
      let x = 1;
      x < grid[y].length - 1;
      x += 1
    ) {

      interiorTiles += 1;


      if (
        grid[y][x] ===
        THNAKE_TILE_FLOOR
      ) {

        openTiles += 1;

      }

    }

  }


  return interiorTiles > 0
    ? openTiles / interiorTiles
    : 0;

}


/* =========================================================
   11. ENTRANCE PLACEMENT
========================================================= */

function chooseEntrancePosition(
  grid,
  random,
  settings
) {

  const candidatePositions = [];


  for (
    let x = 1;
    x < settings.width - 1;
    x += 1
  ) {

    candidatePositions.push(
      {
        x,
        y: 1
      }
    );


    candidatePositions.push(
      {
        x,
        y: settings.height - 2
      }
    );

  }


  for (
    let y = 2;
    y < settings.height - 2;
    y += 1
  ) {

    candidatePositions.push(
      {
        x: 1,
        y
      }
    );


    candidatePositions.push(
      {
        x: settings.width - 2,
        y
      }
    );

  }


  const validCandidates =
    candidatePositions.filter(
      (position) => {

        if (
          grid[position.y][position.x] !==
          THNAKE_TILE_FLOOR
        ) {
          return false;
        }


        const openNeighbours =
          getThnakeCardinalNeighbours(
            position,
            settings.width,
            settings.height
          )
            .filter(
              (neighbour) => {

                return (
                  grid[neighbour.y][neighbour.x] ===
                  THNAKE_TILE_FLOOR
                );

              }
            )
            .length;


        return openNeighbours >= 2;

      }
    );


  return randomChoice(
    random,
    validCandidates
  );

}


/* =========================================================
   12. BREADTH-FIRST PATHFINDING
========================================================= */

function findShortestThnakePath(
  grid,
  start,
  target,
  blockedPositions = new Set()
) {

  const width =
    grid[0].length;


  const height =
    grid.length;


  const startKey =
    thnakePositionKey(
      start.x,
      start.y
    );


  const targetKey =
    thnakePositionKey(
      target.x,
      target.y
    );


  const queue = [
    start
  ];


  const visited =
    new Set([
      startKey
    ]);


  const previous =
    new Map();


  while (queue.length > 0) {

    const current =
      queue.shift();


    const currentKey =
      thnakePositionKey(
        current.x,
        current.y
      );


    if (
      currentKey ===
      targetKey
    ) {

      return rebuildThnakePath(
        previous,
        current
      );

    }


    const neighbours =
      getThnakeCardinalNeighbours(
        current,
        width,
        height
      );


    for (
      const neighbour
      of neighbours
    ) {

      const neighbourKey =
        thnakePositionKey(
          neighbour.x,
          neighbour.y
        );


      if (
        visited.has(neighbourKey)
      ) {
        continue;
      }


      if (
        blockedPositions.has(neighbourKey) &&
        neighbourKey !== targetKey
      ) {
        continue;
      }


      if (
        grid[neighbour.y][neighbour.x] ===
        THNAKE_TILE_WALL
      ) {
        continue;
      }


      visited.add(
        neighbourKey
      );


      previous.set(
        neighbourKey,
        current
      );


      queue.push(
        neighbour
      );

    }

  }


  return null;

}


function rebuildThnakePath(
  previous,
  target
) {

  const path = [
    target
  ];


  let current =
    target;


  while (true) {

    const key =
      thnakePositionKey(
        current.x,
        current.y
      );


    const precedingPosition =
      previous.get(key);


    if (!precedingPosition) {
      break;
    }


    path.push(
      precedingPosition
    );


    current =
      precedingPosition;

  }


  path.reverse();


  return path;

}


/* =========================================================
   13. CONNECTED FLOOR REGION
========================================================= */

function getReachableFloorPositions(
  grid,
  start
) {

  const width =
    grid[0].length;


  const height =
    grid.length;


  const queue = [
    start
  ];


  const visited =
    new Set([
      thnakePositionKey(
        start.x,
        start.y
      )
    ]);


  const positions = [];


  while (queue.length > 0) {

    const current =
      queue.shift();


    positions.push(
      current
    );


    const neighbours =
      getThnakeCardinalNeighbours(
        current,
        width,
        height
      );


    for (
      const neighbour
      of neighbours
    ) {

      const key =
        thnakePositionKey(
          neighbour.x,
          neighbour.y
        );


      if (
        visited.has(key)
      ) {
        continue;
      }


      if (
        grid[neighbour.y][neighbour.x] ===
        THNAKE_TILE_WALL
      ) {
        continue;
      }


      visited.add(key);

      queue.push(
        neighbour
      );

    }

  }


  return positions;

}


/* =========================================================
   14. TWO-ROUTE VALIDATION

   Thnake cannot cross its outward trail.

   We therefore require two internally separate routes
   between the entrance and target.

   This uses a node-splitting maximum-flow test so shared
   interior floor tiles are not permitted between routes.
========================================================= */

function hasTwoInternallySeparateRoutes(
  grid,
  start,
  target
) {

  const graph =
    createVertexCapacityGraph(
      grid,
      start,
      target
    );


  const source =
    `${thnakePositionKey(
      start.x,
      start.y
    )}:out`;


  const sink =
    `${thnakePositionKey(
      target.x,
      target.y
    )}:in`;


  const maximumFlow =
    calculateMaximumFlow(
      graph,
      source,
      sink,
      2
    );


  return maximumFlow >= 2;

}


function createVertexCapacityGraph(
  grid,
  start,
  target
) {

  const graph =
    new Map();


  const height =
    grid.length;


  const width =
    grid[0].length;


  function ensureNode(node) {

    if (!graph.has(node)) {

      graph.set(
        node,
        new Map()
      );

    }

  }


  function addEdge(
    from,
    to,
    capacity
  ) {

    ensureNode(from);

    ensureNode(to);


    graph
      .get(from)
      .set(
        to,
        (
          graph
            .get(from)
            .get(to) || 0
        ) + capacity
      );


    if (
      !graph
        .get(to)
        .has(from)
    ) {

      graph
        .get(to)
        .set(
          from,
          0
        );

    }

  }


  for (
    let y = 0;
    y < height;
    y += 1
  ) {

    for (
      let x = 0;
      x < width;
      x += 1
    ) {

      if (
        grid[y][x] ===
        THNAKE_TILE_WALL
      ) {
        continue;
      }


      const key =
        thnakePositionKey(
          x,
          y
        );


      const inputNode =
        `${key}:in`;


      const outputNode =
        `${key}:out`;


      const isEndpoint =
        (
          x === start.x &&
          y === start.y
        ) ||
        (
          x === target.x &&
          y === target.y
        );


      addEdge(
        inputNode,
        outputNode,
        isEndpoint
          ? 2
          : 1
      );


      const neighbours =
        getThnakeCardinalNeighbours(
          {
            x,
            y
          },
          width,
          height
        );


      for (
        const neighbour
        of neighbours
      ) {

        if (
          grid[neighbour.y][neighbour.x] ===
          THNAKE_TILE_WALL
        ) {
          continue;
        }


        const neighbourInput =
          `${
            thnakePositionKey(
              neighbour.x,
              neighbour.y
            )
          }:in`;


        addEdge(
          outputNode,
          neighbourInput,
          2
        );

      }

    }

  }


  return graph;

}


function calculateMaximumFlow(
  graph,
  source,
  sink,
  desiredFlow
) {

  let totalFlow = 0;


  while (
    totalFlow <
    desiredFlow
  ) {

    const parent =
      findAugmentingPath(
        graph,
        source,
        sink
      );


    if (!parent) {
      break;
    }


    let pathFlow =
      Number.POSITIVE_INFINITY;


    let current =
      sink;


    while (
      current !== source
    ) {

      const preceding =
        parent.get(current);


      pathFlow =
        Math.min(
          pathFlow,
          graph
            .get(preceding)
            .get(current)
        );


      current =
        preceding;

    }


    current =
      sink;


    while (
      current !== source
    ) {

      const preceding =
        parent.get(current);


      const forwardCapacity =
        graph
          .get(preceding)
          .get(current);


      graph
        .get(preceding)
        .set(
          current,
          forwardCapacity -
          pathFlow
        );


      const reverseCapacity =
        graph
          .get(current)
          .get(preceding) || 0;


      graph
        .get(current)
        .set(
          preceding,
          reverseCapacity +
          pathFlow
        );


      current =
        preceding;

    }


    totalFlow +=
      pathFlow;

  }


  return totalFlow;

}


function findAugmentingPath(
  graph,
  source,
  sink
) {

  if (
    !graph.has(source) ||
    !graph.has(sink)
  ) {
    return null;
  }


  const queue = [
    source
  ];


  const visited =
    new Set([
      source
    ]);


  const parent =
    new Map();


  while (queue.length > 0) {

    const current =
      queue.shift();


    for (
      const [
        neighbour,
        capacity
      ]
      of graph.get(current)
    ) {

      if (
        capacity <= 0 ||
        visited.has(neighbour)
      ) {
        continue;
      }


      visited.add(
        neighbour
      );


      parent.set(
        neighbour,
        current
      );


      if (
        neighbour === sink
      ) {

        return parent;

      }


      queue.push(
        neighbour
      );

    }

  }


  return null;

}


/* =========================================================
   15. TARGET PLACEMENT
========================================================= */

function chooseTargetPosition(
  grid,
  entrance,
  reachablePositions,
  random,
  settings
) {

  const candidates =
    reachablePositions.filter(
      (position) => {

        const distance =
          thnakeManhattanDistance(
            entrance,
            position
          );


        if (
          distance <
            settings.minimumTargetDistance ||
          distance >
            settings.maximumTargetDistance
        ) {
          return false;
        }


        const openNeighbours =
          getThnakeCardinalNeighbours(
            position,
            settings.width,
            settings.height
          )
            .filter(
              (neighbour) => {

                return (
                  grid[neighbour.y][neighbour.x] !==
                  THNAKE_TILE_WALL
                );

              }
            )
            .length;


        return openNeighbours >= 2;

      }
    );


  const shuffledCandidates =
    shuffleWithRandom(
      random,
      candidates
    );


  for (
    const candidate
    of shuffledCandidates
  ) {

    if (
      hasTwoInternallySeparateRoutes(
        grid,
        entrance,
        candidate
      )
    ) {

      return candidate;

    }

  }


  return null;

}


/* =========================================================
   16. BONUS TREASURE PLACEMENT
========================================================= */

function chooseBonusTreasurePositions(
  grid,
  entrance,
  target,
  reachablePositions,
  random,
  settings
) {

  const selectedPositions = [];


  const candidates =
    shuffleWithRandom(
      random,
      reachablePositions.filter(
        (position) => {

          if (
            positionsEqual(
              position,
              entrance
            ) ||
            positionsEqual(
              position,
              target
            )
          ) {
            return false;
          }


          return (
            thnakeManhattanDistance(
              position,
              entrance
            ) >=
            settings.minimumTreasureDistanceFromExit
          );

        }
      )
    );


  for (
    const candidate
    of candidates
  ) {

    const tooCloseToExisting =
      selectedPositions.some(
        (selected) => {

          return (
            thnakeManhattanDistance(
              candidate,
              selected
            ) <
            settings.minimumTreasureSpacing
          );

        }
      );


    if (tooCloseToExisting) {
      continue;
    }


    selectedPositions.push(
      candidate
    );


    if (
      selectedPositions.length >=
      settings.bonusTreasureCount
    ) {
      break;
    }

  }


  return selectedPositions;

}


function positionsEqual(
  first,
  second
) {

  return (
    first.x === second.x &&
    first.y === second.y
  );

}


/* =========================================================
   17. BONUS TREASURE CREATION
========================================================= */

function createBonusTreasures(
  positions,
  random,
  missionSeed
) {

  const templates =
    shuffleWithRandom(
      random,
      THNAKE_BONUS_TREASURE_TEMPLATES
    );


  return positions.map(
    (position, index) => {

      const template =
        templates[
          index %
          templates.length
        ];


      return {

        id:
          `${
            template.idPrefix
          }-${missionSeed}-${index + 1}`,

        name:
          template.name,

        icon:
          template.icon,

        x:
          position.x,

        y:
          position.y,

        value:
          roundTreasureValue(
            randomInteger(
              random,
              template.minimumValue,
              template.maximumValue
            )
          ),

        collected:
          false

      };

    }
  );

}


function roundTreasureValue(value) {

  return (
    Math.round(
      value / 50
    ) * 50
  );

}


/* =========================================================
   18. PAR-MOVE CALCULATION
========================================================= */

function calculateMissionParMoves(
  grid,
  entrance,
  target,
  bonusTreasures
) {

  const directPath =
    findShortestThnakePath(
      grid,
      entrance,
      target
    );


  if (!directPath) {
    return 0;
  }


  const blockedOutwardTrail =
    new Set(
      directPath
        .slice(
          1,
          -1
        )
        .map(
          (position) => {

            return thnakePositionKey(
              position.x,
              position.y
            );

          }
        )
    );


  const returnPath =
    findShortestThnakePath(
      grid,
      target,
      entrance,
      blockedOutwardTrail
    );


  const baseMoves =
    (
      directPath.length - 1
    ) +
    (
      returnPath
        ? returnPath.length - 1
        : directPath.length - 1
    );


  const optionalAllowance =
    bonusTreasures.length * 5;


  return (
    baseMoves +
    optionalAllowance
  );

}


/* =========================================================
   19. DIFFICULTY ASSESSMENT
========================================================= */

function calculateMissionDifficulty(
  grid,
  entrance,
  target,
  parMoves
) {

  const distance =
    thnakeManhattanDistance(
      entrance,
      target
    );


  const openRatio =
    calculateOpenTileRatio(grid);


  let difficultyScore = 0;


  difficultyScore +=
    distance >= 22
      ? 2
      : 1;


  difficultyScore +=
    parMoves >= 48
      ? 2
      : 1;


  difficultyScore +=
    openRatio < 0.56
      ? 2
      : 1;


  if (difficultyScore <= 3) {

    return "Training Mission";

  }


  if (difficultyScore <= 5) {

    return "Moderate Security";

  }


  return "High Security";

}


/* =========================================================
   20. APPLY MISSION TILES
========================================================= */

function applyMissionTiles(
  grid,
  entrance,
  target,
  treasurePositions
) {

  const missionGrid =
    cloneThnakeGrid(grid);


  missionGrid[
    entrance.y
  ][
    entrance.x
  ] =
    THNAKE_TILE_EXIT;


  missionGrid[
    target.y
  ][
    target.x
  ] =
    THNAKE_TILE_TARGET;


  treasurePositions.forEach(
    (position) => {

      missionGrid[
        position.y
      ][
        position.x
      ] =
        THNAKE_TILE_BONUS_TREASURE;

    }
  );


  return missionGrid;

}


/* =========================================================
   21. PROCEDURAL MISSION GENERATION
========================================================= */

function generateThnakeMission(
  suppliedSeed = null,
  options = {}
) {

  const settings = {

    ...THNAKE_GENERATOR_SETTINGS,

    ...options

  };


  const baseSeed =
    suppliedSeed ||
    createThnakeMissionSeed();


  for (
    let attempt = 0;
    attempt <
      settings.maximumGenerationAttempts;
    attempt += 1
  ) {

    const attemptSeed =
      `${baseSeed}:${attempt}`;


    const random =
      createSeededRandom(
        attemptSeed
      );


    let grid =
      createBaseMuseumGrid(
        settings.width,
        settings.height
      );


    addRandomWallRectangles(
      grid,
      random,
      settings
    );


    grid =
      cleanMuseumGrid(
        grid,
        settings
      );


    const openTileRatio =
      calculateOpenTileRatio(
        grid
      );


    if (
      openTileRatio <
        settings.minimumOpenTileRatio ||
      openTileRatio >
        settings.maximumOpenTileRatio
    ) {
      continue;
    }


    const entrance =
      chooseEntrancePosition(
        grid,
        random,
        settings
      );


    if (!entrance) {
      continue;
    }


    const reachablePositions =
      getReachableFloorPositions(
        grid,
        entrance
      );


    const totalFloorPositions =
      getAllFloorPositions(
        grid
      );


    if (
      reachablePositions.length <
      totalFloorPositions.length * 0.9
    ) {
      continue;
    }


    const target =
      chooseTargetPosition(
        grid,
        entrance,
        reachablePositions,
        random,
        settings
      );


    if (!target) {
      continue;
    }


    const treasurePositions =
      chooseBonusTreasurePositions(
        grid,
        entrance,
        target,
        reachablePositions,
        random,
        settings
      );


    if (
      treasurePositions.length <
      settings.bonusTreasureCount
    ) {
      continue;
    }


    const bonusTreasures =
      createBonusTreasures(
        treasurePositions,
        random,
        attemptSeed
      );


    const parMoves =
      calculateMissionParMoves(
        grid,
        entrance,
        target,
        bonusTreasures
      );


    if (parMoves <= 0) {
      continue;
    }


    const difficulty =
      calculateMissionDifficulty(
        grid,
        entrance,
        target,
        parMoves
      );


    const missionMap =
      applyMissionTiles(
        grid,
        entrance,
        target,
        treasurePositions
      );


    return createThnakeMissionObject({

      seed:
        attemptSeed,

      baseSeed,

      generationAttempt:
        attempt,

      random,

      settings,

      map:
        missionMap,

      entrance,

      target,

      bonusTreasures,

      parMoves,

      difficulty

    });

  }


  console.warn(
    "Thnake could not generate a validated random museum. Loading the emergency mission."
  );


  return createEmergencyThnakeMission(
    baseSeed
  );

}


/* =========================================================
   22. MISSION OBJECT CREATION
========================================================= */

function createThnakeMissionObject({
  seed,
  baseSeed,
  generationAttempt,
  random,
  settings,
  map,
  entrance,
  target,
  bonusTreasures,
  parMoves,
  difficulty
}) {

  const missionNumber =
    (
      hashThnakeSeed(seed) %
      99999
    ) + 1;


  const targetName =
    randomChoice(
      random,
      THNAKE_TARGET_NAMES
    );


  const targetValue =
    roundTreasureValue(
      randomInteger(
        random,
        4300,
        6800
      )
    );


  return {

    id:
      `procedural-mission-${missionNumber}`,

    seed,

    baseSeed,

    generationAttempt,

    number:
      missionNumber,

    name:
      randomChoice(
        random,
        THNAKE_MISSION_NAMES
      ),

    location:
      randomChoice(
        random,
        THNAKE_LOCATIONS
      ),

    difficulty,

    briefing:
      `Retrieve the ${targetName.toLowerCase()} and return to the entrance without crossing your own trail.`,

    targetName,

    targetIcon:
      "🦆",

    targetValue,

    parMoves,

    timeLimit:
      null,

    width:
      settings.width,

    height:
      settings.height,

    playerStart: {

      x:
        entrance.x,

      y:
        entrance.y

    },

    exit: {

      x:
        entrance.x,

      y:
        entrance.y

    },

    target: {

      id:
        `rubber-duck-${missionNumber}`,

      x:
        target.x,

      y:
        target.y,

      collected:
        false

    },

    bonusTreasures,

    guards: [],

    cameras: [],

    lasers: [],

    doors: [],

    pressurePlates: [],

    modifiers: [],

    securityRating:
      calculateSecurityRating(
        difficulty
      ),

    tips:
      shuffleWithRandom(
        random,
        THNAKE_MISSION_TIPS
      )
        .slice(
          0,
          6
        ),

    map

  };

}


/* =========================================================
   23. SECURITY RATING
========================================================= */

function calculateSecurityRating(
  difficulty
) {

  if (
    difficulty ===
    "Training Mission"
  ) {

    return 1;

  }


  if (
    difficulty ===
    "Moderate Security"
  ) {

    return 2;

  }


  return 3;

}


/* =========================================================
   24. EMERGENCY FALLBACK MISSION

   Used only when the random generator cannot produce a
   validated map within the attempt limit.
========================================================= */

function createEmergencyThnakeMission(
  seed
) {

  const map = [

    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],

    [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],

    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],

    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],

    [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 0, 1],

    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],

    [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],

    [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],

    [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],

    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],

    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],

    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],

    [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],

    [1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 1],

    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],

    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

  ];


  return {

    id:
      "emergency-rubber-duck-job",

    seed:
      `${seed}:emergency`,

    baseSeed:
      seed,

    generationAttempt:
      -1,

    number:
      1,

    name:
      "The Emergency Rubber Duck Job",

    location:
      "Backup Museum Storage Wing",

    difficulty:
      "Training Mission",

    briefing:
      "Retrieve the priceless rubber duck and return to the entrance without crossing your own trail.",

    targetName:
      "Priceless Rubber Duck",

    targetIcon:
      "🦆",

    targetValue:
      5000,

    parMoves:
      50,

    timeLimit:
      null,

    width:
      16,

    height:
      16,

    playerStart: {

      x: 1,

      y: 1

    },

    exit: {

      x: 1,

      y: 1

    },

    target: {

      id:
        "emergency-rubber-duck",

      x:
        13,

      y:
        13,

      collected:
        false

    },

    bonusTreasures: [

      {
        id:
          "emergency-gold-watch",

        name:
          "Suspiciously Expensive Watch",

        icon:
          "⌚",

        x:
          12,

        y:
          4,

        value:
          1250,

        collected:
          false
      },

      {
        id:
          "emergency-vase",

        name:
          "Ancient Vase",

        icon:
          "🏺",

        x:
          4,

        y:
          13,

        value:
          2000,

        collected:
          false
      }

    ],

    guards: [],

    cameras: [],

    lasers: [],

    doors: [],

    pressurePlates: [],

    modifiers: [],

    securityRating:
      1,

    tips:
      [...THNAKE_MISSION_TIPS],

    map

  };

}


/* =========================================================
   25. LEVEL COLLECTION

   The procedural generator is now the level source.

   Every getThnakeLevelByIndex call generates a fresh map.
========================================================= */

const THNAKE_LEVELS = [

  {
    id:
      "endless-heist",

    number:
      1,

    name:
      "Endless Heist",

    procedural:
      true
  }

];


/* =========================================================
   26. PUBLIC LEVEL FUNCTIONS
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

  if (
    index !== 0
  ) {
    return null;
  }


  return generateThnakeMission();

}


function getThnakeLevelById(levelId) {

  if (
    levelId === "endless-heist"
  ) {

    return generateThnakeMission();

  }


  const matchingLevel =
    THNAKE_LEVELS.find(
      (level) => {

        return (
          level.id === levelId
        );

      }
    );


  return matchingLevel
    ? cloneThnakeLevel(
        matchingLevel
      )
    : null;

}


function getThnakeLevelCount() {

  return THNAKE_LEVELS.length;

}


/* =========================================================
   27. SEED REPLAY

   Example from the browser console:

   const mission =
     replayThnakeMission("your-seed-here");
========================================================= */

function replayThnakeMission(seed) {

  if (
    !seed ||
    typeof seed !== "string"
  ) {

    throw new Error(
      "A valid Thnake mission seed is required."
    );

  }


  const baseSeed =
    seed.includes(":")
      ? seed.split(":")[0]
      : seed;


  return generateThnakeMission(
    baseSeed
  );

}


/* =========================================================
   28. DAILY MISSION SEED

   Ready for a future Daily Heist mode.
========================================================= */

function getThnakeDailySeed(
  date = new Date()
) {

  const year =
    date.getUTCFullYear();


  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `daily-${year}-${month}-${day}`
  );

}


function generateThnakeDailyMission(
  date = new Date()
) {

  return generateThnakeMission(
    getThnakeDailySeed(date)
  );

}


/* =========================================================
   29. GLOBAL EXPORTS
========================================================= */

window.THNAKE_LEVELS =
  THNAKE_LEVELS;


window.generateThnakeMission =
  generateThnakeMission;


window.generateThnakeDailyMission =
  generateThnakeDailyMission;


window.getThnakeDailySeed =
  getThnakeDailySeed;


window.replayThnakeMission =
  replayThnakeMission;


window.getThnakeLevelByIndex =
  getThnakeLevelByIndex;


window.getThnakeLevelById =
  getThnakeLevelById;


window.getThnakeLevelCount =
  getThnakeLevelCount;
