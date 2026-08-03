import {
  getBrushState,
  setBrushColour,
  updateBrushState,
  notifyBrushStateChanged
}
from "../paint/brush-state.js";

import {
  getBrushLibrary,
  getBrushPresetDefaults
}
from "../paint/brush-library.js";

console.log(
  "NEW BRUSH CONTROLS LOADED"
);


/* =========================================================
   PAINTLESSUV
   BRUSH CONTROLS
========================================================= */


/* =========================================================
   COLOUR STATE
========================================================= */

const colourState = {

  primary:
    "#a84cff",

  secondary:
    "#ffffff"

};


/* =========================================================
   INITIALISE
========================================================= */

/**
 * Connect PaintlessUV brush controls to the shared brush
 * state.
 *
 * @returns {Function} cleanup function
 */
export function initialiseBrushControls() {

  const primaryInput =
    document.getElementById(
      "primary-colour"
    );

  const primaryChip =
    document.getElementById(
      "primary-colour-chip"
    );

  const secondaryChip =
    document.getElementById(
      "secondary-colour-chip"
    );

  const swapButton =
    document.getElementById(
      "swap-colours-button"
    );


  if (
    !primaryInput
  ) {

    console.warn(
      "PaintlessUV could not find the primary colour input."
    );

    return () => {};

  }


  /*
   * Create the temporary preset selector automatically.
   *
   * This allows us to test every built-in brush before the
   * full Paint sidebar is designed.
   */

  const presetControl =
    createPresetControl();


  const presetSelect =
    presetControl?.querySelector(
      "#brush-preset-select"
    ) ||
    null;


  /*
   * Begin with the current shared brush state.
   */

  const brush =
    getBrushState();


  colourState.primary =
    normaliseColour(
      brush.colour,
      "#a84cff"
    );

  colourState.secondary =
    "#ffffff";


  primaryInput.value =
    colourState.primary;


  if (
    presetSelect
  ) {

    populatePresetSelect(
      presetSelect
    );

    presetSelect.value =
      brush.preset;

  }


  updateColourControls(
    primaryInput,
    primaryChip,
    secondaryChip
  );


  /* =======================================================
     BRUSH PRESET
  ======================================================= */

  function handlePresetChange(
    event
  ) {

    const presetId =
      String(
        event.target.value ||
        ""
      )
        .trim()
        .toLowerCase();


    const defaults =
      getBrushPresetDefaults(
        presetId
      );


    if (
      !defaults
    ) {

      console.warn(
        `PaintlessUV could not find brush preset: ${presetId}`
      );

      return;

    }


    /*
     * Preserve the user's currently selected colour.
     *
     * All other brush settings are replaced by the preset's
     * defaults.
     */

    updateBrushState(
      {
        ...defaults,

        colour:
          colourState.primary
      }
    );


    console.log(
      `PaintlessUV brush preset: ${presetId}`
    );

  }


  presetSelect?.addEventListener(
    "change",
    handlePresetChange
  );


  /* =======================================================
     PRIMARY COLOUR INPUT
  ======================================================= */

  function handlePrimaryInput(
    event
  ) {

    colourState.primary =
      normaliseColour(
        event.target.value,
        colourState.primary
      );


    applyPrimaryColour(
      primaryInput,
      primaryChip,
      secondaryChip
    );

  }


  primaryInput.addEventListener(
    "input",
    handlePrimaryInput
  );


  primaryInput.addEventListener(
    "change",
    handlePrimaryInput
  );


  /* =======================================================
     PRIMARY CHIP
  ======================================================= */

  function handlePrimaryChipClick() {

    /*
     * Open the browser colour picker from the larger sidebar
     * colour swatch.
     */

    if (
      typeof primaryInput.showPicker ===
        "function"
    ) {

      try {

        primaryInput.showPicker();

        return;

      } catch (
        error
      ) {

        console.warn(
          "PaintlessUV could not open the colour picker directly.",
          error
        );

      }

    }


    primaryInput.click();

  }


  primaryChip?.addEventListener(
    "click",
    handlePrimaryChipClick
  );


  /* =======================================================
     SECONDARY CHIP
  ======================================================= */

  function handleSecondaryChipClick() {

    /*
     * Clicking the secondary colour makes it the active paint
     * colour and moves the current primary colour behind it.
     */

    const previousPrimary =
      colourState.primary;


    colourState.primary =
      colourState.secondary;

    colourState.secondary =
      previousPrimary;


    applyPrimaryColour(
      primaryInput,
      primaryChip,
      secondaryChip
    );

  }


  secondaryChip?.addEventListener(
    "click",
    handleSecondaryChipClick
  );


  /* =======================================================
     SWAP COLOURS
  ======================================================= */

  function handleSwapColours() {

    const previousPrimary =
      colourState.primary;


    colourState.primary =
      colourState.secondary;

    colourState.secondary =
      previousPrimary;


    applyPrimaryColour(
      primaryInput,
      primaryChip,
      secondaryChip
    );

  }


  swapButton?.addEventListener(
    "click",
    handleSwapColours
  );


  /* =======================================================
     EXTERNAL BRUSH CHANGES
  ======================================================= */

  function handleBrushStateChange(
    event
  ) {

    const nextBrush =
      event.detail;


    if (
      !nextBrush ||
      typeof nextBrush !==
        "object"
    ) {

      return;

    }


    /*
     * Synchronise the preset selector.
     */

    if (
      presetSelect &&
      typeof nextBrush.preset ===
        "string" &&
      presetSelect.value !==
        nextBrush.preset
    ) {

      presetSelect.value =
        nextBrush.preset;

    }


    /*
     * Synchronise the active colour.
     */

    if (
      typeof nextBrush.colour !==
        "string"
    ) {

      return;

    }


    const normalisedColour =
      normaliseColour(
        nextBrush.colour,
        colourState.primary
      );


    if (
      normalisedColour ===
        colourState.primary
    ) {

      return;

    }


    colourState.primary =
      normalisedColour;


    primaryInput.value =
      colourState.primary;


    updateColourControls(
      primaryInput,
      primaryChip,
      secondaryChip
    );

  }


  document.addEventListener(
    "paintlessuv:brushchange",
    handleBrushStateChange
  );


  /* =======================================================
     CLEANUP
  ======================================================= */

  return function cleanupBrushControls() {

    presetSelect?.removeEventListener(
      "change",
      handlePresetChange
    );


    primaryInput.removeEventListener(
      "input",
      handlePrimaryInput
    );

    primaryInput.removeEventListener(
      "change",
      handlePrimaryInput
    );


    primaryChip?.removeEventListener(
      "click",
      handlePrimaryChipClick
    );

    secondaryChip?.removeEventListener(
      "click",
      handleSecondaryChipClick
    );

    swapButton?.removeEventListener(
      "click",
      handleSwapColours
    );


    document.removeEventListener(
      "paintlessuv:brushchange",
      handleBrushStateChange
    );


    presetControl?.remove();

  };

}


/* =========================================================
   CREATE PRESET CONTROL
========================================================= */

function createPresetControl() {

  const existingControl =
    document.getElementById(
      "brush-preset-control"
    );


  if (
    existingControl
  ) {

    return existingControl;

  }


  const optionsBar =
    document.getElementById(
      "tool-options-bar"
    );


  if (
    !optionsBar
  ) {

    console.warn(
      "PaintlessUV could not find the tool options bar."
    );

    return null;

  }


  const control =
    document.createElement(
      "label"
    );


  control.className =
    "colour-control";

  control.id =
    "brush-preset-control";


  const label =
    document.createElement(
      "span"
    );


  label.textContent =
    "Brush";


  const select =
    document.createElement(
      "select"
    );


  select.id =
    "brush-preset-select";

  select.setAttribute(
    "aria-label",
    "Brush preset"
  );

  select.title =
    "Choose brush preset";


  control.append(
    label,
    select
  );


  const colourControl =
    optionsBar.querySelector(
      ".colour-control"
    );


  if (
    colourControl
  ) {

    optionsBar.insertBefore(
      control,
      colourControl
    );

  } else {

    optionsBar.append(
      control
    );

  }


  return control;

}


/* =========================================================
   POPULATE PRESET SELECT
========================================================= */

function populatePresetSelect(
  select
) {

  select.innerHTML =
    "";


  const brushes =
    getBrushLibrary();


  const categories =
    [
      {
        id:
          "paint",

        name:
          "Paint Brushes"
      },

      {
        id:
          "shape",

        name:
          "Shape Brushes"
      },

      {
        id:
          "stamp",

        name:
          "Stamps"
      }
    ];


  for (
    const category of
    categories
  ) {

    const categoryBrushes =
      brushes.filter(
        (
          brush
        ) =>
          brush.category ===
          category.id
      );


    if (
      categoryBrushes.length ===
        0
    ) {

      continue;

    }


    const group =
      document.createElement(
        "optgroup"
      );


    group.label =
      category.name;


    for (
      const brush of
      categoryBrushes
    ) {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        brush.id;

      option.textContent =
        brush.name;

      option.title =
        brush.description;


      group.append(
        option
      );

    }


    select.append(
      group
    );

  }

}


/* =========================================================
   APPLY PRIMARY COLOUR
========================================================= */

function applyPrimaryColour(
  primaryInput,
  primaryChip,
  secondaryChip
) {

  primaryInput.value =
    colourState.primary;


  setBrushColour(
    colourState.primary
  );


  notifyBrushStateChanged();


  updateColourControls(
    primaryInput,
    primaryChip,
    secondaryChip
  );


  console.log(
    `PaintlessUV brush colour: ${colourState.primary}`
  );

}


/* =========================================================
   UPDATE DISPLAY
========================================================= */

function updateColourControls(
  primaryInput,
  primaryChip,
  secondaryChip
) {

  if (
    primaryInput
  ) {

    primaryInput.value =
      colourState.primary;

  }


  if (
    primaryChip
  ) {

    primaryChip.style.backgroundColor =
      colourState.primary;

    primaryChip.setAttribute(
      "aria-label",
      `Primary colour ${colourState.primary}`
    );

    primaryChip.title =
      `Primary colour ${colourState.primary}`;

  }


  if (
    secondaryChip
  ) {

    secondaryChip.style.backgroundColor =
      colourState.secondary;

    secondaryChip.setAttribute(
      "aria-label",
      `Secondary colour ${colourState.secondary}`
    );

    secondaryChip.title =
      `Secondary colour ${colourState.secondary}`;

  }

}


/* =========================================================
   READ COLOURS
========================================================= */

export function getPrimaryColour() {

  return colourState.primary;

}


export function getSecondaryColour() {

  return colourState.secondary;

}


/* =========================================================
   VALIDATE COLOUR
========================================================= */

function normaliseColour(
  colour,
  fallback
) {

  const value =
    String(
      colour ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    /^#[0-9a-f]{6}$/i.test(
      value
    )
  ) {

    return value;

  }


  if (
    /^#[0-9a-f]{3}$/i.test(
      value
    )
  ) {

    return `#${
      value[1]
    }${
      value[1]
    }${
      value[2]
    }${
      value[2]
    }${
      value[3]
    }${
      value[3]
    }`;

  }


  return fallback;

}
