"use strict";

/* =========================================================
   PAINTLESS
   CANVAS AND WORKSPACE SYSTEM
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const editorCanvas =
    document.getElementById("editor-canvas");

  const overlayCanvas =
    document.getElementById("overlay-canvas");

  const canvasStage =
    document.getElementById("canvas-stage");

  const canvasViewport =
    document.getElementById("canvas-viewport");

  const workspaceEmptyState =
    document.getElementById("workspace-empty-state");

  const zoomDisplay =
    document.getElementById("zoom-display");

  const zoomInButton =
    document.getElementById("zoom-in-button");

  const zoomOutButton =
    document.getElementById("zoom-out-button");

  const fitScreenButton =
    document.getElementById("fit-screen-button");

  const canvasSizeStatus =
    document.getElementById("canvas-size-status");

  const cursorPosition =
    document.getElementById("cursor-position");

  const documentStatus =
    document.getElementById("document-status");


  /* =======================================================
     2. CANVAS STATE
  ======================================================= */

  let documentOpen = false;

  let documentName =
    "Untitled Masterpiece";

  let zoomLevel = 1;

  let minimumZoom = 0.05;

  let maximumZoom = 8;

  let isPanning = false;

  let panStartX = 0;

  let panStartY = 0;

  let panScrollLeft = 0;

  let panScrollTop = 0;

  let spaceKeyHeld = false;


  /* =======================================================
     3. HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
  ) {

    return Math.min(
      maximum,
      Math.max(
        minimum,
        Number(value)
      )
    );

  }


  function getDocumentSize() {

    if (
      window.PaintlessLayers &&
      typeof window.PaintlessLayers.getDocumentSize ===
        "function"
    ) {

      return window.PaintlessLayers.getDocumentSize();

    }


    return {
      width:
        editorCanvas?.width || 1280,

      height:
        editorCanvas?.height || 720
    };

  }


  function dispatchCanvasEvent(
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


  function formatPercentage(
    value
  ) {

    return `${Math.round(
      value * 100
    )}%`;

  }


  /* =======================================================
     4. DOCUMENT VISIBILITY
  ======================================================= */

  function showCanvas() {

    documentOpen = true;


    canvasStage?.classList.add(
      "is-visible"
    );


    workspaceEmptyState?.classList.add(
      "is-hidden"
    );


    updateDocumentInformation();

  }


  function hideCanvas() {

    documentOpen = false;


    canvasStage?.classList.remove(
      "is-visible"
    );


    workspaceEmptyState?.classList.remove(
      "is-hidden"
    );


    if (documentStatus) {

      documentStatus.textContent =
        "No document open";

    }


    if (canvasSizeStatus) {

      canvasSizeStatus.textContent =
        "—";

    }

  }


  function isDocumentOpen() {

    return documentOpen;

  }


  /* =======================================================
     5. DOCUMENT NAME
  ======================================================= */

  function setDocumentName(
    newName
  ) {

    const cleanedName =
      String(newName || "")
        .trim()
        .slice(
          0,
          120
        );


    documentName =
      cleanedName ||
      "Untitled Masterpiece";


    updateDocumentInformation();


    dispatchCanvasEvent(
      "paintless:document-name-changed",
      {
        name:
          documentName
      }
    );

  }


  function getDocumentName() {

    return documentName;

  }


  /* =======================================================
     6. STAGE DIMENSIONS
  ======================================================= */

  function updateStageDimensions() {

    if (!canvasStage) {
      return;
    }


    const {
      width,
      height
    } =
      getDocumentSize();


    canvasStage.style.width =
      `${width}px`;

    canvasStage.style.height =
      `${height}px`;


    canvasStage.style.transformOrigin =
      "top left";


    applyZoom();

  }


  /* =======================================================
     7. ZOOM
  ======================================================= */

  function applyZoom() {

    if (!canvasStage) {
      return;
    }


    canvasStage.style.transform =
      `scale(${zoomLevel})`;


    if (zoomDisplay) {

      zoomDisplay.textContent =
        formatPercentage(
          zoomLevel
        );

    }


    dispatchCanvasEvent(
      "paintless:zoom-changed",
      {
        zoom:
          zoomLevel
      }
    );

  }


  function setZoom(
    newZoom,
    {
      keepCentre = true
    } = {}
  ) {

    if (!canvasViewport) {
      return;
    }


    const previousZoom =
      zoomLevel;


    const viewportCentreX =
      canvasViewport.scrollLeft +
      canvasViewport.clientWidth / 2;

    const viewportCentreY =
      canvasViewport.scrollTop +
      canvasViewport.clientHeight / 2;


    zoomLevel =
      clamp(
        newZoom,
        minimumZoom,
        maximumZoom
      );


    applyZoom();


    if (
      keepCentre &&
      previousZoom > 0
    ) {

      const zoomRatio =
        zoomLevel /
        previousZoom;


      canvasViewport.scrollLeft =
        viewportCentreX *
          zoomRatio -
        canvasViewport.clientWidth /
          2;


      canvasViewport.scrollTop =
        viewportCentreY *
          zoomRatio -
        canvasViewport.clientHeight /
          2;

    }

  }


  function zoomIn() {

    const nextZoom =
      zoomLevel < 1
        ? zoomLevel + 0.1
        : zoomLevel + 0.25;


    setZoom(
      nextZoom
    );

  }


  function zoomOut() {

    const nextZoom =
      zoomLevel <= 1
        ? zoomLevel - 0.1
        : zoomLevel - 0.25;


    setZoom(
      nextZoom
    );

  }


  function resetZoom() {

    setZoom(
      1
    );

  }


  function fitCanvasToScreen() {

    if (
      !canvasViewport ||
      !documentOpen
    ) {
      return;
    }


    const {
      width,
      height
    } =
      getDocumentSize();


    const horizontalPadding =
      90;

    const verticalPadding =
      90;


    const availableWidth =
      Math.max(
        1,
        canvasViewport.clientWidth -
          horizontalPadding
      );


    const availableHeight =
      Math.max(
        1,
        canvasViewport.clientHeight -
          verticalPadding
      );


    const horizontalScale =
      availableWidth /
      width;

    const verticalScale =
      availableHeight /
      height;


    const fittedZoom =
      Math.min(
        horizontalScale,
        verticalScale,
        1
      );


    setZoom(
      fittedZoom,
      {
        keepCentre:
          false
      }
    );


    requestAnimationFrame(
      centreCanvas
    );

  }


  /* =======================================================
     8. CENTRE CANVAS
  ======================================================= */

  function centreCanvas() {

    if (!canvasViewport) {
      return;
    }


    const scaledWidth =
      canvasStage.offsetWidth *
      zoomLevel;

    const scaledHeight =
      canvasStage.offsetHeight *
      zoomLevel;


    canvasViewport.scrollLeft =
      Math.max(
        0,
        (
          scaledWidth -
          canvasViewport.clientWidth
        ) / 2
      );


    canvasViewport.scrollTop =
      Math.max(
        0,
        (
          scaledHeight -
          canvasViewport.clientHeight
        ) / 2
      );

  }


  /* =======================================================
     9. COORDINATE CONVERSION
  ======================================================= */

  function clientToCanvas(
    clientX,
    clientY
  ) {

    if (!editorCanvas) {

      return {
        x:
          0,

        y:
          0,

        inside:
          false
      };

    }


    const canvasRectangle =
      editorCanvas.getBoundingClientRect();


    const scaleX =
      editorCanvas.width /
      canvasRectangle.width;

    const scaleY =
      editorCanvas.height /
      canvasRectangle.height;


    const x =
      (
        clientX -
        canvasRectangle.left
      ) *
      scaleX;


    const y =
      (
        clientY -
        canvasRectangle.top
      ) *
      scaleY;


    return {
      x,
      y,

      inside:
        x >= 0 &&
        y >= 0 &&
        x <= editorCanvas.width &&
        y <= editorCanvas.height
    };

  }


  function canvasToClient(
    canvasX,
    canvasY
  ) {

    if (!editorCanvas) {

      return {
        x:
          0,

        y:
          0
      };

    }


    const canvasRectangle =
      editorCanvas.getBoundingClientRect();


    return {
      x:
        canvasRectangle.left +
        (
          canvasX /
          editorCanvas.width
        ) *
        canvasRectangle.width,

      y:
        canvasRectangle.top +
        (
          canvasY /
          editorCanvas.height
        ) *
        canvasRectangle.height
    };

  }


  /* =======================================================
     10. CURSOR POSITION
  ======================================================= */

  function updateCursorPosition(
    clientX,
    clientY
  ) {

    if (!cursorPosition) {
      return;
    }


    const point =
      clientToCanvas(
        clientX,
        clientY
      );


    if (!point.inside) {

      cursorPosition.textContent =
        "X: —  Y: —";

      return;

    }


    cursorPosition.textContent =
      `X: ${Math.floor(
        point.x
      )}  Y: ${Math.floor(
        point.y
      )}`;

  }


  /* =======================================================
     11. PAN WORKSPACE
  ======================================================= */

  function beginPanning(
    event
  ) {

    if (
      !canvasViewport ||
      !documentOpen
    ) {
      return;
    }


    isPanning =
      true;


    panStartX =
      event.clientX;

    panStartY =
      event.clientY;


    panScrollLeft =
      canvasViewport.scrollLeft;

    panScrollTop =
      canvasViewport.scrollTop;


    canvasViewport.style.cursor =
      "grabbing";


    event.preventDefault();

  }


  function updatePanning(
    event
  ) {

    if (
      !isPanning ||
      !canvasViewport
    ) {
      return;
    }


    const movementX =
      event.clientX -
      panStartX;

    const movementY =
      event.clientY -
      panStartY;


    canvasViewport.scrollLeft =
      panScrollLeft -
      movementX;


    canvasViewport.scrollTop =
      panScrollTop -
      movementY;

  }


  function endPanning() {

    if (!isPanning) {
      return;
    }


    isPanning =
      false;


    if (canvasViewport) {

      canvasViewport.style.cursor =
        spaceKeyHeld
          ? "grab"
          : "";

    }

  }


  /* =======================================================
     12. DOCUMENT INFORMATION
  ======================================================= */

  function updateDocumentInformation() {

    const {
      width,
      height
    } =
      getDocumentSize();


    if (documentStatus) {

      documentStatus.textContent =
        documentOpen
          ? documentName
          : "No document open";

    }


    if (canvasSizeStatus) {

      canvasSizeStatus.textContent =
        documentOpen
          ? `${width} × ${height} px`
          : "—";

    }

  }


  /* =======================================================
     13. OVERLAY CANVAS
  ======================================================= */

  function clearOverlay() {

    if (!overlayCanvas) {
      return;
    }


    const overlayContext =
      overlayCanvas.getContext(
        "2d"
      );


    overlayContext.clearRect(
      0,
      0,
      overlayCanvas.width,
      overlayCanvas.height
    );

  }


  function getOverlayContext() {

    return (
      overlayCanvas?.getContext(
        "2d"
      ) || null
    );

  }


  /* =======================================================
     14. CANVAS CURSOR
  ======================================================= */

  function setCanvasCursor(
    cursorName
  ) {

    if (editorCanvas) {

      editorCanvas.style.cursor =
        cursorName || "default";

    }

  }


  /* =======================================================
     15. EVENT LISTENERS
  ======================================================= */

  zoomInButton?.addEventListener(
    "click",
    zoomIn
  );


  zoomOutButton?.addEventListener(
    "click",
    zoomOut
  );


  fitScreenButton?.addEventListener(
    "click",
    fitCanvasToScreen
  );


  canvasViewport?.addEventListener(
    "wheel",
    (event) => {

      if (
        !event.ctrlKey &&
        !event.metaKey
      ) {
        return;
      }


      event.preventDefault();


      const zoomDirection =
        event.deltaY < 0
          ? 1
          : -1;


      const zoomAmount =
        zoomLevel < 1
          ? 0.1
          : 0.25;


      setZoom(
        zoomLevel +
        zoomDirection *
        zoomAmount
      );

    },
    {
      passive:
        false
    }
  );


  canvasViewport?.addEventListener(
    "pointerdown",
    (event) => {

      const middleMousePressed =
        event.button === 1;


      if (
        middleMousePressed ||
        spaceKeyHeld
      ) {

        beginPanning(
          event
        );

      }

    }
  );


  window.addEventListener(
    "pointermove",
    (event) => {

      updatePanning(
        event
      );


      if (documentOpen) {

        updateCursorPosition(
          event.clientX,
          event.clientY
        );

      }

    }
  );


  window.addEventListener(
    "pointerup",
    endPanning
  );


  window.addEventListener(
    "pointercancel",
    endPanning
  );


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


      if (
        event.code ===
        "Space"
      ) {

        spaceKeyHeld =
          true;


        if (canvasViewport) {

          canvasViewport.style.cursor =
            "grab";

        }


        event.preventDefault();

      }


      if (
        event.key === "0" &&
        (
          event.ctrlKey ||
          event.metaKey
        )
      ) {

        event.preventDefault();

        fitCanvasToScreen();

      }


      if (
        event.key === "+" ||
        event.key === "="
      ) {

        if (
          event.ctrlKey ||
          event.metaKey
        ) {

          event.preventDefault();

          zoomIn();

        }

      }


      if (
        event.key === "-"
      ) {

        if (
          event.ctrlKey ||
          event.metaKey
        ) {

          event.preventDefault();

          zoomOut();

        }

      }

    }
  );


  window.addEventListener(
    "keyup",
    (event) => {

      if (
        event.code ===
        "Space"
      ) {

        spaceKeyHeld =
          false;


        if (
          canvasViewport &&
          !isPanning
        ) {

          canvasViewport.style.cursor =
            "";

        }

      }

    }
  );


  window.addEventListener(
    "blur",
    () => {

      spaceKeyHeld =
        false;

      endPanning();

    }
  );


  window.addEventListener(
    "resize",
    () => {

      if (!documentOpen) {
        return;
      }


      window.clearTimeout(
        window.paintlessResizeTimer
      );


      window.paintlessResizeTimer =
        window.setTimeout(
          () => {

            updateStageDimensions();

          },
          100
        );

    }
  );


  /* =======================================================
     16. PAINTLESS EVENTS
  ======================================================= */

  document.addEventListener(
    "paintless:document-reset",
    () => {

      showCanvas();

      updateStageDimensions();

      fitCanvasToScreen();

    }
  );


  document.addEventListener(
    "paintless:document-resized",
    () => {

      updateStageDimensions();

      updateDocumentInformation();

    }
  );


  document.addEventListener(
    "paintless:image-layer-created",
    () => {

      showCanvas();

      updateStageDimensions();

      fitCanvasToScreen();

    }
  );


  /* =======================================================
     17. PUBLIC API
  ======================================================= */

  window.PaintlessCanvas = {

    showCanvas,

    hideCanvas,

    isDocumentOpen,

    setDocumentName,

    getDocumentName,

    setZoom,

    zoomIn,

    zoomOut,

    resetZoom,

    fitCanvasToScreen,

    centreCanvas,

    updateStageDimensions,

    updateDocumentInformation,

    clientToCanvas,

    canvasToClient,

    clearOverlay,

    getOverlayContext,

    setCanvasCursor,

    getZoom() {

      return zoomLevel;

    }

  };


  /* =======================================================
     18. INITIAL STATE
  ======================================================= */

  hideCanvas();

  updateStageDimensions();

  applyZoom();


  console.log(
    "%cPaintless canvas ready.",
    [
      "color:#35e7ff",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

})();
