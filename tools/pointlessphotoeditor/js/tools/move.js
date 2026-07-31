"use strict";

/* =========================================================
   PAINTLESS
   MOVE LAYER TOOL — v1.0

   File:
   js/tools/move.js

   Features:
   - Moves the entire active layer
   - Works with imported images, text and painted layers
   - Live movement while dragging
   - Shift locks movement to one axis
   - Arrow keys nudge by 1 pixel
   - Shift + Arrow nudges by 10 pixels
   - Escape cancels and restores the original position
   - One completed move = one Undo step
   - Locked-layer protection
   - Mouse, touch and pen support

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
      "Paintless Move could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. MOVE STATE
  ======================================================= */

  const moveState = {

    initialised:
      false,

    active:
      false,

    moving:
      false,

    changed:
      false,

    layer:
     null,

   layerBackup:
     null,

   startTransformX:
     0,

   startTransformY:
     0,

   startPoint:
     null,

    currentPoint:
      null,

    lastOffsetX:
      0,

    lastOffsetY:
      0,

    keyboardMoveTimer:
      null,

    keyboardMovePending:
      false,

    keyboardHistoryDelay:
      180

  };


  /* =======================================================
     3. DOM REFERENCES
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
     5. HELPERS
  ======================================================= */

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


  function renderLayerList() {

    if (
      typeof getLayersApi()
        ?.renderLayerList ===
      "function"
    ) {

      getLayersApi()
        .renderLayerList();


      return;

    }


    getCore()
      ?.renderLayerList?.();

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


  function canMoveLayer(
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
        "That layer cannot be moved."
      );


      return false;

    }


    return true;

  }


  /* =======================================================
     6. BACKUP AND RESTORE
  ======================================================= */

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
      !moveState.layer ||
      !moveState.layerBackup
    ) {

      return false;

    }


    const layer =
      moveState.layer;


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
      moveState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     7. DRAW MOVED LAYER
  ======================================================= */

  function drawLayerAtOffset(
    layer,
    backupCanvas,
    offsetX,
    offsetY
  ) {

    if (
      !layer ||
      !backupCanvas
    ) {

      return false;

    }


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
      backupCanvas,
      Math.round(
        offsetX
      ),
      Math.round(
        offsetY
      )
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  function constrainOffset(
    offsetX,
    offsetY,
    shiftKey
  ) {

    if (!shiftKey) {

      return {

        x:
          offsetX,

        y:
          offsetY

      };

    }


    if (
      Math.abs(
        offsetX
      ) >=
      Math.abs(
        offsetY
      )
    ) {

      return {

        x:
          offsetX,

        y:
          0

      };

    }


    return {

      x:
        0,

      y:
        offsetY

    };

  }


  /* =======================================================
     8. MOVE PREVIEW
  ======================================================= */

  function drawMoveGuide(
    offsetX,
    offsetY
  ) {

    if (
      !overlayContext ||
      !moveState.startPoint
    ) {

      return;

    }


    clearOverlay();


    const endPoint = {

      x:
        moveState.startPoint.x +
        offsetX,

      y:
        moveState.startPoint.y +
        offsetY

    };


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.9)";


    overlayContext.fillStyle =
      "rgba(168, 76, 255, 0.95)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.setLineDash(
      [
        6,
        5
      ]
    );


    overlayContext.beginPath();


    overlayContext.moveTo(
      moveState.startPoint.x,
      moveState.startPoint.y
    );


    overlayContext.lineTo(
      endPoint.x,
      endPoint.y
    );


    overlayContext.stroke();


    overlayContext.setLineDash(
      []
    );


    overlayContext.beginPath();


    overlayContext.arc(
      endPoint.x,
      endPoint.y,
      4,
      0,
      Math.PI *
        2
    );


    overlayContext.fill();


    overlayContext.restore();

  }


  /* =======================================================
     9. HISTORY
  ======================================================= */

  function saveMoveHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Move layer"
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          "Move layer"
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Move layer"
          }
        }
      )
    );


    return true;

  }


  function queueKeyboardMoveHistory() {

    if (
      moveState.keyboardMoveTimer !==
      null
    ) {

      window.clearTimeout(
        moveState.keyboardMoveTimer
      );

    }


    moveState.keyboardMovePending =
      true;


    moveState.keyboardMoveTimer =
      window.setTimeout(
        () => {

          moveState.keyboardMoveTimer =
            null;


          if (
            !moveState.keyboardMovePending
          ) {

            return;

          }


          moveState.keyboardMovePending =
            false;


          saveMoveHistory();


          sendStatusMessage(
            "Layer nudged."
          );

        },
        moveState.keyboardHistoryDelay
      );

  }


  /* =======================================================
     10. MOVE LIFECYCLE
  ======================================================= */

  function beginMove(
    payload
  ) {

    const layer =
      payload.layer ||
      getActiveLayer();


    if (
      !canMoveLayer(
        layer
      )
    ) {

      return false;

    }


    moveState.moving =
      true;


    moveState.changed =
      false;


    moveState.layer =
  layer;


moveState.layerBackup =
  null;


moveState.startTransformX =
  Number(
    layer.transformX
  ) || 0;


moveState.startTransformY =
  Number(
    layer.transformY
  ) || 0;


moveState.startPoint =
      copyPoint(
        payload.point
      );


    moveState.currentPoint =
      copyPoint(
        payload.point
      );


    moveState.lastOffsetX =
      0;


    moveState.lastOffsetY =
      0;


    clearOverlay();


    return true;

  }


  function updateMove(
    payload
  ) {

    if (
  !moveState.moving ||
  !moveState.layer ||
  !moveState.startPoint
) {

      return false;

    }


    moveState.currentPoint =
      copyPoint(
        payload.point
      );


    const rawOffsetX =
      moveState.currentPoint.x -
      moveState.startPoint.x;


    const rawOffsetY =
      moveState.currentPoint.y -
      moveState.startPoint.y;


    const constrainedOffset =
      constrainOffset(
        rawOffsetX,
        rawOffsetY,
        Boolean(
          payload.shiftKey
        )
      );


    moveState.lastOffsetX =
      Math.round(
        constrainedOffset.x
      );


    moveState.lastOffsetY =
      Math.round(
        constrainedOffset.y
      );


    const changed =
      moveState.lastOffsetX !==
        0 ||
      moveState.lastOffsetY !==
        0;


    moveState.layer.transformX =
  moveState.startTransformX +
  moveState.lastOffsetX;


moveState.layer.transformY =
  moveState.startTransformY +
  moveState.lastOffsetY;


renderLayers();
    drawMoveGuide(
      moveState.lastOffsetX,
      moveState.lastOffsetY
    );


    moveState.changed =
      changed;


    payload.markChanged?.(
      changed
    );


    return changed;

  }


  function finishMove(
    payload
  ) {

    if (
      !moveState.moving
    ) {

      return false;

    }


    const changed =
      moveState.changed;


    clearOverlay();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveMoveHistory();


      sendStatusMessage(
        `Layer moved ${moveState.lastOffsetX}px horizontally and ${moveState.lastOffsetY}px vertically.`
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless:layer-moved",
          {
            detail: {

              layer:
                moveState.layer,

              offsetX:
                moveState.lastOffsetX,

              offsetY:
                moveState.lastOffsetY

            }
          }
        )
      );

    }


    resetMoveState();


    return changed;

  }


  function cancelMove() {

    if (
      !moveState.moving
    ) {

      clearOverlay();


      return false;

    }


      moveState.layer.transformX =
        moveState.startTransformX;


      moveState.layer.transformY =
        moveState.startTransformY;


renderLayers();

    clearOverlay();


    resetMoveState();


    sendStatusMessage(
      "Layer move cancelled."
    );


    return true;

  }


  function resetMoveState() {

    moveState.moving =
      false;


    moveState.changed =
      false;


    moveState.layer =
      null;


    moveState.layerBackup =
  null;


moveState.startTransformX =
  0;


moveState.startTransformY =
  0;


moveState.startPoint =
  null;


    moveState.currentPoint =
      null;


    moveState.lastOffsetX =
      0;


    moveState.lastOffsetY =
      0;

  }


  /* =======================================================
     11. KEYBOARD NUDGING
  ======================================================= */

  function nudgeLayer(
    deltaX,
    deltaY
  ) {

    const layer =
      getActiveLayer();


    if (
      !canMoveLayer(
        layer
      )
    ) {

      return false;

    }


    layer.transformX += deltaX;
layer.transformY += deltaY;

renderLayers();


    queueKeyboardMoveHistory();


    document.dispatchEvent(
      new CustomEvent(
        "paintless:layer-nudged",
        {
          detail: {

            layer,

            deltaX,

            deltaY

          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     12. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !moveState.active
    ) {

      return false;

    }


    const started =
      beginMove(
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
      !moveState.active ||
      !moveState.moving
    ) {

      return false;

    }


    const changed =
      updateMove(
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
      !moveState.moving
    ) {

      return false;

    }


    const changed =
      finishMove(
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

    cancelMove();


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
      !moveState.moving
    ) {

      clearOverlay();

    }


    return false;

  }


  /* =======================================================
     13. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    moveState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        []
      );


    getCore()
      ?.setCanvasCursor?.(
        "move"
      );


    sendStatusMessage(
      "Move ready. Drag the active layer."
    );


    return true;

  }


  function deactivate() {

    if (
      moveState.moving
    ) {

      cancelMove();

    }


    moveState.active =
      false;


    clearOverlay();


    return true;

  }


  /* =======================================================
     14. DOM AND EVENTS
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

    window.addEventListener(
      "keydown",
      (event) => {

        if (
          tools.getActiveTool() !==
          "move"
        ) {

          return;

        }


        if (
          getCore()
            ?.isTypingElement?.()
        ) {

          return;

        }


        const step =
          event.shiftKey
            ? 10
            : 1;


        const keyMap = {

          ArrowLeft: {
            x:
              -step,

            y:
              0
          },

          ArrowRight: {
            x:
              step,

            y:
              0
          },

          ArrowUp: {
            x:
              0,

            y:
              -step
          },

          ArrowDown: {
            x:
              0,

            y:
              step
          }

        };


        const movement =
          keyMap[
            event.key
          ];


        if (!movement) {

          return;

        }


        event.preventDefault();


        nudgeLayer(
          movement.x,
          movement.y
        );

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelMove
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelMove
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelMove
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      () => {

        if (
          moveState.moving
        ) {

          cancelMove();

        }

      }
    );

  }


  /* =======================================================
     15. MOVE MODULE
  ======================================================= */

  const moveModule = {

    name:
      "Move",

    label:
      "Move",

    initialised:
      false,


    async initialise() {

      if (
        moveState.initialised
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
          "Paintless Move could not find the editor canvases."
        );

      }


      connectEvents();


      moveState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "move"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:move-ready",
          {
            detail: {
              move:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Move ready.",
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
     16. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      moveState,


    activate,

    deactivate,


    beginMove,

    updateMove,

    finishMove,

    cancelMove,

    nudgeLayer,

    drawLayerAtOffset,


    isMoving() {

      return moveState.moving;

    },


    getCurrentOffset() {

      return {

        x:
          moveState.lastOffsetX,

        y:
          moveState.lastOffsetY

      };

    }

  };


  window.PaintlessMove =
    publicApi;


  moveModule.api =
    publicApi;


  /* =======================================================
     17. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "move",
    moveModule
  );

})();
