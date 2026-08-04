"use strict";

/* =========================================================
   PAINTLESS
   ERASER TOOL — v1.0

   File:
   js/tools/eraser.js

   Features:
   - Smooth interpolated erasing
   - Adjustable size
   - Adjustable opacity
   - Adjustable hardness
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live eraser cursor preview
   - One completed stroke = one Undo step
   - Safe cancellation with layer restoration
   - Active-layer locking protection

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
      "Paintless Eraser could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. ERASER STATE
  ======================================================= */

  const eraserState = {

    initialised:
      false,

    active:
      false,

    erasing:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    previousPoint:
      null,

    lastRenderedPoint:
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
      0.34,

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

    cursorOverlayCanvas:
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


  function getSelectionApi() {

    return (
      window.PaintlessSelection ||
      null
    );

  }


  /* =======================================================
     5. GENERIC HELPERS
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
      !eraserState.pressureEnabled
    ) {

      return 1;

    }


    if (
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
      pressure <= 0
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

    const core =
      getCore();


    if (
      typeof core?.sendStatusMessage ===
      "function"
    ) {

      core.sendStatusMessage(
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


  /* =======================================================
     6. ERASER SETTINGS
  ======================================================= */

  function getEraserSize() {

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


  function getEraserOpacity() {

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


  function getEraserHardness() {

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

    const pressureScale =
      eraserState.pressureSizeMinimum +
      (
        1 -
        eraserState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      1,
      getEraserSize() *
      pressureScale
    );

  }


  function getEffectiveOpacity(
    pressure
  ) {

    const pressureScale =
      eraserState.pressureOpacityMinimum +
      (
        1 -
        eraserState.pressureOpacityMinimum
      ) *
      pressure;


    return clamp(
      getEraserOpacity() *
      pressureScale,
      0.01,
      1
    );

  }


  function getStampSpacing(
    pressure
  ) {

    const effectiveSize =
      getEffectiveSize(
        pressure
      );


    return Math.max(
      eraserState.minimumSpacing,
      effectiveSize *
      eraserState.spacing
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
        "That layer cannot be erased."
      );


      return false;

    }


    return true;

  }


  function createLayerBackup(
    layer
  ) {

    if (
      !layer?.canvas
    ) {

      return null;

    }


    const backupCanvas =
      document.createElement(
        "canvas"
      );


    backupCanvas.width =
      layer.canvas.width;


    backupCanvas.height =
      layer.canvas.height;


    backupCanvas
      .getContext(
        "2d"
      )
      .drawImage(
        layer.canvas,
        0,
        0
      );


    return backupCanvas;

  }


  function restoreLayerBackup() {

    if (
      !eraserState.layer ||
      !eraserState.layerBackup
    ) {

      return false;

    }


    const layer =
      eraserState.layer;


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
      eraserState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

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
     8. LAYER COORDINATES
  ======================================================= */

  function documentPointToLayerPoint(
    point,
    layer
  ) {

    if (
      !point ||
      !layer?.canvas
    ) {

      return copyPoint(
        point
      );

    }


    const width =
      Math.max(
        1,
        layer.canvas.width
      );

    const height =
      Math.max(
        1,
        layer.canvas.height
      );


    const transformX =
      Number.isFinite(
        Number(
          layer.transformX
        )
      )
        ? Number(
            layer.transformX
          )
        : 0;

    const transformY =
      Number.isFinite(
        Number(
          layer.transformY
        )
      )
        ? Number(
            layer.transformY
          )
        : 0;

    const scaleX =
      Number.isFinite(
        Number(
          layer.scaleX
        )
      )
        ? Number(
            layer.scaleX
          ) || 1
        : 1;

    const scaleY =
      Number.isFinite(
        Number(
          layer.scaleY
        )
      )
        ? Number(
            layer.scaleY
          ) || 1
        : 1;

    const rotation =
      (
        Number(
          layer.rotation
        ) ||
        0
      ) *
      Math.PI /
      180;


    const centreX =
      transformX +
      width /
      2;

    const centreY =
      transformY +
      height /
      2;


    const offsetX =
      point.x -
      centreX;

    const offsetY =
      point.y -
      centreY;


    const cosine =
      Math.cos(
        -rotation
      );

    const sine =
      Math.sin(
        -rotation
      );


    const rotatedX =
      offsetX *
      cosine -
      offsetY *
      sine;

    const rotatedY =
      offsetX *
      sine +
      offsetY *
      cosine;


    return {

      x:
        rotatedX /
        scaleX +
        width /
        2,

      y:
        rotatedY /
        scaleY +
        height /
        2,

      pressure:
        clamp(
          point.pressure ??
          1,
          0,
          1
        )

    };

  }


  function getLayerAdjustedPoint(
    payload,
    layer
  ) {

    const pressure =
      normalisePressure(
        payload
      );


    return documentPointToLayerPoint(
      {
        x:
          payload.point.x,

        y:
          payload.point.y,

        pressure
      },
      layer
    );

  }


  /* =======================================================
     9. ERASER STAMP
  ======================================================= */

  function stampHardEraser(
    context,
    point,
    radius,
    opacity
  ) {

    context.save();


    context.globalAlpha =
      opacity;


    context.globalCompositeOperation =
      "destination-out";


    context.fillStyle =
      "#000000";


    context.beginPath();


    context.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );


    context.fill();


    context.restore();


    return true;

  }


  function stampSoftEraser(
    context,
    point,
    radius,
    opacity,
    hardness
  ) {

    const maskCanvas =
      document.createElement(
        "canvas"
      );


    const diameter =
      Math.max(
        2,
        Math.ceil(
          radius *
          2
        )
      );


    maskCanvas.width =
      diameter;


    maskCanvas.height =
      diameter;


    const maskContext =
      maskCanvas.getContext(
        "2d"
      );


    const centre =
      diameter /
      2;


    const solidRadius =
      radius *
      Math.pow(
        hardness,
        1.55
      );


    const gradient =
      maskContext.createRadialGradient(
        centre,
        centre,
        solidRadius,
        centre,
        centre,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(0, 0, 0, ${opacity})`
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
      `rgba(0, 0, 0, ${
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
      "rgba(0, 0, 0, 0)"
    );


    maskContext.fillStyle =
      gradient;


    maskContext.fillRect(
      0,
      0,
      diameter,
      diameter
    );


    context.save();


    context.globalAlpha =
      1;


    context.globalCompositeOperation =
      "destination-out";


    context.drawImage(
      maskCanvas,
      point.x -
        centre,
      point.y -
        centre
    );


    context.restore();


    return true;

  }


  function stampEraser(
    context,
    point
  ) {

    const selection =
      getSelectionApi();

    const hasSelection =
      typeof selection?.hasSelection === "function" &&
      selection.hasSelection();

    if (hasSelection) {
      context.save();
      if (typeof selection.clipContext === "function") {
        selection.clipContext(context);
      }
    }

    if (
      !context ||
      !point
    ) {

      return false;

    }


    const pressure =
      clamp(
        point.pressure,
        0.01,
        1
      );


    const size =
      getEffectiveSize(
        pressure
      );


    const radius =
      Math.max(
        0.5,
        size /
        2
      );


    const opacity =
      getEffectiveOpacity(
        pressure
      );


    const hardness =
      getEraserHardness();


    if (
      hardness >=
      0.985
    ) {

      const result = stampHardEraser(
        context,
        point,
        radius,
        opacity
      );
      if (hasSelection) context.restore();
      return result;

    }


    const result = stampSoftEraser(
      context,
      point,
      radius,
      opacity,
      hardness
    );

    if (hasSelection) context.restore();

    return result;

  }


  /* =======================================================
     9. STROKE INTERPOLATION
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


    const smoothing =
      clamp(
        eraserState.smoothing,
        0,
        0.92
      );


    const following =
      1 -
      smoothing;


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

      return stampEraser(
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
      eraserState.accumulatedDistance;


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


      stampEraser(
        context,
        stampPoint
      );


      eraserState.lastRenderedPoint =
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


    eraserState.accumulatedDistance =
      usedDistance;


    if (
      eraserState.accumulatedDistance >=
      spacing
    ) {

      eraserState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     10. CURSOR PREVIEW
  ======================================================= */

  function createCursorOverlayCanvas() {

    const existingCanvas =
      document.getElementById(
        "cursor-overlay-canvas"
      );


    if (existingCanvas) {

      return existingCanvas;

    }


    if (
      !dom.overlayCanvas ||
      !dom.overlayCanvas.parentElement
    ) {

      return null;

    }


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.id =
      "cursor-overlay-canvas";


    canvas.setAttribute(
      "aria-hidden",
      "true"
    );


    canvas.style.position =
      "absolute";

    canvas.style.left =
      "0";

    canvas.style.top =
      "0";

    canvas.style.pointerEvents =
      "none";

    canvas.style.touchAction =
      "none";

    canvas.style.userSelect =
      "none";

    canvas.style.zIndex =
      "22";


    dom.overlayCanvas.parentElement
      .appendChild(
        canvas
      );


    return canvas;

  }


  function synchroniseCursorOverlay() {

    if (
      !dom.cursorOverlayCanvas ||
      !dom.editorCanvas
    ) {

      return false;

    }


    if (
      dom.cursorOverlayCanvas.width !==
        dom.editorCanvas.width
    ) {

      dom.cursorOverlayCanvas.width =
        dom.editorCanvas.width;

    }


    if (
      dom.cursorOverlayCanvas.height !==
        dom.editorCanvas.height
    ) {

      dom.cursorOverlayCanvas.height =
        dom.editorCanvas.height;

    }


    const editorStyle =
      window.getComputedStyle(
        dom.editorCanvas
      );


    dom.cursorOverlayCanvas.style.width =
      editorStyle.width;

    dom.cursorOverlayCanvas.style.height =
      editorStyle.height;

    dom.cursorOverlayCanvas.style.transform =
      editorStyle.transform ===
        "none"
        ? ""
        : editorStyle.transform;

    dom.cursorOverlayCanvas.style.transformOrigin =
      editorStyle.transformOrigin;

    dom.cursorOverlayCanvas.style.borderRadius =
      editorStyle.borderRadius;


    return true;

  }


  function clearEraserCursor() {

    if (
      dom.cursorOverlayCanvas &&
      overlayContext
    ) {

      overlayContext.save();


      overlayContext.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
      );


      overlayContext.globalAlpha =
        1;


      overlayContext.globalCompositeOperation =
        "source-over";


      overlayContext.setLineDash(
        []
      );


      overlayContext.clearRect(
        0,
        0,
        dom.cursorOverlayCanvas.width,
        dom.cursorOverlayCanvas.height
      );


      overlayContext.restore();

    }


    eraserState.cursorVisible =
      false;

  }


  function drawEraserCursor(
    point,
    pressure =
      1
  ) {

    if (
      !eraserState.active ||
      eraserState.erasing ||
      !overlayContext ||
      !point
    ) {

      return;

    }


    clearEraserCursor();


    synchroniseCursorOverlay();


    const size =
      getEffectiveSize(
        pressure
      );


    const radius =
      Math.max(
        0.5,
        size /
        2
      );


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.setLineDash(
      []
    );


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


    overlayContext.strokeStyle =
      "rgba(255, 89, 109, 0.9)";


    overlayContext.lineWidth =
      1;


    overlayContext.beginPath();


    overlayContext.moveTo(
      point.x -
        radius *
        0.42,
      point.y -
        radius *
        0.42
    );


    overlayContext.lineTo(
      point.x +
        radius *
        0.42,
      point.y +
        radius *
        0.42
    );


    overlayContext.stroke();


    overlayContext.restore();


    eraserState.cursorPoint =
      copyPoint(
        point
      );


    eraserState.cursorPressure =
      pressure;


    eraserState.cursorVisible =
      true;

  }


  function redrawEraserCursor() {

    if (
      !eraserState.cursorVisible ||
      !eraserState.cursorPoint
    ) {

      return;

    }


    drawEraserCursor(
      eraserState.cursorPoint,
      eraserState.cursorPressure
    );

  }


  /* =======================================================
     11. HISTORY
  ======================================================= */

  function saveEraserHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Erase"
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          "Erase"
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Erase"
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     12. STROKE LIFECYCLE
  ======================================================= */

  function beginStroke(
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


    const point =
      getLayerAdjustedPoint(
        payload,
        layer
      );


    eraserState.erasing =
      true;


    eraserState.changed =
      false;


    eraserState.layer =
      layer;


    eraserState.layerBackup =
      createLayerBackup(
        layer
      );


    eraserState.previousPoint =
      copyPoint(
        point
      );


    eraserState.lastRenderedPoint =
      copyPoint(
        point
      );


    eraserState.accumulatedDistance =
      0;


    eraserState.strokeCounter +=
      1;


    clearEraserCursor();


    stampEraser(
      layer.context,
      point
    );


    eraserState.changed =
      true;


    payload.markChanged?.(
      true
    );


    renderLayers();


    return true;

  }


  function continueStroke(
    payload
  ) {

    if (
      !eraserState.erasing ||
      !eraserState.layer
    ) {

      return false;

    }


    const incomingPoint =
      getLayerAdjustedPoint(
        payload,
        eraserState.layer
      );


    const smoothedPoint =
      smoothIncomingPoint(
        eraserState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        eraserState.layer.context,
        eraserState.previousPoint,
        smoothedPoint
      );


    eraserState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      eraserState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();


      document.dispatchEvent(
        new CustomEvent(
          "paintless:artwork-changed",
          {
            detail: {
              reason:
                "eraser-stroke",

              layer:
                eraserState.layer
            }
          }
        )
      );

    }


    return changed;

  }


  function finishStroke(
    payload
  ) {

    if (
      !eraserState.erasing
    ) {

      return false;

    }


    const finalPoint =
      eraserState.layer
        ? getLayerAdjustedPoint(
            payload,
            eraserState.layer
          )
        : {
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
      eraserState.layer &&
      eraserState.previousPoint
    ) {

      drawInterpolatedSegment(
        eraserState.layer.context,
        eraserState.previousPoint,
        finalPoint
      );


      stampEraser(
        eraserState.layer.context,
        finalPoint
      );


      eraserState.changed =
        true;


      renderLayers();

    }


    const changed =
      eraserState.changed;


    eraserState.erasing =
      false;


    eraserState.layer =
      null;


    eraserState.layerBackup =
      null;


    eraserState.previousPoint =
      null;


    eraserState.lastRenderedPoint =
      null;


    eraserState.accumulatedDistance =
      0;


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveEraserHistory();


      sendStatusMessage(
        "Evidence successfully destroyed."
      );

    }


    eraserState.changed =
      false;


    if (
      payload.point?.inside
    ) {

      drawEraserCursor(
        payload.point,
        normalisePressure(
          payload
        )
      );

    }


    return changed;

  }


  function cancelStroke() {

    if (
      !eraserState.erasing
    ) {

      clearEraserCursor();


      return false;

    }


    restoreLayerBackup();


    eraserState.erasing =
      false;


    eraserState.changed =
      false;


    eraserState.layer =
      null;


    eraserState.layerBackup =
      null;


    eraserState.previousPoint =
      null;


    eraserState.lastRenderedPoint =
      null;


    eraserState.accumulatedDistance =
      0;


    clearEraserCursor();


    sendStatusMessage(
      "Erase cancelled."
    );


    return true;

  }


  /* =======================================================
     13. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !eraserState.active
    ) {

      return false;

    }


    const started =
      beginStroke(
        payload
      );


    return {

      changed:
        started,

      preventDefault:
        true,

      capturePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !eraserState.active
    ) {

      return false;

    }


    if (
      !eraserState.erasing
    ) {

      if (
        payload.point?.inside
      ) {

        drawEraserCursor(
          payload.point,
          normalisePressure(
            payload
          )
        );

      }


      return false;

    }


    const changed =
      continueStroke(
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
      !eraserState.erasing
    ) {

      return false;

    }


    const changed =
      finishStroke(
        payload
      );


    return {

      changed,

      preventDefault:
        true,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerCancel() {

    cancelStroke();


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
      !eraserState.active ||
      eraserState.erasing ||
      !payload.point?.inside
    ) {

      return false;

    }


    drawEraserCursor(
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

    if (
      !eraserState.active ||
      eraserState.erasing
    ) {

      return false;

    }


    drawEraserCursor(
      payload.point,
      normalisePressure(
        payload
      )
    );


    return false;

  }


  function pointerLeave() {

    if (
      !eraserState.erasing
    ) {

      clearEraserCursor();

    }


    return false;

  }


  /* =======================================================
     14. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    eraserState.active =
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
      "Eraser ready. Nothing is safe."
    );


    return true;

  }


  function deactivate() {

    if (
      eraserState.erasing
    ) {

      cancelStroke();

    }


    eraserState.active =
      false;


    clearEraserCursor();


    return true;

  }


  /* =======================================================
     15. EVENTS
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


    dom.cursorOverlayCanvas =
      createCursorOverlayCanvas();


    synchroniseCursorOverlay();


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
      dom.cursorOverlayCanvas
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
            "hardness",
            "opacity"
          ].includes(
            event.detail?.property
          )
        ) {

          redrawEraserCursor();

        }

      }
    );


    dom.brushSizeInput
      ?.addEventListener(
        "input",
        redrawEraserCursor
      );


    dom.opacityInput
      ?.addEventListener(
        "input",
        redrawEraserCursor
      );


    dom.hardnessInput
      ?.addEventListener(
        "input",
        redrawEraserCursor
      );


    document.addEventListener(
      "paintless:history-restored",
      cancelStroke
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelStroke
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        cancelStroke();

        synchroniseCursorOverlay();

      }
    );


    document.addEventListener(
      "paintless:layer-transformed",
      redrawEraserCursor
    );


    window.addEventListener(
      "resize",
      () => {

        synchroniseCursorOverlay();

        redrawEraserCursor();

      }
    );


    window.addEventListener(
      "focus",
      () => {

        synchroniseCursorOverlay();

        redrawEraserCursor();

      }
    );

  }


  /* =======================================================
     16. ERASER MODULE
  ======================================================= */

  const eraserModule = {

    name:
      "Eraser",

    label:
      "Eraser",

    initialised:
      false,


    async initialise() {

      if (
        eraserState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (
        !dom.editorCanvas ||
        !dom.overlayCanvas ||
        !dom.cursorOverlayCanvas ||
        !overlayContext
      ) {

        throw new Error(
          "Paintless Eraser could not find the editor canvases."
        );

      }


      connectEvents();


      eraserState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "eraser"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:eraser-ready",
          {
            detail: {
              eraser:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Eraser ready.",
        [
          "color:#ff596d",
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
     17. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      eraserState,


    activate,

    deactivate,


    beginStroke,

    continueStroke,

    finishStroke,

    cancelStroke,


    stampEraser,

    drawInterpolatedSegment,

    drawEraserCursor,

    clearEraserCursor,


    getEraserSize,

    getEraserOpacity,

    getEraserHardness,


    setSmoothing(
      value
    ) {

      eraserState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return eraserState.smoothing;

    },


    getSmoothing() {

      return eraserState.smoothing;

    },


    setSpacing(
      value
    ) {

      eraserState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return eraserState.spacing;

    },


    getSpacing() {

      return eraserState.spacing;

    },


    setPressureEnabled(
      enabled
    ) {

      eraserState.pressureEnabled =
        Boolean(
          enabled
        );


      return eraserState.pressureEnabled;

    },


    isPressureEnabled() {

      return eraserState.pressureEnabled;

    },


    isErasing() {

      return eraserState.erasing;

    }

  };


  window.PaintlessEraser =
    publicApi;


  eraserModule.api =
    publicApi;


  /* =======================================================
     18. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "eraser",
    eraserModule
  );

})();
