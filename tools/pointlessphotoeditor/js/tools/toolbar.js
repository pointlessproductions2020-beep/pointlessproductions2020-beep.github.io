"use strict";

/* =========================================================
   PAINTLESS
   TOOLBAR AND TOOL-FAMILY CONTROLLER — v1.0

   File:
   js/tools/toolbar.js

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
      "Paintless toolbar could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. TOOLBAR STATE
  ======================================================= */

  const toolbarState = {

    initialised:
      false,

    shapeMenuOpen:
      false,

    shapeMenuOriginalParent:
      null,

    shapeMenuOriginalNextSibling:
      null,

    shapeHoldTimer:
      null,

    shapeHoldTriggered:
      false,

    shapePointerId:
      null,

    shapeHoldDelay:
      430,

    suppressNextShapeClick:
      false

  };


  /* =======================================================
     3. TOOL DEFINITIONS
  ======================================================= */

  const toolDefinitions = {

    brush: {

      label:
        "Brush",

      shortcut:
        "b",

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none"

    },


    eraser: {

      label:
        "Eraser",

      shortcut:
        "e",

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none"

    },


    move: {

      label:
        "Move",

      shortcut:
        "v",

      options: [],

      cursor:
        "move"

    },


    select: {

      label:
        "Select",

      shortcut:
        "m",

      options: [
        "selection"
      ],

      cursor:
        "crosshair"

    },


    crop: {

      label:
        "Crop",

      shortcut:
        "c",

      options: [],

      cursor:
        "crosshair"

    },


    fill: {

      label:
        "Fill",

      shortcut:
        "g",

      options: [
        "opacity"
      ],

      cursor:
        "crosshair"

    },


    gradient: {

      label:
        "Gradient",

      shortcut:
        null,

      options: [
        "opacity"
      ],

      cursor:
        "crosshair"

    },


    eyedropper: {

      label:
        "Colour Picker",

      shortcut:
        "i",

      options: [],

      cursor:
        "crosshair"

    },


    text: {

      label:
        "Text",

      shortcut:
        "t",

      options: [
        "opacity",
        "text"
      ],

      cursor:
        "text"

    },


    shape: {

      label:
        "Shape",

      shortcut:
        "u",

      options: [
        "brush",
        "opacity",
        "shape"
      ],

      cursor:
        "crosshair"

    }

  };


  const shapeDefinitions = {

    ellipse: {

      label:
        "Ellipse",

      shortLabel:
        "Ellipse",

      icon:
        "◯",

      title:
        "Ellipse shape tool"

    },


    rectangle: {

      label:
        "Rectangle",

      shortLabel:
        "Rectangle",

      icon:
        "□",

      title:
        "Rectangle shape tool"

    },


    "rounded-rectangle": {

      label:
        "Rounded Rectangle",

      shortLabel:
        "Rounded",

      icon:
        "▢",

      title:
        "Rounded rectangle shape tool"

    },


    line: {

      label:
        "Line",

      shortLabel:
        "Line",

      icon:
        "╱",

      title:
        "Line tool"

    }

  };


  /* =======================================================
     4. DOM REFERENCES
  ======================================================= */

  const dom = {

    toolbox:
      null,

    activeToolName:
      null,

    toolButtons:
      [],

    shapeToolFamily:
      null,

    shapeToolButton:
      null,

    shapeToolIcon:
      null,

    shapeToolLabel:
      null,

    shapeToolMenu:
      null,

    shapeChoiceButtons:
      []

  };


  /* =======================================================
     5. HELPERS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      tools.getModule(
        "core"
      )?.api ||
      null
    );

  }


  function isTypingElement(
    element =
      document.activeElement
  ) {

    const core =
      getCore();


    if (
      typeof core?.isTypingElement ===
      "function"
    ) {

      return core.isTypingElement(
        element
      );

    }


    if (!element) {

      return false;

    }


    return (
      element.tagName ===
        "INPUT" ||
      element.tagName ===
        "TEXTAREA" ||
      element.tagName ===
        "SELECT" ||
      element.isContentEditable
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


  function setCanvasCursor(
    cursor
  ) {

    const core =
      getCore();


    if (
      typeof core?.setCanvasCursor ===
      "function"
    ) {

      core.setCanvasCursor(
        cursor
      );

    }

  }


  function showToolOptions(
    optionNames
  ) {

    const core =
      getCore();


    if (
      typeof core?.showToolOptions ===
      "function"
    ) {

      core.showToolOptions(
        optionNames
      );

    }

  }


  function getSelectedShape() {

    return (
      tools.getState(
        "selectedShape"
      ) ||
      "ellipse"
    );

  }


  function setSelectedShape(
    shapeName
  ) {

    const core =
      getCore();


    if (
      typeof core?.setSelectedShape ===
      "function"
    ) {

      return core.setSelectedShape(
        shapeName
      );

    }


    return tools.setState(
      "selectedShape",
      shapeName
    );

  }


  /* =======================================================
     6. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.toolbox =
      document.querySelector(
        ".toolbox"
      );


    dom.activeToolName =
      document.getElementById(
        "active-tool-name"
      );


    dom.toolButtons =
      Array.from(
        document.querySelectorAll(
          ".tool-button[data-tool]"
        )
      );


    dom.shapeToolFamily =
      document.getElementById(
        "shape-tool-family"
      );


    dom.shapeToolButton =
      document.getElementById(
        "shape-tool-button"
      );


    dom.shapeToolIcon =
      document.getElementById(
        "shape-tool-icon"
      );


    dom.shapeToolLabel =
      document.getElementById(
        "shape-tool-label"
      );


    dom.shapeToolMenu =
      document.getElementById(
        "shape-tool-menu"
      );


    dom.shapeChoiceButtons =
      Array.from(
        document.querySelectorAll(
          "[data-shape-choice]"
        )
      );


    if (dom.shapeToolMenu) {

      toolbarState.shapeMenuOriginalParent =
        dom.shapeToolMenu.parentNode;


      toolbarState.shapeMenuOriginalNextSibling =
        dom.shapeToolMenu.nextSibling;

    }


    return dom;

  }


  /* =======================================================
     7. ACTIVE TOOL DISPLAY
  ======================================================= */

  function updateToolButtons(
    activeTool
  ) {

    dom.toolButtons.forEach(
      (button) => {

        const selected =
          button.dataset.tool ===
          activeTool;


        button.classList.toggle(
          "is-active",
          selected
        );


        button.setAttribute(
          "aria-pressed",
          String(
            selected
          )
        );

      }
    );

  }


  function updateActiveToolName(
    toolName
  ) {

    if (!dom.activeToolName) {

      return;

    }


    const definition =
      toolDefinitions[
        toolName
      ];


    if (
      toolName ===
      "shape"
    ) {

      const shape =
        shapeDefinitions[
          getSelectedShape()
        ];


      dom.activeToolName.textContent =
        shape?.label ||
        "Shape";


      return;

    }


    dom.activeToolName.textContent =
      definition?.label ||
      toolName
        .replace(
          /-/g,
          " "
        )
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase()
        );

  }


  function applyToolPresentation(
    toolName
  ) {

    const definition =
      toolDefinitions[
        toolName
      ];


    updateToolButtons(
      toolName
    );


    updateActiveToolName(
      toolName
    );


    showToolOptions(
      definition?.options ||
      []
    );


    setCanvasCursor(
      definition?.cursor ||
      "default"
    );

  }


  function activateTool(
    toolName,
    {
      closeMenus =
        true,

      force =
        false
    } = {}
  ) {

    if (
      !toolDefinitions[
        toolName
      ]
    ) {

      console.warn(
        `Unknown Paintless tool: ${toolName}`
      );


      return false;

    }


    if (closeMenus) {

      closeShapeMenu();

    }


    tools.setActiveTool(
      toolName,
      {
        force
      }
    );


    applyToolPresentation(
      toolName
    );


    return true;

  }


  /* =======================================================
     8. SHAPE BUTTON DISPLAY
  ======================================================= */

  function updateShapeButtonDisplay(
    shapeName =
      getSelectedShape()
  ) {

    const definition =
      shapeDefinitions[
        shapeName
      ] ||
      shapeDefinitions.ellipse;


    if (dom.shapeToolIcon) {

      dom.shapeToolIcon.textContent =
        definition.icon;

    }


    if (dom.shapeToolLabel) {

      dom.shapeToolLabel.textContent =
        definition.shortLabel;

    }


    if (dom.shapeToolButton) {

      dom.shapeToolButton.title =
        `${definition.title} (U) — hold for more shapes`;


      dom.shapeToolButton.setAttribute(
        "aria-label",
        `${definition.label} shape tool`
      );

    }


    dom.shapeChoiceButtons.forEach(
      (button) => {

        const selected =
          button.dataset.shapeChoice ===
          shapeName;


        button.classList.toggle(
          "is-selected",
          selected
        );


        button.setAttribute(
          "aria-pressed",
          String(
            selected
          )
        );

      }
    );


    if (
      tools.getActiveTool() ===
      "shape"
    ) {

      updateActiveToolName(
        "shape"
      );

    }

  }


  function chooseShape(
    shapeName,
    {
      closeMenu =
        true,

      activate =
        true
    } = {}
  ) {

    if (
      !shapeDefinitions[
        shapeName
      ]
    ) {

      return false;

    }


    setSelectedShape(
      shapeName
    );


    updateShapeButtonDisplay(
      shapeName
    );


    if (activate) {

      activateTool(
        "shape",
        {
          closeMenus:
            false,

          force:
            true
        }
      );

    }


    if (closeMenu) {

      closeShapeMenu({
        returnFocus:
          false
      });

    }


    sendStatusMessage(
      `${shapeDefinitions[shapeName].label} selected.`
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:shape-selected",
        {
          detail: {
            shape:
              shapeName
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     9. SHAPE MENU POSITIONING
  ======================================================= */

  function moveShapeMenuToBody() {

    if (
      !dom.shapeToolMenu ||
      dom.shapeToolMenu.parentNode ===
        document.body
    ) {

      return;

    }


    document.body.appendChild(
      dom.shapeToolMenu
    );

  }


  function restoreShapeMenuParent() {

    if (
      !dom.shapeToolMenu ||
      !toolbarState.shapeMenuOriginalParent ||
      dom.shapeToolMenu.parentNode ===
        toolbarState.shapeMenuOriginalParent
    ) {

      return;

    }


    if (
      toolbarState.shapeMenuOriginalNextSibling &&
      toolbarState.shapeMenuOriginalNextSibling
        .parentNode ===
        toolbarState.shapeMenuOriginalParent
    ) {

      toolbarState
        .shapeMenuOriginalParent
        .insertBefore(
          dom.shapeToolMenu,
          toolbarState
            .shapeMenuOriginalNextSibling
        );


      return;

    }


    toolbarState
      .shapeMenuOriginalParent
      .appendChild(
        dom.shapeToolMenu
      );

  }


  function positionShapeMenu() {

    if (
      !toolbarState.shapeMenuOpen ||
      !dom.shapeToolButton ||
      !dom.shapeToolMenu
    ) {

      return;

    }


    const buttonRectangle =
      dom.shapeToolButton
        .getBoundingClientRect();


    const menuRectangle =
      dom.shapeToolMenu
        .getBoundingClientRect();


    const viewportWidth =
      window.innerWidth;


    const viewportHeight =
      window.innerHeight;


    const gap =
      10;


    const edgePadding =
      8;


    let left =
      buttonRectangle.right +
      gap;


    let top =
      buttonRectangle.top +
      (
        buttonRectangle.height -
        menuRectangle.height
      ) /
      2;


    /*
     * If there is not enough room on the right,
     * place the menu to the left of the toolbox.
     */

    if (
      left +
      menuRectangle.width >
      viewportWidth -
        edgePadding
    ) {

      left =
        buttonRectangle.left -
        menuRectangle.width -
        gap;

    }


    left =
      Math.max(
        edgePadding,
        Math.min(
          left,
          viewportWidth -
            menuRectangle.width -
            edgePadding
        )
      );


    top =
      Math.max(
        edgePadding,
        Math.min(
          top,
          viewportHeight -
            menuRectangle.height -
            edgePadding
        )
      );


    dom.shapeToolMenu.style.position =
      "fixed";


    dom.shapeToolMenu.style.left =
      `${Math.round(
        left
      )}px`;


    dom.shapeToolMenu.style.top =
      `${Math.round(
        top
      )}px`;


    dom.shapeToolMenu.style.right =
      "auto";


    dom.shapeToolMenu.style.bottom =
      "auto";


    dom.shapeToolMenu.style.zIndex =
      "10050";

  }


  /* =======================================================
     10. SHAPE MENU OPEN AND CLOSE
  ======================================================= */

  function openShapeMenu() {

    if (
      toolbarState.shapeMenuOpen ||
      !dom.shapeToolMenu ||
      !dom.shapeToolButton
    ) {

      return false;

    }


    moveShapeMenuToBody();


    toolbarState.shapeMenuOpen =
      true;


    dom.shapeToolMenu.hidden =
      false;


    dom.shapeToolMenu.classList.add(
      "is-open"
    );


    dom.shapeToolButton.classList.add(
      "has-open-menu"
    );


    dom.shapeToolButton.setAttribute(
      "aria-expanded",
      "true"
    );


    /*
     * Position after the browser has measured the visible menu.
     */

    requestAnimationFrame(
      () => {

        positionShapeMenu();


        requestAnimationFrame(
          () => {

            dom.shapeToolMenu
              ?.classList.add(
                "is-ready"
              );

          }
        );

      }
    );


    return true;

  }


  function closeShapeMenu({
    returnFocus =
      false
  } = {}) {

    if (
      !dom.shapeToolMenu ||
      !dom.shapeToolButton
    ) {

      toolbarState.shapeMenuOpen =
        false;


      return false;

    }


    toolbarState.shapeMenuOpen =
      false;


    dom.shapeToolMenu.classList.remove(
      "is-ready",
      "is-open"
    );


    dom.shapeToolButton.classList.remove(
      "has-open-menu",
      "is-holding"
    );


    dom.shapeToolButton.setAttribute(
      "aria-expanded",
      "false"
    );


    window.setTimeout(
      () => {

        if (
          toolbarState.shapeMenuOpen
        ) {

          return;

        }


        dom.shapeToolMenu.hidden =
          true;


        dom.shapeToolMenu.style.position =
          "";


        dom.shapeToolMenu.style.left =
          "";


        dom.shapeToolMenu.style.top =
          "";


        dom.shapeToolMenu.style.right =
          "";


        dom.shapeToolMenu.style.bottom =
          "";


        dom.shapeToolMenu.style.zIndex =
          "";


        restoreShapeMenuParent();

      },
      150
    );


    if (
      returnFocus
    ) {

      dom.shapeToolButton.focus();

    }


    return true;

  }


  function toggleShapeMenu() {

    if (
      toolbarState.shapeMenuOpen
    ) {

      return closeShapeMenu();

    }


    activateTool(
      "shape",
      {
        closeMenus:
          false
      }
    );


    return openShapeMenu();

  }


  /* =======================================================
     11. LONG-PRESS HANDLING
  ======================================================= */

  function cancelShapeHoldTimer() {

    if (
      toolbarState.shapeHoldTimer !==
      null
    ) {

      window.clearTimeout(
        toolbarState.shapeHoldTimer
      );

    }


    toolbarState.shapeHoldTimer =
      null;


    dom.shapeToolButton
      ?.classList.remove(
        "is-holding"
      );

  }


  function handleShapePointerDown(
    event
  ) {

    if (
      event.pointerType ===
        "mouse" &&
      event.button !==
        0
    ) {

      return;

    }


    toolbarState.shapePointerId =
      event.pointerId;


    toolbarState.shapeHoldTriggered =
      false;


    cancelShapeHoldTimer();


    dom.shapeToolButton
      ?.classList.add(
        "is-holding"
      );


    toolbarState.shapeHoldTimer =
      window.setTimeout(
        () => {

          toolbarState.shapeHoldTimer =
            null;


          toolbarState.shapeHoldTriggered =
            true;


          toolbarState.suppressNextShapeClick =
            true;


          activateTool(
            "shape",
            {
              closeMenus:
                false
            }
          );


          openShapeMenu();


          navigator.vibrate?.(
            18
          );

        },
        toolbarState.shapeHoldDelay
      );

  }


  function handleShapePointerEnd(
    event
  ) {

    if (
      toolbarState.shapePointerId !==
        null &&
      event.pointerId !==
        toolbarState.shapePointerId
    ) {

      return;

    }


    toolbarState.shapePointerId =
      null;


    cancelShapeHoldTimer();

  }


  /* =======================================================
     12. TOOL BUTTON CONNECTIONS
  ======================================================= */

  function connectOrdinaryToolButtons() {

    dom.toolButtons.forEach(
      (button) => {

        if (
          button ===
          dom.shapeToolButton
        ) {

          return;

        }


        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();


            const toolName =
              button.dataset.tool;


            activateTool(
              toolName
            );

          }
        );

      }
    );

  }


  function connectShapeToolButton() {

    if (
      !dom.shapeToolButton
    ) {

      return;

    }


    dom.shapeToolButton.addEventListener(
      "pointerdown",
      handleShapePointerDown
    );


    dom.shapeToolButton.addEventListener(
      "pointerup",
      handleShapePointerEnd
    );


    dom.shapeToolButton.addEventListener(
      "pointercancel",
      handleShapePointerEnd
    );


    dom.shapeToolButton.addEventListener(
      "pointerleave",
      (event) => {

        if (
          event.pointerType ===
          "mouse"
        ) {

          handleShapePointerEnd(
            event
          );

        }

      }
    );


    dom.shapeToolButton.addEventListener(
      "contextmenu",
      (event) => {

        event.preventDefault();


        activateTool(
          "shape",
          {
            closeMenus:
              false
          }
        );


        openShapeMenu();

      }
    );


    dom.shapeToolButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();


        if (
          toolbarState.suppressNextShapeClick
        ) {

          toolbarState.suppressNextShapeClick =
            false;


          return;

        }


        if (
          toolbarState.shapeHoldTriggered
        ) {

          toolbarState.shapeHoldTriggered =
            false;


          return;

        }


        /*
         * A normal tap/click opens the menu.
         * After choosing a shape, the selected shape remains
         * active for drawing.
         */

        toggleShapeMenu();

      }
    );

  }


  function connectShapeChoices() {

    dom.shapeChoiceButtons.forEach(
      (button) => {

        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            event.stopPropagation();


            chooseShape(
              button.dataset.shapeChoice
            );

          }
        );


        button.addEventListener(
          "keydown",
          (event) => {

            if (
              event.key !==
                "ArrowDown" &&
              event.key !==
                "ArrowUp"
            ) {

              return;

            }


            event.preventDefault();


            const currentIndex =
              dom.shapeChoiceButtons.indexOf(
                button
              );


            const direction =
              event.key ===
                "ArrowDown"
                ? 1
                : -1;


            const nextIndex =
              (
                currentIndex +
                direction +
                dom.shapeChoiceButtons.length
              ) %
              dom.shapeChoiceButtons.length;


            dom.shapeChoiceButtons[
              nextIndex
            ]?.focus();

          }
        );

      }
    );

  }


  /* =======================================================
     13. OUTSIDE-CLICK AND VIEWPORT EVENTS
  ======================================================= */

  function connectMenuClosingEvents() {

    document.addEventListener(
      "pointerdown",
      (event) => {

        if (
          !toolbarState.shapeMenuOpen
        ) {

          return;

        }


        if (
          dom.shapeToolButton?.contains(
            event.target
          ) ||
          dom.shapeToolMenu?.contains(
            event.target
          )
        ) {

          return;

        }


        closeShapeMenu();

      },
      true
    );


    window.addEventListener(
      "resize",
      () => {

        if (
          toolbarState.shapeMenuOpen
        ) {

          positionShapeMenu();

        }

      }
    );


    window.addEventListener(
      "scroll",
      () => {

        if (
          toolbarState.shapeMenuOpen
        ) {

          positionShapeMenu();

        }

      },
      true
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.hidden
        ) {

          closeShapeMenu();

        }

      }
    );

  }


  /* =======================================================
     14. KEYBOARD SHORTCUTS
  ======================================================= */

  function connectKeyboardShortcuts() {

    window.addEventListener(
      "keydown",
      (event) => {

        if (
          isTypingElement()
        ) {

          return;

        }


        if (
          event.key ===
          "Escape"
        ) {

          if (
            toolbarState.shapeMenuOpen
          ) {

            event.preventDefault();


            closeShapeMenu({
              returnFocus:
                true
            });

          }


          return;

        }


        const key =
          event.key.toLowerCase();


        const matchingEntry =
          Object.entries(
            toolDefinitions
          ).find(
            (
              [
                ,
                definition
              ]
            ) =>
              definition.shortcut ===
              key
          );


        if (!matchingEntry) {

          return;

        }


        event.preventDefault();


        const [
          toolName
        ] =
          matchingEntry;


        activateTool(
          toolName
        );

      }
    );

  }


  /* =======================================================
     15. TOOL EVENTS
  ======================================================= */

  function connectPaintlessEvents() {

    document.addEventListener(
      "paintless:tool-changed",
      (event) => {

        const toolName =
          event.detail?.tool;


        if (
          !toolName ||
          !toolDefinitions[
            toolName
          ]
        ) {

          return;

        }


        applyToolPresentation(
          toolName
        );

      }
    );


    document.addEventListener(
      "paintless:shape-changed",
      (event) => {

        const shapeName =
          event.detail?.shape;


        if (
          shapeDefinitions[
            shapeName
          ]
        ) {

          updateShapeButtonDisplay(
            shapeName
          );

        }

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      closeShapeMenu
    );


    document.addEventListener(
      "paintless:image-layer-created",
      closeShapeMenu
    );

  }


  /* =======================================================
     16. INITIAL PRESENTATION
  ======================================================= */

  function initialisePresentation() {

    const selectedShape =
      getSelectedShape();


    updateShapeButtonDisplay(
      selectedShape
    );


    const activeTool =
      tools.getActiveTool() ||
      "brush";


    applyToolPresentation(
      activeTool
    );


    if (dom.shapeToolMenu) {

      dom.shapeToolMenu.hidden =
        true;


      dom.shapeToolMenu.setAttribute(
        "aria-hidden",
        "true"
      );

    }

  }


  /* =======================================================
     17. TOOLBAR MODULE
  ======================================================= */

  const toolbarModule = {

    name:
      "Toolbar",

    label:
      "Toolbar",

    initialised:
      false,


    async initialise() {

      if (
        toolbarState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (
        dom.toolButtons.length ===
        0
      ) {

        throw new Error(
          "Paintless toolbar could not find any tool buttons."
        );

      }


      connectOrdinaryToolButtons();

      connectShapeToolButton();

      connectShapeChoices();

      connectMenuClosingEvents();

      connectKeyboardShortcuts();

      connectPaintlessEvents();

      initialisePresentation();


      toolbarState.initialised =
        true;


      this.initialised =
        true;


      document.dispatchEvent(
        new CustomEvent(
          "paintless:toolbar-ready",
          {
            detail: {
              toolbar:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless toolbar ready.",
        [
          "color:#d49aff",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    }

  };


  /* =======================================================
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      toolbarState,

    toolDefinitions,

    shapeDefinitions,

    activateTool,

    applyToolPresentation,

    updateToolButtons,

    updateActiveToolName,

    updateShapeButtonDisplay,

    chooseShape,

    openShapeMenu,

    closeShapeMenu,

    toggleShapeMenu,

    positionShapeMenu,


    isShapeMenuOpen() {

      return toolbarState.shapeMenuOpen;

    },


    getSelectedShape() {

      return getSelectedShape();

    }

  };


  window.PaintlessToolbar =
    publicApi;


  toolbarModule.api =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "toolbar",
    toolbarModule
  );

})();
