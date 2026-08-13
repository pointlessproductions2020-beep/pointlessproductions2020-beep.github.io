"use strict";

/* =========================================================
   PAINTLESS
   LIQUIFY PUSH TOOL — v1.0

   File:
   js/tools/liquify.js

   Features:
   - Pushes pixels in the direction of the stroke
   - Feels like moving wet clay beneath the brush
   - Adjustable brush size
   - Opacity control becomes liquify strength
   - Hardness controls the falloff around the brush edge
   - Smooth interpolated movement
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live circular cursor and direction preview
   - One completed liquify stroke = one Undo step
   - Escape restores the original layer
   - Locked-layer protection
   - Samples from a frozen copy to reduce feedback distortion

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
      "Paintless Liquify could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. LIQUIFY STATE
  ======================================================= */

  const liquifyState = {

    initialised:
      false,

    active:
      false,

    liquifying:
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

    cursorDirectionX:
      0,

    cursorDirectionY:
      0,

    smoothing:
      0.26,

    spacing:
      0.13,

    minimumSpacing:
      1,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.3,

    pressureStrengthMinimum:
      0.25,

    maximumPushRatio:
      0.48,

    sourceRefresh:
      0.68,

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
      !liquifyState.pressureEnabled ||
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


    liquifyState.cursorVisible =
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

  function getLiquifySize() {

    return clamp(
      tools.getState(
        "brushSize"
      ) ??
      dom.brushSizeInput?.value ??
      60,
      4,
      300
    );

  }


  function getLiquifyStrength() {

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
      0.5,
      0.01,
      1
    );

  }


  function getLiquifyHardness() {

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
      0.5,
      0,
      1
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const pressureScale =
      liquifyState.pressureSizeMinimum +
      (
        1 -
        liquifyState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      4,
      getLiquifySize() *
      pressureScale
    );

  }


  function getEffectiveStrength(
    pressure
  ) {

    const pressureScale =
      liquifyState.pressureStrengthMinimum +
      (
        1 -
        liquifyState.pressureStrengthMinimum
      ) *
      pressure;


    return clamp(
      getLiquifyStrength() *
      pressureScale,
      0.01,
      1
    );

  }


  function getStampSpacing(
    pressure
  ) {

    return Math.max(
      liquifyState.minimumSpacing,
      getEffectiveSize(
        pressure
      ) *
      liquifyState.spacing
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
        "That layer cannot be liquified."
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
        "2d",
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
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
      !liquifyState.layer ||
      !liquifyState.layerBackup
    ) {

      return false;

    }


    const layer =
      liquifyState.layer;


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
      liquifyState.layerBackup,
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

  function createLiquifyMask(
    size,
    hardness,
    strength
  ) {

    const safeSize =
      Math.max(
        4,
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


    /*
     * Lower hardness gives a broad, soft falloff.
     * Higher hardness keeps more of the centre at full force.
     */

    const solidRadius =
      radius *
      Math.pow(
        hardness,
        1.7
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
        0.14,
        0.04,
        0.9
      );


    gradient.addColorStop(
      middleStop,
      `rgba(255, 255, 255, ${
        strength *
        Math.max(
          0.1,
          hardness *
          0.68
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
     9. PIXEL PUSH
  ======================================================= */

  function pushPixels(
    context,
    fromPoint,
    toPoint
  ) {

    if (
      !context ||
      !fromPoint ||
      !toPoint ||
      !liquifyState.sourceSnapshot
    ) {

      return false;

    }


    const fromLayerPoint =
      documentPointToLayerPoint(
        liquifyState.layer,
        fromPoint
      );


    const toLayerPoint =
      documentPointToLayerPoint(
        liquifyState.layer,
        toPoint
      );


    const movementX =
      toLayerPoint.x -
      fromLayerPoint.x;


    const movementY =
      toLayerPoint.y -
      fromLayerPoint.y;


    const movementDistance =
      Math.hypot(
        movementX,
        movementY
      );


    if (
      movementDistance <
      0.01
    ) {

      return false;

    }


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


    const strength =
      getEffectiveStrength(
        pressure
      );


    const hardness =
      getLiquifyHardness();


    const stampSize =
      Math.max(
        4,
        Math.ceil(
          size
        )
      );


    const halfSize =
      stampSize /
      2;


    /*
     * Limit the push distance so rapid pointer jumps do not
     * tear giant holes through the image.
     */

    const maximumPush =
      size *
      liquifyState.maximumPushRatio *
      strength;


    const normalX =
      movementX /
      movementDistance;


    const normalY =
      movementY /
      movementDistance;


    const pushDistance =
      Math.min(
        movementDistance,
        maximumPush
      );


    const pushX =
      normalX *
      pushDistance;


    const pushY =
      normalY *
      pushDistance;


    /*
     * Sample pixels slightly behind the current brush and draw
     * them forward in the movement direction.
     */

    const sourceCentreX =
      toLayerPoint.x -
      pushX;


    const sourceCentreY =
      toLayerPoint.y -
      pushY;


    const pushedCanvas =
      document.createElement(
        "canvas"
      );


    pushedCanvas.width =
      stampSize;


    pushedCanvas.height =
      stampSize;


    const pushedContext =
      pushedCanvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    pushedContext.drawImage(
      liquifyState.sourceSnapshot,
      sourceCentreX -
        halfSize,
      sourceCentreY -
        halfSize,
      stampSize,
      stampSize,
      0,
      0,
      stampSize,
      stampSize
    );


    const maskCanvas =
      createLiquifyMask(
        stampSize,
        hardness,
        strength
      );


    pushedContext.globalCompositeOperation =
      "destination-in";


    pushedContext.drawImage(
      maskCanvas,
      0,
      0
    );


    pushedContext.globalCompositeOperation =
      "source-over";


    context.save();


    context.globalAlpha =
      1;


    context.globalCompositeOperation =
      "source-over";


    context.drawImage(
      pushedCanvas,
      toLayerPoint.x -
        halfSize,
      toLayerPoint.y -
        halfSize
    );


    context.restore();


    /*
     * Blend the current result back into the source snapshot.
     * This allows pixels to continue travelling along a long
     * stroke without becoming a harsh repeated copy.
     */

    const refreshContext =
      liquifyState.sourceSnapshot
        .getContext(
          "2d"
        );


    refreshContext.save();


    refreshContext.globalAlpha =
      clamp(
        liquifyState.sourceRefresh *
        strength,
        0.05,
        0.95
      );


    refreshContext.globalCompositeOperation =
      "source-over";


    refreshContext.drawImage(
      pushedCanvas,
      toLayerPoint.x -
        halfSize,
      toLayerPoint.y -
        halfSize
    );


    refreshContext.restore();


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
        liquifyState.smoothing,
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
      liquifyState.accumulatedDistance;


    let previousStampPoint =
      copyPoint(
        firstPoint
      );


    let pushed =
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


      if (
        pushPixels(
          context,
          previousStampPoint,
          stampPoint
        )
      ) {

        pushed =
          true;

      }


      previousStampPoint =
        copyPoint(
          stampPoint
        );


      travelled +=
        spacing;

    }


    const usedDistance =
      distance -
      (
        travelled -
        spacing
      );


    liquifyState.accumulatedDistance =
      usedDistance;


    if (
      liquifyState.accumulatedDistance >=
      spacing
    ) {

      liquifyState.accumulatedDistance %=
        spacing;

    }


    return pushed;

  }


  /* =======================================================
     11. CURSOR PREVIEW
  ======================================================= */

  function clearLiquifyCursor() {

    clearOverlay();

  }


  function drawLiquifyCursor(
    point,
    pressure =
      1,
    directionX =
      0,
    directionY =
      0
  ) {

    if (
      !liquifyState.active ||
      liquifyState.liquifying ||
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


    /*
     * Outer ring.
     */

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


    /*
     * Inner ring.
     */

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.96)";


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
     * Clay-push arrow.
     */

    const directionLength =
      Math.hypot(
        directionX,
        directionY
      );


    let arrowX =
      radius *
      0.55;


    let arrowY =
      0;


    if (
      directionLength >
      0.001
    ) {

      arrowX =
        directionX /
        directionLength *
        radius *
        0.55;


      arrowY =
        directionY /
        directionLength *
        radius *
        0.55;

    }


    const arrowEndX =
      point.x +
      arrowX;


    const arrowEndY =
      point.y +
      arrowY;


    const arrowAngle =
      Math.atan2(
        arrowY,
        arrowX
      );


    const headSize =
      Math.min(
        8,
        Math.max(
          4,
          radius *
          0.22
        )
      );


    overlayContext.strokeStyle =
      "rgba(255, 95, 183, 0.98)";


    overlayContext.fillStyle =
      "rgba(255, 95, 183, 0.98)";


    overlayContext.lineWidth =
      2;


    overlayContext.beginPath();


    overlayContext.moveTo(
      point.x -
        arrowX *
        0.45,
      point.y -
        arrowY *
        0.45
    );


    overlayContext.lineTo(
      arrowEndX,
      arrowEndY
    );


    overlayContext.stroke();


    overlayContext.beginPath();


    overlayContext.moveTo(
      arrowEndX,
      arrowEndY
    );


    overlayContext.lineTo(
      arrowEndX -
        Math.cos(
          arrowAngle -
          Math.PI /
          5
        ) *
        headSize,
      arrowEndY -
        Math.sin(
          arrowAngle -
          Math.PI /
          5
        ) *
        headSize
    );


    overlayContext.lineTo(
      arrowEndX -
        Math.cos(
          arrowAngle +
          Math.PI /
          5
        ) *
        headSize,
      arrowEndY -
        Math.sin(
          arrowAngle +
          Math.PI /
          5
        ) *
        headSize
    );


    overlayContext.closePath();


    overlayContext.fill();


    overlayContext.restore();


    liquifyState.cursorVisible =
      true;


    liquifyState.cursorPoint =
      copyPoint(
        point
      );


    liquifyState.cursorPressure =
      pressure;


    liquifyState.cursorDirectionX =
      directionX;


    liquifyState.cursorDirectionY =
      directionY;


    return true;

  }


  function drawActiveLiquifyGuide(
    point,
    previousPoint,
    pressure
  ) {

    if (
      !overlayContext ||
      !point
    ) {

      return;

    }


    clearOverlay();


    const directionX =
      previousPoint
        ? point.x -
          previousPoint.x
        : 0;


    const directionY =
      previousPoint
        ? point.y -
          previousPoint.y
        : 0;


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
      "rgba(255, 255, 255, 0.92)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.setLineDash(
      [
        5,
        4
      ]
    );


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


    overlayContext.setLineDash(
      []
    );


    const directionLength =
      Math.hypot(
        directionX,
        directionY
      );


    if (
      directionLength >
      0.001
    ) {

      const normalX =
        directionX /
        directionLength;


      const normalY =
        directionY /
        directionLength;


      overlayContext.strokeStyle =
        "rgba(255, 95, 183, 0.98)";


      overlayContext.lineWidth =
        2;


      overlayContext.beginPath();


      overlayContext.moveTo(
        point.x -
          normalX *
          radius *
          0.45,
        point.y -
          normalY *
          radius *
          0.45
      );


      overlayContext.lineTo(
        point.x +
          normalX *
          radius *
          0.45,
        point.y +
          normalY *
          radius *
          0.45
      );


      overlayContext.stroke();

    }


    overlayContext.restore();

  }


  function redrawLiquifyCursor() {

    if (
      !liquifyState.cursorVisible ||
      !liquifyState.cursorPoint ||
      liquifyState.liquifying
    ) {

      return;

    }


    drawLiquifyCursor(
      liquifyState.cursorPoint,
      liquifyState.cursorPressure,
      liquifyState.cursorDirectionX,
      liquifyState.cursorDirectionY
    );

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function saveLiquifyHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Liquify pixels"
        );

    }


    return getCore()
      ?.requestHistorySave?.(
        "Liquify pixels"
      );

  }


  /* =======================================================
     13. STROKE LIFECYCLE
  ======================================================= */

  function beginLiquifyStroke(
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


    liquifyState.liquifying =
      true;


    liquifyState.changed =
      false;


    liquifyState.layer =
      layer;


    liquifyState.layerBackup =
      createCanvasCopy(
        layer.canvas
      );


    liquifyState.sourceSnapshot =
      createCanvasCopy(
        layer.canvas
      );


    liquifyState.previousPoint =
      copyPoint(
        point
      );


    liquifyState.currentPoint =
      copyPoint(
        point
      );


    liquifyState.accumulatedDistance =
      0;


    liquifyState.strokeCounter +=
      1;


    clearLiquifyCursor();


    drawActiveLiquifyGuide(
      point,
      null,
      point.pressure
    );


    return true;

  }


  function continueLiquifyStroke(
    payload
  ) {

    if (
      !liquifyState.liquifying ||
      !liquifyState.layer
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
        liquifyState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        liquifyState.layer.context,
        liquifyState.previousPoint,
        smoothedPoint
      );


    const previousPoint =
      copyPoint(
        liquifyState.previousPoint
      );


    liquifyState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    liquifyState.currentPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      liquifyState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    drawActiveLiquifyGuide(
      smoothedPoint,
      previousPoint,
      smoothedPoint.pressure
    );


    return changed;

  }


  function finishLiquifyStroke(
    payload
  ) {

    if (
      !liquifyState.liquifying
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


    const previousPoint =
      copyPoint(
        liquifyState.previousPoint
      );


    if (
      liquifyState.layer &&
      previousPoint
    ) {

      const finalChanged =
        drawInterpolatedSegment(
          liquifyState.layer.context,
          previousPoint,
          finalPoint
        );


      if (finalChanged) {

        liquifyState.changed =
          true;


        renderLayers();

      }

    }


    const changed =
      liquifyState.changed;


    const directionX =
      previousPoint
        ? finalPoint.x -
          previousPoint.x
        : 0;


    const directionY =
      previousPoint
        ? finalPoint.y -
          previousPoint.y
        : 0;


    resetStrokeState();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveLiquifyHistory();


      sendStatusMessage(
        "Liquify stroke saved."
      );

    }


    drawLiquifyCursor(
      finalPoint,
      finalPoint.pressure,
      directionX,
      directionY
    );


    return changed;

  }


  function cancelLiquifyStroke() {

    if (
      !liquifyState.liquifying
    ) {

      clearLiquifyCursor();


      return false;

    }


    restoreLayerBackup();


    resetStrokeState();


    clearLiquifyCursor();


    sendStatusMessage(
      "Liquify stroke cancelled."
    );


    return true;

  }


  function resetStrokeState() {

    liquifyState.liquifying =
      false;


    liquifyState.changed =
      false;


    liquifyState.layer =
      null;


    liquifyState.layerBackup =
      null;


    liquifyState.sourceSnapshot =
      null;


    liquifyState.previousPoint =
      null;


    liquifyState.currentPoint =
      null;


    liquifyState.accumulatedDistance =
      0;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !liquifyState.active
    ) {

      return false;

    }


    const started =
      beginLiquifyStroke(
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
      !liquifyState.active
    ) {

      return false;

    }


    if (
      liquifyState.liquifying
    ) {

      const changed =
        continueLiquifyStroke(
          payload
        );


      return {

        changed,

        preventDefault:
          true

      };

    }


    const pressure =
      normalisePressure(
        payload
      );


    const previousCursorPoint =
      copyPoint(
        liquifyState.cursorPoint
      );


    const directionX =
      previousCursorPoint
        ? payload.point.x -
          previousCursorPoint.x
        : 0;


    const directionY =
      previousCursorPoint
        ? payload.point.y -
          previousCursorPoint.y
        : 0;


    drawLiquifyCursor(
      payload.point,
      pressure,
      directionX,
      directionY
    );


    return false;

  }


  function pointerUp(
    payload
  ) {

    if (
      !liquifyState.liquifying
    ) {

      return false;

    }


    const changed =
      finishLiquifyStroke(
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

    cancelLiquifyStroke();


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
      !liquifyState.active ||
      liquifyState.liquifying ||
      !payload.point?.inside
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    const previousCursorPoint =
      copyPoint(
        liquifyState.cursorPoint
      );


    drawLiquifyCursor(
      payload.point,
      pressure,
      previousCursorPoint
        ? payload.point.x -
          previousCursorPoint.x
        : 0,
      previousCursorPoint
        ? payload.point.y -
          previousCursorPoint.y
        : 0
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
      !liquifyState.liquifying
    ) {

      clearLiquifyCursor();

    }


    return false;

  }


  /* =======================================================
     15. ACTIVATION
  ======================================================= */

  function activate() {

    liquifyState.active =
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
      "Liquify ready. Drag through the image to push pixels like clay."
    );


    return true;

  }


  function deactivate() {

    if (
      liquifyState.liquifying
    ) {

      cancelLiquifyStroke();

    }


    liquifyState.active =
      false;


    clearLiquifyCursor();


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

          redrawLiquifyCursor();

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
          redrawLiquifyCursor
        );

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelLiquifyStroke
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelLiquifyStroke
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelLiquifyStroke
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      cancelLiquifyStroke
    );

  }


  /* =======================================================
     17. LIQUIFY MODULE
  ======================================================= */

  const liquifyModule = {

    name:
      "Liquify",

    label:
      "Liquify",

    initialised:
      false,


    async initialise() {

      if (
        liquifyState.initialised
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
          "Paintless Liquify could not find the editor canvases."
        );

      }


      connectEvents();


      liquifyState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "liquify"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:liquify-ready",
          {
            detail: {
              liquify:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Liquify ready.",
        [
          "color:#ff5fb7",
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
      liquifyState,


    activate,

    deactivate,


    beginLiquifyStroke,

    continueLiquifyStroke,

    finishLiquifyStroke,

    cancelLiquifyStroke,


    pushPixels,

    drawInterpolatedSegment,

    drawLiquifyCursor,

    clearLiquifyCursor,


    getLiquifySize,

    getLiquifyStrength,

    getLiquifyHardness,


    setSmoothing(
      value
    ) {

      liquifyState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return liquifyState.smoothing;

    },


    getSmoothing() {

      return liquifyState.smoothing;

    },


    setSpacing(
      value
    ) {

      liquifyState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return liquifyState.spacing;

    },


    getSpacing() {

      return liquifyState.spacing;

    },


    setMaximumPushRatio(
      value
    ) {

      liquifyState.maximumPushRatio =
        clamp(
          value,
          0.05,
          1
        );


      return liquifyState.maximumPushRatio;

    },


    setSourceRefresh(
      value
    ) {

      liquifyState.sourceRefresh =
        clamp(
          value,
          0,
          1
        );


      return liquifyState.sourceRefresh;

    },


    setPressureEnabled(
      enabled
    ) {

      liquifyState.pressureEnabled =
        Boolean(
          enabled
        );


      return liquifyState.pressureEnabled;

    },


    isLiquifying() {

      return liquifyState.liquifying;

    }

  };


  window.PaintlessLiquify =
    publicApi;


  liquifyModule.api =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "liquify",
    liquifyModule
  );

})();
