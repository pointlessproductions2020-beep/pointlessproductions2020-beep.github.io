"use strict";

/* =========================================================
   PAINTLESS3D
   LIVE LAYER DEPTH MODULE — v0.2

   File:
   js/paintless3d/depth.js

   New behaviour:
   - Uses the real Paintless layer properties:
       layer.stereo3dEnabled
       layer.depth3d
   - The depth control is disabled until the active layer's
     red/blue 3D toggle is enabled
   - Enabling a layer sends it to depth -100 by default
   - Depth changes update the live renderer immediately
   - Existing layers, duplicated layers and restored layers
     retain their depth values
   - Uses the new PaintlessLayers 3D API directly
========================================================= */

(() => {

  /* =======================================================
     1. SYSTEM CHECK
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
     2. STATE
  ======================================================= */

  const depthState = {

    initialised:
      false,

    destroyed:
      false,

    active:
      false,

    minimum:
      -300,

    maximum:
      300,

    defaultDepth:
      0,

    activationDepth:
      -300,

    step:
      1,

    currentLayer:
      null,

    currentDepth:
      0,

    currentStereoEnabled:
      false,

    updatingControls:
      false,

    controlInstalled:
      false,

    stylesInstalled:
      false,

    presets: {

      deepest:
        -300,

      behind:
        -150,

      screen:
        0,

      forward:
        120,

      closest:
        250

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

    stereoStatus:
      null,

    stereoToggleButton:
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

    disabledMessage:
      null,

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


  function getRendererApi() {

    return (
      window.Paintless3DRenderer ||
      paintless3d.getModule?.(
        "renderer"
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


  function getDepthDirection(
    depth
  ) {

    const safeDepth =
      clamp(
        depth
      );


    if (
      safeDepth <=
      -90
    ) {

      return "Deep inside screen";

    }


    if (
      safeDepth <=
      -50
    ) {

      return "Far behind screen";

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
      75
    ) {

      return "Closest forward";

    }


    if (
      safeDepth >=
      40
    ) {

      return "Far in front";

    }


    return "In front of screen";

  }


  /* =======================================================
     6. LAYER ACCESS
  ======================================================= */

  function getActiveLayer() {

    return (
      getLayersApi()
        ?.getActiveLayer?.() ||
      getModeApi()
        ?.getActiveLayer?.() ||
      getToolCore()
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


  function layerStereoIsEnabled(
    layer =
      getActiveLayer()
  ) {

    return Boolean(
      layer?.stereo3dEnabled
    );

  }


  function ensureLayer3DProperties(
    layer
  ) {

    if (!layer) {

      return false;

    }


    if (
      typeof layer.stereo3dEnabled !==
      "boolean"
    ) {

      layer.stereo3dEnabled =
        false;

    }


    if (
      !Number.isFinite(
        Number(
          layer.depth3d
        )
      )
    ) {

      layer.depth3d =
        depthState.defaultDepth;

    }


    layer.depth3d =
      clamp(
        layer.depth3d
      );


    return true;

  }


  function ensureAllLayer3DProperties() {

    const layers =
      getLayers();


    layers.forEach(
      (layer) => {

        ensureLayer3DProperties(
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


    ensureLayer3DProperties(
      layer
    );


    return clamp(
      layer.depth3d
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
        "depth-module"
    } = {}
  ) {

    if (!layer) {

      return false;

    }


    ensureLayer3DProperties(
      layer
    );


    if (
      !layerStereoIsEnabled(
        layer
      )
    ) {

      if (announce) {

        sendStatusMessage(
          `Enable 3D for ${getLayerName(
            layer
          )} before changing its depth.`
        );

      }


      updateDepthControls(
        layer
      );


      return false;

    }


    const nextDepth =
      clamp(
        Math.round(
          Number(
            value
          )
        )
      );


    const layersApi =
      getLayersApi();


    let result;


    if (
      typeof layersApi
        ?.setLayerDepth3D ===
      "function"
    ) {

      result =
        layersApi.setLayerDepth3D(
          layer.id,
          nextDepth
        );

    } else {

      const previousDepth =
        getLayerDepth(
          layer
        );


      layer.depth3d =
        nextDepth;


      dispatch(
        "paintless3d:layer-depth-changed",
        {
          layer,

          depth:
            nextDepth,

          previousDepth,

          source
        }
      );


      dispatch(
        "paintless3d:render-requested",
        {
          reason:
            "layer-depth-changed",

          layer
        }
      );


      result =
        nextDepth;

    }


    depthState.currentLayer =
      layer;


    depthState.currentDepth =
      nextDepth;


    depthState.currentStereoEnabled =
      true;


    if (updateControls) {

      updateDepthControls(
        layer
      );

    }


    getRendererApi()
      ?.requestRender?.(
        "depth-control-changed"
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


    return result;

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


  function setLayerStereoEnabled(
    layer,
    enabled,
    {
      announce =
        true
    } = {}
  ) {

    if (!layer) {

      return false;

    }


    ensureLayer3DProperties(
      layer
    );


    const layersApi =
      getLayersApi();


    const nextEnabled =
      Boolean(
        enabled
      );


    let result;


    if (
      typeof layersApi
        ?.setLayerStereo3D ===
      "function"
    ) {

      result =
        layersApi.setLayerStereo3D(
          layer.id,
          nextEnabled,
          {
            initialDepth:
              depthState.activationDepth
          }
        );

    } else {

      const wasEnabled =
        layer.stereo3dEnabled;


      layer.stereo3dEnabled =
        nextEnabled;


      if (
        nextEnabled &&
        !wasEnabled &&
        Number(
          layer.depth3d
        ) ===
          0
      ) {

        layer.depth3d =
          depthState.activationDepth;

      }


      dispatch(
        "paintless3d:layer-stereo-changed",
        {
          layer,

          enabled:
            nextEnabled,

          depth:
            layer.depth3d
        }
      );


      dispatch(
        "paintless3d:render-requested",
        {
          reason:
            "layer-stereo-changed",

          layer
        }
      );


      result =
        true;

    }


    updateDepthControls(
      layer
    );


    getRendererApi()
      ?.requestRender?.(
        "layer-stereo-toggle"
      );


    if (announce) {

      sendStatusMessage(
        nextEnabled
          ? `${getLayerName(
              layer
            )} is now in 3D at depth ${formatDepth(
              getLayerDepth(
                layer
              )
            )}.`
          : `${getLayerName(
              layer
            )} returned to the flat screen plane.`
      );

    }


    return result;

  }


  function toggleActiveLayerStereo() {

    const layer =
      getActiveLayer();


    if (!layer) {

      sendStatusMessage(
        "Select a layer before enabling 3D."
      );


      return false;

    }


    return setLayerStereoEnabled(
      layer,
      !layerStereoIsEnabled(
        layer
      )
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
      depthState.activationDepth,
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
        false
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
      document.getElementById(
        "layer-list"
      ) ||
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

      return dom.layersList
        .parentElement;

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
        "paintless3d-live-depth-styles"
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
      "paintless3d-live-depth-styles";


    style.textContent = `
      .paintless3d-depth-control {
        display: none;
        margin: 11px 0 3px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 13px;
        color: #ffffff;
        background:
          radial-gradient(
            circle at 5% 20%,
            rgba(255, 49, 92, 0.12),
            transparent 36%
          ),
          radial-gradient(
            circle at 95% 20%,
            rgba(37, 230, 255, 0.12),
            transparent 36%
          ),
          linear-gradient(
            145deg,
            rgba(29, 18, 45, 0.94),
            rgba(11, 7, 18, 0.97)
          );
        box-shadow:
          inset 0 0 0 1px rgba(168, 76, 255, 0.06);
      }

      body.paintless3d-editor-active
      .paintless3d-depth-control,
      body.paintless-3d-mode
      .paintless3d-depth-control,
      html[data-paintless-mode="3d"]
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
        min-width: 48px;
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

      .paintless3d-depth-stereo-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
        margin-top: 10px;
        padding: 7px 8px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.03);
      }

      .paintless3d-depth-stereo-copy {
        min-width: 0;
      }

      .paintless3d-depth-stereo-title {
        display: block;
        color: rgba(255, 255, 255, 0.75);
        font:
          800 9px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .paintless3d-depth-stereo-status {
        display: block;
        margin-top: 3px;
        color: rgba(255, 255, 255, 0.4);
        font:
          500 8px/1.25
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-depth-stereo-toggle {
        position: relative;
        flex: 0 0 auto;
        width: 46px;
        height: 25px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        cursor: pointer;
      }

      .paintless3d-depth-stereo-toggle::before {
        content: "";
        position: absolute;
        left: 3px;
        top: 3px;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.42);
        transition:
          transform 150ms ease,
          background 150ms ease;
      }

      .paintless3d-depth-stereo-toggle.is-enabled {
        border-color: rgba(37, 230, 255, 0.5);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.22),
            rgba(37, 230, 255, 0.23)
          );
      }

      .paintless3d-depth-stereo-toggle.is-enabled::before {
        transform: translateX(21px);
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #25e6ff
          );
      }

      .paintless3d-depth-direction {
        display: block;
        margin-top: 10px;
        color: rgba(255, 255, 255, 0.53);
        font:
          800 9px/1
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
        top: 1px;
        bottom: 1px;
        width: 1px;
        background: rgba(255, 255, 255, 0.3);
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
            rgba(255, 49, 92, 0.94) 0%,
            rgba(168, 76, 255, 0.86) 48%,
            rgba(255, 255, 255, 0.78) 50%,
            rgba(92, 154, 255, 0.9) 52%,
            rgba(37, 230, 255, 0.95) 100%
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
        min-width: 67px;
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

      .paintless3d-depth-reset:hover:not(:disabled) {
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
        height: 29px;
        padding: 0 3px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.63);
        background: rgba(255, 255, 255, 0.035);
        font:
          800 7px/1
          "Segoe UI",
          Arial,
          sans-serif;
        cursor: pointer;
      }

      .paintless3d-depth-preset:hover:not(:disabled) {
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

      .paintless3d-depth-disabled-message {
        display: none;
        margin-top: 10px;
        padding: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.48);
        background: rgba(255, 255, 255, 0.025);
        font:
          600 9px/1.4
          "Segoe UI",
          Arial,
          sans-serif;
        text-align: center;
      }

      .paintless3d-depth-control.is-flat
      .paintless3d-depth-disabled-message {
        display: block;
      }

      .paintless3d-depth-control.is-flat
      .paintless3d-depth-direction,
      .paintless3d-depth-control.is-flat
      .paintless3d-depth-track-wrap,
      .paintless3d-depth-control.is-flat
      .paintless3d-depth-labels,
      .paintless3d-depth-control.is-flat
      .paintless3d-depth-input-row,
      .paintless3d-depth-control.is-flat
      .paintless3d-depth-presets {
        opacity: 0.32;
      }

      .paintless3d-depth-control.is-no-layer {
        opacity: 0.55;
      }

      .paintless3d-depth-control input:disabled,
      .paintless3d-depth-control button:disabled {
        cursor: not-allowed;
      }

      @media (max-width: 620px) {
        .paintless3d-depth-control {
          padding: 10px;
        }

        .paintless3d-depth-presets {
          gap: 4px;
        }

        .paintless3d-depth-preset {
          font-size: 6px;
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


    const stereoRow =
      document.createElement(
        "div"
      );


    stereoRow.className =
      "paintless3d-depth-stereo-row";


    const stereoCopy =
      document.createElement(
        "span"
      );


    stereoCopy.className =
      "paintless3d-depth-stereo-copy";


    const stereoTitle =
      document.createElement(
        "strong"
      );


    stereoTitle.className =
      "paintless3d-depth-stereo-title";


    stereoTitle.textContent =
      "3D Layer";


    const stereoStatus =
      document.createElement(
        "span"
      );


    stereoStatus.className =
      "paintless3d-depth-stereo-status";


    stereoStatus.textContent =
      "Flat on the screen plane";


    stereoCopy.append(
      stereoTitle,
      stereoStatus
    );


    const stereoToggleButton =
      document.createElement(
        "button"
      );


    stereoToggleButton.type =
      "button";


    stereoToggleButton.className =
      "paintless3d-depth-stereo-toggle";


    stereoToggleButton.setAttribute(
      "role",
      "switch"
    );


    stereoToggleButton.setAttribute(
      "aria-label",
      "Enable 3D depth for the active layer"
    );


    stereoToggleButton.setAttribute(
      "aria-checked",
      "false"
    );


    stereoRow.append(
      stereoCopy,
      stereoToggleButton
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


    const insideLabel =
      document.createElement(
        "span"
      );


    insideLabel.textContent =
      "Inside";


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
      insideLabel,
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
      "Deepest";


    resetButton.title =
      "Return this layer to the deepest behind-screen position";


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
        "Deep",
        depthState.presets.deepest
      ],

      [
        "Behind",
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
        "Closest",
        depthState.presets.closest
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


    const disabledMessage =
      document.createElement(
        "div"
      );


    disabledMessage.className =
      "paintless3d-depth-disabled-message";


    disabledMessage.textContent =
      "Enable this layer's red/blue 3D toggle to adjust its depth.";


    control.append(
      headingRow,
      stereoRow,
      directionLabel,
      trackWrap,
      labels,
      inputRow,
      presets,
      disabledMessage
    );


    dom.control =
      control;


    dom.heading =
      heading;


    dom.layerName =
      layerName;


    dom.stereoStatus =
      stereoStatus;


    dom.stereoToggleButton =
      stereoToggleButton;


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


    dom.disabledMessage =
      disabledMessage;


    return control;

  }


  function installDepthControl() {

    const existingControl =
      document.getElementById(
        "paintless3d-depth-control"
      );


    if (existingControl) {

      existingControl.remove();

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
    depth,
    enabled
  ) {

    dom.presetButtons.forEach(
      (button) => {

        const presetDepth =
          Number(
            button.dataset.depth
          );


        button.classList.toggle(
          "is-active",
          enabled &&
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


      if (layer) {

        ensureLayer3DProperties(
          layer
        );

      }


      const stereoEnabled =
        hasLayer &&
        layerStereoIsEnabled(
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


      depthState.currentStereoEnabled =
        stereoEnabled;


      dom.control
        ?.classList.toggle(
          "is-no-layer",
          !hasLayer
        );


      dom.control
        ?.classList.toggle(
          "is-flat",
          hasLayer &&
          !stereoEnabled
        );


      if (dom.layerName) {

        dom.layerName.textContent =
          hasLayer
            ? getLayerName(
                layer
              )
            : "No layer selected";

      }


      if (dom.stereoStatus) {

        dom.stereoStatus.textContent =
          !hasLayer
            ? "Select a layer"
            : stereoEnabled
              ? `3D enabled at ${formatDepth(
                  depth
                )}`
              : "Flat on the screen plane";

      }


      if (dom.stereoToggleButton) {

        dom.stereoToggleButton.disabled =
          !hasLayer;


        dom.stereoToggleButton.classList.toggle(
          "is-enabled",
          stereoEnabled
        );


        dom.stereoToggleButton.setAttribute(
          "aria-checked",
          String(
            stereoEnabled
          )
        );


        dom.stereoToggleButton.title =
          stereoEnabled
            ? "Disable 3D depth for this layer"
            : "Enable 3D depth for this layer";

      }


      const controlsDisabled =
        !hasLayer ||
        !stereoEnabled;


      if (dom.slider) {

        dom.slider.disabled =
          controlsDisabled;


        dom.slider.value =
          String(
            depth
          );

      }


      if (dom.numberInput) {

        dom.numberInput.disabled =
          controlsDisabled;


        dom.numberInput.value =
          String(
            depth
          );

      }


      if (dom.resetButton) {

        dom.resetButton.disabled =
          controlsDisabled;

      }


      dom.presetButtons.forEach(
        (button) => {

          button.disabled =
            controlsDisabled;

        }
      );


      if (dom.valueBadge) {

        dom.valueBadge.textContent =
          stereoEnabled
            ? formatDepth(
                depth
              )
            : "Flat";

      }


      if (dom.directionLabel) {

        dom.directionLabel.textContent =
          stereoEnabled
            ? getDepthDirection(
                depth
              )
            : "Screen plane";

      }


      updatePresetButtons(
        depth,
        stereoEnabled
      );


      getModeApi()
        ?.setInformationMessage?.(
          !hasLayer
            ? "Select a layer to control its 3D depth."
            : stereoEnabled
              ? `${getLayerName(
                  layer
                )} is live in stereoscopic depth.`
              : `${getLayerName(
                  layer
                )} is currently flat.`,
          {
            title:
              "Paintless3D mode",

            icon:
              "👓",

            depth:
              stereoEnabled
                ? depth
                : 0
          }
        );


      dispatch(
        "paintless3d:depth-controls-updated",
        {
          layer,

          depth,

          hasLayer,

          stereoEnabled
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


    const layer =
      getActiveLayer();


    if (
      layer &&
      !layerStereoIsEnabled(
        layer
      )
    ) {

      dom.stereoToggleButton
        ?.focus();

    } else {

      dom.slider
        ?.focus();

    }


    return true;

  }


  /* =======================================================
     11. CONTROL EVENTS
  ======================================================= */

  function handleStereoToggleClick() {

    toggleActiveLayerStereo();

  }


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

    const result =
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
      result !==
      false
    ) {

      event.target.value =
        String(
          result
        );

    }

  }


  function handlePresetClick(
    event
  ) {

    setActiveLayerDepth(
      Number(
        event.currentTarget
          .dataset.depth
      ),
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

    if (
      event.detail?.mode ===
      "3d"
    ) {

      showDepthControl();

    } else {

      hideDepthControl();

    }

  }


  function handleActiveLayerChanged() {

    updateDepthControls(
      getActiveLayer()
    );

  }


  function handleLayerCreated(
    event
  ) {

    const layer =
      event.detail?.layer ||
      getActiveLayer();


    if (layer) {

      ensureLayer3DProperties(
        layer
      );

    }


    updateDepthControls();

  }


  function handleLayerDuplicated(
    event
  ) {

    const duplicate =
      event.detail?.duplicateLayer ||
      event.detail?.layer ||
      getActiveLayer();


    if (duplicate) {

      ensureLayer3DProperties(
        duplicate
      );

    }


    updateDepthControls(
      duplicate
    );

  }


  function handleLayerStereoChanged(
    event
  ) {

    const changedLayer =
      event.detail?.layer;


    const activeLayer =
      getActiveLayer();


    if (
      changedLayer &&
      activeLayer &&
      changedLayer.id !==
        activeLayer.id
    ) {

      return;

    }


    updateDepthControls(
      activeLayer
    );

  }


  function handleLayerDepthChanged(
    event
  ) {

    const changedLayer =
      event.detail?.layer;


    const activeLayer =
      getActiveLayer();


    if (
      changedLayer &&
      activeLayer &&
      changedLayer.id !==
        activeLayer.id
    ) {

      return;

    }


    updateDepthControls(
      activeLayer
    );

  }


  function handleDocumentReset() {

    window.setTimeout(
      () => {

        ensureAllLayer3DProperties();

        updateDepthControls();

      },
      0
    );

  }


  function handleLayersRestored() {

    ensureAllLayer3DProperties();

    updateDepthControls();


    getRendererApi()
      ?.requestRender?.(
        "layers-restored"
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
      event.key.toLowerCase() ===
      "t"
    ) {

      event.preventDefault();


      toggleActiveLayerStereo();


      return;

    }


    const layer =
      getActiveLayer();


    if (
      !layer ||
      !layerStereoIsEnabled(
        layer
      )
    ) {

      return;

    }


    if (
      event.key ===
      "ArrowUp"
    ) {

      event.preventDefault();


      offsetLayerDepth(
        layer,
        event.shiftKey
          ? 10
          : 1
      );

    }


    if (
      event.key ===
      "ArrowDown"
    ) {

      event.preventDefault();


      offsetLayerDepth(
        layer,
        event.shiftKey
          ? -10
          : -1
      );

    }

  }


  /* =======================================================
     13. CONNECT EVENTS
  ======================================================= */

  function connectEvents() {

    dom.stereoToggleButton
      ?.addEventListener(
        "click",
        handleStereoToggleClick
      );


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
      "paintless:image-layer-created",
      handleLayerCreated
    );


    document.addEventListener(
      "paintless:layer-duplicated",
      handleLayerDuplicated
    );


    document.addEventListener(
      "paintless3d:layer-stereo-changed",
      handleLayerStereoChanged
    );


    document.addEventListener(
      "paintless3d:layer-depth-changed",
      handleLayerDepthChanged
    );


    document.addEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.addEventListener(
      "paintless:layers-restored",
      handleLayersRestored
    );


    document.addEventListener(
      "paintless:history-restored",
      handleLayersRestored
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

    dom.stereoToggleButton
      ?.removeEventListener(
        "click",
        handleStereoToggleClick
      );


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
      "paintless:image-layer-created",
      handleLayerCreated
    );


    document.removeEventListener(
      "paintless:layer-duplicated",
      handleLayerDuplicated
    );


    document.removeEventListener(
      "paintless3d:layer-stereo-changed",
      handleLayerStereoChanged
    );


    document.removeEventListener(
      "paintless3d:layer-depth-changed",
      handleLayerDepthChanged
    );


    document.removeEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.removeEventListener(
      "paintless:layers-restored",
      handleLayersRestored
    );


    document.removeEventListener(
      "paintless:history-restored",
      handleLayersRestored
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
     14. INITIALISE
  ======================================================= */

  async function initialise() {

    if (
      depthState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    if (
      !installDepthControl()
    ) {

      throw new Error(
        "Paintless3D Depth could not find the Layers panel."
      );

    }


    connectEvents();


    ensureAllLayer3DProperties();


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
      "%cPaintless3D Live Depth ready.",
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
     15. DESTROY
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
     16. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      depthState,

    dom,


    initialise,

    destroy,


    ensureLayer3DProperties,

    ensureAllLayer3DProperties,


    getLayerDepth,

    setLayerDepth,

    setActiveLayerDepth,


    layerStereoIsEnabled,

    setLayerStereoEnabled,

    toggleActiveLayerStereo,


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
          depthState.defaultDepth,

        activationDepth:
          depthState.activationDepth
      };

    },


    getActiveLayerDepth() {

      return getLayerDepth(
        getActiveLayer()
      );

    },


    activeLayerStereoIsEnabled() {

      return layerStereoIsEnabled(
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

          enabled:
            layerStereoIsEnabled(
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
     17. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "depth",
    {

      label:
        "Paintless3D Live Layer Depth",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
