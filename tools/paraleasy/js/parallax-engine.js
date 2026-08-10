"use strict";

/* =========================================================
   ParaL-Easy V2
   PHYSICAL WATCH + PARALLAX PREVIEW ENGINE
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const parallaxCanvas =
  document.querySelector("#parallax-canvas");

const parallaxContext =
  parallaxCanvas?.getContext("2d");

const watchDisplay =
  document.querySelector("#watch-display");

const canvasEmptyState =
  document.querySelector("#canvas-empty-state");

const tiltPad =
  document.querySelector("#tilt-pad");

const tiltPuck =
  document.querySelector("#tilt-puck");

const tiltXValue =
  document.querySelector("#tilt-x-value");

const tiltYValue =
  document.querySelector("#tilt-y-value");

const centreTiltButton =
  document.querySelector("#centre-tilt-btn");

const flipDepthButton =
  document.querySelector("#flip-depth-btn");

/*
 * These do not exist in the old HTML yet.
 * That's intentional.
 *
 * Once we add them in the next step, the engine automatically
 * starts using them.
 */

const springToggle =
  document.querySelector("#spring-centre-toggle");

const watchTiltShell =
  document.querySelector("#watch-tilt-shell") ||
  watchDisplay;

const watchGlass =
  document.querySelector("#watch-glass");


/* =========================================================
   2. ENGINE CONSTANTS
========================================================= */

const PARALEASY_MAX_PARALLAX_PIXELS = 72;

const PARALEASY_MAX_SCALE_COMPENSATION = 0.035;

/*
 * The design control can represent ±45°.
 *
 * The physical CSS watch does NOT rotate a ridiculous 45°
 * because that would look like somebody snapped their wrist.
 */

const PARALEASY_PREVIEW_TILT_LIMIT = 45;

const PARALEASY_PHYSICAL_WATCH_MAX_ROTATION = 14;

/*
 * Pointer target smoothing.
 */

const PARALEASY_TILT_SMOOTHING = 0.16;

/*
 * Spring behaviour.
 */

const PARALEASY_SPRING_STRENGTH = 0.105;
const PARALEASY_SPRING_DAMPING = 0.78;


/* =========================================================
   3. ENGINE STATE
========================================================= */

let targetTiltX = 0;
let targetTiltY = 0;

let renderedTiltX = 0;
let renderedTiltY = 0;

let springVelocityX = 0;
let springVelocityY = 0;

let parallaxAnimationFrame = null;

let previewDragging = false;
let previewPointerId = null;

/*
 * ON by default.
 *
 * Later the HTML toggle controls this.
 */

let springToCentre = true;


/* =========================================================
   4. CANVAS SIZE
========================================================= */

function syncParallaxCanvasSize() {

  if (!parallaxCanvas) {
    return;
  }

  const project =
    getProject();

  const width =
    Math.max(
      1,
      Math.round(
        Number(project.canvas.width) || 450
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        Number(project.canvas.height) || 450
      )
    );

  if (parallaxCanvas.width !== width) {
    parallaxCanvas.width = width;
  }

  if (parallaxCanvas.height !== height) {
    parallaxCanvas.height = height;
  }

}


/* =========================================================
   5. MAIN CANVAS RENDER
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

  if (project.layers.length === 0) {

    if (canvasEmptyState) {
      canvasEmptyState.hidden = false;
    }

    updatePhysicalWatch();

    return;
  }

  if (canvasEmptyState) {
    canvasEmptyState.hidden = true;
  }

  const responseMultiplier =
    getPreviewResponseMultiplier();

  /*
   * Normal painter order:
   * back → front.
   */

  for (const layer of project.layers) {

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

  updatePhysicalWatch();

}


/* =========================================================
   6. RENDER ONE LAYER
========================================================= */

function renderParallaxLayer(
  layer,
  responseMultiplier
) {

  const image =
    getCachedLayerImage(layer.id);

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

  const baseScale =
    Math.min(
      parallaxCanvas.width / sourceWidth,
      parallaxCanvas.height / sourceHeight
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
   7. PHYSICAL PARALLAX MODEL
========================================================= */

function calculateLayerMovement(
  layer,
  responseMultiplier = 1
) {

  const project =
    getProject();

  const depthDirection =
    Number(
      project.preview.depthDirection
    ) || 1;

  const depth =
    clampNumber(
      layer.depth,
      -100,
      100,
      0
    );

  /*
   * Flip Depth changes DEPTH interpretation only.
   *
   * It does not change which way the physical watch tilts.
   */

  const effectiveDepth =
    depth *
    depthDirection;

  const normalisedDepth =
    effectiveDepth / 100;

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

  const xTiltRatio =
    clampNumber(
      renderedTiltX / gyroRange,
      -1,
      1,
      0
    );

  const yTiltRatio =
    clampNumber(
      renderedTiltY / gyroRange,
      -1,
      1,
      0
    );

  /*
   * Depth magnitude determines how much it moves.
   */

  const movementMagnitude =
    PARALEASY_MAX_PARALLAX_PIXELS *
    Math.abs(normalisedDepth);

  /*
   * IMPORTANT V2 CHANGE
   * -------------------------------------------------------
   *
   * We're treating the screen like a window into the watch.
   *
   * When the physical watch tilts RIGHT, an object sitting
   * deeper behind the glass appears to shift LEFT.
   *
   * A layer projected toward the viewer does the opposite.
   *
   * Both axes now follow the SAME physical rule.
   */

  const depthSign =
    normalisedDepth === 0
      ? 0
      : Math.sign(normalisedDepth);

  const x =
    -xTiltRatio *
    movementMagnitude *
    depthSign *
    xStrength *
    responseMultiplier;

  const y =
    -yTiltRatio *
    movementMagnitude *
    depthSign *
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

  if (depthAmount <= 0) {
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

  return 1 + extraScale;

}


/* =========================================================
   9. PHYSICAL WATCH TRANSFORM
========================================================= */

function updatePhysicalWatch() {

  if (!watchTiltShell) {
    return;
  }

  const xRatio =
    clampNumber(
      renderedTiltX /
        PARALEASY_PREVIEW_TILT_LIMIT,
      -1,
      1,
      0
    );

  const yRatio =
    clampNumber(
      renderedTiltY /
        PARALEASY_PREVIEW_TILT_LIMIT,
      -1,
      1,
      0
    );

  /*
   * Horizontal pointer movement controls rotateY.
   *
   * Vertical pointer movement controls rotateX.
   *
   * CSS rotateX needs the vertical sign reversed to make
   * dragging upward feel like lifting the top of the watch.
   */

  const rotateY =
    xRatio *
    PARALEASY_PHYSICAL_WATCH_MAX_ROTATION;

  const rotateX =
    -yRatio *
    PARALEASY_PHYSICAL_WATCH_MAX_ROTATION;

  /*
   * When we add #watch-tilt-shell in HTML this transform
   * applies to the complete watch.
   *
   * Until then it applies to the existing watchDisplay.
   */

  watchTiltShell.style.transform =
    `perspective(1100px) ` +
    `rotateX(${rotateX}deg) ` +
    `rotateY(${rotateY}deg)`;

  watchTiltShell.style.transformStyle =
    "preserve-3d";

  /*
   * CSS custom properties let the upcoming CSS drive:
   *
   * glass glare
   * bezel highlights
   * shadow
   * rim lighting
   */

  watchTiltShell.style.setProperty(
    "--watch-tilt-x",
    String(xRatio)
  );

  watchTiltShell.style.setProperty(
    "--watch-tilt-y",
    String(yRatio)
  );

  watchTiltShell.style.setProperty(
    "--watch-rotate-x",
    `${rotateX}deg`
  );

  watchTiltShell.style.setProperty(
    "--watch-rotate-y",
    `${rotateY}deg`
  );

  updateGlassReflection(
    xRatio,
    yRatio
  );

}


/* =========================================================
   10. GLASS REFLECTION POSITION
========================================================= */

function updateGlassReflection(
  xRatio,
  yRatio
) {

  if (!watchGlass) {
    return;
  }

  const glareX =
    50 -
    xRatio * 32;

  const glareY =
    50 -
    yRatio * 28;

  watchGlass.style.setProperty(
    "--glare-x",
    `${glareX}%`
  );

  watchGlass.style.setProperty(
    "--glare-y",
    `${glareY}%`
  );

}


/* =========================================================
   11. SET TARGET TILT
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

  /*
   * User interaction cancels residual spring momentum.
   */

  if (previewDragging) {
    springVelocityX = 0;
    springVelocityY = 0;
  }

  setProjectTilt(
    targetTiltX,
    targetTiltY
  );

  updateTiltReadout();

  updateTiltPuck();

}


/* =========================================================
   12. CENTRE IMMEDIATELY
========================================================= */

function centrePreviewTilt() {

  targetTiltX = 0;
  targetTiltY = 0;

  renderedTiltX = 0;
  renderedTiltY = 0;

  springVelocityX = 0;
  springVelocityY = 0;

  centreProjectTilt();

  updateTiltReadout();

  updateTiltPuck();

  renderParallaxPreview();

}


/* =========================================================
   13. BEGIN SPRING RETURN
========================================================= */

function springPreviewToCentre() {

  targetTiltX = 0;
  targetTiltY = 0;

  setProjectTilt(
    0,
    0
  );

  updateTiltReadout();
  updateTiltPuck();

}


/* =========================================================
   14. SPRING SETTING
========================================================= */

function setSpringToCentre(
  enabled
) {

  springToCentre =
    Boolean(enabled);

  if (springToggle) {

    if (
      springToggle instanceof
      HTMLInputElement
    ) {
      springToggle.checked =
        springToCentre;
    }

    springToggle.setAttribute(
      "aria-pressed",
      String(springToCentre)
    );

  }

  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:status",
      {
        detail: {
          message:
            springToCentre
              ? "Spring to Centre: On"
              : "Spring to Centre: Off"
        }
      }
    )
  );

}


/* =========================================================
   15. TOGGLE SPRING
========================================================= */

function toggleSpringToCentre() {

  setSpringToCentre(
    !springToCentre
  );

}


/* =========================================================
   16. TILT READOUT
========================================================= */

function updateTiltReadout() {

  if (tiltXValue) {

    tiltXValue.textContent =
      formatSignedDegrees(
        targetTiltX
      );

  }

  if (tiltYValue) {

    tiltYValue.textContent =
      formatSignedDegrees(
        targetTiltY
      );

  }

}


/* =========================================================
   17. SIGNED DEGREES
========================================================= */

function formatSignedDegrees(
  value
) {

  const rounded =
    Math.round(
      Number(value) || 0
    );

  if (rounded > 0) {
    return `+${rounded}°`;
  }

  return `${rounded}°`;

}


/* =========================================================
   18. TILT PUCK
========================================================= */

function updateTiltPuck() {

  if (!tiltPuck) {
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
   19. POINTER -> PHYSICAL TILT
========================================================= */

function updateTiltFromPointer(
  event,
  surface
) {

  if (!surface) {
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
      event.clientX - rect.left,
      0,
      rect.width,
      rect.width / 2
    );

  const localY =
    clampNumber(
      event.clientY - rect.top,
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
   20. START DRAG
========================================================= */

function startPreviewDrag(
  event,
  surface
) {

  if (previewDragging) {
    return;
  }

  previewDragging = true;

  previewPointerId =
    event.pointerId;

  springVelocityX = 0;
  springVelocityY = 0;

  surface.setPointerCapture?.(
    event.pointerId
  );

  updateTiltFromPointer(
    event,
    surface
  );

}


/* =========================================================
   21. MOVE DRAG
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
   22. END DRAG
========================================================= */

function endPreviewDrag(
  event,
  surface
) {

  if (!previewDragging) {
    return;
  }

  if (
    previewPointerId !== null &&
    event.pointerId !==
      previewPointerId
  ) {
    return;
  }

  surface.releasePointerCapture?.(
    event.pointerId
  );

  previewDragging = false;
  previewPointerId = null;

  /*
   * THIS is the V2 behaviour.
   *
   * Release either the puck or watch:
   *
   * ON  → return naturally to centre.
   * OFF → hold the inspection angle.
   */

  if (springToCentre) {
    springPreviewToCentre();
  }

}


/* =========================================================
   23. INITIALISE TILT PAD
========================================================= */

function initialiseTiltPad() {

  if (!tiltPad) {
    return;
  }

  tiltPad.style.touchAction =
    "none";

  tiltPad.addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();

      startPreviewDrag(
        event,
        tiltPad
      );

    }
  );

  tiltPad.addEventListener(
    "pointermove",
    event => {

      movePreviewDrag(
        event,
        tiltPad
      );

    }
  );

  tiltPad.addEventListener(
    "pointerup",
    event => {

      endPreviewDrag(
        event,
        tiltPad
      );

    }
  );

  tiltPad.addEventListener(
    "pointercancel",
    event => {

      endPreviewDrag(
        event,
        tiltPad
      );

    }
  );

}


/* =========================================================
   24. INITIALISE WATCH DRAG
========================================================= */

function initialiseWatchDisplayTilt() {

  if (!watchDisplay) {
    return;
  }

  watchDisplay.style.touchAction =
    "none";

  watchDisplay.style.cursor =
    "grab";

  watchDisplay.addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();

      watchDisplay.style.cursor =
        "grabbing";

      startPreviewDrag(
        event,
        watchDisplay
      );

    }
  );

  watchDisplay.addEventListener(
    "pointermove",
    event => {

      movePreviewDrag(
        event,
        watchDisplay
      );

    }
  );

  watchDisplay.addEventListener(
    "pointerup",
    event => {

      watchDisplay.style.cursor =
        "grab";

      endPreviewDrag(
        event,
        watchDisplay
      );

    }
  );

  watchDisplay.addEventListener(
    "pointercancel",
    event => {

      watchDisplay.style.cursor =
        "grab";

      endPreviewDrag(
        event,
        watchDisplay
      );

    }
  );

}


/* =========================================================
   25. FLIP DEPTH
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
   26. BUTTON EVENTS
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

  springToggle?.addEventListener(
    "click",
    event => {

      /*
       * Checkbox gets its state directly.
       * Normal button simply toggles.
       */

      if (
        event.currentTarget instanceof
        HTMLInputElement
      ) {

        setSpringToCentre(
          event.currentTarget.checked
        );

      } else {

        toggleSpringToCentre();

      }

    }
  );

}


/* =========================================================
   27. SPRING PHYSICS
========================================================= */

function updateSpringPhysics() {

  /*
   * While actively dragging we want smooth tracking rather
   * than spring simulation.
   */

  if (previewDragging) {

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

    return;
  }

  /*
   * Spring OFF:
   * smoothly settle at the released target.
   */

  if (!springToCentre) {

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

    return;
  }

  /*
   * Spring ON:
   *
   * Hooke-ish spring:
   *
   * velocity += distance * strength
   * velocity *= damping
   * position += velocity
   */

  const forceX =
    (
      targetTiltX -
      renderedTiltX
    ) *
    PARALEASY_SPRING_STRENGTH;

  const forceY =
    (
      targetTiltY -
      renderedTiltY
    ) *
    PARALEASY_SPRING_STRENGTH;

  springVelocityX +=
    forceX;

  springVelocityY +=
    forceY;

  springVelocityX *=
    PARALEASY_SPRING_DAMPING;

  springVelocityY *=
    PARALEASY_SPRING_DAMPING;

  renderedTiltX +=
    springVelocityX;

  renderedTiltY +=
    springVelocityY;

  /*
   * Kill microscopic wobbling once centred.
   */

  if (
    Math.abs(renderedTiltX) < 0.01 &&
    Math.abs(springVelocityX) < 0.01 &&
    targetTiltX === 0
  ) {

    renderedTiltX = 0;
    springVelocityX = 0;

  }

  if (
    Math.abs(renderedTiltY) < 0.01 &&
    Math.abs(springVelocityY) < 0.01 &&
    targetTiltY === 0
  ) {

    renderedTiltY = 0;
    springVelocityY = 0;

  }

}


/* =========================================================
   28. ANIMATION LOOP
========================================================= */

function animateParallaxPreview() {

  updateSpringPhysics();

  renderParallaxPreview();

  parallaxAnimationFrame =
    requestAnimationFrame(
      animateParallaxPreview
    );

}


/* =========================================================
   29. START ENGINE
========================================================= */

function startParallaxEngine() {

  if (
    parallaxAnimationFrame !== null
  ) {
    return;
  }

  parallaxAnimationFrame =
    requestAnimationFrame(
      animateParallaxPreview
    );

}


/* =========================================================
   30. STOP ENGINE
========================================================= */

function stopParallaxEngine() {

  if (
    parallaxAnimationFrame === null
  ) {
    return;
  }

  cancelAnimationFrame(
    parallaxAnimationFrame
  );

  parallaxAnimationFrame = null;

}


/* =========================================================
   31. RESTORE PROJECT TILT
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

  springVelocityX = 0;
  springVelocityY = 0;

  updateTiltReadout();
  updateTiltPuck();
  updatePhysicalWatch();

}


/* =========================================================
   32. EXTERNAL EVENTS
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
   33. INITIALISE ENGINE
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

  /*
   * Default spring state.
   */

  if (
    springToggle instanceof
    HTMLInputElement
  ) {

    springToCentre =
      springToggle.checked;

  }

  restoreProjectTiltToEngine();

  renderParallaxPreview();

  startParallaxEngine();

}


/* =========================================================
   34. AUTO START
========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialiseParallaxEngine
  );

} else {

  initialiseParallaxEngine();

}
