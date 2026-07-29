"use strict";

/* =========================================================
   PAINTLESS3D
   LAYER DEPTH MODULE — v0.1

   File:
   js/paintless3d/depth.js

   Features:
   - Gives every Paintless layer a stereoscopic depth value
   - Depth range: -100 to +100
   - Negative values appear behind the screen
   - Positive values appear in front of the screen
   - Zero sits on the screen plane
   - Adds a live depth control beneath the Layers panel
   - Slider, number input and preset buttons
   - Updates immediately when the active layer changes
   - Persists depth directly on each layer as layer.depth3d
   - Dispatches renderer-ready events whenever depth changes
   - Resets safely when documents or layers change
   - Keyboard shortcut D focuses the depth slider
   - No index.html or CSS editing required

   The actual red/cyan movement will be performed by
   renderer.js, which listens for:

   paintless3d:layer-depth-changed
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
      "Paintless3D Depth could not start because paintless3d.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. DEPTH STATE
  ======================================================= */

  const depthState = {

    initialised:
      false,

    destroyed:
      false,

    active:
      false,

    minimum:
      -100,

    maximum:
      100,

    defaultDepth:
      0,

    step:
      1,

    currentLayer:
      null,

    currentDepth:
      0,

    updatingControls:
      false,

    controlInstalled:
      false,

    stylesInstalled:
      false,

    presets: {

      farBehind:
        -60,

      behind:
        -25,

      screen:
        0,

      forward:
        25,

      farForward:
        60

    }

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    sidebar:
      null,

    layersPanel:
      null,

    layersList:
      null,

    control:
      null,

    heading:
      null,

    layerName:
      null,

    slider:
      null,

    numberInput:
      null,

    valueBadge:
      null,

    directionLabel:
      null,

    resetButton:
      null,

    presetButtons:
      [],

    styles:
      null

  };


  /* =======================================================
     4. SHARED APIS
  ======================================================= */

  function getModeApi() {

    return (
      window.Paintless3DMode ||
      paintless3d.getModule?.(
        "mode"
      )?.api ||
      null
    );

  }


  function getCoreApi() {

    return (
      window.Paintless3DCore ||
      paintless3d.getModule?.(
        "core"
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


  function getToolCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  /* =======================================================
     5. GENERAL HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum =
      depthState.minimum,
    maximum =
      depthState.maximum
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

      return depthState.defaultDepth;

    }


    return Math.min(
      maximum,
      Math.max(
        minimum,
        numericValue
      )
    );

  }


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


      return;

    }


    dispatch(
      "paintless:status-message",
      {
        message
      }
    );

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


  function getLayerName(
    layer
  ) {

    return (
      layer?.name ||
      layer?.label ||
      "Active layer"
    );

  }


  function getDepthDirection(
    depth
  ) {

    const safeDepth =
      clamp(
        depth
      );


    if (
      safeDepth <=
      -60
    ) {

      return "Far behind";

    }


    if (
      safeDepth <
      0
    ) {

      return "Behind screen";

    }


    if (
      safeDepth ===
      0
    ) {

      return "Screen plane";

    }


    if (
      safeDepth >=
      60
    ) {

      return "Far forward";

    }


    return "In front";

  }


  function formatDepth(
    depth
  ) {

    const safeDepth =
      clamp(
        depth
      );


    return `${
      safeDepth >
      0
        ? "+"
        : ""
    }${safeDepth}`;

  }


  /* =======================================================
     6. LAYER ACCESS
  ======================================================= */

  function getActiveLayer() {

    return (
      getToolCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      getModeApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function getLayers() {

    const layersApi =
      getLayersApi();


    if (
      Array.isArray(
        layersApi?.layers
      )
    ) {

      return layersApi.layers;

    }


    if (
      typeof layersApi?.getLayers ===
      "function"
    ) {

      const layers =
        layersApi.getLayers();


      if (
        Array.isArray(
          layers
        )
      ) {

        return layers;

      }

    }


    return [];

  }


  function ensureLayerDepth(
    layer,
    defaultValue =
      depthState.defaultDepth
  ) {

    if (!layer) {

      return false;

    }


    const existingValue =
      Number(
        layer.depth3d
      );


    if (
      Number.isFinite(
        existingValue
      )
    ) {

      layer.depth3d =
        clamp(
          existingValue
        );


      return layer.depth3d;

    }


    layer.depth3d =
      clamp(
        defaultValue
      );


    return layer.depth3d;

  }


  function ensureAllLayerDepths() {

    const layers =
      getLayers();


    layers.forEach(
      (layer) => {

        ensureLayerDepth(
          layer
        );

      }
    );


    dispatch(
      "paintless3d:layer-depths-initialised",
      {
        layers
      }
    );


    return layers.length;

  }


  function getLayerDepth(
    layer =
      getActiveLayer()
  ) {

    if (!layer) {

      return depthState.defaultDepth;

    }


    return ensureLayerDepth(
      layer
    );

  }


  function setLayerDepth(
    layer,
    value,
    {
      announce =
        true,

      updateControls =
        true,

      source =
        "api"
    } = {}
  ) {

    if (!layer) {

      return false;

    }


    const previousDepth =
      getLayerDepth(
        layer
      );


    const nextDepth =
      clamp(
        Math.round(
          Number(
            value
          )
        )
      );


    layer.depth3d =
      nextDepth;


    if (
      layer ===
      getActiveLayer()
    ) {

      depthState.currentLayer =
        layer;


      depthState.currentDepth =
        nextDepth;


      if (updateControls) {

        updateDepthControls(
          layer
        );

      }

    }


    dispatch(
      "paintless3d:layer-depth-changed",
      {
        layer,

        depth:
          nextDepth,

        previousDepth,

        source,

        direction:
          getDepthDirection(
            nextDepth
          )
      }
    );


    dispatch(
      "paintless3d:render-requested",
      {
        reason:
          "layer-depth-changed",

        layer,

        depth:
          nextDepth
      }
    );


    if (announce) {

      sendStatusMessage(
        `${getLayerName(
          layer
        )} depth set to ${formatDepth(
          nextDepth
        )}.`
      );

    }


    return nextDepth;

  }


  function setActiveLayerDepth(
    value,
    options = {}
  ) {

    const layer =
      getActiveLayer();


    if (!layer) {

      sendStatusMessage(
        "Select a layer before changing its depth."
      );


      return false;

    }


    return setLayerDepth(
      layer,
      value,
      options
    );

  }


  function resetLayerDepth(
    layer =
      getActiveLayer(),
    {
      announce =
        true
    } = {}
  ) {

    if (!layer) {

      return false;

    }


    return setLayerDepth(
      layer,
      depthState.defaultDepth,
      {
        announce,

        source:
          "reset"
      }
    );

  }


  function offsetLayerDepth(
    layer,
    amount,
    {
      announce =
        true
    } = {}
  ) {

    if (!layer) {

      return false;

    }


    return setLayerDepth(
      layer,
      getLayerDepth(
        layer
      ) +
      Number(
        amount ||
        0
      ),
      {
        announce,

        source:
          "offset"
      }
    );

  }


  /* =======================================================
     7. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.sidebar =
      findFirst(
        [
          "#right-sidebar",
          ".right-sidebar",
          ".sidebar-right",
          ".properties-sidebar",
          "aside"
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


    dom.layersList =
      findFirst(
        [
          "#layers-list",
          ".layers-list",
          "[data-layers-list]"
        ]
      );

  }


  function getControlParent() {

    if (
      dom.layersPanel
    ) {

      return dom.layersPanel;

    }


    if (
      dom.layersList?.parentElement
    ) {

      return dom.layersList.parentElement;

    }


    return dom.sidebar;

  }


  /* =======================================================
     8. STYLES
  ======================================================= */

  function installStyles() {

    if (
      depthState.stylesInstalled ||
      document.getElementById(
        "paintless3d-depth-styles"
      )
    ) {

      depthState.stylesInstalled =
        true;


      return true;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-depth-styles";


    style.textContent = `
      .paintless3d-depth-control {
        display: none;
        margin: 11px 0 3px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 13px;
        background:
          radial-gradient(
            circle at 5% 30%,
            rgba(255, 49, 92, 0.11),
            transparent 35%
          ),
          radial-gradient(
            circle at 95% 30%,
            rgba(37, 230, 255, 0.11),
            transparent 35%
          ),
          linear-gradient(
            145deg,
            rgba(29, 18, 45, 0.93),
            rgba(11, 7, 18, 0.95)
          );
        box-shadow:
          inset 0 0 0 1px rgba(168, 76, 255, 0.06);
      }

      body.paintless3d-editor-active
      .paintless3d-depth-control {
        display: block;
      }

      .paintless3d-depth-heading-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
      }

      .paintless3d-depth-heading-copy {
        min-width: 0;
      }

      .paintless3d-depth-heading {
        display: block;
        color: #ffffff;
        font:
          900 11px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        text-shadow:
          -1px 0 rgba(255, 49, 92, 0.42),
          1px 0 rgba(37, 230, 255, 0.42);
      }

      .paintless3d-depth-layer-name {
        display: block;
        max-width: 175px;
        margin-top: 3px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.52);
        font:
          500 10px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless3d-depth-value {
        display: inline-grid;
        place-items: center;
        min-width: 46px;
        height: 29px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.13),
            rgba(37, 230, 255, 0.13)
          );
        font:
          900 11px/1
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-depth-direction {
        display: block;
        margin-top: 10px;
        color: rgba(255, 255, 255, 0.52);
        font:
          700 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        text-align: center;
        text-transform: uppercase;
      }

      .paintless3d-depth-track-wrap {
        position: relative;
        margin-top: 8px;
        padding: 4px 0;
      }

      .paintless3d-depth-track-wrap::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 2px;
        bottom: 2px;
        width: 1px;
        background: rgba(255, 255, 255, 0.29);
        pointer-events: none;
        z-index: 1;
      }

      .paintless3d-depth-slider {
        width: 100%;
        height: 7px;
        margin: 0;
        appearance: none;
        border-radius: 999px;
        outline: none;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.92) 0%,
            rgba(168, 76, 255, 0.88) 48%,
            rgba(255, 255, 255, 0.78) 50%,
            rgba(92, 154, 255, 0.9) 52%,
            rgba(37, 230, 255, 0.94) 100%
          );
        box-shadow:
          inset 0 1px 4px rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }

      .paintless3d-depth-slider::-webkit-slider-thumb {
        width: 18px;
        height: 18px;
        appearance: none;
        border: 2px solid #ffffff;
        border-radius: 50%;
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #a84cff,
            #25e6ff
          );
        box-shadow:
          0 2px 7px rgba(0, 0, 0, 0.55);
        cursor: grab;
      }

      .paintless3d-depth-slider::-webkit-slider-thumb:active {
        cursor: grabbing;
      }

      .paintless3d-depth-slider::-moz-range-thumb {
        width: 15px;
        height: 15px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #a84cff,
            #25e6ff
          );
        box-shadow:
          0 2px 7px rgba(0, 0, 0, 0.55);
        cursor: grab;
      }

      .paintless3d-depth-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        color: rgba(255, 255, 255, 0.36);
        font:
          700 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      .paintless3d-depth-input-row {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          auto;
        gap: 7px;
        margin-top: 10px;
      }

      .paintless3d-depth-number {
        width: 100%;
        min-width: 0;
        height: 32px;
        padding: 0 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.045);
        font:
          700 11px/1
          "Segoe UI",
          Arial,
          sans-serif;
        outline: none;
      }

      .paintless3d-depth-number:focus {
        border-color: rgba(37, 230, 255, 0.65);
        box-shadow: 0 0 0 2px rgba(37, 230, 255, 0.1);
      }

      .paintless3d-depth-reset {
        min-width: 59px;
        height: 32px;
        padding: 0 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.045);
        font:
          800 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .paintless3d-depth-reset:hover {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.08);
      }

      .paintless3d-depth-presets {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 5px;
        margin-top: 10px;
      }

      .paintless3d-depth-preset {
        min-width: 0;
        height: 28px;
        padding: 0 3px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.63);
        background: rgba(255, 255, 255, 0.035);
        font:
          800 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        cursor: pointer;
      }

      .paintless3d-depth-preset:hover {
        color: #ffffff;
        border-color: rgba(168, 76, 255, 0.55);
        background: rgba(168, 76, 255, 0.11);
      }

      .paintless3d-depth-preset.is-active {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.58);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.1),
            rgba(37, 230, 255, 0.13)
          );
      }

      .paintless3d-depth-control.is-disabled {
        opacity: 0.48;
      }

      .paintless3d-depth-control.is-disabled
      input,
      .paintless3d-depth-control.is-disabled
      button {
        pointer-events: none;
      }

      @media (max-width: 620px) {
        .paintless3d-depth-control {
          padding: 10px;
        }

        .paintless3d-depth-presets {
          gap: 4px;
        }

        .paintless3d-depth-preset {
          font-size: 7px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    depthState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. CONTROL CREATION
  ======================================================= */

  function createPresetButton(
    label,
    value
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "paintless3d-depth-preset";


    button.textContent =
      label;


    button.dataset.depth =
      String(
        value
      );


    button.title =
      `Set depth to ${formatDepth(
        value
      )}`;


    return button;

  }


  function createDepthControl() {

    const control =
      document.createElement(
        "section"
      );


    control.id =
      "paintless3d-depth-control";


    control.className =
      "paintless3d-depth-control";


    const headingRow =
      document.createElement(
        "div"
      );


    headingRow.className =
      "paintless3d-depth-heading-row";


    const headingCopy =
      document.createElement(
        "span"
      );


    headingCopy.className =
      "paintless3d-depth-heading-copy";


    const heading =
      document.createElement(
        "strong"
      );


    heading.className =
      "paintless3d-depth-heading";


    heading.textContent =
      "Layer Depth";


    const layerName =
      document.createElement(
        "span"
      );


    layerName.className =
      "paintless3d-depth-layer-name";


    layerName.textContent =
      "No layer selected";


    headingCopy.append(
      heading,
      layerName
    );


    const valueBadge =
      document.createElement(
        "span"
      );


    valueBadge.className =
      "paintless3d-depth-value";


    valueBadge.textContent =
      "0";


    headingRow.append(
      headingCopy,
      valueBadge
    );


    const directionLabel =
      document.createElement(
        "span"
      );


    directionLabel.className =
      "paintless3d-depth-direction";


    directionLabel.textContent =
      "Screen plane";


    const trackWrap =
      document.createElement(
        "div"
      );


    trackWrap.className =
      "paintless3d-depth-track-wrap";


    const slider =
      document.createElement(
        "input"
      );


    slider.type =
      "range";


    slider.id =
      "paintless3d-depth-slider";


    slider.className =
      "paintless3d-depth-slider";


    slider.min =
      String(
        depthState.minimum
      );


    slider.max =
      String(
        depthState.maximum
      );


    slider.step =
      String(
        depthState.step
      );


    slider.value =
      String(
        depthState.defaultDepth
      );


    slider.setAttribute(
      "aria-label",
      "Active layer stereoscopic depth"
    );


    trackWrap.appendChild(
      slider
    );


    const labels =
      document.createElement(
        "div"
      );


    labels.className =
      "paintless3d-depth-labels";


    const behindLabel =
      document.createElement(
        "span"
      );


    behindLabel.textContent =
      "Behind";


    const screenLabel =
      document.createElement(
        "span"
      );


    screenLabel.textContent =
      "Screen";


    const forwardLabel =
      document.createElement(
        "span"
      );


    forwardLabel.textContent =
      "Forward";


    labels.append(
      behindLabel,
      screenLabel,
      forwardLabel
    );


    const inputRow =
      document.createElement(
        "div"
      );


    inputRow.className =
      "paintless3d-depth-input-row";


    const numberInput =
      document.createElement(
        "input"
      );


    numberInput.type =
      "number";


    numberInput.className =
      "paintless3d-depth-number";


    numberInput.min =
      String(
        depthState.minimum
      );


    numberInput.max =
      String(
        depthState.maximum
      );


    numberInput.step =
      String(
        depthState.step
      );


    numberInput.value =
      String(
        depthState.defaultDepth
      );


    numberInput.setAttribute(
      "aria-label",
      "Active layer depth value"
    );


    const resetButton =
      document.createElement(
        "button"
      );


    resetButton.type =
      "button";


    resetButton.className =
      "paintless3d-depth-reset";


    resetButton.textContent =
      "Reset";


    inputRow.append(
      numberInput,
      resetButton
    );


    const presets =
      document.createElement(
        "div"
      );


    presets.className =
      "paintless3d-depth-presets";


    const presetDefinitions = [

      [
        "Far −",
        depthState.presets.farBehind
      ],

      [
        "Back",
        depthState.presets.behind
      ],

      [
        "Screen",
        depthState.presets.screen
      ],

      [
        "Front",
        depthState.presets.forward
      ],

      [
        "Far +",
        depthState.presets.farForward
      ]

    ];


    presetDefinitions.forEach(
      (
        [
          label,
          value
        ]
      ) => {

        presets.appendChild(
          createPresetButton(
            label,
            value
          )
        );

      }
    );


    control.append(
      headingRow,
      directionLabel,
      trackWrap,
      labels,
      inputRow,
      presets
    );


    dom.control =
      control;


    dom.heading =
      heading;


    dom.layerName =
      layerName;


    dom.slider =
      slider;


    dom.numberInput =
      numberInput;


    dom.valueBadge =
      valueBadge;


    dom.directionLabel =
      directionLabel;


    dom.resetButton =
      resetButton;


    dom.presetButtons =
      Array.from(
        presets.querySelectorAll(
          ".paintless3d-depth-preset"
        )
      );


    return control;

  }


  function installDepthControl() {

    const existingControl =
      document.getElementById(
        "paintless3d-depth-control"
      );


    if (existingControl) {

      dom.control =
        existingControl;


      dom.heading =
        existingControl.querySelector(
          ".paintless3d-depth-heading"
        );


      dom.layerName =
        existingControl.querySelector(
          ".paintless3d-depth-layer-name"
        );


      dom.slider =
        existingControl.querySelector(
          ".paintless3d-depth-slider"
        );


      dom.numberInput =
        existingControl.querySelector(
          ".paintless3d-depth-number"
        );


      dom.valueBadge =
        existingControl.querySelector(
          ".paintless3d-depth-value"
        );


      dom.directionLabel =
        existingControl.querySelector(
          ".paintless3d-depth-direction"
        );


      dom.resetButton =
        existingControl.querySelector(
          ".paintless3d-depth-reset"
        );


      dom.presetButtons =
        Array.from(
          existingControl.querySelectorAll(
            ".paintless3d-depth-preset"
          )
        );


      depthState.controlInstalled =
        true;


      return true;

    }


    const parent =
      getControlParent();


    if (!parent) {

      return false;

    }


    const control =
      createDepthControl();


    parent.appendChild(
      control
    );


    depthState.controlInstalled =
      true;


    return true;

  }


  /* =======================================================
     10. CONTROL DISPLAY
  ======================================================= */

  function updatePresetButtons(
    depth
  ) {

    dom.presetButtons.forEach(
      (button) => {

        const presetDepth =
          Number(
            button.dataset.depth
          );


        button.classList.toggle(
          "is-active",
          presetDepth ===
            depth
        );

      }
    );

  }


  function updateDepthControls(
    layer =
      getActiveLayer()
  ) {

    if (
      depthState.updatingControls
    ) {

      return false;

    }


    depthState.updatingControls =
      true;


    try {

      const hasLayer =
        Boolean(
          layer
        );


      const depth =
        hasLayer
          ? getLayerDepth(
              layer
            )
          : depthState.defaultDepth;


      depthState.currentLayer =
        layer;


      depthState.currentDepth =
        depth;


      dom.control
        ?.classList.toggle(
          "is-disabled",
          !hasLayer
        );


      if (dom.layerName) {

        dom.layerName.textContent =
          hasLayer
            ? getLayerName(
                layer
              )
            : "No layer selected";

      }


      if (dom.slider) {

        dom.slider.disabled =
          !hasLayer;


        dom.slider.value =
          String(
            depth
          );

      }


      if (dom.numberInput) {

        dom.numberInput.disabled =
          !hasLayer;


        dom.numberInput.value =
          String(
            depth
          );

      }


      if (dom.resetButton) {

        dom.resetButton.disabled =
          !hasLayer;

      }


      dom.presetButtons.forEach(
        (button) => {

          button.disabled =
            !hasLayer;

        }
      );


      if (dom.valueBadge) {

        dom.valueBadge.textContent =
          formatDepth(
            depth
          );

      }


      if (dom.directionLabel) {

        dom.directionLabel.textContent =
          getDepthDirection(
            depth
          );

      }


      updatePresetButtons(
        depth
      );


      getModeApi()
        ?.setInformationMessage?.(
          hasLayer
            ? `${getLayerName(
                layer
              )} is ready for stereoscopic depth.`
            : "Select a layer to assign its 3D depth.",
          {
            title:
              "Paintless3D mode",

            icon:
              "👓",

            depth
          }
        );


      dispatch(
        "paintless3d:depth-controls-updated",
        {
          layer,

          depth,

          hasLayer
        }
      );


      return true;

    } finally {

      depthState.updatingControls =
        false;

    }

  }


  function showDepthControl() {

    depthState.active =
      true;


    dom.control
      ?.classList.add(
        "is-visible"
      );


    updateDepthControls();


    return true;

  }


  function hideDepthControl() {

    depthState.active =
      false;


    dom.control
      ?.classList.remove(
        "is-visible"
      );


    return true;

  }


  function focusDepthControl() {

    if (
      !paintless3d.is3DMode?.()
    ) {

      getCoreApi()
        ?.requestMode?.(
          "3d"
        );

    }


    showDepthControl();


    dom.slider
      ?.focus();


    return true;

  }


  /* =======================================================
     11. CONTROL EVENTS
  ======================================================= */

  function handleSliderInput(
    event
  ) {

    if (
      depthState.updatingControls
    ) {

      return;

    }


    setActiveLayerDepth(
      event.target.value,
      {
        announce:
          false,

        source:
          "slider"
      }
    );

  }


  function handleSliderChange(
    event
  ) {

    setActiveLayerDepth(
      event.target.value,
      {
        announce:
          true,

        source:
          "slider"
      }
    );

  }


  function handleNumberInput(
    event
  ) {

    if (
      event.target.value ===
      ""
    ) {

      return;

    }


    setActiveLayerDepth(
      event.target.value,
      {
        announce:
          false,

        source:
          "number"
      }
    );

  }


  function handleNumberChange(
    event
  ) {

    const depth =
      setActiveLayerDepth(
        event.target.value,
        {
          announce:
            true,

          source:
            "number"
        }
      );


    if (
      depth !==
      false
    ) {

      event.target.value =
        String(
          depth
        );

    }

  }


  function handlePresetClick(
    event
  ) {

    const value =
      Number(
        event.currentTarget
          .dataset.depth
      );


    setActiveLayerDepth(
      value,
      {
        announce:
          true,

        source:
          "preset"
      }
    );

  }


  function handleResetClick() {

    resetLayerDepth(
      getActiveLayer(),
      {
        announce:
          true
      }
    );

  }


  /* =======================================================
     12. DOCUMENT EVENTS
  ======================================================= */

  function handleModeChanged(
    event
  ) {

    const mode =
      event.detail?.mode;


    if (
      mode ===
      "3d"
    ) {

      showDepthControl();

    } else {

      hideDepthControl();

    }

  }


  function handleActiveLayerChanged() {

    const layer =
      getActiveLayer();


    if (layer) {

      ensureLayerDepth(
        layer
      );

    }


    updateDepthControls(
      layer
    );

  }


  function handleLayerCreated(
    event
  ) {

    const layer =
      event.detail?.layer ||
      getActiveLayer();


    if (layer) {

      ensureLayerDepth(
        layer
      );

    }


    updateDepthControls();

  }


  function handleLayerDuplicated(
    event
  ) {

    const sourceLayer =
      event.detail?.sourceLayer ||
      event.detail?.source ||
      null;


    const duplicatedLayer =
      event.detail?.layer ||
      event.detail?.duplicatedLayer ||
      getActiveLayer();


    if (!duplicatedLayer) {

      return;

    }


    const inheritedDepth =
      sourceLayer
        ? getLayerDepth(
            sourceLayer
          )
        : depthState.defaultDepth;


    ensureLayerDepth(
      duplicatedLayer,
      inheritedDepth
    );


    duplicatedLayer.depth3d =
      inheritedDepth;


    updateDepthControls(
      duplicatedLayer
    );


    dispatch(
      "paintless3d:layer-depth-changed",
      {
        layer:
          duplicatedLayer,

        depth:
          inheritedDepth,

        previousDepth:
          depthState.defaultDepth,

        source:
          "duplicate"
      }
    );

  }


  function handleDocumentReset() {

    window.setTimeout(
      () => {

        ensureAllLayerDepths();

        updateDepthControls();

      },
      0
    );

  }


  function handleHistoryRestored() {

    ensureAllLayerDepths();

    updateDepthControls();


    dispatch(
      "paintless3d:render-requested",
      {
        reason:
          "history-restored"
      }
    );

  }


  function handleFocusDepthRequested() {

    focusDepthControl();

  }


  function handleKeyboard(
    event
  ) {

    if (
      !paintless3d.is3DMode?.() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {

      return;

    }


    const activeElement =
      document.activeElement;


    if (
      activeElement?.tagName ===
        "INPUT" ||
      activeElement?.tagName ===
        "TEXTAREA" ||
      activeElement?.tagName ===
        "SELECT" ||
      activeElement?.isContentEditable
    ) {

      return;

    }


    if (
      event.key.toLowerCase() ===
      "d"
    ) {

      event.preventDefault();


      focusDepthControl();


      return;

    }


    if (
      event.key ===
      "ArrowUp"
    ) {

      event.preventDefault();


      offsetLayerDepth(
        getActiveLayer(),
        event.shiftKey
          ? 10
          : 1,
        {
          announce:
            false
        }
      );

    }


    if (
      event.key ===
      "ArrowDown"
    ) {

      event.preventDefault();


      offsetLayerDepth(
        getActiveLayer(),
        event.shiftKey
          ? -10
          : -1,
        {
          announce:
            false
        }
      );

    }

  }


  function connectEvents() {

    dom.slider
      ?.addEventListener(
        "input",
        handleSliderInput
      );


    dom.slider
      ?.addEventListener(
        "change",
        handleSliderChange
      );


    dom.numberInput
      ?.addEventListener(
        "input",
        handleNumberInput
      );


    dom.numberInput
      ?.addEventListener(
        "change",
        handleNumberChange
      );


    dom.resetButton
      ?.addEventListener(
        "click",
        handleResetClick
      );


    dom.presetButtons.forEach(
      (button) => {

        button.addEventListener(
          "click",
          handlePresetClick
        );

      }
    );


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
      "paintless:layer-created",
      handleLayerCreated
    );


    document.addEventListener(
      "paintless:layer-added",
      handleLayerCreated
    );


    document.addEventListener(
      "paintless:layer-duplicated",
      handleLayerDuplicated
    );


    document.addEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.addEventListener(
      "paintless:history-restored",
      handleHistoryRestored
    );


    document.addEventListener(
      "paintless3d:focus-depth-requested",
      handleFocusDepthRequested
    );


    window.addEventListener(
      "keydown",
      handleKeyboard
    );

  }


  function disconnectEvents() {

    dom.slider
      ?.removeEventListener(
        "input",
        handleSliderInput
      );


    dom.slider
      ?.removeEventListener(
        "change",
        handleSliderChange
      );


    dom.numberInput
      ?.removeEventListener(
        "input",
        handleNumberInput
      );


    dom.numberInput
      ?.removeEventListener(
        "change",
        handleNumberChange
      );


    dom.resetButton
      ?.removeEventListener(
        "click",
        handleResetClick
      );


    dom.presetButtons.forEach(
      (button) => {

        button.removeEventListener(
          "click",
          handlePresetClick
        );

      }
    );


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
      "paintless:layer-created",
      handleLayerCreated
    );


    document.removeEventListener(
      "paintless:layer-added",
      handleLayerCreated
    );


    document.removeEventListener(
      "paintless:layer-duplicated",
      handleLayerDuplicated
    );


    document.removeEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.removeEventListener(
      "paintless:history-restored",
      handleHistoryRestored
    );


    document.removeEventListener(
      "paintless3d:focus-depth-requested",
      handleFocusDepthRequested
    );


    window.removeEventListener(
      "keydown",
      handleKeyboard
    );

  }


  /* =======================================================
     13. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      depthState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    const installed =
      installDepthControl();


    if (!installed) {

      throw new Error(
        "Paintless3D Depth could not find the Layers panel."
      );

    }


    connectEvents();


    ensureAllLayerDepths();


    updateDepthControls();


    depthState.active =
      paintless3d.is3DMode?.() ||
      false;


    depthState.initialised =
      true;


    depthState.destroyed =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "depth",
        true
      );


    dispatch(
      "paintless3d:depth-ready",
      {
        depth:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Depth ready.",
      [
        "color:#25e6ff",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-1px 0 #ff315c"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     14. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    dom.control
      ?.remove();


    dom.styles
      ?.remove();


    depthState.initialised =
      false;


    depthState.destroyed =
      true;


    depthState.active =
      false;


    depthState.controlInstalled =
      false;


    depthState.stylesInstalled =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "depth",
        false
      );


    dispatch(
      "paintless3d:depth-destroyed"
    );


    return true;

  }


  /* =======================================================
     15. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      depthState,

    dom,


    initialise,

    destroy,


    ensureLayerDepth,

    ensureAllLayerDepths,


    getLayerDepth,

    setLayerDepth,

    setActiveLayerDepth,

    resetLayerDepth,

    offsetLayerDepth,


    updateDepthControls,

    showDepthControl,

    hideDepthControl,

    focusDepthControl,


    getDepthDirection,

    formatDepth,


    getRange() {

      return {

        minimum:
          depthState.minimum,

        maximum:
          depthState.maximum,

        step:
          depthState.step,

        defaultDepth:
          depthState.defaultDepth
      };

    },


    getActiveLayerDepth() {

      return getLayerDepth(
        getActiveLayer()
      );

    },


    getAllLayerDepths() {

      return getLayers().map(
        (layer) => ({

          layer,

          name:
            getLayerName(
              layer
            ),

          depth:
            getLayerDepth(
              layer
            )

        })
      );

    },


    isInitialised() {

      return depthState.initialised;

    }

  };


  window.Paintless3DDepth =
    publicApi;


  /* =======================================================
     16. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "depth",
    {

      label:
        "Paintless3D Layer Depth",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
