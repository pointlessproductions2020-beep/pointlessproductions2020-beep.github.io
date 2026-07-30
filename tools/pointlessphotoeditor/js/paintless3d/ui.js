"use strict";

/* =========================================================
   PAINTLESS3D
   UI COORDINATOR — v0.1

   File:
   js/paintless3d/ui.js

   Purpose:
   - Connects the complete Paintless3D interface
   - Coordinates Depth, Preview and Export panels
   - Keeps the right sidebar tidy
   - Adds a compact Paintless3D dashboard
   - Shows current mode, preview state and active-layer depth
   - Adds buttons for Depth, Preview and Export
   - Updates automatically as Paintless3D changes
   - Adds mobile-friendly panel behaviour
   - Provides one place for future UI improvements
   - Does not perform rendering itself

   Connected modules:
   - core.js
   - mode.js
   - depth.js
   - renderer.js
   - preview.js
   - export.js
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

    automaticallyOpenPreview:
      true,

    automaticallyOpenExport:
      true,

    compactOnMobile:
      true,

    renderCount:
      0,

    lastRenderDuration:
      0,

    lastRenderWidth:
      0,

    lastRenderHeight:
      0,

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

    previewBadge:
      null,

    activeLayerName:
      null,

    activeLayerDepth:
      null,

    renderInformation:
      null,

    depthButton:
      null,

    previewButton:
      null,

    exportButton:
      null,

    depthPanel:
      null,

    previewPanel:
      null,

    exportPanel:
      null,

    globalPreviewButton:
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


  function getPreviewApi() {

    return (
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


  function getActiveLayer() {

    return (
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


  function getActiveDepth() {

    return (
      getDepthApi()
        ?.getActiveLayerDepth?.() ||
      0
    );

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


    dom.depthPanel =
      document.getElementById(
        "paintless3d-depth-control"
      );


    dom.previewPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );


    dom.exportPanel =
      document.getElementById(
        "paintless3d-export-panel"
      );


    dom.globalPreviewButton =
      document.getElementById(
        "paintless3d-preview-button"
      );


    dom.globalModeSwitch =
      document.getElementById(
        "paintless3d-mode-switch"
      );

  }


  function getDashboardParent() {

    if (
      dom.layersPanel
    ) {

      return dom.layersPanel;

    }


    return dom.sidebar;

  }


  /* =======================================================
     7. STYLES
  ======================================================= */

  function installStyles() {

    if (
      uiState.stylesInstalled ||
      document.getElementById(
        "paintless3d-ui-styles"
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
      "paintless3d-ui-styles";


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

      .paintless3d-dashboard-layer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
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

      .paintless3d-dashboard-depth {
        display: inline-grid;
        place-items: center;
        min-width: 44px;
        height: 29px;
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
          900 11px/1
          "Segoe UI",
          Arial,
          sans-serif;
      }

      .paintless3d-dashboard-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-top: 9px;
      }

      .paintless3d-dashboard-action {
        min-width: 0;
        height: 32px;
        padding: 0 4px;
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
        color: rgba(255, 255, 255, 0.38);
        font:
          600 8px/1.35
          "Segoe UI",
          Arial,
          sans-serif;
        text-align: center;
      }

      .paintless3d-dashboard-render strong {
        color: rgba(255, 255, 255, 0.68);
        font-weight: 800;
      }

      body.paintless3d-editor-active
      .paintless3d-depth-control,
      body.paintless3d-editor-active
      .paintless3d-preview-panel,
      body.paintless3d-editor-active
      .paintless3d-export-panel {
        animation:
          paintless3d-panel-arrive
          150ms ease;
      }

      @keyframes paintless3d-panel-arrive {
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
          height: 34px;
          font-size: 7px;
        }
      }

      @media (max-width: 430px) {
        .paintless3d-dashboard-title {
          font-size: 10px;
        }

        .paintless3d-dashboard-badge {
          min-width: 28px;
          padding-inline: 4px;
          font-size: 7px;
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
     8. DASHBOARD CREATION
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


    const previewBadge =
      createElement(
        "span",
        "paintless3d-dashboard-badge",
        "Preview"
      );


    badges.append(
      modeBadge,
      previewBadge
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


    layerCopy.append(
      layerLabel,
      layerName
    );


    const layerDepth =
      createElement(
        "span",
        "paintless3d-dashboard-depth",
        "0"
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


    const previewButton =
      createDashboardButton(
        "Preview",
        "preview"
      );


    const exportButton =
      createDashboardButton(
        "Export",
        "export"
      );


    actions.append(
      depthButton,
      previewButton,
      exportButton
    );


    const renderInformation =
      createElement(
        "div",
        "paintless3d-dashboard-render",
        "Renderer ready."
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


    dom.previewBadge =
      previewBadge;


    dom.activeLayerName =
      layerName;


    dom.activeLayerDepth =
      layerDepth;


    dom.renderInformation =
      renderInformation;


    dom.depthButton =
      depthButton;


    dom.previewButton =
      previewButton;


    dom.exportButton =
      exportButton;


    return dashboard;

  }


  function installDashboard() {

    const existingDashboard =
      document.getElementById(
        "paintless3d-dashboard"
      );


    if (existingDashboard) {

      dom.dashboard =
        existingDashboard;


      dom.modeBadge =
        existingDashboard.querySelector(
          ".paintless3d-dashboard-badge"
        );


      dom.previewBadge =
        existingDashboard.querySelectorAll(
          ".paintless3d-dashboard-badge"
        )[1] ||
        null;


      dom.activeLayerName =
        existingDashboard.querySelector(
          ".paintless3d-dashboard-layer-name"
        );


      dom.activeLayerDepth =
        existingDashboard.querySelector(
          ".paintless3d-dashboard-depth"
        );


      dom.renderInformation =
        existingDashboard.querySelector(
          ".paintless3d-dashboard-render"
        );


      dom.depthButton =
        existingDashboard.querySelector(
          '[data-paintless3d-panel="depth"]'
        );


      dom.previewButton =
        existingDashboard.querySelector(
          '[data-paintless3d-panel="preview"]'
        );


      dom.exportButton =
        existingDashboard.querySelector(
          '[data-paintless3d-panel="export"]'
        );


      uiState.dashboardInstalled =
        true;


      return true;

    }


    const parent =
      getDashboardParent();


    if (!parent) {

      return false;

    }


    const dashboard =
      createDashboard();


    /*
     * Put the dashboard before the individual 3D controls,
     * keeping the complete 3D area grouped together.
     */

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


    uiState.dashboardInstalled =
      true;


    return true;

  }


  /* =======================================================
     9. PANEL MANAGEMENT
  ======================================================= */

  function refreshPanelReferences() {

    dom.depthPanel =
      document.getElementById(
        "paintless3d-depth-control"
      );


    dom.previewPanel =
      document.getElementById(
        "paintless3d-preview-panel"
      );


    dom.exportPanel =
      document.getElementById(
        "paintless3d-export-panel"
      );

  }


  function getPanelElement(
    panelName
  ) {

    refreshPanelReferences();


    if (
      panelName ===
      "preview"
    ) {

      return dom.previewPanel;

    }


    if (
      panelName ===
      "export"
    ) {

      return dom.exportPanel;

    }


    return dom.depthPanel;

  }


  function updatePanelButtons() {

    const mappings = [

      [
        dom.depthButton,
        "depth"
      ],

      [
        dom.previewButton,
        "preview"
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


  function closeAllPanels({
    except =
      null
  } = {}) {

    if (
      except !==
      "depth"
    ) {

      getDepthApi()
        ?.hideDepthControl?.();

    }


    if (
      except !==
      "preview"
    ) {

      getPreviewApi()
        ?.closePanel?.();

    }


    if (
      except !==
      "export"
    ) {

      getExportApi()
        ?.closePanel?.();

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
        "preview",
        "export"
      ].includes(
        panelName
      )
        ? panelName
        : "depth";


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
      "preview"
    ) {

      getPreviewApi()
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

      sendStatusMessage(
        `Paintless3D ${safePanel} controls opened.`
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

    if (
      uiState.activePanel ===
      panelName
    ) {

      const panel =
        getPanelElement(
          panelName
        );


      const currentlyOpen =
        panelName ===
          "depth"
          ? uiState.active
          : panel?.classList.contains(
              "is-open"
            );


      if (
        currentlyOpen &&
        panelName !==
          "depth"
      ) {

        closeAllPanels();


        uiState.activePanel =
          null;


        updatePanelButtons();


        return false;

      }

    }


    return openPanel(
      panelName,
      {
        announce:
          true
      }
    );

  }


  /* =======================================================
     10. DASHBOARD DISPLAY
  ======================================================= */

  function updateLayerDisplay() {

    const layer =
      getActiveLayer();


    if (dom.activeLayerName) {

      dom.activeLayerName.textContent =
        getLayerName(
          layer
        );

    }


    if (dom.activeLayerDepth) {

      dom.activeLayerDepth.textContent =
        formatDepth(
          getActiveDepth()
        );

    }


    return true;

  }


  function updateModeDisplay() {

    const is3D =
      paintless3d.is3DMode?.() ||
      false;


    uiState.active =
      is3D;


    dom.modeBadge
      ?.classList.toggle(
        "is-active",
        is3D
      );


    if (dom.modeBadge) {

      dom.modeBadge.textContent =
        is3D
          ? "3D"
          : "2D";

    }


    return is3D;

  }


  function updatePreviewDisplay() {

    const enabled =
      getCoreApi()
        ?.isPreviewEnabled?.() ||
      false;


    dom.previewBadge
      ?.classList.toggle(
        "is-active",
        enabled
      );


    if (dom.previewBadge) {

      dom.previewBadge.textContent =
        enabled
          ? "Preview On"
          : "Preview";

    }


    return enabled;

  }


  function updateRenderDisplay() {

    if (!dom.renderInformation) {

      return false;

    }


    if (
      uiState.renderCount <=
      0
    ) {

      dom.renderInformation.textContent =
        "Renderer ready. Enable Preview to see the anaglyph image.";


      return true;

    }


    dom.renderInformation.innerHTML =
      [
        "<strong>",
        `${uiState.lastRenderWidth} × ${uiState.lastRenderHeight}`,
        "</strong>",
        " rendered in ",
        "<strong>",
        formatDuration(
          uiState.lastRenderDuration
        ),
        "</strong>",
        " · ",
        uiState.renderCount,
        uiState.renderCount ===
          1
          ? " render"
          : " renders"
      ].join(
        ""
      );


    return true;

  }


  function updateDashboard() {

    updateModeDisplay();

    updatePreviewDisplay();

    updateLayerDisplay();

    updateRenderDisplay();

    updatePanelButtons();


    dispatch(
      "paintless3d:ui-updated",
      {
        mode:
          paintless3d.getMode?.(),

        preview:
          getCoreApi()
            ?.isPreviewEnabled?.() ||
          false,

        layer:
          getActiveLayer(),

        depth:
          getActiveDepth(),

        activePanel:
          uiState.activePanel
      }
    );


    return true;

  }


  /* =======================================================
     11. EVENT HANDLERS
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


  function handlePreviewButton() {

    if (
      !getCoreApi()
        ?.isPreviewEnabled?.()
    ) {

      getCoreApi()
        ?.setPreviewEnabled?.(
          true
        );

    }


    openPanel(
      "preview",
      {
        announce:
          true
      }
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


  function handleModeChanged(
    event
  ) {

    const is3D =
      event.detail?.mode ===
      "3d";


    uiState.active =
      is3D;


    if (
      is3D &&
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


    if (!is3D) {

      closeAllPanels();


      uiState.activePanel =
        "depth";

    }


    updateDashboard();

  }


  function handlePreviewChanged(
    event
  ) {

    const enabled =
      Boolean(
        event.detail?.enabled
      );


    if (
      enabled &&
      uiState.automaticallyOpenPreview
    ) {

      openPanel(
        "preview"
      );

    } else if (
      !enabled &&
      uiState.activePanel ===
        "preview"
    ) {

      openPanel(
        "depth"
      );

    }


    updateDashboard();

  }


  function handleLayerChanged() {

    updateLayerDisplay();

  }


  function handleDepthChanged() {

    updateLayerDisplay();

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


    updateRenderDisplay();

  }


  function handleExportStarted() {

    if (
      uiState.automaticallyOpenExport
    ) {

      openPanel(
        "export"
      );

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


  function handlePanelChanged(
    event
  ) {

    const panel =
      event.detail?.panel;


    if (
      [
        "depth",
        "preview",
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


      handlePreviewButton();


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
     12. CONNECT EVENTS
  ======================================================= */

  function connectEvents() {

    dom.depthButton
      ?.addEventListener(
        "click",
        handleDepthButton
      );


    dom.previewButton
      ?.addEventListener(
        "click",
        handlePreviewButton
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
      "paintless3d:preview-changed",
      handlePreviewChanged
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
      "paintless3d:render-completed",
      handleRenderCompleted
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
      "paintless3d:ui-panel-changed",
      handlePanelChanged
    );


    document.addEventListener(
      "paintless:document-reset",
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


    dom.previewButton
      ?.removeEventListener(
        "click",
        handlePreviewButton
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
      "paintless3d:preview-changed",
      handlePreviewChanged
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
      "paintless3d:render-completed",
      handleRenderCompleted
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
      "paintless3d:ui-panel-changed",
      handlePanelChanged
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
     13. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      uiState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    installStyles();


    const installed =
      installDashboard();


    if (!installed) {

      throw new Error(
        "Paintless3D UI could not find the right-side panel."
      );

    }


    refreshPanelReferences();


    connectEvents();


    uiState.active =
      paintless3d.is3DMode?.() ||
      false;


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
          publicApi
      }
    );


    console.log(
      "%cPaintless3D UI ready.",
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
     14. DESTROY
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
     15. PUBLIC API
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

    updatePreviewDisplay,

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


    setAutomaticPreviewPanel(
      enabled
    ) {

      uiState.automaticallyOpenPreview =
        Boolean(
          enabled
        );


      return uiState
        .automaticallyOpenPreview;

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

      return {

        active:
          uiState.active,

        activePanel:
          uiState.activePanel,

        previewEnabled:
          getCoreApi()
            ?.isPreviewEnabled?.() ||
          false,

        activeLayer:
          getActiveLayer(),

        activeLayerDepth:
          getActiveDepth(),

        renderCount:
          uiState.renderCount,

        lastRenderDuration:
          uiState.lastRenderDuration,

        lastRenderWidth:
          uiState.lastRenderWidth,

        lastRenderHeight:
          uiState.lastRenderHeight,

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
     16. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "ui",
    {

      label:
        "Paintless3D Interface",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
