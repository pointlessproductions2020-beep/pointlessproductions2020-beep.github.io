import * as THREE from "three";
import { loadModel } from "./model/loader.js";

console.log("PaintlessUV starting...");


/* =========================================================
   DOM
========================================================= */

const canvas =
  document.getElementById(
    "model-canvas"
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

let currentModel =
  null;


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
   RENDERER
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
   LIGHTING
========================================================= */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xffffff,
    0x222233,
    2
  );

scene.add(
  hemisphereLight
);


const directionalLight =
  new THREE.DirectionalLight(
    0xffffff,
    2
  );

directionalLight.position.set(
  4,
  5,
  3
);

scene.add(
  directionalLight
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
   ANIMATION
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

  renderer.render(
    scene,
    camera
  );

}


/* =========================================================
   OPEN MODEL
========================================================= */

function requestModelFile() {

  console.log(
    "OPEN BUTTON CLICKED!"
  );

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
  async (event) => {

    console.log(
      "FILE SELECTED!"
    );

    const file =
      event.target.files?.[0];

    if (!file) {

      return;

    }

    console.log(
      file
    );

    try {

      const model =
        await loadModel(
          file
        );

      console.log(
        "MODEL LOADED!",
        model
      );

      if (
        currentModel
      ) {

        scene.remove(
          currentModel
        );

      }

      scene.remove(
        cube
      );

      currentModel =
        model.scene;

      scene.add(
        currentModel
      );

    } catch (error) {

      console.error(
        "PaintlessUV model load failed:",
        error
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
    !emptyState ||
    !viewports ||
    !modelFileInput
  ) {

    console.error(
      "PaintlessUV could not find the required interface elements."
    );

    return;

  }

  emptyState.hidden =
    true;

  emptyState.classList.add(
    "is-hidden"
  );

  viewports.hidden =
    false;

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


console.log(
  "Binding Open Model buttons..."
);

startPaintlessUV();
