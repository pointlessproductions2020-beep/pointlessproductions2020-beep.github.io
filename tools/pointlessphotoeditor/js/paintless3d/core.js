"use strict";

/* =========================================================
   PAINTLESS3D
   LIVE CORE SYSTEM — v0.2

   File:
   js/paintless3d/core.js

   New behaviour:
   - Paintless3D is permanently live while 3D mode is active
   - The old Preview button no longer turns rendering off
   - The glasses button now opens/closes stereo settings
   - Stereo settings are stored locally in the browser
   - Keeps backwards compatibility with preview.js,
     renderer.js, export.js and ui.js
   - Provides one central API for all Paintless3D settings
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
      "Paintless3D Core could not start because paintless3d.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. CONSTANTS
  ======================================================= */

  const STORAGE_KEY =
    "paintless3d-settings-v2";


  const DEFAULT_SETTINGS = {

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

  };


  const VALID_CHANNEL_MODES =
    new Set(
      [
        "red-cyan",
        "red-blue",
        "green-magenta"
      ]
    );


  /* =======================================================
     3. CORE STATE
  ======================================================= */

  const coreState = {

    initialised:
      false,

    destroyed:
      false,

    liveRendering:
      false,

    settingsPanelOpen:
      false,

    settingsLoaded:
      false,

    controlsInstalled:
      false,

    stylesInstalled:
      false,

    storageAvailable:
      true,

    lastMode:
      "2d",

    lastSettingsChange:
      null,

    settings: {
      ...DEFAULT_SETTINGS
    }

  };


  /* =======================================================
     4. DOM REFERENCES
  ======================================================= */

  const dom = {

    modeSwitch:
      null,

    previewButton:
      null,

    previewButtonIcon:
      null,

    previewButtonLabel:
      null,

    previewPanel:
      null,

    styles:
      null

  };


  /* =======================================================
     5. SHARED APIS
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


  function getRendererApi() {

    return (
      window.Paintless3DRenderer ||
      paintless3d.getModule?.(
        "renderer"
      )?.api ||
      null
    );

  }


  function getPreviewApi() {

    return (
      window.Paintless3DPreview ||
      paintless3d.getModule?.(
        "preview"
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
     6. GENERAL HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum,
    fallback =
      minimum
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

      return fallback;

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
      typeof paintless3d.getMode ===
      "function"
    ) {

      return paintless3d.getMode() ===
        "3d";

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


  function getCurrentMode() {

    return is3DMode()
      ? "3d"
      : "2d";

  }


  /* =======================================================
     7. SETTINGS STORAGE
  ======================================================= */

  function sanitiseSettings(
    settings
  ) {

    const source =
      settings &&
      typeof settings ===
        "object"
        ? settings
        : {};


    return {

      strength:
        clamp(
          source.strength,
          0,
          100,
          DEFAULT_SETTINGS.strength
        ),

      convergence:
        clamp(
          source.convergence,
          -100,
          100,
          DEFAULT_SETTINGS.convergence
        ),

      channelMode:
        VALID_CHANNEL_MODES.has(
          source.channelMode
        )
          ? source.channelMode
          : DEFAULT_SETTINGS.channelMode,

      swapEyes:
        Boolean(
          source.swapEyes
        ),

      ghostReduction:
        clamp(
          source.ghostReduction,
          0,
          100,
          DEFAULT_SETTINGS.ghostReduction
        )

    };

  }


  function loadSettings() {

    if (
      coreState.settingsLoaded
    ) {

      return {
        ...coreState.settings
      };

    }


    try {

      const storedValue =
        window.localStorage.getItem(
          STORAGE_KEY
        );


      if (storedValue) {

        const parsedValue =
          JSON.parse(
            storedValue
          );


        coreState.settings =
          sanitiseSettings(
            parsedValue
          );

      } else {

        coreState.settings =
          {
            ...DEFAULT_SETTINGS
          };

      }

    } catch (error) {

      coreState.storageAvailable =
        false;


      coreState.settings =
        {
          ...DEFAULT_SETTINGS
        };


      console.warn(
        "Paintless3D could not load saved settings:",
        error
      );

    }


    coreState.settingsLoaded =
      true;


    return {
      ...coreState.settings
    };

  }


  function saveSettings() {

    if (
      !coreState.storageAvailable
    ) {

      return false;

    }


    try {

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          coreState.settings
        )
      );


      return true;

    } catch (error) {

      coreState.storageAvailable =
        false;


      console.warn(
        "Paintless3D could not save settings:",
        error
      );


      return false;

    }

  }


  /* =======================================================
     8. SETTINGS EVENTS
  ======================================================= */

  function dispatchSettingChange(
    eventName,
    settingName,
    value,
    previousValue,
    source =
      "core"
  ) {

    coreState.lastSettingsChange = {

      setting:
        settingName,

      value,

      previousValue,

      source,

      timestamp:
        Date.now()

    };


    dispatch(
      eventName,
      {
        setting:
          settingName,

        value,

        previousValue,

        source,

        settings:
          getStereoSettings()
      }
    );


    dispatch(
      "paintless3d:settings-changed",
      {
        setting:
          settingName,

        value,

        previousValue,

        source,

        settings:
          getStereoSettings()
      }
    );


    dispatch(
      "paintless3d:render-requested",
      {
        reason:
          `${settingName}-changed`,

        setting:
          settingName,

        value
      }
    );

  }


  /* =======================================================
     9. SETTINGS GETTERS AND SETTERS
  ======================================================= */

  function getStereoSettings() {

    loadSettings();


    return {
      ...coreState.settings
    };

  }


  function setStrength(
    value,
    {
      announce =
        false,

      source =
        "core"
    } = {}
  ) {

    loadSettings();


    const previousValue =
      coreState.settings.strength;


    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        0,
        100,
        DEFAULT_SETTINGS.strength
      );


    coreState.settings.strength =
      nextValue;


    saveSettings();


    dispatchSettingChange(
      "paintless3d:strength-changed",
      "strength",
      nextValue,
      previousValue,
      source
    );


    if (announce) {

      sendStatusMessage(
        `Paintless3D strength set to ${nextValue}.`
      );

    }


    return nextValue;

  }


  function setConvergence(
    value,
    {
      announce =
        false,

      source =
        "core"
    } = {}
  ) {

    loadSettings();


    const previousValue =
      coreState.settings.convergence;


    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        -100,
        100,
        DEFAULT_SETTINGS.convergence
      );


    coreState.settings.convergence =
      nextValue;


    saveSettings();


    dispatchSettingChange(
      "paintless3d:convergence-changed",
      "convergence",
      nextValue,
      previousValue,
      source
    );


    if (announce) {

      sendStatusMessage(
        `Paintless3D convergence set to ${
          nextValue > 0
            ? "+"
            : ""
        }${nextValue}.`
      );

    }


    return nextValue;

  }


  function setChannelMode(
    channelMode,
    {
      announce =
        false,

      source =
        "core"
    } = {}
  ) {

    loadSettings();


    const safeMode =
      VALID_CHANNEL_MODES.has(
        channelMode
      )
        ? channelMode
        : DEFAULT_SETTINGS.channelMode;


    const previousValue =
      coreState.settings.channelMode;


    coreState.settings.channelMode =
      safeMode;


    saveSettings();


    dispatchSettingChange(
      "paintless3d:channel-mode-changed",
      "channelMode",
      safeMode,
      previousValue,
      source
    );


    if (announce) {

      const label =
        safeMode ===
          "red-blue"
          ? "Red and blue"
          : safeMode ===
              "green-magenta"
            ? "Green and magenta"
            : "Red and cyan";


      sendStatusMessage(
        `${label} glasses mode selected.`
      );

    }


    return safeMode;

  }


  function setSwapEyes(
    enabled,
    {
      announce =
        false,

      source =
        "core"
    } = {}
  ) {

    loadSettings();


    const previousValue =
      coreState.settings.swapEyes;


    const nextValue =
      Boolean(
        enabled
      );


    coreState.settings.swapEyes =
      nextValue;


    saveSettings();


    dispatchSettingChange(
      "paintless3d:swap-eyes-changed",
      "swapEyes",
      nextValue,
      previousValue,
      source
    );


    if (announce) {

      sendStatusMessage(
        nextValue
          ? "Paintless3D eyes swapped."
          : "Paintless3D eye order restored."
      );

    }


    return nextValue;

  }


  function toggleSwapEyes(
    options = {}
  ) {

    return setSwapEyes(
      !getStereoSettings()
        .swapEyes,
      options
    );

  }


  function setGhostReduction(
    value,
    {
      announce =
        false,

      source =
        "core"
    } = {}
  ) {

    loadSettings();


    const previousValue =
      coreState.settings.ghostReduction;


    const nextValue =
      clamp(
        Math.round(
          Number(
            value
          )
        ),
        0,
        100,
        DEFAULT_SETTINGS.ghostReduction
      );


    coreState.settings.ghostReduction =
      nextValue;


    saveSettings();


    dispatchSettingChange(
      "paintless3d:ghost-reduction-changed",
      "ghostReduction",
      nextValue,
      previousValue,
      source
    );


    if (announce) {

      sendStatusMessage(
        `Ghost reduction set to ${nextValue}%.`
      );

    }


    return nextValue;

  }


  function resetStereoSettings({
    announce =
      true,

    source =
      "reset"
  } = {}) {

    const previousSettings =
      getStereoSettings();


    coreState.settings =
      {
        ...DEFAULT_SETTINGS
      };


    saveSettings();


    dispatch(
      "paintless3d:settings-reset",
      {
        previousSettings,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:strength-changed",
      {
        value:
          coreState.settings.strength,

        previousValue:
          previousSettings.strength,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:convergence-changed",
      {
        value:
          coreState.settings.convergence,

        previousValue:
          previousSettings.convergence,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:channel-mode-changed",
      {
        value:
          coreState.settings.channelMode,

        previousValue:
          previousSettings.channelMode,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:swap-eyes-changed",
      {
        value:
          coreState.settings.swapEyes,

        previousValue:
          previousSettings.swapEyes,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:ghost-reduction-changed",
      {
        value:
          coreState.settings.ghostReduction,

        previousValue:
          previousSettings.ghostReduction,

        settings:
          getStereoSettings(),

        source
      }
    );


    dispatch(
      "paintless3d:render-requested",
      {
        reason:
          "stereo-settings-reset"
      }
    );


    if (announce) {

      sendStatusMessage(
        "Paintless3D stereo settings reset."
      );

    }


    return getStereoSettings();

  }


  /* =======================================================
     10. MODE CONTROL
  ======================================================= */

  function requestMode(
    mode,
    {
      announce =
        false
    } = {}
  ) {

    const safeMode =
      normaliseMode(
        mode
      );


    const modeApi =
      getModeApi();


    let result =
      false;


    if (
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

    } else if (
      typeof paintless3d.requestMode ===
      "function"
    ) {

      result =
        paintless3d.requestMode(
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
          ? "Paintless3D mode enabled."
          : "Paintless returned to 2D mode."
      );

    }


    return result;

  }


  function enter3DMode(
    options = {}
  ) {

    return requestMode(
      "3d",
      options
    );

  }


  function enter2DMode(
    options = {}
  ) {

    return requestMode(
      "2d",
      options
    );

  }


  function toggleMode() {

    return requestMode(
      is3DMode()
        ? "2d"
        : "3d"
    );

  }


  /* =======================================================
     11. LIVE RENDERING COMPATIBILITY
  ======================================================= */

  function isPreviewEnabled() {

    /*
     * Preview is no longer an optional effect.
     * In 3D mode the live renderer is always enabled.
     */

    return is3DMode();

  }


  function setPreviewEnabled(
    enabled,
    {
      openSettings =
        false,

      announce =
        false
    } = {}
  ) {

    if (
      Boolean(
        enabled
      )
    ) {

      if (
        !is3DMode()
      ) {

        requestMode(
          "3d"
        );

      }


      coreState.liveRendering =
        true;


      getRendererApi()
        ?.enableLiveRendering?.();


      if (openSettings) {

        openSettingsPanel();

      }


      dispatch(
        "paintless3d:preview-changed",
        {
          enabled:
            true,

          live:
            true,

          permanent:
            true
        }
      );


      if (announce) {

        sendStatusMessage(
          "Live Paintless3D rendering is active."
        );

      }


      return true;

    }


    /*
     * Calling this with false while still in 3D mode must not
     * hide the live workspace. This keeps old modules safe.
     */

    if (
      is3DMode()
    ) {

      closeSettingsPanel();


      coreState.liveRendering =
        true;


      dispatch(
        "paintless3d:preview-changed",
        {
          enabled:
            true,

          live:
            true,

          permanent:
            true,

          requestedValue:
            false
        }
      );


      return true;

    }


    coreState.liveRendering =
      false;


    getRendererApi()
      ?.disableLiveRendering?.();


    dispatch(
      "paintless3d:preview-changed",
      {
        enabled:
          false,

        live:
          false,

        permanent:
          true
      }
    );


    return false;

  }


  function enablePreview(
    options = {}
  ) {

    return setPreviewEnabled(
      true,
      options
    );

  }


  function disablePreview() {

    /*
     * Backwards-compatible name.
     * In 3D mode this only closes the settings panel.
     */

    if (
      is3DMode()
    ) {

      closeSettingsPanel();


      return true;

    }


    return setPreviewEnabled(
      false
    );

  }


  function togglePreview() {

    /*
     * The old Preview toggle now opens and closes settings.
     */

    if (
      !is3DMode()
    ) {

      requestMode(
        "3d"
      );


      window.setTimeout(
        () => {

          openSettingsPanel();

        },
        0
      );


      return true;

    }


    toggleSettingsPanel();


    return true;

  }


  /* =======================================================
     12. SETTINGS PANEL CONTROL
  ======================================================= */

  function refreshPanelReference() {

    dom.previewPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );

  }


  function openSettingsPanel() {

    refreshPanelReference();


    coreState.settingsPanelOpen =
      true;


    if (
      typeof getPreviewApi()
        ?.openPanel ===
      "function"
    ) {

      getPreviewApi()
        .openPanel();

    } else {

      dom.previewPanel
        ?.classList.add(
          "is-open"
        );

    }


    updatePreviewButton();


    dispatch(
      "paintless3d:settings-panel-changed",
      {
        open:
          true
      }
    );


    return true;

  }


  function closeSettingsPanel() {

    refreshPanelReference();


    coreState.settingsPanelOpen =
      false;


    if (
      typeof getPreviewApi()
        ?.closePanel ===
      "function"
    ) {

      getPreviewApi()
        .closePanel();

    } else {

      dom.previewPanel
        ?.classList.remove(
          "is-open"
        );

    }


    updatePreviewButton();


    dispatch(
      "paintless3d:settings-panel-changed",
      {
        open:
          false
      }
    );


    return true;

  }


  function toggleSettingsPanel() {

    refreshPanelReference();


    const panelActuallyOpen =
      Boolean(
        dom.previewPanel
          ?.classList.contains(
            "is-open"
          )
      );


    const currentlyOpen =
      coreState.settingsPanelOpen ||
      panelActuallyOpen;


    return currentlyOpen
      ? closeSettingsPanel()
      : openSettingsPanel();

  }


  /* =======================================================
     13. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.modeSwitch =
      document.getElementById(
        "paintless3d-mode-switch"
      ) ||
      findFirst(
        [
          "[data-paintless3d-mode-switch]",
          ".paintless3d-mode-switch"
        ]
      );


    dom.previewButton =
      document.getElementById(
        "paintless3d-preview-button"
      ) ||
      findFirst(
        [
          "[data-paintless3d-preview]",
          "[data-action='paintless3d-preview']",
          ".paintless3d-preview-button"
        ]
      );


    refreshPanelReference();

  }


  /* =======================================================
     14. STYLES
  ======================================================= */

  function installStyles() {

    if (
      coreState.stylesInstalled ||
      document.getElementById(
        "paintless3d-live-core-styles"
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
      "paintless3d-live-core-styles";


    style.textContent = `
      #paintless3d-preview-button,
      [data-paintless3d-preview],
      .paintless3d-preview-button {
        position: relative;
      }

      #paintless3d-preview-button.is-live,
      [data-paintless3d-preview].is-live,
      .paintless3d-preview-button.is-live {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.5);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.15),
            rgba(168, 76, 255, 0.17),
            rgba(37, 230, 255, 0.16)
          );
        box-shadow:
          -2px 0 8px rgba(255, 49, 92, 0.1),
          2px 0 8px rgba(37, 230, 255, 0.11);
      }

      #paintless3d-preview-button.is-live::after,
      [data-paintless3d-preview].is-live::after,
      .paintless3d-preview-button.is-live::after {
        content: "";
        position: absolute;
        right: 4px;
        top: 4px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #69f59c;
        box-shadow:
          0 0 7px rgba(105, 245, 156, 0.7);
      }

      #paintless3d-preview-button.is-panel-open,
      [data-paintless3d-preview].is-panel-open,
      .paintless3d-preview-button.is-panel-open {
        border-color: rgba(168, 76, 255, 0.65);
        filter: brightness(1.08);
      }

      html[data-paintless-mode="2d"]
      #paintless3d-preview-button,
      body:not(.paintless3d-editor-active)
      #paintless3d-preview-button {
        opacity: 0.72;
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
     15. PREVIEW BUTTON
  ======================================================= */

  function updatePreviewButton() {

    if (
      !dom.previewButton
    ) {

      return false;

    }


    const live =
      is3DMode();


    refreshPanelReference();


    const panelOpen =
      Boolean(
        coreState.settingsPanelOpen ||
        dom.previewPanel
          ?.classList.contains(
            "is-open"
          )
      );


    dom.previewButton.classList.toggle(
      "is-live",
      live
    );


    dom.previewButton.classList.toggle(
      "is-panel-open",
      panelOpen
    );


    dom.previewButton.setAttribute(
      "aria-pressed",
      String(
        panelOpen
      )
    );


    dom.previewButton.setAttribute(
      "aria-expanded",
      String(
        panelOpen
      )
    );


    dom.previewButton.title =
      live
        ? panelOpen
          ? "Close live 3D settings"
          : "Open live 3D settings"
        : "Enter 3D mode and open stereo settings";


    dom.previewButton.setAttribute(
      "aria-label",
      dom.previewButton.title
    );


    /*
     * Preserve an existing icon while changing only text that
     * clearly says Preview.
     */

    const textNodes =
      Array.from(
        dom.previewButton.childNodes
      ).filter(
        (node) =>
          node.nodeType ===
          Node.TEXT_NODE
      );


    textNodes.forEach(
      (node) => {

        if (
          /preview/i.test(
            node.textContent ||
            ""
          )
        ) {

          node.textContent =
            live
              ? " Live 3D"
              : " 3D Settings";

        }

      }
    );


    if (
      dom.previewButton.children.length ===
        0
    ) {

      dom.previewButton.textContent =
        live
          ? "👓 Live 3D"
          : "👓 3D Settings";

    }


    return true;

  }


  function handlePreviewButtonClick(
    event
  ) {

    event.preventDefault();

    event.stopImmediatePropagation();


    if (
      !is3DMode()
    ) {

      requestMode(
        "3d"
      );


      window.setTimeout(
        () => {

          openSettingsPanel();

        },
        0
      );


      return;

    }


    toggleSettingsPanel();

  }


  /* =======================================================
     16. MODE EVENTS
  ======================================================= */

  function applyModeState(
    mode,
    {
      announce =
        false
    } = {}
  ) {

    const safeMode =
      normaliseMode(
        mode
      );


    coreState.lastMode =
      safeMode;


    if (
      safeMode ===
      "3d"
    ) {

      coreState.liveRendering =
        true;


      getRendererApi()
        ?.enableLiveRendering?.();


      dispatch(
        "paintless3d:preview-changed",
        {
          enabled:
            true,

          live:
            true,

          permanent:
            true
        }
      );


      if (announce) {

        sendStatusMessage(
          "Live Paintless3D workspace enabled."
        );

      }

    } else {

      coreState.liveRendering =
        false;


      coreState.settingsPanelOpen =
        false;


      getRendererApi()
        ?.disableLiveRendering?.();


      closeSettingsPanel();


      dispatch(
        "paintless3d:preview-changed",
        {
          enabled:
            false,

          live:
            false,

          permanent:
            true
        }
      );


      if (announce) {

        sendStatusMessage(
          "Paintless returned to normal 2D mode."
        );

      }

    }


    updatePreviewButton();


    dispatch(
      "paintless3d:live-state-changed",
      {
        mode:
          safeMode,

        live:
          safeMode ===
            "3d",

        settingsPanelOpen:
          coreState.settingsPanelOpen
      }
    );


    return safeMode;

  }


  function handleModeChanged(
    event
  ) {

    applyModeState(
      event.detail?.mode ||
      getCurrentMode()
    );

  }


  function handleSettingsPanelOpened() {

    coreState.settingsPanelOpen =
      true;


    updatePreviewButton();

  }


  function handleSettingsPanelClosed() {

    coreState.settingsPanelOpen =
      false;


    updatePreviewButton();

  }


  function handleRendererReady() {

    if (
      is3DMode()
    ) {

      getRendererApi()
        ?.enableLiveRendering?.();

    }

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


    if (
      event.key.toLowerCase() ===
      "p" &&
      is3DMode()
    ) {

      event.preventDefault();


      toggleSettingsPanel();

    }

  }


  /* =======================================================
     17. EVENT CONNECTION
  ======================================================= */

  function connectEvents() {

    dom.previewButton
      ?.addEventListener(
        "click",
        handlePreviewButtonClick,
        true
      );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:preview-panel-opened",
      handleSettingsPanelOpened
    );


    document.addEventListener(
      "paintless3d:preview-panel-closed",
      handleSettingsPanelClosed
    );


    document.addEventListener(
      "paintless3d:renderer-ready",
      handleRendererReady
    );


    window.addEventListener(
      "keydown",
      handleKeyboard
    );

  }


  function disconnectEvents() {

    dom.previewButton
      ?.removeEventListener(
        "click",
        handlePreviewButtonClick,
        true
      );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:preview-panel-opened",
      handleSettingsPanelOpened
    );


    document.removeEventListener(
      "paintless3d:preview-panel-closed",
      handleSettingsPanelClosed
    );


    document.removeEventListener(
      "paintless3d:renderer-ready",
      handleRendererReady
    );


    window.removeEventListener(
      "keydown",
      handleKeyboard
    );

  }


  /* =======================================================
     18. INITIALISE
  ======================================================= */

  async function initialise() {

    if (
      coreState.initialised
    ) {

      return true;

    }


    loadSettings();


    collectDomReferences();


    installStyles();


    connectEvents();


    coreState.initialised =
      true;


    coreState.destroyed =
      false;


    coreState.lastMode =
      getCurrentMode();


    applyModeState(
      coreState.lastMode
    );


    updatePreviewButton();


    dispatch(
      "paintless3d:core-ready",
      {
        core:
          publicApi,

        settings:
          getStereoSettings(),

        mode:
          coreState.lastMode,

        live:
          coreState.liveRendering
      }
    );


    console.log(
      "%cPaintless3D Live Core ready.",
      [
        "color:#d49aff",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-1px 0 #ff315c, 1px 0 #25e6ff"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     19. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    closeSettingsPanel();


    dom.styles
      ?.remove();


    coreState.initialised =
      false;


    coreState.destroyed =
      true;


    coreState.liveRendering =
      false;


    coreState.settingsPanelOpen =
      false;


    coreState.stylesInstalled =
      false;


    dispatch(
      "paintless3d:core-destroyed"
    );


    return true;

  }


  /* =======================================================
     20. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      coreState,

    dom,

    defaults:
      {
        ...DEFAULT_SETTINGS
      },


    initialise,

    destroy,


    requestMode,

    enter3DMode,

    enter2DMode,

    toggleMode,

    is3DMode,

    getCurrentMode,


    isPreviewEnabled,

    setPreviewEnabled,

    enablePreview,

    disablePreview,

    togglePreview,


    openSettingsPanel,

    closeSettingsPanel,

    toggleSettingsPanel,


    getStereoSettings,

    setStrength,

    setConvergence,

    setChannelMode,

    setSwapEyes,

    toggleSwapEyes,

    setGhostReduction,

    resetStereoSettings,


    loadSettings,

    saveSettings,


    updatePreviewButton,


    requestRender(
      reason =
        "core-api-request"
    ) {

      return getRendererApi()
        ?.requestRender?.(
          reason
        ) ||
        false;

    },


    isLiveRendering() {

      return Boolean(
        coreState.liveRendering &&
        is3DMode()
      );

    },


    isSettingsPanelOpen() {

      refreshPanelReference();


      return Boolean(
        coreState.settingsPanelOpen ||
        dom.previewPanel
          ?.classList.contains(
            "is-open"
          )
      );

    },


    getSummary() {

      return {

        initialised:
          coreState.initialised,

        mode:
          getCurrentMode(),

        liveRendering:
          coreState.liveRendering,

        settingsPanelOpen:
          publicApi
            .isSettingsPanelOpen(),

        settings:
          getStereoSettings(),

        lastSettingsChange:
          coreState.lastSettingsChange,

        storageAvailable:
          coreState.storageAvailable

      };

    }

  };


  window.Paintless3DCore =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "core",
    {

      label:
        "Paintless3D Live Core",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
