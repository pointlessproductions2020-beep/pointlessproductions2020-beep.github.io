/* =========================================================
   PAINTLESSUV
   PAINT WORKSPACE
========================================================= */


/*
 * Controls the visible application workspace.
 *
 * This module only changes interface state.
 *
 * It does not:
 *
 * - calculate UV coordinates;
 * - raycast against the model;
 * - paint onto textures;
 * - register tools;
 * - modify brush rendering;
 * - prepare models.
 */


/* =========================================================
   WORKSPACE MODES
========================================================= */

export const WORKSPACE_MODES =
  Object.freeze(
    {
      PREPARE:
        "prepare",

      PAINT:
        "paint"
    }
  );


/* =========================================================
   ACTIVE MODE
========================================================= */

let activeWorkspaceMode =
  WORKSPACE_MODES.PREPARE;


/* =========================================================
   INITIALISE
========================================================= */

/**
 * Initialise the PaintlessUV workspace display.
 *
 * @returns {Function} cleanup function
 */
export function initialisePaintWorkspace() {

  const prepareModeButton =
    document.getElementById(
      "prepare-mode-button"
    );

  const paintModeButton =
    document.getElementById(
      "paint-mode-button"
    );


  function handlePrepareModeClick() {

    enterPrepareWorkspace();

  }


  function handlePaintModeClick() {

    if (
      paintModeButton?.disabled
    ) {

      return;

    }


    enterPaintWorkspace();

  }


  prepareModeButton?.addEventListener(
    "click",
    handlePrepareModeClick
  );


  paintModeButton?.addEventListener(
    "click",
    handlePaintModeClick
  );


  enterPrepareWorkspace();


  return function cleanupPaintWorkspace() {

    prepareModeButton?.removeEventListener(
      "click",
      handlePrepareModeClick
    );


    paintModeButton?.removeEventListener(
      "click",
      handlePaintModeClick
    );

  };

}


/* =========================================================
   ENTER PREPARE WORKSPACE
========================================================= */

export function enterPrepareWorkspace() {

  activeWorkspaceMode =
    WORKSPACE_MODES.PREPARE;


  updateModeButtons(
    WORKSPACE_MODES.PREPARE
  );


  updateActiveModeName(
    "Prepare"
  );


  setPreparationPanelsVisible(
    true
  );


  setPaintPanelVisible(
    false
  );


  dispatchWorkspaceChange();

}


/* =========================================================
   ENTER PAINT WORKSPACE
========================================================= */

export function enterPaintWorkspace() {

  activeWorkspaceMode =
    WORKSPACE_MODES.PAINT;


  enablePaintWorkspace();


  updateModeButtons(
    WORKSPACE_MODES.PAINT
  );


  updateActiveModeName(
    "Paint"
  );


  setPreparationPanelsVisible(
    false
  );


  setPaintPanelVisible(
    true
  );


  dispatchWorkspaceChange();

}


/* =========================================================
   ENABLE PAINT WORKSPACE
========================================================= */

/**
 * Enable the Paint workspace button after preparation has
 * successfully completed.
 */
export function enablePaintWorkspace() {

  const paintModeButton =
    document.getElementById(
      "paint-mode-button"
    );


  if (
    paintModeButton
  ) {

    paintModeButton.disabled =
      false;

  }

}


/* =========================================================
   DISABLE PAINT WORKSPACE
========================================================= */

/**
 * Disable Paint mode when a new model is opened or when the
 * current model is no longer paint-ready.
 */
export function disablePaintWorkspace() {

  const paintModeButton =
    document.getElementById(
      "paint-mode-button"
    );


  if (
    paintModeButton
  ) {

    paintModeButton.disabled =
      true;

  }


  if (
    activeWorkspaceMode ===
      WORKSPACE_MODES.PAINT
  ) {

    enterPrepareWorkspace();

  }

}


/* =========================================================
   ACTIVE WORKSPACE
========================================================= */

export function getActiveWorkspaceMode() {

  return activeWorkspaceMode;

}


export function isPaintWorkspaceActive() {

  return (
    activeWorkspaceMode ===
    WORKSPACE_MODES.PAINT
  );

}


/* =========================================================
   MODE BUTTONS
========================================================= */

function updateModeButtons(
  mode
) {

  const prepareModeButton =
    document.getElementById(
      "prepare-mode-button"
    );

  const paintModeButton =
    document.getElementById(
      "paint-mode-button"
    );


  const prepareActive =
    mode ===
    WORKSPACE_MODES.PREPARE;

  const paintActive =
    mode ===
    WORKSPACE_MODES.PAINT;


  updateModeButton(
    prepareModeButton,
    prepareActive
  );


  updateModeButton(
    paintModeButton,
    paintActive
  );

}


function updateModeButton(
  button,
  active
) {

  if (
    !button
  ) {

    return;

  }


  button.classList.toggle(
    "is-active",
    active
  );


  button.setAttribute(
    "aria-pressed",
    active
      ? "true"
      : "false"
  );

}


/* =========================================================
   ACTIVE MODE NAME
========================================================= */

function updateActiveModeName(
  name
) {

  const activeToolName =
    document.getElementById(
      "active-tool-name"
    );


  if (
    activeToolName
  ) {

    activeToolName.textContent =
      name;

  }

}


/* =========================================================
   PREPARATION PANELS
========================================================= */

function setPreparationPanelsVisible(
  visible
) {

  const preparationPanels =
    [
      document.querySelector(
        ".model-information-panel"
      ),

      document.querySelector(
        ".model-analysis-panel"
      ),

      document.querySelector(
        ".uv-information-panel"
      ),

      document.querySelector(
        ".materials-panel"
      )
    ];


  for (
    const panel of
    preparationPanels
  ) {

    if (
      !panel
    ) {

      continue;

    }


    panel.hidden =
      !visible;

  }

}


/* =========================================================
   PAINT PANEL
========================================================= */

function setPaintPanelVisible(
  visible
) {

  const paintToolsPanel =
    document.getElementById(
      "paint-tools-panel"
    );


  if (
    !paintToolsPanel
  ) {

    return;

  }


  paintToolsPanel.hidden =
    !visible;

}


/* =========================================================
   WORKSPACE CHANGE EVENT
========================================================= */

function dispatchWorkspaceChange() {

  document.dispatchEvent(
    new CustomEvent(
      "paintlessuv:workspacechange",
      {
        detail:
          {
            mode:
              activeWorkspaceMode
          }
      }
    )
  );

}
