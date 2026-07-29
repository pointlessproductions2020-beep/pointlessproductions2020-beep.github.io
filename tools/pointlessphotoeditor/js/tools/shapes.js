"use strict";

/* =========================================================
   PAINTLESS
   SHAPES TOOL — v1.0

   File:
   js/tools/shapes.js

   Features:
   - Ellipse
   - Rectangle
   - Rounded rectangle
   - Line
   - Live preview on overlay canvas
   - Primary colour fill
   - Secondary colour outline when Fill + Stroke are enabled
   - Adjustable outline width
   - Adjustable opacity
   - Adjustable corner radius
   - Mouse, touch and pen support
   - One completed shape = one Undo step
   - Safe cancellation
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
      "Paintless Shapes could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. SHAPE STATE
  ======================================================= */

  const shapeState = {

    initialised:
      false,

    active:
      false,

    drawing:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    startPoint:
      null,

    currentPoint:
      null,

    selectedShape:
      "ellipse",

    fillEnabled:
      false,

    strokeEnabled:
      true,

    cornerRadius:
      24,

    constrainProportions:
      false,

    drawFromCentre:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    shapeTypeInput:
      null,

    shapeFillInput:
      null,

    shapeStrokeInput:
      null,

    cornerRadiusInput:
      null,

    cornerRadiusOutput:
      null,

    brushSizeInput:
      null,

    opacityInput:
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


  function getColours() {

    return (
      window.PaintlessColours ||
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

      inside:
        Boolean(
          point.inside
        )

    };

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


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();

  }


  /* =======================================================
     6. SHAPE SETTINGS
  ======================================================= */

  function getSelectedShape() {

    const selectedShape =
      tools.getState(
        "selectedShape"
      ) ||
      shapeState.selectedShape ||
      dom.shapeTypeInput?.value ||
      "ellipse";


    if (
      [
        "ellipse",
        "rectangle",
        "rounded-rectangle",
        "line"
      ].includes(
        selectedShape
      )
    ) {

      return selectedShape;

    }


    return "ellipse";

  }


  function getFillEnabled() {

    return Boolean(
      tools.getState(
        "shapeFillEnabled"
      ) ??
      dom.shapeFillInput?.checked ??
      shapeState.fillEnabled
    );

  }


  function getStrokeEnabled() {

    return Boolean(
      tools.getState(
        "shapeStrokeEnabled"
      ) ??
      dom.shapeStrokeInput?.checked ??
      shapeState.strokeEnabled
    );

  }


  function getCornerRadius() {

    return clamp(
      tools.getState(
        "shapeCornerRadius"
      ) ??
      dom.cornerRadiusInput?.value ??
      shapeState.cornerRadius ??
      24,
      0,
      100
    );

  }


  function getStrokeWidth() {

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


  function getOpacity() {

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


  function getFillColour() {

    return (
      getColours()
        ?.getFillColour?.() ||
      getColours()
        ?.getPrimaryColour?.() ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff"
    );

  }


  function getStrokeColour(
    fillEnabled
  ) {

    return (
      getColours()
        ?.getStrokeColour?.({
          filled:
            fillEnabled
        }) ||
      (
        fillEnabled
          ? getColours()
              ?.getSecondaryColour?.()
          : getColours()
              ?.getPrimaryColour?.()
      ) ||
      tools.getState(
        fillEnabled
          ? "secondaryColour"
          : "primaryColour"
      ) ||
      (
        fillEnabled
          ? "#ffffff"
          : "#a84cff"
      )
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
        "That layer cannot accept shapes."
      );


      return false;

    }


    return true;

  }


  function createLayerBackup(
    layer
  ) {

    if (!layer?.canvas) {

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
      !shapeState.layer ||
      !shapeState.layerBackup
    ) {

      return false;

    }


    const layer =
      shapeState.layer;


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
      shapeState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     8. RECTANGLE CALCULATION
  ======================================================= */

  function getNormalisedRectangle(
    firstPoint,
    secondPoint,
    {
      constrain =
        false,

      fromCentre =
        false
    } = {}
  ) {

    let startX =
      firstPoint.x;


    let startY =
      firstPoint.y;


    let endX =
      secondPoint.x;


    let endY =
      secondPoint.y;


    if (constrain) {

      const width =
        endX -
        startX;


      const height =
        endY -
        startY;


      const size =
        Math.max(
          Math.abs(
            width
          ),
          Math.abs(
            height
          )
        );


      endX =
        startX +
        Math.sign(
          width ||
          1
        ) *
        size;


      endY =
        startY +
        Math.sign(
          height ||
          1
        ) *
        size;

    }


    if (fromCentre) {

      const halfWidth =
        Math.abs(
          endX -
          startX
        );


      const halfHeight =
        Math.abs(
          endY -
          startY
        );


      return {

        x:
          startX -
          halfWidth,

        y:
          startY -
          halfHeight,

        width:
          halfWidth *
          2,

        height:
          halfHeight *
          2

      };

    }


    return {

      x:
        Math.min(
          startX,
          endX
        ),

      y:
        Math.min(
          startY,
          endY
        ),

      width:
        Math.abs(
          endX -
          startX
        ),

      height:
        Math.abs(
          endY -
          startY
        )

    };

  }


  /* =======================================================
     9. PATH BUILDERS
  ======================================================= */

  function createRoundedRectanglePath(
    context,
    rectangle,
    radius
  ) {

    const safeRadius =
      Math.min(
        Math.max(
          0,
          radius
        ),
        rectangle.width /
          2,
        rectangle.height /
          2
      );


    context.beginPath();


    context.moveTo(
      rectangle.x +
        safeRadius,
      rectangle.y
    );


    context.lineTo(
      rectangle.x +
        rectangle.width -
        safeRadius,
      rectangle.y
    );


    context.quadraticCurveTo(
      rectangle.x +
        rectangle.width,
      rectangle.y,
      rectangle.x +
        rectangle.width,
      rectangle.y +
        safeRadius
    );


    context.lineTo(
      rectangle.x +
        rectangle.width,
      rectangle.y +
        rectangle.height -
        safeRadius
    );


    context.quadraticCurveTo(
      rectangle.x +
        rectangle.width,
      rectangle.y +
        rectangle.height,
      rectangle.x +
        rectangle.width -
        safeRadius,
      rectangle.y +
        rectangle.height
    );


    context.lineTo(
      rectangle.x +
        safeRadius,
      rectangle.y +
        rectangle.height
    );


    context.quadraticCurveTo(
      rectangle.x,
      rectangle.y +
        rectangle.height,
      rectangle.x,
      rectangle.y +
        rectangle.height -
        safeRadius
    );


    context.lineTo(
      rectangle.x,
      rectangle.y +
        safeRadius
    );


    context.quadraticCurveTo(
      rectangle.x,
      rectangle.y,
      rectangle.x +
        safeRadius,
      rectangle.y
    );


    context.closePath();

  }


  function buildShapePath(
    context,
    shapeName,
    startPoint,
    endPoint,
    options =
      {}
  ) {

    if (
      !context ||
      !startPoint ||
      !endPoint
    ) {

      return null;

    }


    if (
      shapeName ===
      "line"
    ) {

      const lineEnd =
        getConstrainedLineEnd(
          startPoint,
          endPoint,
          options.constrain
        );


      context.beginPath();


      context.moveTo(
        startPoint.x,
        startPoint.y
      );


      context.lineTo(
        lineEnd.x,
        lineEnd.y
      );


      return {

        type:
          "line",

        startPoint:
          copyPoint(
            startPoint
          ),

        endPoint:
          lineEnd,

        width:
          Math.abs(
            lineEnd.x -
            startPoint.x
          ),

        height:
          Math.abs(
            lineEnd.y -
            startPoint.y
          )

      };

    }


    const rectangle =
      getNormalisedRectangle(
        startPoint,
        endPoint,
        {
          constrain:
            options.constrain,

          fromCentre:
            options.fromCentre
        }
      );


    context.beginPath();


    switch (
      shapeName
    ) {

      case "ellipse":

        context.ellipse(
          rectangle.x +
            rectangle.width /
            2,
          rectangle.y +
            rectangle.height /
            2,
          rectangle.width /
            2,
          rectangle.height /
            2,
          0,
          0,
          Math.PI *
            2
        );

        break;


      case "rounded-rectangle":

        createRoundedRectanglePath(
          context,
          rectangle,
          options.cornerRadius ??
          getCornerRadius()
        );

        break;


      case "rectangle":
      default:

        context.rect(
          rectangle.x,
          rectangle.y,
          rectangle.width,
          rectangle.height
        );

        break;

    }


    return {

      type:
        shapeName,

      rectangle,

      width:
        rectangle.width,

      height:
        rectangle.height

    };

  }


  function getConstrainedLineEnd(
    startPoint,
    endPoint,
    constrain
  ) {

    if (!constrain) {

      return copyPoint(
        endPoint
      );

    }


    const deltaX =
      endPoint.x -
      startPoint.x;


    const deltaY =
      endPoint.y -
      startPoint.y;


    const distance =
      Math.hypot(
        deltaX,
        deltaY
      );


    if (
      distance <=
      0.001
    ) {

      return copyPoint(
        endPoint
      );

    }


    const rawAngle =
      Math.atan2(
        deltaY,
        deltaX
      );


    const angleStep =
      Math.PI /
      4;


    const snappedAngle =
      Math.round(
        rawAngle /
        angleStep
      ) *
      angleStep;


    return {

      x:
        startPoint.x +
        Math.cos(
          snappedAngle
        ) *
        distance,

      y:
        startPoint.y +
        Math.sin(
          snappedAngle
        ) *
        distance,

      inside:
        endPoint.inside

    };

  }


  /* =======================================================
     10. DRAW SHAPE
  ======================================================= */

  function drawShape(
    context,
    startPoint,
    endPoint,
    {
      preview =
        false,

      constrain =
        false,

      fromCentre =
        false
    } = {}
  ) {

    if (
      !context ||
      !startPoint ||
      !endPoint
    ) {

      return false;

    }


    const shapeName =
      getSelectedShape();


    const fillEnabled =
      shapeName ===
      "line"
        ? false
        : getFillEnabled();


    const strokeEnabled =
      shapeName ===
        "line" ||
      getStrokeEnabled() ||
      !fillEnabled;


    const opacity =
      getOpacity();


    const strokeWidth =
      getStrokeWidth();


    context.save();


    context.globalAlpha =
      preview
        ? Math.min(
            0.78,
            opacity
          )
        : opacity;


    context.globalCompositeOperation =
      "source-over";


    context.lineWidth =
      strokeWidth;


    context.lineCap =
      "round";


    context.lineJoin =
      "round";


    context.fillStyle =
      getFillColour();


    context.strokeStyle =
      getStrokeColour(
        fillEnabled
      );


    if (preview) {

      context.setLineDash(
        [
          8,
          5
        ]
      );

    } else {

      context.setLineDash(
        []
      );

    }


    const shapeData =
      buildShapePath(
        context,
        shapeName,
        startPoint,
        endPoint,
        {
          constrain,

          fromCentre,

          cornerRadius:
            getCornerRadius()
        }
      );


    if (!shapeData) {

      context.restore();


      return false;

    }


    const tooSmall =
      shapeName ===
      "line"
        ? Math.hypot(
            shapeData.endPoint.x -
              shapeData.startPoint.x,
            shapeData.endPoint.y -
              shapeData.startPoint.y
          ) <
          1
        : shapeData.width <
            1 ||
          shapeData.height <
            1;


    if (tooSmall) {

      context.restore();


      return false;

    }


    if (fillEnabled) {

      context.fill();

    }


    if (strokeEnabled) {

      context.stroke();

    }


    context.restore();


    return true;

  }


  /* =======================================================
     11. PREVIEW
  ======================================================= */

  function drawPreview(
    startPoint,
    endPoint,
    payload =
      {}
  ) {

    if (
      !overlayContext ||
      !startPoint ||
      !endPoint
    ) {

      return false;

    }


    clearOverlay();


    return drawShape(
      overlayContext,
      startPoint,
      endPoint,
      {
        preview:
          true,

        constrain:
          Boolean(
            payload.shiftKey ||
            shapeState.constrainProportions
          ),

        fromCentre:
          Boolean(
            payload.altKey ||
            shapeState.drawFromCentre
          )
      }
    );

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function getShapeHistoryReason() {

    const labels = {

      ellipse:
        "Draw ellipse",

      rectangle:
        "Draw rectangle",

      "rounded-rectangle":
        "Draw rounded rectangle",

      line:
        "Draw line"

    };


    return (
      labels[
        getSelectedShape()
      ] ||
      "Draw shape"
    );

  }


  function saveShapeHistory() {

    const reason =
      getShapeHistoryReason();


    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          reason
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          reason
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     13. SHAPE LIFECYCLE
  ======================================================= */

  function beginShape(
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


    shapeState.drawing =
      true;


    shapeState.changed =
      false;


    shapeState.layer =
      layer;


    shapeState.layerBackup =
      createLayerBackup(
        layer
      );


    shapeState.startPoint =
      copyPoint(
        payload.point
      );


    shapeState.currentPoint =
      copyPoint(
        payload.point
      );


    clearOverlay();


    return true;

  }


  function updateShape(
    payload
  ) {

    if (
      !shapeState.drawing ||
      !shapeState.startPoint
    ) {

      return false;

    }


    shapeState.currentPoint =
      copyPoint(
        payload.point
      );


    return drawPreview(
      shapeState.startPoint,
      shapeState.currentPoint,
      payload
    );

  }


  function finishShape(
    payload
  ) {

    if (
      !shapeState.drawing ||
      !shapeState.layer ||
      !shapeState.startPoint
    ) {

      return false;

    }


    shapeState.currentPoint =
      copyPoint(
        payload.point
      );


    clearOverlay();


    const changed =
      drawShape(
        shapeState.layer.context,
        shapeState.startPoint,
        shapeState.currentPoint,
        {
          preview:
            false,

          constrain:
            Boolean(
              payload.shiftKey ||
              shapeState.constrainProportions
            ),

          fromCentre:
            Boolean(
              payload.altKey ||
              shapeState.drawFromCentre
            )
        }
      );


    if (changed) {

      renderLayers();


      payload.markChanged?.(
        true
      );


      saveShapeHistory();


      sendStatusMessage(
        `${getShapeHistoryReason()} saved.`
      );

    }


    resetShapeState();


    return changed;

  }


  function cancelShape() {

    if (
      !shapeState.drawing
    ) {

      clearOverlay();


      return false;

    }


    restoreLayerBackup();


    clearOverlay();


    resetShapeState();


    sendStatusMessage(
      "Shape cancelled."
    );


    return true;

  }


  function resetShapeState() {

    shapeState.drawing =
      false;


    shapeState.changed =
      false;


    shapeState.layer =
      null;


    shapeState.layerBackup =
      null;


    shapeState.startPoint =
      null;


    shapeState.currentPoint =
      null;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !shapeState.active
    ) {

      return false;

    }


    const started =
      beginShape(
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
      !shapeState.active ||
      !shapeState.drawing
    ) {

      return false;

    }


    updateShape(
      payload
    );


    return {

      changed:
        false,

      preventDefault:
        true

    };

  }


  function pointerUp(
    payload
  ) {

    if (
      !shapeState.drawing
    ) {

      return false;

    }


    const changed =
      finishShape(
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

    cancelShape();


    return {

      changed:
        false,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerLeave() {

    if (
      !shapeState.drawing
    ) {

      clearOverlay();

    }


    return false;

  }


  /* =======================================================
     15. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    shapeState.active =
      true;


    shapeState.selectedShape =
      getSelectedShape();


    getCore()
      ?.showToolOptions?.(
        [
          "brush",
          "opacity",
          "shape"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "crosshair"
      );


    sendStatusMessage(
      `${formatShapeName(
        shapeState.selectedShape
      )} ready.`
    );


    return true;

  }


  function deactivate() {

    if (
      shapeState.drawing
    ) {

      cancelShape();

    }


    shapeState.active =
      false;


    clearOverlay();


    return true;

  }


  function formatShapeName(
    shapeName
  ) {

    return String(
      shapeName ||
      "shape"
    )
      .replace(
        /-/g,
        " "
      )
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );

  }


  /* =======================================================
     16. SETTING SYNCHRONISATION
  ======================================================= */

  function syncShapeState() {

    shapeState.selectedShape =
      getSelectedShape();


    shapeState.fillEnabled =
      getFillEnabled();


    shapeState.strokeEnabled =
      getStrokeEnabled();


    shapeState.cornerRadius =
      getCornerRadius();

  }


  function connectEvents() {

    document.addEventListener(
      "paintless:shape-changed",
      (event) => {

        const shape =
          event.detail?.shape;


        if (
          [
            "ellipse",
            "rectangle",
            "rounded-rectangle",
            "line"
          ].includes(
            shape
          )
        ) {

          shapeState.selectedShape =
            shape;

        }


        if (
          shapeState.drawing
        ) {

          cancelShape();

        }

      }
    );


    document.addEventListener(
      "paintless:shape-selected",
      (event) => {

        const shape =
          event.detail?.shape;


        if (shape) {

          shapeState.selectedShape =
            shape;

        }

      }
    );


    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        const property =
          event.detail?.property;


        if (
          [
            "selectedShape",
            "shapeFillEnabled",
            "shapeStrokeEnabled",
            "shapeCornerRadius"
          ].includes(
            property
          )
        ) {

          syncShapeState();


          if (
            shapeState.drawing &&
            shapeState.startPoint &&
            shapeState.currentPoint
          ) {

            drawPreview(
              shapeState.startPoint,
              shapeState.currentPoint
            );

          }

        }

      }
    );


    dom.shapeTypeInput
      ?.addEventListener(
        "change",
        syncShapeState
      );


    dom.shapeFillInput
      ?.addEventListener(
        "change",
        syncShapeState
      );


    dom.shapeStrokeInput
      ?.addEventListener(
        "change",
        syncShapeState
      );


    dom.cornerRadiusInput
      ?.addEventListener(
        "input",
        syncShapeState
      );


    document.addEventListener(
      "paintless:primary-colour-changed",
      () => {

        if (
          shapeState.drawing &&
          shapeState.startPoint &&
          shapeState.currentPoint
        ) {

          drawPreview(
            shapeState.startPoint,
            shapeState.currentPoint
          );

        }

      }
    );


    document.addEventListener(
      "paintless:secondary-colour-changed",
      () => {

        if (
          shapeState.drawing &&
          shapeState.startPoint &&
          shapeState.currentPoint
        ) {

          drawPreview(
            shapeState.startPoint,
            shapeState.currentPoint
          );

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelShape
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelShape
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelShape
    );

  }


  /* =======================================================
     17. DOM COLLECTION
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


    dom.shapeTypeInput =
      document.getElementById(
        "shape-type"
      );


    dom.shapeFillInput =
      document.getElementById(
        "shape-fill-enabled"
      );


    dom.shapeStrokeInput =
      document.getElementById(
        "shape-stroke-enabled"
      );


    dom.cornerRadiusInput =
      document.getElementById(
        "shape-corner-radius"
      );


    dom.cornerRadiusOutput =
      document.getElementById(
        "shape-corner-radius-output"
      );


    dom.brushSizeInput =
      document.getElementById(
        "brush-size"
      );


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  /* =======================================================
     18. SHAPES MODULE
  ======================================================= */

  const shapeModule = {

    name:
      "Shapes",

    label:
      "Shape",

    initialised:
      false,


    async initialise() {

      if (
        shapeState.initialised
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
          "Paintless Shapes could not find the editor canvases."
        );

      }


      syncShapeState();

      connectEvents();


      shapeState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "shape"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:shapes-ready",
          {
            detail: {
              shapes:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Shapes ready.",
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

    pointerLeave

  };


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      shapeState,


    activate,

    deactivate,


    beginShape,

    updateShape,

    finishShape,

    cancelShape,


    drawShape,

    drawPreview,

    buildShapePath,

    createRoundedRectanglePath,

    getNormalisedRectangle,


    getSelectedShape,

    getFillEnabled,

    getStrokeEnabled,

    getCornerRadius,

    getStrokeWidth,

    getOpacity,

    getFillColour,

    getStrokeColour,


    setSelectedShape(
      shapeName
    ) {

      const validShapes = [
        "ellipse",
        "rectangle",
        "rounded-rectangle",
        "line"
      ];


      if (
        !validShapes.includes(
          shapeName
        )
      ) {

        return false;

      }


      shapeState.selectedShape =
        shapeName;


      return getCore()
        ?.setSelectedShape?.(
          shapeName
        ) ??
        tools.setState(
          "selectedShape",
          shapeName
        );

    },


    setConstrainProportions(
      enabled
    ) {

      shapeState.constrainProportions =
        Boolean(
          enabled
        );


      return shapeState
        .constrainProportions;

    },


    setDrawFromCentre(
      enabled
    ) {

      shapeState.drawFromCentre =
        Boolean(
          enabled
        );


      return shapeState
        .drawFromCentre;

    },


    isDrawing() {

      return shapeState.drawing;

    }

  };


  window.PaintlessShapes =
    publicApi;


  shapeModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "shape",
    shapeModule
  );

})();
