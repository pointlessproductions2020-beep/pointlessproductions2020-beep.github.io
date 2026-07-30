"use strict";

/* =========================================================
   PAINTLESS3D
   MODE MODULE — v0.1

   File:
   js/paintless3d/mode.js

   Purpose:
   - Controls the editor when switching between 2D and 3D
   - Keeps Paintless drawing tools fully available
   - Adds clear visual feedback for 3D mode
   - Creates a compact 3D information strip
   - Remembers the previous editor tool
   - Prepares the interface for layer depth controls
   - Exposes mode hooks for later renderer modules
   - Does not yet render the red/cyan image

   Future modules will connect to:
   - paintless3d:mode-entered
   - paintless3d:mode-exited
   - paintless3d:editor-state-changed
========================================================= */

(() => {

  /* =======================================================
     1. PAINTLESS3D CHECK
  ======================================================= */

  const paintless3d =
    window.Paintless3D;


  if (
    !paintless3d ||
    typeof paintless3d.registerModule !==
      "function"
  ) {

    console.error(
      "Paintless3D Mode could not start because paintless3d.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. MODE STATE
  ======================================================= */

  const modeState = {

    initialised:
      false,

    destroyed:
      false,

    active:
      false,

    transitioning:
      false,

    currentMode:
      paintless3d.getMode?.() ||
      "2d",

    previousMode:
      "2d",

    previousTool:
      null,

    previousCursor:
      null,

    previousStatusMessage:
      null,

    activationCount:
      0,

    enteredAt:
      null,

    transitionDuration:
      180,

    modeClass:
      "paintless3d-editor-active",

    storageKey:
      "paintless3d-mode-state-v1",

    informationStripInstalled:
      false,

    stylesInstalled:
      false,

    depthControlsReady:
      false,

    rendererReady:
      false,

    exportReady:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    app:
      null,

    header:
      null,

    topToolbar:
      null,

    optionsToolbar:
      null,

    toolbox:
      null,

    canvasViewport:
      null,

    canvasStage:
      null,

    editorCanvas:
      null,

    overlayCanvas:
      null,

    sidebar:
      null,

    layersPanel:
      null,

    statusBar:
      null,

    informationStrip:
      null,

    informationIcon:
      null,

    informationTitle:
      null,

    informationMessage:
      null,

    informationDepth:
      null,

    closeInformationButton:
      null,

    styles:
      null

  };


  /* =======================================================
     4. SHARED APIS
  ======================================================= */

  function get3DCore() {

    return (
      window.Paintless3DCore ||
      paintless3d.getModule?.(
        "core"
      )?.api ||
      null
    );

  }


  function getToolsApi() {

    return (
      window.PaintlessTools ||
      null
    );

  }


  function getToolCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  function getToolbarApi() {

    return (
      window.PaintlessToolbar ||
      getToolsApi()
        ?.getModule?.(
          "toolbar"
        )?.api ||
      null
    );

  }


  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  /* =======================================================
     5. GENERAL HELPERS
  ======================================================= */

  function dispatch(
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


  function sendStatusMessage(
    message
  ) {

    if (
      typeof getToolCore()
        ?.sendStatusMessage ===
      "function"
    ) {

      getToolCore()
        .sendStatusMessage(
          message
        );


      return true;
    }


    dispatch(
      "paintless:status-message",
      {
        message
      }
    );


    return true;
  }


  function normaliseMode(
    mode
  ) {

    return String(
      mode ||
      ""
    ).toLowerCase() ===
      "3d"
      ? "3d"
      : "2d";

  }


  function findFirst(
    selectors
  ) {

    for (
      const selector of
      selectors
    ) {

      const element =
        document.querySelector(
          selector
        );


      if (element) {

        return element;
      }
    }


    return null;
  }


  function isTypingElement(
    element =
      document.activeElement
  ) {

    if (!element) {

      return false;
    }


    return Boolean(
      element.tagName ===
        "INPUT" ||
      element.tagName ===
        "TEXTAREA" ||
      element.tagName ===
        "SELECT" ||
      element.isContentEditable
    );

  }


  /* =======================================================
     6. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.app =
      findFirst(
        [
          "#app",
          "#paintless-app",
          ".paintless-app",
          ".app-shell",
          "body"
        ]
      );


    dom.header =
      findFirst(
        [
          "#app-header",
          ".app-header",
          ".top-header",
          "header"
        ]
      );


    dom.topToolbar =
      findFirst(
        [
          "#top-toolbar",
          ".top-toolbar",
          ".toolbar-top",
          ".header-actions",
          ".top-actions"
        ]
      );


    dom.optionsToolbar =
      findFirst(
        [
          "#tool-options",
          ".tool-options",
          ".options-toolbar",
          ".tool-settings"
        ]
      );


    dom.toolbox =
      findFirst(
        [
          "#toolbox",
          ".toolbox",
          "[data-toolbox]"
        ]
      );


    dom.canvasViewport =
      findFirst(
        [
          "#canvas-viewport",
          ".canvas-viewport",
          ".editor-viewport"
        ]
      );


    dom.canvasStage =
      findFirst(
        [
          "#canvas-stage",
          ".canvas-stage",
          ".editor-stage"
        ]
      );


    dom.editorCanvas =
      document.getElementById(
        "editor-canvas"
      );


    dom.overlayCanvas =
      document.getElementById(
        "overlay-canvas"
      );


    dom.sidebar =
      findFirst(
        [
          "#right-sidebar",
          ".right-sidebar",
          ".sidebar-right",
          ".properties-sidebar"
        ]
      );


    dom.layersPanel =
      findFirst(
        [
          "#layers-panel",
          ".layers-panel",
          "[data-panel='layers']",
          ".layers-section"
        ]
      );


    dom.statusBar =
      findFirst(
        [
          "#status-bar",
          ".status-bar",
          ".app-status"
        ]
      );

  }


  /* =======================================================
     7. MODE STYLES
  ======================================================= */

  function installStyles() {

    if (
      modeState.stylesInstalled ||
      document.getElementById(
        "paintless3d-mode-styles"
      )
    ) {

      modeState.stylesInstalled =
        true;


      return true;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-mode-styles";


    style.textContent = `
      :root {
        --p3d-red: #ff315c;
        --p3d-cyan: #25e6ff;
        --p3d-purple: #a84cff;
        --p3d-dark: rgba(10, 6, 17, 0.97);
      }

      body.paintless3d-editor-active {
        --paintless3d-mode-opacity: 1;
      }

      body:not(.paintless3d-editor-active) {
        --paintless3d-mode-opacity: 0;
      }

      .paintless3d-information-strip {
        position: fixed;
        left: 50%;
        top: 66px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        width: min(520px, calc(100vw - 24px));
        min-height: 44px;
        padding: 7px 9px 7px 11px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 13px;
        color: #ffffff;
        background:
          radial-gradient(
            circle at 4% 50%,
            rgba(255, 49, 92, 0.18),
            transparent 34%
          ),
          radial-gradient(
            circle at 96% 50%,
            rgba(37, 230, 255, 0.18),
            transparent 34%
          ),
          linear-gradient(
            145deg,
            rgba(28, 18, 43, 0.98),
            rgba(9, 6, 16, 0.99)
          );
        box-shadow:
          0 15px 45px rgba(0, 0, 0, 0.48),
          -4px 0 17px rgba(255, 49, 92, 0.08),
          4px 0 17px rgba(37, 230, 255, 0.09);
        opacity: 0;
        pointer-events: none;
        transform:
          translateX(-50%)
          translateY(-7px)
          scale(0.98);
        transition:
          opacity 170ms ease,
          transform 170ms ease;
        z-index: 9500;
      }

      .paintless3d-information-strip.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform:
          translateX(-50%)
          translateY(0)
          scale(1);
      }

      .paintless3d-information-strip[hidden] {
        display: none !important;
      }

      .paintless3d-information-icon {
        display: grid;
        place-items: center;
        width: 31px;
        height: 31px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 9px;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.25),
            rgba(37, 230, 255, 0.25)
          );
        font-size: 17px;
        filter:
          drop-shadow(-2px 0 3px rgba(255, 49, 92, 0.22))
          drop-shadow(2px 0 3px rgba(37, 230, 255, 0.22));
      }

      .paintless3d-information-copy {
        min-width: 0;
      }

      .paintless3d-information-title {
        display: block;
        overflow: hidden;
        color: #ffffff;
        font:
          900 11px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.08em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
        text-shadow:
          -1px 0 rgba(255, 49, 92, 0.45),
          1px 0 rgba(37, 230, 255, 0.45);
      }

      .paintless3d-information-message {
        display: block;
        margin-top: 2px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.58);
        font:
          500 10px/1.3
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless3d-information-depth {
        color: rgba(255, 255, 255, 0.46);
      }

      .paintless3d-information-close {
        display: grid;
        place-items: center;
        width: 29px;
        height: 29px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.045);
        font: 800 15px/1 Arial, sans-serif;
        cursor: pointer;
        transition:
          color 120ms ease,
          background 120ms ease,
          border-color 120ms ease;
      }

      .paintless3d-information-close:hover {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.27);
        background: rgba(255, 255, 255, 0.09);
      }

      body.paintless3d-editor-active
      #canvas-viewport,
      body.paintless3d-editor-active
      .canvas-viewport {
        background:
          radial-gradient(
            circle at 23% 50%,
            rgba(255, 49, 92, 0.035),
            transparent 35%
          ),
          radial-gradient(
            circle at 77% 50%,
            rgba(37, 230, 255, 0.035),
            transparent 35%
          ),
          var(
            --canvas-viewport-background,
            #120d19
          );
      }

      body.paintless3d-editor-active
      #canvas-stage,
      body.paintless3d-editor-active
      .canvas-stage {
        position: relative;
      }

      body.paintless3d-editor-active
      #canvas-stage::before,
      body.paintless3d-editor-active
      .canvas-stage::before {
        content: "PAINTLESS3D";
        position: absolute;
        right: 11px;
        top: 9px;
        padding: 5px 8px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.27);
        background: rgba(8, 5, 13, 0.45);
        font:
          900 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.12em;
        pointer-events: none;
        text-shadow:
          -1px 0 rgba(255, 49, 92, 0.48),
          1px 0 rgba(37, 230, 255, 0.48);
        z-index: 20;
      }

      body.paintless3d-editor-active
      #editor-canvas,
      body.paintless3d-editor-active
      .editor-canvas {
        transition:
          filter 170ms ease,
          box-shadow 170ms ease;
      }

      body.paintless3d-editor-active
      .layers-panel,
      body.paintless3d-editor-active
      #layers-panel,
      body.paintless3d-editor-active
      [data-panel="layers"] {
        position: relative;
      }

      body.paintless3d-editor-active
      .layers-panel::before,
      body.paintless3d-editor-active
      #layers-panel::before,
      body.paintless3d-editor-active
      [data-panel="layers"]::before {
        content: "DEPTH READY";
        position: absolute;
        right: 8px;
        top: 7px;
        color: rgba(37, 230, 255, 0.62);
        font:
          900 7px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.09em;
        pointer-events: none;
      }

      @media (max-width: 760px) {
        .paintless3d-information-strip {
          top: 58px;
          width: min(430px, calc(100vw - 14px));
        }

        .paintless3d-information-message {
          max-width: 260px;
        }
      }

      @media (max-width: 520px) {
        .paintless3d-information-strip {
          top: 54px;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 7px;
          min-height: 40px;
          padding: 6px 7px;
        }

        .paintless3d-information-icon {
          width: 28px;
          height: 28px;
          font-size: 15px;
        }

        .paintless3d-information-message {
          max-width: 190px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    modeState.stylesInstalled =
      true;


    return true;
  }


  /* =======================================================
     8. INFORMATION STRIP
  ======================================================= */

  function createInformationStrip() {

    const strip =
      document.createElement(
        "aside"
      );


    strip.id =
      "paintless3d-information-strip";


    strip.className =
      "paintless3d-information-strip";


    strip.hidden =
      true;


    strip.setAttribute(
      "aria-live",
      "polite"
    );


    const icon =
      document.createElement(
        "span"
      );


    icon.className =
      "paintless3d-information-icon";


    icon.textContent =
      "👓";


    icon.setAttribute(
      "aria-hidden",
      "true"
    );


    const copy =
      document.createElement(
        "span"
      );


    copy.className =
      "paintless3d-information-copy";


    const title =
      document.createElement(
        "strong"
      );


    title.className =
      "paintless3d-information-title";


    title.textContent =
      "Paintless3D mode";


    const message =
      document.createElement(
        "span"
      );


    message.className =
      "paintless3d-information-message";


    message.textContent =
      "Normal painting remains active. Layer depth is coming next.";


    const depth =
      document.createElement(
        "span"
      );


    depth.className =
      "paintless3d-information-depth";


    depth.textContent =
      " • Depth 0";


    message.appendChild(
      depth
    );


    copy.append(
      title,
      message
    );


    const closeButton =
      document.createElement(
        "button"
      );


    closeButton.type =
      "button";


    closeButton.className =
      "paintless3d-information-close";


    closeButton.textContent =
      "×";


    closeButton.setAttribute(
      "aria-label",
      "Hide Paintless3D information"
    );


    strip.append(
      icon,
      copy,
      closeButton
    );


    document.body.appendChild(
      strip
    );


    dom.informationStrip =
      strip;


    dom.informationIcon =
      icon;


    dom.informationTitle =
      title;


    dom.informationMessage =
      message;


    dom.informationDepth =
      depth;


    dom.closeInformationButton =
      closeButton;


    modeState.informationStripInstalled =
      true;


    return strip;
  }


  function ensureInformationStrip() {

    const existingStrip =
      document.getElementById(
        "paintless3d-information-strip"
      );


    if (existingStrip) {

      dom.informationStrip =
        existingStrip;


      dom.informationIcon =
        existingStrip.querySelector(
          ".paintless3d-information-icon"
        );


      dom.informationTitle =
        existingStrip.querySelector(
          ".paintless3d-information-title"
        );


      dom.informationMessage =
        existingStrip.querySelector(
          ".paintless3d-information-message"
        );


      dom.informationDepth =
        existingStrip.querySelector(
          ".paintless3d-information-depth"
        );


      dom.closeInformationButton =
        existingStrip.querySelector(
          ".paintless3d-information-close"
        );


      modeState.informationStripInstalled =
        true;


      return existingStrip;
    }


    return createInformationStrip();
  }


  function showInformationStrip() {

    ensureInformationStrip();


    if (!dom.informationStrip) {

      return false;
    }


    dom.informationStrip.hidden =
      false;


    requestAnimationFrame(
      () => {

        dom.informationStrip
          ?.classList.add(
            "is-visible"
          );
      }
    );


    return true;
  }


  function hideInformationStrip() {

    if (!dom.informationStrip) {

      return false;
    }


    dom.informationStrip.classList.remove(
      "is-visible"
    );


    window.setTimeout(
      () => {

        if (
          dom.informationStrip &&
          !dom.informationStrip.classList.contains(
            "is-visible"
          )
        ) {

          dom.informationStrip.hidden =
            true;
        }
      },
      modeState.transitionDuration
    );


    return true;
  }


  function setInformationMessage(
    message,
    {
      title =
        null,

      icon =
        null,

      depth =
        null
    } = {}
  ) {

    ensureInformationStrip();


    if (
      title &&
      dom.informationTitle
    ) {

      dom.informationTitle.textContent =
        title;
    }


    if (
      icon &&
      dom.informationIcon
    ) {

      dom.informationIcon.textContent =
        icon;
    }


    if (
      message &&
      dom.informationMessage
    ) {

      const oldDepth =
        dom.informationDepth;


      dom.informationMessage.textContent =
        message;


      if (oldDepth) {

        dom.informationDepth =
          oldDepth;


        dom.informationMessage.appendChild(
          oldDepth
        );
      }
    }


    if (
      depth !==
        null &&
      dom.informationDepth
    ) {

      const numericDepth =
        Number(
          depth
        ) ||
        0;


      dom.informationDepth.textContent =
        ` • Depth ${
          numericDepth >
          0
            ? "+"
            : ""
        }${numericDepth}`;
    }


    return true;
  }


  /* =======================================================
     9. TOOL STATE
  ======================================================= */

  function getActiveTool() {

    return (
      getToolsApi()
        ?.getActiveTool?.() ||
      getToolbarApi()
        ?.getActiveTool?.() ||
      null
    );

  }


  function rememberEditorState() {

    modeState.previousTool =
      getActiveTool();


    if (dom.editorCanvas) {

      modeState.previousCursor =
        dom.editorCanvas.style.cursor ||
        null;
    }


    dispatch(
      "paintless3d:editor-state-captured",
      {
        tool:
          modeState.previousTool,

        cursor:
          modeState.previousCursor
      }
    );


    return true;
  }


  function restoreEditorState() {

    if (
      modeState.previousCursor !==
        null &&
      dom.editorCanvas
    ) {

      dom.editorCanvas.style.cursor =
        modeState.previousCursor;
    }


    dispatch(
      "paintless3d:editor-state-restored",
      {
        tool:
          modeState.previousTool,

        cursor:
          modeState.previousCursor
      }
    );


    return true;
  }


  /* =======================================================
     10. LAYER INFORMATION
  ======================================================= */

  function getActiveLayer() {

    return (
      getToolCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function getLayerDepth(
    layer =
      getActiveLayer()
  ) {

    if (!layer) {

      return 0;
    }


    const value =
      Number(
        layer.depth3d ??
        layer.depth ??
        0
      );


    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }


  function updateActiveLayerInformation() {

    const layer =
      getActiveLayer();


    if (!layer) {

      setInformationMessage(
        "Select a layer to assign its 3D depth.",
        {
          title:
            "Paintless3D mode",

          icon:
            "👓",

          depth:
            0
        }
      );


      return false;
    }


    const layerName =
      layer.name ||
      layer.label ||
      "Active layer";


    const depth =
      getLayerDepth(
        layer
      );


    setInformationMessage(
      `${layerName} is ready for stereoscopic depth.`,
      {
        title:
          "Paintless3D mode",

        icon:
          "👓",

        depth
      }
    );


    dispatch(
      "paintless3d:active-layer-information",
      {
        layer,

        depth
      }
    );


    return true;
  }

     function prepareVisibleLayersFor3D() {

    const layersApi =
      getLayersApi();


    const layers =
      layersApi?.layers;


    if (
      !Array.isArray(layers) ||
      layers.length === 0
    ) {

      return false;

    }


    const visibleLayers =
      layers.filter(
        (layer) =>
          layer.visible &&
          layer.opacity > 0
      );


    if (visibleLayers.length === 0) {

      return false;

    }


    const hasExistingArrangement =
      visibleLayers.some(
        (layer) =>
          Boolean(layer.stereo3dEnabled) ||
          Number(layer.depth3d) !== 0
      );


    if (!hasExistingArrangement) {

      const minimumDepth =
        -300;


      const maximumDepth =
        300;


      const depthRange =
        maximumDepth -
        minimumDepth;


      const step =
        visibleLayers.length > 1
          ? depthRange /
            (visibleLayers.length - 1)
          : 0;


      visibleLayers.forEach(
        (layer, index) => {

          layer.stereo3dEnabled =
            true;


          layer.depth3d =
            visibleLayers.length === 1
              ? 0
              : Math.round(
                  minimumDepth +
                  step * index
                );

        }
      );

    } else {

      visibleLayers.forEach(
        (layer) => {

          layer.stereo3dEnabled =
            true;

        }
      );

    }


    layersApi.renderLayerList?.();


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:render-requested",
        {
          detail: {
            reason:
              "automatic-3d-layer-preparation"
          }
        }
      )
    );


    return true;

  }

  /* =======================================================
     11. ENTER AND EXIT MODE
  ======================================================= */

  async function enter3DMode({
    announce =
      true
  } = {}) {

    if (
      modeState.active &&
      !modeState.transitioning
    ) {

      return true;
    }


    modeState.transitioning =
      true;


    modeState.previousMode =
      modeState.currentMode;


    modeState.currentMode =
      "3d";


    rememberEditorState();


    document.documentElement
      .setAttribute(
        "data-paintless-mode",
        "3d"
      );


    document.body
      ?.classList.add(
        modeState.modeClass
      );


    modeState.active =
      true;


    modeState.activationCount +=
      1;


    modeState.enteredAt =
      performance.now();


    prepareVisibleLayersFor3D();

    updateActiveLayerInformation();

    showInformationStrip();


    if (announce) {

      sendStatusMessage(
        "Paintless3D workspace ready. Normal painting remains available."
      );
    }


    dispatch(
      "paintless3d:mode-entered",
      {
        mode:
          "3d",

        previousMode:
          modeState.previousMode,

        activationCount:
          modeState.activationCount,

        activeTool:
          getActiveTool(),

        activeLayer:
          getActiveLayer()
      }
    );


    window.setTimeout(
      () => {

        modeState.transitioning =
          false;


        dispatch(
          "paintless3d:editor-state-changed",
          {
            mode:
              "3d",

            active:
              true
          }
        );

      },
      modeState.transitionDuration
    );


    return true;
  }


  async function exit3DMode({
    announce =
      true
  } = {}) {

    if (
      !modeState.active &&
      !modeState.transitioning
    ) {

      return true;
    }


    modeState.transitioning =
      true;


    modeState.previousMode =
      modeState.currentMode;


    modeState.currentMode =
      "2d";


    document.documentElement
      .setAttribute(
        "data-paintless-mode",
        "2d"
      );


    document.body
      ?.classList.remove(
        modeState.modeClass,
      );


    modeState.active =
      false;


    hideInformationStrip();


    restoreEditorState();


    if (announce) {

      sendStatusMessage(
        "Normal Paintless 2D workspace restored."
      );
    }


    dispatch(
      "paintless3d:mode-exited",
      {
        mode:
          "2d",

        previousMode:
          modeState.previousMode,

        activeTool:
          getActiveTool(),

        activeLayer:
          getActiveLayer()
      }
    );


    window.setTimeout(
      () => {

        modeState.transitioning =
          false;


        dispatch(
          "paintless3d:editor-state-changed",
          {
            mode:
              "2d",

            active:
              false
          }
        );

      },
      modeState.transitionDuration
    );


    return true;
  }


  async function applyMode(
    mode,
    options = {}
  ) {

    const safeMode =
      normaliseMode(
        mode
      );


    return safeMode ===
      "3d"
      ? enter3DMode(
          options
        )
      : exit3DMode(
          options
        );
  }


  /* =======================================================
     12. MODULE READINESS
  ======================================================= */

  function updateModuleReadiness(
    moduleName,
    ready =
      true
  ) {

    const safeName =
      String(
        moduleName ||
        ""
      ).toLowerCase();


    if (
      safeName ===
      "depth"
    ) {

      modeState.depthControlsReady =
        Boolean(
          ready
        );
    }


    if (
      safeName ===
      "renderer"
    ) {

      modeState.rendererReady =
        Boolean(
          ready
        );
    }


    if (
      safeName ===
      "export"
    ) {

      modeState.exportReady =
        Boolean(
          ready
        );
    }


    dispatch(
      "paintless3d:mode-module-readiness-changed",
      {
        module:
          safeName,

        ready:
          Boolean(
            ready
          ),

        readiness:
          getReadiness()
      }
    );


    return true;
  }


  function getReadiness() {

    return {

      core:
        Boolean(
          get3DCore()
        ),

      mode:
        modeState.initialised,

      depth:
        modeState.depthControlsReady,

      renderer:
        modeState.rendererReady,


      export:
        modeState.exportReady
    };
  }


  /* =======================================================
     13. EVENT HANDLERS
  ======================================================= */

  function handleModeChanged(
    event
  ) {

    const mode =
      normaliseMode(
        event.detail?.mode
      );


    applyMode(
      mode
    );

  }


  function handleActiveLayerChanged() {

    if (
      modeState.active
    ) {

      updateActiveLayerInformation();
    }
  }


  function handleLayerDepthChanged(
    event
  ) {

    if (
      !modeState.active
    ) {

      return;
    }


    const activeLayer =
      getActiveLayer();


    const changedLayer =
      event.detail?.layer;


    if (
      changedLayer &&
      activeLayer &&
      changedLayer !==
        activeLayer
    ) {

      return;
    }


    updateActiveLayerInformation();
  }


  function handleModuleReady(
    event
  ) {

    const moduleName =
      event.detail?.name;


    if (!moduleName) {

      return;
    }


    updateModuleReadiness(
      moduleName,
      true
    );
  }


  function handleDocumentReset() {

    if (
      modeState.active
    ) {

      updateActiveLayerInformation();
    }
  }


  function handleKeyboard(
    event
  ) {

    if (
      !modeState.active ||
      isTypingElement() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {

      return;
    }


    if (
      event.key.toLowerCase() ===
      "d"
    ) {

      /*
       * D will later focus the active layer Depth control.
       */

      dispatch(
        "paintless3d:focus-depth-requested",
        {
          layer:
            getActiveLayer()
        }
      );


      sendStatusMessage(
        modeState.depthControlsReady
          ? "Depth control focused."
          : "Depth controls are the next Paintless3D module."
      );
    }

  }


  function connectEvents() {

    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      handleActiveLayerChanged
    );


    document.addEventListener(
      "paintless:layer-selected",
      handleActiveLayerChanged
    );


    document.addEventListener(
      "paintless3d:layer-depth-changed",
      handleLayerDepthChanged
    );


    document.addEventListener(
      "paintless3d:module-ready",
      handleModuleReady
    );


    document.addEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    window.addEventListener(
      "keydown",
      handleKeyboard
    );


    dom.closeInformationButton
      ?.addEventListener(
        "click",
        hideInformationStrip
      );

  }


  function disconnectEvents() {

    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );

    document.removeEventListener(
      "paintless:active-layer-changed",
      handleActiveLayerChanged
    );


    document.removeEventListener(
      "paintless:layer-selected",
      handleActiveLayerChanged
    );


    document.removeEventListener(
      "paintless3d:layer-depth-changed",
      handleLayerDepthChanged
    );


    document.removeEventListener(
      "paintless3d:module-ready",
      handleModuleReady
    );


    document.removeEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    window.removeEventListener(
      "keydown",
      handleKeyboard
    );

  }


  /* =======================================================
     14. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      modeState.initialised
    ) {

      return true;
    }


    collectDomReferences();


    installStyles();


    ensureInformationStrip();


    connectEvents();


    modeState.initialised =
      true;


    modeState.destroyed =
      false;


    const startingMode =
      normaliseMode(
        paintless3d.getMode?.()
      );


    await applyMode(
      startingMode,
      {
        announce:
          false
      }
    );


    dispatch(
      "paintless3d:mode-ready",
      {
        mode:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Mode ready.",
      [
        "color:#ff5fb7",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:1px 0 #25e6ff"
      ].join(";")
    );


    return true;
  }


  /* =======================================================
     15. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    await exit3DMode({
      announce:
        false
    });


    dom.informationStrip
      ?.remove();


    dom.styles
      ?.remove();


    modeState.initialised =
      false;


    modeState.destroyed =
      true;


    modeState.informationStripInstalled =
      false;


    modeState.stylesInstalled =
      false;


    dispatch(
      "paintless3d:mode-destroyed"
    );


    return true;
  }


  /* =======================================================
     16. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      modeState,

    dom,


    initialise,

    destroy,


    applyMode,

    enter3DMode,

    exit3DMode,


    showInformationStrip,

    hideInformationStrip,

    setInformationMessage,

    updateActiveLayerInformation,


    rememberEditorState,

    restoreEditorState,

    updateModuleReadiness,

    getReadiness,


    getActiveLayer,

    getLayerDepth,


    isActive() {

      return modeState.active;
    },


    isTransitioning() {

      return modeState.transitioning;
    },


    getMode() {

      return modeState.currentMode;
    },


    getPreviousTool() {

      return modeState.previousTool;
    }

  };


  window.Paintless3DMode =
    publicApi;


  /* =======================================================
     17. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "mode",
    {

      label:
        "Paintless3D Mode",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
