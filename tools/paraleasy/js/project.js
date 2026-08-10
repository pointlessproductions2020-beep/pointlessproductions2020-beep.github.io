"use strict";


/* =========================================================
   ParaL-Easy
   PROJECT STATE + LOCAL SAVE / LOAD
========================================================= */


/* =========================================================
   1. CONSTANTS
========================================================= */

const PARALEASY_PROJECT_VERSION = 1;

const PARALEASY_STORAGE_KEY =
  "paraleasy:last-project";

const PARALEASY_DEFAULT_CANVAS = {
  width: 450,
  height: 450
};

const PARALEASY_DEFAULT_GYRO_RANGE = 45;

const PARALEASY_DEFAULT_PREVIEW_MODE =
  "studio";

const PARALEASY_DEFAULT_REAL_WATCH_RESPONSE =
  0.55;


/* =========================================================
   2. PROJECT FACTORY
========================================================= */

function createEmptyProject() {

  return {

    version:
      PARALEASY_PROJECT_VERSION,

    name:
      "Untitled Watch",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    canvas: {
      width:
        PARALEASY_DEFAULT_CANVAS.width,

      height:
        PARALEASY_DEFAULT_CANVAS.height
    },

    preview: {
      mode:
        PARALEASY_DEFAULT_PREVIEW_MODE,

      studioResponse:
        1,

      realWatchResponse:
        PARALEASY_DEFAULT_REAL_WATCH_RESPONSE,

      customResponse:
        0.7,

      tiltX:
        0,

      tiltY:
        0,

      depthDirection:
        1
    },

    layers: [],

    selectedLayerId:
      null

  };

}


/* =========================================================
   3. ACTIVE PROJECT
========================================================= */

let currentProject =
  createEmptyProject();


/* =========================================================
   4. LAYER FACTORY
========================================================= */

function createLayerFromImage({
  name = "Layer",
  src = "",
  width = 0,
  height = 0
} = {}) {

  const id =
    createUniqueId(
      "layer"
    );


  return {

    id,

    name,

    src,

    originalWidth:
      Number(width) || 0,

    originalHeight:
      Number(height) || 0,

    visible:
      true,

    opacity:
      1,

    depth:
      0,

    xStrength:
      1,

    yStrength:
      1,

    gyroRange:
      PARALEASY_DEFAULT_GYRO_RANGE,

    transform: {

      x:
        0,

      y:
        0,

      scale:
        1,

      rotation:
        0

    },

    wfs: {

      useAdvancedValues:
        false,

      xNegative:
        0,

      xPositive:
        0,

      yNegative:
        0,

      yPositive:
        0

    },

    createdAt:
      new Date().toISOString()

  };

}


/* =========================================================
   5. UNIQUE IDS
========================================================= */

function createUniqueId(
  prefix = "item"
) {

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {

    return (
      `${prefix}-` +
      crypto.randomUUID()
    );

  }


  return (
    `${prefix}-` +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


/* =========================================================
   6. PROJECT HELPERS
========================================================= */

function touchProject() {

  currentProject.updatedAt =
    new Date().toISOString();

}


function getProject() {

  return currentProject;

}


function replaceProject(
  project
) {

  currentProject =
    normaliseProject(
      project
    );


  touchProject();


  return currentProject;

}


function resetProject() {

  currentProject =
    createEmptyProject();


  return currentProject;

}


/* =========================================================
   7. PROJECT NORMALISATION
========================================================= */

function normaliseProject(
  project
) {

  const fallback =
    createEmptyProject();


  if (
    !project ||
    typeof project !==
      "object"
  ) {

    return fallback;

  }


  const normalised = {

    ...fallback,

    ...project,

    canvas: {
      ...fallback.canvas,
      ...(project.canvas || {})
    },

    preview: {
      ...fallback.preview,
      ...(project.preview || {})
    },

    layers:
      Array.isArray(
        project.layers
      )
        ? project.layers.map(
            normaliseLayer
          )
        : [],

    selectedLayerId:
      project.selectedLayerId ||
      null

  };


  const selectedExists =
    normalised.layers.some(
      (layer) =>
        layer.id ===
        normalised.selectedLayerId
    );


  if (!selectedExists) {

    normalised.selectedLayerId =
      normalised.layers[0]?.id ||
      null;

  }


  return normalised;

}


/* =========================================================
   8. LAYER NORMALISATION
========================================================= */

function normaliseLayer(
  layer
) {

  const fallback =
    createLayerFromImage();


  if (
    !layer ||
    typeof layer !==
      "object"
  ) {

    return fallback;

  }


  return {

    ...fallback,

    ...layer,

    visible:
      layer.visible !== false,

    opacity:
      clampNumber(
        layer.opacity,
        0,
        1,
        1
      ),

    depth:
      clampNumber(
        layer.depth,
        -100,
        100,
        0
      ),

    xStrength:
      clampNumber(
        layer.xStrength,
        0,
        2,
        1
      ),

    yStrength:
      clampNumber(
        layer.yStrength,
        0,
        2,
        1
      ),

    gyroRange:
      clampNumber(
        layer.gyroRange,
        10,
        90,
        PARALEASY_DEFAULT_GYRO_RANGE
      ),

    transform: {

      ...fallback.transform,

      ...(layer.transform || {})

    },

    wfs: {

      ...fallback.wfs,

      ...(layer.wfs || {})

    }

  };

}


/* =========================================================
   9. GENERIC NUMBER CLAMP
========================================================= */

function clampNumber(
  value,
  min,
  max,
  fallback = 0
) {

  const numeric =
    Number(value);


  if (
    !Number.isFinite(
      numeric
    )
  ) {

    return fallback;

  }


  return Math.min(
    max,
    Math.max(
      min,
      numeric
    )
  );

}


/* =========================================================
   10. PROJECT NAME
========================================================= */

function setProjectName(
  name
) {

  const cleanName =
    String(
      name || ""
    ).trim();


  currentProject.name =
    cleanName ||
    "Untitled Watch";


  touchProject();

}


/* =========================================================
   11. CANVAS SIZE
========================================================= */

function setProjectCanvasSize(
  width,
  height
) {

  currentProject.canvas.width =
    Math.max(
      1,
      Math.round(
        Number(width) || 450
      )
    );


  currentProject.canvas.height =
    Math.max(
      1,
      Math.round(
        Number(height) || 450
      )
    );


  touchProject();

}


/* =========================================================
   12. SELECTED LAYER
========================================================= */

function getSelectedLayer() {

  if (
    !currentProject.selectedLayerId
  ) {

    return null;

  }


  return (
    currentProject.layers.find(
      (layer) =>
        layer.id ===
        currentProject.selectedLayerId
    ) ||
    null
  );

}


function setSelectedLayerId(
  layerId
) {

  const exists =
    currentProject.layers.some(
      (layer) =>
        layer.id ===
        layerId
    );


  currentProject.selectedLayerId =
    exists
      ? layerId
      : null;


  return getSelectedLayer();

}


/* =========================================================
   13. FIND LAYER
========================================================= */

function getLayerById(
  layerId
) {

  return (
    currentProject.layers.find(
      (layer) =>
        layer.id ===
        layerId
    ) ||
    null
  );

}


/* =========================================================
   14. ADD LAYER
========================================================= */

function addLayerToProject(
  layer
) {

  const normalised =
    normaliseLayer(
      layer
    );


  currentProject.layers.push(
    normalised
  );


  currentProject.selectedLayerId =
    normalised.id;


  touchProject();


  return normalised;

}


/* =========================================================
   15. REMOVE LAYER
========================================================= */

function removeLayerFromProject(
  layerId
) {

  const index =
    currentProject.layers.findIndex(
      (layer) =>
        layer.id ===
        layerId
    );


  if (index === -1) {

    return false;

  }


  currentProject.layers.splice(
    index,
    1
  );


  if (
    currentProject.selectedLayerId ===
      layerId
  ) {

    const replacement =
      currentProject.layers[
        Math.min(
          index,
          currentProject.layers.length - 1
        )
      ] ||
      currentProject.layers[
        index - 1
      ] ||
      null;


    currentProject.selectedLayerId =
      replacement?.id ||
      null;

  }


  touchProject();


  return true;

}


/* =========================================================
   16. DUPLICATE LAYER
========================================================= */

function duplicateLayerInProject(
  layerId
) {

  const source =
    getLayerById(
      layerId
    );


  if (!source) {

    return null;

  }


  const duplicate =
    normaliseLayer({

      ...source,

      id:
        createUniqueId(
          "layer"
        ),

      name:
        `${source.name} Copy`,

      transform: {
        ...source.transform
      },

      wfs: {
        ...source.wfs
      },

      createdAt:
        new Date().toISOString()

    });


  const sourceIndex =
    currentProject.layers.findIndex(
      (layer) =>
        layer.id ===
        layerId
    );


  currentProject.layers.splice(
    sourceIndex + 1,
    0,
    duplicate
  );


  currentProject.selectedLayerId =
    duplicate.id;


  touchProject();


  return duplicate;

}


/* =========================================================
   17. MOVE / REORDER LAYER
========================================================= */

function moveLayerInProject(
  layerId,
  newIndex
) {

  const oldIndex =
    currentProject.layers.findIndex(
      (layer) =>
        layer.id ===
        layerId
    );


  if (oldIndex === -1) {

    return false;

  }


  const targetIndex =
    Math.min(
      currentProject.layers.length - 1,
      Math.max(
        0,
        Number(newIndex) || 0
      )
    );


  const [
    layer
  ] =
    currentProject.layers.splice(
      oldIndex,
      1
    );


  currentProject.layers.splice(
    targetIndex,
    0,
    layer
  );


  touchProject();


  return true;

}


/* =========================================================
   18. UPDATE LAYER
========================================================= */

function updateLayer(
  layerId,
  changes = {}
) {

  const layer =
    getLayerById(
      layerId
    );


  if (!layer) {

    return null;

  }


  if (
    "name" in changes
  ) {

    layer.name =
      String(
        changes.name || "Layer"
      );

  }


  if (
    "visible" in changes
  ) {

    layer.visible =
      Boolean(
        changes.visible
      );

  }


  if (
    "opacity" in changes
  ) {

    layer.opacity =
      clampNumber(
        changes.opacity,
        0,
        1,
        layer.opacity
      );

  }


  if (
    "depth" in changes
  ) {

    layer.depth =
      clampNumber(
        changes.depth,
        -100,
        100,
        layer.depth
      );

  }


  if (
    "xStrength" in changes
  ) {

    layer.xStrength =
      clampNumber(
        changes.xStrength,
        0,
        2,
        layer.xStrength
      );

  }


  if (
    "yStrength" in changes
  ) {

    layer.yStrength =
      clampNumber(
        changes.yStrength,
        0,
        2,
        layer.yStrength
      );

  }


  if (
    "gyroRange" in changes
  ) {

    layer.gyroRange =
      clampNumber(
        changes.gyroRange,
        10,
        90,
        layer.gyroRange
      );

  }


  if (
    changes.transform &&
    typeof changes.transform ===
      "object"
  ) {

    layer.transform = {

      ...layer.transform,

      ...changes.transform

    };

  }


  if (
    changes.wfs &&
    typeof changes.wfs ===
      "object"
  ) {

    layer.wfs = {

      ...layer.wfs,

      ...changes.wfs

    };

  }


  touchProject();


  return layer;

}


/* =========================================================
   19. PREVIEW MODE
========================================================= */

function setPreviewMode(
  mode
) {

  const allowedModes = [
    "studio",
    "real",
    "custom"
  ];


  currentProject.preview.mode =
    allowedModes.includes(
      mode
    )
      ? mode
      : "studio";


  touchProject();

}


/* =========================================================
   20. PREVIEW RESPONSE
========================================================= */

function getPreviewResponseMultiplier() {

  const preview =
    currentProject.preview;


  switch (
    preview.mode
  ) {

    case "real":

      return clampNumber(
        preview.realWatchResponse,
        0,
        1,
        PARALEASY_DEFAULT_REAL_WATCH_RESPONSE
      );


    case "custom":

      return clampNumber(
        preview.customResponse,
        0,
        2,
        0.7
      );


    case "studio":
    default:

      return clampNumber(
        preview.studioResponse,
        0,
        2,
        1
      );

  }

}


/* =========================================================
   21. SET TILT
========================================================= */

function setProjectTilt(
  tiltX,
  tiltY
) {

  currentProject.preview.tiltX =
    clampNumber(
      tiltX,
      -90,
      90,
      0
    );


  currentProject.preview.tiltY =
    clampNumber(
      tiltY,
      -90,
      90,
      0
    );

}


/* =========================================================
   22. CENTRE TILT
========================================================= */

function centreProjectTilt() {

  currentProject.preview.tiltX =
    0;


  currentProject.preview.tiltY =
    0;

}


/* =========================================================
   23. DEPTH DIRECTION
========================================================= */

function flipProjectDepthDirection() {

  currentProject.preview.depthDirection *=
    -1;


  touchProject();


  return currentProject.preview
    .depthDirection;

}


/* =========================================================
   24. SERIALISE PROJECT
========================================================= */

function serialiseProject() {

  const projectToSave = {

    ...currentProject,

    updatedAt:
      new Date().toISOString()

  };


  return JSON.stringify(
    projectToSave,
    null,
    2
  );

}


/* =========================================================
   25. LOCAL SAVE
========================================================= */

function saveProjectLocally() {

  try {

    const serialised =
      serialiseProject();


    localStorage.setItem(
      PARALEASY_STORAGE_KEY,
      serialised
    );


    return {
      ok:
        true
    };

  } catch (error) {

    console.error(
      "ParaL-Easy could not save the project.",
      error
    );


    return {
      ok:
        false,

      error
    };

  }

}


/* =========================================================
   26. LOCAL LOAD
========================================================= */

function loadProjectLocally() {

  try {

    const stored =
      localStorage.getItem(
        PARALEASY_STORAGE_KEY
      );


    if (!stored) {

      return {
        ok:
          false,

        reason:
          "empty"
      };

    }


    const parsed =
      JSON.parse(
        stored
      );


    replaceProject(
      parsed
    );


    return {
      ok:
        true,

      project:
        currentProject
    };

  } catch (error) {

    console.error(
      "ParaL-Easy could not load the saved project.",
      error
    );


    return {
      ok:
        false,

      reason:
        "invalid",

      error
    };

  }

}


/* =========================================================
   27. CLEAR LOCAL SAVE
========================================================= */

function clearLocalProjectSave() {

  try {

    localStorage.removeItem(
      PARALEASY_STORAGE_KEY
    );


    return true;

  } catch (error) {

    console.error(
      "ParaL-Easy could not clear the saved project.",
      error
    );


    return false;

  }

}


/* =========================================================
   28. DOWNLOAD PROJECT FILE
========================================================= */

function downloadProjectFile() {

  try {

    const serialised =
      serialiseProject();


    const blob =
      new Blob(
        [
          serialised
        ],
        {
          type:
            "application/json"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const safeName =
      makeSafeFileName(
        currentProject.name
      );


    const anchor =
      document.createElement(
        "a"
      );


    anchor.href =
      url;


    anchor.download =
      `${safeName}.paraleasy.json`;


    document.body.appendChild(
      anchor
    );


    anchor.click();


    anchor.remove();


    setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      0
    );


    return true;

  } catch (error) {

    console.error(
      "ParaL-Easy could not download the project.",
      error
    );


    return false;

  }

}


/* =========================================================
   29. IMPORT PROJECT FILE
========================================================= */

async function importProjectFile(
  file
) {

  if (!file) {

    throw new Error(
      "No project file selected."
    );

  }


  const text =
    await file.text();


  let parsed;


  try {

    parsed =
      JSON.parse(
        text
      );

  } catch (error) {

    throw new Error(
      "That file is not a valid ParaL-Easy project."
    );

  }


  replaceProject(
    parsed
  );


  return currentProject;

}


/* =========================================================
   30. SAFE FILE NAME
========================================================= */

function makeSafeFileName(
  value
) {

  return (
    String(
      value ||
      "paraleasy-project"
    )

      .trim()

      .toLowerCase()

      .replace(
        /[^a-z0-9]+/g,
        "-"
      )

      .replace(
        /^-+|-+$/g,
        ""
      ) ||

    "paraleasy-project"
  );

}


/* =========================================================
   31. DEBUG HELPER
========================================================= */

function logCurrentProject() {

  console.log(
    "ParaL-Easy project:",
    currentProject
  );

}
