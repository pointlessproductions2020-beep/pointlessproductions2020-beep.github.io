"use strict";

/* =========================================================
   PAINTLESS — PARALUXIOUS v0.3
   Independent parallax power-up for Paintless + Paintless3D.

   v0.3 fixes:
   - Device shell is derived from the rendered canvas bounds
   - Canvas + shell zoom/resize/tilt as one physical unit
   - Screen clips artwork correctly during strong tilt

   v0.2 adds:
   - ParaL-Easy style hand/tilt preview + spring return
   - Physical "device" frame around any canvas size
   - TOP / BOTTOM orientation markers
   - Mobile layout that stays mobile in portrait AND landscape
   - Slide-out tools / layers panels with reliable close buttons
   - Mobile tool options surfaced when the Tools drawer is open
   - Two-finger view rotation OUTSIDE the canvas (visual only)
   - Mobile logo navigation disabled to avoid accidental exits
========================================================= */
(() => {
  const STORAGE_KEY = "paintless:paraluxious-v2";

  const state = {
    enabled: false,
    strengthX: 34,
    strengthY: 24,
    overscan: 1.08,
    previewX: 0,
    previewY: 0,
    motionX: 0,
    motionY: 0,
    useDeviceTilt: true,
    handMode: false,
    springBack: true,
    viewRotation: 0
  };

  try {
    Object.assign(
      state,
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    );
  } catch (_) {}

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, Number(value) || 0));

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  };

  const layers = () =>
    window.PaintlessLayers?.getLayers?.() || [];

  const activeLayer = () =>
    window.PaintlessLayers?.getActiveLayer?.() || null;

  let ui = {};
  let deviceShell = null;
  let deviceScreen = null;
  let orientationOverlay = null;
  let deviceObserver = null;
  let springFrame = 0;
  let motionFrame = 0;

  /* =======================================================
     LAYER STATE
  ======================================================= */

  function ensureLayer(layer) {
    if (!layer) return null;

    if (!Number.isFinite(Number(layer.paraluxiousDepth))) {
      const list = layers();
      const index = Math.max(0, list.indexOf(layer));

      layer.paraluxiousDepth =
        list.length <= 1
          ? 0
          : (index / (list.length - 1)) * 2 - 1;
    }

    return layer;
  }

  function getCombinedInput() {
    return {
      x: clamp(state.previewX + state.motionX, -1, 1),
      y: clamp(state.previewY + state.motionY, -1, 1)
    };
  }

  function getLayerTransform(layer) {
    if (!state.enabled) {
      return { x: 0, y: 0, scale: 1 };
    }

    ensureLayer(layer);

    const depth = clamp(layer.paraluxiousDepth, -2, 2);
    const input = getCombinedInput();

    return {
      x: input.x * state.strengthX * depth,
      y: input.y * state.strengthY * depth,
      scale: Math.max(1, Number(state.overscan) || 1)
    };
  }

  /* =======================================================
     RENDER + PHYSICAL DEVICE PREVIEW
  ======================================================= */

  function render(reason = "paraluxious") {
    window.PaintlessLayers?.renderLayers?.();

    if (window.Paintless3D?.getMode?.() === "3d") {
      window.Paintless3DRenderer?.requestRender?.(reason);
    }

    updatePhysicalDevice();
    updateUi();
  }

  function syncDeviceToCanvas() {
    const stage = document.getElementById("canvas-stage");

    if (!deviceShell || !deviceScreen || !stage) return;

    const zoom = Math.max(0.01, Number(window.PaintlessCanvas?.getZoom?.()) || 1);
    const sourceWidth = Math.max(1, stage.offsetWidth || 1);
    const sourceHeight = Math.max(1, stage.offsetHeight || 1);
    const screenWidth = sourceWidth * zoom;
    const screenHeight = sourceHeight * zoom;

    /*
     * The fake device is NOT an independent object. Its geometry is derived
     * directly from the currently rendered Paintless canvas. This means
     * zoom, Fit Screen and document-size changes resize the shell with it.
     */
    const bezel = state.enabled
      ? clamp(Math.min(screenWidth, screenHeight) * 0.024, 7, 18)
      : 0;

    deviceShell.style.setProperty("--paraluxious-bezel", `${bezel}px`);
    deviceShell.style.width = `${screenWidth + bezel * 2}px`;
    deviceShell.style.height = `${screenHeight + bezel * 2}px`;

    deviceScreen.style.left = `${bezel}px`;
    deviceScreen.style.top = `${bezel}px`;
    deviceScreen.style.width = `${screenWidth}px`;
    deviceScreen.style.height = `${screenHeight}px`;

    /*
     * canvas.js owns the stage's scale() transform. Keeping the unscaled
     * stage inside a screen whose layout dimensions equal the scaled result
     * makes the physical shell and artwork behave as one object.
     */
    stage.style.position = "absolute";
    stage.style.left = "0";
    stage.style.top = "0";
    stage.style.margin = "0";

    deviceShell.classList.toggle("paraluxious-enabled", state.enabled);
  }

  function updatePhysicalDevice() {
    if (!deviceShell) return;

    syncDeviceToCanvas();

    const input = getCombinedInput();

    const maxRotateX = 11;
    const maxRotateY = 13;

    const rotateX = state.enabled ? -input.y * maxRotateX : 0;
    const rotateY = state.enabled ? input.x * maxRotateY : 0;

    deviceShell.style.setProperty(
      "--paraluxious-rotate-x",
      `${rotateX.toFixed(2)}deg`
    );

    deviceShell.style.setProperty(
      "--paraluxious-rotate-y",
      `${rotateY.toFixed(2)}deg`
    );

    deviceShell.style.setProperty(
      "--paraluxious-light-x",
      `${(50 - input.x * 26).toFixed(1)}%`
    );

    deviceShell.style.setProperty(
      "--paraluxious-light-y",
      `${(36 - input.y * 20).toFixed(1)}%`
    );

    deviceShell.style.setProperty(
      "--paraluxious-shadow-x",
      `${(-input.x * 22).toFixed(1)}px`
    );

    deviceShell.style.setProperty(
      "--paraluxious-shadow-y",
      `${(18 + input.y * 18).toFixed(1)}px`
    );

    deviceShell.classList.toggle(
      "is-hand-active",
      Boolean(state.enabled && state.handMode)
    );
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);

    document.body.classList.toggle(
      "paraluxious-active",
      state.enabled
    );

    if (!state.enabled) {
      state.handMode = false;
      state.previewX = 0;
      state.previewY = 0;
      state.motionX = 0;
      state.motionY = 0;
    }

    save();
    render("paraluxious-toggle");

    if (state.enabled && state.useDeviceTilt) {
      requestMotionPermission();
    }
  }

  /* =======================================================
     PREVIEW INPUT + SPRING
  ======================================================= */

  function setPreview(x, y, reason = "preview") {
    state.previewX = clamp(x, -1, 1);
    state.previewY = clamp(y, -1, 1);
    render(reason);
  }

  function cancelSpring() {
    if (!springFrame) return;
    cancelAnimationFrame(springFrame);
    springFrame = 0;
  }

  function springToCentre() {
    cancelSpring();

    if (!state.springBack) return;

    const startX = state.previewX;
    const startY = state.previewY;
    const start = performance.now();
    const duration = 330;

    const easeOutBack = (t) => {
      const c1 = 1.18;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = easeOutBack(t);

      state.previewX = startX * (1 - eased);
      state.previewY = startY * (1 - eased);

      render("spring-centre");

      if (t < 1) {
        springFrame = requestAnimationFrame(tick);
      } else {
        springFrame = 0;
        state.previewX = 0;
        state.previewY = 0;
        render("spring-centred");
      }
    };

    springFrame = requestAnimationFrame(tick);
  }

  function centrePreview() {
    cancelSpring();
    state.previewX = 0;
    state.previewY = 0;
    render("centre-preview");
  }

  /* =======================================================
     DEVICE ORIENTATION
  ======================================================= */

  async function requestMotionPermission() {
    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") return false;
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  window.addEventListener(
    "deviceorientation",
    (event) => {
      if (!state.enabled || !state.useDeviceTilt || state.handMode) {
        return;
      }

      const gamma = clamp(event.gamma || 0, -28, 28) / 28;
      const betaRaw = Number(event.beta || 0);
      const beta = clamp(betaRaw, -28, 28) / 28;

      state.motionX = gamma;
      state.motionY = beta;

      if (!motionFrame) {
        motionFrame = requestAnimationFrame(() => {
          motionFrame = 0;
          render("device-tilt");
        });
      }
    },
    { passive: true }
  );

  /* =======================================================
     CANVAS VIEW ROTATION — VIEW ONLY, NEVER PIXELS
  ======================================================= */

  function normaliseRotation(value) {
    let rotation = Number(value) || 0;
    rotation %= 360;
    if (rotation < 0) rotation += 360;
    return rotation;
  }

  function setViewRotation(value, persist = true) {
    state.viewRotation = normaliseRotation(value);

    const stage = document.getElementById("canvas-stage");

    if (stage) {
      stage.style.setProperty(
        "--paintless-view-rotation",
        `${state.viewRotation}deg`
      );
    }

    if (orientationOverlay) {
      orientationOverlay.style.setProperty(
        "--paintless-view-rotation",
        `${state.viewRotation}deg`
      );
    }

    if (persist) save();

    document.dispatchEvent(
      new CustomEvent("paintless:view-rotation-changed", {
        detail: { rotation: state.viewRotation }
      })
    );
  }

  function rotateView(delta) {
    setViewRotation(state.viewRotation + delta);
  }

  function installOutsideCanvasRotationGesture() {
    const viewport = document.getElementById("canvas-viewport");
    const canvas = document.getElementById("editor-canvas");

    if (!viewport || !canvas) return;

    const points = new Map();
    let gesture = null;

    const isOutsideCanvas = (event) => {
      const rect = canvas.getBoundingClientRect();

      return !(
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };

    const getPair = () => Array.from(points.values()).slice(0, 2);

    const angleBetween = (a, b) =>
      Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

    viewport.addEventListener(
      "pointerdown",
      (event) => {
        if (!document.body.classList.contains("paintless-mobile-mode")) {
          return;
        }

        if (event.pointerType !== "touch") return;
        if (!isOutsideCanvas(event)) return;

        points.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY
        });

        viewport.setPointerCapture?.(event.pointerId);

        if (points.size === 2) {
          const [a, b] = getPair();

          gesture = {
            startAngle: angleBetween(a, b),
            startRotation: state.viewRotation
          };
        }
      },
      { passive: false }
    );

    viewport.addEventListener(
      "pointermove",
      (event) => {
        if (!points.has(event.pointerId)) return;

        points.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY
        });

        if (!gesture || points.size < 2) return;

        event.preventDefault();

        const [a, b] = getPair();
        const angle = angleBetween(a, b);
        const delta = angle - gesture.startAngle;

        setViewRotation(
          gesture.startRotation + delta,
          false
        );
      },
      { passive: false }
    );

    const finishPointer = (event) => {
      if (!points.has(event.pointerId)) return;

      points.delete(event.pointerId);

      viewport.releasePointerCapture?.(event.pointerId);

      if (gesture) {
        const snapped = Math.round(state.viewRotation / 90) * 90;
        setViewRotation(snapped, true);
        gesture = null;
      }
    };

    viewport.addEventListener("pointerup", finishPointer);
    viewport.addEventListener("pointercancel", finishPointer);
  }

  /* =======================================================
     PHYSICAL DEVICE SHELL + HAND DRAG
  ======================================================= */

  function ensureDeviceShell() {
    const stage = document.getElementById("canvas-stage");

    if (!stage || deviceShell) return;

    deviceShell = document.createElement("div");
    deviceShell.className = "paraluxious-device-shell";
    deviceShell.setAttribute("aria-label", "Paraluxious canvas preview");

    deviceScreen = document.createElement("div");
    deviceScreen.className = "paraluxious-device-screen";

    orientationOverlay = document.createElement("div");
    orientationOverlay.className = "paraluxious-orientation-overlay";
    orientationOverlay.setAttribute("aria-hidden", "true");
    orientationOverlay.innerHTML = `
      <span class="paraluxious-orientation-top">▲ TOP</span>
      <span class="paraluxious-orientation-bottom">BOTTOM ▼</span>
    `;

    const glass = document.createElement("div");
    glass.className = "paraluxious-device-glass";
    glass.setAttribute("aria-hidden", "true");

    stage.parentNode.insertBefore(deviceShell, stage);
    deviceShell.append(deviceScreen);
    deviceScreen.append(stage, orientationOverlay, glass);

    const syncVisibility = () => {
      deviceShell.classList.toggle(
        "has-canvas",
        stage.classList.contains("is-visible")
      );
      requestAnimationFrame(syncDeviceToCanvas);
    };

    syncVisibility();

    deviceObserver = new MutationObserver(syncVisibility);
    deviceObserver.observe(stage, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(syncDeviceToCanvas);
      });
      resizeObserver.observe(stage);
    }

    document.addEventListener("paintless:zoom-changed", () => {
      requestAnimationFrame(syncDeviceToCanvas);
    });

    window.addEventListener("resize", () => {
      requestAnimationFrame(syncDeviceToCanvas);
    }, { passive: true });

    let pointerId = null;

    const updateFromPointer = (event) => {
      const rect = deviceShell.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const x = clamp(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -1,
        1
      );

      const y = clamp(
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
        -1,
        1
      );

      setPreview(x, y, "hand-drag");
    };

    deviceShell.addEventListener("pointerdown", (event) => {
      if (!state.enabled || !state.handMode) return;

      event.preventDefault();
      cancelSpring();

      pointerId = event.pointerId;
      deviceShell.setPointerCapture?.(event.pointerId);
      updateFromPointer(event);
    });

    deviceShell.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event);
    });

    const endDrag = (event) => {
      if (pointerId !== event.pointerId) return;

      deviceShell.releasePointerCapture?.(event.pointerId);
      pointerId = null;
      springToCentre();
    };

    deviceShell.addEventListener("pointerup", endDrag);
    deviceShell.addEventListener("pointercancel", endDrag);

    setViewRotation(state.viewRotation, false);
    syncDeviceToCanvas();
    updatePhysicalDevice();
  }

  /* =======================================================
     UI HELPERS
  ======================================================= */

  function makeRange(label, min, max, step, value, onInput) {
    const wrap = document.createElement("label");
    wrap.className = "paraluxious-control";

    const head = document.createElement("span");
    head.innerHTML = `<strong>${label}</strong><output>${value}</output>`;

    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;

    input.addEventListener("input", () => {
      head.querySelector("output").textContent = input.value;
      onInput(Number(input.value));
    });

    wrap.append(head, input);

    return wrap;
  }

  function makeToggle(label, checked, onChange) {
    const row = document.createElement("label");
    row.className = "paraluxious-check";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);

    const text = document.createElement("span");
    text.textContent = label;

    input.addEventListener("change", () => onChange(input.checked));

    row.append(input, text);

    return { row, input };
  }

  function installTiltPad(body) {
    const section = document.createElement("div");
    section.className = "paraluxious-tilt-block";

    section.innerHTML = `
      <div class="paraluxious-tilt-heading">
        <strong>Preview tilt</strong>
        <span>drag the puck</span>
      </div>
      <div class="paraluxious-tilt-row">
        <div class="paraluxious-tilt-pad" data-paraluxious-tilt-pad>
          <span class="paraluxious-axis paraluxious-axis-x"></span>
          <span class="paraluxious-axis paraluxious-axis-y"></span>
          <button class="paraluxious-tilt-puck" type="button" aria-label="Paraluxious tilt control">✋</button>
        </div>
        <div class="paraluxious-tilt-buttons">
          <button type="button" data-parallax-centre>Centre</button>
          <button type="button" data-parallax-hand>✋ Hand</button>
        </div>
      </div>
    `;

    const pad = section.querySelector("[data-paraluxious-tilt-pad]");
    const puck = section.querySelector(".paraluxious-tilt-puck");
    const handButton = section.querySelector("[data-parallax-hand]");

    let pointerId = null;

    const updateFromPointer = (event) => {
      const rect = pad.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = clamp(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -1,
        1
      );

      const y = clamp(
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
        -1,
        1
      );

      setPreview(x, y, "tilt-pad");
    };

    pad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      cancelSpring();
      pointerId = event.pointerId;
      pad.setPointerCapture?.(event.pointerId);
      updateFromPointer(event);
    });

    pad.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event);
    });

    const end = (event) => {
      if (pointerId !== event.pointerId) return;
      pad.releasePointerCapture?.(event.pointerId);
      pointerId = null;
      springToCentre();
    };

    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);

    section.querySelector("[data-parallax-centre]").onclick = centrePreview;

    handButton.onclick = () => {
      state.handMode = !state.handMode;
      save();
      updateUi();
      updatePhysicalDevice();
    };

    body.append(section);

    ui.tiltPad = pad;
    ui.tiltPuck = puck;
    ui.handButton = handButton;
  }

  /* =======================================================
     PARALUXIOUS PANEL
  ======================================================= */

  function installUi() {
    const top =
      document.querySelector(".top-actions") ||
      document.querySelector(".top-bar");

    const button = document.createElement("button");
    button.id = "paraluxious-toggle";
    button.className = "top-action-button paraluxious-toggle";
    button.type = "button";
    button.title = "Paraluxious — layered parallax power-up";
    button.innerHTML = `<span aria-hidden="true">✦</span><b>PARA</b>`;
    button.addEventListener("click", () => setEnabled(!state.enabled));

    const modeSwitch = top?.querySelector(".paintless3d-mode-switch");

    if (modeSwitch?.parentNode === top) {
      modeSwitch.insertAdjacentElement("afterend", button);
    } else {
      top?.prepend(button);
    }

    const panel = document.createElement("section");
    panel.className = "editor-panel paraluxious-panel";
    panel.id = "paraluxious-panel";

    panel.innerHTML = `
      <header class="panel-header">
        <h2>✦ Paraluxious</h2>
        <span class="paraluxious-state">OFF</span>
      </header>
      <div class="paraluxious-body"></div>
    `;

    const body = panel.querySelector(".paraluxious-body");

    const depthControl = makeRange(
      "Layer depth · Extreme",
      -200,
      200,
      5,
      0,
      (value) => {
        const layer = ensureLayer(activeLayer());

        if (layer) {
          layer.paraluxiousDepth = value / 100;
          render("layer-depth");
        }
      }
    );

    const horizontalControl = makeRange(
      "Horizontal",
      0,
      100,
      1,
      state.strengthX,
      (value) => {
        state.strengthX = value;
        save();
        render();
      }
    );

    const verticalControl = makeRange(
      "Vertical",
      0,
      100,
      1,
      state.strengthY,
      (value) => {
        state.strengthY = value;
        save();
        render();
      }
    );

    const overscanControl = makeRange(
      "Overscan",
      1,
      1.5,
      0.01,
      state.overscan,
      (value) => {
        state.overscan = value;
        save();
        render();
      }
    );

    body.append(
      depthControl,
      horizontalControl,
      verticalControl,
      overscanControl
    );

    installTiltPad(body);

    const toggles = document.createElement("div");
    toggles.className = "paraluxious-toggle-grid";

    const spring = makeToggle(
      "Spring to centre",
      state.springBack,
      (checked) => {
        state.springBack = checked;
        save();
      }
    );

    const deviceTilt = makeToggle(
      "Phone tilt",
      state.useDeviceTilt,
      (checked) => {
        state.useDeviceTilt = checked;
        if (!checked) {
          state.motionX = 0;
          state.motionY = 0;
          render("phone-tilt-off");
        } else {
          requestMotionPermission();
        }
        save();
      }
    );

    toggles.append(spring.row, deviceTilt.row);
    body.append(toggles);

    const actions = document.createElement("div");
    actions.className = "paraluxious-actions";
    actions.innerHTML = `
      <button type="button" data-parallax-auto>Auto depth</button>
      <button type="button" data-view-left>↺ View</button>
      <button type="button" data-view-right>View ↻</button>
    `;

    actions.querySelector("[data-parallax-auto]").onclick = () => {
      const list = layers();

      list.forEach((layer, index) => {
        layer.paraluxiousDepth =
          list.length <= 1
            ? 0
            : (index / (list.length - 1)) * 2 - 1;
      });

      render("auto-depth");
    };

    actions.querySelector("[data-view-left]").onclick = () => rotateView(-90);
    actions.querySelector("[data-view-right]").onclick = () => rotateView(90);

    body.append(actions);

    document.querySelector(".right-sidebar")?.prepend(panel);

    const handFab = document.createElement("button");
    handFab.className = "paraluxious-hand-fab";
    handFab.type = "button";
    handFab.title = "Hand preview — drag the canvas like a physical device";
    handFab.setAttribute("aria-label", "Toggle Paraluxious hand preview");
    handFab.innerHTML = `<span>✋</span><small>TILT</small>`;

    handFab.onclick = () => {
      state.handMode = !state.handMode;
      save();
      updateUi();
      updatePhysicalDevice();
    };

    document.body.append(handFab);

    ui = {
      ...ui,
      button,
      panel,
      depth: depthControl.querySelector('input[type="range"]'),
      handFab,
      springToggle: spring.input,
      deviceTiltToggle: deviceTilt.input
    };

    document.addEventListener("paintless:active-layer-changed", updateUi);
    document.addEventListener("paintless:layer-selected", updateUi);

    updateUi();
  }

  function updateUi() {
    if (!ui.button) return;

    ui.button.classList.toggle("is-active", state.enabled);
    ui.button.setAttribute("aria-pressed", String(state.enabled));

    const badge = ui.panel?.querySelector(".paraluxious-state");

    if (badge) {
      badge.textContent = state.enabled ? "ON" : "OFF";
    }

    const layer = ensureLayer(activeLayer());

    if (ui.depth && layer) {
      ui.depth.value = String(Math.round(Number(layer.paraluxiousDepth) * 100));
    }

    const output =
      ui.depth?.previousElementSibling?.querySelector("output");

    if (output && layer) {
      output.textContent = String(Math.round(Number(layer.paraluxiousDepth) * 100));
    }

    const input = getCombinedInput();

    if (ui.tiltPuck) {
      ui.tiltPuck.style.left = `${50 + input.x * 43}%`;
      ui.tiltPuck.style.top = `${50 + input.y * 38}%`;
    }

    ui.handButton?.classList.toggle("is-active", state.handMode);
    ui.handFab?.classList.toggle("is-active", state.handMode);

    if (ui.handFab) {
      ui.handFab.setAttribute("aria-pressed", String(state.handMode));
    }

    document.body.classList.toggle(
      "paraluxious-hand-mode",
      Boolean(state.enabled && state.handMode)
    );
  }

  /* =======================================================
     MOBILE SHELL
  ======================================================= */

  function isTouchMobile() {
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    const touch = navigator.maxTouchPoints > 0;
    const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);

    return Boolean((coarse || touch) && shortSide <= 1000);
  }

  function applyMobileMode() {
    document.body.classList.toggle(
      "paintless-mobile-mode",
      isTouchMobile()
    );
  }

  function installMobileShell() {
    const shell = document.createElement("div");
    shell.className = "paintless-mobile-dock";
    shell.innerHTML = `
      <button type="button" data-mobile-tools>☰ Tools</button>
      <button type="button" data-mobile-panels>Layers / FX ☷</button>
    `;

    document.body.append(shell);

    const shade = document.createElement("button");
    shade.className = "mobile-drawer-shade";
    shade.type = "button";
    shade.setAttribute("aria-label", "Close drawer");
    document.body.append(shade);

    const toolbox = document.querySelector(".toolbox");
    const rightSidebar = document.querySelector(".right-sidebar");

    const makeCloseButton = (panel, label) => {
      if (!panel) return;

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "mobile-drawer-close";
      closeButton.innerHTML = `<span>‹</span> ${label}`;
      panel.prepend(closeButton);
      closeButton.addEventListener("click", closeDrawers);
    };

    makeCloseButton(toolbox, "Canvas");
    makeCloseButton(rightSidebar, "Canvas");

    function closeDrawers() {
      document.body.classList.remove(
        "mobile-tools-open",
        "mobile-panels-open"
      );
    }

    function openDrawer(name) {
      closeDrawers();
      document.body.classList.add(name);
    }

    shell.querySelector("[data-mobile-tools]").onclick = () => {
      if (document.body.classList.contains("mobile-tools-open")) {
        closeDrawers();
      } else {
        openDrawer("mobile-tools-open");
      }
    };

    shell.querySelector("[data-mobile-panels]").onclick = () => {
      if (document.body.classList.contains("mobile-panels-open")) {
        closeDrawers();
      } else {
        openDrawer("mobile-panels-open");
      }
    };

    shade.onclick = closeDrawers;

    /*
     * On mobile, the logo is branding rather than a giant accidental
     * "leave Paintless" button. Desktop navigation remains unchanged.
     */
    const brand = document.querySelector(".paintless-brand");

    brand?.addEventListener(
      "click",
      (event) => {
        if (!document.body.classList.contains("paintless-mobile-mode")) {
          return;
        }

        event.preventDefault();
        closeDrawers();
      },
      true
    );

    applyMobileMode();

    window.addEventListener("resize", applyMobileMode, { passive: true });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        applyMobileMode();
        updatePhysicalDevice();
      }, 120);
    });
  }

  /* =======================================================
     STYLES
  ======================================================= */

  const style = document.createElement("style");
  style.id = "paraluxious-styles-v2";

  style.textContent = `
    /* ---------- Paraluxious button ---------- */
    .paraluxious-toggle {
      width: auto !important;
      min-width: 62px !important;
      padding: 0 8px !important;
      gap: 4px !important;
    }

    .paraluxious-toggle b {
      font-size: 9px;
      letter-spacing: .08em;
    }

    .paraluxious-toggle.is-active {
      box-shadow:
        0 0 18px rgba(168, 76, 255, .65),
        inset 0 0 0 1px #35e7ff;
      color: #fff;
      background:
        linear-gradient(
          135deg,
          rgba(168, 76, 255, .45),
          rgba(53, 231, 255, .2)
        );
    }

    /* ---------- Panel ---------- */
    .paraluxious-state {
      font-size: 10px;
      font-weight: 900;
      color: #888;
    }

    .paraluxious-active .paraluxious-state {
      color: #35e7ff;
      text-shadow: 0 0 12px rgba(53, 231, 255, .5);
    }

    .paraluxious-panel {
      border-left-color: rgba(53, 231, 255, .42) !important;
    }

    .paraluxious-body {
      padding: 12px;
      display: grid;
      gap: 12px;
      background:
        radial-gradient(circle at 100% 0%, rgba(53,231,255,.055), transparent 34%),
        radial-gradient(circle at 0% 100%, rgba(168,76,255,.07), transparent 42%);
    }

    .paraluxious-control {
      display: grid;
      gap: 5px;
    }

    .paraluxious-control > span {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 10px;
    }

    .paraluxious-control output {
      color: #35e7ff;
      font-variant-numeric: tabular-nums;
    }

    .paraluxious-control input {
      width: 100%;
    }

    .paraluxious-actions {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    .paraluxious-actions button,
    .paraluxious-tilt-buttons button,
    .paintless-mobile-dock button,
    .mobile-drawer-close {
      border: 1px solid rgba(168, 76, 255, .45);
      background: #17131e;
      color: #fff;
      border-radius: 9px;
      padding: 8px;
      font-size: 10px;
      font-weight: 800;
    }

    .paraluxious-toggle-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .paraluxious-check {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 9px;
      background: rgba(255,255,255,.025);
      font-size: 9px;
      font-weight: 800;
      color: #cfc8da;
    }

    .paraluxious-check input {
      accent-color: #35e7ff;
    }

    /* ---------- ParaL-Easy-style tilt pad ---------- */
    .paraluxious-tilt-block {
      padding-top: 4px;
      display: grid;
      gap: 7px;
    }

    .paraluxious-tilt-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }

    .paraluxious-tilt-heading strong {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #fff;
    }

    .paraluxious-tilt-heading span {
      font-size: 8px;
      color: #8a8397;
    }

    .paraluxious-tilt-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: stretch;
    }

    .paraluxious-tilt-pad {
      position: relative;
      height: 72px;
      border: 1px solid rgba(53,231,255,.13);
      border-radius: 13px;
      overflow: hidden;
      touch-action: none;
      background:
        radial-gradient(circle at 50% 50%, rgba(53,231,255,.04), transparent 38%),
        rgba(6,8,13,.76);
      box-shadow: inset 0 0 24px rgba(0,0,0,.35);
    }

    .paraluxious-axis {
      position: absolute;
      opacity: .38;
      background: rgba(53,231,255,.34);
      pointer-events: none;
    }

    .paraluxious-axis-x {
      left: 9px;
      right: 9px;
      top: 50%;
      height: 1px;
    }

    .paraluxious-axis-y {
      top: 9px;
      bottom: 9px;
      left: 50%;
      width: 1px;
    }

    .paraluxious-tilt-puck {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 28px;
      height: 28px;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      border: 2px solid rgba(255,255,255,.9);
      border-radius: 50%;
      background: linear-gradient(135deg, #35e7ff, #a84cff);
      color: white;
      font-size: 13px;
      box-shadow:
        0 0 16px rgba(53,231,255,.55),
        0 0 22px rgba(168,76,255,.34);
      pointer-events: none;
      transition: left 45ms linear, top 45ms linear;
    }

    .paraluxious-tilt-buttons {
      display: grid;
      gap: 6px;
      align-content: center;
    }

    .paraluxious-tilt-buttons button.is-active {
      border-color: #35e7ff;
      background: linear-gradient(135deg, rgba(53,231,255,.17), rgba(168,76,255,.24));
      box-shadow: 0 0 12px rgba(53,231,255,.22);
    }

    /* ---------- Physical device shell ---------- */
    .paraluxious-device-shell {
      --paraluxious-rotate-x: 0deg;
      --paraluxious-rotate-y: 0deg;
      --paraluxious-light-x: 50%;
      --paraluxious-light-y: 36%;
      --paraluxious-shadow-x: 0px;
      --paraluxious-shadow-y: 18px;

      position: relative;
      display: none;
      width: 1px;
      height: 1px;
      flex: 0 0 auto;
      transform-style: preserve-3d;
      transform:
        perspective(1100px)
        rotateX(var(--paraluxious-rotate-x))
        rotateY(var(--paraluxious-rotate-y));
      transform-origin: center center;
      transition:
        transform 90ms linear,
        filter 180ms ease;
      will-change: transform;
    }

    .paraluxious-device-shell.has-canvas {
      display: block;
    }

    .paraluxious-active .paraluxious-device-shell {
      padding: 0;
      border: 1px solid rgba(53,231,255,.19);
      border-radius: 24px;
      background:
        linear-gradient(145deg, #191f28, #090b10 56%, #151922);
      box-shadow:
        var(--paraluxious-shadow-x)
        var(--paraluxious-shadow-y)
        44px rgba(0,0,0,.72),
        0 0 0 2px rgba(255,255,255,.025),
        0 0 0 4px rgba(53,231,255,.03),
        -10px 0 34px rgba(53,231,255,.05),
        10px 0 34px rgba(168,76,255,.06);
    }

    .paraluxious-active .paraluxious-device-shell::before {
      content: "";
      position: absolute;
      inset: 3px;
      border-radius: 20px;
      pointer-events: none;
      z-index: 6;
      background:
        radial-gradient(
          circle at var(--paraluxious-light-x) var(--paraluxious-light-y),
          rgba(255,255,255,.18),
          rgba(255,255,255,.035) 20%,
          transparent 46%
        );
      mix-blend-mode: screen;
      opacity: .62;
    }

    .paraluxious-device-screen {
      position: absolute;
      overflow: hidden;
      border-radius: 0;
      transform-style: preserve-3d;
      background: transparent;
    }

    .paraluxious-active .paraluxious-device-screen {
      border-radius: 14px;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.08),
        0 0 18px rgba(0,0,0,.42);
    }

    .paraluxious-device-shell .canvas-stage {
      transform-origin: top left !important;
    }

    .paraluxious-active .paraluxious-device-shell .canvas-stage {
      border-radius: 0;
      overflow: hidden;
      box-shadow: none;
    }

    .paraluxious-device-glass {
      position: absolute;
      inset: 0;
      z-index: 5;
      border-radius: 14px;
      pointer-events: none;
      opacity: 0;
      background:
        linear-gradient(135deg, rgba(255,255,255,.10), transparent 28%, transparent 70%, rgba(53,231,255,.025));
    }

    .paraluxious-active .paraluxious-device-glass {
      opacity: .48;
    }

    .paraluxious-orientation-overlay {
      position: absolute;
      inset: 0;
      z-index: 8;
      pointer-events: none;
      transform: rotate(var(--paintless-view-rotation, 0deg));
      transform-origin: center center;
      transition: transform .18s ease;
    }

    .paraluxious-orientation-overlay span {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      padding: 3px 7px;
      border: 1px solid rgba(53,231,255,.25);
      border-radius: 999px;
      background: rgba(4,7,11,.64);
      color: rgba(255,255,255,.72);
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .12em;
      text-shadow: 0 1px 5px #000;
      opacity: 0;
    }

    .paintless-mobile-mode .paraluxious-orientation-overlay span {
      opacity: .92;
    }

    .paraluxious-orientation-top { top: 7px; }
    .paraluxious-orientation-bottom { bottom: 7px; }

    /* ---------- Floating hand preview ---------- */
    .paraluxious-hand-fab {
      position: fixed;
      z-index: 145;
      left: 50%;
      bottom: 44px;
      transform: translateX(-50%) translateY(10px);
      display: none;
      place-items: center;
      min-width: 54px;
      height: 38px;
      padding: 4px 10px;
      border: 1px solid rgba(53,231,255,.3);
      border-radius: 999px;
      background: rgba(8,10,15,.88);
      color: white;
      box-shadow: 0 8px 30px rgba(0,0,0,.5);
      backdrop-filter: blur(12px);
    }

    .paraluxious-hand-fab span { font-size: 15px; }
    .paraluxious-hand-fab small {
      margin-left: 4px;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .08em;
    }

    .paraluxious-active .paraluxious-hand-fab {
      display: inline-flex;
    }

    .paraluxious-hand-fab.is-active {
      border-color: #35e7ff;
      background: linear-gradient(135deg, rgba(53,231,255,.20), rgba(168,76,255,.32));
      box-shadow:
        0 0 0 1px rgba(255,255,255,.04),
        0 0 22px rgba(53,231,255,.30);
    }

    .paraluxious-device-shell.is-hand-active {
      cursor: grab;
      touch-action: none;
    }

    .paraluxious-device-shell.is-hand-active:active { cursor: grabbing; }

    .paraluxious-device-shell.is-hand-active .canvas-stage {
      pointer-events: none;
    }

    /* ---------- Mobile ---------- */
    .paintless-mobile-dock,
    .mobile-drawer-shade,
    .mobile-drawer-close {
      display: none;
    }

    .paintless-mobile-mode {
      overscroll-behavior: none;
    }

    .paintless-mobile-mode .paintless-app {
      grid-template-rows: 54px minmax(0, 1fr) 28px !important;
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
    }

    .paintless-mobile-mode .top-bar {
      position: relative !important;
      z-index: 500 !important;
      grid-template-columns: 48px minmax(0, 1fr) !important;
      gap: 4px !important;
      min-width: 0 !important;
      height: 54px !important;
      padding: 0 7px !important;
    }

    .paintless-mobile-mode .brand-area {
      width: 42px !important;
      overflow: hidden !important;
    }

    .paintless-mobile-mode .paintless-brand {
      width: 42px !important;
      pointer-events: auto;
    }

    .paintless-mobile-mode .paintless-brand img {
      width: 36px !important;
      height: 36px !important;
    }

    .paintless-mobile-mode .paintless-brand__text,
    .paintless-mobile-mode .main-menu {
      display: none !important;
    }

    .paintless-mobile-mode .top-actions {
      justify-content: flex-start !important;
      gap: 5px !important;
      min-width: 0 !important;
      width: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .paintless-mobile-mode .top-actions::-webkit-scrollbar {
      display: none;
    }

    .paintless-mobile-mode .top-actions > * {
      flex: 0 0 auto !important;
    }

    .paintless-mobile-mode .top-divider,
    .paintless-mobile-mode .zoom-display {
      display: none !important;
    }

    .paintless-mobile-mode .top-action-button {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
    }

    .paintless-mobile-mode .paraluxious-toggle {
      min-width: 38px !important;
      width: 38px !important;
      padding: 0 !important;
      order: -1;
    }

    .paintless-mobile-mode .paraluxious-toggle b {
      display: none;
    }

    .paintless-mobile-mode .tool-options-bar {
      display: none !important;
    }

    .paintless-mobile-mode.mobile-tools-open .tool-options-bar {
      position: fixed !important;
      z-index: 136 !important;
      left: 10px !important;
      right: 10px !important;
      bottom: 70px !important;
      top: auto !important;
      display: flex !important;
      gap: 12px !important;
      min-height: 52px !important;
      max-height: 116px !important;
      padding: 8px 10px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      border: 1px solid rgba(168,76,255,.36) !important;
      border-radius: 14px !important;
      background: rgba(12,9,18,.94) !important;
      box-shadow: 0 12px 34px rgba(0,0,0,.55) !important;
      backdrop-filter: blur(14px);
    }

    .paintless-mobile-mode .editor-layout {
      grid-template-columns: minmax(0, 1fr) !important;
      min-width: 0 !important;
      min-height: 0 !important;
    }

    .paintless-mobile-mode .workspace {
      grid-column: 1 !important;
      min-width: 0 !important;
      min-height: 0 !important;
    }

    .paintless-mobile-mode .workspace-ruler,
    .paintless-mobile-mode .sidebar-resize-handle {
      display: none !important;
    }

    .paintless-mobile-mode .canvas-viewport {
      inset: 0 !important;
      padding: 26px 18px 82px !important;
      overflow: auto !important;
      touch-action: none !important;
    }

    .paintless-mobile-mode .toolbox,
    .paintless-mobile-mode .right-sidebar {
      position: fixed !important;
      z-index: 120 !important;
      top: 54px !important;
      bottom: 28px !important;
      width: min(86vw, 360px) !important;
      max-width: none !important;
      min-width: 0 !important;
      display: block !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      transition: transform .22s cubic-bezier(.2,.75,.2,1) !important;
      background: #100d16 !important;
      box-shadow: 0 0 42px rgba(0,0,0,.64) !important;
    }

    .paintless-mobile-mode .toolbox {
      left: 0 !important;
      right: auto !important;
      transform: translateX(-105%) !important;
    }

    .paintless-mobile-mode .right-sidebar {
      right: 0 !important;
      left: auto !important;
      transform: translateX(105%) !important;
    }

    .paintless-mobile-mode.mobile-tools-open .toolbox {
      transform: translateX(0) !important;
    }

    .paintless-mobile-mode.mobile-panels-open .right-sidebar {
      transform: translateX(0) !important;
    }

    .paintless-mobile-mode .mobile-drawer-close {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 6px;
      width: calc(100% - 16px);
      margin: 8px;
      border-color: rgba(53,231,255,.24);
      background: rgba(9,8,13,.96);
      box-shadow: 0 6px 20px rgba(0,0,0,.3);
    }

    .paintless-mobile-mode .mobile-drawer-close span {
      font-size: 20px;
      line-height: 1;
      color: #35e7ff;
    }

    .paintless-mobile-mode .paintless-mobile-dock {
      position: fixed;
      z-index: 150;
      left: 8px;
      right: 8px;
      bottom: 33px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }

    .paintless-mobile-mode .paintless-mobile-dock button {
      pointer-events: auto;
      min-height: 40px;
      padding: 9px 13px;
      background: rgba(16,13,22,.93);
      border-color: rgba(168,76,255,.48);
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
    }

    .paintless-mobile-mode .mobile-drawer-shade {
      position: fixed;
      z-index: 110;
      inset: 54px 0 28px;
      border: 0;
      background: rgba(0,0,0,.48);
    }

    .paintless-mobile-mode.mobile-tools-open .mobile-drawer-shade,
    .paintless-mobile-mode.mobile-panels-open .mobile-drawer-shade {
      display: block;
    }

    .paintless-mobile-mode .status-bar {
      z-index: 160 !important;
      min-height: 28px !important;
    }

    .paintless-mobile-mode .paraluxious-hand-fab {
      bottom: 79px;
    }

    .paintless-mobile-mode.paraluxious-active .paraluxious-device-shell {
      padding: 0;
      border-radius: 20px;
    }

    .paintless-mobile-mode.paraluxious-active .paraluxious-device-screen,
    .paintless-mobile-mode.paraluxious-active .paraluxious-device-glass {
      border-radius: 12px;
    }

    .paintless-mobile-mode .paraluxious-orientation-overlay {
      inset: 0;
    }

    /* Landscape remains MOBILE rather than falling back to desktop. */
    @media (orientation: landscape) {
      .paintless-mobile-mode .canvas-viewport {
        padding: 14px 72px 58px !important;
      }

      .paintless-mobile-mode .toolbox,
      .paintless-mobile-mode .right-sidebar {
        width: min(56vw, 390px) !important;
      }

      .paintless-mobile-mode .paintless-mobile-dock {
        bottom: 31px;
      }

      .paintless-mobile-mode .paraluxious-hand-fab {
        bottom: 70px;
      }
    }
  `;

  document.head.append(style);

  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.PaintlessParaluxious = {
    state,
    setEnabled,
    getLayerTransform,
    render,
    rotateView,
    setViewRotation,
    setPreview,
    centrePreview,
    requestMotionPermission
  };

  const start = () => {
    ensureDeviceShell();
    installUi();
    installMobileShell();
    installOutsideCanvasRotationGesture();

    document.body.classList.toggle(
      "paraluxious-active",
      state.enabled
    );

    setViewRotation(state.viewRotation, false);
    updatePhysicalDevice();
    updateUi();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
