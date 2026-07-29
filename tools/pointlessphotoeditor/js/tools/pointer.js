"use strict";

/* =========================================================
   PAINTLESS
   CANVAS POINTER ROUTER — v1.0

   File:
   js/tools/pointer.js

   Routes mouse, pen and touch input to whichever individual
   Paintless tool module is currently active.

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
      "Paintless pointer router could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. POINTER ROUTER STATE
  ======================================================= */

  const pointerState = {

    initialised:
      false,

    pointerDown:
      false,

    pointerId:
      null,

    pointerType:
      null,

    activeTool:
      null,

    activeModule:
      null,

    startPoint:
      null,

    previousPoint:
      null,

    currentPoint:
      null,

    changed:
      false,

    cancelled:
      false,

    suppressContextMenu:
      true

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    canvasViewport:
      null,

    cursorPosition:
      null

  };


  /* =======================================================
     4. SHARED HELPERS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      null
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


  function getCanvasPoint(
    event
  ) {

    const core =
      getCore();


    if (
      typeof core?.getCanvasPoint ===
      "function"
    ) {

      return core.getCanvasPoint(
        event
      );

    }


    if (!dom.editorCanvas) {

      return {

        x:
          0,

        y:
          0,

        inside:
          false

      };

    }


    const rectangle =
      dom.editorCanvas
        .getBoundingClientRect();


    if (
      rectangle.width <= 0 ||
      rectangle.height <= 0
    ) {

      return {

        x:
          0,

        y:
          0,

        inside:
          false

      };

    }


    const x =
      (
        event.clientX -
        rectangle.left
      ) *
      (
        dom.editorCanvas.width /
        rectangle.width
      );


    const y =
      (
        event.clientY -
        rectangle.top
      ) *
      (
        dom.editorCanvas.height /
        rectangle.height
      );


    return {

      x,

      y,

      inside:
        x >= 0 &&
        y >= 0 &&
        x <=
          dom.editorCanvas.width &&
        y <=
          dom.editorCanvas.height

    };

  }


  function constrainPoint(
    point
  ) {

    const core =
      getCore();


    if (
      typeof core
        ?.constrainPointToCanvas ===
      "function"
    ) {

      return core.constrainPointToCanvas(
        point
      );

    }


    return {

      x:
        Math.min(
          dom.editorCanvas?.width ||
          0,
          Math.max(
            0,
            point.x
          )
        ),

      y:
        Math.min(
          dom.editorCanvas?.height ||
          0,
          Math.max(
            0,
            point.y
          )
        ),

      inside:
        Boolean(
          point.inside
        )

    };

  }


  function isDocumentOpen() {

    const core =
      getCore();


    if (
      typeof core?.isDocumentOpen ===
      "function"
    ) {

      return core.isDocumentOpen();

    }


    return Boolean(
      window.PaintlessCanvas
        ?.isDocumentOpen?.()
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


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();

  }


  function getActiveToolName() {

    return (
      tools.getActiveTool?.() ||
      tools.getState?.(
        "activeTool"
      ) ||
      "brush"
    );

  }


  function getActiveToolModule() {

    const toolName =
      getActiveToolName();


    return (
      tools.getModule?.(
        toolName
      ) ||
      null
    );

  }


  function moduleCanHandlePointer(
    module
  ) {

    if (!module) {

      return false;

    }


    return Boolean(
      typeof module.pointerDown ===
        "function" ||
      typeof module.onPointerDown ===
        "function" ||
      typeof module.handlePointerDown ===
        "function"
    );

  }


  function getModuleHandler(
    module,
    handlerName
  ) {

    if (!module) {

      return null;

    }


    const handlerNames = {

      pointerDown: [
        "pointerDown",
        "onPointerDown",
        "handlePointerDown"
      ],

      pointerMove: [
        "pointerMove",
        "onPointerMove",
        "handlePointerMove"
      ],

      pointerUp: [
        "pointerUp",
        "onPointerUp",
        "handlePointerUp"
      ],

      pointerCancel: [
        "pointerCancel",
        "onPointerCancel",
        "handlePointerCancel",
        "cancel"
      ],

      pointerEnter: [
        "pointerEnter",
        "onPointerEnter",
        "handlePointerEnter"
      ],

      pointerLeave: [
        "pointerLeave",
        "onPointerLeave",
        "handlePointerLeave"
      ],

      hover: [
        "hover",
        "onHover",
        "handleHover"
      ]

    };


    const possibleNames =
      handlerNames[
        handlerName
      ] ||
      [
        handlerName
      ];


    const matchingName =
      possibleNames.find(
        (name) =>
          typeof module[
            name
          ] ===
          "function"
      );


    if (!matchingName) {

      return null;

    }


    return module[
      matchingName
    ].bind(
      module
    );

  }


  function dispatchPointerEvent(
    eventName,
    detail
  ) {

    document.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail
        }
      )
    );

  }


  /* =======================================================
     5. POINTER PAYLOAD
  ======================================================= */

  function createPointerPayload(
    event,
    point,
    {
      phase =
        "move",

      activeModule =
        pointerState.activeModule,

      activeTool =
        pointerState.activeTool
    } = {}
  ) {

    const core =
      getCore();


    return {

      phase,

      event,

      originalEvent:
        event,

      pointerId:
        event.pointerId,

      pointerType:
        event.pointerType ||
        pointerState.pointerType ||
        "mouse",

      pressure:
        Number.isFinite(
          event.pressure
        )
          ? event.pressure
          : 0.5,

      tiltX:
        Number(
          event.tiltX
        ) ||
        0,

      tiltY:
        Number(
          event.tiltY
        ) ||
        0,

      twist:
        Number(
          event.twist
        ) ||
        0,

      width:
        Number(
          event.width
        ) ||
        1,

      height:
        Number(
          event.height
        ) ||
        1,

      buttons:
        Number(
          event.buttons
        ) ||
        0,

      button:
        Number(
          event.button
        ) ||
        0,

      altKey:
        Boolean(
          event.altKey
        ),

      ctrlKey:
        Boolean(
          event.ctrlKey
        ),

      shiftKey:
        Boolean(
          event.shiftKey
        ),

      metaKey:
        Boolean(
          event.metaKey
        ),

      point:
        copyPoint(
          point
        ),

      startPoint:
        copyPoint(
          pointerState.startPoint
        ),

      previousPoint:
        copyPoint(
          pointerState.previousPoint
        ),

      currentPoint:
        copyPoint(
          pointerState.currentPoint
        ),

      changed:
        pointerState.changed,

      activeTool,

      activeModule,

      canvas:
        dom.editorCanvas,

      overlayCanvas:
        dom.overlayCanvas,

      overlayContext:
        core
          ?.getOverlayContext?.() ||
        null,

      layer:
        core
          ?.getActiveLayer?.() ||
        null,

      core,

      tools,


      markChanged(
        changed =
          true
      ) {

        pointerState.changed =
          Boolean(
            changed
          );


        core
          ?.markCanvasChanged?.(
            changed
          );


        return pointerState.changed;

      },


      preventDefault() {

        event.preventDefault();

      },


      stopPropagation() {

        event.stopPropagation();

      },


      capturePointer() {

        dom.editorCanvas
          ?.setPointerCapture?.(
            event.pointerId
          );

      },


      releasePointer() {

        if (
          dom.editorCanvas
            ?.hasPointerCapture?.(
              event.pointerId
            )
        ) {

          dom.editorCanvas
            .releasePointerCapture(
              event.pointerId
            );

        }

      },


      clearOverlay

    };

  }


  /* =======================================================
     6. HANDLER RESULT PROCESSING
  ======================================================= */

  function processHandlerResult(
    result,
    payload
  ) {

    if (
      result ===
      true
    ) {

      payload.markChanged(
        true
      );


      return;

    }


    if (
      !result ||
      typeof result !==
        "object"
    ) {

      return;

    }


    if (
      Object.prototype.hasOwnProperty.call(
        result,
        "changed"
      )
    ) {

      payload.markChanged(
        result.changed
      );

    }


    if (
      result.preventDefault ===
      true
    ) {

      payload.preventDefault();

    }


    if (
      result.stopPropagation ===
      true
    ) {

      payload.stopPropagation();

    }


    if (
      result.capturePointer ===
      true
    ) {

      payload.capturePointer();

    }


    if (
      result.releasePointer ===
      true
    ) {

      payload.releasePointer();

    }


    if (
      result.clearOverlay ===
      true
    ) {

      clearOverlay();

    }


    if (
      result.statusMessage
    ) {

      sendStatusMessage(
        result.statusMessage
      );

    }

  }


  function callModuleHandler(
    module,
    handlerName,
    payload
  ) {

    const handler =
      getModuleHandler(
        module,
        handlerName
      );


    if (!handler) {

      return null;

    }


    try {

      const result =
        handler(
          payload
        );


      if (
        result &&
        typeof result.then ===
          "function"
      ) {

        result
          .then(
            (resolvedResult) => {

              processHandlerResult(
                resolvedResult,
                payload
              );

            }
          )
          .catch(
            (error) => {

              console.error(
                `Paintless ${payload.activeTool} ${handlerName} failed:`,
                error
              );


              cancelCurrentPointerAction(
                payload.event
              );

            }
          );


        return result;

      }


      processHandlerResult(
        result,
        payload
      );


      return result;

    } catch (error) {

      console.error(
        `Paintless ${payload.activeTool} ${handlerName} failed:`,
        error
      );


      cancelCurrentPointerAction(
        payload.event
      );


      return null;

    }

  }


  /* =======================================================
     7. POINTER STATE RESET
  ======================================================= */

  function resetPointerState() {

    pointerState.pointerDown =
      false;

    pointerState.pointerId =
      null;

    pointerState.pointerType =
      null;

    pointerState.activeTool =
      null;

    pointerState.activeModule =
      null;

    pointerState.startPoint =
      null;

    pointerState.previousPoint =
      null;

    pointerState.currentPoint =
      null;

    pointerState.changed =
      false;

    pointerState.cancelled =
      false;


    getCore()
      ?.resetPointerState?.();

  }


  function releaseCapturedPointer(
    event
  ) {

    const pointerId =
      event?.pointerId ??
      pointerState.pointerId;


    if (
      pointerId ===
        null ||
      pointerId ===
        undefined
    ) {

      return;

    }


    try {

      if (
        dom.editorCanvas
          ?.hasPointerCapture?.(
            pointerId
          )
      ) {

        dom.editorCanvas
          .releasePointerCapture(
            pointerId
          );

      }

    } catch (error) {

      /*
       * Browsers may already have released capture.
       * This is harmless.
       */

    }

  }


  /* =======================================================
     8. CURSOR POSITION STATUS
  ======================================================= */

  function updateCursorPosition(
    point
  ) {

    if (!dom.cursorPosition) {

      return;

    }


    if (
      !point ||
      !point.inside
    ) {

      dom.cursorPosition.textContent =
        "X: —  Y: —";


      return;

    }


    dom.cursorPosition.textContent =
      `X: ${Math.round(
        point.x
      )}  Y: ${Math.round(
        point.y
      )}`;

  }


  /* =======================================================
     9. POINTER DOWN
  ======================================================= */

  function handlePointerDown(
    event
  ) {

    if (
      event.pointerType ===
        "mouse" &&
      event.button !==
        0
    ) {

      return;

    }


    if (
      pointerState.pointerDown
    ) {

      return;

    }


    if (
      !isDocumentOpen()
    ) {

      return;

    }


    const point =
      getCanvasPoint(
        event
      );


    if (!point.inside) {

      return;

    }


    const activeTool =
      getActiveToolName();


    const activeModule =
      getActiveToolModule();


    if (
      !moduleCanHandlePointer(
        activeModule
      )
    ) {

      sendStatusMessage(
        `${activeTool
          .replace(
            /-/g,
            " "
          )
          .replace(
            /\b\w/g,
            (character) =>
              character.toUpperCase()
          )} is waiting for its tool file.`
      );


      return;

    }


    pointerState.pointerDown =
      true;

    pointerState.pointerId =
      event.pointerId;

    pointerState.pointerType =
      event.pointerType ||
      "mouse";

    pointerState.activeTool =
      activeTool;

    pointerState.activeModule =
      activeModule;

    pointerState.startPoint =
      copyPoint(
        point
      );

    pointerState.previousPoint =
      copyPoint(
        point
      );

    pointerState.currentPoint =
      copyPoint(
        point
      );

    pointerState.changed =
      false;

    pointerState.cancelled =
      false;


    const core =
      getCore();


    core
      ?.beginPointerAction?.(
        event,
        activeTool
      );


    try {

      dom.editorCanvas
        ?.setPointerCapture?.(
          event.pointerId
        );

    } catch (error) {

      /*
       * Pointer capture is helpful but not essential.
       */

    }


    const payload =
      createPointerPayload(
        event,
        point,
        {
          phase:
            "down"
        }
      );


    callModuleHandler(
      activeModule,
      "pointerDown",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-down",
      payload
    );


    event.preventDefault();

  }


  /* =======================================================
     10. POINTER MOVE
  ======================================================= */

  function handlePointerMove(
    event
  ) {

    const rawPoint =
      getCanvasPoint(
        event
      );


    updateCursorPosition(
      rawPoint
    );


    if (
      !pointerState.pointerDown
    ) {

      const activeTool =
        getActiveToolName();


      const activeModule =
        getActiveToolModule();


      const hoverPayload =
        createPointerPayload(
          event,
          rawPoint,
          {
            phase:
              "hover",

            activeTool,

            activeModule
          }
        );


      callModuleHandler(
        activeModule,
        "hover",
        hoverPayload
      );


      dispatchPointerEvent(
        "paintless:canvas-pointer-hover",
        hoverPayload
      );


      return;

    }


    if (
      event.pointerId !==
      pointerState.pointerId
    ) {

      return;

    }


    const point =
      constrainPoint(
        rawPoint
      );


    pointerState.currentPoint =
      copyPoint(
        point
      );


    getCore()
      ?.updatePointerAction?.(
        event
      );


    const payload =
      createPointerPayload(
        event,
        point,
        {
          phase:
            "move"
        }
      );


    callModuleHandler(
      pointerState.activeModule,
      "pointerMove",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-move",
      payload
    );


    pointerState.previousPoint =
      copyPoint(
        pointerState.currentPoint
      );


    getCore()
      ?.advancePointerPoint?.();


    event.preventDefault();

  }


  /* =======================================================
     11. POINTER UP
  ======================================================= */

  function handlePointerUp(
    event
  ) {

    if (
      !pointerState.pointerDown ||
      event.pointerId !==
        pointerState.pointerId
    ) {

      return;

    }


    const rawPoint =
      getCanvasPoint(
        event
      );


    const point =
      constrainPoint(
        rawPoint
      );


    pointerState.currentPoint =
      copyPoint(
        point
      );


    getCore()
      ?.updatePointerAction?.(
        event
      );


    const payload =
      createPointerPayload(
        event,
        point,
        {
          phase:
            "up"
        }
      );


    callModuleHandler(
      pointerState.activeModule,
      "pointerUp",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-up",
      payload
    );


    releaseCapturedPointer(
      event
    );


    getCore()
      ?.endPointerAction?.(
        event
      );


    resetPointerState();


    event.preventDefault();

  }


  /* =======================================================
     12. POINTER CANCEL
  ======================================================= */

  function cancelCurrentPointerAction(
    event =
      null
  ) {

    if (
      !pointerState.pointerDown
    ) {

      clearOverlay();

      return false;

    }


    pointerState.cancelled =
      true;


    const point =
      event
        ? constrainPoint(
            getCanvasPoint(
              event
            )
          )
        : copyPoint(
            pointerState.currentPoint
          );


    const fallbackEvent =
      event ||
      {
        pointerId:
          pointerState.pointerId,

        pointerType:
          pointerState.pointerType,

        clientX:
          0,

        clientY:
          0,

        pressure:
          0,

        button:
          0,

        buttons:
          0,

        preventDefault() {},

        stopPropagation() {}

      };


    const payload =
      createPointerPayload(
        fallbackEvent,
        point,
        {
          phase:
            "cancel"
        }
      );


    callModuleHandler(
      pointerState.activeModule,
      "pointerCancel",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-cancel",
      payload
    );


    releaseCapturedPointer(
      fallbackEvent
    );


    clearOverlay();


    getCore()
      ?.cancelPointerAction?.();


    resetPointerState();


    return true;

  }


  function handlePointerCancel(
    event
  ) {

    if (
      !pointerState.pointerDown ||
      event.pointerId !==
        pointerState.pointerId
    ) {

      return;

    }


    cancelCurrentPointerAction(
      event
    );


    event.preventDefault();

  }


  /* =======================================================
     13. POINTER ENTER AND LEAVE
  ======================================================= */

  function handlePointerEnter(
    event
  ) {

    const point =
      getCanvasPoint(
        event
      );


    updateCursorPosition(
      point
    );


    const activeTool =
      pointerState.pointerDown
        ? pointerState.activeTool
        : getActiveToolName();


    const activeModule =
      pointerState.pointerDown
        ? pointerState.activeModule
        : getActiveToolModule();


    const payload =
      createPointerPayload(
        event,
        point,
        {
          phase:
            "enter",

          activeTool,

          activeModule
        }
      );


    callModuleHandler(
      activeModule,
      "pointerEnter",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-enter",
      payload
    );

  }


  function handlePointerLeave(
    event
  ) {

    const point =
      getCanvasPoint(
        event
      );


    updateCursorPosition(
      null
    );


    const activeTool =
      pointerState.pointerDown
        ? pointerState.activeTool
        : getActiveToolName();


    const activeModule =
      pointerState.pointerDown
        ? pointerState.activeModule
        : getActiveToolModule();


    const payload =
      createPointerPayload(
        event,
        point,
        {
          phase:
            "leave",

          activeTool,

          activeModule
        }
      );


    callModuleHandler(
      activeModule,
      "pointerLeave",
      payload
    );


    dispatchPointerEvent(
      "paintless:canvas-pointer-leave",
      payload
    );

  }


  /* =======================================================
     14. TOOL CHANGES DURING AN ACTION
  ======================================================= */

  function handleToolChanged(
    event
  ) {

    const nextTool =
      event.detail?.tool;


    if (
      pointerState.pointerDown &&
      nextTool !==
        pointerState.activeTool
    ) {

      cancelCurrentPointerAction();

    }

  }


  /* =======================================================
     15. DOM CONNECTIONS
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


    dom.canvasViewport =
      document.getElementById(
        "canvas-viewport"
      );


    dom.cursorPosition =
      document.getElementById(
        "cursor-position"
      );


    return dom;

  }


  function connectCanvasEvents() {

    dom.editorCanvas.addEventListener(
      "pointerdown",
      handlePointerDown
    );


    dom.editorCanvas.addEventListener(
      "pointermove",
      handlePointerMove
    );


    dom.editorCanvas.addEventListener(
      "pointerup",
      handlePointerUp
    );


    dom.editorCanvas.addEventListener(
      "pointercancel",
      handlePointerCancel
    );


    dom.editorCanvas.addEventListener(
      "lostpointercapture",
      (event) => {

        if (
          pointerState.pointerDown &&
          event.pointerId ===
            pointerState.pointerId
        ) {

          cancelCurrentPointerAction(
            event
          );

        }

      }
    );


    dom.editorCanvas.addEventListener(
      "pointerenter",
      handlePointerEnter
    );


    dom.editorCanvas.addEventListener(
      "pointerleave",
      handlePointerLeave
    );


    dom.editorCanvas.addEventListener(
      "contextmenu",
      (event) => {

        if (
          pointerState.suppressContextMenu
        ) {

          event.preventDefault();

        }

      }
    );


    dom.editorCanvas.addEventListener(
      "dragstart",
      (event) => {

        event.preventDefault();

      }
    );

  }


  function connectGlobalEvents() {

    window.addEventListener(
      "pointerup",
      (event) => {

        if (
          pointerState.pointerDown &&
          event.pointerId ===
            pointerState.pointerId
        ) {

          handlePointerUp(
            event
          );

        }

      }
    );


    window.addEventListener(
      "pointercancel",
      (event) => {

        if (
          pointerState.pointerDown &&
          event.pointerId ===
            pointerState.pointerId
        ) {

          handlePointerCancel(
            event
          );

        }

      }
    );


    window.addEventListener(
      "blur",
      () => {

        if (
          pointerState.pointerDown
        ) {

          cancelCurrentPointerAction();

        }

      }
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.hidden &&
          pointerState.pointerDown
        ) {

          cancelCurrentPointerAction();

        }

      }
    );


    document.addEventListener(
      "paintless:tool-changed",
      handleToolChanged
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        cancelCurrentPointerAction();

        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        cancelCurrentPointerAction();

        clearOverlay();

      }
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key ===
            "Escape" &&
          pointerState.pointerDown
        ) {

          event.preventDefault();

          cancelCurrentPointerAction();

        }

      }
    );

  }


  /* =======================================================
     16. POINTER MODULE
  ======================================================= */

  const pointerModule = {

    name:
      "Pointer",

    label:
      "Pointer Router",

    initialised:
      false,


    async initialise() {

      if (
        pointerState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (!dom.editorCanvas) {

        throw new Error(
          "Paintless pointer router could not find editor-canvas."
        );

      }


      connectCanvasEvents();

      connectGlobalEvents();


      pointerState.initialised =
        true;

      this.initialised =
        true;


      document.dispatchEvent(
        new CustomEvent(
          "paintless:pointer-ready",
          {
            detail: {
              pointer:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless pointer router ready.",
        [
          "color:#ff5fb7",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    }

  };


  /* =======================================================
     17. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      pointerState,

    getCanvasPoint,

    constrainPoint,

    createPointerPayload,

    getActiveToolName,

    getActiveToolModule,

    cancelCurrentPointerAction,

    resetPointerState,

    updateCursorPosition,


    isPointerDown() {

      return pointerState.pointerDown;

    },


    getPointerState() {

      return {

        pointerDown:
          pointerState.pointerDown,

        pointerId:
          pointerState.pointerId,

        pointerType:
          pointerState.pointerType,

        activeTool:
          pointerState.activeTool,

        startPoint:
          copyPoint(
            pointerState.startPoint
          ),

        previousPoint:
          copyPoint(
            pointerState.previousPoint
          ),

        currentPoint:
          copyPoint(
            pointerState.currentPoint
          ),

        changed:
          pointerState.changed,

        cancelled:
          pointerState.cancelled

      };

    },


    markChanged(
      changed =
        true
    ) {

      pointerState.changed =
        Boolean(
          changed
        );


      getCore()
        ?.markCanvasChanged?.(
          changed
        );


      return pointerState.changed;

    },


    setContextMenuSuppressed(
      suppressed
    ) {

      pointerState.suppressContextMenu =
        Boolean(
          suppressed
        );

    }

  };


  window.PaintlessPointer =
    publicApi;


  pointerModule.api =
    publicApi;


  /* =======================================================
     18. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "pointer",
    pointerModule
  );

})();
