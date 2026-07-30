"use strict";

/* =========================================================
   PAINTLESS3D
   PREVIEW CONTROLS MODULE — v0.1

   File:
   js/paintless3d/preview.js

   Purpose:
   - Controls the live anaglyph preview experience
   - Adds stereo strength and convergence controls
   - Adds colour-channel selection
   - Adds eye swapping and ghost reduction
   - Shows live renderer information
   - Keeps controls hidden outside Paintless3D mode
   - Works with renderer.js without altering original artwork
   - Remembers settings through Paintless3D Core
   - Mobile-friendly
   - Requires no index.html or CSS changes

   Connected APIs:
   - Paintless3DCore
   - Paintless3DMode
   - Paintless3DRenderer
   - Paintless3DDepth

   Connected events:
   - paintless3d:preview-changed
   - paintless3d:mode-changed
   - paintless3d:render-completed
   - paintless3d:render-failed
   - paintless3d:layer-depth-changed
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
      "Paintless3D Preview could not start because paintless3d.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. PREVIEW STATE
  ======================================================= */

  const previewState = {

    initialised:
      false,

    destroyed:
      false,

    active:
      false,

    panelOpen:
      false,

    panelInstalled:
      false,

    stylesInstalled:
      false,

    updatingControls:
      false,

    lastRenderDuration:
      0,

    lastRenderWidth:
      0,

    lastRenderHeight:
      0,

    lastRenderLayers:
      0,

    lastRenderReason:
      null,

    lastRenderError:
      null,

    renderStatus:
      "idle",

    strengthMinimum:
      0,

    strengthMaximum:
      100,

    convergenceMinimum:
      -100,

    convergenceMaximum:
      100,

    ghostMinimum:
      0,

    ghostMaximum:
      100,

    closePanelWhenLeaving3D:
      true,

    openPanelWhenPreviewStarts:
      true,

    autoRenderOnControlInput:
      true,

    transitionDuration:
      160

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    previewButton:
      null,

    controlParent:
      null,

    panel:
      null,

    panelHeader:
      null,

    panelTitle:
      null,

    closeButton:
      null,

    statusDot:
      null,

    statusText:
      null,

    glassesIndicator:
      null,

    strengthSlider:
      null,

    strengthNumber:
      null,

    strengthValue:
      null,

    convergenceSlider:
      null,

    convergenceNumber:
      null,

    convergenceValue:
      null,

    channelSelect:
      null,

    swapEyesInput:
      null,

    swapEyesButton:
      null,

    ghostSlider:
      null,

    ghostNumber:
      null,

    ghostValue:
      null,

    resetButton:
      null,

    renderButton:
      null,

    statistics:
      null,

    statisticsResolution:
      null,

    statisticsLayers:
      null,

    statisticsTime:
      null,

    statisticsReason:
      null,

    activeLayerDepth:
      null,

    styles:
      null

  };


  /* =======================================================
     4. SHARED APIS
  ======================================================= */

  function getCoreApi() {

    return (
      window.Paintless3DCore ||
      paintless3d.getModule?.(
        "core"
      )?.api ||
      null
    );

  }


  function getModeApi() {

    return (
      window.Paintless3DMode ||
      paintless3d.getModule?.(
        "mode"
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


  function getDepthApi() {

    return (
      window.Paintless3DDepth ||
      paintless3d.getModule?.(
        "depth"
      )?.api ||
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


  function formatMilliseconds(
    value
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "—";

    }


    if (
      number <
      1
    ) {

      return "<1 ms";

    }


    if (
      number <
      1000
    ) {

      return `${Math.round(
        number
      )} ms`;

    }


    return `${(
      number /
      1000
    ).toFixed(
      2
    )} s`;

  }


  function formatDepth(
    depth
  ) {

    const numericDepth =
      Number(
        depth
      ) ||
      0;


    return `${
      numericDepth >
      0
        ? "+"
        : ""
    }${numericDepth}`;

  }


  function getChannelLabel(
    channelMode
  ) {

    if (
      channelMode ===
      "red-blue"
    ) {

      return "Red / Blue";

    }


    if (
      channelMode ===
      "green-magenta"
    ) {

      return "Green / Magenta";

    }


    return "Red / Cyan";

  }


  /* =======================================================
     6. SETTINGS ACCESS
  ======================================================= */

  function getStereoSettings() {

    return (
      getCoreApi()
        ?.getStereoSettings?.() ||
      {

        strength:
          12,

        convergence:
          0,

        channelMode:
          "red-cyan",

        swapEyes:
          false,

        ghostReduction:
          0

      }
    );

  }


  function getPreviewEnabled() {

    return Boolean(
      getCoreApi()
        ?.isPreviewEnabled?.()
    );

  }


  function getActiveLayerDepth() {

    return (
      getDepthApi()
        ?.getActiveLayerDepth?.() ||
      0
    );

  }


  /* =======================================================
     7. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.previewButton =
      document.getElementById(
        "paintless3d-preview-button"
      );


    dom.controlParent =
      findFirst(
        [
          "#right-sidebar",
          ".right-sidebar",
          ".sidebar-right",
          ".properties-sidebar",
          "#layers-panel",
          ".layers-panel",
          "aside"
        ]
      );

  }


  /* =======================================================
     8. STYLES
  ======================================================= */

  function installStyles() {

    if (
      previewState.stylesInstalled ||
      document.getElementById(
        "paintless3d-preview-styles"
      )
    ) {

      previewState.stylesInstalled =
        true;


      return true;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-preview-styles";


    style.textContent = `
      .paintless3d-preview-panel {
        display: none;
        margin: 11px 0 3px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 13px;
        color: #ffffff;
        background:
          radial-gradient(
            circle at 6% 8%,
            rgba(255, 49, 92, 0.12),
            transparent 34%
          ),
          radial-gradient(
            circle at 94% 8%,
            rgba(37, 230, 255, 0.12),
            transparent 34%
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
      .paintless3d-preview-panel.is-open {
        display: block;
      }

      .paintless3d-preview-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .paintless3d-preview-panel-title-wrap {
        min-width: 0;
      }

      .paintless3d-preview-panel-title {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        color: #ffffff;
        font:
          900 11px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        text-shadow:
          -1px 0 rgba(255, 49, 92, 0.44),
          1px 0 rgba(37, 230, 255, 0.44);
      }

      .paintless3d-preview-glasses {
        font-size: 16px;
        line-height: 1;
        filter:
          drop-shadow(-2px 0 3px rgba(255, 49, 92, 0.25))
          drop-shadow(2px 0 3px rgba(37, 230, 255, 0.25));
      }

      .paintless3d-preview-panel-subtitle {
        display: block;
        margin-top: 3px;
        color: rgba(255, 255, 255, 0.47);
        font:
          500 9px/1.25
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-preview-panel-close {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 29px;
        height: 29px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.045);
        font: 800 15px/1 Arial, sans-serif;
        cursor: pointer;
      }

      .paintless3d-preview-panel-close:hover {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.26);
        background: rgba(255, 255, 255, 0.09);
      }

      .paintless3d-preview-status {
        display: flex;
        align-items: center;
        gap: 7px;
        min-height: 31px;
        margin-top: 10px;
        padding: 6px 8px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.035);
      }

      .paintless3d-preview-status-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.32);
        box-shadow: 0 0 0 rgba(255, 255, 255, 0);
      }

      .paintless3d-preview-status.is-ready
      .paintless3d-preview-status-dot {
        background: #69f59c;
        box-shadow: 0 0 9px rgba(105, 245, 156, 0.55);
      }

      .paintless3d-preview-status.is-rendering
      .paintless3d-preview-status-dot {
        background: #ffd75a;
        box-shadow: 0 0 9px rgba(255, 215, 90, 0.55);
        animation: paintless3d-preview-pulse 850ms ease-in-out infinite;
      }

      .paintless3d-preview-status.is-error
      .paintless3d-preview-status-dot {
        background: #ff315c;
        box-shadow: 0 0 9px rgba(255, 49, 92, 0.58);
      }

      .paintless3d-preview-status-text {
        min-width: 0;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.65);
        font:
          700 9px/1.25
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @keyframes paintless3d-preview-pulse {
        0%,
        100% {
          opacity: 0.55;
          transform: scale(0.88);
        }

        50% {
          opacity: 1;
          transform: scale(1.15);
        }
      }

      .paintless3d-preview-control-group {
        margin-top: 11px;
      }

      .paintless3d-preview-control-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 7px;
      }

      .paintless3d-preview-control-label {
        color: rgba(255, 255, 255, 0.76);
        font:
          800 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .paintless3d-preview-control-value {
        display: inline-grid;
        place-items: center;
        min-width: 42px;
        height: 23px;
        padding: 0 6px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 7px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.09),
            rgba(37, 230, 255, 0.1)
          );
        font:
          900 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-preview-slider-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 55px;
        align-items: center;
        gap: 8px;
      }

      .paintless3d-preview-slider {
        width: 100%;
        height: 7px;
        margin: 0;
        appearance: none;
        border-radius: 999px;
        outline: none;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.88),
            rgba(168, 76, 255, 0.83),
            rgba(37, 230, 255, 0.9)
          );
        box-shadow:
          inset 0 1px 4px rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }

      .paintless3d-preview-slider::-webkit-slider-thumb {
        width: 17px;
        height: 17px;
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
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.52);
        cursor: grab;
      }

      .paintless3d-preview-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #a84cff,
            #25e6ff
          );
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.52);
        cursor: grab;
      }

      .paintless3d-preview-number {
        width: 100%;
        height: 30px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 8px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.045);
        font:
          700 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
        outline: none;
      }

      .paintless3d-preview-number:focus {
        border-color: rgba(37, 230, 255, 0.62);
        box-shadow: 0 0 0 2px rgba(37, 230, 255, 0.09);
      }

      .paintless3d-preview-select {
        width: 100%;
        height: 32px;
        padding: 0 9px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 9px;
        color: #ffffff;
        background: #171020;
        font:
          700 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
        outline: none;
        cursor: pointer;
      }

      .paintless3d-preview-select:focus {
        border-color: rgba(37, 230, 255, 0.62);
      }

      .paintless3d-preview-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 34px;
        margin-top: 10px;
        padding: 6px 8px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.03);
      }

      .paintless3d-preview-toggle-copy {
        min-width: 0;
      }

      .paintless3d-preview-toggle-title {
        display: block;
        color: rgba(255, 255, 255, 0.74);
        font:
          800 9px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .paintless3d-preview-toggle-description {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, 0.4);
        font:
          500 8px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-preview-toggle-button {
        position: relative;
        flex: 0 0 auto;
        width: 42px;
        height: 23px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        cursor: pointer;
      }

      .paintless3d-preview-toggle-button::before {
        content: "";
        position: absolute;
        left: 3px;
        top: 3px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.42);
        transition:
          transform 150ms ease,
          background 150ms ease;
      }

      .paintless3d-preview-toggle-button.is-enabled {
        border-color: rgba(37, 230, 255, 0.48);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.22),
            rgba(37, 230, 255, 0.22)
          );
      }

      .paintless3d-preview-toggle-button.is-enabled::before {
        transform: translateX(19px);
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #25e6ff
          );
      }

      .paintless3d-preview-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
        margin-top: 11px;
      }

      .paintless3d-preview-action {
        min-width: 0;
        height: 33px;
        padding: 0 8px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.71);
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

      .paintless3d-preview-action:hover {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.08);
      }

      .paintless3d-preview-action.is-primary {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.35);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.15),
            rgba(37, 230, 255, 0.16)
          );
      }

      .paintless3d-preview-statistics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .paintless3d-preview-stat {
        min-width: 0;
        padding: 6px 7px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.025);
      }

      .paintless3d-preview-stat-label {
        display: block;
        color: rgba(255, 255, 255, 0.34);
        font:
          700 7px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .paintless3d-preview-stat-value {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.67);
        font:
          700 9px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless3d-preview-active-depth {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 9px;
        padding: 7px 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.026);
        font:
          700 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .paintless3d-preview-active-depth strong {
        color: #ffffff;
        font-size: 10px;
      }

      @media (max-width: 620px) {
        .paintless3d-preview-panel {
          padding: 10px;
        }

        .paintless3d-preview-slider-row {
          grid-template-columns: minmax(0, 1fr) 50px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    previewState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. DOM BUILDING HELPERS
  ======================================================= */

  function createElement(
    tagName,
    className =
      null,
    textContent =
      null
  ) {

    const element =
      document.createElement(
        tagName
      );


    if (className) {

      element.className =
        className;

    }


    if (
      textContent !==
      null
    ) {

      element.textContent =
        textContent;

    }


    return element;

  }


  function createControlHeading(
    labelText
  ) {

    const heading =
      createElement(
        "div",
        "paintless3d-preview-control-heading"
      );


    const label =
      createElement(
        "span",
        "paintless3d-preview-control-label",
        labelText
      );


    const value =
      createElement(
        "span",
        "paintless3d-preview-control-value",
        "0"
      );


    heading.append(
      label,
      value
    );


    return {

      heading,

      label,

      value

    };

  }


  function createSliderControl(
    {
      label,
      minimum,
      maximum,
      step,
      value,
      ariaLabel
    }
  ) {

    const group =
      createElement(
        "div",
        "paintless3d-preview-control-group"
      );


    const headingElements =
      createControlHeading(
        label
      );


    const row =
      createElement(
        "div",
        "paintless3d-preview-slider-row"
      );


    const slider =
      document.createElement(
        "input"
      );


    slider.type =
      "range";


    slider.className =
      "paintless3d-preview-slider";


    slider.min =
      String(
        minimum
      );


    slider.max =
      String(
        maximum
      );


    slider.step =
      String(
        step
      );


    slider.value =
      String(
        value
      );


    slider.setAttribute(
      "aria-label",
      ariaLabel
    );


    const numberInput =
      document.createElement(
        "input"
      );


    numberInput.type =
      "number";


    numberInput.className =
      "paintless3d-preview-number";


    numberInput.min =
      String(
        minimum
      );


    numberInput.max =
      String(
        maximum
      );


    numberInput.step =
      String(
        step
      );


    numberInput.value =
      String(
        value
      );


    numberInput.setAttribute(
      "aria-label",
      `${ariaLabel} numeric value`
    );


    row.append(
      slider,
      numberInput
    );


    group.append(
      headingElements.heading,
      row
    );


    return {

      group,

      slider,

      numberInput,

      value:
        headingElements.value

    };

  }


  function createStatistic(
    labelText
  ) {

    const statistic =
      createElement(
        "span",
        "paintless3d-preview-stat"
      );


    const label =
      createElement(
        "span",
        "paintless3d-preview-stat-label",
        labelText
      );


    const value =
      createElement(
        "strong",
        "paintless3d-preview-stat-value",
        "—"
      );


    statistic.append(
      label,
      value
    );


    return {

      statistic,

      value

    };

  }


  /* =======================================================
     10. PANEL CREATION
  ======================================================= */

  function createPreviewPanel() {

    const settings =
      getStereoSettings();


    const panel =
      createElement(
        "section",
        "paintless3d-preview-panel"
      );


    panel.id =
      "paintless3d-preview-panel";


    panel.setAttribute(
      "aria-label",
      "Paintless3D preview controls"
    );


    const header =
      createElement(
        "div",
        "paintless3d-preview-panel-header"
      );


    const titleWrap =
      createElement(
        "div",
        "paintless3d-preview-panel-title-wrap"
      );


    const title =
      createElement(
        "h3",
        "paintless3d-preview-panel-title"
      );


    const glasses =
      createElement(
        "span",
        "paintless3d-preview-glasses",
        "👓"
      );


    glasses.setAttribute(
      "aria-hidden",
      "true"
    );


    const titleText =
      createElement(
        "span",
        null,
        "Glasses Preview"
      );


    title.append(
      glasses,
      titleText
    );


    const subtitle =
      createElement(
        "span",
        "paintless3d-preview-panel-subtitle",
        "Tune the stereoscopic image for your glasses."
      );


    titleWrap.append(
      title,
      subtitle
    );


    const closeButton =
      createElement(
        "button",
        "paintless3d-preview-panel-close",
        "×"
      );


    closeButton.type =
      "button";


    closeButton.setAttribute(
      "aria-label",
      "Close Paintless3D preview controls"
    );


    header.append(
      titleWrap,
      closeButton
    );


    const status =
      createElement(
        "div",
        "paintless3d-preview-status"
      );


    const statusDot =
      createElement(
        "span",
        "paintless3d-preview-status-dot"
      );


    statusDot.setAttribute(
      "aria-hidden",
      "true"
    );


    const statusText =
      createElement(
        "span",
        "paintless3d-preview-status-text",
        "Preview is off."
      );


    status.append(
      statusDot,
      statusText
    );


    const strengthControl =
      createSliderControl(
        {
          label:
            "Depth strength",

          minimum:
            previewState.strengthMinimum,

          maximum:
            previewState.strengthMaximum,

          step:
            1,

          value:
            settings.strength,

          ariaLabel:
            "Paintless3D depth strength"
        }
      );


    const convergenceControl =
      createSliderControl(
        {
          label:
            "Convergence",

          minimum:
            previewState.convergenceMinimum,

          maximum:
            previewState.convergenceMaximum,

          step:
            1,

          value:
            settings.convergence,

          ariaLabel:
            "Paintless3D convergence"
        }
      );


    const channelGroup =
      createElement(
        "div",
        "paintless3d-preview-control-group"
      );


    const channelHeading =
      createElement(
        "div",
        "paintless3d-preview-control-heading"
      );


    const channelLabel =
      createElement(
        "span",
        "paintless3d-preview-control-label",
        "Glasses type"
      );


    channelHeading.appendChild(
      channelLabel
    );


    const channelSelect =
      document.createElement(
        "select"
      );


    channelSelect.className =
      "paintless3d-preview-select";


    channelSelect.setAttribute(
      "aria-label",
      "Anaglyph glasses colour mode"
    );


    [
      [
        "red-cyan",
        "Red / Cyan"
      ],

      [
        "red-blue",
        "Red / Blue"
      ],

      [
        "green-magenta",
        "Green / Magenta"
      ]
    ].forEach(
      (
        [
          value,
          label
        ]
      ) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          value;


        option.textContent =
          label;


        channelSelect.appendChild(
          option
        );

      }
    );


    channelSelect.value =
      settings.channelMode;


    channelGroup.append(
      channelHeading,
      channelSelect
    );


    const swapRow =
      createElement(
        "div",
        "paintless3d-preview-toggle-row"
      );


    const swapCopy =
      createElement(
        "span",
        "paintless3d-preview-toggle-copy"
      );


    const swapTitle =
      createElement(
        "span",
        "paintless3d-preview-toggle-title",
        "Swap eyes"
      );


    const swapDescription =
      createElement(
        "span",
        "paintless3d-preview-toggle-description",
        "Reverse depth direction if the image feels inside-out."
      );


    swapCopy.append(
      swapTitle,
      swapDescription
    );


    const swapButton =
      createElement(
        "button",
        "paintless3d-preview-toggle-button"
      );


    swapButton.type =
      "button";


    swapButton.setAttribute(
      "role",
      "switch"
    );


    swapButton.setAttribute(
      "aria-label",
      "Swap left and right stereoscopic eyes"
    );


    swapButton.setAttribute(
      "aria-checked",
      String(
        settings.swapEyes
      )
    );


    swapButton.classList.toggle(
      "is-enabled",
      settings.swapEyes
    );


    swapRow.append(
      swapCopy,
      swapButton
    );


    const ghostControl =
      createSliderControl(
        {
          label:
            "Ghost reduction",

          minimum:
            previewState.ghostMinimum,

          maximum:
            previewState.ghostMaximum,

          step:
            1,

          value:
            settings.ghostReduction,

          ariaLabel:
            "Paintless3D ghost reduction"
        }
      );


    const activeDepth =
      createElement(
        "div",
        "paintless3d-preview-active-depth"
      );


    const activeDepthLabel =
      createElement(
        "span",
        null,
        "Active layer depth"
      );


    const activeDepthValue =
      createElement(
        "strong",
        null,
        formatDepth(
          getActiveLayerDepth()
        )
      );


    activeDepth.append(
      activeDepthLabel,
      activeDepthValue
    );


    const actions =
      createElement(
        "div",
        "paintless3d-preview-actions"
      );


    const resetButton =
      createElement(
        "button",
        "paintless3d-preview-action",
        "Reset Stereo"
      );


    resetButton.type =
      "button";


    const renderButton =
      createElement(
        "button",
        "paintless3d-preview-action is-primary",
        "Render Now"
      );


    renderButton.type =
      "button";


    actions.append(
      resetButton,
      renderButton
    );


    const statistics =
      createElement(
        "div",
        "paintless3d-preview-statistics"
      );


    const resolutionStatistic =
      createStatistic(
        "Resolution"
      );


    const layersStatistic =
      createStatistic(
        "Layers"
      );


    const timeStatistic =
      createStatistic(
        "Render time"
      );


    const reasonStatistic =
      createStatistic(
        "Last update"
      );


    statistics.append(
      resolutionStatistic.statistic,
      layersStatistic.statistic,
      timeStatistic.statistic,
      reasonStatistic.statistic
    );


    panel.append(
      header,
      status,
      strengthControl.group,
      convergenceControl.group,
      channelGroup,
      swapRow,
      ghostControl.group,
      activeDepth,
      actions,
      statistics
    );


    dom.panel =
      panel;


    dom.panelHeader =
      header;


    dom.panelTitle =
      title;


    dom.closeButton =
      closeButton;


    dom.statusDot =
      statusDot;


    dom.statusText =
      statusText;


    dom.glassesIndicator =
      glasses;


    dom.strengthSlider =
      strengthControl.slider;


    dom.strengthNumber =
      strengthControl.numberInput;


    dom.strengthValue =
      strengthControl.value;


    dom.convergenceSlider =
      convergenceControl.slider;


    dom.convergenceNumber =
      convergenceControl.numberInput;


    dom.convergenceValue =
      convergenceControl.value;


    dom.channelSelect =
      channelSelect;


    dom.swapEyesButton =
      swapButton;


    dom.ghostSlider =
      ghostControl.slider;


    dom.ghostNumber =
      ghostControl.numberInput;


    dom.ghostValue =
      ghostControl.value;


    dom.resetButton =
      resetButton;


    dom.renderButton =
      renderButton;


    dom.statistics =
      statistics;


    dom.statisticsResolution =
      resolutionStatistic.value;


    dom.statisticsLayers =
      layersStatistic.value;


    dom.statisticsTime =
      timeStatistic.value;


    dom.statisticsReason =
      reasonStatistic.value;


    dom.activeLayerDepth =
      activeDepthValue;


    return panel;

  }


  function installPreviewPanel() {

    const existingPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );


    if (existingPanel) {

      dom.panel =
        existingPanel;


      dom.closeButton =
        existingPanel.querySelector(
          ".paintless3d-preview-panel-close"
        );


      dom.statusText =
        existingPanel.querySelector(
          ".paintless3d-preview-status-text"
        );


      dom.strengthSlider =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-slider"
        )[0] ||
        null;


      dom.convergenceSlider =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-slider"
        )[1] ||
        null;


      dom.ghostSlider =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-slider"
        )[2] ||
        null;


      dom.strengthNumber =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-number"
        )[0] ||
        null;


      dom.convergenceNumber =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-number"
        )[1] ||
        null;


      dom.ghostNumber =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-number"
        )[2] ||
        null;


      dom.channelSelect =
        existingPanel.querySelector(
          ".paintless3d-preview-select"
        );


      dom.swapEyesButton =
        existingPanel.querySelector(
          ".paintless3d-preview-toggle-button"
        );


      dom.resetButton =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-action"
        )[0] ||
        null;


      dom.renderButton =
        existingPanel.querySelectorAll(
          ".paintless3d-preview-action"
        )[1] ||
        null;


      dom.activeLayerDepth =
        existingPanel.querySelector(
          ".paintless3d-preview-active-depth strong"
        );


      previewState.panelInstalled =
        true;


      return true;

    }


    if (!dom.controlParent) {

      return false;

    }


    const panel =
      createPreviewPanel();


    dom.controlParent.appendChild(
      panel
    );


    previewState.panelInstalled =
      true;


    return true;

  }


  /* =======================================================
     11. PANEL DISPLAY
  ======================================================= */

  function openPanel() {

    if (!dom.panel) {

      return false;

    }


    previewState.panelOpen =
      true;


    dom.panel.classList.add(
      "is-open"
    );


    dispatch(
      "paintless3d:preview-panel-opened"
    );


    return true;

  }


  function closePanel() {

    if (!dom.panel) {

      return false;

    }


    previewState.panelOpen =
      false;


    dom.panel.classList.remove(
      "is-open"
    );


    dispatch(
      "paintless3d:preview-panel-closed"
    );


    return true;

  }


  function togglePanel() {

    return previewState.panelOpen
      ? closePanel()
      : openPanel();

  }


  /* =======================================================
     12. STATUS
  ======================================================= */

  function updateStatus(
    status,
    message
  ) {

    previewState.renderStatus =
      status;


    const statusContainer =
      dom.statusText
        ?.parentElement;


    statusContainer
      ?.classList.remove(
        "is-ready",
        "is-rendering",
        "is-error"
      );


    if (
      status ===
      "ready"
    ) {

      statusContainer
        ?.classList.add(
          "is-ready"
        );

    }


    if (
      status ===
      "rendering"
    ) {

      statusContainer
        ?.classList.add(
          "is-rendering"
        );

    }


    if (
      status ===
      "error"
    ) {

      statusContainer
        ?.classList.add(
          "is-error"
        );

    }


    if (dom.statusText) {

      dom.statusText.textContent =
        message;

    }


    return status;

  }


  function updatePreviewStatus() {

    if (
      !paintless3d.is3DMode?.()
    ) {

      updateStatus(
        "idle",
        "Switch to 3D mode to use Glasses Preview."
      );


      return;

    }


    if (
      !getPreviewEnabled()
    ) {

      updateStatus(
        "idle",
        "Preview is off."
      );


      return;

    }


    if (
      getRendererApi()
        ?.isRendering?.()
    ) {

      updateStatus(
        "rendering",
        "Rendering stereoscopic image…"
      );


      return;

    }


    if (
      previewState.lastRenderError
    ) {

      updateStatus(
        "error",
        "The previous preview render failed."
      );


      return;

    }


    updateStatus(
      "ready",
      `${getChannelLabel(
        getStereoSettings()
          .channelMode
      )} preview is active.`
    );

  }


  /* =======================================================
     13. CONTROL SYNCHRONISATION
  ======================================================= */

  function updateControls() {

    if (
      previewState.updatingControls
    ) {

      return false;

    }


    previewState.updatingControls =
      true;


    try {

      const settings =
        getStereoSettings();


      if (dom.strengthSlider) {

        dom.strengthSlider.value =
          String(
            settings.strength
          );

      }


      if (dom.strengthNumber) {

        dom.strengthNumber.value =
          String(
            settings.strength
          );

      }


      if (dom.strengthValue) {

        dom.strengthValue.textContent =
          String(
            settings.strength
          );

      }


      if (dom.convergenceSlider) {

        dom.convergenceSlider.value =
          String(
            settings.convergence
          );

      }


      if (dom.convergenceNumber) {

        dom.convergenceNumber.value =
          String(
            settings.convergence
          );

      }


      if (dom.convergenceValue) {

        dom.convergenceValue.textContent =
          formatDepth(
            settings.convergence
          );

      }


      if (dom.channelSelect) {

        dom.channelSelect.value =
          settings.channelMode;

      }


      dom.swapEyesButton
        ?.classList.toggle(
          "is-enabled",
          settings.swapEyes
        );


      dom.swapEyesButton
        ?.setAttribute(
          "aria-checked",
          String(
            settings.swapEyes
          )
        );


      if (dom.ghostSlider) {

        dom.ghostSlider.value =
          String(
            settings.ghostReduction
          );

      }


      if (dom.ghostNumber) {

        dom.ghostNumber.value =
          String(
            settings.ghostReduction
          );

      }


      if (dom.ghostValue) {

        dom.ghostValue.textContent =
          `${settings.ghostReduction}%`;

      }


      if (dom.activeLayerDepth) {

        dom.activeLayerDepth.textContent =
          formatDepth(
            getActiveLayerDepth()
          );

      }


      updatePreviewStatus();


      return true;

    } finally {

      previewState.updatingControls =
        false;

    }

  }


  function updateStatistics(
    {
      width =
        previewState.lastRenderWidth,

      height =
        previewState.lastRenderHeight,

      layers =
        previewState.lastRenderLayers,

      duration =
        previewState.lastRenderDuration,

      reason =
        previewState.lastRenderReason
    } = {}
  ) {

    if (dom.statisticsResolution) {

      dom.statisticsResolution.textContent =
        width &&
        height
          ? `${width} × ${height}`
          : "—";

    }


    if (dom.statisticsLayers) {

      dom.statisticsLayers.textContent =
        Number.isFinite(
          Number(
            layers
          )
        )
          ? String(
              layers
            )
          : "—";

    }


    if (dom.statisticsTime) {

      dom.statisticsTime.textContent =
        formatMilliseconds(
          duration
        );

    }


    if (dom.statisticsReason) {

      dom.statisticsReason.textContent =
        reason ||
        "—";

    }


    return true;

  }


  /* =======================================================
     14. SETTING CHANGES
  ======================================================= */

  function setStrength(
    value,
    {
      render =
        true
    } = {}
  ) {

    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        previewState.strengthMinimum,
        previewState.strengthMaximum
      );


    getCoreApi()
      ?.setStrength?.(
        nextValue
      );


    updateControls();


    if (
      render &&
      previewState.autoRenderOnControlInput
    ) {

      getRendererApi()
        ?.requestRender?.(
          "preview-strength-input"
        );

    }


    return nextValue;

  }


  function setConvergence(
    value,
    {
      render =
        true
    } = {}
  ) {

    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        previewState.convergenceMinimum,
        previewState.convergenceMaximum
      );


    getCoreApi()
      ?.setConvergence?.(
        nextValue
      );


    updateControls();


    if (
      render &&
      previewState.autoRenderOnControlInput
    ) {

      getRendererApi()
        ?.requestRender?.(
          "preview-convergence-input"
        );

    }


    return nextValue;

  }


  function setChannelMode(
    value
  ) {

    const result =
      getCoreApi()
        ?.setChannelMode?.(
          value
        );


    updateControls();


    getRendererApi()
      ?.requestRender?.(
        "preview-channel-mode-input"
      );


    return result;

  }


  function setSwapEyes(
    enabled
  ) {

    const result =
      getCoreApi()
        ?.setSwapEyes?.(
          enabled
        );


    updateControls();


    getRendererApi()
      ?.requestRender?.(
        "preview-swap-eyes-input"
      );


    return result;

  }


  function toggleSwapEyes() {

    return setSwapEyes(
      !getStereoSettings()
        .swapEyes
    );

  }


  function setGhostReduction(
    value,
    {
      render =
        true
    } = {}
  ) {

    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        previewState.ghostMinimum,
        previewState.ghostMaximum
      );


    getCoreApi()
      ?.setGhostReduction?.(
        nextValue
      );


    updateControls();


    if (
      render &&
      previewState.autoRenderOnControlInput
    ) {

      getRendererApi()
        ?.requestRender?.(
          "preview-ghost-reduction-input"
        );

    }


    return nextValue;

  }


  function resetStereoSettings() {

    setStrength(
      12,
      {
        render:
          false
      }
    );


    setConvergence(
      0,
      {
        render:
          false
      }
    );


    setChannelMode(
      "red-cyan"
    );


    setSwapEyes(
      false
    );


    setGhostReduction(
      0,
      {
        render:
          false
      }
    );


    updateControls();


    getRendererApi()
      ?.requestRender?.(
        "preview-settings-reset"
      );


    sendStatusMessage(
      "Paintless3D stereo settings reset."
    );


    return true;

  }


  /* =======================================================
     15. CONTROL EVENTS
  ======================================================= */

  function handleStrengthInput(
    event
  ) {

    if (
      previewState.updatingControls
    ) {

      return;

    }


    setStrength(
      event.target.value
    );

  }


  function handleStrengthChange(
    event
  ) {

    const value =
      setStrength(
        event.target.value
      );


    sendStatusMessage(
      `Paintless3D strength set to ${value}.`
    );

  }


  function handleConvergenceInput(
    event
  ) {

    if (
      previewState.updatingControls
    ) {

      return;

    }


    setConvergence(
      event.target.value
    );

  }


  function handleConvergenceChange(
    event
  ) {

    const value =
      setConvergence(
        event.target.value
      );


    sendStatusMessage(
      `Paintless3D convergence set to ${formatDepth(
        value
      )}.`
    );

  }


  function handleGhostInput(
    event
  ) {

    if (
      previewState.updatingControls
    ) {

      return;

    }


    setGhostReduction(
      event.target.value
    );

  }


  function handleGhostChange(
    event
  ) {

    const value =
      setGhostReduction(
        event.target.value
      );


    sendStatusMessage(
      `Ghost reduction set to ${value}%.`
    );

  }


  function handleChannelChange(
    event
  ) {

    const result =
      setChannelMode(
        event.target.value
      );


    if (result) {

      sendStatusMessage(
        `${getChannelLabel(
          result
        )} glasses mode selected.`
      );

    }

  }


  function handleRenderButton() {

    if (
      !getPreviewEnabled()
    ) {

      getCoreApi()
        ?.setPreviewEnabled?.(
          true
        );

    }


    updateStatus(
      "rendering",
      "Rendering stereoscopic image…"
    );


    getRendererApi()
      ?.requestRender?.(
        "manual-preview-render"
      );

  }


  /* =======================================================
     16. DOCUMENT EVENT HANDLERS
  ======================================================= */

  function handlePreviewChanged(
    event
  ) {

    previewState.active =
      Boolean(
        event.detail?.enabled
      );


    if (
      previewState.active &&
      previewState.openPanelWhenPreviewStarts
    ) {

      openPanel();

    }


    updateControls();

  }


  function handleModeChanged(
    event
  ) {

    const is3D =
      event.detail?.mode ===
      "3d";


    if (
      !is3D &&
      previewState.closePanelWhenLeaving3D
    ) {

      closePanel();

    }


    updateControls();

  }


  function handleRenderRequested() {

    if (
      getPreviewEnabled()
    ) {

      updateStatus(
        "rendering",
        "Rendering stereoscopic image…"
      );

    }

  }


  function handleRenderCompleted(
    event
  ) {

    previewState.lastRenderDuration =
      Number(
        event.detail?.duration
      ) ||
      0;


    previewState.lastRenderWidth =
      Number(
        event.detail?.width
      ) ||
      0;


    previewState.lastRenderHeight =
      Number(
        event.detail?.height
      ) ||
      0;


    previewState.lastRenderLayers =
      Number(
        event.detail?.layers
      ) ||
      0;


    previewState.lastRenderReason =
      event.detail?.reason ||
      "render";


    previewState.lastRenderError =
      null;


    updateStatistics();


    updateStatus(
      "ready",
      `${getChannelLabel(
        getStereoSettings()
          .channelMode
      )} preview rendered in ${formatMilliseconds(
        previewState.lastRenderDuration
      )}.`
    );


    dispatch(
      "paintless3d:preview-updated",
      {
        canvas:
          event.detail?.canvas,

        width:
          previewState.lastRenderWidth,

        height:
          previewState.lastRenderHeight,

        duration:
          previewState.lastRenderDuration,

        layers:
          previewState.lastRenderLayers,

        reason:
          previewState.lastRenderReason
      }
    );

  }


  function handleRenderFailed(
    event
  ) {

    previewState.lastRenderError =
      event.detail?.error ||
      new Error(
        "Unknown Paintless3D render error."
      );


    updateStatus(
      "error",
      "Preview rendering failed. Check the browser console."
    );

  }


  function handleDepthChanged() {

    if (dom.activeLayerDepth) {

      dom.activeLayerDepth.textContent =
        formatDepth(
          getActiveLayerDepth()
        );

    }

  }


  function handleStereoSettingChanged() {

    updateControls();

  }


  function handleActiveLayerChanged() {

    handleDepthChanged();

  }


  function handleExternalPreviewButtonDoubleClick(
    event
  ) {

    event.preventDefault();


    openPanel();

  }


  /* =======================================================
     17. EVENT CONNECTION
  ======================================================= */

  function connectEvents() {

    dom.closeButton
      ?.addEventListener(
        "click",
        closePanel
      );


    dom.strengthSlider
      ?.addEventListener(
        "input",
        handleStrengthInput
      );


    dom.strengthSlider
      ?.addEventListener(
        "change",
        handleStrengthChange
      );


    dom.strengthNumber
      ?.addEventListener(
        "input",
        handleStrengthInput
      );


    dom.strengthNumber
      ?.addEventListener(
        "change",
        handleStrengthChange
      );


    dom.convergenceSlider
      ?.addEventListener(
        "input",
        handleConvergenceInput
      );


    dom.convergenceSlider
      ?.addEventListener(
        "change",
        handleConvergenceChange
      );


    dom.convergenceNumber
      ?.addEventListener(
        "input",
        handleConvergenceInput
      );


    dom.convergenceNumber
      ?.addEventListener(
        "change",
        handleConvergenceChange
      );


    dom.channelSelect
      ?.addEventListener(
        "change",
        handleChannelChange
      );


    dom.swapEyesButton
      ?.addEventListener(
        "click",
        toggleSwapEyes
      );


    dom.ghostSlider
      ?.addEventListener(
        "input",
        handleGhostInput
      );


    dom.ghostSlider
      ?.addEventListener(
        "change",
        handleGhostChange
      );


    dom.ghostNumber
      ?.addEventListener(
        "input",
        handleGhostInput
      );


    dom.ghostNumber
      ?.addEventListener(
        "change",
        handleGhostChange
      );


    dom.resetButton
      ?.addEventListener(
        "click",
        resetStereoSettings
      );


    dom.renderButton
      ?.addEventListener(
        "click",
        handleRenderButton
      );


    dom.previewButton
      ?.addEventListener(
        "dblclick",
        handleExternalPreviewButtonDoubleClick
      );


    document.addEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    document.addEventListener(
      "paintless3d:render-completed",
      handleRenderCompleted
    );


    document.addEventListener(
      "paintless3d:render-failed",
      handleRenderFailed
    );


    document.addEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      handleActiveLayerChanged
    );


    document.addEventListener(
      "paintless:layer-selected",
      handleActiveLayerChanged
    );


    [
      "paintless3d:strength-changed",
      "paintless3d:convergence-changed",
      "paintless3d:channel-mode-changed",
      "paintless3d:swap-eyes-changed",
      "paintless3d:ghost-reduction-changed"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          handleStereoSettingChanged
        );

      }
    );

  }


  function disconnectEvents() {

    dom.closeButton
      ?.removeEventListener(
        "click",
        closePanel
      );


    dom.strengthSlider
      ?.removeEventListener(
        "input",
        handleStrengthInput
      );


    dom.strengthSlider
      ?.removeEventListener(
        "change",
        handleStrengthChange
      );


    dom.strengthNumber
      ?.removeEventListener(
        "input",
        handleStrengthInput
      );


    dom.strengthNumber
      ?.removeEventListener(
        "change",
        handleStrengthChange
      );


    dom.convergenceSlider
      ?.removeEventListener(
        "input",
        handleConvergenceInput
      );


    dom.convergenceSlider
      ?.removeEventListener(
        "change",
        handleConvergenceChange
      );


    dom.convergenceNumber
      ?.removeEventListener(
        "input",
        handleConvergenceInput
      );


    dom.convergenceNumber
      ?.removeEventListener(
        "change",
        handleConvergenceChange
      );


    dom.channelSelect
      ?.removeEventListener(
        "change",
        handleChannelChange
      );


    dom.swapEyesButton
      ?.removeEventListener(
        "click",
        toggleSwapEyes
      );


    dom.ghostSlider
      ?.removeEventListener(
        "input",
        handleGhostInput
      );


    dom.ghostSlider
      ?.removeEventListener(
        "change",
        handleGhostChange
      );


    dom.ghostNumber
      ?.removeEventListener(
        "input",
        handleGhostInput
      );


    dom.ghostNumber
      ?.removeEventListener(
        "change",
        handleGhostChange
      );


    dom.resetButton
      ?.removeEventListener(
        "click",
        resetStereoSettings
      );


    dom.renderButton
      ?.removeEventListener(
        "click",
        handleRenderButton
      );


    dom.previewButton
      ?.removeEventListener(
        "dblclick",
        handleExternalPreviewButtonDoubleClick
      );


    document.removeEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    document.removeEventListener(
      "paintless3d:render-completed",
      handleRenderCompleted
    );


    document.removeEventListener(
      "paintless3d:render-failed",
      handleRenderFailed
    );


    document.removeEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    document.removeEventListener(
      "paintless:active-layer-changed",
      handleActiveLayerChanged
    );


    document.removeEventListener(
      "paintless:layer-selected",
      handleActiveLayerChanged
    );


    [
      "paintless3d:strength-changed",
      "paintless3d:convergence-changed",
      "paintless3d:channel-mode-changed",
      "paintless3d:swap-eyes-changed",
      "paintless3d:ghost-reduction-changed"
    ].forEach(
      (eventName) => {

        document.removeEventListener(
          eventName,
          handleStereoSettingChanged
        );

      }
    );

  }


  /* =======================================================
     18. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      previewState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    const installed =
      installPreviewPanel();


    if (!installed) {

      throw new Error(
        "Paintless3D Preview could not find the right-side controls area."
      );

    }


    connectEvents();


    updateControls();

    updateStatistics();


    previewState.active =
      getPreviewEnabled();


    previewState.initialised =
      true;


    previewState.destroyed =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "preview",
        true
      );


    dispatch(
      "paintless3d:preview-ready",
      {
        preview:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Preview ready.",
      [
        "color:#25e6ff",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-2px 0 #ff315c"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     19. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    closePanel();


    dom.panel
      ?.remove();


    dom.styles
      ?.remove();


    previewState.initialised =
      false;


    previewState.destroyed =
      true;


    previewState.active =
      false;


    previewState.panelInstalled =
      false;


    previewState.stylesInstalled =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "preview",
        false
      );


    dispatch(
      "paintless3d:preview-destroyed"
    );


    return true;

  }


  /* =======================================================
     20. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      previewState,

    dom,


    initialise,

    destroy,


    openPanel,

    closePanel,

    togglePanel,


    updateControls,

    updateStatus,

    updateStatistics,


    setStrength,

    setConvergence,

    setChannelMode,

    setSwapEyes,

    toggleSwapEyes,

    setGhostReduction,

    resetStereoSettings,


    getStereoSettings,

    getPreviewEnabled,


    requestRender(
      reason =
        "preview-api-request"
    ) {

      return getRendererApi()
        ?.requestRender?.(
          reason
        ) ||
        false;

    },


    enablePreview() {

      return getCoreApi()
        ?.setPreviewEnabled?.(
          true
        );

    },


    disablePreview() {

      return getCoreApi()
        ?.setPreviewEnabled?.(
          false
        );

    },


    togglePreview() {

      return getCoreApi()
        ?.togglePreview?.();

    },


    isPanelOpen() {

      return previewState.panelOpen;

    },


    isInitialised() {

      return previewState.initialised;

    },


    getLastRenderInformation() {

      return {

        duration:
          previewState.lastRenderDuration,

        width:
          previewState.lastRenderWidth,

        height:
          previewState.lastRenderHeight,

        layers:
          previewState.lastRenderLayers,

        reason:
          previewState.lastRenderReason,

        error:
          previewState.lastRenderError,

        status:
          previewState.renderStatus

      };

    }

  };


  window.Paintless3DPreview =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "preview",
    {

      label:
        "Paintless3D Preview Controls",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
