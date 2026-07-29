"use strict";

/* =========================================================
   PAINTLESS3D
   CORE MODULE — v0.1

   File:
   js/paintless3d/core.js

   First working Paintless3D module.

   Features:
   - Creates the 2D / 3D mode switch
   - Adds a Glasses Preview button
   - Adds Paintless3D styling without changing existing CSS
   - Keeps normal Paintless untouched in 2D mode
   - Synchronises with Paintless3D.setMode()
   - Stores basic stereo settings
   - Provides the shared foundation for future 3D modules
   - Mobile-friendly controls
   - No changes to index.html required

   Future modules will use this core for:
   - Layer depth
   - Anaglyph rendering
   - Live preview
   - Stereo convergence
   - Export
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
      "Paintless3D Core could not start because paintless3d.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. CORE STATE
  ======================================================= */

  const coreState = {

    initialised:
      false,

    destroyed:
      false,

    mode:
      paintless3d.getMode?.() ||
      "2d",

    previewEnabled:
      false,

    first3DActivation:
      true,

    strength:
      12,

    convergence:
      0,

    channelMode:
      "red-cyan",

    swapEyes:
      false,

    ghostReduction:
      0,

    maximumDepth:
      100,

    minimumDepth:
      -100,

    storageKey:
      "paintless3d-settings-v1",

    modeSwitchInstalled:
      false,

    stylesInstalled:
      false,

    welcomeShown:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    header:
      null,

    menuBar:
      null,

    topBar:
      null,

    zoomControls:
      null,

    importButton:
      null,

    exportButton:
      null,

    modeContainer:
      null,

    modeLabel:
      null,

    switchButton:
      null,

    switchTrack:
      null,

    switchThumb:
      null,

    twoDLabel:
      null,

    threeDLabel:
      null,

    previewButton:
      null,

    previewIcon:
      null,

    previewLabel:
      null,

    welcomeDialog:
      null,

    welcomeBackdrop:
      null,

    continueButton:
      null,

    styles:
      null

  };


  /* =======================================================
     4. GENERAL HELPERS
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


  function sendStatusMessage(
    message
  ) {

    if (
      typeof window.PaintlessToolCore
        ?.sendStatusMessage ===
      "function"
    ) {

      window.PaintlessToolCore
        .sendStatusMessage(
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


  /* =======================================================
     5. SETTINGS STORAGE
  ======================================================= */

  function getSerializableSettings() {

    return {

      strength:
        coreState.strength,

      convergence:
        coreState.convergence,

      channelMode:
        coreState.channelMode,

      swapEyes:
        coreState.swapEyes,

      ghostReduction:
        coreState.ghostReduction

    };

  }


  function saveSettings() {

    try {

      window.localStorage.setItem(
        coreState.storageKey,
        JSON.stringify(
          getSerializableSettings()
        )
      );


      return true;

    } catch (error) {

      return false;
    }

  }


  function loadSettings() {

    try {

      const storedValue =
        window.localStorage.getItem(
          coreState.storageKey
        );


      if (!storedValue) {

        return false;
      }


      const settings =
        JSON.parse(
          storedValue
        );


      if (
        Number.isFinite(
          Number(
            settings.strength
          )
        )
      ) {

        coreState.strength =
          clamp(
            settings.strength,
            0,
            100
          );
      }


      if (
        Number.isFinite(
          Number(
            settings.convergence
          )
        )
      ) {

        coreState.convergence =
          clamp(
            settings.convergence,
            -100,
            100
          );
      }


      if (
        [
          "red-cyan",
          "red-blue",
          "green-magenta"
        ].includes(
          settings.channelMode
        )
      ) {

        coreState.channelMode =
          settings.channelMode;
      }


      coreState.swapEyes =
        Boolean(
          settings.swapEyes
        );


      coreState.ghostReduction =
        clamp(
          settings.ghostReduction,
          0,
          100
        );


      return true;

    } catch (error) {

      console.warn(
        "Paintless3D could not load saved settings:",
        error
      );


      return false;
    }

  }


  /* =======================================================
     6. FIND PAINTLESS HEADER
  ======================================================= */

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


  function collectDomReferences() {

    dom.header =
      findFirst(
        [
          "#app-header",
          ".app-header",
          ".top-header",
          "header"
        ]
      );


    dom.menuBar =
      findFirst(
        [
          "#menu-bar",
          ".menu-bar",
          ".main-menu",
          "nav"
        ]
      );


    dom.topBar =
      findFirst(
        [
          "#top-toolbar",
          ".top-toolbar",
          ".toolbar-top",
          ".header-actions",
          ".top-actions"
        ]
      );


    dom.zoomControls =
      findFirst(
        [
          "#zoom-controls",
          ".zoom-controls",
          "[data-zoom-controls]"
        ]
      );


    dom.importButton =
      document.getElementById(
        "import-button"
      ) ||
      findFirst(
        [
          '[data-action="import"]',
          ".import-button"
        ]
      );


    dom.exportButton =
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


  function getPreferredControlParent() {

    if (
      dom.importButton?.parentElement
    ) {

      return dom.importButton
        .parentElement;
    }


    if (
      dom.zoomControls?.parentElement
    ) {

      return dom.zoomControls
        .parentElement;
    }


    return (
      dom.topBar ||
      dom.menuBar ||
      dom.header ||
      document.body
    );
  }


  /* =======================================================
     7. CORE STYLES
  ======================================================= */

  function installStyles() {

    if (
      coreState.stylesInstalled ||
      document.getElementById(
        "paintless3d-core-styles"
      )
    ) {

      coreState.stylesInstalled =
        true;


      return true;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-core-styles";


    style.textContent = `
      :root {
        --paintless3d-red: #ff315c;
        --paintless3d-cyan: #25e6ff;
        --paintless3d-panel: rgba(18, 11, 29, 0.96);
        --paintless3d-border: rgba(255, 255, 255, 0.13);
        --paintless3d-text: #ffffff;
        --paintless3d-muted: rgba(255, 255, 255, 0.58);
      }

      .paintless3d-controls {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
        min-width: 0;
        margin-inline: 6px;
      }

      .paintless3d-mode-control {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 36px;
        padding: 4px 7px;
        border: 1px solid var(--paintless3d-border);
        border-radius: 12px;
        background:
          linear-gradient(
            145deg,
            rgba(24, 16, 38, 0.95),
            rgba(10, 7, 17, 0.96)
          );
        box-shadow:
          inset 0 0 0 1px rgba(168, 76, 255, 0.07);
        user-select: none;
      }

      .paintless3d-mode-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        color: rgba(255, 255, 255, 0.5);
        font:
          800 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.05em;
        transition:
          color 140ms ease,
          text-shadow 140ms ease,
          transform 140ms ease;
      }

      .paintless3d-mode-label.is-active {
        color: #ffffff;
        transform: scale(1.05);
      }

      .paintless3d-mode-label-3d.is-active {
        text-shadow:
          -1px 0 0 rgba(255, 49, 92, 0.88),
          1px 0 0 rgba(37, 230, 255, 0.88);
      }

      .paintless3d-switch {
        position: relative;
        display: inline-flex;
        align-items: center;
        width: 48px;
        height: 25px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            rgba(168, 76, 255, 0.34),
            rgba(53, 231, 255, 0.18)
          );
        box-shadow:
          inset 0 2px 7px rgba(0, 0, 0, 0.44);
        cursor: pointer;
        touch-action: manipulation;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          background 150ms ease;
      }

      .paintless3d-switch:hover {
        border-color: rgba(255, 255, 255, 0.38);
      }

      .paintless3d-switch:focus-visible {
        outline: 2px solid #a84cff;
        outline-offset: 2px;
      }

      .paintless3d-switch-track {
        position: absolute;
        inset: 0;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
      }

      .paintless3d-switch-track::before,
      .paintless3d-switch-track::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: 55%;
        opacity: 0;
        transition: opacity 160ms ease;
      }

      .paintless3d-switch-track::before {
        left: 0;
        background:
          radial-gradient(
            circle at left center,
            rgba(255, 49, 92, 0.36),
            transparent 70%
          );
      }

      .paintless3d-switch-track::after {
        right: 0;
        background:
          radial-gradient(
            circle at right center,
            rgba(37, 230, 255, 0.36),
            transparent 70%
          );
      }

      .paintless3d-switch.is-3d
      .paintless3d-switch-track::before,
      .paintless3d-switch.is-3d
      .paintless3d-switch-track::after {
        opacity: 1;
      }

      .paintless3d-switch-thumb {
        position: absolute;
        left: 3px;
        top: 3px;
        width: 17px;
        height: 17px;
        border: 1px solid rgba(255, 255, 255, 0.58);
        border-radius: 50%;
        background:
          linear-gradient(
            145deg,
            #ffffff,
            #c8b8de
          );
        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.48);
        pointer-events: none;
        transition:
          transform 180ms cubic-bezier(.2, .8, .2, 1),
          background 180ms ease,
          box-shadow 180ms ease;
      }

      .paintless3d-switch.is-3d
      .paintless3d-switch-thumb {
        transform: translateX(23px);
        background:
          linear-gradient(
            90deg,
            var(--paintless3d-red) 0 46%,
            #ffffff 46% 54%,
            var(--paintless3d-cyan) 54% 100%
          );
        box-shadow:
          -3px 0 8px rgba(255, 49, 92, 0.4),
          3px 0 8px rgba(37, 230, 255, 0.42),
          0 2px 8px rgba(0, 0, 0, 0.48);
      }

      .paintless3d-preview-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 36px;
        padding: 6px 10px;
        border: 1px solid var(--paintless3d-border);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.58);
        background:
          linear-gradient(
            145deg,
            rgba(24, 16, 38, 0.95),
            rgba(10, 7, 17, 0.96)
          );
        font:
          800 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        cursor: pointer;
        touch-action: manipulation;
        transition:
          color 140ms ease,
          border-color 140ms ease,
          background 140ms ease,
          box-shadow 140ms ease,
          transform 140ms ease;
      }

      .paintless3d-preview-button:hover:not(:disabled) {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.32);
        transform: translateY(-1px);
      }

      .paintless3d-preview-button:focus-visible {
        outline: 2px solid #a84cff;
        outline-offset: 2px;
      }

      .paintless3d-preview-button:disabled {
        opacity: 0.42;
        cursor: not-allowed;
      }

      .paintless3d-preview-button.is-enabled {
        color: #ffffff;
        border-color: rgba(53, 231, 255, 0.56);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.15),
            rgba(37, 230, 255, 0.19)
          );
        box-shadow:
          -4px 0 13px rgba(255, 49, 92, 0.12),
          4px 0 13px rgba(37, 230, 255, 0.15);
      }

      .paintless3d-preview-icon {
        font-size: 15px;
        line-height: 1;
      }

      html[data-paintless-mode="3d"] body {
        --paintless-active-accent: #35e7ff;
      }

      html[data-paintless-mode="3d"] .app-header,
      html[data-paintless-mode="3d"] header,
      body.paintless-3d-mode .app-header,
      body.paintless-3d-mode header {
        box-shadow:
          inset 3px 0 0 rgba(255, 49, 92, 0.34),
          inset -3px 0 0 rgba(37, 230, 255, 0.34);
      }

      html[data-paintless-mode="3d"] #canvas-stage,
      html[data-paintless-mode="3d"] .canvas-stage,
      body.paintless-3d-mode #canvas-stage,
      body.paintless-3d-mode .canvas-stage {
        box-shadow:
          -4px 0 24px rgba(255, 49, 92, 0.08),
          4px 0 24px rgba(37, 230, 255, 0.09);
      }

      .paintless3d-welcome-backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(4, 2, 8, 0.72);
        backdrop-filter: blur(7px);
        z-index: 12000;
        opacity: 0;
        transition: opacity 170ms ease;
      }

      .paintless3d-welcome-backdrop[hidden] {
        display: none !important;
      }

      .paintless3d-welcome-backdrop.is-visible {
        opacity: 1;
      }

      .paintless3d-welcome-dialog {
        width: min(430px, calc(100vw - 28px));
        padding: 25px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 20px;
        color: var(--paintless3d-text);
        background:
          radial-gradient(
            circle at 15% 0%,
            rgba(255, 49, 92, 0.17),
            transparent 40%
          ),
          radial-gradient(
            circle at 85% 0%,
            rgba(37, 230, 255, 0.18),
            transparent 40%
          ),
          linear-gradient(
            145deg,
            rgba(28, 18, 43, 0.99),
            rgba(9, 6, 16, 0.99)
          );
        box-shadow:
          0 28px 90px rgba(0, 0, 0, 0.68),
          -8px 0 30px rgba(255, 49, 92, 0.1),
          8px 0 30px rgba(37, 230, 255, 0.11);
        text-align: center;
        transform: translateY(8px) scale(0.97);
        transition: transform 180ms ease;
      }

      .paintless3d-welcome-backdrop.is-visible
      .paintless3d-welcome-dialog {
        transform: translateY(0) scale(1);
      }

      .paintless3d-welcome-glasses {
        display: block;
        margin-bottom: 11px;
        font-size: 48px;
        line-height: 1;
        filter:
          drop-shadow(-4px 0 4px rgba(255, 49, 92, 0.36))
          drop-shadow(4px 0 4px rgba(37, 230, 255, 0.38));
      }

      .paintless3d-welcome-title {
        margin: 0;
        color: #ffffff;
        font:
          900 28px/1.1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.02em;
        text-shadow:
          -2px 0 0 rgba(255, 49, 92, 0.52),
          2px 0 0 rgba(37, 230, 255, 0.55);
      }

      .paintless3d-welcome-copy {
        margin: 14px auto 0;
        max-width: 330px;
        color: rgba(255, 255, 255, 0.68);
        font:
          500 14px/1.55
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-welcome-note {
        display: block;
        margin-top: 7px;
        color: rgba(255, 255, 255, 0.42);
        font-size: 11px;
      }

      .paintless3d-continue-button {
        width: 100%;
        min-height: 44px;
        margin-top: 20px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 13px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.72),
            rgba(168, 76, 255, 0.86),
            rgba(37, 230, 255, 0.72)
          );
        font:
          900 12px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
          transform 130ms ease,
          filter 130ms ease;
      }

      .paintless3d-continue-button:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }

      .paintless3d-continue-button:focus-visible {
        outline: 2px solid #ffffff;
        outline-offset: 3px;
      }

      @media (max-width: 760px) {
        .paintless3d-controls {
          gap: 4px;
          margin-inline: 3px;
        }

        .paintless3d-mode-control {
          gap: 5px;
          min-height: 33px;
          padding-inline: 5px;
        }

        .paintless3d-switch {
          width: 44px;
          height: 24px;
        }

        .paintless3d-switch-thumb {
          width: 16px;
          height: 16px;
        }

        .paintless3d-switch.is-3d
        .paintless3d-switch-thumb {
          transform: translateX(20px);
        }

        .paintless3d-preview-button {
          min-height: 33px;
          padding-inline: 8px;
        }

        .paintless3d-preview-label {
          display: none;
        }
      }

      @media (max-width: 460px) {
        .paintless3d-mode-label {
          font-size: 9px;
        }

        .paintless3d-controls {
          margin-inline: 1px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    coreState.stylesInstalled =
      true;


    return true;
  }


  /* =======================================================
     8. BUILD MODE SWITCH
  ======================================================= */

  function createModeLabel(
    text,
    className
  ) {

    const label =
      document.createElement(
        "span"
      );


    label.className =
      `paintless3d-mode-label ${className}`;


    label.textContent =
      text;


    label.setAttribute(
      "aria-hidden",
      "true"
    );


    return label;
  }


  function createModeSwitch() {

    const controls =
      document.createElement(
        "div"
      );


    controls.id =
      "paintless3d-controls";


    controls.className =
      "paintless3d-controls";


    const modeContainer =
      document.createElement(
        "div"
      );


    modeContainer.id =
      "paintless3d-mode-control";


    modeContainer.className =
      "paintless3d-mode-control";


    const twoDLabel =
      createModeLabel(
        "2D",
        "paintless3d-mode-label-2d"
      );


    const switchButton =
      document.createElement(
        "button"
      );


    switchButton.type =
      "button";


    switchButton.id =
      "paintless3d-mode-switch";


    switchButton.className =
      "paintless3d-switch";


    switchButton.setAttribute(
      "role",
      "switch"
    );


    switchButton.setAttribute(
      "aria-checked",
      "false"
    );


    switchButton.setAttribute(
      "aria-label",
      "Switch between 2D and Paintless3D mode"
    );


    switchButton.title =
      "Switch between 2D and Paintless3D";


    const switchTrack =
      document.createElement(
        "span"
      );


    switchTrack.className =
      "paintless3d-switch-track";


    switchTrack.setAttribute(
      "aria-hidden",
      "true"
    );


    const switchThumb =
      document.createElement(
        "span"
      );


    switchThumb.className =
      "paintless3d-switch-thumb";


    switchThumb.setAttribute(
      "aria-hidden",
      "true"
    );


    switchButton.append(
      switchTrack,
      switchThumb
    );


    const threeDLabel =
      createModeLabel(
        "3D",
        "paintless3d-mode-label-3d"
      );


    modeContainer.append(
      twoDLabel,
      switchButton,
      threeDLabel
    );


    const previewButton =
      document.createElement(
        "button"
      );


    previewButton.type =
      "button";


    previewButton.id =
      "paintless3d-preview-button";


    previewButton.className =
      "paintless3d-preview-button";


    previewButton.disabled =
      true;


    previewButton.setAttribute(
      "aria-pressed",
      "false"
    );


    previewButton.title =
      "Enable anaglyph glasses preview";


    const previewIcon =
      document.createElement(
        "span"
      );


    previewIcon.className =
      "paintless3d-preview-icon";


    previewIcon.textContent =
      "👓";


    previewIcon.setAttribute(
      "aria-hidden",
      "true"
    );


    const previewLabel =
      document.createElement(
        "span"
      );


    previewLabel.className =
      "paintless3d-preview-label";


    previewLabel.textContent =
      "Preview";


    previewButton.append(
      previewIcon,
      previewLabel
    );


    controls.append(
      modeContainer,
      previewButton
    );


    dom.modeContainer =
      controls;


    dom.switchButton =
      switchButton;


    dom.switchTrack =
      switchTrack;


    dom.switchThumb =
      switchThumb;


    dom.twoDLabel =
      twoDLabel;


    dom.threeDLabel =
      threeDLabel;


    dom.previewButton =
      previewButton;


    dom.previewIcon =
      previewIcon;


    dom.previewLabel =
      previewLabel;


    return controls;
  }


  function installModeSwitch() {

    const existingControls =
      document.getElementById(
        "paintless3d-controls"
      );


    if (existingControls) {

      dom.modeContainer =
        existingControls;


      dom.switchButton =
        document.getElementById(
          "paintless3d-mode-switch"
        );


      dom.previewButton =
        document.getElementById(
          "paintless3d-preview-button"
        );


      dom.twoDLabel =
        existingControls.querySelector(
          ".paintless3d-mode-label-2d"
        );


      dom.threeDLabel =
        existingControls.querySelector(
          ".paintless3d-mode-label-3d"
        );


      coreState.modeSwitchInstalled =
        true;


      return true;
    }


    const parent =
      getPreferredControlParent();


    if (!parent) {

      return false;
    }


    const controls =
      createModeSwitch();


    if (
      dom.importButton &&
      dom.importButton.parentElement ===
        parent
    ) {

      parent.insertBefore(
        controls,
        dom.importButton
      );

    } else if (
      dom.exportButton &&
      dom.exportButton.parentElement ===
        parent
    ) {

      parent.insertBefore(
        controls,
        dom.exportButton
      );

    } else {

      parent.appendChild(
        controls
      );
    }


    coreState.modeSwitchInstalled =
      true;


    return true;
  }


  /* =======================================================
     9. WELCOME DIALOG
  ======================================================= */

  function createWelcomeDialog() {

    const backdrop =
      document.createElement(
        "div"
      );


    backdrop.id =
      "paintless3d-welcome-backdrop";


    backdrop.className =
      "paintless3d-welcome-backdrop";


    backdrop.hidden =
      true;


    backdrop.setAttribute(
      "aria-hidden",
      "true"
    );


    const dialog =
      document.createElement(
        "section"
      );


    dialog.className =
      "paintless3d-welcome-dialog";


    dialog.setAttribute(
      "role",
      "dialog"
    );


    dialog.setAttribute(
      "aria-modal",
      "true"
    );


    dialog.setAttribute(
      "aria-labelledby",
      "paintless3d-welcome-title"
    );


    const glasses =
      document.createElement(
        "span"
      );


    glasses.className =
      "paintless3d-welcome-glasses";


    glasses.textContent =
      "👓";


    glasses.setAttribute(
      "aria-hidden",
      "true"
    );


    const title =
      document.createElement(
        "h2"
      );


    title.id =
      "paintless3d-welcome-title";


    title.className =
      "paintless3d-welcome-title";


    title.textContent =
      "Paintless3D";


    const copy =
      document.createElement(
        "p"
      );


    copy.className =
      "paintless3d-welcome-copy";


    copy.innerHTML =
      [
        "Put on your red/cyan glasses and prepare to paint in depth.",
        '<span class="paintless3d-welcome-note">',
        "The renderer is being built next — tonight, the 3D engine officially wakes up.",
        "</span>"
      ].join(
        ""
      );


    const continueButton =
      document.createElement(
        "button"
      );


    continueButton.type =
      "button";


    continueButton.className =
      "paintless3d-continue-button";


    continueButton.textContent =
      "Enter Paintless3D";


    dialog.append(
      glasses,
      title,
      copy,
      continueButton
    );


    backdrop.appendChild(
      dialog
    );


    document.body.appendChild(
      backdrop
    );


    dom.welcomeBackdrop =
      backdrop;


    dom.welcomeDialog =
      dialog;


    dom.continueButton =
      continueButton;


    return backdrop;
  }


  function ensureWelcomeDialog() {

    const existingBackdrop =
      document.getElementById(
        "paintless3d-welcome-backdrop"
      );


    if (existingBackdrop) {

      dom.welcomeBackdrop =
        existingBackdrop;


      dom.welcomeDialog =
        existingBackdrop.querySelector(
          ".paintless3d-welcome-dialog"
        );


      dom.continueButton =
        existingBackdrop.querySelector(
          ".paintless3d-continue-button"
        );


      return existingBackdrop;
    }


    return createWelcomeDialog();
  }


  function showWelcomeDialog() {

    if (
      coreState.welcomeShown ||
      !coreState.first3DActivation
    ) {

      return false;
    }


    ensureWelcomeDialog();


    if (!dom.welcomeBackdrop) {

      return false;
    }


    coreState.welcomeShown =
      true;


    dom.welcomeBackdrop.hidden =
      false;


    dom.welcomeBackdrop.setAttribute(
      "aria-hidden",
      "false"
    );


    requestAnimationFrame(
      () => {

        dom.welcomeBackdrop
          ?.classList.add(
            "is-visible"
          );


        dom.continueButton
          ?.focus();
      }
    );


    dispatch(
      "paintless3d:welcome-opened"
    );


    return true;
  }


  function hideWelcomeDialog() {

    if (!dom.welcomeBackdrop) {

      return false;
    }


    dom.welcomeBackdrop.classList.remove(
      "is-visible"
    );


    dom.welcomeBackdrop.setAttribute(
      "aria-hidden",
      "true"
    );


    window.setTimeout(
      () => {

        if (dom.welcomeBackdrop) {

          dom.welcomeBackdrop.hidden =
            true;
        }
      },
      180
    );


    coreState.first3DActivation =
      false;


    dom.switchButton
      ?.focus();


    dispatch(
      "paintless3d:welcome-closed"
    );


    return true;
  }


  /* =======================================================
     10. MODE DISPLAY
  ======================================================= */

  function updateModeDisplay(
    mode =
      paintless3d.getMode?.() ||
      coreState.mode
  ) {

    const safeMode =
      normaliseMode(
        mode
      );


    const is3D =
      safeMode ===
      "3d";


    coreState.mode =
      safeMode;


    document.documentElement
      .dataset.paintlessMode =
      safeMode;


    document.body
      ?.classList.toggle(
        "paintless-3d-mode",
        is3D
      );


    dom.switchButton
      ?.classList.toggle(
        "is-3d",
        is3D
      );


    dom.switchButton
      ?.setAttribute(
        "aria-checked",
        String(
          is3D
        )
      );


    if (dom.switchButton) {

      dom.switchButton.title =
        is3D
          ? "Return to normal 2D mode"
          : "Enter Paintless3D mode";
    }


    dom.twoDLabel
      ?.classList.toggle(
        "is-active",
        !is3D
      );


    dom.threeDLabel
      ?.classList.toggle(
        "is-active",
        is3D
      );


    if (dom.previewButton) {

      dom.previewButton.disabled =
        !is3D;


      if (!is3D) {

        setPreviewEnabled(
          false,
          {
            announce:
              false
          }
        );
      }
    }


    dispatch(
      "paintless3d:core-mode-display-updated",
      {
        mode:
          safeMode
      }
    );


    return safeMode;
  }


  function requestMode(
    mode,
    {
      announce =
        true,

      showWelcome =
        true
    } = {}
  ) {

    const safeMode =
      normaliseMode(
        mode
      );


    const previousMode =
      paintless3d.getMode?.() ||
      coreState.mode;


    const changed =
      paintless3d.setMode(
        safeMode
      );


    if (
      changed ===
      false
    ) {

      return false;
    }


    updateModeDisplay(
      safeMode
    );


    if (
      safeMode ===
        "3d" &&
      previousMode !==
        "3d"
    ) {

      if (
        showWelcome &&
        coreState.first3DActivation
      ) {

        showWelcomeDialog();
      }


      if (announce) {

        sendStatusMessage(
          "Paintless3D mode activated. Get the glasses!"
        );
      }


      console.log(
        "%cPaintless3D switched to 3D mode.",
        [
          "color:#35e7ff",
          "font-weight:bold",
          "font-size:13px",
          "text-shadow:-1px 0 #ff315c"
        ].join(";")
      );

    } else if (
      safeMode ===
        "2d" &&
      previousMode !==
        "2d"
    ) {

      hideWelcomeDialog();


      if (announce) {

        sendStatusMessage(
          "Paintless returned to normal 2D mode."
        );
      }


      console.log(
        "%cPaintless3D switched to 2D mode.",
        [
          "color:#d49aff",
          "font-weight:bold"
        ].join(";")
      );
    }


    return true;
  }


  function toggleMode() {

    return requestMode(
      paintless3d.is3DMode?.()
        ? "2d"
        : "3d"
    );
  }


  /* =======================================================
     11. PREVIEW STATE
  ======================================================= */

  function updatePreviewDisplay() {

    const enabled =
      Boolean(
        coreState.previewEnabled &&
        paintless3d.is3DMode?.()
      );


    dom.previewButton
      ?.classList.toggle(
        "is-enabled",
        enabled
      );


    dom.previewButton
      ?.setAttribute(
        "aria-pressed",
        String(
          enabled
        )
      );


    if (dom.previewLabel) {

      dom.previewLabel.textContent =
        enabled
          ? "Preview On"
          : "Preview";
    }


    if (dom.previewButton) {

      dom.previewButton.title =
        enabled
          ? "Disable anaglyph preview"
          : "Enable anaglyph glasses preview";
    }


    return enabled;
  }


  function setPreviewEnabled(
    enabled,
    {
      announce =
        true
    } = {}
  ) {

    const nextValue =
      Boolean(
        enabled
      );


    if (
      nextValue &&
      !paintless3d.is3DMode?.()
    ) {

      requestMode(
        "3d",
        {
          announce,
          showWelcome:
            true
        }
      );
    }


    coreState.previewEnabled =
      nextValue &&
      paintless3d.is3DMode?.();


    updatePreviewDisplay();


    dispatch(
      "paintless3d:preview-changed",
      {
        enabled:
          coreState.previewEnabled,

        strength:
          coreState.strength,

        convergence:
          coreState.convergence,

        channelMode:
          coreState.channelMode,

        swapEyes:
          coreState.swapEyes,

        ghostReduction:
          coreState.ghostReduction
      }
    );


    if (announce) {

      if (coreState.previewEnabled) {

        sendStatusMessage(
          "Glasses Preview enabled. The anaglyph renderer is next."
        );

      } else {

        sendStatusMessage(
          "Glasses Preview disabled."
        );
      }
    }


    return coreState.previewEnabled;
  }


  function togglePreview() {

    return setPreviewEnabled(
      !coreState.previewEnabled
    );
  }


  /* =======================================================
     12. STEREO SETTINGS
  ======================================================= */

  function setStrength(
    value
  ) {

    coreState.strength =
      clamp(
        value,
        0,
        100
      );


    saveSettings();


    dispatch(
      "paintless3d:strength-changed",
      {
        strength:
          coreState.strength
      }
    );


    return coreState.strength;
  }


  function getStrength() {

    return coreState.strength;
  }


  function setConvergence(
    value
  ) {

    coreState.convergence =
      clamp(
        value,
        -100,
        100
      );


    saveSettings();


    dispatch(
      "paintless3d:convergence-changed",
      {
        convergence:
          coreState.convergence
      }
    );


    return coreState.convergence;
  }


  function getConvergence() {

    return coreState.convergence;
  }


  function setChannelMode(
    mode
  ) {

    const safeMode =
      String(
        mode ||
        ""
      ).toLowerCase();


    if (
      ![
        "red-cyan",
        "red-blue",
        "green-magenta"
      ].includes(
        safeMode
      )
    ) {

      return false;
    }


    coreState.channelMode =
      safeMode;


    saveSettings();


    dispatch(
      "paintless3d:channel-mode-changed",
      {
        channelMode:
          safeMode
      }
    );


    return safeMode;
  }


  function getChannelMode() {

    return coreState.channelMode;
  }


  function setSwapEyes(
    enabled
  ) {

    coreState.swapEyes =
      Boolean(
        enabled
      );


    saveSettings();


    dispatch(
      "paintless3d:swap-eyes-changed",
      {
        swapEyes:
          coreState.swapEyes
      }
    );


    return coreState.swapEyes;
  }


  function getSwapEyes() {

    return coreState.swapEyes;
  }


  function setGhostReduction(
    value
  ) {

    coreState.ghostReduction =
      clamp(
        value,
        0,
        100
      );


    saveSettings();


    dispatch(
      "paintless3d:ghost-reduction-changed",
      {
        ghostReduction:
          coreState.ghostReduction
      }
    );


    return coreState.ghostReduction;
  }


  function getGhostReduction() {

    return coreState.ghostReduction;
  }


  function getStereoSettings() {

    return {

      strength:
        coreState.strength,

      convergence:
        coreState.convergence,

      channelMode:
        coreState.channelMode,

      swapEyes:
        coreState.swapEyes,

      ghostReduction:
        coreState.ghostReduction,

      minimumDepth:
        coreState.minimumDepth,

      maximumDepth:
        coreState.maximumDepth
    };
  }


  /* =======================================================
     13. EVENTS
  ======================================================= */

  function connectEvents() {

    dom.switchButton
      ?.addEventListener(
        "click",
        (event) => {

          event.preventDefault();


          toggleMode();
        }
      );


    dom.previewButton
      ?.addEventListener(
        "click",
        (event) => {

          event.preventDefault();


          togglePreview();
        }
      );


    dom.continueButton
      ?.addEventListener(
        "click",
        (event) => {

          event.preventDefault();


          hideWelcomeDialog();
        }
      );


    dom.welcomeBackdrop
      ?.addEventListener(
        "pointerdown",
        (event) => {

          if (
            event.target ===
            dom.welcomeBackdrop
          ) {

            hideWelcomeDialog();
          }
        }
      );


    window.addEventListener(
      "keydown",
      handleKeyboardShortcuts
    );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleExternalModeChange
    );


    document.addEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );
  }


  function disconnectEvents() {

    window.removeEventListener(
      "keydown",
      handleKeyboardShortcuts
    );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleExternalModeChange
    );


    document.removeEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );
  }


  function handleKeyboardShortcuts(
    event
  ) {

    if (
      isTypingElement() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {

      return;
    }


    if (
      event.key ===
        "Escape" &&
      dom.welcomeBackdrop &&
      !dom.welcomeBackdrop.hidden
    ) {

      event.preventDefault();


      hideWelcomeDialog();


      return;
    }


    /*
     * Keyboard shortcut:
     *
     * Shift + 3 toggles Paintless3D mode.
     */

    if (
      event.shiftKey &&
      event.key ===
        "#"
    ) {

      event.preventDefault();


      toggleMode();


      return;
    }


    /*
     * G toggles Glasses Preview while in 3D mode.
     */

    if (
      event.key.toLowerCase() ===
        "g" &&
      paintless3d.is3DMode?.()
    ) {

      event.preventDefault();


      togglePreview();
    }
  }


  function handleExternalModeChange(
    event
  ) {

    const mode =
      event.detail?.mode;


    if (!mode) {

      return;
    }


    updateModeDisplay(
      mode
    );
  }


  function handleDocumentReset() {

    setPreviewEnabled(
      false,
      {
        announce:
          false
      }
    );
  }


  /* =======================================================
     14. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      coreState.initialised
    ) {

      return true;
    }


    collectDomReferences();


    installStyles();


    loadSettings();


    const switchInstalled =
      installModeSwitch();


    if (!switchInstalled) {

      throw new Error(
        "Paintless3D Core could not find a suitable location for the mode switch."
      );
    }


    ensureWelcomeDialog();


    connectEvents();


    updateModeDisplay(
      paintless3d.getMode?.() ||
      "2d"
    );


    updatePreviewDisplay();


    coreState.initialised =
      true;


    coreState.destroyed =
      false;


    dispatch(
      "paintless3d:core-ready",
      {
        core:
          publicApi
      }
    );


    sendStatusMessage(
      "Paintless3D is awake. Switch to 3D when ready."
    );


    console.log(
      "%cPaintless3D Core ready.",
      [
        "color:#35e7ff",
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


    dom.modeContainer
      ?.remove();


    dom.welcomeBackdrop
      ?.remove();


    dom.styles
      ?.remove();


    delete document.documentElement
      .dataset.paintlessMode;


    document.body
      ?.classList.remove(
        "paintless-3d-mode"
      );


    coreState.initialised =
      false;


    coreState.destroyed =
      true;


    coreState.modeSwitchInstalled =
      false;


    coreState.stylesInstalled =
      false;


    dispatch(
      "paintless3d:core-destroyed"
    );


    return true;
  }


  /* =======================================================
     16. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      coreState,

    dom,


    initialise,

    destroy,


    requestMode,

    toggleMode,

    updateModeDisplay,


    setPreviewEnabled,

    togglePreview,

    updatePreviewDisplay,


    showWelcomeDialog,

    hideWelcomeDialog,


    setStrength,

    getStrength,


    setConvergence,

    getConvergence,


    setChannelMode,

    getChannelMode,


    setSwapEyes,

    getSwapEyes,


    setGhostReduction,

    getGhostReduction,


    getStereoSettings,


    saveSettings,

    loadSettings,


    isPreviewEnabled() {

      return coreState.previewEnabled;
    },


    isInitialised() {

      return coreState.initialised;
    },


    getMode() {

      return coreState.mode;
    },


    getDepthRange() {

      return {

        minimum:
          coreState.minimumDepth,

        maximum:
          coreState.maximumDepth
      };
    }

  };


  window.Paintless3DCore =
    publicApi;


  /* =======================================================
     17. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "core",
    {

      label:
        "Paintless3D Core",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
