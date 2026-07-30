"use strict";

/* =========================================================
   PAINTLESS3D
   EXPORT MODULE — v0.1

   File:
   js/paintless3d/export.js

   Features:
   - Exports the finished stereoscopic image at full resolution
   - Does not take a screenshot of the visible preview
   - Requests a fresh render directly from renderer.js
   - Supports:
       • Anaglyph PNG
       • Anaglyph WebP
       • Left-eye PNG
       • Right-eye PNG
       • Side-by-side PNG
   - Lets the user choose WebP quality
   - Preserves transparent backgrounds where possible
   - Creates safe downloadable filenames
   - Adds a compact Paintless3D Export panel
   - Keeps normal Paintless exporting untouched in 2D mode
   - Works entirely in the browser
   - No server or upload required

   Connected modules:
   - Paintless3D Core
   - Paintless3D Mode
   - Paintless3D Renderer
   - Paintless3D Preview
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
      "Paintless3D Export could not start because paintless3d.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. EXPORT STATE
  ======================================================= */

  const exportState = {

    initialised:
      false,

    destroyed:
      false,

    exporting:
      false,

    panelInstalled:
      false,

    stylesInstalled:
      false,

    panelOpen:
      false,

    selectedFormat:
      "anaglyph-webp",

    webpQuality:
      0.92,

    includeTransparency:
      true,

    addStereoSuffix:
      true,

    lastFilename:
      null,

    lastFormat:
      null,

    lastWidth:
      0,

    lastHeight:
      0,

    lastBlobSize:
      0,

    lastDuration:
      0,

    lastError:
      null,

    transitionDuration:
      150

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    controlParent:
      null,

    existingExportButton:
      null,

    panel:
      null,

    panelTitle:
      null,

    closeButton:
      null,

    formatSelect:
      null,

    qualityGroup:
      null,

    qualitySlider:
      null,

    qualityNumber:
      null,

    qualityValue:
      null,

    transparencyButton:
      null,

    stereoSuffixButton:
      null,

    filenameInput:
      null,

    exportButton:
      null,

    status:
      null,

    statusText:
      null,

    statistics:
      null,

    statisticsResolution:
      null,

    statisticsSize:
      null,

    statisticsTime:
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


  function getToolCore() {

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


  /* =======================================================
     5. HELPERS
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


  function createCanvas(
    width,
    height
  ) {

    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      Math.max(
        1,
        Math.round(
          width
        )
      );


    canvas.height =
      Math.max(
        1,
        Math.round(
          height
        )
      );


    return canvas;

  }


  function formatBytes(
    bytes
  ) {

    const value =
      Number(
        bytes
      );


    if (
      !Number.isFinite(
        value
      ) ||
      value <=
        0
    ) {

      return "—";

    }


    if (
      value <
      1024
    ) {

      return `${Math.round(
        value
      )} B`;

    }


    if (
      value <
      1024 *
      1024
    ) {

      return `${(
        value /
        1024
      ).toFixed(
        1
      )} KB`;

    }


    return `${(
      value /
      (
        1024 *
        1024
      )
    ).toFixed(
      2
    )} MB`;

  }


  function formatDuration(
    milliseconds
  ) {

    const value =
      Number(
        milliseconds
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      return "—";

    }


    if (
      value <
      1000
    ) {

      return `${Math.round(
        value
      )} ms`;

    }


    return `${(
      value /
      1000
    ).toFixed(
      2
    )} s`;

  }


  function sanitiseFilename(
    filename
  ) {

    const safeName =
      String(
        filename ||
        "paintless3d"
      )
        .trim()
        .replace(
          /[<>:"/\\|?*\u0000-\u001f]/g,
          "-"
        )
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )
        .replace(
          /^[-.]+|[-.]+$/g,
          ""
        );


    return safeName ||
      "paintless3d";

  }


  function removeExtension(
    filename
  ) {

    return String(
      filename ||
      ""
    ).replace(
      /\.[a-z0-9]+$/i,
      ""
    );

  }


  function getDocumentName() {

    const layersApi =
      getLayersApi();


    const name =
      layersApi
        ?.getDocumentName?.() ||
      getToolCore()
        ?.getDocumentName?.() ||
      document.title ||
      "paintless3d";


    return sanitiseFilename(
      removeExtension(
        name
      )
    );

  }


  function getDocumentSize() {

    const renderer =
      getRendererApi();


    const previewCanvas =
      renderer?.getPreviewCanvas?.();


    const editorCanvas =
      document.getElementById(
        "editor-canvas"
      );


    return {

      width:
        previewCanvas?.width ||
        editorCanvas?.width ||
        1,

      height:
        previewCanvas?.height ||
        editorCanvas?.height ||
        1

    };

  }


  /* =======================================================
     6. FORMAT DEFINITIONS
  ======================================================= */

  const formatDefinitions = {

    "anaglyph-webp": {

      label:
        "Anaglyph WebP",

      extension:
        "webp",

      mimeType:
        "image/webp",

      suffix:
        "-anaglyph",

      usesQuality:
        true

    },


    "anaglyph-png": {

      label:
        "Anaglyph PNG",

      extension:
        "png",

      mimeType:
        "image/png",

      suffix:
        "-anaglyph",

      usesQuality:
        false

    },


    "left-eye-png": {

      label:
        "Left Eye PNG",

      extension:
        "png",

      mimeType:
        "image/png",

      suffix:
        "-left-eye",

      usesQuality:
        false

    },


    "right-eye-png": {

      label:
        "Right Eye PNG",

      extension:
        "png",

      mimeType:
        "image/png",

      suffix:
        "-right-eye",

      usesQuality:
        false

    },


    "side-by-side-png": {

      label:
        "Side-by-Side PNG",

      extension:
        "png",

      mimeType:
        "image/png",

      suffix:
        "-side-by-side",

      usesQuality:
        false

    }

  };


  function getSelectedFormatDefinition() {

    return (
      formatDefinitions[
        exportState.selectedFormat
      ] ||
      formatDefinitions[
        "anaglyph-webp"
      ]
    );

  }


  function createExportFilename() {

    const definition =
      getSelectedFormatDefinition();


    const inputName =
      sanitiseFilename(
        removeExtension(
          dom.filenameInput?.value ||
          getDocumentName()
        )
      );


    const suffix =
      exportState.addStereoSuffix
        ? definition.suffix
        : "";


    return `${inputName}${suffix}.${definition.extension}`;

  }


  /* =======================================================
     7. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

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


    dom.existingExportButton =
      document.getElementById(
        "export-button"
      ) ||
      findFirst(
        [
          '[data-action="export"]',
          ".export-button"
        ]
      );

  }


  /* =======================================================
     8. STYLES
  ======================================================= */

  function installStyles() {

    if (
      exportState.stylesInstalled ||
      document.getElementById(
        "paintless3d-export-styles"
      )
    ) {

      exportState.stylesInstalled =
        true;


      return true;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-export-styles";


    style.textContent = `
      .paintless3d-export-panel {
        display: none;
        margin: 11px 0 3px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 13px;
        color: #ffffff;
        background:
          radial-gradient(
            circle at 6% 8%,
            rgba(255, 49, 92, 0.11),
            transparent 34%
          ),
          radial-gradient(
            circle at 94% 8%,
            rgba(37, 230, 255, 0.11),
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
      .paintless3d-export-panel.is-open {
        display: block;
      }

      .paintless3d-export-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .paintless3d-export-heading {
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

      .paintless3d-export-subtitle {
        display: block;
        margin-top: 3px;
        color: rgba(255, 255, 255, 0.46);
        font:
          500 9px/1.3
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-export-close {
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
      }

      .paintless3d-export-group {
        margin-top: 11px;
      }

      .paintless3d-export-label {
        display: block;
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.7);
        font:
          800 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .paintless3d-export-select,
      .paintless3d-export-filename,
      .paintless3d-export-number {
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
      }

      .paintless3d-export-filename,
      .paintless3d-export-number {
        background: rgba(255, 255, 255, 0.045);
      }

      .paintless3d-export-select:focus,
      .paintless3d-export-filename:focus,
      .paintless3d-export-number:focus {
        border-color: rgba(37, 230, 255, 0.62);
        box-shadow: 0 0 0 2px rgba(37, 230, 255, 0.08);
      }

      .paintless3d-export-quality-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 7px;
      }

      .paintless3d-export-quality-value {
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

      .paintless3d-export-quality-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 55px;
        align-items: center;
        gap: 8px;
      }

      .paintless3d-export-slider {
        width: 100%;
        height: 7px;
        margin: 0;
        appearance: none;
        border-radius: 999px;
        outline: none;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.86),
            rgba(168, 76, 255, 0.82),
            rgba(37, 230, 255, 0.9)
          );
        box-shadow:
          inset 0 1px 4px rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }

      .paintless3d-export-slider::-webkit-slider-thumb {
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
      }

      .paintless3d-export-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 35px;
        margin-top: 9px;
        padding: 6px 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.03);
      }

      .paintless3d-export-toggle-copy {
        min-width: 0;
      }

      .paintless3d-export-toggle-title {
        display: block;
        color: rgba(255, 255, 255, 0.72);
        font:
          800 9px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .paintless3d-export-toggle-description {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, 0.39);
        font:
          500 8px/1.25
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-export-toggle {
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

      .paintless3d-export-toggle::before {
        content: "";
        position: absolute;
        left: 3px;
        top: 3px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.72);
        transition:
          transform 150ms ease,
          background 150ms ease;
      }

      .paintless3d-export-toggle.is-enabled {
        border-color: rgba(37, 230, 255, 0.48);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.2),
            rgba(37, 230, 255, 0.2)
          );
      }

      .paintless3d-export-toggle.is-enabled::before {
        transform: translateX(19px);
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #25e6ff
          );
      }

      .paintless3d-export-action {
        width: 100%;
        min-height: 39px;
        margin-top: 12px;
        border: 1px solid rgba(37, 230, 255, 0.38);
        border-radius: 10px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.55),
            rgba(168, 76, 255, 0.72),
            rgba(37, 230, 255, 0.56)
          );
        font:
          900 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
          filter 120ms ease,
          transform 120ms ease;
      }

      .paintless3d-export-action:hover:not(:disabled) {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }

      .paintless3d-export-action:disabled {
        opacity: 0.5;
        cursor: wait;
      }

      .paintless3d-export-status {
        min-height: 31px;
        margin-top: 9px;
        padding: 7px 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.53);
        background: rgba(255, 255, 255, 0.027);
        font:
          700 9px/1.35
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-export-status.is-error {
        color: #ff8099;
        border-color: rgba(255, 49, 92, 0.25);
      }

      .paintless3d-export-status.is-success {
        color: #8ff7b4;
        border-color: rgba(105, 245, 156, 0.22);
      }

      .paintless3d-export-statistics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-top: 9px;
      }

      .paintless3d-export-stat {
        min-width: 0;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.025);
      }

      .paintless3d-export-stat-label {
        display: block;
        color: rgba(255, 255, 255, 0.33);
        font:
          700 7px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .paintless3d-export-stat-value {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.68);
        font:
          700 8px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    exportState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. PANEL CREATION
  ======================================================= */

  function createToggleRow(
    titleText,
    descriptionText
  ) {

    const row =
      createElement(
        "div",
        "paintless3d-export-toggle-row"
      );


    const copy =
      createElement(
        "span",
        "paintless3d-export-toggle-copy"
      );


    const title =
      createElement(
        "span",
        "paintless3d-export-toggle-title",
        titleText
      );


    const description =
      createElement(
        "span",
        "paintless3d-export-toggle-description",
        descriptionText
      );


    const button =
      createElement(
        "button",
        "paintless3d-export-toggle"
      );


    button.type =
      "button";


    button.setAttribute(
      "role",
      "switch"
    );


    copy.append(
      title,
      description
    );


    row.append(
      copy,
      button
    );


    return {

      row,

      button

    };

  }


  function createStatistic(
    labelText
  ) {

    const statistic =
      createElement(
        "span",
        "paintless3d-export-stat"
      );


    const label =
      createElement(
        "span",
        "paintless3d-export-stat-label",
        labelText
      );


    const value =
      createElement(
        "strong",
        "paintless3d-export-stat-value",
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


  function createExportPanel() {

    const panel =
      createElement(
        "section",
        "paintless3d-export-panel"
      );


    panel.id =
      "paintless3d-export-panel";


    const header =
      createElement(
        "div",
        "paintless3d-export-header"
      );


    const headingCopy =
      createElement(
        "span"
      );


    const heading =
      createElement(
        "h3",
        "paintless3d-export-heading",
        "Paintless3D Export"
      );


    const subtitle =
      createElement(
        "span",
        "paintless3d-export-subtitle",
        "Exports a fresh full-resolution stereo render."
      );


    const closeButton =
      createElement(
        "button",
        "paintless3d-export-close",
        "×"
      );


    closeButton.type =
      "button";


    closeButton.setAttribute(
      "aria-label",
      "Close Paintless3D export panel"
    );


    headingCopy.append(
      heading,
      subtitle
    );


    header.append(
      headingCopy,
      closeButton
    );


    const formatGroup =
      createElement(
        "div",
        "paintless3d-export-group"
      );


    const formatLabel =
      createElement(
        "label",
        "paintless3d-export-label",
        "Export format"
      );


    const formatSelect =
      document.createElement(
        "select"
      );


    formatSelect.className =
      "paintless3d-export-select";


    Object.entries(
      formatDefinitions
    ).forEach(
      (
        [
          value,
          definition
        ]
      ) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          value;


        option.textContent =
          definition.label;


        formatSelect.appendChild(
          option
        );

      }
    );


    formatSelect.value =
      exportState.selectedFormat;


    formatGroup.append(
      formatLabel,
      formatSelect
    );


    const filenameGroup =
      createElement(
        "div",
        "paintless3d-export-group"
      );


    const filenameLabel =
      createElement(
        "label",
        "paintless3d-export-label",
        "Filename"
      );


    const filenameInput =
      document.createElement(
        "input"
      );


    filenameInput.type =
      "text";


    filenameInput.className =
      "paintless3d-export-filename";


    filenameInput.value =
      getDocumentName();


    filenameInput.setAttribute(
      "aria-label",
      "Paintless3D export filename"
    );


    filenameGroup.append(
      filenameLabel,
      filenameInput
    );


    const qualityGroup =
      createElement(
        "div",
        "paintless3d-export-group"
      );


    const qualityHeading =
      createElement(
        "div",
        "paintless3d-export-quality-heading"
      );


    const qualityLabel =
      createElement(
        "span",
        "paintless3d-export-label",
        "WebP quality"
      );


    qualityLabel.style.marginBottom =
      "0";


    const qualityValue =
      createElement(
        "span",
        "paintless3d-export-quality-value",
        "92%"
      );


    qualityHeading.append(
      qualityLabel,
      qualityValue
    );


    const qualityRow =
      createElement(
        "div",
        "paintless3d-export-quality-row"
      );


    const qualitySlider =
      document.createElement(
        "input"
      );


    qualitySlider.type =
      "range";


    qualitySlider.className =
      "paintless3d-export-slider";


    qualitySlider.min =
      "10";


    qualitySlider.max =
      "100";


    qualitySlider.step =
      "1";


    qualitySlider.value =
      String(
        Math.round(
          exportState.webpQuality *
          100
        )
      );


    const qualityNumber =
      document.createElement(
        "input"
      );


    qualityNumber.type =
      "number";


    qualityNumber.className =
      "paintless3d-export-number";


    qualityNumber.min =
      "10";


    qualityNumber.max =
      "100";


    qualityNumber.step =
      "1";


    qualityNumber.value =
      qualitySlider.value;


    qualityRow.append(
      qualitySlider,
      qualityNumber
    );


    qualityGroup.append(
      qualityHeading,
      qualityRow
    );


    const transparency =
      createToggleRow(
        "Transparent background",
        "Keep empty pixels transparent where supported."
      );


    const suffix =
      createToggleRow(
        "Add stereo suffix",
        "Adds anaglyph, left-eye or right-eye to the filename."
      );


    const exportButton =
      createElement(
        "button",
        "paintless3d-export-action",
        "Export Full-Resolution 3D Image"
      );


    exportButton.type =
      "button";


    const status =
      createElement(
        "div",
        "paintless3d-export-status",
        "Ready to export."
      );


    const statistics =
      createElement(
        "div",
        "paintless3d-export-statistics"
      );


    const resolutionStatistic =
      createStatistic(
        "Resolution"
      );


    const sizeStatistic =
      createStatistic(
        "File size"
      );


    const timeStatistic =
      createStatistic(
        "Export time"
      );


    statistics.append(
      resolutionStatistic.statistic,
      sizeStatistic.statistic,
      timeStatistic.statistic
    );


    panel.append(
      header,
      formatGroup,
      filenameGroup,
      qualityGroup,
      transparency.row,
      suffix.row,
      exportButton,
      status,
      statistics
    );


    dom.panel =
      panel;


    dom.panelTitle =
      heading;


    dom.closeButton =
      closeButton;


    dom.formatSelect =
      formatSelect;


    dom.filenameInput =
      filenameInput;


    dom.qualityGroup =
      qualityGroup;


    dom.qualitySlider =
      qualitySlider;


    dom.qualityNumber =
      qualityNumber;


    dom.qualityValue =
      qualityValue;


    dom.transparencyButton =
      transparency.button;


    dom.stereoSuffixButton =
      suffix.button;


    dom.exportButton =
      exportButton;


    dom.status =
      status;


    dom.statusText =
      status;


    dom.statistics =
      statistics;


    dom.statisticsResolution =
      resolutionStatistic.value;


    dom.statisticsSize =
      sizeStatistic.value;


    dom.statisticsTime =
      timeStatistic.value;


    return panel;

  }


  function installExportPanel() {

    const existingPanel =
      document.getElementById(
        "paintless3d-export-panel"
      );


    if (existingPanel) {

      dom.panel =
        existingPanel;


      exportState.panelInstalled =
        true;


      return true;

    }


    if (!dom.controlParent) {

      return false;

    }


    dom.controlParent.appendChild(
      createExportPanel()
    );


    exportState.panelInstalled =
      true;


    return true;

  }


  /* =======================================================
     10. PANEL STATE
  ======================================================= */

  function openPanel() {

    if (!dom.panel) {

      return false;

    }


    exportState.panelOpen =
      true;


    dom.panel.classList.add(
      "is-open"
    );


    updateControls();


    return true;

  }


  function closePanel() {

    if (!dom.panel) {

      return false;

    }


    exportState.panelOpen =
      false;


    dom.panel.classList.remove(
      "is-open"
    );


    return true;

  }


  function togglePanel() {

    return exportState.panelOpen
      ? closePanel()
      : openPanel();

  }


  function updateStatus(
    message,
    type =
      "normal"
  ) {

    if (!dom.status) {

      return false;

    }


    dom.status.textContent =
      message;


    dom.status.classList.remove(
      "is-error",
      "is-success"
    );


    if (
      type ===
      "error"
    ) {

      dom.status.classList.add(
        "is-error"
      );

    }


    if (
      type ===
      "success"
    ) {

      dom.status.classList.add(
        "is-success"
      );

    }


    return true;

  }


  function updateStatistics() {

    if (dom.statisticsResolution) {

      dom.statisticsResolution.textContent =
        exportState.lastWidth &&
        exportState.lastHeight
          ? `${exportState.lastWidth} × ${exportState.lastHeight}`
          : "—";

    }


    if (dom.statisticsSize) {

      dom.statisticsSize.textContent =
        formatBytes(
          exportState.lastBlobSize
        );

    }


    if (dom.statisticsTime) {

      dom.statisticsTime.textContent =
        exportState.lastDuration
          ? formatDuration(
              exportState.lastDuration
            )
          : "—";

    }

  }


  function updateToggle(
    button,
    enabled
  ) {

    button
      ?.classList.toggle(
        "is-enabled",
        Boolean(
          enabled
        )
      );


    button
      ?.setAttribute(
        "aria-checked",
        String(
          Boolean(
            enabled
          )
        )
      );

  }


  function updateControls() {

    const definition =
      getSelectedFormatDefinition();


    if (dom.formatSelect) {

      dom.formatSelect.value =
        exportState.selectedFormat;

    }


    if (dom.qualityGroup) {

      dom.qualityGroup.hidden =
        !definition.usesQuality;

    }


    const qualityPercent =
      Math.round(
        exportState.webpQuality *
        100
      );


    if (dom.qualitySlider) {

      dom.qualitySlider.value =
        String(
          qualityPercent
        );

    }


    if (dom.qualityNumber) {

      dom.qualityNumber.value =
        String(
          qualityPercent
        );

    }


    if (dom.qualityValue) {

      dom.qualityValue.textContent =
        `${qualityPercent}%`;

    }


    updateToggle(
      dom.transparencyButton,
      exportState.includeTransparency
    );


    updateToggle(
      dom.stereoSuffixButton,
      exportState.addStereoSuffix
    );


    return true;

  }


  /* =======================================================
     11. CANVAS CREATION
  ======================================================= */

  function copyCanvas(
    sourceCanvas
  ) {

    if (!sourceCanvas) {

      return null;

    }


    const canvas =
      createCanvas(
        sourceCanvas.width,
        sourceCanvas.height
      );


    canvas
      .getContext(
        "2d",
        {
          alpha:
            true
        }
      )
      .drawImage(
        sourceCanvas,
        0,
        0
      );


    return canvas;

  }


  function flattenTransparency(
    canvas,
    colour =
      "#ffffff"
  ) {

    if (
      !canvas ||
      exportState.includeTransparency
    ) {

      return canvas;

    }


    const flattened =
      createCanvas(
        canvas.width,
        canvas.height
      );


    const context =
      flattened.getContext(
        "2d"
      );


    context.fillStyle =
      colour;


    context.fillRect(
      0,
      0,
      flattened.width,
      flattened.height
    );


    context.drawImage(
      canvas,
      0,
      0
    );


    return flattened;

  }


  function createAnaglyphCanvas() {

    const renderer =
      getRendererApi();


    if (
      typeof renderer?.renderToCanvas !==
      "function"
    ) {

      throw new Error(
        "Paintless3D Renderer is unavailable."
      );

    }


    const size =
      getDocumentSize();


    const targetCanvas =
      createCanvas(
        size.width,
        size.height
      );


    renderer.renderToCanvas(
      {
        width:
          size.width,

        height:
          size.height,

        targetCanvas,

        reason:
          "full-resolution-export"
      }
    );


    return flattenTransparency(
      targetCanvas
    );

  }


  function createEyeCanvas(
    eye
  ) {

    /*
     * Rendering the anaglyph first ensures the renderer's
     * internal left and right eye canvases are up to date.
     */

    createAnaglyphCanvas();


    const renderer =
      getRendererApi();


    const sourceCanvas =
      eye ===
      "right"
        ? renderer
            ?.getRightEyeCanvas?.()
        : renderer
            ?.getLeftEyeCanvas?.();


    if (!sourceCanvas) {

      throw new Error(
        `${eye} eye rendering is unavailable.`
      );

    }


    return flattenTransparency(
      copyCanvas(
        sourceCanvas
      )
    );

  }


  function createSideBySideCanvas() {

    createAnaglyphCanvas();


    const renderer =
      getRendererApi();


    const leftCanvas =
      renderer
        ?.getLeftEyeCanvas?.();


    const rightCanvas =
      renderer
        ?.getRightEyeCanvas?.();


    if (
      !leftCanvas ||
      !rightCanvas
    ) {

      throw new Error(
        "Paintless3D could not create the stereo eye canvases."
      );

    }


    const canvas =
      createCanvas(
        leftCanvas.width *
        2,
        leftCanvas.height
      );


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !exportState.includeTransparency
    ) {

      context.fillStyle =
        "#ffffff";


      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    }


    context.drawImage(
      leftCanvas,
      0,
      0
    );


    context.drawImage(
      rightCanvas,
      leftCanvas.width,
      0
    );


    return canvas;

  }


  function createCanvasForSelectedFormat() {

    switch (
      exportState.selectedFormat
    ) {

      case "left-eye-png":

        return createEyeCanvas(
          "left"
        );


      case "right-eye-png":

        return createEyeCanvas(
          "right"
        );


      case "side-by-side-png":

        return createSideBySideCanvas();


      case "anaglyph-png":
      case "anaglyph-webp":
      default:

        return createAnaglyphCanvas();

    }

  }


  /* =======================================================
     12. BLOB AND DOWNLOAD
  ======================================================= */

  function canvasToBlob(
    canvas,
    mimeType,
    quality
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        if (!canvas) {

          reject(
            new Error(
              "No export canvas was produced."
            )
          );


          return;

        }


        canvas.toBlob(
          (blob) => {

            if (!blob) {

              reject(
                new Error(
                  `The browser could not encode ${mimeType}.`
                )
              );


              return;

            }


            resolve(
              blob
            );

          },
          mimeType,
          quality
        );

      }
    );

  }


  function downloadBlob(
    blob,
    filename
  ) {

    const objectUrl =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        "a"
      );


    anchor.href =
      objectUrl;


    anchor.download =
      filename;


    anchor.style.display =
      "none";


    document.body.appendChild(
      anchor
    );


    anchor.click();


    anchor.remove();


    window.setTimeout(
      () => {

        URL.revokeObjectURL(
          objectUrl
        );

      },
      1500
    );


    return true;

  }


  /* =======================================================
     13. EXPORT
  ======================================================= */

  async function exportImage({
    download =
      true
  } = {}) {

    if (
      exportState.exporting
    ) {

      return false;

    }


    if (
      !paintless3d.is3DMode?.()
    ) {

      getCoreApi()
        ?.requestMode?.(
          "3d"
        );

    }


    const definition =
      getSelectedFormatDefinition();


    const filename =
      createExportFilename();


    exportState.exporting =
      true;


    exportState.lastError =
      null;


    dom.exportButton &&
      (
        dom.exportButton.disabled =
          true
      );


    updateStatus(
      "Rendering full-resolution stereo image…"
    );


    sendStatusMessage(
      "Paintless3D is preparing the full-resolution export."
    );


    dispatch(
      "paintless3d:export-started",
      {
        format:
          exportState.selectedFormat,

        filename
      }
    );


    const startedAt =
      performance.now();


    try {

      const canvas =
        createCanvasForSelectedFormat();


      updateStatus(
        `Encoding ${definition.label}…`
      );


      const blob =
        await canvasToBlob(
          canvas,
          definition.mimeType,
          definition.usesQuality
            ? exportState.webpQuality
            : undefined
        );


      if (download) {

        downloadBlob(
          blob,
          filename
        );

      }


      exportState.lastFilename =
        filename;


      exportState.lastFormat =
        exportState.selectedFormat;


      exportState.lastWidth =
        canvas.width;


      exportState.lastHeight =
        canvas.height;


      exportState.lastBlobSize =
        blob.size;


      exportState.lastDuration =
        performance.now() -
        startedAt;


      updateStatistics();


      updateStatus(
        `${filename} exported successfully.`,
        "success"
      );


      sendStatusMessage(
        `Paintless3D exported ${filename}.`
      );


      dispatch(
        "paintless3d:export-completed",
        {
          filename,

          format:
            exportState.selectedFormat,

          mimeType:
            definition.mimeType,

          blob,

          canvas,

          width:
            canvas.width,

          height:
            canvas.height,

          size:
            blob.size,

          duration:
            exportState.lastDuration
        }
      );


      return {

        filename,

        format:
          exportState.selectedFormat,

        mimeType:
          definition.mimeType,

        blob,

        canvas,

        width:
          canvas.width,

        height:
          canvas.height,

        duration:
          exportState.lastDuration

      };

    } catch (error) {

      exportState.lastError =
        error;


      console.error(
        "Paintless3D export failed:",
        error
      );


      updateStatus(
        error.message ||
        "Paintless3D export failed.",
        "error"
      );


      sendStatusMessage(
        "Paintless3D could not export the image."
      );


      dispatch(
        "paintless3d:export-failed",
        {
          error,

          format:
            exportState.selectedFormat,

          filename
        }
      );


      return false;

    } finally {

      exportState.exporting =
        false;


      if (dom.exportButton) {

        dom.exportButton.disabled =
          false;

      }

    }

  }


  /* =======================================================
     14. SETTERS
  ======================================================= */

  function setFormat(
    format
  ) {

    if (
      !formatDefinitions[
        format
      ]
    ) {

      return false;

    }


    exportState.selectedFormat =
      format;


    updateControls();


    return format;

  }


  function setWebPQuality(
    value
  ) {

    const percentage =
      clamp(
        Number(
          value
        ),
        10,
        100
      );


    exportState.webpQuality =
      percentage /
      100;


    updateControls();


    return exportState.webpQuality;

  }


  function setTransparency(
    enabled
  ) {

    exportState.includeTransparency =
      Boolean(
        enabled
      );


    updateControls();


    return exportState.includeTransparency;

  }


  function setStereoSuffix(
    enabled
  ) {

    exportState.addStereoSuffix =
      Boolean(
        enabled
      );


    updateControls();


    return exportState.addStereoSuffix;

  }


  /* =======================================================
     15. EVENT HANDLERS
  ======================================================= */

  function handleFormatChange(
    event
  ) {

    setFormat(
      event.target.value
    );

  }


  function handleQualityInput(
    event
  ) {

    setWebPQuality(
      event.target.value
    );

  }


  function handleExistingExportClick(
    event
  ) {

    if (
      !paintless3d.is3DMode?.()
    ) {

      return;

    }


    event.preventDefault();

    event.stopImmediatePropagation();


    togglePanel();

  }


  function handleModeChanged(
    event
  ) {

    if (
      event.detail?.mode !==
      "3d"
    ) {

      closePanel();

    }

  }


  function connectEvents() {

    dom.closeButton
      ?.addEventListener(
        "click",
        closePanel
      );


    dom.formatSelect
      ?.addEventListener(
        "change",
        handleFormatChange
      );


    dom.qualitySlider
      ?.addEventListener(
        "input",
        handleQualityInput
      );


    dom.qualityNumber
      ?.addEventListener(
        "input",
        handleQualityInput
      );


    dom.transparencyButton
      ?.addEventListener(
        "click",
        () => {

          setTransparency(
            !exportState.includeTransparency
          );

        }
      );


    dom.stereoSuffixButton
      ?.addEventListener(
        "click",
        () => {

          setStereoSuffix(
            !exportState.addStereoSuffix
          );

        }
      );


    dom.exportButton
      ?.addEventListener(
        "click",
        () => {

          exportImage();

        }
      );


    dom.existingExportButton
      ?.addEventListener(
        "click",
        handleExistingExportClick,
        true
      );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:open-export-requested",
      openPanel
    );

  }


  function disconnectEvents() {

    dom.closeButton
      ?.removeEventListener(
        "click",
        closePanel
      );


    dom.formatSelect
      ?.removeEventListener(
        "change",
        handleFormatChange
      );


    dom.qualitySlider
      ?.removeEventListener(
        "input",
        handleQualityInput
      );


    dom.qualityNumber
      ?.removeEventListener(
        "input",
        handleQualityInput
      );


    dom.existingExportButton
      ?.removeEventListener(
        "click",
        handleExistingExportClick,
        true
      );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:open-export-requested",
      openPanel
    );

  }


  /* =======================================================
     16. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      exportState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    const installed =
      installExportPanel();


    if (!installed) {

      throw new Error(
        "Paintless3D Export could not find the right-side controls area."
      );

    }


    connectEvents();


    updateControls();

    updateStatistics();


    exportState.initialised =
      true;


    exportState.destroyed =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "export",
        true
      );


    dispatch(
      "paintless3d:export-ready",
      {
        export:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Export ready.",
      [
        "color:#69f59c",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-1px 0 #ff315c, 1px 0 #25e6ff"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     17. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    closePanel();


    dom.panel
      ?.remove();


    dom.styles
      ?.remove();


    exportState.initialised =
      false;


    exportState.destroyed =
      true;


    exportState.panelInstalled =
      false;


    exportState.stylesInstalled =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "export",
        false
      );


    dispatch(
      "paintless3d:export-destroyed"
    );


    return true;

  }


  /* =======================================================
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      exportState,

    dom,

    formatDefinitions,


    initialise,

    destroy,


    openPanel,

    closePanel,

    togglePanel,


    exportImage,

    createCanvasForSelectedFormat,

    createAnaglyphCanvas,

    createEyeCanvas,

    createSideBySideCanvas,


    setFormat,

    setWebPQuality,

    setTransparency,

    setStereoSuffix,


    createExportFilename,

    sanitiseFilename,


    getSelectedFormat() {

      return exportState.selectedFormat;

    },


    getSelectedFormatDefinition() {

      return {
        ...getSelectedFormatDefinition()
      };

    },


    isExporting() {

      return exportState.exporting;

    },


    isPanelOpen() {

      return exportState.panelOpen;

    },


    getLastExport() {

      return {

        filename:
          exportState.lastFilename,

        format:
          exportState.lastFormat,

        width:
          exportState.lastWidth,

        height:
          exportState.lastHeight,

        size:
          exportState.lastBlobSize,

        duration:
          exportState.lastDuration,

        error:
          exportState.lastError

      };

    }

  };


  window.Paintless3DExport =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "export",
    {

      label:
        "Paintless3D Export",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
