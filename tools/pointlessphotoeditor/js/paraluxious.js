"use strict";

/* =========================================================
   PAINTLESS — PARALUXIOUS v0.1
   Independent parallax power-up for Paintless + Paintless3D.
   Also installs the canvas-first mobile drawers and view rotate.
========================================================= */
(() => {
  const STORAGE_KEY = "paintless:paraluxious-v1";
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
    viewRotation: 0
  };

  try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); } catch (_) {}

  const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const layers = () => window.PaintlessLayers?.getLayers?.() || [];
  const activeLayer = () => window.PaintlessLayers?.getActiveLayer?.() || null;

  function ensureLayer(layer) {
    if (!layer) return null;
    if (!Number.isFinite(Number(layer.paraluxiousDepth))) {
      const list = layers();
      const i = Math.max(0, list.indexOf(layer));
      layer.paraluxiousDepth = list.length <= 1 ? 0 : (i / (list.length - 1)) * 2 - 1;
    }
    return layer;
  }

  function render(reason = "paraluxious") {
    window.PaintlessLayers?.renderLayers?.();
    if (window.Paintless3D?.getMode?.() === "3d") {
      window.Paintless3DRenderer?.requestRender?.(reason);
    }
    updateUi();
  }

  function getLayerTransform(layer) {
    if (!state.enabled) return { x: 0, y: 0, scale: 1 };
    ensureLayer(layer);
    const depth = clamp(layer.paraluxiousDepth, -1, 1);
    const inputX = clamp(state.previewX + state.motionX, -1, 1);
    const inputY = clamp(state.previewY + state.motionY, -1, 1);
    return {
      x: inputX * state.strengthX * depth,
      y: inputY * state.strengthY * depth,
      scale: Math.max(1, Number(state.overscan) || 1)
    };
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    document.body.classList.toggle("paraluxious-active", state.enabled);
    save(); render("paraluxious-toggle");
    if (state.enabled && state.useDeviceTilt) requestMotionPermission();
  }

  async function requestMotionPermission() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") return false;
      }
      return true;
    } catch (_) { return false; }
  }

  let motionFrame = 0;
  window.addEventListener("deviceorientation", (event) => {
    if (!state.enabled || !state.useDeviceTilt) return;
    const gamma = clamp(event.gamma || 0, -30, 30) / 30;
    const beta = clamp((event.beta || 0), -30, 30) / 30;
    state.motionX = gamma;
    state.motionY = beta;
    if (!motionFrame) motionFrame = requestAnimationFrame(() => { motionFrame = 0; render("device-tilt"); });
  }, { passive: true });

  function rotateView(delta) {
    state.viewRotation = ((state.viewRotation + delta) % 360 + 360) % 360;
    const stage = document.getElementById("canvas-stage");
    if (stage) stage.style.setProperty("--paintless-view-rotation", `${state.viewRotation}deg`);
    save();
    document.dispatchEvent(new CustomEvent("paintless:view-rotation-changed", { detail: { rotation: state.viewRotation } }));
  }

  let ui = {};
  function makeRange(label, min, max, step, value, onInput) {
    const wrap = document.createElement("label"); wrap.className = "paraluxious-control";
    const head = document.createElement("span"); head.innerHTML = `<strong>${label}</strong><output>${value}</output>`;
    const input = document.createElement("input"); input.type = "range"; input.min=min; input.max=max; input.step=step; input.value=value;
    input.addEventListener("input", () => { head.querySelector("output").textContent = input.value; onInput(Number(input.value)); });
    wrap.append(head,input); return wrap;
  }

  function installUi() {
    const top = document.querySelector(".top-actions") || document.querySelector(".top-bar");
    const button = document.createElement("button");
    button.id = "paraluxious-toggle"; button.className = "top-action-button paraluxious-toggle"; button.type="button";
    button.title = "Paraluxious — layered parallax power-up"; button.innerHTML = `<span aria-hidden="true">✦</span><b>PARA</b>`;
    button.addEventListener("click", () => setEnabled(!state.enabled)); top?.prepend(button);

    const panel = document.createElement("section"); panel.className="editor-panel paraluxious-panel"; panel.id="paraluxious-panel";
    panel.innerHTML = `<header class="panel-header"><h2>✦ Paraluxious</h2><span class="paraluxious-state">OFF</span></header><div class="paraluxious-body"></div>`;
    const body = panel.querySelector(".paraluxious-body");
    body.append(
      makeRange("Layer depth",-1,1,.05,0,v=>{const l=ensureLayer(activeLayer()); if(l){l.paraluxiousDepth=v; render("layer-depth");}}),
      makeRange("Horizontal",0,100,1,state.strengthX,v=>{state.strengthX=v;save();render();}),
      makeRange("Vertical",0,100,1,state.strengthY,v=>{state.strengthY=v;save();render();}),
      makeRange("Overscan",1,1.3,.01,state.overscan,v=>{state.overscan=v;save();render();}),
      makeRange("Preview X",-1,1,.05,state.previewX,v=>{state.previewX=v;render();}),
      makeRange("Preview Y",-1,1,.05,state.previewY,v=>{state.previewY=v;render();})
    );
    const actions=document.createElement("div"); actions.className="paraluxious-actions";
    actions.innerHTML=`<button type="button" data-parallax-auto>Auto depth</button><button type="button" data-view-left>↺ View</button><button type="button" data-view-right>View ↻</button>`;
    actions.querySelector("[data-parallax-auto]").onclick=()=>{const list=layers(); list.forEach((l,i)=>l.paraluxiousDepth=list.length<=1?0:(i/(list.length-1))*2-1); render("auto-depth");};
    actions.querySelector("[data-view-left]").onclick=()=>rotateView(-90);
    actions.querySelector("[data-view-right]").onclick=()=>rotateView(90);
    body.append(actions);
    document.querySelector(".right-sidebar")?.prepend(panel);

    ui={button,panel,depth:body.querySelector('input[type="range"]')};
    document.addEventListener("paintless:active-layer-changed", updateUi);
    document.addEventListener("paintless:layer-selected", updateUi);
    updateUi();
  }

  function updateUi(){
    if(!ui.button)return;
    ui.button.classList.toggle("is-active",state.enabled); ui.button.setAttribute("aria-pressed",String(state.enabled));
    const badge=ui.panel?.querySelector(".paraluxious-state"); if(badge)badge.textContent=state.enabled?"ON":"OFF";
    const l=ensureLayer(activeLayer()); if(ui.depth && l) ui.depth.value=String(l.paraluxiousDepth);
    const out=ui.depth?.previousElementSibling?.querySelector("output"); if(out && l) out.textContent=Number(l.paraluxiousDepth).toFixed(2);
  }

  function installMobileShell(){
    const shell=document.createElement("div"); shell.className="paintless-mobile-dock";
    shell.innerHTML=`<button type="button" data-mobile-tools>☰ Tools</button><button type="button" data-mobile-panels>Layers / FX ☷</button>`;
    document.body.append(shell);
    const shade=document.createElement("button"); shade.className="mobile-drawer-shade"; shade.type="button"; shade.setAttribute("aria-label","Close drawer"); document.body.append(shade);
    const close=()=>document.body.classList.remove("mobile-tools-open","mobile-panels-open");
    shell.querySelector("[data-mobile-tools]").onclick=()=>{document.body.classList.toggle("mobile-tools-open");document.body.classList.remove("mobile-panels-open");};
    shell.querySelector("[data-mobile-panels]").onclick=()=>{document.body.classList.toggle("mobile-panels-open");document.body.classList.remove("mobile-tools-open");};
    shade.onclick=close;
  }

  const style=document.createElement("style"); style.id="paraluxious-styles"; style.textContent=`
    .paraluxious-toggle{width:auto!important;min-width:62px!important;padding:0 8px!important;gap:4px!important}.paraluxious-toggle b{font-size:9px;letter-spacing:.08em}.paraluxious-toggle.is-active{box-shadow:0 0 18px rgba(168,76,255,.65),inset 0 0 0 1px #35e7ff;color:#fff;background:linear-gradient(135deg,rgba(168,76,255,.45),rgba(53,231,255,.2))}.paraluxious-state{font-size:10px;font-weight:900;color:#888}.paraluxious-active .paraluxious-state{color:#35e7ff}.paraluxious-body{padding:10px;display:grid;gap:9px}.paraluxious-control{display:grid;gap:4px}.paraluxious-control>span{display:flex;justify-content:space-between;font-size:10px}.paraluxious-control output{color:#35e7ff;font-variant-numeric:tabular-nums}.paraluxious-control input{width:100%}.paraluxious-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}.paraluxious-actions button,.paintless-mobile-dock button{border:1px solid rgba(168,76,255,.45);background:#17131e;color:#fff;border-radius:8px;padding:7px;font-size:10px;font-weight:800}.canvas-stage{transform:rotate(var(--paintless-view-rotation,0deg));transform-origin:center center;transition:transform .18s ease}.paintless-mobile-dock,.mobile-drawer-shade{display:none}
    @media(max-width:680px){
      .paintless-app{grid-template-rows:48px minmax(0,1fr) 26px!important}.tool-options-bar{display:none!important}.editor-layout{grid-template-columns:minmax(0,1fr)!important}.workspace{grid-column:1!important}.workspace-ruler{display:none!important}.canvas-viewport{inset:0!important}.toolbox,.right-sidebar{position:fixed!important;z-index:120!important;top:48px!important;bottom:38px!important;width:min(84vw,330px)!important;max-width:none!important;transition:transform .22s ease!important;display:block!important}.toolbox{left:0!important;transform:translateX(-105%);background:#100d16}.right-sidebar{right:0!important;transform:translateX(105%);overflow:auto;background:#100d16}.mobile-tools-open .toolbox{transform:translateX(0)}.mobile-panels-open .right-sidebar{transform:translateX(0)}.sidebar-resize-handle{display:none!important}.paintless-mobile-dock{display:flex;position:fixed;z-index:130;left:8px;right:8px;bottom:30px;justify-content:space-between;pointer-events:none}.paintless-mobile-dock button{pointer-events:auto;background:rgba(16,13,22,.92);backdrop-filter:blur(12px);padding:8px 12px}.mobile-drawer-shade{display:none;position:fixed;z-index:110;inset:48px 0 28px;border:0;background:rgba(0,0,0,.45)}.mobile-tools-open .mobile-drawer-shade,.mobile-panels-open .mobile-drawer-shade{display:block}.status-bar{z-index:140}.paraluxious-toggle b{display:none}.paraluxious-toggle{min-width:34px!important;width:34px!important;padding:0!important}.canvas-stage{transition:none}}
  `; document.head.append(style);

  window.PaintlessParaluxious={state,setEnabled,getLayerTransform,render,rotateView,requestMotionPermission};
  const start=()=>{installUi();installMobileShell();document.body.classList.toggle("paraluxious-active",state.enabled);rotateView(0);};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
