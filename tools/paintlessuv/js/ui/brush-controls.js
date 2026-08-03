import {
  getBrushState,
  setBrushColour,
  notifyBrushStateChanged
}
from "../paint/brush-state.js";


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
 * Connect the existing PaintlessUV colour controls to the
 * shared brush state.
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
   * Begin with the current shared brush colour.
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


  updateColourControls(
    primaryInput,
    primaryChip,
    secondaryChip
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

    const nextColour =
      event.detail?.colour;


    if (
      typeof nextColour !==
        "string"
    ) {

      return;

    }


    const normalisedColour =
      normaliseColour(
        nextColour,
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

  };

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
