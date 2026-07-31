"use strict";

/* =========================================================
   PAINTLESS
   TRANSFORM LAYER TOOL — v0.2

   File:
   js/tools/transform.js

   Features:
   - Move selected layer
   - Resize from four corner handles
   - Stretch from four side handles
   - Rotate from rotation handle
   - Shift keeps proportions while resizing
   - Escape cancels the active transform
   - One completed transform = one Undo step
   - Mouse, touch and pen support
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
      "Paintless Transform could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. CONSTANTS
  ======================================================= */

  const HANDLE_SIZE =
    12;

  const HANDLE_HIT_RADIUS =
    11;

  const ROTATION_HANDLE_DISTANCE =
    34;

  const MINIMUM_SCALE =
    0.05;


  /* =======================================================
     3. TRANSFORM STATE
  ======================================================= */

  const transformState = {

    initialised:
      false,

    active:
      false,

    transforming:
      false,

    changed:
      false,

    layer:
      null,

    activeHandle:
      null,

    startPoint:
      null,

    startTransformX:
      0,

    startTransformY:
      0,

    startScaleX:
      1,

    startScaleY:
      1,

    startRotation:
      0,

    startPointerAngle:
      0,

    startBounds:
      null

  };


  /* =======================================================
     4. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null

  };


  let overlayContext =
    null;


  /* =======================================================
     5. SHARED APIS
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


  function getActiveLayer() {

    return (
      getCore()
        ?.getActiveLayer?.() ||

      getLayersApi()
        ?.getActiveLayer?.() ||

      null
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


  function saveTransformHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
        "function"
    ) {

      getHistoryApi()
        .saveHistory(
          "Transform layer"
        );


      return true;

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Transform layer"
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     6. GENERAL HELPERS
  ======================================================= */

  function normaliseNumber(
    value,
    fallback = 0
  ) {

    const number =
      Number(value);


    return Number.isFinite(
      number
    )
      ? number
      : fallback;

  }


  function degreesToRadians(
    degrees
  ) {

    return (
      normaliseNumber(
        degrees,
        0
      ) *
      Math.PI /
      180
    );

  }


  function radiansToDegrees(
    radians
  ) {

    return (
      normaliseNumber(
        radians,
        0
      ) *
      180 /
      Math.PI
    );

  }


  function normaliseDegrees(
    degrees
  ) {

    let value =
      normaliseNumber(
        degrees,
        0
      );


    while (value > 180) {

      value -= 360;

    }


    while (value < -180) {

      value += 360;

    }


    return value;

  }


  function copyPoint(
    point
  ) {

    if (!point) {

      return null;

    }


    return {

      x:
        normaliseNumber(
          point.x,
          0
        ),

      y:
        normaliseNumber(
          point.y,
          0
        ),

      inside:
        Boolean(
          point.inside
        )

    };

  }


  function getPayloadPoint(
    payload
  ) {

    return copyPoint(
      payload?.point
    );

  }


  function canTransformLayer(
    layer
  ) {

    if (!layer) {

      sendStatusMessage(
        "Select a layer before transforming."
      );


      return false;

    }


    if (layer.locked) {

      sendStatusMessage(
        "Unlock the layer before transforming it."
      );


      return false;

    }


    if (
      !layer.canvas ||
      layer.visible ===
        false
    ) {

      sendStatusMessage(
        "That layer cannot currently be transformed."
      );


      return false;

    }


    return true;

  }


  /* =======================================================
     7. TRANSFORM GEOMETRY
  ======================================================= */

  function getLayerBounds(
    layer =
      getActiveLayer()
  ) {

    if (!layer?.canvas) {

      return null;

    }


    const scaleX =
      normaliseNumber(
        layer.scaleX,
        1
      );


    const scaleY =
      normaliseNumber(
        layer.scaleY,
        1
      );


    const width =
      layer.canvas.width *
      Math.abs(scaleX);


    const height =
      layer.canvas.height *
      Math.abs(scaleY);


    const centreX =
      normaliseNumber(
        layer.transformX,
        0
      ) +
      layer.canvas.width / 2;


    const centreY =
      normaliseNumber(
        layer.transformY,
        0
      ) +
      layer.canvas.height / 2;


    return {

      centreX,

      centreY,

      width,

      height,

      halfWidth:
        width / 2,

      halfHeight:
        height / 2,

      rotation:
        normaliseNumber(
          layer.rotation,
          0
        ),

      scaleX,

      scaleY

    };

  }


  function canvasPointToLocal(
    point,
    bounds
  ) {

    const offsetX =
      point.x -
      bounds.centreX;


    const offsetY =
      point.y -
      bounds.centreY;


    const inverseRotation =
      -degreesToRadians(
        bounds.rotation
      );


    const cosine =
      Math.cos(
        inverseRotation
      );


    const sine =
      Math.sin(
        inverseRotation
      );


    return {

      x:
        offsetX *
        cosine -
        offsetY *
        sine,

      y:
        offsetX *
        sine +
        offsetY *
        cosine

    };

  }


  function localPointToCanvas(
    point,
    bounds
  ) {

    const rotation =
      degreesToRadians(
        bounds.rotation
      );


    const cosine =
      Math.cos(
        rotation
      );


    const sine =
      Math.sin(
        rotation
      );


    return {

      x:
        bounds.centreX +
        point.x *
        cosine -
        point.y *
        sine,

      y:
        bounds.centreY +
        point.x *
        sine +
        point.y *
        cosine

    };

  }


  function getHandlePositions(
    bounds
  ) {

    const left =
      -bounds.halfWidth;

    const right =
      bounds.halfWidth;

    const top =
      -bounds.halfHeight;

    const bottom =
      bounds.halfHeight;


    return {

      topLeft: {
        x:
          left,
        y:
          top
      },

      top: {
        x:
          0,
        y:
          top
      },

      topRight: {
        x:
          right,
        y:
          top
      },

      right: {
        x:
          right,
        y:
          0
      },

      bottomRight: {
        x:
          right,
        y:
          bottom
      },

      bottom: {
        x:
          0,
        y:
          bottom
      },

      bottomLeft: {
        x:
          left,
        y:
          bottom
      },

      left: {
        x:
          left,
        y:
          0
      },

      rotate: {
        x:
          0,
        y:
          top -
          ROTATION_HANDLE_DISTANCE
      }

    };

  }


  function pointNearHandle(
    localPoint,
    handlePoint
  ) {

    return (
      Math.abs(
        localPoint.x -
        handlePoint.x
      ) <=
        HANDLE_HIT_RADIUS &&

      Math.abs(
        localPoint.y -
        handlePoint.y
      ) <=
        HANDLE_HIT_RADIUS
    );

  }


  function hitTestTransform(
    point,
    bounds
  ) {

    const localPoint =
      canvasPointToLocal(
        point,
        bounds
      );


    const handles =
      getHandlePositions(
        bounds
      );


    const handleOrder =
      [
        "rotate",
        "topLeft",
        "top",
        "topRight",
        "right",
        "bottomRight",
        "bottom",
        "bottomLeft",
        "left"
      ];


    for (
      const handleName of
      handleOrder
    ) {

      if (
        pointNearHandle(
          localPoint,
          handles[
            handleName
          ]
        )
      ) {

        return handleName;

      }

    }


    if (
      localPoint.x >=
        -bounds.halfWidth &&
      localPoint.x <=
        bounds.halfWidth &&
      localPoint.y >=
        -bounds.halfHeight &&
      localPoint.y <=
        bounds.halfHeight
    ) {

      return "move";

    }


    return null;

  }


  /* =======================================================
     8. DRAW TRANSFORM BOUNDARY
  ======================================================= */

  function drawSquareHandle(
    x,
    y
  ) {

    overlayContext.beginPath();


    overlayContext.rect(
      x -
        HANDLE_SIZE / 2,
      y -
        HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );


    overlayContext.fill();

    overlayContext.stroke();

  }


  function drawRotationHandle(
    x,
    y
  ) {

    overlayContext.beginPath();


    overlayContext.arc(
      x,
      y,
      HANDLE_SIZE / 2,
      0,
      Math.PI * 2
    );


    overlayContext.fill();

    overlayContext.stroke();

  }


  function drawTransformBoundary() {

    if (
      !transformState.active ||
      !overlayContext
    ) {

      return false;

    }


    const layer =
      getActiveLayer();


    const bounds =
      getLayerBounds(
        layer
      );


    clearOverlay();


    if (
      !layer ||
      !bounds ||
      layer.visible ===
        false
    ) {

      return false;

    }


    const handles =
      getHandlePositions(
        bounds
      );


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.translate(
      bounds.centreX,
      bounds.centreY
    );


    overlayContext.rotate(
      degreesToRadians(
        bounds.rotation
      )
    );


    overlayContext.strokeStyle =
      "rgba(168, 76, 255, 0.98)";


    overlayContext.fillStyle =
      "#ffffff";


    overlayContext.lineWidth =
      2;


    overlayContext.setLineDash(
      [
        7,
        4
      ]
    );


    overlayContext.strokeRect(
      -bounds.halfWidth,
      -bounds.halfHeight,
      bounds.width,
      bounds.height
    );


    overlayContext.setLineDash(
      []
    );


    overlayContext.beginPath();


    overlayContext.moveTo(
      0,
      -bounds.halfHeight
    );


    overlayContext.lineTo(
      handles.rotate.x,
      handles.rotate.y
    );


    overlayContext.stroke();


    drawSquareHandle(
      handles.topLeft.x,
      handles.topLeft.y
    );


    drawSquareHandle(
      handles.top.x,
      handles.top.y
    );


    drawSquareHandle(
      handles.topRight.x,
      handles.topRight.y
    );


    drawSquareHandle(
      handles.right.x,
      handles.right.y
    );


    drawSquareHandle(
      handles.bottomRight.x,
      handles.bottomRight.y
    );


    drawSquareHandle(
      handles.bottom.x,
      handles.bottom.y
    );


    drawSquareHandle(
      handles.bottomLeft.x,
      handles.bottomLeft.y
    );


    drawSquareHandle(
      handles.left.x,
      handles.left.y
    );


    drawRotationHandle(
      handles.rotate.x,
      handles.rotate.y
    );


    overlayContext.restore();


    return true;

  }


  /* =======================================================
     9. POINTER CURSOR
  ======================================================= */

  function getCursorForHandle(
    handle
  ) {

    const cursors = {

      move:
        "move",

      rotate:
        "grab",

      topLeft:
        "nwse-resize",

      bottomRight:
        "nwse-resize",

      topRight:
        "nesw-resize",

      bottomLeft:
        "nesw-resize",

      top:
        "ns-resize",

      bottom:
        "ns-resize",

      left:
        "ew-resize",

      right:
        "ew-resize"

    };


    return (
      cursors[
        handle
      ] ||
      "default"
    );

  }


  function updateHoverCursor(
    point
  ) {

    if (
      transformState.transforming
    ) {

      return;

    }


    const bounds =
      getLayerBounds();


    if (
      !point ||
      !bounds
    ) {

      getCore()
        ?.setCanvasCursor?.(
          "default"
        );


      return;

    }


    const handle =
      hitTestTransform(
        point,
        bounds
      );


    getCore()
      ?.setCanvasCursor?.(
        getCursorForHandle(
          handle
        )
      );

  }


  /* =======================================================
     10. BEGIN TRANSFORM
  ======================================================= */

  function beginTransform(
    payload
  ) {

    const layer =
      payload.layer ||
      getActiveLayer();


    const point =
      getPayloadPoint(
        payload
      );


    if (
      !canTransformLayer(
        layer
      ) ||
      !point
    ) {

      return false;

    }


    const bounds =
      getLayerBounds(
        layer
      );


    const activeHandle =
      hitTestTransform(
        point,
        bounds
      );


    if (!activeHandle) {

      return false;

    }


    transformState.transforming =
      true;


    transformState.changed =
      false;


    transformState.layer =
      layer;


    transformState.activeHandle =
      activeHandle;


    transformState.startPoint =
      point;


    transformState.startTransformX =
      normaliseNumber(
        layer.transformX,
        0
      );


    transformState.startTransformY =
      normaliseNumber(
        layer.transformY,
        0
      );


    transformState.startScaleX =
      normaliseNumber(
        layer.scaleX,
        1
      );


    transformState.startScaleY =
      normaliseNumber(
        layer.scaleY,
        1
      );


    transformState.startRotation =
      normaliseNumber(
        layer.rotation,
        0
      );


    transformState.startBounds =
      {
        ...bounds
      };


    transformState.startPointerAngle =
      Math.atan2(
        point.y -
          bounds.centreY,
        point.x -
          bounds.centreX
      );


    getCore()
      ?.setCanvasCursor?.(
        activeHandle ===
          "rotate"
          ? "grabbing"
          : getCursorForHandle(
              activeHandle
            )
      );


    return true;

  }


  /* =======================================================
     11. MOVE TRANSFORM
  ======================================================= */

  function updateLayerMove(
    point
  ) {

    const offsetX =
      point.x -
      transformState.startPoint.x;


    const offsetY =
      point.y -
      transformState.startPoint.y;


    transformState.layer.transformX =
      transformState.startTransformX +
      offsetX;


    transformState.layer.transformY =
      transformState.startTransformY +
      offsetY;

  }


  /* =======================================================
     12. SCALE TRANSFORM
  ======================================================= */

  function updateLayerScale(
    point,
    shiftKey
  ) {

    const handle =
      transformState.activeHandle;


    const startBounds =
      transformState.startBounds;


    const localPoint =
      canvasPointToLocal(
        point,
        startBounds
      );


    const baseHalfWidth =
      Math.max(
        1,
        transformState.layer
          .canvas.width / 2
      );


    const baseHalfHeight =
      Math.max(
        1,
        transformState.layer
          .canvas.height / 2
      );


    let nextScaleX =
      transformState.startScaleX;


    let nextScaleY =
      transformState.startScaleY;


    const affectsHorizontal =
      [
        "topLeft",
        "topRight",
        "right",
        "bottomRight",
        "bottomLeft",
        "left"
      ].includes(
        handle
      );


    const affectsVertical =
      [
        "topLeft",
        "top",
        "topRight",
        "bottomRight",
        "bottom",
        "bottomLeft"
      ].includes(
        handle
      );


    if (affectsHorizontal) {

      nextScaleX =
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            localPoint.x
          ) /
          baseHalfWidth
        );

    }


    if (affectsVertical) {

      nextScaleY =
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            localPoint.y
          ) /
          baseHalfHeight
        );

    }


    const isCorner =
      [
        "topLeft",
        "topRight",
        "bottomRight",
        "bottomLeft"
      ].includes(
        handle
      );


    if (
      shiftKey &&
      isCorner
    ) {

      const horizontalRatio =
        nextScaleX /
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            transformState.startScaleX
          )
        );


      const verticalRatio =
        nextScaleY /
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            transformState.startScaleY
          )
        );


      const sharedRatio =
        Math.max(
          horizontalRatio,
          verticalRatio
        );


      nextScaleX =
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            transformState.startScaleX
          ) *
          sharedRatio
        );


      nextScaleY =
        Math.max(
          MINIMUM_SCALE,
          Math.abs(
            transformState.startScaleY
          ) *
          sharedRatio
        );

    }


    transformState.layer.scaleX =
      nextScaleX;


    transformState.layer.scaleY =
      nextScaleY;

  }


  /* =======================================================
     13. ROTATION TRANSFORM
  ======================================================= */

  function updateLayerRotation(
    point,
    shiftKey
  ) {

    const bounds =
      transformState.startBounds;


    const currentAngle =
      Math.atan2(
        point.y -
          bounds.centreY,
        point.x -
          bounds.centreX
      );


    const angleDifference =
      radiansToDegrees(
        currentAngle -
        transformState.startPointerAngle
      );


    let nextRotation =
      transformState.startRotation +
      angleDifference;


    if (shiftKey) {

      nextRotation =
        Math.round(
          nextRotation /
          15
        ) *
        15;

    }


    transformState.layer.rotation =
      normaliseDegrees(
        nextRotation
      );

  }


  /* =======================================================
     14. UPDATE TRANSFORM
  ======================================================= */

  function updateTransform(
    payload
  ) {

    if (
      !transformState.transforming ||
      !transformState.layer ||
      !transformState.activeHandle
    ) {

      return false;

    }


    const point =
      getPayloadPoint(
        payload
      );


    if (!point) {

      return false;

    }


    if (
      transformState.activeHandle ===
        "move"
    ) {

      updateLayerMove(
        point
      );

    } else if (
      transformState.activeHandle ===
        "rotate"
    ) {

      updateLayerRotation(
        point,
        Boolean(
          payload.shiftKey
        )
      );

    } else {

      updateLayerScale(
        point,
        Boolean(
          payload.shiftKey
        )
      );

    }


    transformState.changed =
      true;


    renderLayers();

    drawTransformBoundary();


    payload.markChanged?.(
      true
    );


    return true;

  }


  /* =======================================================
     15. FINISH / CANCEL
  ======================================================= */

  function finishTransform(
    payload
  ) {

    if (
      !transformState.transforming
    ) {

      return false;

    }


    const changed =
      transformState.changed;


    transformState.transforming =
      false;


    transformState.activeHandle =
      null;


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveTransformHistory();


      sendStatusMessage(
        "Layer transformed."
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless:layer-transformed",
          {
            detail: {
              layer:
                transformState.layer
            }
          }
        )
      );

    }


    resetTransformDragState();

    drawTransformBoundary();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return changed;

  }


  function cancelTransform() {

    if (
      !transformState.transforming ||
      !transformState.layer
    ) {

      drawTransformBoundary();


      return false;

    }


    transformState.layer.transformX =
      transformState.startTransformX;


    transformState.layer.transformY =
      transformState.startTransformY;


    transformState.layer.scaleX =
      transformState.startScaleX;


    transformState.layer.scaleY =
      transformState.startScaleY;


    transformState.layer.rotation =
      transformState.startRotation;


    renderLayers();


    resetTransformDragState();

    drawTransformBoundary();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    sendStatusMessage(
      "Transform cancelled."
    );


    return true;

  }


  function resetTransformDragState() {

    transformState.transforming =
      false;


    transformState.changed =
      false;


    transformState.activeHandle =
      null;


    transformState.startPoint =
      null;


    transformState.startTransformX =
      0;


    transformState.startTransformY =
      0;


    transformState.startScaleX =
      1;


    transformState.startScaleY =
      1;


    transformState.startRotation =
      0;


    transformState.startPointerAngle =
      0;


    transformState.startBounds =
      null;

  }


  /* =======================================================
     16. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !transformState.active
    ) {

      return false;

    }


    const started =
      beginTransform(
        payload
      );


    if (!started) {

      return false;

    }


    return {

      changed:
        false,

      preventDefault:
        true,

      capturePointer:
        true

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !transformState.active
    ) {

      return false;

    }


    if (
      !transformState.transforming
    ) {

      updateHoverCursor(
        getPayloadPoint(
          payload
        )
      );


      return false;

    }


    const changed =
      updateTransform(
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
      !transformState.transforming
    ) {

      return false;

    }


    const changed =
      finishTransform(
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

    cancelTransform();


    return {

      changed:
        false,

      releasePointer:
        true

    };

  }


  function pointerLeave() {

    if (
      !transformState.transforming
    ) {

      getCore()
        ?.setCanvasCursor?.(
          "default"
        );

    }


    return false;

  }


  /* =======================================================
     17. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    transformState.active =
      true;


    transformState.layer =
      getActiveLayer();


    getCore()
      ?.showToolOptions?.(
        []
      );


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    drawTransformBoundary();


    sendStatusMessage(
      "Transform ready. Drag inside to move, drag handles to resize, or use the round handle to rotate."
    );


    return true;

  }


  function deactivate() {

    if (
      transformState.transforming
    ) {

      cancelTransform();

    }


    transformState.active =
      false;


    transformState.layer =
      null;


    resetTransformDragState();

    clearOverlay();


    return true;

  }


  /* =======================================================
     18. DOM AND EVENTS
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


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function connectEvents() {

    document.addEventListener(
      "paintless:active-layer-changed",
      () => {

        if (
          transformState.transforming
        ) {

          cancelTransform();

        }


        transformState.layer =
          getActiveLayer();


        if (
          transformState.active
        ) {

          drawTransformBoundary();

        }

      }
    );


    document.addEventListener(
      "paintless:layers-rendered",
      () => {

        if (
          transformState.active &&
          !transformState.transforming
        ) {

          drawTransformBoundary();

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        resetTransformDragState();


        if (
          transformState.active
        ) {

          drawTransformBoundary();

        }

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        resetTransformDragState();

        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:transform-layer",
      () => {

        tools.setActiveTool(
          "transform"
        );

      }
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          tools.getActiveTool() !==
            "transform"
        ) {

          return;

        }


        if (
          event.key ===
            "Escape"
        ) {

          event.preventDefault();

          cancelTransform();

        }

      }
    );

  }


  /* =======================================================
     19. TRANSFORM MODULE
  ======================================================= */

  const transformModule = {

    name:
      "Transform",

    label:
      "Transform",

    initialised:
      false,


    async initialise() {

      if (
        transformState.initialised
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
          "Paintless Transform could not find the editor canvases."
        );

      }


      connectEvents();


      transformState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
          "transform"
      ) {

        activate();

      }


      console.log(
        "%cPaintless Transform ready.",
        [
          "color:#d49aff",
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
     20. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      transformState,

    activate,

    deactivate,

    beginTransform,

    updateTransform,

    finishTransform,

    cancelTransform,

    drawTransformBoundary,

    getLayerBounds,

    hitTestTransform,

    isTransforming() {

      return transformState.transforming;

    }

  };


  window.PaintlessTransform =
    publicApi;


  transformModule.api =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "transform",
    transformModule
  );

})();
