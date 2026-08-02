/* =========================================================
   PAINTLESSUV
   TOOL CONTROLLER
========================================================= */


/* =========================================================
   CONTROLLER STATE
========================================================= */

const toolController = {

  activeToolName:
    null,

  activeTool:
    null,

  tools:
    new Map(),

  buttons:
    new Map()

};


/* =========================================================
   REGISTER TOOL
========================================================= */

/**
 * Register a PaintlessUV interaction tool.
 *
 * Each tool may provide:
 *
 * - activate(context)
 * - deactivate(context)
 * - destroy(context)
 *
 * @param {string} name
 * @param {Object} tool
 */
export function registerTool(
  name,
  tool
) {

  const safeName =
    normaliseToolName(
      name
    );


  if (
    !safeName
  ) {

    throw new Error(
      "PaintlessUV cannot register a tool without a name."
    );

  }


  if (
    !tool ||
    typeof tool !==
      "object"
  ) {

    throw new Error(
      `PaintlessUV cannot register the "${safeName}" tool.`
    );

  }


  toolController.tools.set(
    safeName,
    tool
  );


  return tool;

}


/* =========================================================
   REGISTER TOOL BUTTON
========================================================= */

/**
 * Connect a toolbar button to a registered tool.
 *
 * @param {string} name
 * @param {HTMLElement|string} buttonOrSelector
 */
export function registerToolButton(
  name,
  buttonOrSelector
) {

  const safeName =
    normaliseToolName(
      name
    );

  const button =
    resolveElement(
      buttonOrSelector
    );


  if (
    !safeName ||
    !button
  ) {

    return null;

  }


  const previousButton =
    toolController.buttons.get(
      safeName
    );


  if (
    previousButton
  ) {

    previousButton.removeEventListener(
      "click",
      previousButton.__paintlessUVToolHandler
    );

  }


  const clickHandler =
    () => {

      activateTool(
        safeName
      );

    };


  button.__paintlessUVToolHandler =
    clickHandler;


  button.addEventListener(
    "click",
    clickHandler
  );


  toolController.buttons.set(
    safeName,
    button
  );


  updateButtonStates();


  return button;

}


/* =========================================================
   ACTIVATE TOOL
========================================================= */

/**
 * Deactivate the current tool and activate another.
 *
 * @param {string} name
 * @param {Object} context
 * @returns {boolean}
 */
export function activateTool(
  name,
  context = {}
) {

  const safeName =
    normaliseToolName(
      name
    );

  const nextTool =
    toolController.tools.get(
      safeName
    );


  if (
    !nextTool
  ) {

    console.warn(
      `PaintlessUV tool "${safeName}" has not been registered.`
    );

    return false;

  }


  if (
    toolController.activeToolName ===
      safeName
  ) {

    return true;

  }


  deactivateCurrentTool(
    context
  );


  toolController.activeToolName =
    safeName;

  toolController.activeTool =
    nextTool;


  if (
    typeof nextTool.activate ===
      "function"
  ) {

    nextTool.activate(
      context
    );

  }


  updateButtonStates();


  document.dispatchEvent(
    new CustomEvent(
      "paintlessuv:toolchange",
      {
        detail:
          {
            name:
              safeName,

            tool:
              nextTool
          }
      }
    )
  );


  console.log(
    `PaintlessUV tool active: ${safeName}`
  );


  return true;

}


/* =========================================================
   DEACTIVATE CURRENT TOOL
========================================================= */

export function deactivateCurrentTool(
  context = {}
) {

  if (
    !toolController.activeTool
  ) {

    return;

  }


  if (
    typeof toolController.activeTool.deactivate ===
      "function"
  ) {

    toolController.activeTool.deactivate(
      context
    );

  }


  toolController.activeToolName =
    null;

  toolController.activeTool =
    null;


  updateButtonStates();

}


/* =========================================================
   ENABLE / DISABLE TOOL
========================================================= */

export function setToolEnabled(
  name,
  enabled
) {

  const safeName =
    normaliseToolName(
      name
    );

  const button =
    toolController.buttons.get(
      safeName
    );


  if (
    button
  ) {

    button.disabled =
      !enabled;

  }


  if (
    !enabled &&
    toolController.activeToolName ===
      safeName
  ) {

    deactivateCurrentTool();

  }

}


/* =========================================================
   TOOL STATUS
========================================================= */

export function getActiveToolName() {

  return toolController.activeToolName;

}


export function getActiveTool() {

  return toolController.activeTool;

}


export function hasTool(
  name
) {

  return toolController.tools.has(
    normaliseToolName(
      name
    )
  );

}


/* =========================================================
   DESTROY CONTROLLER
========================================================= */

export function destroyToolController(
  context = {}
) {

  deactivateCurrentTool(
    context
  );


  for (
    const [
      name,
      tool
    ] of
    toolController.tools
  ) {

    if (
      typeof tool.destroy ===
        "function"
    ) {

      tool.destroy(
        context
      );

    }


    const button =
      toolController.buttons.get(
        name
      );


    if (
      button?.__paintlessUVToolHandler
    ) {

      button.removeEventListener(
        "click",
        button.__paintlessUVToolHandler
      );

      delete button.__paintlessUVToolHandler;

    }

  }


  toolController.tools.clear();

  toolController.buttons.clear();

}


/* =========================================================
   BUTTON STATE
========================================================= */

function updateButtonStates() {

  for (
    const [
      name,
      button
    ] of
    toolController.buttons
  ) {

    const isActive =
      name ===
      toolController.activeToolName;


    button.classList.toggle(
      "is-active",
      isActive
    );


    button.setAttribute(
      "aria-pressed",
      String(
        isActive
      )
    );

  }

}


/* =========================================================
   HELPERS
========================================================= */

function normaliseToolName(
  name
) {

  return String(
    name ||
    ""
  )
    .trim()
    .toLowerCase();

}


function resolveElement(
  value
) {

  if (
    value instanceof
      HTMLElement
  ) {

    return value;

  }


  if (
    typeof value ===
      "string"
  ) {

    return document.querySelector(
      value
    );

  }


  return null;

}
