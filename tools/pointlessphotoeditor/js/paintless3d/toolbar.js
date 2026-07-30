"use strict";

/* =========================================================
   PAINTLESS3D
   DEDICATED TOP TOOLBAR — v0.1

   File:
   js/paintless3d/toolbar.js

   Purpose:
   - Permanently owns the Paintless 2D / 3D switch
   - Inserts itself into the existing Paintless top toolbar
   - Shows whether live stereoscopic rendering is active
   - Opens Live 3D Settings
   - Opens Paintless3D Export
   - Does not interfere with ordinary Paintless tools
   - Updates automatically when the mode changes
   - Loads last, after all other Paintless3D modules
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
      "Paintless3D Toolbar could not start because paintless3d.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. TOOLBAR STATE
  ======================================================= */

  const toolbarState = {

    initialised:
      false,

    destroyed:
      false,

    installed:
      false,

    stylesInstalled:
      false,

    mode:
      "2d",

    live:
      false,

    settingsOpen:
      false,

    exportOpen:
      false,

    updating:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    toolbarParent:
      null,

    existingOldSwitch:
      null,

    existingOldPreviewButton:
      null,

    container:
      null,

    modeControl:
      null,

    modeButton:
      null,

    modeTrack:
      null,

    modeThumb:
      null,

    label2D:
      null,

    label3D:
      null,

    glassesIcon:
      null,

    liveIndicator:
      null,

    liveDot:
      null,

    liveText:
      null,

    settingsButton:
      null,

    exportButton:
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


  function getSettingsApi() {

    return (
      window.Paintless3DSettings ||
      window.Paintless3DPreview ||
      paintless3d.getModule?.(
        "preview"
      )?.api ||
      null
    );

  }


  function getExportApi() {

    return (
      window.Paintless3DExport ||
      paintless3d.getModule?.(
        "export"
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


  function is3DMode() {

    if (
      typeof paintless3d.is3DMode ===
      "function"
    ) {

      return Boolean(
        paintless3d.is3DMode()
      );

    }


    if (
      typeof getCoreApi()
        ?.is3DMode ===
      "function"
    ) {

      return Boolean(
        getCoreApi()
          .is3DMode()
      );

    }


    return (
      document.documentElement
        .dataset.paintlessMode ===
        "3d" ||
      document.body
        ?.classList.contains(
          "paintless-3d-mode"
        ) ||
      document.body
        ?.classList.contains(
          "paintless3d-editor-active"
        )
    );

  }


  /* =======================================================
     6. FIND THE EXISTING TOP TOOLBAR
  ======================================================= */

  function collectDomReferences() {

  dom.existingOldSwitch =
    document.getElementById(
      "paintless3d-mode-switch"
    );


  dom.existingOldPreviewButton =
    document.getElementById(
      "paintless3d-preview-button"
    );


  const importButton =
    findFirst(
      [
        "#import-button",
        '[data-action="import"]',
        ".import-button"
      ]
    );


  const exportButton =
    findFirst(
      [
        "#export-button",
        '[data-action="export"]',
        ".export-button"
      ]
    );


  const zoomValue =
    findFirst(
      [
        "#zoom-value",
        "[data-zoom-value]",
        ".zoom-value"
      ]
    );


  dom.toolbarParent =
    importButton?.parentElement ||
    exportButton?.parentElement ||
    zoomValue?.parentElement ||
    null;


  if (
    dom.toolbarParent &&
    dom.toolbarParent.children.length <= 1
  ) {

    dom.toolbarParent =
      dom.toolbarParent.parentElement;

  }


  return Boolean(
    dom.toolbarParent
  );

}
  /* =======================================================
     7. REMOVE OLD TEMPORARY CONTROLS
  ======================================================= */

  function removeOldControls() {

    const oldToolbar =
      document.getElementById(
        "paintless3d-dedicated-toolbar"
      );


    oldToolbar?.remove();


    /*
     * Remove the temporary controls from previous versions.
     * The dedicated toolbar now permanently owns them.
     */

    if (
      dom.existingOldSwitch &&
      !dom.existingOldSwitch.closest(
        "#paintless3d-dedicated-toolbar"
      )
    ) {

      dom.existingOldSwitch.remove();

    }


    if (
      dom.existingOldPreviewButton &&
      !dom.existingOldPreviewButton.closest(
        "#paintless3d-dedicated-toolbar"
      )
    ) {

      dom.existingOldPreviewButton.remove();

    }


    return true;

  }


  /* =======================================================
     8. STYLES
  ======================================================= */

  function installStyles() {

    const existingStyles =
      document.getElementById(
        "paintless3d-toolbar-styles"
      );


    if (existingStyles) {

      existingStyles.remove();

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-toolbar-styles";


    style.textContent = `
      #paintless3d-dedicated-toolbar {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
        min-width: 0;
        margin-left: auto;
        margin-right: 8px;
        padding: 3px 5px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 13px;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.055),
            rgba(168, 76, 255, 0.08),
            rgba(37, 230, 255, 0.055)
          ),
          rgba(255, 255, 255, 0.018);
        box-shadow:
          inset 0 0 0 1px rgba(168, 76, 255, 0.025);
        white-space: nowrap;
      }

      .paintless3d-toolbar-mode {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .paintless3d-toolbar-glasses {
        display: inline-grid;
        place-items: center;
        width: 24px;
        height: 24px;
        flex: 0 0 auto;
        color: #ffffff;
        font-size: 15px;
        line-height: 1;
        filter:
          drop-shadow(-2px 0 3px rgba(255, 49, 92, 0.32))
          drop-shadow(2px 0 3px rgba(37, 230, 255, 0.32));
      }

      .paintless3d-toolbar-mode-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 30px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.035);
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
        transition:
          border-color 150ms ease,
          background 150ms ease,
          box-shadow 150ms ease;
      }

      .paintless3d-toolbar-mode-button:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.07);
      }

      .paintless3d-toolbar-mode-label {
        min-width: 17px;
        color: rgba(255, 255, 255, 0.46);
        font:
          900 9px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-align: center;
        transition:
          color 150ms ease,
          text-shadow 150ms ease;
      }

      .paintless3d-toolbar-mode-label.is-active {
        color: #ffffff;
      }

      .paintless3d-toolbar-mode-label.is-2d.is-active {
        text-shadow:
          0 0 7px rgba(255, 255, 255, 0.28);
      }

      .paintless3d-toolbar-mode-label.is-3d.is-active {
        text-shadow:
          -1px 0 5px rgba(255, 49, 92, 0.75),
          1px 0 5px rgba(37, 230, 255, 0.75);
      }

      .paintless3d-toolbar-track {
        position: relative;
        display: block;
        width: 42px;
        height: 20px;
        flex: 0 0 auto;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.2),
            rgba(168, 76, 255, 0.17),
            rgba(37, 230, 255, 0.2)
          );
        box-shadow:
          inset 0 2px 5px rgba(0, 0, 0, 0.4);
      }

      .paintless3d-toolbar-thumb {
        position: absolute;
        left: 3px;
        top: 3px;
        width: 12px;
        height: 12px;
        border: 1px solid rgba(255, 255, 255, 0.86);
        border-radius: 50%;
        background: #ffffff;
        box-shadow:
          0 2px 5px rgba(0, 0, 0, 0.5);
        transition:
          transform 170ms cubic-bezier(0.2, 0.8, 0.2, 1),
          background 170ms ease,
          box-shadow 170ms ease;
      }

      .paintless3d-toolbar-mode-button.is-3d
      .paintless3d-toolbar-thumb {
        transform: translateX(22px);
        background:
          linear-gradient(
            90deg,
            #ff315c,
            #a84cff,
            #25e6ff
          );
        box-shadow:
          -3px 0 7px rgba(255, 49, 92, 0.35),
          3px 0 7px rgba(37, 230, 255, 0.38),
          0 2px 5px rgba(0, 0, 0, 0.5);
      }

      .paintless3d-toolbar-mode-button.is-3d {
        border-color: rgba(37, 230, 255, 0.4);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.1),
            rgba(37, 230, 255, 0.11)
          );
        box-shadow:
          -2px 0 8px rgba(255, 49, 92, 0.075),
          2px 0 8px rgba(37, 230, 255, 0.075);
      }

      .paintless3d-toolbar-live {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 26px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.38);
        background: rgba(255, 255, 255, 0.025);
        font:
          800 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .paintless3d-toolbar-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.28);
      }

      .paintless3d-toolbar-live.is-live {
        color: #a4ffc1;
        border-color: rgba(105, 245, 156, 0.23);
        background: rgba(105, 245, 156, 0.055);
      }

      .paintless3d-toolbar-live.is-live
      .paintless3d-toolbar-live-dot {
        background: #69f59c;
        box-shadow:
          0 0 7px rgba(105, 245, 156, 0.75);
      }

      .paintless3d-toolbar-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: 29px;
        min-width: 29px;
        padding: 0 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.035);
        font:
          800 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        cursor: pointer;
        touch-action: manipulation;
        transition:
          color 120ms ease,
          border-color 120ms ease,
          background 120ms ease,
          transform 120ms ease;
      }

      .paintless3d-toolbar-action:hover:not(:disabled) {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.075);
        transform: translateY(-1px);
      }

      .paintless3d-toolbar-action.is-active {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.45);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.12),
            rgba(37, 230, 255, 0.14)
          );
      }

      .paintless3d-toolbar-action:disabled {
        opacity: 0.34;
        cursor: not-allowed;
      }

      .paintless3d-toolbar-action-icon {
        font-size: 12px;
        line-height: 1;
      }

      @media (max-width: 1080px) {
        #paintless3d-dedicated-toolbar {
          gap: 4px;
          margin-inline: 4px;
          padding-inline: 4px;
        }

        .paintless3d-toolbar-live-text,
        .paintless3d-toolbar-action-label {
          display: none;
        }

        .paintless3d-toolbar-action {
          padding-inline: 6px;
        }
      }

      @media (max-width: 780px) {
        .paintless3d-toolbar-live {
          display: none;
        }

        .paintless3d-toolbar-glasses {
          display: none;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    toolbarState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. BUILD TOOLBAR
  ======================================================= */

  function createActionButton(
    icon,
    label,
    ariaLabel
  ) {

    const button =
      createElement(
        "button",
        "paintless3d-toolbar-action"
      );


    button.type =
      "button";


    button.setAttribute(
      "aria-label",
      ariaLabel
    );


    button.title =
      ariaLabel;


    const iconElement =
      createElement(
        "span",
        "paintless3d-toolbar-action-icon",
        icon
      );


    iconElement.setAttribute(
      "aria-hidden",
      "true"
    );


    const labelElement =
      createElement(
        "span",
        "paintless3d-toolbar-action-label",
        label
      );


    button.append(
      iconElement,
      labelElement
    );


    return button;

  }


  function createToolbar() {

    const container =
      createElement(
        "section"
      );


    container.id =
      "paintless3d-dedicated-toolbar";


    container.setAttribute(
      "aria-label",
      "Paintless3D toolbar"
    );


    const modeControl =
      createElement(
        "div",
        "paintless3d-toolbar-mode"
      );


    const glassesIcon =
      createElement(
        "span",
        "paintless3d-toolbar-glasses",
        "👓"
      );


    glassesIcon.setAttribute(
      "aria-hidden",
      "true"
    );


    const modeButton =
      createElement(
        "button",
        "paintless3d-toolbar-mode-button"
      );


    modeButton.id =
      "paintless3d-mode-switch";


    modeButton.type =
      "button";


    modeButton.setAttribute(
      "role",
      "switch"
    );


    modeButton.setAttribute(
      "aria-label",
      "Switch between Paintless 2D and Paintless3D"
    );


    modeButton.setAttribute(
      "aria-checked",
      "false"
    );


    const label2D =
      createElement(
        "span",
        "paintless3d-toolbar-mode-label is-2d",
        "2D"
      );


    const track =
      createElement(
        "span",
        "paintless3d-toolbar-track"
      );


    const thumb =
      createElement(
        "span",
        "paintless3d-toolbar-thumb"
      );


    track.appendChild(
      thumb
    );


    const label3D =
      createElement(
        "span",
        "paintless3d-toolbar-mode-label is-3d",
        "3D"
      );


    modeButton.append(
      label2D,
      track,
      label3D
    );


    modeControl.append(
      glassesIcon,
      modeButton
    );


    const liveIndicator =
      createElement(
        "span",
        "paintless3d-toolbar-live"
      );


    const liveDot =
      createElement(
        "span",
        "paintless3d-toolbar-live-dot"
      );


    const liveText =
      createElement(
        "span",
        "paintless3d-toolbar-live-text",
        "3D Off"
      );


    liveIndicator.append(
      liveDot,
      liveText
    );


    const settingsButton =
      createActionButton(
        "⚙",
        "Settings",
        "Open Paintless3D live settings"
      );


    settingsButton.id =
      "paintless3d-preview-button";


    const exportButton =
      createActionButton(
        "⬇",
        "3D Export",
        "Open Paintless3D export"
      );


    container.append(
      modeControl,
      liveIndicator,
      settingsButton,
      exportButton
    );


    dom.container =
      container;


    dom.modeControl =
      modeControl;


    dom.modeButton =
      modeButton;


    dom.modeTrack =
      track;


    dom.modeThumb =
      thumb;


    dom.label2D =
      label2D;


    dom.label3D =
      label3D;


    dom.glassesIcon =
      glassesIcon;


    dom.liveIndicator =
      liveIndicator;


    dom.liveDot =
      liveDot;


    dom.liveText =
      liveText;


    dom.settingsButton =
      settingsButton;


    dom.exportButton =
      exportButton;


    return container;

  }


  /* =======================================================
     10. INSTALL TOOLBAR
  ======================================================= */

  function installToolbar() {

    if (!dom.toolbarParent) {

      return false;

    }


    const toolbar =
      createToolbar();


    /*
     * Prefer placing the Paintless3D controls near the zoom
     * controls and before Import / Export.
     */

    const importButton =
      findFirst(
        [
          "#import-button",
          "[data-action='import']",
          ".import-button"
        ]
      );


    const normalExportButton =
      findFirst(
        [
          "#export-button",
          "[data-action='export']",
          ".export-button"
        ]
      );


    const insertionTarget =
     importButton?.parentElement ===
       dom.toolbarParent
       ? importButton
       : normalExportButton?.parentElement ===
           dom.toolbarParent
           ? normalExportButton
           : importButton ||
           normalExportButton ||
           null;


    if (insertionTarget) {

      dom.toolbarParent.insertBefore(
        toolbar,
        insertionTarget
      );

    } else {

      dom.toolbarParent.appendChild(
        toolbar
      );

    }


    toolbarState.installed =
      true;


    return true;

  }


  /* =======================================================
     11. MODE CONTROL
  ======================================================= */

  function requestMode(
    mode,
    {
      announce =
        true
    } = {}
  ) {

    const safeMode =
      mode ===
        "3d"
        ? "3d"
        : "2d";


    const coreApi =
      getCoreApi();


    const modeApi =
      getModeApi();


    let result =
      false;


    if (
      typeof coreApi?.requestMode ===
      "function"
    ) {

      result =
        coreApi.requestMode(
          safeMode,
          {
            announce:
              false
          }
        );

    } else if (
      typeof modeApi?.requestMode ===
      "function"
    ) {

      result =
        modeApi.requestMode(
          safeMode
        );

    } else if (
      typeof modeApi?.setMode ===
      "function"
    ) {

      result =
        modeApi.setMode(
          safeMode
        );

    } else if (
      typeof paintless3d.setMode ===
      "function"
    ) {

      result =
        paintless3d.setMode(
          safeMode
        );

    } else {

      dispatch(
        "paintless3d:mode-requested",
        {
          mode:
            safeMode
        }
      );


      result =
        safeMode;

    }


    if (announce) {

      sendStatusMessage(
        safeMode ===
          "3d"
          ? "Live Paintless3D workspace enabled."
          : "Paintless returned to 2D mode."
      );

    }


    return result;

  }


  function toggleMode() {

    return requestMode(
      is3DMode()
        ? "2d"
        : "3d"
    );

  }


  /* =======================================================
     12. OPEN SETTINGS AND EXPORT
  ======================================================= */

  function toggleSettings() {

    if (
      !is3DMode()
    ) {

      requestMode(
        "3d",
        {
          announce:
            false
        }
      );

    }


    const settingsApi =
      getSettingsApi();


    if (
      typeof settingsApi?.togglePanel ===
      "function"
    ) {

      settingsApi.togglePanel();

    } else if (
      typeof getCoreApi()
        ?.toggleSettingsPanel ===
      "function"
    ) {

      getCoreApi()
        .toggleSettingsPanel();

    } else {

      dispatch(
        "paintless3d:open-settings-requested"
      );

    }


    return true;

  }


  function openExport() {

    if (
      !is3DMode()
    ) {

      requestMode(
        "3d",
        {
          announce:
            false
        }
      );

    }


    const exportApi =
      getExportApi();


    if (
      typeof exportApi?.openPanel ===
      "function"
    ) {

      exportApi.openPanel();

    } else {

      dispatch(
        "paintless3d:open-export-requested"
      );

    }


    return true;

  }


  /* =======================================================
     13. DISPLAY UPDATE
  ======================================================= */

  function updateModeDisplay() {

    const mode3D =
      is3DMode();


    toolbarState.mode =
      mode3D
        ? "3d"
        : "2d";


    dom.modeButton
      ?.classList.toggle(
        "is-3d",
        mode3D
      );


    dom.modeButton
      ?.setAttribute(
        "aria-checked",
        String(
          mode3D
        )
      );


    dom.label2D
      ?.classList.toggle(
        "is-active",
        !mode3D
      );


    dom.label3D
      ?.classList.toggle(
        "is-active",
        mode3D
      );


    if (dom.modeButton) {

      dom.modeButton.title =
        mode3D
          ? "Return to normal 2D editing"
          : "Enter the live Paintless3D workspace";

    }


    return mode3D;

  }


  function updateLiveDisplay() {

    const live =
      Boolean(
        is3DMode() &&
        (
          getRendererApi()
            ?.isEnabled?.() ??
          true
        )
      );


    toolbarState.live =
      live;


    dom.liveIndicator
      ?.classList.toggle(
        "is-live",
        live
      );


    if (dom.liveText) {

      dom.liveText.textContent =
        live
          ? "Live 3D"
          : "3D Off";

    }


    if (dom.settingsButton) {

      dom.settingsButton.disabled =
        !is3DMode();

    }


    if (dom.exportButton) {

      dom.exportButton.disabled =
        !is3DMode();

    }


    return live;

  }


  function updatePanelDisplay() {

    const settingsPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );


    const exportPanel =
      document.getElementById(
        "paintless3d-export-panel"
      );


    toolbarState.settingsOpen =
      Boolean(
        settingsPanel
          ?.classList.contains(
            "is-open"
          )
      );


    toolbarState.exportOpen =
      Boolean(
        exportPanel
          ?.classList.contains(
            "is-open"
          )
      );


    dom.settingsButton
      ?.classList.toggle(
        "is-active",
        toolbarState.settingsOpen
      );


    dom.exportButton
      ?.classList.toggle(
        "is-active",
        toolbarState.exportOpen
      );


    dom.settingsButton
      ?.setAttribute(
        "aria-pressed",
        String(
          toolbarState.settingsOpen
        )
      );


    dom.exportButton
      ?.setAttribute(
        "aria-pressed",
        String(
          toolbarState.exportOpen
        )
      );


    return true;

  }


  function updateToolbar() {

    if (
      toolbarState.updating
    ) {

      return false;

    }


    toolbarState.updating =
      true;


    try {

      updateModeDisplay();

      updateLiveDisplay();

      updatePanelDisplay();


      return true;

    } finally {

      toolbarState.updating =
        false;

    }

  }


  /* =======================================================
     14. EVENT HANDLERS
  ======================================================= */

  function handleModeButtonClick() {

    toggleMode();

  }


  function handleSettingsButtonClick() {

    toggleSettings();

  }


  function handleExportButtonClick() {

    openExport();

  }


  function handleModeChanged() {

    window.requestAnimationFrame(
      updateToolbar
    );

  }


  function handleLiveChanged() {

    updateLiveDisplay();

  }


  function handleSettingsPanelChanged(
    event
  ) {

    toolbarState.settingsOpen =
      Boolean(
        event.detail?.open
      );


    updatePanelDisplay();

  }


  function handleExportStarted() {

    toolbarState.exportOpen =
      true;


    updatePanelDisplay();

  }


  function handleExportCompleted() {

    updatePanelDisplay();

  }


  function handleKeyboard(
    event
  ) {

    if (
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


    /*
     * Shift + 3 toggles Paintless 2D / 3D.
     */

    if (
      event.shiftKey &&
      event.key ===
        "#"
    ) {

      event.preventDefault();


      toggleMode();

    }

  }


  /* =======================================================
     15. EVENT CONNECTION
  ======================================================= */

  function connectEvents() {

    dom.modeButton
      ?.addEventListener(
        "click",
        handleModeButtonClick
      );


    dom.settingsButton
      ?.addEventListener(
        "click",
        handleSettingsButtonClick
      );


    dom.exportButton
      ?.addEventListener(
        "click",
        handleExportButtonClick
      );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:live-state-changed",
      handleLiveChanged
    );


    document.addEventListener(
      "paintless3d:live-rendering-changed",
      handleLiveChanged
    );


    document.addEventListener(
      "paintless3d:renderer-ready",
      handleLiveChanged
    );


    document.addEventListener(
      "paintless3d:settings-panel-changed",
      handleSettingsPanelChanged
    );


    document.addEventListener(
      "paintless3d:preview-panel-opened",
      updatePanelDisplay
    );


    document.addEventListener(
      "paintless3d:preview-panel-closed",
      updatePanelDisplay
    );


    document.addEventListener(
      "paintless3d:export-started",
      handleExportStarted
    );


    document.addEventListener(
      "paintless3d:export-completed",
      handleExportCompleted
    );


    document.addEventListener(
      "paintless3d:export-failed",
      handleExportCompleted
    );


    document.addEventListener(
      "paintless3d:ui-panel-changed",
      updatePanelDisplay
    );


    window.addEventListener(
      "keydown",
      handleKeyboard
    );

  }


  function disconnectEvents() {

    dom.modeButton
      ?.removeEventListener(
        "click",
        handleModeButtonClick
      );


    dom.settingsButton
      ?.removeEventListener(
        "click",
        handleSettingsButtonClick
      );


    dom.exportButton
      ?.removeEventListener(
        "click",
        handleExportButtonClick
      );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:live-state-changed",
      handleLiveChanged
    );


    document.removeEventListener(
      "paintless3d:live-rendering-changed",
      handleLiveChanged
    );


    document.removeEventListener(
      "paintless3d:renderer-ready",
      handleLiveChanged
    );


    document.removeEventListener(
      "paintless3d:settings-panel-changed",
      handleSettingsPanelChanged
    );


    document.removeEventListener(
      "paintless3d:preview-panel-opened",
      updatePanelDisplay
    );


    document.removeEventListener(
      "paintless3d:preview-panel-closed",
      updatePanelDisplay
    );


    document.removeEventListener(
      "paintless3d:export-started",
      handleExportStarted
    );


    document.removeEventListener(
      "paintless3d:export-completed",
      handleExportCompleted
    );


    document.removeEventListener(
      "paintless3d:export-failed",
      handleExportCompleted
    );


    document.removeEventListener(
      "paintless3d:ui-panel-changed",
      updatePanelDisplay
    );


    window.removeEventListener(
      "keydown",
      handleKeyboard
    );

  }


  /* =======================================================
     16. INITIALISE
  ======================================================= */

  async function initialise() {

    if (
      toolbarState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    removeOldControls();


    if (!dom.toolbarParent) {

      throw new Error(
        "Paintless3D Toolbar could not find the Paintless top toolbar."
      );

    }


    installStyles();


    if (
      !installToolbar()
    ) {

      throw new Error(
        "Paintless3D Toolbar could not install its controls."
      );

    }


    connectEvents();


    toolbarState.initialised =
      true;


    toolbarState.destroyed =
      false;


    updateToolbar();


    dispatch(
      "paintless3d:toolbar-ready",
      {
        toolbar:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Toolbar ready.",
      [
        "color:#ffffff",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-2px 0 #ff315c, 2px 0 #25e6ff"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     17. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    dom.container
      ?.remove();


    dom.styles
      ?.remove();


    toolbarState.initialised =
      false;


    toolbarState.destroyed =
      true;


    toolbarState.installed =
      false;


    toolbarState.stylesInstalled =
      false;


    dispatch(
      "paintless3d:toolbar-destroyed"
    );


    return true;

  }


  /* =======================================================
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      toolbarState,

    dom,


    initialise,

    destroy,


    updateToolbar,

    updateModeDisplay,

    updateLiveDisplay,

    updatePanelDisplay,


    requestMode,

    toggleMode,

    toggleSettings,

    openExport,


    isInitialised() {

      return toolbarState.initialised;

    },


    getMode() {

      return toolbarState.mode;

    },


    isLive() {

      return toolbarState.live;

    },


    getSummary() {

      return {

        initialised:
          toolbarState.initialised,

        installed:
          toolbarState.installed,

        mode:
          toolbarState.mode,

        live:
          toolbarState.live,

        settingsOpen:
          toolbarState.settingsOpen,

        exportOpen:
          toolbarState.exportOpen

      };

    }

  };


  window.Paintless3DToolbar =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "toolbar",
    {

      label:
        "Paintless3D Dedicated Toolbar",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
