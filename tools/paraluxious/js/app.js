"use strict";

(() => {
  const fileInput = document.getElementById("file-input");
  const openButton = document.getElementById("open-button");
  const canvas = document.getElementById("viewer-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const device = document.getElementById("device");
  const emptyState = document.getElementById("empty-state");
  const status = document.getElementById("status");
  const canvasStat = document.getElementById("canvas-stat");
  const layersStat = document.getElementById("layers-stat");
  const motionStat = document.getElementById("motion-stat");
  const strength = document.getElementById("strength");
  const strengthOutput = document.getElementById("strength-output");
  const centreButton = document.getElementById("centre-button");
  const motionButton = document.getElementById("motion-button");
  const dropZone = document.getElementById("drop-zone");

  let scene = null;
  let objectUrls = [];
  let targetX = 0, targetY = 0, posX = 0, posY = 0, velX = 0, velY = 0;
  let lastTime = performance.now();
  let motionEnabled = false;
  let neutralBeta = null, neutralGamma = null;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

  function setStatus(message) { status.textContent = message; }

  function hasPlxHeader(bytes) {
    return bytes.length >= 8 && bytes[0] === 0x50 && bytes[1] === 0x4c && bytes[2] === 0x58 && bytes[3] === 0x31;
  }

  async function loadPlx(file) {
    setStatus("Reading .PLX…");
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!hasPlxHeader(bytes)) throw new Error("That is not a PLX1 Paraluxious file.");

    const manifestLength = new DataView(buffer, 4, 4).getUint32(0, true);
    if (manifestLength < 2 || manifestLength > buffer.byteLength - 8) throw new Error("Invalid .PLX manifest.");
    const manifestEnd = 8 + manifestLength;
    const manifest = JSON.parse(new TextDecoder().decode(bytes.subarray(8, manifestEnd)));
    if (manifest?.format !== "Paraluxious" || Number(manifest.version) !== 1 || !Array.isArray(manifest.layers)) {
      throw new Error("Unsupported Paraluxious project.");
    }

    objectUrls.forEach(URL.revokeObjectURL);
    objectUrls = [];
    let offset = manifestEnd;
    const layers = [];

    for (let i = 0; i < manifest.layers.length; i += 1) {
      const layer = manifest.layers[i];
      const length = Number(layer.byteLength);
      if (!Number.isFinite(length) || length <= 0 || offset + length > buffer.byteLength) throw new Error(`Invalid image payload for ${layer.name || `Layer ${i + 1}`}.`);
      const blob = new Blob([buffer.slice(offset, offset + length)], { type: layer.mime || "image/png" });
      offset += length;
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
      layers.push({ ...layer, image });
    }

    scene = { manifest, layers, name: file.name };
    targetX = targetY = posX = posY = velX = velY = 0;
    neutralBeta = neutralGamma = null;
    emptyState.style.display = "none";
    canvasStat.textContent = `${manifest.canvas.width} × ${manifest.canvas.height}`;
    layersStat.textContent = String(layers.length);
    motionStat.textContent = `${Math.round(Number(manifest.paraluxious?.strengthX) || 0)} / ${Math.round(Number(manifest.paraluxious?.strengthY) || 0)}`;
    setStatus(`${file.name} loaded`);
    resizeCanvas();
    render();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function blendMode(mode) {
    const value = String(mode || "source-over").toLowerCase();
    if (["screen", "multiply", "lighter", "destination-out"].includes(value)) return value;
    if (value === "add" || value === "plus-lighter") return "lighter";
    return "source-over";
  }

  function render() {
    resizeCanvas();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (!scene) return;

    const { manifest, layers } = scene;
    const docW = Math.max(1, Number(manifest.canvas.width) || 1);
    const docH = Math.max(1, Number(manifest.canvas.height) || 1);
    const settings = manifest.paraluxious || {};
    const base = Math.max(canvas.width / docW, canvas.height / docH);
    const docScale = base * Math.max(1, Number(settings.overscan) || 1);
    const previewGain = Number(strength.value) / 100;

    layers.forEach((layer) => {
      const depth = clamp(layer.depth ?? 0, -2, 2);
      const motionX = posX * (Number(settings.strengthX) || 0) * depth * base * previewGain;
      const motionY = posY * (Number(settings.strengthY) || 0) * depth * base * previewGain;
      const x = Number(layer.transformX) || 0;
      const y = Number(layer.transformY) || 0;
      const sx = Number(layer.scaleX) || 1;
      const sy = Number(layer.scaleY) || 1;
      const rotation = (Number(layer.rotation) || 0) * Math.PI / 180;
      const w = Number(layer.width) || layer.image.naturalWidth;
      const h = Number(layer.height) || layer.image.naturalHeight;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(x * docScale + motionX, y * docScale + motionY);
      ctx.rotate(rotation);
      ctx.scale(docScale * sx, docScale * sy);
      ctx.translate(-w / 2, -h / 2);
      ctx.globalAlpha = clamp(layer.opacity ?? 1, 0, 1);
      ctx.globalCompositeOperation = blendMode(layer.blendMode);
      ctx.drawImage(layer.image, 0, 0, w, h);
      ctx.restore();
    });
  }

  function frame(now) {
    const dt = Math.min(.045, Math.max(.004, (now - lastTime) / 1000));
    lastTime = now;
    const stiffness = 42;
    const damping = 11.5;
    const gain = 7.5;
    velX += (targetX - posX) * stiffness * dt;
    velY += (targetY - posY) * stiffness * dt;
    velX *= Math.exp(-damping * dt);
    velY *= Math.exp(-damping * dt);
    posX += velX * dt * gain;
    posY += velY * dt * gain;
    render();
    requestAnimationFrame(frame);
  }

  function pointerMotion(event) {
    if (motionEnabled || !scene) return;
    const rect = device.getBoundingClientRect();
    targetX = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
    targetY = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
  }

  function deviceMotion(event) {
    if (!motionEnabled || !scene || event.beta == null || event.gamma == null) return;
    if (neutralBeta == null) { neutralBeta = event.beta; neutralGamma = event.gamma; return; }
    targetX = clamp((event.gamma - neutralGamma) / 28, -1, 1);
    targetY = clamp((event.beta - neutralBeta) / 28, -1, 1);
  }

  async function enableMotion() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") throw new Error("Motion permission was not granted.");
      }
      motionEnabled = !motionEnabled;
      neutralBeta = neutralGamma = null;
      window.addEventListener("deviceorientation", deviceMotion, { passive: true });
      motionButton.textContent = motionEnabled ? "Phone tilt enabled" : "Enable phone tilt";
      setStatus(motionEnabled ? "Tilt the phone to preview depth" : scene ? `${scene.name} loaded` : "Waiting for a .PLX");
    } catch (error) {
      setStatus(error.message || "Could not enable motion sensors.");
    }
  }

  function centre() { targetX = targetY = 0; neutralBeta = neutralGamma = null; }

  openButton.addEventListener("click", () => { fileInput.value = ""; fileInput.click(); });
  fileInput.addEventListener("change", () => { const f = fileInput.files?.[0]; if (f) loadPlx(f).catch(err => setStatus(err.message)); });
  centreButton.addEventListener("click", centre);
  motionButton.addEventListener("click", enableMotion);
  strength.addEventListener("input", () => { strengthOutput.value = `${strength.value}%`; });
  device.addEventListener("pointermove", pointerMotion);
  device.addEventListener("pointerleave", () => { if (!motionEnabled) centre(); });
  window.addEventListener("resize", render);

  ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, e => { e.preventDefault(); dropZone.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, e => { e.preventDefault(); dropZone.classList.remove("is-over"); }));
  dropZone.addEventListener("drop", e => { const f = e.dataTransfer.files?.[0]; if (f) loadPlx(f).catch(err => setStatus(err.message)); });

  requestAnimationFrame(frame);
})();
