"use strict";

/* =========================================================
   PAINTLESS
   WORKSPACE LAYOUT CONTROLLER — DRAWER UI

   Handles:
   - Right sidebar width resizing
   - Remembered sidebar width
   - Collapsible sidebar drawers
   - Sensible panel ordering
   - Dynamic Paraluxious / Ultra Anaglyph panels
   - Toolbar duplicate cleanup
========================================================= */

(() => {

  function initialisePaintlessWorkspaceLayout() {

    const root =
      document.documentElement;

    const sidebar =
      document.querySelector(
        ".right-sidebar"
      );

    const sidebarHandle =
      document.getElementById(
        "sidebar-resize-handle"
      );

    const toolbox =
      document.querySelector(
        ".toolbox"
      );


    if (
      !sidebar ||
      !toolbox
    ) {
      return;
    }


    /* =====================================================
       1. RIGHT SIDEBAR WIDTH
    ===================================================== */

    const sidebarKey =
      "paintless:right-sidebar-width";

    const clampWidth =
      (value) =>
        Math.min(
          620,
          Math.max(
            260,
            Number(value) || 300
          )
        );

    const applySidebarWidth =
      (value) => {

        const width =
          clampWidth(
            value
          );

        root.style.setProperty(
          "--sidebar-width",
          `${width}px`
        );

        sidebarHandle?.setAttribute(
          "aria-valuenow",
          String(
            Math.round(width)
          )
        );

        return width;

      };


    applySidebarWidth(
      localStorage.getItem(
        sidebarKey
      ) || 300
    );


    if (sidebarHandle) {

      let draggingSidebar =
        false;

      const finishSidebarDrag =
        () => {

          if (!draggingSidebar) {
            return;
          }

          draggingSidebar =
            false;

          sidebarHandle.classList.remove(
            "is-dragging"
          );

          document.body.style.cursor =
            "";

          document.body.style.userSelect =
            "";

          const width =
            parseFloat(
              getComputedStyle(root)
                .getPropertyValue(
                  "--sidebar-width"
                )
            ) || 300;

          localStorage.setItem(
            sidebarKey,
            String(
              Math.round(width)
            )
          );

        };


      sidebarHandle.addEventListener(
        "pointerdown",
        (event) => {

          draggingSidebar =
            true;

          sidebarHandle.classList.add(
            "is-dragging"
          );

          sidebarHandle.setPointerCapture?.(
            event.pointerId
          );

          document.body.style.cursor =
            "col-resize";

          document.body.style.userSelect =
            "none";

          event.preventDefault();

        }
      );


      window.addEventListener(
        "pointermove",
        (event) => {

          if (!draggingSidebar) {
            return;
          }

          applySidebarWidth(
            window.innerWidth -
              event.clientX
          );

        }
      );


      window.addEventListener(
        "pointerup",
        finishSidebarDrag
      );

      window.addEventListener(
        "pointercancel",
        finishSidebarDrag
      );


      sidebarHandle.addEventListener(
        "keydown",
        (event) => {

          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "Home",
              "End"
            ].includes(
              event.key
            )
          ) {
            return;
          }

          const current =
            parseFloat(
              getComputedStyle(root)
                .getPropertyValue(
                  "--sidebar-width"
                )
            ) || 300;

          const next =
            event.key === "Home"
              ? 260
              : event.key === "End"
                ? 620
                : current +
                  (
                    event.key === "ArrowLeft"
                      ? 16
                      : -16
                  );

          const applied =
            applySidebarWidth(
              next
            );

          localStorage.setItem(
            sidebarKey,
            String(
              Math.round(applied)
            )
          );

          event.preventDefault();

        }
      );

    }


    /* =====================================================
       2. DRAWER HELPERS
    ===================================================== */

    const drawerStateKey =
      "paintless:right-drawer-state-v1";

    let drawerState =
      {};

    try {

      drawerState =
        JSON.parse(
          localStorage.getItem(
            drawerStateKey
          ) || "{}"
        ) || {};

    } catch (_) {

      drawerState =
        {};

    }


    const saveDrawerState =
      () => {

        localStorage.setItem(
          drawerStateKey,
          JSON.stringify(
            drawerState
          )
        );

      };


    const cleanText =
      (value) =>
        String(
          value || ""
        )
          .replace(
            /\s+/g,
            " "
          )
          .trim();


    const identifyPanel =
      (panel) => {

        const signature =
          cleanText(
            [
              panel.id,
              panel.className,
              panel.getAttribute(
                "aria-label"
              ),
              panel.textContent?.slice(
                0,
                220
              )
            ].join(" ")
          )
            .toLowerCase();


        if (
          signature.includes(
            "paralux"
          )
        ) {
          return "paraluxious";
        }


        if (
          signature.includes(
            "ultra"
          ) ||
          signature.includes(
            "anaglyph"
          ) ||
          signature.includes(
            "paintless3d-preview"
          )
        ) {
          return "ultra";
        }


        if (
          panel.classList.contains(
            "colour-panel"
          ) ||
          signature.includes(
            "colour"
          )
        ) {
          return "colour";
        }


        if (
          panel.classList.contains(
            "adjustments-panel"
          ) ||
          signature.includes(
            "adjustment"
          )
        ) {
          return "adjustments";
        }


        if (
          panel.classList.contains(
            "layers-panel"
          ) ||
          signature.includes(
            "layers"
          )
        ) {
          return "layers";
        }


        return null;

      };


    const panelLabel =
      (kind) => {

        switch (kind) {

          case "paraluxious":
            return "✦ Paraluxious";

          case "ultra":
            return "✦ Ultra Anaglyph Lab";

          case "colour":
            return "Colour";

          case "adjustments":
            return "Adjustments";

          case "layers":
            return "Layers";

          default:
            return "Panel";

        }

      };


    const panelOrder =
      {
        paraluxious:
          10,

        ultra:
          20,

        colour:
          30,

        adjustments:
          40,

        layers:
          50
      };


    const defaultOpen =
      (kind) =>
        kind === "paraluxious" ||
        kind === "layers";


    const directPanelFrom =
      (node) => {

        let current =
          node;

        while (
          current &&
          current.parentElement !==
            sidebar
        ) {

          current =
            current.parentElement;

        }


        return (
          current?.parentElement ===
            sidebar
            ? current
            : null
        );

      };


    const collectPanels =
      () => {

        const panels =
          new Set();


        Array.from(
          sidebar.children
        ).forEach(
          (child) => {

            if (
              child instanceof HTMLElement &&
              identifyPanel(child)
            ) {
              panels.add(child);
            }

          }
        );


        sidebar
          .querySelectorAll(
            [
              ".editor-panel",
              "#paintless3d-preview-panel",
              ".paintless3d-preview-panel",
              '[id*="paralux" i]',
              '[class*="paralux" i]',
              '[id*="anaglyph" i]',
              '[class*="anaglyph" i]'
            ].join(",")
          )
          .forEach(
            (node) => {

              const direct =
                directPanelFrom(
                  node
                );

              if (
                direct &&
                identifyPanel(direct)
              ) {
                panels.add(direct);
              }

            }
          );


        return Array.from(
          panels
        );

      };


    const setDrawerOpen =
      (
        panel,
        kind,
        open,
        {
          remember = true
        } = {}
      ) => {

        panel.classList.toggle(
          "is-collapsed",
          !open
        );

        const toggle =
          panel.querySelector(
            ":scope > .paintless-drawer-toggle"
          );

        toggle?.setAttribute(
          "aria-expanded",
          String(open)
        );

        const chevron =
          toggle?.querySelector(
            ".paintless-drawer-toggle__chevron"
          );

        if (chevron) {
          chevron.textContent =
            open
              ? "⌄"
              : "›";
        }


        if (remember) {

          drawerState[kind] =
            open;

          saveDrawerState();

        }

      };


    const ensureDrawer =
      (panel) => {

        const kind =
          identifyPanel(
            panel
          );

        if (!kind) {
          return false;
        }


        if (
          panel.dataset.paintlessDrawer ===
            "true"
        ) {
          return true;
        }


        panel.dataset.paintlessDrawer =
          "true";

        panel.dataset.drawerKind =
          kind;

        panel.classList.add(
          "paintless-drawer"
        );


        panel.classList.remove(
          "layers-panel--shared-space",
          "paintless-ultra-resizable-panel"
        );

        panel.style.removeProperty(
          "height"
        );

        panel.style.removeProperty(
          "--paintless-ultra-panel-height"
        );


        panel
          .querySelectorAll(
            ":scope > .panel-resize-handle, :scope > .layers-ultra-resize-handle"
          )
          .forEach(
            (handle) =>
              handle.remove()
          );


        const toggle =
          document.createElement(
            "button"
          );

        toggle.type =
          "button";

        toggle.className =
          "paintless-drawer-toggle";

        toggle.innerHTML =
          `<span>${panelLabel(kind)}</span>` +
          `<span aria-hidden="true" class="paintless-drawer-toggle__chevron">›</span>`;


        toggle.addEventListener(
          "click",
          () => {

            setDrawerOpen(
              panel,
              kind,
              panel.classList.contains(
                "is-collapsed"
              )
            );

          }
        );


        panel.insertBefore(
          toggle,
          panel.firstChild
        );


        const savedOpen =
          Object.prototype.hasOwnProperty.call(
            drawerState,
            kind
          )
            ? Boolean(
                drawerState[kind]
              )
            : defaultOpen(
                kind
              );


        setDrawerOpen(
          panel,
          kind,
          savedOpen,
          {
            remember:
              false
          }
        );


        return true;

      };


    let arranging =
      false;

    const setupSidebarDrawers =
      () => {

        if (arranging) {
          return;
        }

        arranging =
          true;


        try {

          sidebar
            .querySelectorAll(
              ".panel-resize-handle, .layers-ultra-resize-handle"
            )
            .forEach(
              (handle) =>
                handle.remove()
            );


          const panels =
            collectPanels();


          panels.forEach(
            ensureDrawer
          );


          panels
            .sort(
              (first, second) => {

                const firstKind =
                  identifyPanel(
                    first
                  );

                const secondKind =
                  identifyPanel(
                    second
                  );

                return (
                  panelOrder[firstKind] || 999
                ) -
                (
                  panelOrder[secondKind] || 999
                );

              }
            )
            .forEach(
              (panel) => {

                if (
                  panel.parentElement ===
                    sidebar
                ) {
                  sidebar.appendChild(
                    panel
                  );
                }

              }
            );

        } finally {

          arranging =
            false;

        }

      };


    setupSidebarDrawers();


    new MutationObserver(
      () =>
        requestAnimationFrame(
          setupSidebarDrawers
        )
    ).observe(
      sidebar,
      {
        childList:
          true,

        subtree:
          true
      }
    );


    document.addEventListener(
      "paintless3d:module-ready",
      () => {

        requestAnimationFrame(
          setupSidebarDrawers
        );

        window.setTimeout(
          setupSidebarDrawers,
          100
        );

      }
    );


    /* =====================================================
       3. TOOLBAR TIDY
    ===================================================== */

    const groupForTool =
      {
        move:
          "navigate",

        select:
          "navigate",

        crop:
          "navigate",

        transform:
          "navigate",

        brush:
          "paint",

        eraser:
          "paint",

        fill:
          "paint",

        gradient:
          "paint",

        clone:
          "retouch",

        eyedropper:
          "retouch",

        blur:
          "retouch",

        sharpen:
          "retouch",

        smudge:
          "retouch",

        liquify:
          "retouch",

        text:
          "create",

        shape:
          "create"
      };


    let tidying =
      false;

    const tidyToolbar =
      () => {

        if (tidying) {
          return;
        }

        tidying =
          true;


        try {

          const seen =
            new Map();


          Array.from(
            toolbox.querySelectorAll(
              ".tool-button[data-tool]"
            )
          ).forEach(
            (button) => {

              const tool =
                button.dataset.tool;

              if (!tool) {
                return;
              }


              if (
                seen.has(tool)
              ) {

                const family =
                  button.closest(
                    ".tool-family"
                  );

                if (family) {
                  family.remove();
                } else {
                  button.remove();
                }

                return;

              }


              seen.set(
                tool,
                button
              );


              const group =
                toolbox.querySelector(
                  `[data-tool-group="${groupForTool[tool] || "create"}"] .toolbox-grid`
                );

              const item =
                button.closest(
                  ".tool-family"
                ) || button;


              if (
                group &&
                item.parentElement !==
                  group
              ) {
                group.appendChild(
                  item
                );
              }

            }
          );


          Array.from(
            toolbox.querySelectorAll(
              ".support-tool-button"
            )
          )
            .slice(1)
            .forEach(
              (item) =>
                item.remove()
            );

        } finally {

          tidying =
            false;

        }

      };


    tidyToolbar();


    new MutationObserver(
      () =>
        requestAnimationFrame(
          tidyToolbar
        )
    ).observe(
      toolbox,
      {
        childList:
          true,

        subtree:
          true
      }
    );

  }


  if (
    document.readyState ===
      "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialisePaintlessWorkspaceLayout,
      {
        once:
          true
      }
    );

  } else {

    initialisePaintlessWorkspaceLayout();

  }

})();
