"use strict";


/* =========================================================
   ParaL-Easy
   LIVE PARALLAX PREVIEW ENGINE
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const parallaxCanvas =
  document.querySelector(
    "#parallax-canvas"
  );

const parallaxContext =
  parallaxCanvas?.getContext(
    "2d"
  );

const watchDisplay =
  document.querySelector(
    "#watch-display"
  );

const canvasEmptyState =
  document.querySelector(
    "#canvas-empty-state"
  );

const tiltPad =
  document.querySelector(
    "#tilt-pad"
  );

const tiltPuck =
  document.querySelector(
    "#tilt-puck"
  );

const tiltXValue =
  document.querySelector(
    "#tilt-x-value"
  );

const tiltYValue =
  document.querySelector(
    "#tilt-y-value"
  );

const centreTiltButton =
  document.querySelector(
    "#centre-tilt-btn"
  );

const flipDepthButton =
  document.querySelector(
    "#flip-depth-btn"
  );


/* =========================================================
   2. ENGINE CONSTANTS
========================================================= */

/*
 * Depth is stored as:
 *
 * -100 = deepest into the watch
 *    0 = neutral
 * +100 = strongest out-of-watch movement
 *
 * This constant converts depth into a useful maximum movement
 * in canvas pixels at full Studio preview response.
 */

const PARALEASY_MAX_PARALLAX_PIXELS =
  72;


/*
 * Slight scale compensation prevents moving foreground layers
 * from revealing transparent edges too easily.
 */

const PARALEASY_MAX_SCALE_COMPENSATION =
  0.035;


/*
 * Maximum mouse / touch preview angle.
 *
 * Each layer still has its own gyroRange setting.
 */

const PARALEASY_PREVIEW_TILT_LIMIT =
  45;


/*
 * A little smoothing makes the watch feel less like a raw
 * mouse-drag demo and more like physical movement.
 */

const PARALEASY_TILT_SMOOTHING =
  0.18;


/* =========================================================
   3. RENDER STATE
========================================================= */

let targetTiltX =
  0;

let targetTiltY =
  0;

let renderedTiltX =
  0;

let renderedTiltY =
  0;

let parallaxAnimationFrame =
  null;

let previewDragging =
  false;

let previewPointerId =
  null;


/* =========================================================
   4. INITIAL CANVAS SIZE
========================================================= */

function syncParallaxCanvasSize() {

  if (
    !parallaxCanvas
  ) {
    return;
  }


  const project =
    getProject();


  const width =
    Math.max(
      1,
      Math.round(
        Number(
          project.canvas.width
        ) || 450
      )
    );


  const height =
    Math.max(
      1,
      Math.round(
        Number(
          project.canvas.height
        ) || 450
      )
    );


  if (
    parallaxCanvas.width !==
      width
  ) {

    parallaxCanvas.width =
      width;

  }


  if (
    parallaxCanvas.height !==
      height
  ) {

    parallaxCanvas.height =
      height;

  }

}


/* =========================================================
   5. MAIN RENDER
========================================================= */

function renderParallaxPreview() {

  if (
    !parallaxCanvas ||
    !parallaxContext
  ) {
    return;
  }


  syncParallaxCanvasSize();


  const project =
    getProject();


  parallaxContext.clearRect(
    0,
    0,
    parallaxCanvas.width,
    parallaxCanvas.height
  );


  if (
    project.layers.length === 0
  ) {

    if (
      canvasEmptyState
    ) {

      canvasEmptyState.hidden =
        false;

    }


    return;

  }


  if (
    canvasEmptyState
  ) {

    canvasEmptyState.hidden =
      true;

  }


  const responseMultiplier =
    getPreviewResponseMultiplier();


  /*
   * Painter order:
   *
   * project.layers[0] = back
   * final layer       = front
   */

  for (
    const layer
    of project.layers
  ) {

    if (
      !layer.visible ||
      layer.opacity <= 0
    ) {
      continue;
    }


    renderParallaxLayer(
      layer,
      responseMultiplier
    );

  }

}


/* =========================================================
   6. RENDER ONE LAYER
========================================================= */

function renderParallaxLayer(
  layer,
  responseMultiplier
) {

  const image =
    getCachedLayerImage(
      layer.id
    );


  if (
    !image ||
    !image.complete
  ) {
    return;
  }


  const movement =
    calculateLayerMovement(
      layer,
      responseMultiplier
    );


  const sourceWidth =
    image.naturalWidth ||
    image.width;

  const sourceHeight =
    image.naturalHeight ||
    image.height;


  if (
    !sourceWidth ||
    !sourceHeight
  ) {
    return;
  }


  /*
   * Images are fitted inside the project canvas while
   * preserving their aspect ratio.
   *
   * This makes full 450x450 layers line up naturally, while
   * smaller transparent foreground objects also remain usable.
   */

  const baseScale =
    Math.min(
      parallaxCanvas.width /
        sourceWidth,

      parallaxCanvas.height /
        sourceHeight
    );


  const parallaxScale =
    calculateScaleCompensation(
      layer,
      movement
    );


  const userScale =
    Number(
      layer.transform?.scale
    ) || 1;


  const finalScale =
    baseScale *
    parallaxScale *
    userScale;


  const drawWidth =
    sourceWidth *
    finalScale;

  const drawHeight =
    sourceHeight *
    finalScale;


  const centreX =
    parallaxCanvas.width / 2;

  const centreY =
    parallaxCanvas.height / 2;


  const baseX =
    Number(
      layer.transform?.x
    ) || 0;

  const baseY =
    Number(
      layer.transform?.y
    ) || 0;

  const rotation =
    Number(
      layer.transform?.rotation
    ) || 0;


  parallaxContext.save();


  parallaxContext.globalAlpha =
    clampNumber(
      layer.opacity,
      0,
      1,
      1
    );


  parallaxContext.translate(
    centreX +
      baseX +
      movement.x,

    centreY +
      baseY +
      movement.y
  );


  parallaxContext.rotate(
    rotation *
      Math.PI /
      180
  );


  parallaxContext.drawImage(
    image,

    -drawWidth / 2,
    -drawHeight / 2,

    drawWidth,
    drawHeight
  );


  parallaxContext.restore();

}


/* =========================================================
   7. CALCULATE LAYER MOVEMENT
========================================================= */

function calculateLayerMovement(
  layer,
  responseMultiplier = 1
) {

  const project =
    getProject();


  const depthDirection =
    Number(
      project.preview
        .depthDirection
    ) || 1;


  const depth =
    clampNumber(
      layer.depth,
      -100,
      100,
      0
    );


  const signedDepth =
    depth *
    depthDirection;


  /*
   * Convert -100..100 to -1..1.
   */

  const normalisedDepth =
    signedDepth / 100;


  const xStrength =
    clampNumber(
      layer.xStrength,
      0,
      2,
      1
    );


  const yStrength =
    clampNumber(
      layer.yStrength,
      0,
      2,
      1
    );


  const gyroRange =
    clampNumber(
      layer.gyroRange,
      10,
      90,
      45
    );


  /*
   * How far through this layer's configured gyro range the
   * current preview tilt has travelled.
   */

  const xTiltRatio =
    clampNumber(
      renderedTiltX /
        gyroRange,
      -1,
      1,
      0
    );


  const yTiltRatio =
    clampNumber(
      renderedTiltY /
        gyroRange,
      -1,
      1,
      0
    );


  const maxMovement =
    PARALEASY_MAX_PARALLAX_PIXELS *
    Math.abs(
      normalisedDepth
    );


  /*
   * Positive depth:
   * layer travels with preview direction.
   *
   * Negative depth:
   * layer travels opposite the preview direction.
   *
   * Flip Depth reverses all layers globally.
   */

  const direction =
    normalisedDepth === 0
      ? 0
      : Math.sign(
          normalisedDepth
        );


  const x =
    xTiltRatio *
    maxMovement *
    direction *
    xStrength *
    responseMultiplier;


  /*
   * Screen Y coordinates grow downward.
   *
   * Negating Y here makes upward wrist tilt feel visually
   * natural in the preview.
   */

  const y =
    -yTiltRatio *
    maxMovement *
    direction *
    yStrength *
    responseMultiplier;


  return {
    x,
    y,

    normalisedDepth,
    xTiltRatio,
    yTiltRatio
  };

}


/* =========================================================
   8. SCALE COMPENSATION
========================================================= */

function calculateScaleCompensation(
  layer,
  movement
) {

  const depthAmount =
    Math.abs(
      movement.normalisedDepth
    );


  if (
    depthAmount <= 0
  ) {
    return 1;
  }


  const movementStrength =
    Math.max(
      Math.abs(
        movement.xTiltRatio
      ),
      Math.abs(
        movement.yTiltRatio
      )
    );


  const extraScale =
    PARALEASY_MAX_SCALE_COMPENSATION *
    depthAmount *
    movementStrength;


  return (
    1 +
    extraScale
  );

}


/* =========================================================
   9. SET TARGET TILT
========================================================= */

function setPreviewTiltTarget(
  tiltX,
  tiltY
) {

  targetTiltX =
    clampNumber(
      tiltX,
      -PARALEASY_PREVIEW_TILT_LIMIT,
      PARALEASY_PREVIEW_TILT_LIMIT,
      0
    );


  targetTiltY =
    clampNumber(
      tiltY,
      -PARALEASY_PREVIEW_TILT_LIMIT,
      PARALEASY_PREVIEW_TILT_LIMIT,
      0
    );


  setProjectTilt(
    targetTiltX,
    targetTiltY
  );


  updateTiltReadout();

  updateTiltPuck();

}


/* =========================================================
   10. CENTRE TILT
========================================================= */

function centrePreviewTilt() {

  targetTiltX =
    0;

  targetTiltY =
    0;


  renderedTiltX =
    0;

  renderedTiltY =
    0;


  centreProjectTilt();


  updateTiltReadout();

  updateTiltPuck();

  renderParallaxPreview();

}


/* =========================================================
   11. TILT READOUT
========================================================= */

function updateTiltReadout() {

  if (
    tiltXValue
  ) {

    tiltXValue.textContent =
      formatSignedDegrees(
        targetTiltX
      );

  }


  if (
    tiltYValue
  ) {

    tiltYValue.textContent =
      formatSignedDegrees(
        targetTiltY
      );

  }

}


/* =========================================================
   12. SIGNED DEGREES
========================================================= */

function formatSignedDegrees(
  value
) {

  const rounded =
    Math.round(
      Number(value) || 0
    );


  if (
    rounded > 0
  ) {

    return (
      `+${rounded}°`
    );

  }


  return (
    `${rounded}°`
  );

}


/* =========================================================
   13. UPDATE TILT PUCK
========================================================= */

function updateTiltPuck() {

  if (
    !tiltPuck
  ) {
    return;
  }


  const xRatio =
    targetTiltX /
    PARALEASY_PREVIEW_TILT_LIMIT;


  const yRatio =
    targetTiltY /
    PARALEASY_PREVIEW_TILT_LIMIT;


  const xPercent =
    50 +
    xRatio * 44;


  const yPercent =
    50 +
    yRatio * 40;


  tiltPuck.style.left =
    `${xPercent}%`;


  tiltPuck.style.top =
    `${yPercent}%`;

}


/* =========================================================
   14. POINTER -> TILT
========================================================= */

function updateTiltFromPointer(
  event,
  surface
) {

  if (
    !surface
  ) {
    return;
  }


  const rect =
    surface.getBoundingClientRect();


  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }


  const localX =
    clampNumber(
      event.clientX -
        rect.left,
      0,
      rect.width,
      rect.width / 2
    );


  const localY =
    clampNumber(
      event.clientY -
        rect.top,
      0,
      rect.height,
      rect.height / 2
    );


  const normalisedX =
    (
      localX /
      rect.width
    ) *
    2 -
    1;


  const normalisedY =
    (
      localY /
      rect.height
    ) *
    2 -
    1;


  const tiltX =
    normalisedX *
    PARALEASY_PREVIEW_TILT_LIMIT;


  const tiltY =
    normalisedY *
    PARALEASY_PREVIEW_TILT_LIMIT;


  setPreviewTiltTarget(
    tiltX,
    tiltY
  );

}


/* =========================================================
   15. START POINTER DRAG
========================================================= */

function startPreviewDrag(
  event,
  surface
) {

  if (
    previewDragging
  ) {
    return;
  }


  previewDragging =
    true;


  previewPointerId =
    event.pointerId;


  surface.setPointerCapture?.(
    event.pointerId
  );


  updateTiltFromPointer(
    event,
    surface
  );

}


/* =========================================================
   16. MOVE POINTER DRAG
========================================================= */

function movePreviewDrag(
  event,
  surface
) {

  if (
    !previewDragging ||
    event.pointerId !==
      previewPointerId
  ) {
    return;
  }


  updateTiltFromPointer(
    event,
    surface
  );

}


/* =========================================================
   17. END POINTER DRAG
========================================================= */

function endPreviewDrag(
  event,
  surface
) {

  if (
    !previewDragging
  ) {
    return;
  }


  if (
    previewPointerId !==
      null &&
    event.pointerId !==
      previewPointerId
  ) {
    return;
  }


  surface.releasePointerCapture?.(
    event.pointerId
  );


  previewDragging =
    false;


  previewPointerId =
    null;

}


/* =========================================================
   18. INITIALISE TILT PAD
========================================================= */

function initialiseTiltPad() {

  if (
    !tiltPad
  ) {
    return;
  }


  tiltPad.addEventListener(
    "pointerdown",
    (
      event
    ) => {

      event.preventDefault();


      startPreviewDrag(
        event,
        tiltPad
      );

    }
  );


  tiltPad.addEventListener(
    "pointermove",
    (
      event
    ) => {

      movePreviewDrag(
        event,
        tiltPad
      );

    }
  );


  tiltPad.addEventListener(
    "pointerup",
    (
      event
    ) => {

      endPreviewDrag(
        event,
        tiltPad
      );

    }
  );


  tiltPad.addEventListener(
    "pointercancel",
    (
      event
    ) => {

      endPreviewDrag(
        event,
        tiltPad
      );

    }
  );

}


/* =========================================================
   19. WATCH DISPLAY DRAG
========================================================= */

function initialiseWatchDisplayTilt() {

  if (
    !watchDisplay
  ) {
    return;
  }


  watchDisplay.style.touchAction =
    "none";


  watchDisplay.addEventListener(
    "pointerdown",
    (
      event
    ) => {

      event.preventDefault();


      startPreviewDrag(
        event,
        watchDisplay
      );

    }
  );


  watchDisplay.addEventListener(
    "pointermove",
    (
      event
    ) => {

      movePreviewDrag(
        event,
        watchDisplay
      );

    }
  );


  watchDisplay.addEventListener(
    "pointerup",
    (
      event
    ) => {

      endPreviewDrag(
        event,
        watchDisplay
      );

    }
  );


  watchDisplay.addEventListener(
    "pointercancel",
    (
      event
    ) => {

      endPreviewDrag(
        event,
        watchDisplay
      );

    }
  );

}


/* =========================================================
   20. FLIP DEPTH
========================================================= */

function flipPreviewDepth() {

  const direction =
    flipProjectDepthDirection();


  renderParallaxPreview();


  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:depthflipped",
      {
        detail: {
          direction
        }
      }
    )
  );


  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:status",
      {
        detail: {
          message:
            direction > 0
              ? "Depth direction: Out of Watch"
              : "Depth direction: Into Watch"
        }
      }
    )
  );

}


/* =========================================================
   21. BUTTON EVENTS
========================================================= */

function initialiseParallaxButtons() {

  centreTiltButton?.addEventListener(
    "click",
    () => {

      centrePreviewTilt();

    }
  );


  flipDepthButton?.addEventListener(
    "click",
    () => {

      flipPreviewDepth();

    }
  );

}


/* =========================================================
   22. ANIMATION LOOP
========================================================= */

function animateParallaxPreview() {

  renderedTiltX +=
    (
      targetTiltX -
      renderedTiltX
    ) *
    PARALEASY_TILT_SMOOTHING;


  renderedTiltY +=
    (
      targetTiltY -
      renderedTiltY
    ) *
    PARALEASY_TILT_SMOOTHING;


  /*
   * Avoid endless microscopic interpolation.
   */

  if (
    Math.abs(
      targetTiltX -
      renderedTiltX
    ) <
    0.001
  ) {

    renderedTiltX =
      targetTiltX;

  }


  if (
    Math.abs(
      targetTiltY -
      renderedTiltY
    ) <
    0.001
  ) {

    renderedTiltY =
      targetTiltY;

  }


  renderParallaxPreview();


  parallaxAnimationFrame =
    requestAnimationFrame(
      animateParallaxPreview
    );

}


/* =========================================================
   23. START ENGINE
========================================================= */

function startParallaxEngine() {

  if (
    parallaxAnimationFrame !==
      null
  ) {
    return;
  }


  parallaxAnimationFrame =
    requestAnimationFrame(
      animateParallaxPreview
    );

}


/* =========================================================
   24. STOP ENGINE
========================================================= */

function stopParallaxEngine() {

  if (
    parallaxAnimationFrame ===
      null
  ) {
    return;
  }


  cancelAnimationFrame(
    parallaxAnimationFrame
  );


  parallaxAnimationFrame =
    null;

}


/* =========================================================
   25. RESTORE PROJECT TILT
========================================================= */

function restoreProjectTiltToEngine() {

  const preview =
    getProject().preview;


  targetTiltX =
    clampNumber(
      preview.tiltX,
      -PARALEASY_PREVIEW_TILT_LIMIT,
      PARALEASY_PREVIEW_TILT_LIMIT,
      0
    );


  targetTiltY =
    clampNumber(
      preview.tiltY,
      -PARALEASY_PREVIEW_TILT_LIMIT,
      PARALEASY_PREVIEW_TILT_LIMIT,
      0
    );


  renderedTiltX =
    targetTiltX;


  renderedTiltY =
    targetTiltY;


  updateTiltReadout();

  updateTiltPuck();

}


/* =========================================================
   26. EXTERNAL EVENT LISTENERS
========================================================= */

function initialiseParallaxEngineEvents() {

  window.addEventListener(
    "paraleasy:layerschanged",
    () => {

      renderParallaxPreview();

    }
  );


  window.addEventListener(
    "paraleasy:selectionchanged",
    () => {

      renderParallaxPreview();

    }
  );


  window.addEventListener(
    "paraleasy:projectloaded",
    () => {

      restoreProjectTiltToEngine();

      renderParallaxPreview();

    }
  );


  window.addEventListener(
    "resize",
    () => {

      renderParallaxPreview();

    }
  );

}


/* =========================================================
   27. INITIALISE ENGINE
========================================================= */

function initialiseParallaxEngine() {

  if (
    !parallaxCanvas ||
    !parallaxContext
  ) {

    console.error(
      "ParaL-Easy could not find the parallax canvas."
    );

    return;

  }


  initialiseTiltPad();

  initialiseWatchDisplayTilt();

  initialiseParallaxButtons();

  initialiseParallaxEngineEvents();

  restoreProjectTiltToEngine();

  renderParallaxPreview();

  startParallaxEngine();

}


/* =========================================================
   28. AUTO START
========================================================= */

if (
  document.readyState ===
    "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialiseParallaxEngine
  );

} else {

  initialiseParallaxEngine();

}
