import * as THREE from "three";

import { OrbitControls }
from "three/addons/controls/OrbitControls.js";

import { loadModel }
from "./model/loader.js";

import { analyseModel }
from "./model/analyser.js";

import {
  prepareModelForPainting
}
from "./model/prepare.js";

import {
  startPaintSession
}
from "./paint/session.js";

import { updateModelPanels }
from "./ui/panels.js";

import {
  drawUVLayout,
  drawCachedUV
}
from "./uv/renderer.js";

import {
  initialiseUVViewer,
  resetUVView,
  uvView
}
from "./uv/viewer.js";

import {
  initialiseBrushControls
}
from "./ui/brush-controls.js";

import {
  analyseUVLayout
}
from "./uv/analyser.js";

import {
  registerTool,
  registerToolButton,
  activateTool,
  setToolEnabled
}
from "./tools/controller.js";

import {
  createOrbitTool
}
from "./tools/orbit.js";

import {
  createPanTool
}
from "./tools/pan.js";

import {
  createPaintTool
}
from "./tools/paint.js";


console.log(
  "PaintlessUV starting..."
);


/* =========================================================
   DOM
========================================================= */

const canvas =
  document.getElementById(
    "model-canvas"
  );

const uvCanvas =
  document.getElementById(
    "uv-canvas"
  );

const emptyState =
  document.getElementById(
    "workspace-empty-state"
  );

const viewports =
  document.getElementById(
    "paintlessuv-viewports"
  );

const openModelButton =
  document.getElementById(
    "open-model-button"
  );

const openModelTopButton =
  document.getElementById(
    "open-model-top-button"
  );

const modelFileInput =
  document.getElementById(
    "model-file-input"
  );


/* =========================================================
   LOADING SCREEN DOM
========================================================= */

const loadingScreen =
  document.getElementById(
    "loading-screen"
  );

const loadingMessage =
  document.getElementById(
    "loading-message"
  );

const loadingProgress =
  document.getElementById(
    "loading-progress"
  );

const loadingPercentage =
  document.getElementById(
    "loading-percentage"
  );


/* =========================================================
   APPLICATION STATE
========================================================= */

let currentModel =
  null;

let currentLoadedModel =
  null;

let currentAnalysis =
  null;

let currentPaintTexture =
  null;

let paintToolReady =
  false;

let loadingTimers =
  [];

let loadingSession =
  0;


/* =========================================================
   SCENE
========================================================= */

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(
    0x14111d
  );


/* =========================================================
   CAMERA
========================================================= */

const camera =
  new THREE.PerspectiveCamera(
    60,
    1,
    0.1,
    1000
  );

camera.position.set(
  0,
  1.5,
  3
);

camera.lookAt(
  0,
  0.5,
  0
);


/* =========================================================
   THREE.JS RENDERER
========================================================= */

const renderer =
  new THREE.WebGLRenderer(
    {
      canvas,
      antialias:
        true
    }
  );

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio || 1,
    2
  )
);


/* =========================================================
   ORBIT CONTROLS
========================================================= */

const controls =
  new OrbitControls(
    camera,
    renderer.domElement
  );

controls.enableDamping =
  true;

controls.dampingFactor =
  0.08;

controls.enablePan =
  true;

controls.enableZoom =
  true;

controls.target.set(
  0,
  0.5,
  0
);

controls.update();


/* =========================================================
   LIGHTING
========================================================= */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xffffff,
    0x333344,
    2.5
  );

scene.add(
  hemisphereLight
);


const directionalLight =
  new THREE.DirectionalLight(
    0xffffff,
    3
  );

directionalLight.position.set(
  4,
  6,
  5
);

scene.add(
  directionalLight
);


const fillLight =
  new THREE.DirectionalLight(
    0xa84cff,
    1.2
  );

fillLight.position.set(
  -4,
  3,
  -4
);

scene.add(
  fillLight
);


/* =========================================================
   GRID
========================================================= */

const grid =
  new THREE.GridHelper(
    10,
    20,
    0x6b4aff,
    0x333333
  );

scene.add(
  grid
);


/* =========================================================
   TEST CUBE
========================================================= */

const cube =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      1,
      1,
      1
    ),
    new THREE.MeshStandardMaterial(
      {
        color:
          0xa84cff,

        metalness:
          0.25,

        roughness:
          0.55
      }
    )
  );

cube.position.y =
  0.5;

scene.add(
  cube
);


/* =========================================================
   LOADING SCREEN
========================================================= */

const loadingStages =
  [
    {
      delay:
        0,

      percentage:
        0,

      message:
        "Opening model..."
    },

    {
      delay:
        900,

      percentage:
        18,

      message:
        "Making sure the kettle's on..."
    },

    {
      delay:
        2200,

      percentage:
        41,

      message:
        "Checking for hidden tea bags..."
    },

    {
      delay:
        4000,

      percentage:
        63,

      message:
        "Sharpening the paintbrushes..."
    },

    {
      delay:
        6200,

      percentage:
        81,

      message:
        "Putting the biscuits somewhere safe..."
    }
  ];


/**
 * Display the loading screen and begin staged progress.
 *
 * The percentages are intentionally staged rather than
 * pretending to represent exact loader progress.
 */
function showLoadingScreen() {

  if (
    !loadingScreen
  ) {

    return;

  }


  clearLoadingTimers();


  loadingSession +=
    1;


  const session =
    loadingSession;


  loadingScreen.hidden =
  false;

loadingScreen.classList.add(
  "is-visible"
);

loadingScreen.classList.remove(
  "is-hiding"
);

  loadingScreen.setAttribute(
    "aria-hidden",
    "false"
  );


  setLoadingStage(
    0,
    "Opening model..."
  );


  for (
    const stage of
    loadingStages
  ) {

    const timer =
      window.setTimeout(
        () => {

          if (
            session !==
            loadingSession
          ) {

            return;

          }


          setLoadingStage(
            stage.percentage,
            stage.message
          );

        },
        stage.delay
      );


    loadingTimers.push(
      timer
    );

  }

}


/**
 * Complete loading only when all real model work has finished.
 */
async function completeLoadingScreen() {

  clearLoadingTimers();


  setLoadingStage(
    100,
    "Ready!"
  );


  await wait(
    420
  );


  if (
    !loadingScreen
  ) {

    return;

  }


  loadingScreen.classList.add(
    "is-hiding"
  );


  await wait(
    320
  );


loadingScreen.classList.remove(
  "is-visible"
);

loadingScreen.hidden =
  true;

  loadingScreen.classList.remove(
    "is-hiding"
  );

  loadingScreen.setAttribute(
    "aria-hidden",
    "true"
  );

}


/**
 * Display an import failure before closing the overlay.
 */
async function showLoadingError(
  message =
    "Something went wrong while opening the model."
) {

  clearLoadingTimers();


  setLoadingStage(
    100,
    message
  );


  await wait(
    1300
  );


  if (
    !loadingScreen
  ) {

    return;

  }


  loadingScreen.classList.add(
    "is-hiding"
  );


  await wait(
    320
  );


  loadingScreen.hidden =
    true;

  loadingScreen.classList.remove(
  "is-visible"
);

  loadingScreen.classList.remove(
    "is-hiding"
  );

  loadingScreen.setAttribute(
    "aria-hidden",
    "true"
  );

}


function setLoadingStage(
  percentage,
  message
) {

  const safePercentage =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          percentage
        ) || 0
      )
    );


  if (
    loadingMessage
  ) {

    loadingMessage.textContent =
      message;

  }


  if (
    loadingProgress
  ) {

    loadingProgress.style.width =
      `${safePercentage}%`;

  }


  if (
    loadingPercentage
  ) {

    loadingPercentage.textContent =
      `${safePercentage}%`;

  }

}


function clearLoadingTimers() {

  for (
    const timer of
    loadingTimers
  ) {

    window.clearTimeout(
      timer
    );

  }


  loadingTimers =
    [];

}


/* =========================================================
   RESIZE
========================================================= */

function resizeRenderer() {

  const width =
    Math.max(
      1,
      canvas.clientWidth
    );

  const height =
    Math.max(
      1,
      canvas.clientHeight
    );


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();

}


window.addEventListener(
  "resize",
  resizeRenderer
);


/* =========================================================
   FRAME MODEL
========================================================= */

function frameModel(
  object
) {

  const box =
    new THREE.Box3()
      .setFromObject(
        object
      );


  if (
    box.isEmpty()
  ) {

    console.warn(
      "PaintlessUV could not calculate model bounds."
    );

    return;

  }


  const center =
    box.getCenter(
      new THREE.Vector3()
    );

  const size =
    box.getSize(
      new THREE.Vector3()
    );


  const maximumSize =
    Math.max(
      size.x,
      size.y,
      size.z
    );


  const fieldOfView =
    THREE.MathUtils.degToRad(
      camera.fov
    );


  let distance =
    maximumSize /
    (
      2 *
      Math.tan(
        fieldOfView / 2
      )
    );


  distance *=
    1.55;


  const direction =
    new THREE.Vector3(
      1,
      0.35,
      1
    ).normalize();


  camera.position.copy(
    center.clone().add(
      direction.multiplyScalar(
        distance
      )
    )
  );


  camera.near =
    Math.max(
      distance / 100,
      0.01
    );

  camera.far =
    Math.max(
      distance * 100,
      1000
    );

  camera.updateProjectionMatrix();


  controls.target.copy(
    center
  );

  controls.minDistance =
    Math.max(
      maximumSize * 0.05,
      0.01
    );

  controls.maxDistance =
    Math.max(
      maximumSize * 20,
      100
    );

  controls.update();

}


/* =========================================================
   ANIMATION LOOP
========================================================= */

let animationStarted =
  false;


function animate() {

  requestAnimationFrame(
    animate
  );


  if (
    cube.parent
  ) {

    cube.rotation.x +=
      0.004;

    cube.rotation.y +=
      0.01;

  }


  controls.update();


  renderer.render(
    scene,
    camera
  );

}

/* =========================================================
   PREPARE MODEL AND START PAINTING
========================================================= */

function prepareCurrentModel() {

  if (
    !currentLoadedModel ||
    !currentModel ||
    !currentAnalysis
  ) {

    console.warn(
      "PaintlessUV cannot start painting without a loaded model."
    );

    return;

  }


  const prepareButton =
    document.getElementById(
      "fix-model-button"
    );


  if (
    prepareButton
  ) {

    prepareButton.disabled =
      true;

    prepareButton.textContent =
      "Preparing...";

  }


  try {

    /*
     * Create the paint texture only when one has not already
     * been created during this model session.
     */

    if (
      !currentPaintTexture
    ) {

      const preparation =
        prepareModelForPainting(
          currentLoadedModel,
          currentAnalysis
        );


      console.log(
        "PREPARATION RESULT:",
        preparation
      );


      if (
        !preparation.readyToPaint
      ) {

        throw new Error(
          preparation.warnings?.[0] ||
          "The model is not ready to paint."
        );

      }


      if (
        !preparation.paintTexture
      ) {

        throw new Error(
          "PaintlessUV could not create a writable paint texture."
        );

      }


      currentPaintTexture =
        preparation.paintTexture;

    }


    /*
     * Start the brush system using the texture that was just
     * created. The visible UV canvas receives pointer input,
     * while painter.js modifies the off-screen paint texture.
     */

    const paintSessionResult =
      startPaintSession(
        {
          loadedModel:
            currentLoadedModel,

          analysis:
            currentAnalysis,

          brushCanvas:
            uvCanvas,

          paintTexture:
            currentPaintTexture
        }
      );


    if (
      !paintSessionResult.success
    ) {

      throw new Error(
        paintSessionResult.message ||
        "PaintlessUV could not start the paint session."
      );

    }


    /*
     * Update the model analysis display so it reflects the new
     * texture created by PaintlessUV.
     */

    currentAnalysis =
      {
        ...currentAnalysis,

        hasTexture:
          true,

        textures:
          Math.max(
            1,
            Number(
              currentAnalysis.textures ||
              0
            )
          ),

        readyToPaint:
          true
      };


    updateModelPanels(
      currentAnalysis
    );


    if (
      prepareButton
    ) {

      prepareButton.disabled =
        false;

      prepareButton.textContent =
        "Painting Active";

      paintToolReady =
        true;

      setToolEnabled(
        "paint",
        true
      );

      activateTool(
        "paint"
      );

      prepareButton.classList.add(
        "is-active"
      );

    }


    console.log(
      "PAINT SESSION ACTIVE:",
      paintSessionResult
    );


    console.log(
      "Drag across the UV panel to paint."
    );

  } catch (
    error
  ) {

    console.error(
      "PaintlessUV could not begin painting:",
      error
    );


    if (
      prepareButton
    ) {

      prepareButton.disabled =
        false;

      prepareButton.textContent =
        currentPaintTexture
          ? "Ready to Paint"
          : "Prepare Model";

    }

  }

}

/* =========================================================
   MODEL ANALYSIS FIX ACTIONS
========================================================= */

/*
 * The analysis panel creates its own Fix buttons dynamically.
 * Those buttons communicate through custom document events.
 */

document.addEventListener(
  "paintlessuv:fixtexture",
  () => {

    console.log("🎨 FIX TEXTURE EVENT RECEIVED");

    prepareCurrentModel();

  }
);


document.addEventListener(
  "paintlessuv:fixuv",
  (
    event
  ) => {

    const button =
      event.detail?.button;


    /*
     * UV generation is not connected yet.
     * Restore the button rather than leaving it stuck on
     * "Fixing...".
     */

    console.warn(
      "PaintlessUV UV generation has not been connected yet."
    );


    if (
      button
    ) {

      button.disabled =
        false;

      button.textContent =
        "Fix";

    }

  }
);


/* =========================================================
   OPEN MODEL
========================================================= */

function requestModelFile() {

  modelFileInput.value =
    "";

  modelFileInput.click();

}


openModelButton?.addEventListener(
  "click",
  requestModelFile
);


openModelTopButton?.addEventListener(
  "click",
  requestModelFile
);


modelFileInput?.addEventListener(
  "change",
  async (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (
      !file
    ) {

      return;

    }


    showLoadingScreen();


    /*
     * Give the browser one frame to display the overlay before
     * model parsing and UV work begin.
     */

      await wait(
        100
      );

      await waitForNextFrame();


    try {

      const model =
        await loadModel(
          file
        );


      /*
       * Remove the previously loaded model.
       */

      if (
        currentModel
      ) {

        scene.remove(
          currentModel
        );

      }


      /*
       * Remove the temporary test cube.
       */

      scene.remove(
        cube
      );


      /*
       * Store the complete loader result for later preparation,
       * painting and exporting.
       */

      currentLoadedModel =
        model;

      currentModel =
        model.scene;

      currentPaintTexture =
        null;


      scene.add(
        currentModel
      );


      frameModel(
        currentModel
      );


      /*
       * Analyse the model without silently fixing anything.
       */

      currentAnalysis =
  analyseModel(
    currentLoadedModel
  );


      const uvAnalysis =
        analyseUVLayout(
          currentModel
        );


      console.log(
        "UV ANALYSIS:",
        uvAnalysis
      );


      updateModelPanels(
        currentAnalysis
      );

      const prepareButton =
        document.getElementById(
          "fix-model-button"
      );

    if (
        prepareButton
      ) {

        prepareButton.onclick =
          prepareCurrentModel;

      }


      /*
       * Reset and build the cached UV layout.
       */

      resetUVView();


      const uvRenderResult =
        drawUVLayout(
          currentModel,
          uvCanvas
        );


      drawCachedUV(
        uvCanvas,
        uvView
      );


      console.log(
        "MODEL LOADED:",
        model
      );


      console.log(
        "MODEL ANALYSIS:",
        currentAnalysis
      );


      console.log(
        "UV LAYOUT DRAWN:",
        uvRenderResult
      );


      await completeLoadingScreen();

      emptyState.hidden =
        true;

      emptyState.classList.add(
      "is-hidden"
      );

      viewports.hidden =
      false;

      resizeRenderer();

    } catch (
      error
    ) {

      console.error(
        "PaintlessUV model load failed:",
        error
      );


      await showLoadingError(
        "The model refused to cooperate."
      );

    }

  }
);


/* =========================================================
   START APPLICATION
========================================================= */

function startPaintlessUV() {

  if (
    !canvas ||
    !uvCanvas ||
    !emptyState ||
    !viewports ||
    !modelFileInput
  ) {

    console.error(
      "PaintlessUV could not find the required interface elements."
    );

    return;

  }


  /*
   * Prevent the loading overlay appearing before a model
   * has actually been selected.
   */

  if (
    loadingScreen
  ) {

    loadingScreen.hidden =
      true;

    loadingScreen.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  emptyState.hidden =
  false;

emptyState.classList.remove(
  "is-hidden"
);

viewports.hidden =
  true;

  registerTool(
  "orbit",
  createOrbitTool(
    controls
  )
);

registerTool(
  "pan",
  createPanTool(
    controls
  )
);

  registerTool(
  "paint",
  createPaintTool(
    {
      canvas:
        canvas,

      camera:
        camera,

      controls:
        controls,

      getModel() {

        return currentModel;

      }

    }
  )
);


registerToolButton(
  "orbit",
  '[data-tool="orbit"]'
);

registerToolButton(
  "pan",
  '[data-tool="pan"]'
);

  registerToolButton(
  "paint",
  '[data-tool="brush"]'
);


activateTool(
  "orbit"
);

  setToolEnabled(
  "paint",
  false
);

  initialiseBrushControls();


  /*
   * Initialise the cached UV viewer once.
   */

  initialiseUVViewer(
    uvCanvas,
    () => {

      drawCachedUV(
        uvCanvas,
        uvView
      );

    }
  );


  requestAnimationFrame(
    () => {

      resizeRenderer();


      if (
        !animationStarted
      ) {

        animationStarted =
          true;

        animate();

      }

    }
  );

}


function wait(
  milliseconds
) {

  return new Promise(
    (
      resolve
    ) => {

      window.setTimeout(
        resolve,
        milliseconds
      );

    }
  );

}


function waitForNextFrame() {

  return new Promise(
    (
      resolve
    ) => {

      requestAnimationFrame(
        () => {

          resolve();

        }
      );

    }
  );

}


startPaintlessUV();
