"use strict";

/* =========================================================
   PAINTLESS
   SMART TOOLS FLYOUT — v1.0

   File:
   js/tools/smart-tools.js

   Adds one visible Smart Tools button to the toolbox with a
   mobile-friendly long-press / click flyout containing:

   - Clone
   - Smudge
   - Liquify
   - Blur
   - Sharpen

   Features:
   - Ordinary click opens the Smart Tools menu
   - Long-press opens the menu on touch, pen or mouse
   - Selected smart tool replaces the main button icon/label
   - Clicking the main button again activates the last tool
   - Menu escapes toolbox overflow by mounting on document.body
   - Keyboard navigation
   - Escape closes the menu
   - Outside click closes the menu
   - Automatically patches PaintlessToolbar definitions
   - Works without editing index.html or toolbar.js
   - Injects its own required CSS
   - Supports future smart tools through the public API

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
      "Paintless Smart Tools could not start because tools.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. SMART TOOL DEFINITIONS
  ======================================================= */

  const smartToolDefinitions = {

    clone: {

      label:
        "Clone",

      description:
        "Copy pixels from a movable source point.",

      icon:
        "⧉",

      shortcut:
        null,

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none",

      colour:
        "#35e7ff"

    },


    smudge: {

      label:
        "Smudge",

      description:
        "Push and blend pixels like wet paint.",

      icon:
        "〰",

      shortcut:
        null,

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none",

      colour:
        "#69f59c"

    },


    liquify: {

      label:
        "Liquify",

      description:
        "Push pixels around like soft clay.",

      icon:
        "➜",

      shortcut:
        null,

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none",

      colour:
        "#ff5fb7"

    },


    blur: {

      label:
        "Blur",

      description:
        "Soften details with a painted blur.",

      icon:
        "◉",

      shortcut:
        null,

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none",

      colour:
        "#d49aff"

    },


    sharpen: {

      label:
        "Sharpen",

      description:
        "Paint extra crispness into details.",

      icon:
        "✦",

      shortcut:
        null,

      options: [
        "brush",
        "opacity",
        "hardness"
      ],

      cursor:
        "none",

      colour:
        "#ffd75a"

    }

  };


  /* =======================================================
     3. SMART TOOLS STATE
  ======================================================= */

  const smartState = {

    initialised:
      false,

    active:
      false,

    menuOpen:
      false,

    selectedTool:
      "clone",

    previousTool:
      null,

    holdTimer:
      null,

    holdTriggered:
      false,

    suppressNextClick:
      false,

    pointerId:
      null,

    holdDelay:
      430,

    menuCloseDelay:
      140,

    storageKey:
      "paintless-selected-smart-tool",

    originalMenuParent:
      null,

    originalMenuNextSibling:
      null,

    styleInjected:
      false

  };


  /* =======================================================
     4. DOM REFERENCES
  ======================================================= */

  const dom = {

    toolbox:
      null,

    family:
      null,

    mainButton:
      null,

    mainIcon:
      null,

    mainLabel:
      null,

    menu:
      null,

    menuButtons:
      [],

    style:
      null

  };


  /* =======================================================
     5. SHARED APIS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  function getToolbar() {

    return (
      window.PaintlessToolbar ||
      tools.getModule?.(
        "toolbar"
      )?.api ||
      null
    );

  }


  /* =======================================================
     6. GENERAL HELPERS
  ======================================================= */

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


    return Boolean(
      element &&
      (
        element.tagName ===
          "INPUT" ||
        element.tagName ===
          "TEXTAREA" ||
        element.tagName ===
          "SELECT" ||
        element.isContentEditable
      )
    );

  }


  function formatToolName(
    toolName
  ) {

    return String(
      toolName ||
      "Smart Tool"
    )
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


  function isSmartTool(
    toolName
  ) {

    return Boolean(
      smartToolDefinitions[
        toolName
      ]
    );

  }


  function getSelectedDefinition() {

    return (
      smartToolDefinitions[
        smartState.selectedTool
      ] ||
      smartToolDefinitions.clone
    );

  }


  function getToolModule(
    toolName
  ) {

    return (
      tools.getModule?.(
        toolName
      ) ||
      null
    );

  }


  function toolIsAvailable(
    toolName
  ) {

    const module =
      getToolModule(
        toolName
      );


    return Boolean(
      module &&
      module.initialised !==
        false
    );

  }


  function saveSelectedTool() {

    try {

      window.localStorage.setItem(
        smartState.storageKey,
        smartState.selectedTool
      );


      return true;

    } catch (error) {

      return false;

    }

  }


  function loadSelectedTool() {

    try {

      const savedTool =
        window.localStorage.getItem(
          smartState.storageKey
        );


      if (
        isSmartTool(
          savedTool
        )
      ) {

        smartState.selectedTool =
          savedTool;


        return true;

      }

    } catch (error) {

      /*
       * Storage is optional.
       */

    }


    return false;

  }


  /* =======================================================
     7. CSS
  ======================================================= */

  function injectStyles() {

    if (
      smartState.styleInjected ||
      document.getElementById(
        "paintless-smart-tools-styles"
      )
    ) {

      smartState.styleInjected =
        true;


      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless-smart-tools-styles";


    style.textContent = `
      .paintless-smart-family {
        position: relative;
      }

      .paintless-smart-button {
        position: relative;
      }

      .paintless-smart-button::after {
        content: "";
        position: absolute;
        right: 5px;
        bottom: 5px;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-top: 4px solid rgba(255, 255, 255, 0.82);
        pointer-events: none;
      }

      .paintless-smart-button.is-holding {
        transform: scale(0.96);
      }

      .paintless-smart-button.has-open-menu {
        box-shadow:
          0 0 0 2px rgba(255, 255, 255, 0.12),
          0 0 22px var(--smart-tool-colour, #35e7ff);
      }

      .paintless-smart-menu {
        position: fixed;
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
        width: min(270px, calc(100vw - 16px));
        max-height: min(440px, calc(100vh - 16px));
        padding: 10px;
        overflow-y: auto;
        overscroll-behavior: contain;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        background:
          linear-gradient(
            145deg,
            rgba(30, 21, 46, 0.98),
            rgba(12, 8, 20, 0.99)
          );
        box-shadow:
          0 24px 70px rgba(0, 0, 0, 0.58),
          0 0 0 1px rgba(168, 76, 255, 0.16);
        opacity: 0;
        transform: translateY(4px) scale(0.98);
        transform-origin: center;
        transition:
          opacity 130ms ease,
          transform 130ms ease;
        z-index: 10080;
      }

      .paintless-smart-menu[hidden] {
        display: none !important;
      }

      .paintless-smart-menu.is-open.is-ready {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .paintless-smart-menu-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 3px 5px 7px;
        color: rgba(255, 255, 255, 0.7);
        font:
          700 11px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        letter-spacing: 0.11em;
        text-transform: uppercase;
      }

      .paintless-smart-menu-hint {
        color: rgba(255, 255, 255, 0.42);
        font-size: 10px;
        letter-spacing: 0;
        text-transform: none;
      }

      .paintless-smart-choice {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 18px;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 56px;
        padding: 7px 9px;
        border: 1px solid transparent;
        border-radius: 11px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.045);
        font: inherit;
        text-align: left;
        cursor: pointer;
        touch-action: manipulation;
        transition:
          background 120ms ease,
          border-color 120ms ease,
          transform 120ms ease;
      }

      .paintless-smart-choice:hover,
      .paintless-smart-choice:focus-visible {
        border-color:
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 65%,
            transparent
          );
        background:
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 15%,
            rgba(255, 255, 255, 0.05)
          );
        outline: none;
        transform: translateX(2px);
      }

      .paintless-smart-choice.is-selected {
        border-color:
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 78%,
            transparent
          );
        background:
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 20%,
            rgba(255, 255, 255, 0.04)
          );
      }

      .paintless-smart-choice.is-unavailable {
        opacity: 0.48;
      }

      .paintless-smart-choice-icon {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 11px;
        color: #ffffff;
        background:
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 25%,
            rgba(255, 255, 255, 0.06)
          );
        box-shadow:
          inset 0 0 0 1px
          color-mix(
            in srgb,
            var(--smart-choice-colour, #a84cff) 48%,
            transparent
          );
        font-size: 21px;
        line-height: 1;
      }

      .paintless-smart-choice-copy {
        min-width: 0;
      }

      .paintless-smart-choice-label {
        display: block;
        overflow: hidden;
        color: #ffffff;
        font:
          700 13px/1.2
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless-smart-choice-description {
        display: block;
        margin-top: 3px;
        overflow: hidden;
        color: rgba(255, 255, 255, 0.58);
        font:
          400 11px/1.3
          "Segoe UI",
          Arial,
          sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .paintless-smart-choice-check {
        color: var(--smart-choice-colour, #a84cff);
        font-size: 16px;
        font-weight: 900;
        opacity: 0;
      }

      .paintless-smart-choice.is-selected
      .paintless-smart-choice-check {
        opacity: 1;
      }

      @media (max-width: 620px) {
        .paintless-smart-menu {
          width: min(300px, calc(100vw - 12px));
          padding: 8px;
          border-radius: 13px;
        }

        .paintless-smart-choice {
          min-height: 60px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    dom.style =
      style;


    smartState.styleInjected =
      true;

  }


  /* =======================================================
     8. TOOLBAR PATCH
  ======================================================= */

  function patchToolbarDefinitions() {

    const toolbar =
      getToolbar();


    if (
      !toolbar?.toolDefinitions
    ) {

      return false;

    }


    Object.entries(
      smartToolDefinitions
    ).forEach(
      (
        [
          toolName,
          definition
        ]
      ) => {

        toolbar.toolDefinitions[
          toolName
        ] = {

          label:
            definition.label,

          shortcut:
            definition.shortcut,

          options:
            [
              ...definition.options
            ],

          cursor:
            definition.cursor

        };

      }
    );


    return true;

  }


  /* =======================================================
     9. DOM CREATION
  ======================================================= */

  function createMainButton() {

    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.id =
      "smart-tool-button";


    button.className =
      "tool-button paintless-smart-button";


    button.dataset.tool =
      smartState.selectedTool;


    button.setAttribute(
      "aria-haspopup",
      "menu"
    );


    button.setAttribute(
      "aria-expanded",
      "false"
    );


    button.setAttribute(
      "aria-pressed",
      "false"
    );


    const icon =
      document.createElement(
        "span"
      );


    icon.id =
      "smart-tool-icon";


    icon.className =
      "tool-icon";


    icon.setAttribute(
      "aria-hidden",
      "true"
    );


    const label =
      document.createElement(
        "span"
      );


    label.id =
      "smart-tool-label";


    label.className =
      "tool-label";


    button.append(
      icon,
      label
    );


    dom.mainButton =
      button;


    dom.mainIcon =
      icon;


    dom.mainLabel =
      label;


    return button;

  }


  function createSmartMenu() {

    const menu =
      document.createElement(
        "div"
      );


    menu.id =
      "smart-tool-menu";


    menu.className =
      "paintless-smart-menu";


    menu.hidden =
      true;


    menu.setAttribute(
      "role",
      "menu"
    );


    menu.setAttribute(
      "aria-label",
      "Smart Tools"
    );


    menu.setAttribute(
      "aria-hidden",
      "true"
    );


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "paintless-smart-menu-title";


    const titleText =
      document.createElement(
        "span"
      );


    titleText.textContent =
      "Smart Tools";


    const hint =
      document.createElement(
        "span"
      );


    hint.className =
      "paintless-smart-menu-hint";


    hint.textContent =
      "Choose a tool";


    title.append(
      titleText,
      hint
    );


    menu.appendChild(
      title
    );


    Object.entries(
      smartToolDefinitions
    ).forEach(
      (
        [
          toolName,
          definition
        ]
      ) => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "paintless-smart-choice";


        button.dataset.smartTool =
          toolName;


        button.setAttribute(
          "role",
          "menuitemradio"
        );


        button.setAttribute(
          "aria-checked",
          "false"
        );


        button.style.setProperty(
          "--smart-choice-colour",
          definition.colour
        );


        const icon =
          document.createElement(
            "span"
          );


        icon.className =
          "paintless-smart-choice-icon";


        icon.textContent =
          definition.icon;


        icon.setAttribute(
          "aria-hidden",
          "true"
        );


        const copy =
          document.createElement(
            "span"
          );


        copy.className =
          "paintless-smart-choice-copy";


        const label =
          document.createElement(
            "span"
          );


        label.className =
          "paintless-smart-choice-label";


        label.textContent =
          definition.label;


        const description =
          document.createElement(
            "span"
          );


        description.className =
          "paintless-smart-choice-description";


        description.textContent =
          definition.description;


        copy.append(
          label,
          description
        );


        const check =
          document.createElement(
            "span"
          );


        check.className =
          "paintless-smart-choice-check";


        check.textContent =
          "✓";


        check.setAttribute(
          "aria-hidden",
          "true"
        );


        button.append(
          icon,
          copy,
          check
        );


        menu.appendChild(
          button
        );

      }
    );


    dom.menu =
      menu;


    dom.menuButtons =
      Array.from(
        menu.querySelectorAll(
          "[data-smart-tool]"
        )
      );


    return menu;

  }


  function createSmartFamily() {

    const family =
      document.createElement(
        "div"
      );


    family.id =
      "smart-tool-family";


    family.className =
      "tool-family paintless-smart-family";


    const mainButton =
      createMainButton();


    const menu =
      createSmartMenu();


    family.append(
      mainButton,
      menu
    );


    dom.family =
      family;


    smartState.originalMenuParent =
      family;


    smartState.originalMenuNextSibling =
      null;


    return family;

  }


  function findToolbox() {

    return (
      document.querySelector(
        ".toolbox"
      ) ||
      document.getElementById(
        "toolbox"
      ) ||
      document.querySelector(
        "[data-toolbox]"
      ) ||
      null
    );

  }


  function installSmartFamily() {

    const existingFamily =
      document.getElementById(
        "smart-tool-family"
      );


    if (existingFamily) {

      dom.family =
        existingFamily;


      dom.mainButton =
        document.getElementById(
          "smart-tool-button"
        );


      dom.mainIcon =
        document.getElementById(
          "smart-tool-icon"
        );


      dom.mainLabel =
        document.getElementById(
          "smart-tool-label"
        );


      dom.menu =
        document.getElementById(
          "smart-tool-menu"
        );


      dom.menuButtons =
        Array.from(
          document.querySelectorAll(
            "[data-smart-tool]"
          )
        );


      smartState.originalMenuParent =
        dom.menu?.parentNode ||
        existingFamily;


      smartState.originalMenuNextSibling =
        dom.menu?.nextSibling ||
        null;


      return true;

    }


    dom.toolbox =
      findToolbox();


    if (!dom.toolbox) {

      return false;

    }


    const family =
      createSmartFamily();


    dom.toolbox.appendChild(
      family
    );


    return true;

  }


  /* =======================================================
     10. MAIN BUTTON DISPLAY
  ======================================================= */

  function updateMainButtonDisplay() {

    const definition =
      getSelectedDefinition();


    if (dom.mainIcon) {

      dom.mainIcon.textContent =
        definition.icon;

    }


    if (dom.mainLabel) {

      dom.mainLabel.textContent =
        definition.label;

    }


    if (dom.mainButton) {

      dom.mainButton.dataset.tool =
        smartState.selectedTool;


      dom.mainButton.title =
        `${definition.label} — click or hold for Smart Tools`;


      dom.mainButton.setAttribute(
        "aria-label",
        `${definition.label}. Open Smart Tools menu.`
      );


      dom.mainButton.style.setProperty(
        "--smart-tool-colour",
        definition.colour
      );

    }


    dom.menuButtons.forEach(
      (button) => {

        const toolName =
          button.dataset.smartTool;


        const selected =
          toolName ===
          smartState.selectedTool;


        const available =
          toolIsAvailable(
            toolName
          );


        button.classList.toggle(
          "is-selected",
          selected
        );


        button.classList.toggle(
          "is-unavailable",
          !available
        );


        button.setAttribute(
          "aria-checked",
          String(
            selected
          )
        );


        button.title =
          available
            ? smartToolDefinitions[
                toolName
              ].description
            : `${
                smartToolDefinitions[
                  toolName
                ].label
              } is waiting for its tool file.`;

      }
    );

  }


  function updateActiveAppearance(
    activeTool =
      tools.getActiveTool?.()
  ) {

    const active =
      isSmartTool(
        activeTool
      );


    smartState.active =
      active;


    dom.mainButton
      ?.classList.toggle(
        "is-active",
        active
      );


    dom.mainButton
      ?.setAttribute(
        "aria-pressed",
        String(
          active
        )
      );


    if (
      active &&
      activeTool !==
      smartState.selectedTool
    ) {

      smartState.selectedTool =
        activeTool;


      saveSelectedTool();

      updateMainButtonDisplay();

    }

  }


  /* =======================================================
     11. MENU BODY MOUNTING
  ======================================================= */

  function moveMenuToBody() {

    if (
      !dom.menu ||
      dom.menu.parentNode ===
        document.body
    ) {

      return;

    }


    document.body.appendChild(
      dom.menu
    );

  }


  function restoreMenuParent() {

    if (
      !dom.menu ||
      !smartState.originalMenuParent ||
      dom.menu.parentNode ===
        smartState.originalMenuParent
    ) {

      return;

    }


    if (
      smartState.originalMenuNextSibling &&
      smartState.originalMenuNextSibling
        .parentNode ===
        smartState.originalMenuParent
    ) {

      smartState.originalMenuParent.insertBefore(
        dom.menu,
        smartState.originalMenuNextSibling
      );


      return;

    }


    smartState.originalMenuParent.appendChild(
      dom.menu
    );

  }


  /* =======================================================
     12. MENU POSITIONING
  ======================================================= */

  function positionMenu() {

    if (
      !smartState.menuOpen ||
      !dom.mainButton ||
      !dom.menu
    ) {

      return false;

    }


    const buttonRectangle =
      dom.mainButton.getBoundingClientRect();


    const menuRectangle =
      dom.menu.getBoundingClientRect();


    const viewportWidth =
      window.innerWidth;


    const viewportHeight =
      window.innerHeight;


    const edgePadding =
      8;


    const gap =
      10;


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


    if (
      left <
      edgePadding
    ) {

      left =
        buttonRectangle.left +
        buttonRectangle.width /
        2 -
        menuRectangle.width /
        2;


      top =
        buttonRectangle.bottom +
        gap;

    }


    if (
      top +
      menuRectangle.height >
      viewportHeight -
      edgePadding
    ) {

      top =
        buttonRectangle.top -
        menuRectangle.height -
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


    dom.menu.style.left =
      `${Math.round(
        left
      )}px`;


    dom.menu.style.top =
      `${Math.round(
        top
      )}px`;


    dom.menu.style.right =
      "auto";


    dom.menu.style.bottom =
      "auto";


    return true;

  }


  /* =======================================================
     13. MENU OPEN AND CLOSE
  ======================================================= */

  function openMenu({
    focusSelected =
      false
  } = {}) {

    if (
      smartState.menuOpen ||
      !dom.mainButton ||
      !dom.menu
    ) {

      return false;

    }


    moveMenuToBody();


    smartState.menuOpen =
      true;


    updateMainButtonDisplay();


    dom.menu.hidden =
      false;


    dom.menu.setAttribute(
      "aria-hidden",
      "false"
    );


    dom.menu.classList.add(
      "is-open"
    );


    dom.mainButton.classList.add(
      "has-open-menu"
    );


    dom.mainButton.setAttribute(
      "aria-expanded",
      "true"
    );


    requestAnimationFrame(
      () => {

        positionMenu();


        requestAnimationFrame(
          () => {

            dom.menu?.classList.add(
              "is-ready"
            );


            if (focusSelected) {

              const selectedButton =
                dom.menuButtons.find(
                  (button) =>
                    button.dataset.smartTool ===
                    smartState.selectedTool
                ) ||
                dom.menuButtons[0];


              selectedButton?.focus();

            }

          }
        );

      }
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:smart-tools-menu-opened"
      )
    );


    return true;

  }


  function closeMenu({
    returnFocus =
      false
  } = {}) {

    if (
      !dom.mainButton ||
      !dom.menu
    ) {

      smartState.menuOpen =
        false;


      return false;

    }


    smartState.menuOpen =
      false;


    dom.menu.classList.remove(
      "is-ready",
      "is-open"
    );


    dom.mainButton.classList.remove(
      "has-open-menu",
      "is-holding"
    );


    dom.mainButton.setAttribute(
      "aria-expanded",
      "false"
    );


    dom.menu.setAttribute(
      "aria-hidden",
      "true"
    );


    window.setTimeout(
      () => {

        if (
          smartState.menuOpen
        ) {

          return;

        }


        dom.menu.hidden =
          true;


        dom.menu.style.left =
          "";


        dom.menu.style.top =
          "";


        dom.menu.style.right =
          "";


        dom.menu.style.bottom =
          "";


        restoreMenuParent();

      },
      smartState.menuCloseDelay
    );


    if (returnFocus) {

      dom.mainButton.focus();

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:smart-tools-menu-closed"
      )
    );


    return true;

  }


  function toggleMenu() {

    return smartState.menuOpen
      ? closeMenu()
      : openMenu();

  }


  /* =======================================================
     14. TOOL ACTIVATION
  ======================================================= */

  function deactivatePreviousTool(
    nextTool
  ) {

    const previousTool =
      tools.getActiveTool?.();


    if (
      !previousTool ||
      previousTool ===
        nextTool
    ) {

      return;

    }


    const previousModule =
      getToolModule(
        previousTool
      );


    try {

      previousModule
        ?.deactivate?.();

    } catch (error) {

      console.warn(
        `Paintless could not deactivate ${previousTool}:`,
        error
      );

    }

  }


  function activateSmartTool(
    toolName,
    {
      announce =
        true,

      close =
        true
    } = {}
  ) {

    if (
      !isSmartTool(
        toolName
      )
    ) {

      return false;

    }


    const module =
      getToolModule(
        toolName
      );


    if (!module) {

      sendStatusMessage(
        `${smartToolDefinitions[toolName].label} is waiting for its tool file.`
      );


      return false;

    }


    smartState.previousTool =
      tools.getActiveTool?.() ||
      null;


    deactivatePreviousTool(
      toolName
    );


    smartState.selectedTool =
      toolName;


    saveSelectedTool();


    /*
     * Prefer the toolbar API because it updates the active-tool
     * name, visible options and toolbox active state.
     *
     * smart-tools.js patches toolbar definitions beforehand,
     * allowing the existing toolbar to recognise these tools.
     */

    const toolbar =
      getToolbar();


    let activated =
      false;


    if (
      typeof toolbar?.activateTool ===
      "function"
    ) {

      activated =
        toolbar.activateTool(
          toolName,
          {
            closeMenus:
              false,

            force:
              true
          }
        ) !==
        false;

    } else {

      activated =
        tools.setActiveTool(
          toolName,
          {
            force:
              true
          }
        ) !==
        false;


      try {

        module.activate?.();

      } catch (error) {

        console.error(
          `Paintless ${toolName} activation failed:`,
          error
        );


        activated =
          false;

      }

    }


    if (!activated) {

      sendStatusMessage(
        `${smartToolDefinitions[toolName].label} could not be activated.`
      );


      return false;

    }


    updateMainButtonDisplay();

    updateActiveAppearance(
      toolName
    );


    if (close) {

      closeMenu();

    }


    if (announce) {

      sendStatusMessage(
        `${smartToolDefinitions[toolName].label} selected.`
      );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:smart-tool-selected",
        {
          detail: {

            tool:
              toolName,

            definition:
              {
                ...smartToolDefinitions[
                  toolName
                ]
              }

          }
        }
      )
    );


    return true;

  }


  function selectSmartTool(
    toolName,
    {
      activate =
        true,

      close =
        true
    } = {}
  ) {

    if (
      !isSmartTool(
        toolName
      )
    ) {

      return false;

    }


    smartState.selectedTool =
      toolName;


    saveSelectedTool();

    updateMainButtonDisplay();


    if (activate) {

      return activateSmartTool(
        toolName,
        {
          close
        }
      );

    }


    if (close) {

      closeMenu();

    }


    return true;

  }


  /* =======================================================
     15. LONG PRESS
  ======================================================= */

  function cancelHoldTimer() {

    if (
      smartState.holdTimer !==
      null
    ) {

      window.clearTimeout(
        smartState.holdTimer
      );

    }


    smartState.holdTimer =
      null;


    dom.mainButton
      ?.classList.remove(
        "is-holding"
      );

  }


  function handlePointerDown(
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


    smartState.pointerId =
      event.pointerId;


    smartState.holdTriggered =
      false;


    cancelHoldTimer();


    dom.mainButton
      ?.classList.add(
        "is-holding"
      );


    smartState.holdTimer =
      window.setTimeout(
        () => {

          smartState.holdTimer =
            null;


          smartState.holdTriggered =
            true;


          smartState.suppressNextClick =
            true;


          openMenu({
            focusSelected:
              false
          });


          navigator.vibrate?.(
            18
          );

        },
        smartState.holdDelay
      );

  }


  function handlePointerEnd(
    event
  ) {

    if (
      smartState.pointerId !==
        null &&
      event.pointerId !==
        smartState.pointerId
    ) {

      return;

    }


    smartState.pointerId =
      null;


    cancelHoldTimer();

  }


  /* =======================================================
     16. BUTTON EVENTS
  ======================================================= */

  function connectMainButton() {

    if (!dom.mainButton) {

      return;

    }


    dom.mainButton.addEventListener(
      "pointerdown",
      handlePointerDown
    );


    dom.mainButton.addEventListener(
      "pointerup",
      handlePointerEnd
    );


    dom.mainButton.addEventListener(
      "pointercancel",
      handlePointerEnd
    );


    dom.mainButton.addEventListener(
      "pointerleave",
      (event) => {

        if (
          event.pointerType ===
          "mouse"
        ) {

          handlePointerEnd(
            event
          );

        }

      }
    );


    dom.mainButton.addEventListener(
      "contextmenu",
      (event) => {

        event.preventDefault();


        openMenu({
          focusSelected:
            false
        });

      }
    );


    dom.mainButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();


        if (
          smartState.suppressNextClick
        ) {

          smartState.suppressNextClick =
            false;


          return;

        }


        if (
          smartState.holdTriggered
        ) {

          smartState.holdTriggered =
            false;


          return;

        }


        /*
         * When the currently selected smart tool is already
         * active, clicking opens the family menu.
         *
         * When another tool is active, one click immediately
         * returns to the last chosen smart tool.
         */

        if (
          tools.getActiveTool?.() ===
          smartState.selectedTool
        ) {

          toggleMenu();


          return;

        }


        activateSmartTool(
          smartState.selectedTool,
          {
            close:
              true
          }
        );

      }
    );


    dom.mainButton.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key ===
            "ArrowRight" ||
          event.key ===
            "ArrowDown"
        ) {

          event.preventDefault();


          openMenu({
            focusSelected:
              true
          });

        }

      }
    );

  }


  function connectMenuButtons() {

    dom.menuButtons.forEach(
      (
        button,
        index
      ) => {

        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            event.stopPropagation();


            selectSmartTool(
              button.dataset.smartTool
            );

          }
        );


        button.addEventListener(
          "keydown",
          (event) => {

            const key =
              event.key;


            if (
              key ===
              "Escape"
            ) {

              event.preventDefault();


              closeMenu({
                returnFocus:
                  true
              });


              return;

            }


            if (
              key ===
                "Enter" ||
              key ===
                " "
            ) {

              event.preventDefault();


              selectSmartTool(
                button.dataset.smartTool
              );


              return;

            }


            if (
              ![
                "ArrowDown",
                "ArrowUp",
                "Home",
                "End"
              ].includes(
                key
              )
            ) {

              return;

            }


            event.preventDefault();


            let nextIndex =
              index;


            if (
              key ===
              "ArrowDown"
            ) {

              nextIndex =
                (
                  index +
                  1
                ) %
                dom.menuButtons.length;

            }


            if (
              key ===
              "ArrowUp"
            ) {

              nextIndex =
                (
                  index -
                  1 +
                  dom.menuButtons.length
                ) %
                dom.menuButtons.length;

            }


            if (
              key ===
              "Home"
            ) {

              nextIndex =
                0;

            }


            if (
              key ===
              "End"
            ) {

              nextIndex =
                dom.menuButtons.length -
                1;

            }


            dom.menuButtons[
              nextIndex
            ]?.focus();

          }
        );

      }
    );

  }


  /* =======================================================
     17. GLOBAL EVENTS
  ======================================================= */

  function connectGlobalEvents() {

    document.addEventListener(
      "pointerdown",
      (event) => {

        if (
          !smartState.menuOpen
        ) {

          return;

        }


        if (
          dom.mainButton?.contains(
            event.target
          ) ||
          dom.menu?.contains(
            event.target
          )
        ) {

          return;

        }


        closeMenu();

      },
      true
    );


    window.addEventListener(
      "resize",
      () => {

        if (
          smartState.menuOpen
        ) {

          positionMenu();

        }

      }
    );


    window.addEventListener(
      "scroll",
      () => {

        if (
          smartState.menuOpen
        ) {

          positionMenu();

        }

      },
      true
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key ===
            "Escape" &&
          smartState.menuOpen
        ) {

          event.preventDefault();


          closeMenu({
            returnFocus:
              true
          });


          return;

        }


        if (
          isTypingElement()
        ) {

          return;

        }


        /*
         * S opens the Smart Tools menu. This does not steal a
         * shortcut from the current toolbar definitions.
         */

        if (
          event.key.toLowerCase() ===
            "s" &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {

          event.preventDefault();


          openMenu({
            focusSelected:
              true
          });

        }

      }
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.hidden
        ) {

          closeMenu();

          cancelHoldTimer();

        }

      }
    );


    document.addEventListener(
      "paintless:tool-changed",
      (event) => {

        const activeTool =
          event.detail?.tool;


        updateActiveAppearance(
          activeTool
        );


        if (
          !isSmartTool(
            activeTool
          )
        ) {

          closeMenu();

        }

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      closeMenu
    );


    document.addEventListener(
      "paintless:history-restored",
      closeMenu
    );


    /*
     * Refresh availability when any delayed tool module becomes
     * ready after Smart Tools has already initialised.
     */

    [
      "paintless:clone-ready",
      "paintless:smudge-ready",
      "paintless:liquify-ready",
      "paintless:blur-ready",
      "paintless:sharpen-ready"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          updateMainButtonDisplay
        );

      }
    );

  }


  /* =======================================================
     18. FUTURE SMART TOOLS
  ======================================================= */

  function registerSmartTool(
    toolName,
    definition
  ) {

    if (
      !toolName ||
      !definition ||
      typeof definition !==
        "object"
    ) {

      return false;

    }


    smartToolDefinitions[
      toolName
    ] = {

      label:
        definition.label ||
        formatToolName(
          toolName
        ),

      description:
        definition.description ||
        "Paintless smart editing tool.",

      icon:
        definition.icon ||
        "◆",

      shortcut:
        definition.shortcut ||
        null,

      options:
        Array.isArray(
          definition.options
        )
          ? [
              ...definition.options
            ]
          : [
              "brush",
              "opacity",
              "hardness"
            ],

      cursor:
        definition.cursor ||
        "none",

      colour:
        definition.colour ||
        "#a84cff"

    };


    patchToolbarDefinitions();


    /*
     * Rebuild only the menu. The main toolbox button remains
     * connected and does not need replacing.
     */

    if (dom.menu) {

      const wasOpen =
        smartState.menuOpen;


      closeMenu();


      dom.menu.remove();


      const newMenu =
        createSmartMenu();


      dom.family?.appendChild(
        newMenu
      );


      smartState.originalMenuParent =
        dom.family;


      smartState.originalMenuNextSibling =
        null;


      connectMenuButtons();


      updateMainButtonDisplay();


      if (wasOpen) {

        openMenu();

      }

    }


    return true;

  }


  function unregisterSmartTool(
    toolName
  ) {

    if (
      !isSmartTool(
        toolName
      ) ||
      Object.keys(
        smartToolDefinitions
      ).length <=
        1
    ) {

      return false;

    }


    delete smartToolDefinitions[
      toolName
    ];


    if (
      smartState.selectedTool ===
      toolName
    ) {

      smartState.selectedTool =
        Object.keys(
          smartToolDefinitions
        )[0];

    }


    saveSelectedTool();


    const toolbar =
      getToolbar();


    if (
      toolbar?.toolDefinitions
    ) {

      delete toolbar.toolDefinitions[
        toolName
      ];

    }


    if (dom.menu) {

      dom.menu
        .querySelector(
          `[data-smart-tool="${toolName}"]`
        )
        ?.remove();


      dom.menuButtons =
        Array.from(
          dom.menu.querySelectorAll(
            "[data-smart-tool]"
          )
        );

    }


    updateMainButtonDisplay();


    return true;

  }


  /* =======================================================
     19. ACTIVATION
  ======================================================= */

  function activate() {

    smartState.active =
      isSmartTool(
        tools.getActiveTool?.()
      );


    updateActiveAppearance();


    return true;

  }


  function deactivate() {

    smartState.active =
      false;


    closeMenu();


    updateActiveAppearance();


    return true;

  }


  /* =======================================================
     20. SMART TOOLS MODULE
  ======================================================= */

  const smartToolsModule = {

    name:
      "Smart Tools",

    label:
      "Smart Tools",

    initialised:
      false,


    async initialise() {

      if (
        smartState.initialised
      ) {

        return true;

      }


      injectStyles();


      loadSelectedTool();


      patchToolbarDefinitions();


      const installed =
        installSmartFamily();


      if (!installed) {

        throw new Error(
          "Paintless Smart Tools could not find the toolbox."
        );

      }


      connectMainButton();

      connectMenuButtons();

      connectGlobalEvents();


      updateMainButtonDisplay();

      updateActiveAppearance();


      smartState.initialised =
        true;


      this.initialised =
        true;


      document.dispatchEvent(
        new CustomEvent(
          "paintless:smart-tools-ready",
          {
            detail: {
              smartTools:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Smart Tools ready.",
        [
          "color:#35e7ff",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    },


    activate,

    deactivate

  };


  /* =======================================================
     21. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      smartState,

    definitions:
      smartToolDefinitions,


    activate,

    deactivate,


    openMenu,

    closeMenu,

    toggleMenu,

    positionMenu,


    activateSmartTool,

    selectSmartTool,


    registerSmartTool,

    unregisterSmartTool,


    updateMainButtonDisplay,

    updateActiveAppearance,

    patchToolbarDefinitions,


    getSelectedTool() {

      return smartState.selectedTool;

    },


    getSelectedDefinition() {

      return {
        ...getSelectedDefinition()
      };

    },


    getAvailableTools() {

      return Object.keys(
        smartToolDefinitions
      ).filter(
        toolIsAvailable
      );

    },


    getUnavailableTools() {

      return Object.keys(
        smartToolDefinitions
      ).filter(
        (toolName) =>
          !toolIsAvailable(
            toolName
          )
      );

    },


    isMenuOpen() {

      return smartState.menuOpen;

    },


    isSmartTool,

    toolIsAvailable

  };


  window.PaintlessSmartTools =
    publicApi;


  smartToolsModule.api =
    publicApi;


  /* =======================================================
     22. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "smart-tools",
    smartToolsModule
  );

})();
