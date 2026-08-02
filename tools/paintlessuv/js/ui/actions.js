/* =========================================================
   PAINTLESSUV
   UI ACTIONS
========================================================= */


/* =========================================================
   ACTION REGISTRY
========================================================= */

const actions = {

  prepare:
    null,

  open:
    null,

  export:
    null,

  undo:
    null,

  redo:
    null

};


/* =========================================================
   INITIALISE
========================================================= */

/**
 * Register all application actions.
 *
 * @param {Object} callbacks
 */
export function initialiseUIActions(
  callbacks = {}
) {

  actions.prepare =
    callbacks.prepare ??
    null;

  actions.open =
    callbacks.open ??
    null;

  actions.export =
    callbacks.export ??
    null;

  actions.undo =
    callbacks.undo ??
    null;

  actions.redo =
    callbacks.redo ??
    null;


  bindButton(
    "fix-model-button",
    actions.prepare
  );

  bindButton(
    "open-model-button",
    actions.open
  );

  bindButton(
    "open-model-top-button",
    actions.open
  );

}


/* =========================================================
   BUTTON BINDING
========================================================= */

function bindButton(
  id,
  callback
) {

  const button =
    document.getElementById(
      id
    );

  if (
    !button ||
    typeof callback !==
      "function"
  ) {

    return;

  }


  button.addEventListener(
    "click",
    callback
  );

}


/* =========================================================
   ENABLE
========================================================= */

export function enableAction(
  id
) {

  const button =
    document.getElementById(
      id
    );

  if (
    button
  ) {

    button.disabled =
      false;

  }

}


/* =========================================================
   DISABLE
========================================================= */

export function disableAction(
  id
) {

  const button =
    document.getElementById(
      id
    );

  if (
    button
  ) {

    button.disabled =
      true;

  }

}


/* =========================================================
   CHANGE LABEL
========================================================= */

export function setActionLabel(
  id,
  label
) {

  const button =
    document.getElementById(
      id
    );

  if (
    button
  ) {

    button.textContent =
      label;

  }

}
