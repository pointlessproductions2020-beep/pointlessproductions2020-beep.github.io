"use strict";

/* =========================================================
   PAINTLESS
   RELIABLE MULTI-STEP UNDO AND REDO HISTORY SYSTEM
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
    80;

  let restoringHistory =
    false;

  let historyReady =
    false;

  let pendingHistoryTimer =
    null;

  let pendingHistoryReason =
    null;

  let lastSavedReason =
    "Initial state";

  let transactionDepth =
    0;

  let transactionReason =
    null;

  let transactionChanged =
    false;


  /* =======================================================
     3. API HELPERS
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


  /* =======================================================
     4. BUTTON STATE
  ======================================================= */

  function updateHistoryButtons() {

    const canUndo =
      undoStack.length > 1;

    const canRedo =
      redoStack.length > 0;


    if (undoButton) {

      undoButton.disabled =
        !canUndo;

      undoButton.title =
        canUndo
          ? `Undo ${undoStack.at(-1)?.reason || "edit"}`
          : "Nothing to undo";

    }


    if (redoButton) {

      redoButton.disabled =
        !canRedo;

      redoButton.title =
        canRedo
          ? `Redo ${redoStack.at(-1)?.reason || "edit"}`
          : "Nothing to redo";

    }

  }


  /* =======================================================
     5. IMAGE DATA CLONING
  ======================================================= */

  function cloneImageData(
    imageData
  ) {

    if (!imageData) {
      return null;
    }

    return new ImageData(
      new Uint8ClampedArray(
        imageData.data
      ),
      imageData.width,
      imageData.height
    );

  }


  function cloneLayersSnapshot(
    layersSnapshot
  ) {

    if (!layersSnapshot) {
      return null;
    }

    return {

      activeLayerId:
        layersSnapshot.activeLayerId,

      nextLayerNumber:
        layersSnapshot.nextLayerNumber,

      documentWidth:
        layersSnapshot.documentWidth,

      documentHeight:
        layersSnapshot.documentHeight,

      layers:
        Array.isArray(
          layersSnapshot.layers
        )
          ? layersSnapshot.layers.map(
              (layer) => ({
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

                stereo3dEnabled:
                  layer.stereo3dEnabled,

                depth3d:
                  layer.depth3d,

                transformX:
                  layer.transformX,

                transformY:
                  layer.transformY,

                scaleX:
                  layer.scaleX,

                scaleY:
                  layer.scaleY,

                rotation:
                  layer.rotation,

                ultraRotationEnabled:
                  layer.ultraRotationEnabled,

                ultraRotationAmount:
                  layer.ultraRotationAmount,

                ultraSkewEnabled:
                  layer.ultraSkewEnabled,

                ultraSkewAmount:
                  layer.ultraSkewAmount,

                ultraPerspectiveEnabled:
                  layer.ultraPerspectiveEnabled,

                ultraPerspectiveAmount:
                  layer.ultraPerspectiveAmount,

                ultraWarpEnabled:
                  layer.ultraWarpEnabled,

                ultraWarpAmount:
                  layer.ultraWarpAmount,

                ultraVerticalHingeEnabled:
                  layer.ultraVerticalHingeEnabled,

                ultraVerticalHingeAmount:
                  layer.ultraVerticalHingeAmount,

                ultraHorizontalHingeEnabled:
                  layer.ultraHorizontalHingeEnabled,

                ultraHorizontalHingeAmount:
                  layer.ultraHorizontalHingeAmount,

                width:
                  layer.width,

                height:
                  layer.height,

                imageData:
                  cloneImageData(
                    layer.imageData
                  )
              })
            )
          : []

    };

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
        cloneLayersSnapshot(
          snapshot.layersSnapshot
        )

    };

  }


  /* =======================================================
     6. SNAPSHOT COMPARISON
  ======================================================= */

  function snapshotsAppearEqual(
    firstSnapshot,
    secondSnapshot
  ) {

    if (
      !firstSnapshot ||
      !secondSnapshot
    ) {
      return false;
    }


    const firstLayers =
      firstSnapshot.layersSnapshot;

    const secondLayers =
      secondSnapshot.layersSnapshot;


    if (
      !firstLayers ||
      !secondLayers
    ) {
      return false;
    }


    if (
      firstSnapshot.documentName !==
        secondSnapshot.documentName ||
      firstLayers.documentWidth !==
        secondLayers.documentWidth ||
      firstLayers.documentHeight !==
        secondLayers.documentHeight ||
      firstLayers.activeLayerId !==
        secondLayers.activeLayerId ||
      firstLayers.layers.length !==
        secondLayers.layers.length
    ) {
      return false;
    }


    for (
      let layerIndex = 0;
      layerIndex < firstLayers.layers.length;
      layerIndex += 1
    ) {

      const firstLayer =
        firstLayers.layers[layerIndex];

      const secondLayer =
        secondLayers.layers[layerIndex];


      if (
        firstLayer.id !== secondLayer.id ||
        firstLayer.name !== secondLayer.name ||
        firstLayer.visible !== secondLayer.visible ||
        firstLayer.opacity !== secondLayer.opacity ||
        firstLayer.blendMode !== secondLayer.blendMode ||
        firstLayer.locked !== secondLayer.locked ||
        firstLayer.stereo3dEnabled !== secondLayer.stereo3dEnabled ||
        firstLayer.depth3d !== secondLayer.depth3d ||
        firstLayer.transformX !== secondLayer.transformX ||
        firstLayer.transformY !== secondLayer.transformY ||
        firstLayer.scaleX !== secondLayer.scaleX ||
        firstLayer.scaleY !== secondLayer.scaleY ||
        firstLayer.rotation !== secondLayer.rotation ||
        firstLayer.ultraRotationEnabled !== secondLayer.ultraRotationEnabled ||
        firstLayer.ultraRotationAmount !== secondLayer.ultraRotationAmount ||
        firstLayer.ultraSkewEnabled !== secondLayer.ultraSkewEnabled ||
        firstLayer.ultraSkewAmount !== secondLayer.ultraSkewAmount ||
        firstLayer.ultraPerspectiveEnabled !== secondLayer.ultraPerspectiveEnabled ||
        firstLayer.ultraPerspectiveAmount !== secondLayer.ultraPerspectiveAmount ||
        firstLayer.ultraWarpEnabled !== secondLayer.ultraWarpEnabled ||
        firstLayer.ultraWarpAmount !== secondLayer.ultraWarpAmount ||
        firstLayer.ultraVerticalHingeEnabled !== secondLayer.ultraVerticalHingeEnabled ||
        firstLayer.ultraVerticalHingeAmount !== secondLayer.ultraVerticalHingeAmount ||
        firstLayer.ultraHorizontalHingeEnabled !== secondLayer.ultraHorizontalHingeEnabled ||
        firstLayer.ultraHorizontalHingeAmount !== secondLayer.ultraHorizontalHingeAmount ||
        firstLayer.width !== secondLayer.width ||
        firstLayer.height !== secondLayer.height
      ) {
        return false;
      }


      const firstData =
        firstLayer.imageData?.data;

      const secondData =
        secondLayer.imageData?.data;


      if (
        !firstData ||
        !secondData ||
        firstData.length !== secondData.length
      ) {
        return false;
      }


      /*
       * Compare every pixel byte.
       *
       * The old sampled comparison could miss small brush
       * strokes, causing several separate actions to collapse
       * into one Undo step.
       */

      for (
        let dataIndex = 0;
        dataIndex < firstData.length;
        dataIndex += 1
      ) {

        if (
          firstData[dataIndex] !==
          secondData[dataIndex]
        ) {
          return false;
        }

      }

    }


    return true;

  }


  /* =======================================================
     7. CREATE SNAPSHOT
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


    if (!layersSnapshot) {
      return null;
    }


    const canvasApi =
      getCanvasApi();


    return {

      reason:
        String(
          reason ||
          "Edit"
        ),

      timestamp:
        Date.now(),

      documentName:
        canvasApi?.getDocumentName?.() ||
        "Untitled Masterpiece",

      layersSnapshot:
        cloneLayersSnapshot(
          layersSnapshot
        )

    };

  }


  /* =======================================================
     8. PENDING SAVE CONTROL
  ======================================================= */

  function cancelPendingHistorySave() {

    if (
      pendingHistoryTimer !==
      null
    ) {

      window.clearTimeout(
        pendingHistoryTimer
      );

    }

    pendingHistoryTimer =
      null;

    pendingHistoryReason =
      null;

  }


  function flushPendingHistorySave() {

    if (
      pendingHistoryTimer ===
      null
    ) {
      return false;
    }


    const reason =
      pendingHistoryReason ||
      "Edit";


    cancelPendingHistorySave();


    return saveHistory(
      reason
    );

  }


  /* =======================================================
     9. SAVE HISTORY
  ======================================================= */

  function saveHistory(
    reason = "Edit",
    options = {}
  ) {

    if (restoringHistory) {
      return false;
    }


    if (transactionDepth > 0) {

      transactionChanged =
        true;

      transactionReason =
        reason ||
        transactionReason ||
        "Edit";

      return true;

    }


    const snapshot =
      createHistorySnapshot(
        reason
      );


    if (!snapshot) {
      return false;
    }


    const latestSnapshot =
      undoStack.at(-1);


    if (
      options.allowDuplicate !== true &&
      snapshotsAppearEqual(
        latestSnapshot,
        snapshot
      )
    ) {

      /*
       * The state did not actually change.
       * Do not create a useless Undo step.
       */

      updateHistoryButtons();

      return false;

    }


    undoStack.push(
      snapshot
    );


    while (
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


    if (
      options.silent !== true
    ) {

      setStatusMessage(
        `${snapshot.reason} saved.`
      );

    }


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


  /*
   * Old Paintless files already call queueHistorySave().
   *
   * The old engine waited 80ms and repeatedly cancelled the
   * previous save. That could merge several separate actions
   * into one Undo step.
   *
   * The default is now immediate. A delay is only used when
   * the caller explicitly supplies one, such as a slider.
   */

  function queueHistorySave(
    reason = "Edit",
    delay = 0
  ) {

    if (restoringHistory) {
      return false;
    }


    if (transactionDepth > 0) {

      transactionChanged =
        true;

      transactionReason =
        reason ||
        transactionReason ||
        "Edit";

      return true;

    }


    cancelPendingHistorySave();


    if (
      Number(delay) <= 0
    ) {

      return saveHistory(
        reason
      );

    }


    pendingHistoryReason =
      reason;


    pendingHistoryTimer =
      window.setTimeout(
        () => {

          const savedReason =
            pendingHistoryReason ||
            reason;

          pendingHistoryTimer =
            null;

          pendingHistoryReason =
            null;

          saveHistory(
            savedReason
          );

        },
        Number(delay)
      );


    return true;

  }


  /* =======================================================
     10. HISTORY TRANSACTIONS
  ======================================================= */

  function beginTransaction(
    reason = "Edit"
  ) {

    if (restoringHistory) {
      return false;
    }


    if (transactionDepth === 0) {

      flushPendingHistorySave();

      transactionReason =
        reason;

      transactionChanged =
        false;

    }


    transactionDepth += 1;

    return true;

  }


  function markTransactionChanged(
    reason = null
  ) {

    if (transactionDepth <= 0) {
      return false;
    }


    transactionChanged =
      true;


    if (reason) {

      transactionReason =
        reason;

    }


    return true;

  }


  function endTransaction(
    reason = null
  ) {

    if (transactionDepth <= 0) {
      return false;
    }


    transactionDepth -= 1;


    if (reason) {

      transactionReason =
        reason;

    }


    if (transactionDepth > 0) {
      return true;
    }


    const shouldSave =
      transactionChanged;

    const finalReason =
      transactionReason ||
      "Edit";


    transactionReason =
      null;

    transactionChanged =
      false;


    if (!shouldSave) {
      return false;
    }


    return saveHistory(
      finalReason
    );

  }


  function cancelTransaction() {

    transactionDepth =
      0;

    transactionReason =
      null;

    transactionChanged =
      false;

  }


  /* =======================================================
     11. RESTORE SNAPSHOT
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


    cancelPendingHistorySave();

    restoringHistory =
      true;


    try {

      const copiedSnapshot =
        cloneSnapshot(
          snapshot
        );


      layersApi.restoreLayersSnapshot(
        copiedSnapshot.layersSnapshot
      );


      canvasApi?.setDocumentName?.(
        copiedSnapshot.documentName
      );

      canvasApi?.showCanvas?.();

      canvasApi?.updateStageDimensions?.();

      canvasApi?.renderComposite?.();

      canvasApi?.updateDocumentInformation?.();


      requestAnimationFrame(
        () => {

          canvasApi?.updateStageDimensions?.();

          canvasApi?.renderComposite?.();

        }
      );


      dispatchHistoryEvent(
        "paintless:history-restored",
        {
          reason:
            copiedSnapshot.reason
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
     12. UNDO
  ======================================================= */

  function undo() {

    flushPendingHistorySave();


    if (
      restoringHistory ||
      undoStack.length <= 1
    ) {

      return false;

    }


    cancelTransaction();


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

      updateHistoryButtons();

      return false;

    }


    setStatusMessage(
      `Pretending ${currentSnapshot.reason.toLowerCase()} never happened.`
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
     13. REDO
  ======================================================= */

  function redo() {

    flushPendingHistorySave();


    if (
      restoringHistory ||
      redoStack.length === 0
    ) {

      return false;

    }


    cancelTransaction();


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

      updateHistoryButtons();

      return false;

    }


    setStatusMessage(
      `Fine. ${snapshot.reason} is back.`
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
     14. RESET AND CLEAR
  ======================================================= */

  function resetHistory(
    reason = "New document"
  ) {

    cancelPendingHistorySave();

    cancelTransaction();


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


    const saved =
      saveHistory(
        reason,
        {
          allowDuplicate:
            true,

          silent:
            true
        }
      );


    setStatusMessage(
      "Fresh canvas. Try not to ruin it."
    );


    dispatchHistoryEvent(
      "paintless:history-reset",
      {
        reason,
        saved
      }
    );


    return saved;

  }


  function clearHistory() {

    cancelPendingHistorySave();

    cancelTransaction();


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
     15. HISTORY INFORMATION
  ======================================================= */

  function getHistoryInformation() {

    return {

      undoCount:
        Math.max(
          0,
          undoStack.length - 1
        ),

      redoCount:
        redoStack.length,

      storedSnapshots:
        undoStack.length,

      canUndo:
        undoStack.length > 1,

      canRedo:
        redoStack.length > 0,

      lastSavedReason,

      restoringHistory,

      historyReady,

      transactionDepth,

      pendingSave:
        pendingHistoryTimer !==
        null

    };

  }


  /* =======================================================
     16. BUTTON EVENTS
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
     17. KEYBOARD SHORTCUTS
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
            "SELECT" ||
          activeElement.isContentEditable
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
     18. PAINTLESS EVENTS
  ======================================================= */

  document.addEventListener(
    "paintless:history-requested",
    (event) => {

      const reason =
        event.detail?.reason ||
        "Edit";

      const delay =
        Number(
          event.detail?.delay ??
          0
        );


      queueHistorySave(
        reason,
        delay
      );

    }
  );


  document.addEventListener(
    "paintless:history-transaction-begin",
    (event) => {

      beginTransaction(
        event.detail?.reason ||
        "Edit"
      );

    }
  );


  document.addEventListener(
    "paintless:history-transaction-change",
    (event) => {

      markTransactionChanged(
        event.detail?.reason ||
        null
      );

    }
  );


  document.addEventListener(
    "paintless:history-transaction-end",
    (event) => {

      endTransaction(
        event.detail?.reason ||
        null
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
        180
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
     19. PUBLIC API
  ======================================================= */

  window.PaintlessHistory = {

    saveHistory,

    commitHistory:
      saveHistory,

    queueHistorySave,

    flushPendingHistorySave,

    beginTransaction,

    markTransactionChanged,

    endTransaction,

    cancelTransaction,

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
     20. INITIAL STATE
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
