"use strict";

/* =========================================================
   PAINTLESS
   SMUDGE TOOL — v1.0

   File:
   js/tools/smudge.js

   Features:
   - Pushes and blends pixels like wet paint
   - Adjustable size, strength and hardness
   - Uses the existing Opacity control as smudge strength
   - Smooth interpolated strokes
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live circular cursor preview
   - One completed smudge stroke = one Undo step
   - Escape safely restores the original layer
   - Locked-layer protection

   Loaded automatically by:
   js/tools.js
========================================================= */

(() => {

  /* =======================================================
     1. LOADER CHECK
  ======================================================= */

  const tools =
    window.PaintlessTools;


  if (
    !tools ||
    typeof tools.registerModule !==
      "function"
  ) {

    console.error(
      "Paintless Smudge could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. SMUDGE STATE
  ======================================================= */

  const smudgeState = {

    initialised:
      false,

    active:
      false,

    smudging:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    sourceSnapshot:
      null,

    previousPoint:
      null,

    currentPoint:
      null,

    accumulatedDistance:
      0,

    cursorVisible:
      false,

    cursorPoint:
      null,

    cursorPressure:
      1,

    smoothing:
      0.28,

    spacing:
      0.12,

    minimumSpacing:
      1,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.3,

    pressureStrengthMinimum:
      0.35,

    sampleCarry:
      0.72,

    strokeCounter:
      0

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    brushSizeInput:
      null,

    opacityInput:
      null,

    hardnessInput:
      null

  };


  let overlayContext =
    null;


  /* =======================================================
     4. SHARED APIS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  function getHistoryApi() {

    return (
      window.PaintlessHistory ||
      null
    );

  }


  /* =======================================================
     5. GENERAL HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
  ) {

    const numericValue =
      Number(
        value
      );


    if (
      !Number.isFinite(
        numericValue
      )
    ) {

      return minimum;

    }


    return Math.min(
      maximum,
      Math.max(
        minimum,
        numericValue
      )
    );

  }


  function copyPoint(
    point
  ) {

    if (!point) {

      return null;

    }


    return {

      x:
        Number(
          point.x
        ) ||
        0,

      y:
        Number(
          point.y
        ) ||
        0,

      pressure:
        clamp(
          point.pressure ??
          1,
          0,
          1
        ),

      inside:
        Boolean(
          point.inside
        )

    };

  }


  function distanceBetween(
    firstPoint,
    secondPoint
  ) {

    if (
      !firstPoint ||
      !secondPoint
    ) {

      return 0;

    }


    return Math.hypot(
      secondPoint.x -
        firstPoint.x,

      secondPoint.y -
        firstPoint.y
    );

  }


  function interpolatePoint(
    firstPoint,
    secondPoint,
    amount
  ) {

    return {

      x:
        firstPoint.x +
        (
          secondPoint.x -
          firstPoint.x
        ) *
        amount,

      y:
        firstPoint.y +
        (
          secondPoint.y -
          firstPoint.y
        ) *
        amount,

      pressure:
        firstPoint.pressure +
        (
          secondPoint.pressure -
          firstPoint.pressure
        ) *
        amount

    };

  }


  function normalisePressure(
    payload
  ) {

    if (
      !smudgeState.pressureEnabled ||
      payload.pointerType !==
        "pen"
    ) {

      return 1;

    }


    const pressure =
      Number(
        payload.pressure
      );


    if (
      !Number.isFinite(
        pressure
      ) ||
      pressure <=
        0
    ) {

      return 0.5;

    }


    return clamp(
      pressure,
      0.01,
      1
    );

  }


  function sendStatusMessage(
    message
  ) {

    if (
      typeof getCore()
        ?.sendStatusMessage ===
      "function"
    ) {

      getCore()
        .sendStatusMessage(
          message
        );


      return;

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:status-message",
        {
          detail: {
            message
          }
        }
      )
    );

  }


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();


    smudgeState.cursorVisible =
      false;

  }


  function renderLayers() {

    if (
      typeof getLayersApi()
        ?.renderLayers ===
      "function"
    ) {

      getLayersApi()
        .renderLayers();


      return;

    }


    getCore()
      ?.renderLayers?.();

  }


  /* =======================================================
     6. SETTINGS
  ======================================================= */

  function getSmudgeSize() {

    return clamp(
      tools.getState(
        "brushSize"
      ) ??
      dom.brushSizeInput?.value ??
      20,
      1,
      200
    );

  }


  function getSmudgeStrength() {

    return clamp(
      tools.getState(
        "opacity"
      ) ??
      (
        Number(
          dom.opacityInput?.value
        ) /
        100
      ) ??
      0.65,
      0.01,
      1
    );

  }


  function getSmudgeHardness() {

    return clamp(
      tools.getState(
        "hardness"
      ) ??
      (
        Number(
          dom.hardnessInput?.value
        ) /
        100
      ) ??
      0.65,
      0,
      1
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const pressureScale =
      smudgeState.pressureSizeMinimum +
      (
        1 -
        smudgeState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      1,
      getSmudgeSize() *
      pressureScale
    );

  }


  function getEffectiveStrength(
    pressure
  ) {

    const pressureScale =
      smudgeState.pressureStrengthMinimum +
      (
        1 -
        smudgeState.pressureStrengthMinimum
      ) *
      pressure;


    return clamp(
      getSmudgeStrength() *
      pressureScale,
      0.01,
      1
    );

  }


  function getStampSpacing(
    pressure
  ) {

    return Math.max(
      smudgeState.minimumSpacing,
      getEffectiveSize(
        pressure
      ) *
      smudgeState.spacing
    );

  }


  /* =======================================================
     7. LAYER HELPERS
  ======================================================= */

  function getActiveLayer() {

    return (
      getCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function canEditLayer(
    layer
  ) {

    if (!layer) {

      sendStatusMessage(
        "There is no active layer."
      );


      return false;

    }


    if (layer.locked) {

      sendStatusMessage(
        "That layer is locked."
      );


      return false;

    }


    if (
      !layer.canvas ||
      !layer.context
    ) {

      sendStatusMessage(
        "That layer cannot be smudged."
      );


      return false;

    }


    return true;

  }


  function createCanvasCopy(
    sourceCanvas
  ) {

    if (!sourceCanvas) {

      return null;

    }


    const copiedCanvas =
      document.createElement(
        "canvas"
      );


    copiedCanvas.width =
      sourceCanvas.width;


    copiedCanvas.height =
      sourceCanvas.height;


    copiedCanvas
      .getContext(
        "2d"
      )
      .drawImage(
        sourceCanvas,
        0,
        0
      );


    return copiedCanvas;

  }


  function restoreLayerBackup() {

    if (
      !smudgeState.layer ||
      !smudgeState.layerBackup
    ) {

      return false;

    }


    const layer =
      smudgeState.layer;


    layer.context.save();


    layer.context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    layer.context.globalAlpha =
      1;


    layer.context.globalCompositeOperation =
      "source-over";


    layer.context.clearRect(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height
    );


    layer.context.drawImage(
      smudgeState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     8. MASK CREATION
  ======================================================= */

  function createSmudgeMask(
    size,
    hardness,
    strength
  ) {

    const safeSize =
      Math.max(
        2,
        Math.ceil(
          size
        )
      );


    const maskCanvas =
      document.createElement(
        "canvas"
      );


    maskCanvas.width =
      safeSize;


    maskCanvas.height =
      safeSize;


    const context =
      maskCanvas.getContext(
        "2d"
      );


    const centre =
      safeSize /
      2;


    const radius =
      safeSize /
      2;


    if (
      hardness >=
      0.985
    ) {

      context.fillStyle =
        `rgba(255, 255, 255, ${strength})`;


      context.beginPath();


      context.arc(
        centre,
        centre,
        radius,
        0,
        Math.PI *
          2
      );


      context.fill();


      return maskCanvas;

    }


    const solidRadius =
      radius *
      Math.pow(
        hardness,
        1.55
      );


    const gradient =
      context.createRadialGradient(
        centre,
        centre,
        solidRadius,
        centre,
        centre,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(255, 255, 255, ${strength})`
    );


    const middleStop =
      clamp(
        hardness +
        0.18,
        0.05,
        0.92
      );


    gradient.addColorStop(
      middleStop,
      `rgba(255, 255, 255, ${
        strength *
        Math.max(
          0.12,
          hardness *
          0.72
        )
      })`
    );


    gradient.addColorStop(
      1,
      "rgba(255, 255, 255, 0)"
    );


    context.fillStyle =
      gradient;


    context.fillRect(
      0,
      0,
      safeSize,
      safeSize
    );


    return maskCanvas;

  }




  /* =======================================================
     DOCUMENT -> ACTIVE LAYER COORDINATES

     Pointer coordinates are document/canvas coordinates, but
     retouch pixels are written directly into layer.canvas.
     Match Clone's fixed behaviour by applying the inverse of
     the compositor transform first (including Paraluxious).
  ======================================================= */

  function documentPointToLayerPoint(layer, point) {

    if (!layer || !point) {
      return copyPoint(point);
    }

    const layerWidth = layer.canvas?.width || 0;
    const layerHeight = layer.canvas?.height || 0;
    const centreX = layerWidth / 2;
    const centreY = layerHeight / 2;

    const para =
      window.PaintlessParaluxious?.getLayerTransform?.(layer) ||
      { x: 0, y: 0, scale: 1 };

    const tx =
      (Number(layer.transformX) || 0) +
      centreX +
      (Number(para.x) || 0);

    const ty =
      (Number(layer.transformY) || 0) +
      centreY +
      (Number(para.y) || 0);

    const angle =
      (Number(layer.rotation) || 0) * Math.PI / 180;

    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    let x = Number(point.x) - tx;
    let y = Number(point.y) - ty;

    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;

    const paraScale = Number(para.scale) || 1;
    const scaleX = (Number(layer.scaleX) || 1) * paraScale;
    const scaleY = (Number(layer.scaleY) || 1) * paraScale;

    x = rotatedX / (Math.abs(scaleX) > 0.000001 ? scaleX : 1);
    y = rotatedY / (Math.abs(scaleY) > 0.000001 ? scaleY : 1);

    return {
      x: x + centreX,
      y: y + centreY,
      pressure: point.pressure,
      inside: point.inside
    };

  }


  /* =======================================================
     9. SMUDGE STAMP
  ======================================================= */

  function stampSmudge(
    context,
    fromPoint,
    toPoint
  ) {

    if (
      !context ||
      !fromPoint ||
      !toPoint ||
      !smudgeState.sourceSnapshot
    ) {

      return false;

    }


    const fromLayerPoint =
      documentPointToLayerPoint(
        smudgeState.layer,
        fromPoint
      );


    const toLayerPoint =
      documentPointToLayerPoint(
        smudgeState.layer,
        toPoint
      );


    const pressure =
      clamp(
        toPoint.pressure,
        0.01,
        1
      );


    const size =
      getEffectiveSize(
        pressure
      );


    const stampSize =
      Math.max(
        2,
        Math.ceil(
          size
        )
      );


    const halfSize =
      stampSize /
      2;


    const strength =
      getEffectiveStrength(
        pressure
      );


    const hardness =
      getSmudgeHardness();


    const movementX =
      toLayerPoint.x -
      fromLayerPoint.x;


    const movementY =
      toLayerPoint.y -
      fromLayerPoint.y;


    /*
     * Pull the sampled pixels partly from behind the current
     * destination point. Greater strength creates a longer push.
     */

    const pullDistance =
      0.35 +
      strength *
      0.9;


    const sampleCentreX =
      toLayerPoint.x -
      movementX *
      pullDistance;


    const sampleCentreY =
      toLayerPoint.y -
      movementY *
      pullDistance;


    const stampCanvas =
      document.createElement(
        "canvas"
      );


    stampCanvas.width =
      stampSize;


    stampCanvas.height =
      stampSize;


    const stampContext =
      stampCanvas.getContext(
        "2d"
      );


    stampContext.drawImage(
      smudgeState.sourceSnapshot,
      sampleCentreX -
        halfSize,
      sampleCentreY -
        halfSize,
      stampSize,
      stampSize,
      0,
      0,
      stampSize,
      stampSize
    );


    const maskCanvas =
      createSmudgeMask(
        stampSize,
        hardness,
        strength
      );


    stampContext.globalCompositeOperation =
      "destination-in";


    stampContext.drawImage(
      maskCanvas,
      0,
      0
    );


    stampContext.globalCompositeOperation =
      "source-over";


    context.save();


    context.globalAlpha =
      1;


    context.globalCompositeOperation =
      "source-over";


    context.drawImage(
      stampCanvas,
      toLayerPoint.x -
        halfSize,
      toLayerPoint.y -
        halfSize
    );


    context.restore();


    /*
     * Update the source snapshot slightly after every stamp.
     * This allows colour to carry along the stroke naturally
     * instead of repeatedly copying only the original pixels.
     */

    const carryStrength =
      clamp(
        smudgeState.sampleCarry *
        strength,
        0.05,
        0.95
      );


    const sourceContext =
      smudgeState.sourceSnapshot
        .getContext(
          "2d"
        );


    sourceContext.save();


    sourceContext.globalAlpha =
      carryStrength;


    sourceContext.globalCompositeOperation =
      "source-over";


    sourceContext.drawImage(
      stampCanvas,
      toLayerPoint.x -
        halfSize,
      toLayerPoint.y -
        halfSize
    );


    sourceContext.restore();


    return true;

  }


  /* =======================================================
     10. INTERPOLATION
  ======================================================= */

  function smoothIncomingPoint(
    previousPoint,
    incomingPoint
  ) {

    if (!previousPoint) {

      return copyPoint(
        incomingPoint
      );

    }


    const following =
      1 -
      clamp(
        smudgeState.smoothing,
        0,
        0.92
      );


    return {

      x:
        previousPoint.x +
        (
          incomingPoint.x -
          previousPoint.x
        ) *
        following,

      y:
        previousPoint.y +
        (
          incomingPoint.y -
          previousPoint.y
        ) *
        following,

      pressure:
        previousPoint.pressure +
        (
          incomingPoint.pressure -
          previousPoint.pressure
        ) *
        following

    };

  }


  function drawInterpolatedSegment(
    context,
    firstPoint,
    secondPoint
  ) {

    if (
      !context ||
      !firstPoint ||
      !secondPoint
    ) {

      return false;

    }


    const distance =
      distanceBetween(
        firstPoint,
        secondPoint
      );


    if (
      distance <=
      0.001
    ) {

      return false;

    }


    const averagePressure =
      (
        firstPoint.pressure +
        secondPoint.pressure
      ) /
      2;


    const spacing =
      getStampSpacing(
        averagePressure
      );


    let travelled =
      spacing -
      smudgeState.accumulatedDistance;


    let previousStampPoint =
      copyPoint(
        firstPoint
      );


    let stamped =
      false;


    while (
      travelled <=
      distance
    ) {

      const amount =
        travelled /
        distance;


      const stampPoint =
        interpolatePoint(
          firstPoint,
          secondPoint,
          amount
        );


      stampSmudge(
        context,
        previousStampPoint,
        stampPoint
      );


      previousStampPoint =
        copyPoint(
          stampPoint
        );


      stamped =
        true;


      travelled +=
        spacing;

    }


    const usedDistance =
      distance -
      (
        travelled -
        spacing
      );


    smudgeState.accumulatedDistance =
      usedDistance;


    if (
      smudgeState.accumulatedDistance >=
      spacing
    ) {

      smudgeState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     11. CURSOR PREVIEW
  ======================================================= */

  function clearSmudgeCursor() {

    clearOverlay();

  }


  function drawSmudgeCursor(
    point,
    pressure =
      1
  ) {

    if (
      !smudgeState.active ||
      smudgeState.smudging ||
      !overlayContext ||
      !point
    ) {

      return false;

    }


    clearOverlay();


    const radius =
      getEffectiveSize(
        pressure
      ) /
      2;


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.9)";


    overlayContext.lineWidth =
      3;


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius +
        1,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.95)";


    overlayContext.lineWidth =
      1;


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    /*
     * Wavy symbol to distinguish Smudge from Brush and Eraser.
     */

    overlayContext.strokeStyle =
      "rgba(53, 231, 255, 0.95)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.beginPath();


    overlayContext.moveTo(
      point.x -
        radius *
        0.45,
      point.y
    );


    overlayContext.bezierCurveTo(
      point.x -
        radius *
        0.2,
      point.y -
        radius *
        0.35,
      point.x +
        radius *
        0.1,
      point.y +
        radius *
        0.35,
      point.x +
        radius *
        0.45,
      point.y
    );


    overlayContext.stroke();


    overlayContext.restore();


    smudgeState.cursorVisible =
      true;


    smudgeState.cursorPoint =
      copyPoint(
        point
      );


    smudgeState.cursorPressure =
      pressure;


    return true;

  }


  function redrawSmudgeCursor() {

    if (
      !smudgeState.cursorVisible ||
      !smudgeState.cursorPoint
    ) {

      return;

    }


    drawSmudgeCursor(
      smudgeState.cursorPoint,
      smudgeState.cursorPressure
    );

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function saveSmudgeHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Smudge pixels"
        );

    }


    return getCore()
      ?.requestHistorySave?.(
        "Smudge pixels"
      );

  }


  /* =======================================================
     13. STROKE LIFECYCLE
  ======================================================= */

  function beginSmudgeStroke(
    payload
  ) {

    const layer =
      payload.layer ||
      getActiveLayer();


    if (
      !canEditLayer(
        layer
      )
    ) {

      return false;

    }


    const point = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    smudgeState.smudging =
      true;


    smudgeState.changed =
      false;


    smudgeState.layer =
      layer;


    smudgeState.layerBackup =
      createCanvasCopy(
        layer.canvas
      );


    smudgeState.sourceSnapshot =
      createCanvasCopy(
        layer.canvas
      );


    smudgeState.previousPoint =
      copyPoint(
        point
      );


    smudgeState.currentPoint =
      copyPoint(
        point
      );


    smudgeState.accumulatedDistance =
      0;


    smudgeState.strokeCounter +=
      1;


    clearSmudgeCursor();


    return true;

  }


  function continueSmudgeStroke(
    payload
  ) {

    if (
      !smudgeState.smudging ||
      !smudgeState.layer
    ) {

      return false;

    }


    const incomingPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    const smoothedPoint =
      smoothIncomingPoint(
        smudgeState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        smudgeState.layer.context,
        smudgeState.previousPoint,
        smoothedPoint
      );


    smudgeState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    smudgeState.currentPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      smudgeState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    return changed;

  }


  function finishSmudgeStroke(
    payload
  ) {

    if (
      !smudgeState.smudging
    ) {

      return false;

    }


    const finalPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    if (
      smudgeState.layer &&
      smudgeState.previousPoint
    ) {

      const changed =
        drawInterpolatedSegment(
          smudgeState.layer.context,
          smudgeState.previousPoint,
          finalPoint
        );


      if (changed) {

        smudgeState.changed =
          true;


        renderLayers();

      }

    }


    const changed =
      smudgeState.changed;


    resetStrokeState();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveSmudgeHistory();


      sendStatusMessage(
        "Smudge stroke saved."
      );

    }


    drawSmudgeCursor(
      finalPoint,
      finalPoint.pressure
    );


    return changed;

  }


  function cancelSmudgeStroke() {

    if (
      !smudgeState.smudging
    ) {

      clearSmudgeCursor();


      return false;

    }


    restoreLayerBackup();


    resetStrokeState();


    clearSmudgeCursor();


    sendStatusMessage(
      "Smudge stroke cancelled."
    );


    return true;

  }


  function resetStrokeState() {

    smudgeState.smudging =
      false;


    smudgeState.changed =
      false;


    smudgeState.layer =
      null;


    smudgeState.layerBackup =
      null;


    smudgeState.sourceSnapshot =
      null;


    smudgeState.previousPoint =
      null;


    smudgeState.currentPoint =
      null;


    smudgeState.accumulatedDistance =
      0;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !smudgeState.active
    ) {

      return false;

    }


    const started =
      beginSmudgeStroke(
        payload
      );


    return {

      changed:
        false,

      preventDefault:
        true,

      capturePointer:
        started,

      clearOverlay:
        true

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !smudgeState.active ||
      !smudgeState.smudging
    ) {

      return false;

    }


    const changed =
      continueSmudgeStroke(
        payload
      );


    return {

      changed,

      preventDefault:
        true

    };

  }


  function pointerUp(
    payload
  ) {

    if (
      !smudgeState.smudging
    ) {

      return false;

    }


    const changed =
      finishSmudgeStroke(
        payload
      );


    return {

      changed,

      preventDefault:
        true,

      releasePointer:
        true

    };

  }


  function pointerCancel() {

    cancelSmudgeStroke();


    return {

      changed:
        false,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function hover(
    payload
  ) {

    if (
      !smudgeState.active ||
      smudgeState.smudging ||
      !payload.point?.inside
    ) {

      return false;

    }


    drawSmudgeCursor(
      payload.point,
      normalisePressure(
        payload
      )
    );


    return false;

  }


  function pointerEnter(
    payload
  ) {

    return hover(
      payload
    );

  }


  function pointerLeave() {

    if (
      !smudgeState.smudging
    ) {

      clearSmudgeCursor();

    }


    return false;

  }


  /* =======================================================
     15. ACTIVATION
  ======================================================= */

  function activate() {

    smudgeState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "brush",
          "opacity",
          "hardness"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "none"
      );


    sendStatusMessage(
      "Smudge ready. Drag through pixels like wet paint."
    );


    return true;

  }


  function deactivate() {

    if (
      smudgeState.smudging
    ) {

      cancelSmudgeStroke();

    }


    smudgeState.active =
      false;


    clearSmudgeCursor();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return true;

  }


  /* =======================================================
     16. DOM AND EVENTS
  ======================================================= */

  function collectDomReferences() {

    dom.editorCanvas =
      document.getElementById(
        "editor-canvas"
      );


    dom.overlayCanvas =
      document.getElementById(
        "overlay-canvas"
      );


    dom.brushSizeInput =
      document.getElementById(
        "brush-size"
      );


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.hardnessInput =
      document.getElementById(
        "brush-hardness"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function connectEvents() {

    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        if (
          [
            "brushSize",
            "opacity",
            "hardness"
          ].includes(
            event.detail?.property
          )
        ) {

          redrawSmudgeCursor();

        }

      }
    );


    [
      dom.brushSizeInput,
      dom.opacityInput,
      dom.hardnessInput
    ].forEach(
      (control) => {

        control?.addEventListener(
          "input",
          redrawSmudgeCursor
        );

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelSmudgeStroke
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelSmudgeStroke
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelSmudgeStroke
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      cancelSmudgeStroke
    );

  }


  /* =======================================================
     17. SMUDGE MODULE
  ======================================================= */

  const smudgeModule = {

    name:
      "Smudge",

    label:
      "Smudge",

    initialised:
      false,


    async initialise() {

      if (
        smudgeState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (
        !dom.editorCanvas ||
        !dom.overlayCanvas ||
        !overlayContext
      ) {

        throw new Error(
          "Paintless Smudge could not find the editor canvases."
        );

      }


      connectEvents();


      smudgeState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "smudge"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:smudge-ready",
          {
            detail: {
              smudge:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Smudge ready.",
        [
          "color:#35e7ff",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    },


    activate,

    deactivate,

    pointerDown,

    pointerMove,

    pointerUp,

    pointerCancel,

    pointerEnter,

    pointerLeave,

    hover

  };


  /* =======================================================
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      smudgeState,


    activate,

    deactivate,


    beginSmudgeStroke,

    continueSmudgeStroke,

    finishSmudgeStroke,

    cancelSmudgeStroke,


    stampSmudge,

    drawInterpolatedSegment,

    drawSmudgeCursor,

    clearSmudgeCursor,


    getSmudgeSize,

    getSmudgeStrength,

    getSmudgeHardness,


    setSmoothing(
      value
    ) {

      smudgeState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return smudgeState.smoothing;

    },


    setSpacing(
      value
    ) {

      smudgeState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return smudgeState.spacing;

    },


    setSampleCarry(
      value
    ) {

      smudgeState.sampleCarry =
        clamp(
          value,
          0,
          1
        );


      return smudgeState.sampleCarry;

    },


    setPressureEnabled(
      enabled
    ) {

      smudgeState.pressureEnabled =
        Boolean(
          enabled
        );


      return smudgeState.pressureEnabled;

    },


    isSmudging() {

      return smudgeState.smudging;

    }

  };


  window.PaintlessSmudge =
    publicApi;


  smudgeModule.api =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "smudge",
    smudgeModule
  );

})();
