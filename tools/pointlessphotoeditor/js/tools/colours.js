"use strict";

/* =========================================================
   PAINTLESS
   COLOUR SYSTEM — v1.0

   File:
   js/tools/colours.js

   Handles:
   - Primary colour
   - Secondary colour
   - Colour chips
   - Colour picker synchronisation
   - Hex input
   - Recent colours
   - Colour swapping
   - Shared fill and stroke colours

   Loaded automatically by:
   js/tools.js
========================================================= */

(() => {

  /* =======================================================
     1. LOADER CHECK
  ======================================================= */

  const tools =
    window.PaintlessTools;


  if (
    !tools ||
    typeof tools.registerModule !==
      "function"
  ) {

    console.error(
      "Paintless colours could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. COLOUR STATE
  ======================================================= */

  const colourState = {

    initialised:
      false,

    primaryColour:
      "#a84cff",

    secondaryColour:
      "#ffffff",

    recentColours: [
      "#a84cff",
      "#35e7ff",
      "#ff5fb7",
      "#ffd75a",
      "#69f59c",
      "#ff596d",
      "#ffffff"
    ],

    maximumRecentColours:
      14,

    storageKey:
      "paintless-recent-colours",

    updatingControls:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    primaryColourInput:
      null,

    panelColourPicker:
      null,

    hexColourInput:
      null,

    primaryColourChip:
      null,

    secondaryColourChip:
      null,

    swapColoursButton:
      null,

    recentColours:
      null

  };


  /* =======================================================
     4. SHARED HELPERS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  function byId(
    id
  ) {

    return document.getElementById(
      id
    );

  }


  function clamp(
    value,
    minimum,
    maximum
  ) {

    return Math.min(
      maximum,
      Math.max(
        minimum,
        Number(
          value
        ) ||
        0
      )
    );

  }


  function normaliseHexColour(
    value
  ) {

    const core =
      getCore();


    if (
      typeof core
        ?.normaliseHexColour ===
      "function"
    ) {

      return core.normaliseHexColour(
        value
      );

    }


    const colour =
      String(
        value ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      /^#[0-9a-f]{6}$/.test(
        colour
      )
    ) {

      return colour;

    }


    if (
      /^#[0-9a-f]{3}$/.test(
        colour
      )
    ) {

      return (
        "#" +
        colour[1] +
        colour[1] +
        colour[2] +
        colour[2] +
        colour[3] +
        colour[3]
      );

    }


    return null;

  }


  function hexToRgb(
    colour
  ) {

    const core =
      getCore();


    if (
      typeof core?.hexToRgb ===
      "function"
    ) {

      return core.hexToRgb(
        colour
      );

    }


    const normalised =
      normaliseHexColour(
        colour
      ) ||
      "#000000";


    return {

      red:
        parseInt(
          normalised.slice(
            1,
            3
          ),
          16
        ),

      green:
        parseInt(
          normalised.slice(
            3,
            5
          ),
          16
        ),

      blue:
        parseInt(
          normalised.slice(
            5,
            7
          ),
          16
        )

    };

  }


  function rgbToHex(
    red,
    green,
    blue
  ) {

    const core =
      getCore();


    if (
      typeof core?.rgbToHex ===
      "function"
    ) {

      return core.rgbToHex(
        red,
        green,
        blue
      );

    }


    const colourPart =
      (value) =>
        clamp(
          Math.round(
            value
          ),
          0,
          255
        )
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          );


    return (
      "#" +
      colourPart(
        red
      ) +
      colourPart(
        green
      ) +
      colourPart(
        blue
      )
    );

  }


  function rgbaString(
    colour,
    alpha =
      1
  ) {

    const rgb =
      hexToRgb(
        colour
      );


    return (
      `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ` +
      `${clamp(alpha, 0, 1)})`
    );

  }


  function sendStatusMessage(
    message
  ) {

    const core =
      getCore();


    if (
      typeof core?.sendStatusMessage ===
      "function"
    ) {

      core.sendStatusMessage(
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


  function dispatchColourEvent(
    eventName,
    detail =
      {}
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


  /* =======================================================
     5. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.primaryColourInput =
      byId(
        "primary-colour"
      );


    dom.panelColourPicker =
      byId(
        "panel-colour-picker"
      );


    dom.hexColourInput =
      byId(
        "hex-colour-input"
      );


    dom.primaryColourChip =
      byId(
        "primary-colour-chip"
      );


    dom.secondaryColourChip =
      byId(
        "secondary-colour-chip"
      );


    dom.swapColoursButton =
      byId(
        "swap-colours-button"
      );


    dom.recentColours =
      byId(
        "recent-colours"
      );


    return dom;

  }


  /* =======================================================
     6. STORAGE
  ======================================================= */

  function loadRecentColours() {

    try {

      const savedValue =
        window.localStorage.getItem(
          colourState.storageKey
        );


      if (!savedValue) {

        return false;

      }


      const parsedColours =
        JSON.parse(
          savedValue
        );


      if (
        !Array.isArray(
          parsedColours
        )
      ) {

        return false;

      }


      const validColours =
        parsedColours
          .map(
            normaliseHexColour
          )
          .filter(
            Boolean
          );


      if (
        validColours.length ===
        0
      ) {

        return false;

      }


      colourState.recentColours =
        Array.from(
          new Set(
            validColours
          )
        )
          .slice(
            0,
            colourState
              .maximumRecentColours
          );


      return true;

    } catch (error) {

      console.warn(
        "Paintless could not load recent colours:",
        error
      );


      return false;

    }

  }


  function saveRecentColours() {

    try {

      window.localStorage.setItem(
        colourState.storageKey,
        JSON.stringify(
          colourState.recentColours
        )
      );


      return true;

    } catch (error) {

      console.warn(
        "Paintless could not save recent colours:",
        error
      );


      return false;

    }

  }


  /* =======================================================
     7. RECENT COLOURS
  ======================================================= */

  function addRecentColour(
    colour,
    {
      render =
        true,

      save =
        true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    colourState.recentColours =
      colourState.recentColours
        .filter(
          (existingColour) =>
            existingColour !==
            normalised
        );


    colourState.recentColours.unshift(
      normalised
    );


    colourState.recentColours =
      colourState.recentColours.slice(
        0,
        colourState.maximumRecentColours
      );


    if (render) {

      renderRecentColours();

    }


    if (save) {

      saveRecentColours();

    }


    return true;

  }


  function removeRecentColour(
    colour
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    const previousLength =
      colourState.recentColours.length;


    colourState.recentColours =
      colourState.recentColours.filter(
        (existingColour) =>
          existingColour !==
          normalised
      );


    if (
      colourState.recentColours.length ===
      previousLength
    ) {

      return false;

    }


    renderRecentColours();

    saveRecentColours();


    return true;

  }


  function clearRecentColours() {

    colourState.recentColours =
      [];


    renderRecentColours();

    saveRecentColours();


    sendStatusMessage(
      "Recent colours cleared."
    );

  }


  function renderRecentColours() {

    if (!dom.recentColours) {

      return;

    }


    dom.recentColours.innerHTML =
      "";


    colourState.recentColours.forEach(
      (
        colour,
        index
      ) => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "recent-colour";


        button.style.background =
          colour;


        button.dataset.colour =
          colour;


        button.title =
          `${colour.toUpperCase()} — click for primary, right-click for secondary`;


        button.setAttribute(
          "aria-label",
          `Use ${colour} as primary colour`
        );


        button.setAttribute(
          "role",
          "listitem"
        );


        button.addEventListener(
          "click",
          () => {

            setPrimaryColour(
              colour
            );

          }
        );


        button.addEventListener(
          "contextmenu",
          (event) => {

            event.preventDefault();


            setSecondaryColour(
              colour
            );

          }
        );


        let holdTimer =
          null;


        let holdTriggered =
          false;


        button.addEventListener(
          "pointerdown",
          (event) => {

            if (
              event.pointerType ===
                "mouse" &&
              event.button !==
                0
            ) {

              return;

            }


            holdTriggered =
              false;


            holdTimer =
              window.setTimeout(
                () => {

                  holdTimer =
                    null;

                  holdTriggered =
                    true;


                  setSecondaryColour(
                    colour
                  );


                  navigator.vibrate?.(
                    15
                  );

                },
                450
              );

          }
        );


        const cancelHold =
          () => {

            if (
              holdTimer !==
              null
            ) {

              window.clearTimeout(
                holdTimer
              );

            }


            holdTimer =
              null;

          };


        button.addEventListener(
          "pointerup",
          cancelHold
        );


        button.addEventListener(
          "pointercancel",
          cancelHold
        );


        button.addEventListener(
          "pointerleave",
          cancelHold
        );


        button.addEventListener(
          "click",
          (event) => {

            if (
              holdTriggered
            ) {

              event.preventDefault();

              event.stopImmediatePropagation();


              holdTriggered =
                false;

            }

          },
          true
        );


        button.style.setProperty(
          "--recent-colour-index",
          String(
            index
          )
        );


        dom.recentColours.appendChild(
          button
        );

      }
    );

  }


  /* =======================================================
     8. CONTROL SYNCHRONISATION
  ======================================================= */

  function updatePrimaryControls(
    colour
  ) {

    colourState.updatingControls =
      true;


    try {

      if (dom.primaryColourInput) {

        dom.primaryColourInput.value =
          colour;

      }


      if (dom.panelColourPicker) {

        dom.panelColourPicker.value =
          colour;

      }


      if (dom.hexColourInput) {

        dom.hexColourInput.value =
          colour.toUpperCase();

      }


      if (dom.primaryColourChip) {

        dom.primaryColourChip.style.background =
          colour;


        dom.primaryColourChip.title =
          `Primary colour: ${colour.toUpperCase()}`;

      }

    } finally {

      colourState.updatingControls =
        false;

    }

  }


  function updateSecondaryControls(
    colour
  ) {

    colourState.updatingControls =
      true;


    try {

      if (dom.secondaryColourChip) {

        dom.secondaryColourChip.style.background =
          colour;


        dom.secondaryColourChip.title =
          `Secondary colour: ${colour.toUpperCase()}`;

      }

    } finally {

      colourState.updatingControls =
        false;

    }

  }


  function updateColourControls() {

    updatePrimaryControls(
      colourState.primaryColour
    );


    updateSecondaryControls(
      colourState.secondaryColour
    );

  }


  /* =======================================================
     9. PRIMARY COLOUR
  ======================================================= */

  function setPrimaryColour(
    colour,
    {
      remember =
        true,

      announce =
        false,

      dispatch =
        true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    const previousColour =
      colourState.primaryColour;


    colourState.primaryColour =
      normalised;


    tools.setState(
      "primaryColour",
      normalised,
      {
        silent:
          true
      }
    );


    updatePrimaryControls(
      normalised
    );


    if (remember) {

      addRecentColour(
        normalised
      );

    }


    if (dispatch) {

      dispatchColourEvent(
        "paintless:primary-colour-changed",
        {
          colour:
            normalised,

          previousColour
        }
      );


      dispatchColourEvent(
        "paintless:colour-changed",
        {
          type:
            "primary",

          colour:
            normalised,

          previousColour,

          primaryColour:
            colourState.primaryColour,

          secondaryColour:
            colourState.secondaryColour
        }
      );

    }


    if (announce) {

      sendStatusMessage(
        `Primary colour set to ${normalised.toUpperCase()}.`
      );

    }


    return true;

  }


  /* =======================================================
     10. SECONDARY COLOUR
  ======================================================= */

  function setSecondaryColour(
    colour,
    {
      remember =
        true,

      announce =
        false,

      dispatch =
        true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    const previousColour =
      colourState.secondaryColour;


    colourState.secondaryColour =
      normalised;


    tools.setState(
      "secondaryColour",
      normalised,
      {
        silent:
          true
      }
    );


    updateSecondaryControls(
      normalised
    );


    if (remember) {

      addRecentColour(
        normalised
      );

    }


    if (dispatch) {

      dispatchColourEvent(
        "paintless:secondary-colour-changed",
        {
          colour:
            normalised,

          previousColour
        }
      );


      dispatchColourEvent(
        "paintless:colour-changed",
        {
          type:
            "secondary",

          colour:
            normalised,

          previousColour,

          primaryColour:
            colourState.primaryColour,

          secondaryColour:
            colourState.secondaryColour
        }
      );

    }


    if (announce) {

      sendStatusMessage(
        `Secondary colour set to ${normalised.toUpperCase()}.`
      );

    }


    return true;

  }


  /* =======================================================
     11. SWAP COLOURS
  ======================================================= */

  function swapColours({
    announce =
      true
  } = {}) {

    const previousPrimary =
      colourState.primaryColour;


    const previousSecondary =
      colourState.secondaryColour;


    colourState.primaryColour =
      previousSecondary;


    colourState.secondaryColour =
      previousPrimary;


    tools.setState(
      "primaryColour",
      colourState.primaryColour,
      {
        silent:
          true
      }
    );


    tools.setState(
      "secondaryColour",
      colourState.secondaryColour,
      {
        silent:
          true
      }
    );


    updateColourControls();


    addRecentColour(
      colourState.primaryColour
    );


    addRecentColour(
      colourState.secondaryColour
    );


    dispatchColourEvent(
      "paintless:colours-swapped",
      {
        primaryColour:
          colourState.primaryColour,

        secondaryColour:
          colourState.secondaryColour
      }
    );


    dispatchColourEvent(
      "paintless:colour-changed",
      {
        type:
          "swap",

        primaryColour:
          colourState.primaryColour,

        secondaryColour:
          colourState.secondaryColour
      }
    );


    if (announce) {

      sendStatusMessage(
        "Primary and secondary colours swapped."
      );

    }


    return {

      primaryColour:
        colourState.primaryColour,

      secondaryColour:
        colourState.secondaryColour

    };

  }


  /* =======================================================
     12. COLOUR ROLES
  ======================================================= */

  function getPrimaryColour() {

    return colourState.primaryColour;

  }


  function getSecondaryColour() {

    return colourState.secondaryColour;

  }


  function getFillColour() {

    return colourState.primaryColour;

  }


  function getStrokeColour({
    filled =
      false
  } = {}) {

    /*
     * For ordinary strokes, use the primary colour.
     *
     * When a shape has both Fill and Stroke enabled, the
     * secondary colour becomes the outline so the border
     * remains visible.
     */

    return filled
      ? colourState.secondaryColour
      : colourState.primaryColour;

  }


  function getGradientColours() {

    return {

      start:
        colourState.primaryColour,

      end:
        colourState.secondaryColour

    };

  }


  function getColourState() {

    return {

      primaryColour:
        colourState.primaryColour,

      secondaryColour:
        colourState.secondaryColour,

      recentColours:
        [
          ...colourState.recentColours
        ]

    };

  }


  /* =======================================================
     13. COLOUR SAMPLING
  ======================================================= */

  function sampleCanvasColour(
    x,
    y,
    {
      source =
        "composite"
    } = {}
  ) {

    let canvas =
      null;


    if (
      source ===
      "active-layer"
    ) {

      canvas =
        getCore()
          ?.getActiveLayer?.()
          ?.canvas ||
        null;

    } else {

      canvas =
        document.getElementById(
          "editor-canvas"
        );

    }


    if (!canvas) {

      return null;

    }


    const context =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true
        }
      );


    if (!context) {

      return null;

    }


    const pixelX =
      clamp(
        Math.floor(
          x
        ),
        0,
        canvas.width -
          1
      );


    const pixelY =
      clamp(
        Math.floor(
          y
        ),
        0,
        canvas.height -
          1
      );


    const pixel =
      context.getImageData(
        pixelX,
        pixelY,
        1,
        1
      ).data;


    return {

      red:
        pixel[0],

      green:
        pixel[1],

      blue:
        pixel[2],

      alpha:
        pixel[3],

      hex:
        rgbToHex(
          pixel[0],
          pixel[1],
          pixel[2]
        ),

      rgba:
        `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ` +
        `${pixel[3] / 255})`,

      transparent:
        pixel[3] ===
        0

    };

  }


  /* =======================================================
     14. CONTRAST HELPERS
  ======================================================= */

  function getRelativeLuminance(
    colour
  ) {

    const rgb =
      hexToRgb(
        colour
      );


    const channels = [
      rgb.red,
      rgb.green,
      rgb.blue
    ].map(
      (channel) => {

        const value =
          channel /
          255;


        return value <=
          0.03928
          ? value /
            12.92
          : Math.pow(
              (
                value +
                0.055
              ) /
              1.055,
              2.4
            );

      }
    );


    return (
      0.2126 *
        channels[0] +
      0.7152 *
        channels[1] +
      0.0722 *
        channels[2]
    );

  }


  function getContrastingColour(
    colour,
    {
      light =
        "#ffffff",

      dark =
        "#000000"
    } = {}
  ) {

    return getRelativeLuminance(
      colour
    ) >
      0.45
      ? dark
      : light;

  }


  function darkenColour(
    colour,
    amount =
      0.2
  ) {

    const rgb =
      hexToRgb(
        colour
      );


    const multiplier =
      1 -
      clamp(
        amount,
        0,
        1
      );


    return rgbToHex(
      rgb.red *
        multiplier,
      rgb.green *
        multiplier,
      rgb.blue *
        multiplier
    );

  }


  function lightenColour(
    colour,
    amount =
      0.2
  ) {

    const rgb =
      hexToRgb(
        colour
      );


    const safeAmount =
      clamp(
        amount,
        0,
        1
      );


    return rgbToHex(
      rgb.red +
        (
          255 -
          rgb.red
        ) *
        safeAmount,

      rgb.green +
        (
          255 -
          rgb.green
        ) *
        safeAmount,

      rgb.blue +
        (
          255 -
          rgb.blue
        ) *
        safeAmount
    );

  }


  /* =======================================================
     15. CONTROL EVENTS
  ======================================================= */

  function connectColourControls() {

    dom.primaryColourInput
      ?.addEventListener(
        "input",
        () => {

          if (
            colourState.updatingControls
          ) {

            return;

          }


          setPrimaryColour(
            dom.primaryColourInput.value
          );

        }
      );


    dom.panelColourPicker
      ?.addEventListener(
        "input",
        () => {

          if (
            colourState.updatingControls
          ) {

            return;

          }


          setPrimaryColour(
            dom.panelColourPicker.value
          );

        }
      );


    dom.hexColourInput
      ?.addEventListener(
        "input",
        () => {

          if (
            colourState.updatingControls
          ) {

            return;

          }


          const value =
            dom.hexColourInput.value;


          if (
            normaliseHexColour(
              value
            )
          ) {

            setPrimaryColour(
              value,
              {
                remember:
                  false
              }
            );

          }

        }
      );


    dom.hexColourInput
      ?.addEventListener(
        "change",
        () => {

          if (
            colourState.updatingControls
          ) {

            return;

          }


          const changed =
            setPrimaryColour(
              dom.hexColourInput.value
            );


          if (!changed) {

            dom.hexColourInput.value =
              colourState
                .primaryColour
                .toUpperCase();


            sendStatusMessage(
              "That colour code is not valid."
            );

          }

        }
      );


    dom.hexColourInput
      ?.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key ===
            "Enter"
          ) {

            event.preventDefault();


            dom.hexColourInput.blur();

          }

        }
      );


    dom.primaryColourChip
      ?.addEventListener(
        "click",
        () => {

          dom.primaryColourInput
            ?.click();

        }
      );


    dom.secondaryColourChip
      ?.addEventListener(
        "click",
        () => {

          const chosenColour =
            window.prompt(
              "Secondary colour:",
              colourState.secondaryColour
            );


          if (
            chosenColour ===
            null
          ) {

            return;

          }


          const changed =
            setSecondaryColour(
              chosenColour,
              {
                announce:
                  true
              }
            );


          if (!changed) {

            sendStatusMessage(
              "That secondary colour is not valid."
            );

          }

        }
      );


    dom.swapColoursButton
      ?.addEventListener(
        "click",
        () => {

          swapColours();

        }
      );


    window.addEventListener(
      "keydown",
      (event) => {

        const core =
          getCore();


        if (
          core?.isTypingElement?.()
        ) {

          return;

        }


        if (
          event.key.toLowerCase() ===
          "x"
        ) {

          event.preventDefault();


          swapColours();

        }


        if (
          event.key.toLowerCase() ===
          "d"
        ) {

          event.preventDefault();


          setPrimaryColour(
            "#000000"
          );


          setSecondaryColour(
            "#ffffff"
          );


          sendStatusMessage(
            "Default colours restored."
          );

        }

      }
    );

  }


  /* =======================================================
     16. CROSS-MODULE EVENTS
  ======================================================= */

  function connectPaintlessEvents() {

    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        const property =
          event.detail?.property;


        const value =
          event.detail?.value;


        if (
          property ===
          "primaryColour"
        ) {

          const normalised =
            normaliseHexColour(
              value
            );


          if (
            normalised &&
            normalised !==
              colourState.primaryColour
          ) {

            setPrimaryColour(
              normalised,
              {
                remember:
                  false,

                dispatch:
                  false
              }
            );

          }

        }


        if (
          property ===
          "secondaryColour"
        ) {

          const normalised =
            normaliseHexColour(
              value
            );


          if (
            normalised &&
            normalised !==
              colourState.secondaryColour
          ) {

            setSecondaryColour(
              normalised,
              {
                remember:
                  false,

                dispatch:
                  false
              }
            );

          }

        }

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        updateColourControls();

        renderRecentColours();

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        updateColourControls();

      }
    );

  }


  /* =======================================================
     17. INITIAL COLOURS
  ======================================================= */

  function initialiseColourValues() {

    const controlPrimary =
      normaliseHexColour(
        dom.primaryColourInput
          ?.value
      );


    const statePrimary =
      normaliseHexColour(
        tools.getState(
          "primaryColour"
        )
      );


    const stateSecondary =
      normaliseHexColour(
        tools.getState(
          "secondaryColour"
        )
      );


    colourState.primaryColour =
      controlPrimary ||
      statePrimary ||
      "#a84cff";


    colourState.secondaryColour =
      stateSecondary ||
      "#ffffff";


    tools.setState(
      "primaryColour",
      colourState.primaryColour,
      {
        silent:
          true
      }
    );


    tools.setState(
      "secondaryColour",
      colourState.secondaryColour,
      {
        silent:
          true
      }
    );


    loadRecentColours();


    addRecentColour(
      colourState.primaryColour,
      {
        render:
          false,

        save:
          false
      }
    );


    addRecentColour(
      colourState.secondaryColour,
      {
        render:
          false,

        save:
          false
      }
    );


    updateColourControls();

    renderRecentColours();

    saveRecentColours();

  }


  /* =======================================================
     18. COLOUR MODULE
  ======================================================= */

  const colourModule = {

    name:
      "Colours",

    label:
      "Colours",

    initialised:
      false,


    async initialise() {

      if (
        colourState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      initialiseColourValues();

      connectColourControls();

      connectPaintlessEvents();


      colourState.initialised =
        true;


      this.initialised =
        true;


      dispatchColourEvent(
        "paintless:colours-ready",
        {
          colours:
            publicApi
        }
      );


      console.log(
        "%cPaintless colours ready.",
        [
          "color:#ffd75a",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    }

  };


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      colourState,


    normaliseHexColour,

    hexToRgb,

    rgbToHex,

    rgbaString,


    setPrimaryColour,

    setSecondaryColour,

    swapColours,


    getPrimaryColour,

    getSecondaryColour,

    getFillColour,

    getStrokeColour,

    getGradientColours,

    getColourState,


    addRecentColour,

    removeRecentColour,

    clearRecentColours,

    renderRecentColours,


    sampleCanvasColour,


    getRelativeLuminance,

    getContrastingColour,

    darkenColour,

    lightenColour

  };


  window.PaintlessColours =
    publicApi;


  colourModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "colours",
    colourModule
  );

})();
