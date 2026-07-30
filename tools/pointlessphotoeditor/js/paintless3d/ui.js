"use strict";

/* =========================================================
   PAINTLESS3D
   LIVE UI COORDINATOR — v0.2

   File:
   js/paintless3d/ui.js

   New behaviour:
   - Paintless3D is permanently live while 3D mode is active
   - The old Preview panel is now Live 3D Settings
   - Dashboard buttons are:
       Depth
       3D Settings
       Export
   - Coordinates the Depth, Settings and Export panels
   - Keeps only one large panel open at a time
   - Shows active-layer 3D state and depth
   - Shows live renderer statistics
   - Keeps backwards compatibility with previous module events
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
      "Paintless3D UI could not start because paintless3d.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. UI STATE
  ======================================================= */

  const uiState = {

    initialised:
      false,

    destroyed:
      false,

    active:
      false,

    dashboardInstalled:
      false,

    stylesInstalled:
      false,

    activePanel:
      "depth",

    exclusivePanels:
      true,

    automaticallyOpenDepth:
      true,

    automaticallyOpenSettings:
      false,

    automaticallyOpenExport:
      true,

    renderCount:
      0,

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

    lastExportFilename:
      null,

    lastExportSize:
      0,

    transitionDuration:
      150

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    sidebar:
      null,

    layersPanel:
      null,

    dashboard:
      null,

    heading:
      null,

    modeBadge:
      null,

    liveBadge:
      null,

    layerName:
      null,

    layerState:
      null,

    layerDepth:
      null,

    renderInformation:
      null,

    depthButton:
      null,

    settingsButton:
      null,

    exportButton:
      null,

    depthPanel:
      null,

    settingsPanel:
      null,

    exportPanel:
      null,

    globalSettingsButton:
      null,

    globalModeSwitch:
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


  function getDepthApi() {

    return (
      window.Paintless3DDepth ||
      paintless3d.getModule?.(
        "depth"
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


  function formatDepth(
    value
  ) {

    const depth =
      Number(
        value
      ) ||
      0;


    return `${
      depth >
      0
        ? "+"
        : ""
    }${depth}`;

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
      ) ||
      value <
        0
    ) {

      return "—";

    }


    if (
      value <
      1
    ) {

      return "<1 ms";

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


  function is3DMode() {

    if (
      typeof paintless3d.is3DMode ===
      "function"
    ) {

      return Boolean(
        paintless3d.is3DMode()
      );

    }


    return Boolean(
      getCoreApi()
        ?.is3DMode?.()
    );

  }


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


  function getLayerName(
    layer =
      getActiveLayer()
  ) {

    return (
      layer?.name ||
      layer?.label ||
      "No layer selected"
    );

  }


  function layerStereoIsEnabled(
    layer =
      getActiveLayer()
  ) {

    return Boolean(
      layer?.stereo3dEnabled
    );

  }


  function getLayerDepth(
    layer =
      getActiveLayer()
  ) {

    if (!layer) {

      return 0;

    }


    return Number(
      layer.depth3d
    ) || 0;

  }


  /* =======================================================
     6. DOM COLLECTION
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


    dom.globalSettingsButton =
      document.getElementById(
        "paintless3d-preview-button"
      );


    dom.globalModeSwitch =
      document.getElementById(
        "paintless3d-mode-switch"
      );


    refreshPanelReferences();

  }


  function getDashboardParent() {

    return (
      dom.layersPanel ||
      dom.sidebar
    );

  }


  /* =======================================================
     7. PANEL REFERENCES
  ======================================================= */

  function refreshPanelReferences() {

    dom.depthPanel =
      document.getElementById(
        "paintless3d-depth-control"
      );


    dom.settingsPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );


    dom.exportPanel =
      document.getElementById(
        "paintless3d-export-panel"
      );


    return {
      depth:
        dom.depthPanel,

      settings:
        dom.settingsPanel,

      export:
        dom.exportPanel
    };

  }


  function getPanelElement(
    panelName
  ) {

    refreshPanelReferences();


    if (
      panelName ===
      "settings"
    ) {

      return dom.settingsPanel;

    }


    if (
      panelName ===
      "export"
    ) {

      return dom.exportPanel;

    }


    return dom.depthPanel;

  }


  function panelIsOpen(
    panelName
  ) {

    const panel =
      getPanelElement(
        panelName
      );


    if (
      panelName ===
      "depth"
    ) {

      return Boolean(
        is3DMode() &&
        panel
      );

    }


    return Boolean(
      panel?.classList.contains(
        "is-open"
      )
    );

  }


  /* =======================================================
     8. STYLES
  ======================================================= */

  function installStyles() {

    if (
      uiState.stylesInstalled ||
      document.getElementById(
        "paintless3d-live-ui-styles"
      )
    ) {

      uiState.stylesInstalled =
        true;


      return true;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-live-ui-styles";


    style.textContent = `
      .paintless3d-dashboard {
        display: none;
        margin: 10px 0 4px;
        padding: 11px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 14px;
        color: #ffffff;
        background:
          radial-gradient(
            circle at 4% 4%,
            rgba(255, 49, 92, 0.14),
            transparent 38%
          ),
          radial-gradient(
            circle at 96% 4%,
            rgba(37, 230, 255, 0.14),
            transparent 38%
          ),
          linear-gradient(
            145deg,
            rgba(30, 19, 46, 0.97),
            rgba(10, 6, 17, 0.98)
          );
        box-shadow:
          inset 0 0 0 1px rgba(168, 76, 255, 0.07),
          0 10px 30px rgba(0, 0, 0, 0.2);
      }

      html[data-paintless-mode="3d"]
      .paintless3d-dashboard,
      body.paintless-3d-mode
      .paintless3d-dashboard,
      body.paintless3d-editor-active
      .paintless3d-dashboard {
        display: block;
      }

      .paintless3d-dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
      }

      .paintless3d-dashboard-title {
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
          -1px 0 rgba(255, 49, 92, 0.48),
          1px 0 rgba(37, 230, 255, 0.48);
      }

      .paintless3d-dashboard-glasses {
        font-size: 17px;
        line-height: 1;
        filter:
          drop-shadow(-2px 0 3px rgba(255, 49, 92, 0.28))
          drop-shadow(2px 0 3px rgba(37, 230, 255, 0.28));
      }

      .paintless3d-dashboard-badges {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .paintless3d-dashboard-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 31px;
        height: 22px;
        padding: 0 6px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 7px;
        color: rgba(255, 255, 255, 0.55);
        background: rgba(255, 255, 255, 0.04);
        font:
          900 8px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .paintless3d-dashboard-badge.is-active {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.44);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.13),
            rgba(37, 230, 255, 0.14)
          );
      }

      .paintless3d-dashboard-badge.is-live {
        color: #9dffbd;
        border-color: rgba(105, 245, 156, 0.35);
        background: rgba(105, 245, 156, 0.075);
      }

      .paintless3d-dashboard-layer {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          auto;
        align-items: center;
        gap: 9px;
        margin-top: 10px;
        padding: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.028);
      }

      .paintless3d-dashboard-layer-copy {
        min-width: 0;
      }

      .paintless3d-dashboard-layer-label {
        display: block;
        color: rgba(255, 255, 255, 0.37);
        font:
          700 7px/1
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .paintless3d-dashboard-layer-name {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.75);
        font:
          700 10px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless3d-dashboard-layer-state {
        display: block;
        margin-top: 3px;
        color: rgba(255, 255, 255, 0.4);
        font:
          600 8px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-dashboard-layer-state.is-enabled {
        color: #8ff7b4;
      }

      .paintless3d-dashboard-depth {
        display: inline-grid;
        place-items: center;
        min-width: 48px;
        height: 31px;
        padding: 0 7px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 9px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.12),
            rgba(37, 230, 255, 0.13)
          );
        font:
          900 10px/1
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-dashboard-depth.is-flat {
        color: rgba(255, 255, 255, 0.52);
        background: rgba(255, 255, 255, 0.035);
      }

      .paintless3d-dashboard-actions {
        display: grid;
        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );
        gap: 5px;
        margin-top: 9px;
      }

      .paintless3d-dashboard-action {
        min-width: 0;
        height: 34px;
        padding: 0 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.035);
        font:
          800 7px/1
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

      .paintless3d-dashboard-action:hover {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.24);
        background: rgba(255, 255, 255, 0.075);
        transform: translateY(-1px);
      }

      .paintless3d-dashboard-action.is-active {
        color: #ffffff;
        border-color: rgba(37, 230, 255, 0.45);
        background:
          linear-gradient(
            90deg,
            rgba(255, 49, 92, 0.13),
            rgba(37, 230, 255, 0.15)
          );
      }

      .paintless3d-dashboard-render {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.075);
        color: rgba(255, 255, 255, 0.4);
        font:
          600 8px/1.35
          "Segoe UI",
          Arial,
          sans-serif;
        text-align: center;
      }

      .paintless3d-dashboard-render strong {
        color: rgba(255, 255, 255, 0.7);
        font-weight: 800;
      }

      body.paintless3d-editor-active
      .paintless3d-depth-control,
      body.paintless3d-editor-active
      .paintless3d-preview-panel,
      body.paintless3d-editor-active
      .paintless3d-export-panel,
      body.paintless-3d-mode
      .paintless3d-depth-control,
      body.paintless-3d-mode
      .paintless3d-preview-panel,
      body.paintless-3d-mode
      .paintless3d-export-panel {
        animation:
          paintless3d-live-panel-arrive
          150ms ease;
      }

      @keyframes paintless3d-live-panel-arrive {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 620px) {
        .paintless3d-dashboard {
          padding: 9px;
        }

        .paintless3d-dashboard-actions {
          gap: 4px;
        }

        .paintless3d-dashboard-action {
          height: 35px;
          font-size: 6px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    uiState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. DASHBOARD CREATION
  ======================================================= */

  function createDashboardButton(
    label,
    panelName
  ) {

    const button =
      createElement(
        "button",
        "paintless3d-dashboard-action",
        label
      );


    button.type =
      "button";


    button.dataset.paintless3dPanel =
      panelName;


    button.setAttribute(
      "aria-pressed",
      "false"
    );


    return button;

  }


  function createDashboard() {

    const dashboard =
      createElement(
        "section",
        "paintless3d-dashboard"
      );


    dashboard.id =
      "paintless3d-dashboard";


    dashboard.setAttribute(
      "aria-label",
      "Paintless3D dashboard"
    );


    const header =
      createElement(
        "div",
        "paintless3d-dashboard-header"
      );


    const title =
      createElement(
        "h3",
        "paintless3d-dashboard-title"
      );


    const glasses =
      createElement(
        "span",
        "paintless3d-dashboard-glasses",
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
        "Paintless3D"
      );


    title.append(
      glasses,
      titleText
    );


    const badges =
      createElement(
        "div",
        "paintless3d-dashboard-badges"
      );


    const modeBadge =
      createElement(
        "span",
        "paintless3d-dashboard-badge",
        "3D"
      );


    const liveBadge =
      createElement(
        "span",
        "paintless3d-dashboard-badge",
        "Live"
      );


    badges.append(
      modeBadge,
      liveBadge
    );


    header.append(
      title,
      badges
    );


    const layerRow =
      createElement(
        "div",
        "paintless3d-dashboard-layer"
      );


    const layerCopy =
      createElement(
        "span",
        "paintless3d-dashboard-layer-copy"
      );


    const layerLabel =
      createElement(
        "span",
        "paintless3d-dashboard-layer-label",
        "Active layer"
      );


    const layerName =
      createElement(
        "strong",
        "paintless3d-dashboard-layer-name",
        "No layer selected"
      );


    const layerState =
      createElement(
        "span",
        "paintless3d-dashboard-layer-state",
        "Flat layer"
      );


    layerCopy.append(
      layerLabel,
      layerName,
      layerState
    );


    const layerDepth =
      createElement(
        "span",
        "paintless3d-dashboard-depth is-flat",
        "Flat"
      );


    layerRow.append(
      layerCopy,
      layerDepth
    );


    const actions =
      createElement(
        "div",
        "paintless3d-dashboard-actions"
      );


    const depthButton =
      createDashboardButton(
        "Depth",
        "depth"
      );


    const settingsButton =
      createDashboardButton(
        "3D Settings",
        "settings"
      );


    const exportButton =
      createDashboardButton(
        "Export",
        "export"
      );


    actions.append(
      depthButton,
      settingsButton,
      exportButton
    );


    const renderInformation =
      createElement(
        "div",
        "paintless3d-dashboard-render",
        "Live renderer ready."
      );


    dashboard.append(
      header,
      layerRow,
      actions,
      renderInformation
    );


    dom.dashboard =
      dashboard;


    dom.heading =
      title;


    dom.modeBadge =
      modeBadge;


    dom.liveBadge =
      liveBadge;


    dom.layerName =
      layerName;


    dom.layerState =
      layerState;


    dom.layerDepth =
      layerDepth;


    dom.renderInformation =
      renderInformation;


    dom.depthButton =
      depthButton;


    dom.settingsButton =
      settingsButton;


    dom.exportButton =
      exportButton;


    return dashboard;

  }


  function collectDashboardReferences(
    dashboard
  ) {

    dom.dashboard =
      dashboard;


    dom.modeBadge =
      dashboard.querySelectorAll(
        ".paintless3d-dashboard-badge"
      )[0] ||
      null;


    dom.liveBadge =
      dashboard.querySelectorAll(
        ".paintless3d-dashboard-badge"
      )[1] ||
      null;


    dom.layerName =
      dashboard.querySelector(
        ".paintless3d-dashboard-layer-name"
      );


    dom.layerState =
      dashboard.querySelector(
        ".paintless3d-dashboard-layer-state"
      );


    dom.layerDepth =
      dashboard.querySelector(
        ".paintless3d-dashboard-depth"
      );


    dom.renderInformation =
      dashboard.querySelector(
        ".paintless3d-dashboard-render"
      );


    dom.depthButton =
      dashboard.querySelector(
        '[data-paintless3d-panel="depth"]'
      );


    dom.settingsButton =
      dashboard.querySelector(
        '[data-paintless3d-panel="settings"]'
      );


    dom.exportButton =
      dashboard.querySelector(
        '[data-paintless3d-panel="export"]'
      );

  }


  function installDashboard() {

    const existingDashboard =
      document.getElementById(
        "paintless3d-dashboard"
      );


    if (existingDashboard) {

      existingDashboard.remove();

    }


    const parent =
      getDashboardParent();


    if (!parent) {

      return false;

    }


    const dashboard =
      createDashboard();


    refreshPanelReferences();


    const first3DPanel =
      parent.querySelector(
        [
          "#paintless3d-depth-control",
          "#paintless3d-preview-panel",
          "#paintless3d-export-panel"
        ].join(
          ","
        )
      );


    if (first3DPanel) {

      parent.insertBefore(
        dashboard,
        first3DPanel
      );

    } else {

      parent.appendChild(
        dashboard
      );

    }


    collectDashboardReferences(
      dashboard
    );


    uiState.dashboardInstalled =
      true;


    return true;

  }


  /* =======================================================
     10. PANEL MANAGEMENT
  ======================================================= */

  function updatePanelButtons() {

    const mappings = [

      [
        dom.depthButton,
        "depth"
      ],

      [
        dom.settingsButton,
        "settings"
      ],

      [
        dom.exportButton,
        "export"
      ]

    ];


    mappings.forEach(
      (
        [
          button,
          panelName
        ]
      ) => {

        const active =
          uiState.activePanel ===
          panelName;


        button
          ?.classList.toggle(
            "is-active",
            active
          );


        button
          ?.setAttribute(
            "aria-pressed",
            String(
              active
            )
          );

      }
    );

  }


  function closeDepthPanel() {

    getDepthApi()
      ?.hideDepthControl?.();


    return true;

  }


  function closeSettingsPanel() {

    getSettingsApi()
      ?.closePanel?.();


    return true;

  }


  function closeExportPanel() {

    getExportApi()
      ?.closePanel?.();


    return true;

  }


  function closeAllPanels({
    except =
      null
  } = {}) {

    if (
      except !==
      "depth"
    ) {

      closeDepthPanel();

    }


    if (
      except !==
      "settings"
    ) {

      closeSettingsPanel();

    }


    if (
      except !==
      "export"
    ) {

      closeExportPanel();

    }


    return true;

  }


  function openPanel(
    panelName,
    {
      announce =
        false
    } = {}
  ) {

    const safePanel =
      [
        "depth",
        "settings",
        "export"
      ].includes(
        panelName
      )
        ? panelName
        : "depth";


    if (
      !is3DMode()
    ) {

      getCoreApi()
        ?.requestMode?.(
          "3d"
        );

    }


    if (
      uiState.exclusivePanels
    ) {

      closeAllPanels({
        except:
          safePanel
      });

    }


    if (
      safePanel ===
      "settings"
    ) {

      getSettingsApi()
        ?.openPanel?.();

    } else if (
      safePanel ===
      "export"
    ) {

      getExportApi()
        ?.openPanel?.();

    } else {

      getDepthApi()
        ?.showDepthControl?.();

    }


    uiState.activePanel =
      safePanel;


    updatePanelButtons();


    if (announce) {

      const label =
        safePanel ===
          "settings"
          ? "3D settings"
          : safePanel;


      sendStatusMessage(
        `Paintless3D ${label} opened.`
      );

    }


    dispatch(
      "paintless3d:ui-panel-changed",
      {
        panel:
          safePanel
      }
    );


    return safePanel;

  }


  function togglePanel(
    panelName
  ) {

    const safePanel =
      [
        "depth",
        "settings",
        "export"
      ].includes(
        panelName
      )
        ? panelName
        : "depth";


    if (
      uiState.activePanel ===
      safePanel &&
      safePanel !==
        "depth" &&
      panelIsOpen(
        safePanel
      )
    ) {

      closeAllPanels();


      uiState.activePanel =
        null;


      updatePanelButtons();


      dispatch(
        "paintless3d:ui-panel-changed",
        {
          panel:
            null
        }
      );


      return false;

    }


    return openPanel(
      safePanel,
      {
        announce:
          true
      }
    );

  }


  /* =======================================================
     11. DASHBOARD DISPLAY
  ======================================================= */

  function updateLayerDisplay() {

    const layer =
      getActiveLayer();


    const enabled =
      layerStereoIsEnabled(
        layer
      );


    const depth =
      getLayerDepth(
        layer
      );


    if (dom.layerName) {

      dom.layerName.textContent =
        getLayerName(
          layer
        );

    }


    if (dom.layerState) {

      dom.layerState.textContent =
        !layer
          ? "No layer selected"
          : enabled
            ? "3D depth enabled"
            : "Flat layer";


      dom.layerState.classList.toggle(
        "is-enabled",
        enabled
      );

    }


    if (dom.layerDepth) {

      dom.layerDepth.textContent =
        enabled
          ? formatDepth(
              depth
            )
          : "Flat";


      dom.layerDepth.classList.toggle(
        "is-flat",
        !enabled
      );

    }


    return true;

  }


  function updateModeDisplay() {

    const active =
      is3DMode();


    uiState.active =
      active;


    dom.modeBadge
      ?.classList.toggle(
        "is-active",
        active
      );


    if (dom.modeBadge) {

      dom.modeBadge.textContent =
        active
          ? "3D"
          : "2D";

    }


    return active;

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


    dom.liveBadge
      ?.classList.toggle(
        "is-active",
        live
      );


    dom.liveBadge
      ?.classList.toggle(
        "is-live",
        live
      );


    if (dom.liveBadge) {

      dom.liveBadge.textContent =
        live
          ? "Live"
          : "Off";

    }


    return live;

  }


  function updateRenderDisplay() {

    if (!dom.renderInformation) {

      return false;

    }


    if (
      uiState.renderCount <=
      0
    ) {

      dom.renderInformation.innerHTML =
        [
          "<strong>Live renderer ready.</strong>",
          " Toggle a layer's red/blue button to add depth."
        ].join(
          ""
        );


      return true;

    }


    dom.renderInformation.innerHTML =
      [
        "<strong>",
        `${uiState.lastRenderWidth} × ${uiState.lastRenderHeight}`,
        "</strong>",
        " · ",
        "<strong>",
        formatDuration(
          uiState.lastRenderDuration
        ),
        "</strong>",
        " · ",
        uiState.lastRenderLayers,
        uiState.lastRenderLayers ===
          1
          ? " layer"
          : " layers",
        " · ",
        uiState.renderCount,
        uiState.renderCount ===
          1
          ? " refresh"
          : " refreshes"
      ].join(
        ""
      );


    return true;

  }


  function updateDashboard() {

    updateModeDisplay();

    updateLiveDisplay();

    updateLayerDisplay();

    updateRenderDisplay();

    updatePanelButtons();


    dispatch(
      "paintless3d:ui-updated",
      {
        mode:
          is3DMode()
            ? "3d"
            : "2d",

        live:
          Boolean(
            is3DMode() &&
            getRendererApi()
              ?.isEnabled?.()
          ),

        layer:
          getActiveLayer(),

        stereoEnabled:
          layerStereoIsEnabled(),

        depth:
          getLayerDepth(),

        activePanel:
          uiState.activePanel
      }
    );


    return true;

  }


  /* =======================================================
     12. BUTTON HANDLERS
  ======================================================= */

  function handleDepthButton() {

    openPanel(
      "depth",
      {
        announce:
          true
      }
    );

  }


  function handleSettingsButton() {

    togglePanel(
      "settings"
    );

  }


  function handleExportButton() {

    openPanel(
      "export",
      {
        announce:
          true
      }
    );

  }


  /* =======================================================
     13. DOCUMENT EVENT HANDLERS
  ======================================================= */

  function handleModeChanged(
    event
  ) {

    const active =
      event.detail?.mode ===
      "3d";


    uiState.active =
      active;


    if (
      active &&
      uiState.automaticallyOpenDepth
    ) {

      window.setTimeout(
        () => {

          openPanel(
            "depth"
          );

        },
        uiState.transitionDuration
      );

    }


    if (!active) {

      closeAllPanels();


      uiState.activePanel =
        "depth";

    }


    updateDashboard();

  }


  function handleLiveStateChanged() {

    updateLiveDisplay();

  }


  function handleLayerChanged() {

    updateLayerDisplay();

  }


  function handleDepthChanged() {

    updateLayerDisplay();

  }


  function handleStereoChanged() {

    updateLayerDisplay();

  }


  function handleRenderRequested() {

    if (
      dom.renderInformation
    ) {

      dom.renderInformation.textContent =
        "Refreshing live stereoscopic image…";

    }

  }


  function handleRenderCompleted(
    event
  ) {

    uiState.renderCount +=
      1;


    uiState.lastRenderDuration =
      Number(
        event.detail?.duration
      ) ||
      0;


    uiState.lastRenderWidth =
      Number(
        event.detail?.width
      ) ||
      0;


    uiState.lastRenderHeight =
      Number(
        event.detail?.height
      ) ||
      0;


    uiState.lastRenderLayers =
      Number(
        event.detail?.layers
      ) ||
      0;


    uiState.lastRenderReason =
      event.detail?.reason ||
      "live-render";


    updateRenderDisplay();

  }


  function handleRenderFailed() {

    if (
      dom.renderInformation
    ) {

      dom.renderInformation.textContent =
        "Live 3D rendering failed. Check the console.";

    }

  }


  function handleSettingsPanelOpened() {

    uiState.activePanel =
      "settings";


    updatePanelButtons();

  }


  function handleSettingsPanelClosed() {

    if (
      uiState.activePanel ===
      "settings"
    ) {

      uiState.activePanel =
        "depth";


      getDepthApi()
        ?.showDepthControl?.();

    }


    updatePanelButtons();

  }


  function handleExportStarted() {

    if (
      uiState.automaticallyOpenExport
    ) {

      openPanel(
        "export"
      );

    }


    if (
      dom.renderInformation
    ) {

      dom.renderInformation.textContent =
        "Preparing full-resolution 3D export…";

    }

  }


  function handleExportCompleted(
    event
  ) {

    uiState.lastExportFilename =
      event.detail?.filename ||
      null;


    uiState.lastExportSize =
      Number(
        event.detail?.size
      ) ||
      0;


    if (
      dom.renderInformation
    ) {

      dom.renderInformation.innerHTML =
        [
          "Exported ",
          "<strong>",
          uiState.lastExportFilename ||
          "Paintless3D image",
          "</strong>",
          " · ",
          "<strong>",
          formatBytes(
            uiState.lastExportSize
          ),
          "</strong>"
        ].join(
          ""
        );

    }

  }


  function handleExportFailed() {

    if (
      dom.renderInformation
    ) {

      dom.renderInformation.textContent =
        "Paintless3D export failed. Check the console.";

    }

  }


  function handlePanelChanged(
    event
  ) {

    const panel =
      event.detail?.panel;


    if (
      panel ===
      null ||
      [
        "depth",
        "settings",
        "export"
      ].includes(
        panel
      )
    ) {

      uiState.activePanel =
        panel;


      updatePanelButtons();

    }

  }


  function handleDocumentReset() {

    window.setTimeout(
      updateDashboard,
      0
    );

  }


  function handleKeyboard(
    event
  ) {

    if (
      !is3DMode() ||
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
      event.key ===
      "1"
    ) {

      event.preventDefault();


      openPanel(
        "depth",
        {
          announce:
            true
        }
      );


      return;

    }


    if (
      event.key ===
      "2"
    ) {

      event.preventDefault();


      togglePanel(
        "settings"
      );


      return;

    }


    if (
      event.key ===
      "3"
    ) {

      event.preventDefault();


      openPanel(
        "export",
        {
          announce:
            true
        }
      );

    }

  }


  /* =======================================================
     14. EVENT CONNECTION
  ======================================================= */

  function connectEvents() {

    dom.depthButton
      ?.addEventListener(
        "click",
        handleDepthButton
      );


    dom.settingsButton
      ?.addEventListener(
        "click",
        handleSettingsButton
      );


    dom.exportButton
      ?.addEventListener(
        "click",
        handleExportButton
      );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:live-state-changed",
      handleLiveStateChanged
    );


    document.addEventListener(
      "paintless3d:live-rendering-changed",
      handleLiveStateChanged
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      handleLayerChanged
    );


    document.addEventListener(
      "paintless:layer-selected",
      handleLayerChanged
    );


    document.addEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    document.addEventListener(
      "paintless3d:layer-stereo-changed",
      handleStereoChanged
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
      "paintless3d:preview-panel-opened",
      handleSettingsPanelOpened
    );


    document.addEventListener(
      "paintless3d:preview-panel-closed",
      handleSettingsPanelClosed
    );


    document.addEventListener(
      "paintless3d:settings-panel-changed",
      (event) => {

        if (
          event.detail?.open
        ) {

          handleSettingsPanelOpened();

        } else {

          handleSettingsPanelClosed();

        }

      }
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
      handleExportFailed
    );


    document.addEventListener(
      "paintless3d:ui-panel-changed",
      handlePanelChanged
    );


    document.addEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.addEventListener(
      "paintless:layers-restored",
      handleDocumentReset
    );


    window.addEventListener(
      "keydown",
      handleKeyboard
    );

  }


  function disconnectEvents() {

    dom.depthButton
      ?.removeEventListener(
        "click",
        handleDepthButton
      );


    dom.settingsButton
      ?.removeEventListener(
        "click",
        handleSettingsButton
      );


    dom.exportButton
      ?.removeEventListener(
        "click",
        handleExportButton
      );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:live-state-changed",
      handleLiveStateChanged
    );


    document.removeEventListener(
      "paintless3d:live-rendering-changed",
      handleLiveStateChanged
    );


    document.removeEventListener(
      "paintless:active-layer-changed",
      handleLayerChanged
    );


    document.removeEventListener(
      "paintless:layer-selected",
      handleLayerChanged
    );


    document.removeEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    document.removeEventListener(
      "paintless3d:layer-stereo-changed",
      handleStereoChanged
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
      "paintless3d:preview-panel-opened",
      handleSettingsPanelOpened
    );


    document.removeEventListener(
      "paintless3d:preview-panel-closed",
      handleSettingsPanelClosed
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
      handleExportFailed
    );


    document.removeEventListener(
      "paintless3d:ui-panel-changed",
      handlePanelChanged
    );


    document.removeEventListener(
      "paintless:document-reset",
      handleDocumentReset
    );


    document.removeEventListener(
      "paintless:layers-restored",
      handleDocumentReset
    );


    window.removeEventListener(
      "keydown",
      handleKeyboard
    );

  }


  /* =======================================================
     15. INITIALISE
  ======================================================= */

  async function initialise() {

    if (
      uiState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    if (
      !installDashboard()
    ) {

      throw new Error(
        "Paintless3D UI could not find the right-side panel."
      );

    }


    refreshPanelReferences();


    connectEvents();


    uiState.active =
      is3DMode();


    uiState.initialised =
      true;


    uiState.destroyed =
      false;


    if (
      uiState.active &&
      uiState.automaticallyOpenDepth
    ) {

      openPanel(
        "depth"
      );

    }


    updateDashboard();


    dispatch(
      "paintless3d:ui-ready",
      {
        ui:
          publicApi,

        live:
          true
      }
    );


    console.log(
      "%cPaintless3D Live UI ready.",
      [
        "color:#a84cff",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:-1px 0 #ff315c, 1px 0 #25e6ff"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     16. DESTROY
  ======================================================= */

  async function destroy() {

    disconnectEvents();


    closeAllPanels();


    dom.dashboard
      ?.remove();


    dom.styles
      ?.remove();


    uiState.initialised =
      false;


    uiState.destroyed =
      true;


    uiState.active =
      false;


    uiState.dashboardInstalled =
      false;


    uiState.stylesInstalled =
      false;


    dispatch(
      "paintless3d:ui-destroyed"
    );


    return true;

  }


  /* =======================================================
     17. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      uiState,

    dom,


    initialise,

    destroy,


    openPanel,

    togglePanel,

    closeAllPanels,


    updateDashboard,

    updateLayerDisplay,

    updateModeDisplay,

    updateLiveDisplay,

    updateRenderDisplay,


    refreshPanelReferences,


    setExclusivePanels(
      enabled
    ) {

      uiState.exclusivePanels =
        Boolean(
          enabled
        );


      return uiState.exclusivePanels;

    },


    setAutomaticDepthPanel(
      enabled
    ) {

      uiState.automaticallyOpenDepth =
        Boolean(
          enabled
        );


      return uiState
        .automaticallyOpenDepth;

    },


    setAutomaticSettingsPanel(
      enabled
    ) {

      uiState.automaticallyOpenSettings =
        Boolean(
          enabled
        );


      return uiState
        .automaticallyOpenSettings;

    },


    setAutomaticPreviewPanel(
      enabled
    ) {

      /*
       * Backwards-compatible name.
       */

      return publicApi
        .setAutomaticSettingsPanel(
          enabled
        );

    },


    setAutomaticExportPanel(
      enabled
    ) {

      uiState.automaticallyOpenExport =
        Boolean(
          enabled
        );


      return uiState
        .automaticallyOpenExport;

    },


    getActivePanel() {

      return uiState.activePanel;

    },


    isInitialised() {

      return uiState.initialised;

    },


    getSummary() {

      const layer =
        getActiveLayer();


      return {

        active:
          uiState.active,

        live:
          Boolean(
            is3DMode() &&
            getRendererApi()
              ?.isEnabled?.()
          ),

        activePanel:
          uiState.activePanel,

        activeLayer:
          layer,

        activeLayerStereoEnabled:
          layerStereoIsEnabled(
            layer
          ),

        activeLayerDepth:
          getLayerDepth(
            layer
          ),

        renderCount:
          uiState.renderCount,

        lastRenderDuration:
          uiState.lastRenderDuration,

        lastRenderWidth:
          uiState.lastRenderWidth,

        lastRenderHeight:
          uiState.lastRenderHeight,

        lastRenderLayers:
          uiState.lastRenderLayers,

        lastRenderReason:
          uiState.lastRenderReason,

        lastExportFilename:
          uiState.lastExportFilename,

        lastExportSize:
          uiState.lastExportSize

      };

    }

  };


  window.Paintless3DUI =
    publicApi;


  /* =======================================================
     18. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "ui",
    {

      label:
        "Paintless3D Live Interface",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
