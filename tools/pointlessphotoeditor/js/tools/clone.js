"use strict";

/* =========================================================
   PAINTLESS
   CLONE STAMP TOOL — v1.0

   File:
   js/tools/clone.js

   Mobile-friendly workflow:

   1. Select Clone.
   2. Tap the source area you want to copy.
   3. Drag somewhere else to paint from that source.
   4. Tap the source marker again to reposition it.
   5. Press R to choose a new source.

   Features:
   - No Alt key required
   - Visible movable source marker
   - Live source preview
   - Smooth interpolated cloning
   - Adjustable size, opacity and hardness
   - Pen-pressure support
   - One completed clone stroke = one Undo step
   - Escape cancels the current stroke
   - Safe layer restoration
   - Locked-layer protection
   - Samples from the active layer

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
      "Paintless Clone could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. CLONE STATE
  ======================================================= */

  const cloneState = {

    initialised:
      false,

    active:
      false,

    cloning:
      false,

    choosingSource:
      true,

    movingSource:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    sourceSnapshot:
      null,

    sourcePoint:
      null,

    destinationStartPoint:
      null,

    previousPoint:
      null,

    currentPoint:
      null,

    sourceOffsetX:
      0,

    sourceOffsetY:
      0,

    accumulatedDistance:
      0,

    smoothing:
      0.32,

    spacing:
      0.1,

    minimumSpacing:
      0.75,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.25,

    pressureOpacityMinimum:
      0.35,

    sourceMarkerRadius:
      13,

    sourceHitPadding:
      10,

    cursorPoint:
      null,

    cursorPressure:
      1,

    cursorVisible:
      false,

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
      !cloneState.pressureEnabled ||
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


    cloneState.cursorVisible =
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

  function getCloneSize() {

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


  function getCloneOpacity() {

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
      1,
      0.01,
      1
    );

  }


  function getCloneHardness() {

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
      0.8,
      0,
      1
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const scale =
      cloneState.pressureSizeMinimum +
      (
        1 -
        cloneState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      1,
      getCloneSize() *
      scale
    );

  }


  function getEffectiveOpacity(
    pressure
  ) {

    const scale =
      cloneState.pressureOpacityMinimum +
      (
        1 -
        cloneState.pressureOpacityMinimum
      ) *
      pressure;


    return clamp(
      getCloneOpacity() *
      scale,
      0.01,
      1
    );

  }


  function getStampSpacing(
    pressure
  ) {

    return Math.max(
      cloneState.minimumSpacing,
      getEffectiveSize(
        pressure
      ) *
      cloneState.spacing
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
        "That layer cannot be cloned."
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
      !cloneState.layer ||
      !cloneState.layerBackup
    ) {

      return false;

    }


    const layer =
      cloneState.layer;


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
      cloneState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     8. SOURCE CONTROL
  ======================================================= */

  function hasSourcePoint() {

    return Boolean(
      cloneState.sourcePoint
    );

  }


  function pointTouchesSourceMarker(
    point
  ) {

    if (
      !point ||
      !cloneState.sourcePoint
    ) {

      return false;

    }


    return (
      distanceBetween(
        point,
        cloneState.sourcePoint
      ) <=
      cloneState.sourceMarkerRadius +
      cloneState.sourceHitPadding
    );

  }


  function setSourcePoint(
    point,
    {
      announce =
        true
    } = {}
  ) {

    if (!point) {

      return false;

    }


    const layer =
      getActiveLayer();


    if (
      !canEditLayer(
        layer
      )
    ) {

      return false;

    }


    cloneState.sourcePoint = {

      x:
        clamp(
          point.x,
          0,
          layer.canvas.width -
            1
        ),

      y:
        clamp(
          point.y,
          0,
          layer.canvas.height -
            1
        ),

      inside:
        true

    };


    cloneState.choosingSource =
      false;


    cloneState.movingSource =
      false;


    drawIdleOverlay(
      cloneState.cursorPoint
    );


    if (announce) {

      sendStatusMessage(
        "Clone source chosen. Now drag somewhere else to paint."
      );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:clone-source-changed",
        {
          detail: {
            point:
              copyPoint(
                cloneState.sourcePoint
              )
          }
        }
      )
    );


    return true;

  }


  function clearSourcePoint({
    announce =
      true
  } = {}) {

    if (
      cloneState.cloning
    ) {

      cancelCloneStroke();

    }


    cloneState.sourcePoint =
      null;


    cloneState.sourceSnapshot =
      null;


    cloneState.choosingSource =
      true;


    cloneState.movingSource =
      false;


    clearOverlay();


    if (announce) {

      sendStatusMessage(
        "Tap the area you want to clone from."
      );

    }


    return true;

  }


  function beginMovingSource(
    point
  ) {

    cloneState.movingSource =
      true;


    cloneState.choosingSource =
      true;


    cloneState.currentPoint =
      copyPoint(
        point
      );


    drawSourceMarker(
      point,
      {
        moving:
          true
      }
    );


    sendStatusMessage(
      "Move the source marker, then release."
    );


    return true;

  }


  function updateMovingSource(
    point
  ) {

    if (
      !cloneState.movingSource
    ) {

      return false;

    }


    cloneState.currentPoint =
      copyPoint(
        point
      );


    clearOverlay();


    drawSourcePreview(
      point
    );


    drawSourceMarker(
      point,
      {
        moving:
          true
      }
    );


    return true;

  }


  function finishMovingSource(
    point
  ) {

    if (
      !cloneState.movingSource
    ) {

      return false;

    }


    return setSourcePoint(
      point
    );

  }


  /* =======================================================
     9. SOURCE PREVIEW
  ======================================================= */

  function drawSourcePreview(
    point
  ) {

    const layer =
      getActiveLayer();


    if (
      !overlayContext ||
      !layer?.canvas ||
      !point
    ) {

      return false;

    }


    const size =
      getCloneSize();


    const radius =
      size /
      2;


    const sourceX =
      Math.round(
        point.x -
        radius
      );


    const sourceY =
      Math.round(
        point.y -
        radius
      );


    overlayContext.save();


    overlayContext.globalAlpha =
      0.62;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );


    overlayContext.clip();


    overlayContext.drawImage(
      layer.canvas,
      sourceX,
      sourceY,
      size,
      size,
      point.x -
        radius,
      point.y -
        radius,
      size,
      size
    );


    overlayContext.restore();


    return true;

  }


  function drawSourceMarker(
    point =
      cloneState.sourcePoint,
    {
      moving =
        false
    } = {}
  ) {

    if (
      !overlayContext ||
      !point
    ) {

      return false;

    }


    const radius =
      cloneState.sourceMarkerRadius;


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.setLineDash(
      moving
        ? [
            4,
            3
          ]
        : []
    );


    overlayContext.lineWidth =
      3;


    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.88)";


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius +
        2,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    overlayContext.lineWidth =
      1.5;


    overlayContext.strokeStyle =
      moving
        ? "#ffd75a"
        : "#35e7ff";


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


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.96)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.beginPath();


    overlayContext.moveTo(
      point.x -
        radius *
        0.55,
      point.y
    );


    overlayContext.lineTo(
      point.x +
        radius *
        0.55,
      point.y
    );


    overlayContext.moveTo(
      point.x,
      point.y -
        radius *
        0.55
    );


    overlayContext.lineTo(
      point.x,
      point.y +
        radius *
        0.55
    );


    overlayContext.stroke();


    overlayContext.restore();


    return true;

  }


  function drawDestinationCursor(
    point,
    pressure =
      1
  ) {

    if (
      !overlayContext ||
      !point
    ) {

      return false;

    }


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


    overlayContext.lineWidth =
      3;


    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.88)";


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


    overlayContext.lineWidth =
      1;


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.96)";


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


    overlayContext.restore();


    return true;

  }


  function drawSourceConnection(
    destinationPoint
  ) {

    if (
      !overlayContext ||
      !cloneState.sourcePoint ||
      !destinationPoint
    ) {

      return false;

    }


    const matchingSourcePoint = {

      x:
        destinationPoint.x +
        cloneState.sourceOffsetX,

      y:
        destinationPoint.y +
        cloneState.sourceOffsetY

    };


    overlayContext.save();


    overlayContext.globalAlpha =
      0.8;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.strokeStyle =
      "rgba(53, 231, 255, 0.85)";


    overlayContext.lineWidth =
      1;


    overlayContext.setLineDash(
      [
        5,
        5
      ]
    );


    overlayContext.beginPath();


    overlayContext.moveTo(
      matchingSourcePoint.x,
      matchingSourcePoint.y
    );


    overlayContext.lineTo(
      destinationPoint.x,
      destinationPoint.y
    );


    overlayContext.stroke();


    overlayContext.setLineDash(
      []
    );


    overlayContext.restore();


    drawSourceMarker(
      matchingSourcePoint
    );


    return true;

  }


  function drawIdleOverlay(
    cursorPoint =
      null,
    pressure =
      cloneState.cursorPressure
  ) {

    if (
      !cloneState.active
    ) {

      return false;

    }


    clearOverlay();


    if (
      cloneState.choosingSource
    ) {

      if (cursorPoint) {

        drawSourcePreview(
          cursorPoint
        );


        drawSourceMarker(
          cursorPoint,
          {
            moving:
              cloneState.movingSource
          }
        );

      }


      return true;

    }


    if (
      cloneState.sourcePoint
    ) {

      drawSourceMarker(
        cloneState.sourcePoint
      );

    }


    if (cursorPoint) {

      drawDestinationCursor(
        cursorPoint,
        pressure
      );

    }


    cloneState.cursorVisible =
      Boolean(
        cursorPoint
      );


    return true;

  }


  /* =======================================================
     10. SOFT CLONE MASK
  ======================================================= */

  function createCloneMask(
    size,
    hardness,
    opacity
  ) {

    const maskCanvas =
      document.createElement(
        "canvas"
      );


    const safeSize =
      Math.max(
        2,
        Math.ceil(
          size
        )
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
        `rgba(255, 255, 255, ${opacity})`;


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
      `rgba(255, 255, 255, ${opacity})`
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
        opacity *
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
     11. CLONE STAMP
  ======================================================= */

  function stampClone(
    destinationContext,
    destinationPoint
  ) {

    if (
      !destinationContext ||
      !destinationPoint ||
      !cloneState.sourceSnapshot
    ) {

      return false;

    }


    const pressure =
      clamp(
        destinationPoint.pressure,
        0.01,
        1
      );


    const size =
      getEffectiveSize(
        pressure
      );


    const halfSize =
      size /
      2;


    const opacity =
      getEffectiveOpacity(
        pressure
      );


    const hardness =
      getCloneHardness();


    const sourceCentreX =
      destinationPoint.x +
      cloneState.sourceOffsetX;


    const sourceCentreY =
      destinationPoint.y +
      cloneState.sourceOffsetY;


    const sourceX =
      sourceCentreX -
      halfSize;


    const sourceY =
      sourceCentreY -
      halfSize;


    /*
     * Build the sampled image and mask separately, then combine
     * them before drawing onto the destination layer.
     */

    const stampCanvas =
      document.createElement(
        "canvas"
      );


    const stampSize =
      Math.max(
        2,
        Math.ceil(
          size
        )
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
      cloneState.sourceSnapshot,
      sourceX,
      sourceY,
      size,
      size,
      0,
      0,
      stampSize,
      stampSize
    );


    const maskCanvas =
      createCloneMask(
        stampSize,
        hardness,
        opacity
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


    destinationContext.save();


    destinationContext.globalAlpha =
      1;


    destinationContext.globalCompositeOperation =
      "source-over";


    destinationContext.drawImage(
      stampCanvas,
      destinationPoint.x -
        stampSize /
        2,
      destinationPoint.y -
        stampSize /
        2
    );


    destinationContext.restore();


    return true;

  }


  /* =======================================================
     12. INTERPOLATION
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
        cloneState.smoothing,
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

      return stampClone(
        context,
        secondPoint
      );

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
      cloneState.accumulatedDistance;


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


      stampClone(
        context,
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


    cloneState.accumulatedDistance =
      usedDistance;


    if (
      cloneState.accumulatedDistance >=
      spacing
    ) {

      cloneState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     13. CLONE STROKE LIFECYCLE
  ======================================================= */

  function beginCloneStroke(
    payload
  ) {

    const layer =
      payload.layer ||
      getActiveLayer();


    if (
      !canEditLayer(
        layer
      ) ||
      !cloneState.sourcePoint
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    const destinationPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure

    };


    cloneState.cloning =
      true;


    cloneState.changed =
      false;


    cloneState.layer =
      layer;


    cloneState.layerBackup =
      createCanvasCopy(
        layer.canvas
      );


    /*
     * Source sampling always uses a frozen copy from the start
     * of the stroke. Newly painted pixels cannot feed back into
     * the clone source during the same drag.
     */

    cloneState.sourceSnapshot =
      createCanvasCopy(
        layer.canvas
      );


    cloneState.destinationStartPoint =
      copyPoint(
        destinationPoint
      );


    cloneState.previousPoint =
      copyPoint(
        destinationPoint
      );


    cloneState.currentPoint =
      copyPoint(
        destinationPoint
      );


    cloneState.sourceOffsetX =
      cloneState.sourcePoint.x -
      destinationPoint.x;


    cloneState.sourceOffsetY =
      cloneState.sourcePoint.y -
      destinationPoint.y;


    cloneState.accumulatedDistance =
      0;


    cloneState.strokeCounter +=
      1;


    clearOverlay();


    stampClone(
      layer.context,
      destinationPoint
    );


    cloneState.changed =
      true;


    payload.markChanged?.(
      true
    );


    renderLayers();


    drawSourceConnection(
      destinationPoint
    );


    return true;

  }


  function continueCloneStroke(
    payload
  ) {

    if (
      !cloneState.cloning ||
      !cloneState.layer
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
        cloneState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        cloneState.layer.context,
        cloneState.previousPoint,
        smoothedPoint
      );


    cloneState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    cloneState.currentPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      cloneState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    clearOverlay();


    drawSourceConnection(
      smoothedPoint
    );


    drawDestinationCursor(
      smoothedPoint,
      smoothedPoint.pressure
    );


    return changed;

  }


  function finishCloneStroke(
    payload
  ) {

    if (
      !cloneState.cloning
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
      cloneState.layer &&
      cloneState.previousPoint
    ) {

      drawInterpolatedSegment(
        cloneState.layer.context,
        cloneState.previousPoint,
        finalPoint
      );


      stampClone(
        cloneState.layer.context,
        finalPoint
      );


      cloneState.changed =
        true;


      renderLayers();

    }


    const changed =
      cloneState.changed;


    resetStrokeState();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveCloneHistory();


      sendStatusMessage(
        "Clone stroke saved."
      );

    }


    drawIdleOverlay(
      finalPoint,
      finalPoint.pressure
    );


    return changed;

  }


  function cancelCloneStroke() {

    if (
      !cloneState.cloning
    ) {

      drawIdleOverlay(
        cloneState.cursorPoint
      );


      return false;

    }


    restoreLayerBackup();


    resetStrokeState();


    drawIdleOverlay(
      cloneState.cursorPoint
    );


    sendStatusMessage(
      "Clone stroke cancelled."
    );


    return true;

  }


  function resetStrokeState() {

    cloneState.cloning =
      false;


    cloneState.changed =
      false;


    cloneState.layer =
      null;


    cloneState.layerBackup =
      null;


    cloneState.sourceSnapshot =
      null;


    cloneState.destinationStartPoint =
      null;


    cloneState.previousPoint =
      null;


    cloneState.currentPoint =
      null;


    cloneState.sourceOffsetX =
      0;


    cloneState.sourceOffsetY =
      0;


    cloneState.accumulatedDistance =
      0;

  }


  /* =======================================================
     14. HISTORY
  ======================================================= */

  function saveCloneHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Clone stamp"
        );

    }


    return getCore()
      ?.requestHistorySave?.(
        "Clone stamp"
      );

  }


  /* =======================================================
     15. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !cloneState.active
    ) {

      return false;

    }


    cloneState.cursorPoint =
      copyPoint(
        payload.point
      );


    /*
     * First tap chooses the source.
     */

    if (
      cloneState.choosingSource ||
      !hasSourcePoint()
    ) {

      setSourcePoint(
        payload.point
      );


      return {

        changed:
          false,

        preventDefault:
          true,

        releasePointer:
          true,

        clearOverlay:
          false

      };

    }


    /*
     * Tapping the visible source marker lets mobile users move
     * it directly without needing Alt or another keyboard key.
     */

    if (
      pointTouchesSourceMarker(
        payload.point
      )
    ) {

      beginMovingSource(
        payload.point
      );


      return {

        changed:
          false,

        preventDefault:
          true,

        capturePointer:
          true

      };

    }


    const started =
      beginCloneStroke(
        payload
      );


    return {

      changed:
        started,

      preventDefault:
        true,

      capturePointer:
        started,

      clearOverlay:
        false

    };

  }


  function pointerMove(
    payload
  ) {

    cloneState.cursorPoint =
      copyPoint(
        payload.point
      );


    cloneState.cursorPressure =
      normalisePressure(
        payload
      );


    if (
      cloneState.movingSource
    ) {

      updateMovingSource(
        payload.point
      );


      return {

        changed:
          false,

        preventDefault:
          true

      };

    }


    if (
      cloneState.cloning
    ) {

      const changed =
        continueCloneStroke(
          payload
        );


      return {

        changed,

        preventDefault:
          true

      };

    }


    drawIdleOverlay(
      payload.point,
      cloneState.cursorPressure
    );


    return false;

  }


  function pointerUp(
    payload
  ) {

    if (
      cloneState.movingSource
    ) {

      finishMovingSource(
        payload.point
      );


      return {

        changed:
          false,

        preventDefault:
          true,

        releasePointer:
          true

      };

    }


    if (
      cloneState.cloning
    ) {

      const changed =
        finishCloneStroke(
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


    return {

      changed:
        false,

      releasePointer:
        true

    };

  }


  function pointerCancel() {

    if (
      cloneState.movingSource
    ) {

      cloneState.movingSource =
        false;


      cloneState.choosingSource =
        false;


      drawIdleOverlay(
        cloneState.cursorPoint
      );


      return {

        changed:
          false,

        releasePointer:
          true

      };

    }


    cancelCloneStroke();


    return {

      changed:
        false,

      releasePointer:
        true

    };

  }


  function hover(
    payload
  ) {

    if (
      !cloneState.active ||
      cloneState.cloning ||
      cloneState.movingSource ||
      !payload.point?.inside
    ) {

      return false;

    }


    cloneState.cursorPoint =
      copyPoint(
        payload.point
      );


    cloneState.cursorPressure =
      normalisePressure(
        payload
      );


    drawIdleOverlay(
      payload.point,
      cloneState.cursorPressure
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

    cloneState.cursorVisible =
      false;


    if (
      !cloneState.cloning &&
      !cloneState.movingSource
    ) {

      clearOverlay();


      if (
        cloneState.sourcePoint
      ) {

        drawSourceMarker(
          cloneState.sourcePoint
        );

      }

    }


    return false;

  }


  /* =======================================================
     16. ACTIVATION
  ======================================================= */

  function activate() {

    cloneState.active =
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


    if (
      cloneState.sourcePoint
    ) {

      sendStatusMessage(
        "Clone ready. Drag to paint, or tap the source marker to move it."
      );


      drawSourceMarker(
        cloneState.sourcePoint
      );

    } else {

      cloneState.choosingSource =
        true;


      sendStatusMessage(
        "Tap the area you want to clone from."
      );

    }


    return true;

  }


  function deactivate() {

    if (
      cloneState.cloning
    ) {

      cancelCloneStroke();

    }


    cloneState.active =
      false;


    cloneState.movingSource =
      false;


    clearOverlay();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return true;

  }


  /* =======================================================
     17. DOM AND EVENTS
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


  function redrawOverlay() {

    if (
      !cloneState.active ||
      cloneState.cloning
    ) {

      return;

    }


    drawIdleOverlay(
      cloneState.cursorPoint,
      cloneState.cursorPressure
    );

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

          redrawOverlay();

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
          redrawOverlay
        );

      }
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          tools.getActiveTool() !==
          "clone" ||
          getCore()
            ?.isTypingElement?.()
        ) {

          return;

        }


        if (
          event.key.toLowerCase() ===
          "r"
        ) {

          event.preventDefault();


          clearSourcePoint();


          return;

        }


        if (
          event.key ===
          "Escape"
        ) {

          if (
            cloneState.cloning
          ) {

            event.preventDefault();


            cancelCloneStroke();

          } else if (
            cloneState.movingSource
          ) {

            event.preventDefault();


            cloneState.movingSource =
              false;


            cloneState.choosingSource =
              false;


            drawIdleOverlay(
              cloneState.cursorPoint
            );

          }

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        cancelCloneStroke();

        clearSourcePoint({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        cancelCloneStroke();

        clearSourcePoint({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        cancelCloneStroke();

        clearSourcePoint({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      () => {

        cancelCloneStroke();

        clearSourcePoint({
          announce:
            false
        });


        if (
          cloneState.active
        ) {

          sendStatusMessage(
            "Layer changed. Tap a new clone source."
          );

        }

      }
    );

  }


  /* =======================================================
     18. CLONE MODULE
  ======================================================= */

  const cloneModule = {

    name:
      "Clone",

    label:
      "Clone",

    initialised:
      false,


    async initialise() {

      if (
        cloneState.initialised
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
          "Paintless Clone could not find the editor canvases."
        );

      }


      connectEvents();


      cloneState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "clone"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:clone-ready",
          {
            detail: {
              clone:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Clone ready.",
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
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      cloneState,


    activate,

    deactivate,


    setSourcePoint,

    clearSourcePoint,

    hasSourcePoint,

    beginMovingSource,

    updateMovingSource,

    finishMovingSource,


    beginCloneStroke,

    continueCloneStroke,

    finishCloneStroke,

    cancelCloneStroke,


    stampClone,

    drawInterpolatedSegment,

    drawSourceMarker,

    drawSourcePreview,

    drawDestinationCursor,

    drawIdleOverlay,


    getSourcePoint() {

      return copyPoint(
        cloneState.sourcePoint
      );

    },


    isChoosingSource() {

      return cloneState.choosingSource;

    },


    isCloning() {

      return cloneState.cloning;

    },


    setSmoothing(
      value
    ) {

      cloneState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return cloneState.smoothing;

    },


    setSpacing(
      value
    ) {

      cloneState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return cloneState.spacing;

    },


    setPressureEnabled(
      enabled
    ) {

      cloneState.pressureEnabled =
        Boolean(
          enabled
        );


      return cloneState.pressureEnabled;

    }

  };


  window.PaintlessClone =
    publicApi;


  cloneModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "clone",
    cloneModule
  );

})();
