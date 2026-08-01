import * as THREE from "three";

import { OrbitControls }
from "three/addons/controls/OrbitControls.js";

import { loadModel }
from "./model/loader.js";

import { analyseModel }
from "./model/analyser.js";

import { updateModelPanels }
from "./ui/panels.js";

import {
  drawUVLayout
}
from "./uv/renderer.js";

import {
  initialiseUVViewer
}
from "./uv/viewer.js";


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

const uvCanvas =
  document.getElementById(
    "uv-canvas"
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
   ANIMATION
========================================================= */

let animationStarted =
  false;


function animate() {

 initialiseUVViewer(
  uvCanvas
);

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


      frameModel(
        currentModel
      );

           const analysis =
        analyseModel(
          model
        );


      updateModelPanels(
        analysis
      );

            const uvRenderResult =
        drawUVLayout(
          currentModel,
          uvCanvas
        );


      console.log(
        "UV LAYOUT DRAWN:",
        uvRenderResult
      );


      console.log(
        "MODEL ANALYSIS:",
        analysis
      );


      console.log(
        `${model.name} framed and ready.`
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
