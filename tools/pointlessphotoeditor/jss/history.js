"use strict";

/* =========================================================
   PAINTLESS
   UNDO AND REDO HISTORY SYSTEM
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const undoButton =
    document.getElementById(
      "undo-button"
    );

  const redoButton =
    document.getElementById(
      "redo-button"
    );

  const saveStatus =
    document.getElementById(
      "save-status"
    );


  /* =======================================================
     2. HISTORY STATE
  ======================================================= */

  const undoStack = [];

  const redoStack = [];

  const maximumHistoryEntries =
    30;

  let restoringHistory =
    false;

  let historyReady =
    false;

  let pendingHistoryTimer =
    null;

  let lastSavedReason =
    "Initial state";


  /* =======================================================
     3. HELPERS
  ======================================================= */

  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  function getCanvasApi() {

    return (
      window.PaintlessCanvas ||
      null
    );

  }


  function dispatchHistoryEvent(
    eventName,
    detail = {}
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


  function setStatusMessage(
    message
  ) {

    if (!saveStatus) {
      return;
    }


    saveStatus.textContent =
      message;

  }


  function updateHistoryButtons() {

    if (undoButton) {

      undoButton.disabled =
        undoStack.length <= 1;

      undoButton.title =
        undoStack.length > 1
          ? `Undo ${undoStack.at(-1)?.reason || ""}`
          : "Nothing to undo";

    }


    if (redoButton) {

      redoButton.disabled =
        redoStack.length === 0;

      redoButton.title =
        redoStack.length > 0
          ? `Redo ${redoStack.at(-1)?.reason || ""}`
          : "Nothing to redo";

    }

  }


  function cloneSnapshot(
    snapshot
  ) {

    if (!snapshot) {
      return null;
    }


    return {
      reason:
        snapshot.reason,

      timestamp:
        snapshot.timestamp,

      documentName:
        snapshot.documentName,

      layersSnapshot:
        {
          activeLayerId:
            snapshot.layersSnapshot.activeLayerId,

          nextLayerNumber:
            snapshot.layersSnapshot.nextLayerNumber,

          documentWidth:
            snapshot.layersSnapshot.documentWidth,

          documentHeight:
            snapshot.layersSnapshot.documentHeight,

          layers:
            snapshot.layersSnapshot.layers.map(
              (layer) => {

                const copiedImageData =
                  new ImageData(
                    new Uint8ClampedArray(
                      layer.imageData.data
                    ),
                    layer.imageData.width,
                    layer.imageData.height
                  );


                return {
                  id:
                    layer.id,

                  name:
                    layer.name,

                  visible:
                    layer.visible,

                  opacity:
                    layer.opacity,

                  blendMode:
                    layer.blendMode,

                  locked:
                    layer.locked,

                  width:
                    layer.width,

                  height:
                    layer.height,

                  imageData:
                    copiedImageData
                };

              }
            )
        }
    };

  }


  /* =======================================================
     4. CREATE SNAPSHOT
  ======================================================= */

  function createHistorySnapshot(
    reason = "Edit"
  ) {

    const layersApi =
      getLayersApi();


    if (
      !layersApi ||
      typeof layersApi.createLayersSnapshot !==
        "function"
    ) {

      return null;

    }


    const layersSnapshot =
      layersApi.createLayersSnapshot();


    const canvasApi =
      getCanvasApi();


    return {
      reason:
        String(reason || "Edit"),

      timestamp:
        Date.now(),

      documentName:
        canvasApi?.getDocumentName?.() ||
        "Untitled Masterpiece",

      layersSnapshot
    };

  }


  /* =======================================================
     5. SAVE HISTORY
  ======================================================= */

  function saveHistory(
    reason = "Edit"
  ) {

    if (restoringHistory) {
      return false;
    }


    const snapshot =
      createHistorySnapshot(
        reason
      );


    if (!snapshot) {
      return false;
    }


    undoStack.push(
      snapshot
    );


    if (
      undoStack.length >
      maximumHistoryEntries
    ) {

      undoStack.shift();

    }


    redoStack.splice(
      0,
      redoStack.length
    );


    lastSavedReason =
      snapshot.reason;


    historyReady =
      true;


    updateHistoryButtons();


    setStatusMessage(
      `${snapshot.reason} saved.`
    );


    dispatchHistoryEvent(
      "paintless:history-saved",
      {
        reason:
          snapshot.reason,

        undoCount:
          undoStack.length,

        redoCount:
          redoStack.length
      }
    );


    return true;

  }


  function queueHistorySave(
    reason = "Edit",
    delay = 80
  ) {

    window.clearTimeout(
      pendingHistoryTimer
    );


    pendingHistoryTimer =
      window.setTimeout(
        () => {

          saveHistory(
            reason
          );

        },
        delay
      );

  }


  /* =======================================================
     6. RESTORE SNAPSHOT
  ======================================================= */

  function restoreSnapshot(
    snapshot
  ) {

    const layersApi =
      getLayersApi();

    const canvasApi =
      getCanvasApi();


    if (
      !snapshot ||
      !layersApi ||
      typeof layersApi.restoreLayersSnapshot !==
        "function"
    ) {

      return false;

    }


    restoringHistory =
      true;


    try {

      layersApi.restoreLayersSnapshot(
        cloneSnapshot(
          snapshot
        ).layersSnapshot
      );


      canvasApi?.setDocumentName?.(
        snapshot.documentName
      );


      canvasApi?.showCanvas?.();

      canvasApi?.updateStageDimensions?.();

      canvasApi?.updateDocumentInformation?.();


      requestAnimationFrame(
        () => {

          canvasApi?.fitCanvasToScreen?.();

        }
      );


      dispatchHistoryEvent(
        "paintless:history-restored",
        {
          reason:
            snapshot.reason
        }
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless could not restore history:",
        error
      );


      setStatusMessage(
        "Undo failed. The pixels are resisting."
      );


      return false;

    } finally {

      restoringHistory =
        false;

      updateHistoryButtons();

    }

  }


  /* =======================================================
     7. UNDO
  ======================================================= */

  function undo() {

    if (
      restoringHistory ||
      undoStack.length <= 1
    ) {
      return false;
    }


    const currentSnapshot =
      undoStack.pop();


    redoStack.push(
      currentSnapshot
    );


    const previousSnapshot =
      undoStack.at(-1);


    const restored =
      restoreSnapshot(
        previousSnapshot
      );


    if (!restored) {

      undoStack.push(
        redoStack.pop()
      );

      return false;

    }


    setStatusMessage(
      `Undid ${currentSnapshot.reason}.`
    );


    updateHistoryButtons();


    dispatchHistoryEvent(
      "paintless:undo",
      {
        reason:
          currentSnapshot.reason,

        undoCount:
          undoStack.length,

        redoCount:
          redoStack.length
      }
    );


    return true;

  }


  /* =======================================================
     8. REDO
  ======================================================= */

  function redo() {

    if (
      restoringHistory ||
      redoStack.length === 0
    ) {
      return false;
    }


    const snapshot =
      redoStack.pop();


    undoStack.push(
      snapshot
    );


    const restored =
      restoreSnapshot(
        snapshot
      );


    if (!restored) {

      redoStack.push(
        undoStack.pop()
      );

      return false;

    }


    setStatusMessage(
      `Redid ${snapshot.reason}.`
    );


    updateHistoryButtons();


    dispatchHistoryEvent(
      "paintless:redo",
      {
        reason:
          snapshot.reason,

        undoCount:
          undoStack.length,

        redoCount:
          redoStack.length
      }
    );


    return true;

  }


  /* =======================================================
     9. RESET HISTORY
  ======================================================= */

  function resetHistory(
    reason = "New document"
  ) {

    window.clearTimeout(
      pendingHistoryTimer
    );


    undoStack.splice(
      0,
      undoStack.length
    );


    redoStack.splice(
      0,
      redoStack.length
    );


    historyReady =
      false;


    saveHistory(
      reason
    );


    setStatusMessage(
      "Fresh canvas. No mistakes yet."
    );


    dispatchHistoryEvent(
      "paintless:history-reset",
      {
        reason
      }
    );

  }


  function clearHistory() {

    window.clearTimeout(
      pendingHistoryTimer
    );


    undoStack.splice(
      0,
      undoStack.length
    );


    redoStack.splice(
      0,
      redoStack.length
    );


    historyReady =
      false;


    updateHistoryButtons();


    setStatusMessage(
      "History cleared. We saw nothing."
    );

  }


  /* =======================================================
     10. HISTORY INFORMATION
  ======================================================= */

  function getHistoryInformation() {

    return {
      undoCount:
        undoStack.length,

      redoCount:
        redoStack.length,

      canUndo:
        undoStack.length > 1,

      canRedo:
        redoStack.length > 0,

      lastSavedReason,

      restoringHistory,

      historyReady
    };

  }


  /* =======================================================
     11. BUTTON EVENTS
  ======================================================= */

  undoButton?.addEventListener(
    "click",
    undo
  );


  redoButton?.addEventListener(
    "click",
    redo
  );


  /* =======================================================
     12. KEYBOARD SHORTCUTS
  ======================================================= */

  window.addEventListener(
    "keydown",
    (event) => {

      const activeElement =
        document.activeElement;


      const typing =
        activeElement &&
        (
          activeElement.tagName ===
            "INPUT" ||
          activeElement.tagName ===
            "TEXTAREA" ||
          activeElement.tagName ===
            "SELECT"
        );


      if (typing) {
        return;
      }


      const modifierPressed =
        event.ctrlKey ||
        event.metaKey;


      if (!modifierPressed) {
        return;
      }


      const key =
        event.key.toLowerCase();


      if (
        key === "z" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        undo();

        return;

      }


      if (
        key === "y" ||
        (
          key === "z" &&
          event.shiftKey
        )
      ) {

        event.preventDefault();

        redo();

      }

    }
  );


  /* =======================================================
     13. PAINTLESS EVENTS
  ======================================================= */

  document.addEventListener(
    "paintless:history-requested",
    (event) => {

      const reason =
        event.detail?.reason ||
        "Edit";


      queueHistorySave(
        reason
      );

    }
  );


  document.addEventListener(
    "paintless:document-reset",
    () => {

      window.setTimeout(
        () => {

          resetHistory(
            "Create document"
          );

        },
        0
      );

    }
  );


  document.addEventListener(
    "paintless:image-layer-created",
    () => {

      if (!historyReady) {

        window.setTimeout(
          () => {

            resetHistory(
              "Open image"
            );

          },
          0
        );

      }

    }
  );


  document.addEventListener(
    "paintless:document-name-changed",
    () => {

      if (!historyReady) {
        return;
      }


      queueHistorySave(
        "Rename document",
        120
      );

    }
  );


  document.addEventListener(
    "paintless:status-message",
    (event) => {

      const message =
        event.detail?.message;


      if (message) {

        setStatusMessage(
          message
        );

      }

    }
  );


  /* =======================================================
     14. PUBLIC API
  ======================================================= */

  window.PaintlessHistory = {

    saveHistory,

    queueHistorySave,

    undo,

    redo,

    resetHistory,

    clearHistory,

    createHistorySnapshot,

    restoreSnapshot,

    getHistoryInformation,

    isRestoring() {

      return restoringHistory;

    }

  };


  /* =======================================================
     15. INITIAL STATE
  ======================================================= */

  updateHistoryButtons();


  console.log(
    "%cPaintless history ready.",
    [
      "color:#ffd75a",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

})();
