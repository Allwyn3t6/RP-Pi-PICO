/*
 * PIO for Dummies - the 3D scenes (three.js r128).
 *   Scenes3D.fsm(el, def)  a state machine you can watch and drive: glowing state
 *                          spheres, arrows, a token that travels on each clock edge,
 *                          and the hardware behind it (state register + next-state logic).
 *   Scenes3D.pio(el)       a tour of one PIO block: instruction memory, four state
 *                          machines, the FIFOs, the CPU side and the GPIO pins.
 * Drag to turn, wheel / pinch to zoom. Click a part to read about it.
 */
(function () {
  "use strict";
  const hasGL = (() => {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e) { return false; }
  })();

  function label(text, opts) {
    opts = opts || {};
    const size = opts.size || 48, pad = 16;
    const c = document.createElement("canvas"), g = c.getContext("2d");
    const font = (opts.bold === false ? "" : "700 ") + size + "px 'Atkinson Hyperlegible', Verdana, sans-serif";
    g.font = font;
    const lines = String(text).split("\n");
    const w = Math.max(...lines.map(l => g.measureText(l).width)) + pad * 2, h = lines.length * size * 1.2 + pad * 1.4;
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    g.font = font;
    if (opts.bg !== false) {
      g.fillStyle = opts.bg || "rgba(7,12,17,0.78)";
      const r = 14; g.beginPath();
      g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r);
      g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.fill();
    }
    g.fillStyle = opts.color || "#E2EAF0"; g.textAlign = "center"; g.textBaseline = "middle";
    lines.forEach((l, i) => g.fillText(l, c.width / 2, pad * 0.7 + size * 0.6 + i * size * 1.2));
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: opts.depthTest !== false });
    const s = new THREE.Sprite(mat);
    const k = (opts.scale || 0.012);
    s.scale.set(c.width * k, c.height * k, 1);
    s.userData.setText = t => { /* simple: rebuild */ const n = label(t, opts); s.material.map.dispose(); s.material.map = n.material.map; s.scale.copy(n.scale); };
    return s;
  }

  /** Shared stage: renderer, camera, lights, drag-to-turn, zoom, picking, render loop. */
  function stage(el, camPos, target) {
    el.classList.add("stage3d");
    if (!hasGL || !window.THREE) {
      el.innerHTML = '<div class="fallback">This 3D view needs WebGL, which this browser has switched off.<br>Everything else on the page still works.</div>';
      return null;
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    const world = new THREE.Group(); scene.add(world);
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x0b1116, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(6, 12, 8); scene.add(sun);
    const view = { yaw: 0.6, pitch: 0.55, dist: camPos || 14, target: target || new THREE.Vector3(0, 0, 0) };
    function place() {
      const t = view.target;
      camera.position.set(t.x + view.dist * Math.cos(view.pitch) * Math.sin(view.yaw), t.y + view.dist * Math.sin(view.pitch), t.z + view.dist * Math.cos(view.pitch) * Math.cos(view.yaw));
      camera.lookAt(t);
    }
    place();
    function resize() {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(el); resize();

    // drag to turn, wheel / pinch to zoom, click to pick
    const pts = new Map(); let down = null, pinch0 = 0, dist0 = 0, moved = false;
    el.addEventListener("pointerdown", e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; moved = false;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = view.dist; } });
    el.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); view.dist = Math.max(5, Math.min(40, dist0 * pinch0 / (d || 1))); place(); moved = true; return; }
      const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      if (Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 4) moved = true;
      view.yaw -= dx * 0.008; view.pitch = Math.max(0.08, Math.min(1.45, view.pitch + dy * 0.006)); place();
    });
    const end = e => {
      if (pts.has(e.pointerId) && !moved && pts.size === 1 && api.onPick) {
        const r = el.getBoundingClientRect();
        const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const ray = new THREE.Raycaster(); ray.setFromCamera(m, camera);
        const hits = ray.intersectObjects(api.pickables, true);
        let o = hits.length ? hits[0].object : null;
        while (o && !o.userData.info && o.parent) o = o.parent;
        api.onPick(o && o.userData.info ? o : null);
      }
      pts.delete(e.pointerId);
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", e => { e.preventDefault(); view.dist = Math.max(5, Math.min(40, view.dist * (e.deltaY > 0 ? 1.1 : 0.9))); place(); }, { passive: false });

    let visible = true, last = performance.now();
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(el);
    const api = { renderer, scene, camera, world, view, place, el, pickables: [], onPick: null, tickers: [], auto: true };
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || !el.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (api.auto && !pts.size) { view.yaw += dt * 0.08; place(); }
      api.tickers.forEach(f => f(dt, now / 1000));
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
    el.addEventListener("pointerdown", () => { api.auto = false; });
    return api;
  }

  function hud(el, html) {
    const d = document.createElement("div"); d.className = "hud"; d.innerHTML = html; el.appendChild(d); return d;
  }
  function tip(el, html) {
    let t = el.querySelector(".tip");
    if (!t) { t = document.createElement("div"); t.className = "tip"; el.appendChild(t); }
    t.innerHTML = html; t.style.display = html ? "" : "none";
    return t;
  }

  // ======================================================================= FSM
  /*
   * def = { states:[{id, name, color, x, z}], edges:[{from, to, label}], start,
   *         prop: "turnstile" | "traffic" | null, bits: number of flip-flops, code: {id: "01"} }
   */
  function fsm(el, def) {
    const S = stage(el, 15, new THREE.Vector3(0, 0.6, 0));
    if (!S) return { goto() {}, clock() {}, reset() {} };
    const { world } = S;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.6, 0.4, 64),
      new THREE.MeshStandardMaterial({ color: 0x15222d, roughness: 0.9 }));
    floor.position.y = -0.2; world.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.45, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: 0x2CD1B1 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; world.add(ring);

    const nodes = {};
    def.states.forEach(st => {
      const g = new THREE.Group(); g.position.set(st.x, 1.1, st.z);
      const mat = new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.12, roughness: 0.35, metalness: 0.1 });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 28), mat); g.add(ball);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.6, 24), new THREE.MeshStandardMaterial({ color: 0x223443 }));
      base.position.y = -1.0; g.add(base);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: 0 }));
      halo.rotation.x = Math.PI / 2; halo.position.y = -0.5; g.add(halo);
      const l = label(st.name + (def.code ? "\n" + "state = " + def.code[st.id] : ""), { size: 44 }); l.position.y = 1.9; g.add(l);
      g.userData.info = "<b>State: " + st.name + "</b><br>" + (st.info || "");
      world.add(g); S.pickables.push(g);
      nodes[st.id] = { g, mat, halo, st };
    });

    // arrows as arched tubes; self-loops as small upright loops
    const edges = def.edges.map((e, i) => {
      const a = nodes[e.from].g.position, b = nodes[e.to].g.position;
      let curve;
      if (e.from === e.to) {
        const out = new THREE.Vector3(a.x, 0, a.z).normalize();
        const p0 = a.clone().add(out.clone().multiplyScalar(0.9)).add(new THREE.Vector3(0, 0.5, 0));
        const side = new THREE.Vector3(-out.z, 0, out.x);
        curve = new THREE.CubicBezierCurve3(p0.clone().add(side.clone().multiplyScalar(0.45)),
          p0.clone().add(out.clone().multiplyScalar(2.2)).add(side.clone().multiplyScalar(1.4)).add(new THREE.Vector3(0, 1.2, 0)),
          p0.clone().add(out.clone().multiplyScalar(2.2)).add(side.clone().multiplyScalar(-1.4)).add(new THREE.Vector3(0, 1.2, 0)),
          p0.clone().add(side.clone().multiplyScalar(-0.45)));
      } else {
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(e.bend === undefined ? 1.1 : e.bend);
        mid.add(side).add(new THREE.Vector3(0, 1.6, 0));
        const a2 = a.clone().add(dir.clone().multiplyScalar(1.0)), b2 = b.clone().sub(dir.clone().multiplyScalar(1.15));
        curve = new THREE.QuadraticBezierCurve3(a2, mid, b2);
      }
      const mat = new THREE.MeshStandardMaterial({ color: 0x9fb3c2, emissive: 0x2CD1B1, emissiveIntensity: 0 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.06, 8, false), mat);
      world.add(tube);
      const end = curve.getPoint(1), before = curve.getPoint(0.94);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), mat);
      cone.position.copy(end); cone.lookAt(end.clone().add(end.clone().sub(before)));
      cone.rotateX(Math.PI / 2); world.add(cone);
      const lp = curve.getPoint(0.5); const l = label(e.label, { size: 36, bg: "rgba(185,122,18,0.92)", color: "#fff" });
      l.position.copy(lp).add(new THREE.Vector3(0, 0.45, 0)); world.add(l);
      return { e, curve, mat, i };
    });

    // the token that marks the current state
    const token = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    world.add(token);
    const glow = new THREE.PointLight(0xffffff, 1.4, 6); token.add(glow);

    // the hardware behind it: state register + next-state logic + clock (off to one side)
    const hw = new THREE.Group(); hw.position.set(0, 0.25, -9.6); world.add(hw);
    const nbits = def.bits || 1;
    const reg = new THREE.Mesh(new THREE.BoxGeometry(1.0 + nbits * 0.9, 1.3, 1.3), new THREE.MeshStandardMaterial({ color: 0x2f62d6, roughness: 0.5 }));
    reg.position.set(-2.6, 0.65, 0); hw.add(reg);
    reg.userData.info = "<b>State register</b> = " + nbits + " D flip-flop" + (nbits > 1 ? "s" : "") + ". It remembers which state we are in, and changes ONLY on the clock's rising edge.";
    S.pickables.push(reg);
    const bitLeds = [];
    for (let i = 0; i < nbits; i++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000 }));
      led.position.set(-2.6 + (i - (nbits - 1) / 2) * 0.8, 0.65, 0.7); hw.add(led); bitLeds.push(led);
    }
    const regL = label("State register\n(flip-flops)", { size: 34 }); regL.position.set(-2.6, 2.0, 0); hw.add(regL);
    const logic = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85), new THREE.MeshStandardMaterial({ color: 0xb97a12, roughness: 0.6, flatShading: true }));
    logic.position.set(2.2, 0.9, 0); hw.add(logic);
    logic.userData.info = "<b>Next-state logic</b> = plain gates (combinational logic). From the present state and the inputs it works out the NEXT state. It does not remember anything.";
    S.pickables.push(logic);
    const logicL = label("Next-state logic\n(gates)", { size: 34 }); logicL.position.set(2.2, 2.25, 0); hw.add(logicL);
    const clk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x7c4ddb }));
    clk.position.set(-5.4, 0.4, 0); hw.add(clk);
    clk.userData.info = "<b>Clock</b>: a steady square wave. Each rising edge is one 'tick' - the moment the flip-flops copy in the next state.";
    S.pickables.push(clk);
    const clkL = label("Clock", { size: 34 }); clkL.position.set(-5.4, 1.35, 0); hw.add(clkL);
    function wire(pts, color) {
      const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
      const m = new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.05, 6, false), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
      hw.add(m); return { m, c };
    }
    const wFwd = wire([[-1.6, 0.9, 0], [0, 1.5, 0], [1.4, 0.9, 0]], 0x6e9bff);
    const wBack = wire([[2.6, 0.4, 0.4], [1.0, -0.05, 1.1], [-2.0, 0.0, 0.9], [-2.6, 0.15, 0.7]], 0xe9b44c);
    const wClk = wire([[-4.9, 0.4, 0], [-3.4, 0.4, 0]], 0xb79bff);
    const inL = label("inputs", { size: 30 }); inL.position.set(3.7, 1.6, 0); hw.add(inL);
    wire([[4.0, 1.2, 0], [3.0, 1.0, 0]], 0x2cd1b1);
    const sparks = [];
    function spark(curve, color, dur) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color }));
      hw.add(m); sparks.push({ m, curve, t: 0, dur });
    }

    // optional props in the middle
    let propTick = null, setProp = () => {};
    if (def.prop === "turnstile") {
      const p = new THREE.Group(); p.position.set(0, 0, 0); world.add(p);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 24), new THREE.MeshStandardMaterial({ color: 0x8a9aa8, metalness: 0.6, roughness: 0.3 }));
      post.position.y = 1.1; p.add(post);
      const hub = new THREE.Group(); hub.position.y = 2.0; p.add(hub);
      for (let k = 0; k < 3; k++) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 12), new THREE.MeshStandardMaterial({ color: 0xd0d8df, metalness: 0.7, roughness: 0.25 }));
        arm.rotation.z = Math.PI / 2; arm.position.x = 0.95;
        const holder = new THREE.Group(); holder.rotation.y = k * 2 * Math.PI / 3; holder.rotation.z = -0.5; holder.add(arm); hub.add(holder);
      }
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.8 }));
      lamp.position.y = 2.45; p.add(lamp);
      p.userData.info = "<b>The turnstile</b> - the machine this FSM controls. Output: the lock (lamp red = locked, green = free to push).";
      S.pickables.push(p);
      let spin = 0;
      setProp = (state, edge) => {
        const free = state === "U";
        lamp.material.color.set(free ? 0x2ecc71 : 0xff3b30); lamp.material.emissive.set(free ? 0x2ecc71 : 0xff3b30);
        if (edge && edge.from === "U" && edge.to === "L") spin = 2 * Math.PI / 3;
      };
      propTick = dt => { if (spin > 0) { const d = Math.min(spin, dt * 3); hub.rotation.y += d; spin -= d; } };
    } else if (def.prop === "traffic") {
      const p = new THREE.Group(); world.add(p);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 12), new THREE.MeshStandardMaterial({ color: 0x6b7b88 }));
      pole.position.y = 1.3; p.add(pole);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x1b2630 }));
      box.position.y = 3.3; p.add(box);
      const cols = { G: 0x2ecc71, Y: 0xf1c40f, R: 0xff3b30 };
      const lamps = {};
      ["R", "Y", "G"].forEach((k, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 }));
        m.position.set(0, 4.0 - i * 0.7, 0.37); p.add(m); lamps[k] = m;
      });
      p.userData.info = "<b>The traffic light</b> - its lamps are the FSM's outputs. In a Moore machine the outputs depend only on the state.";
      S.pickables.push(p);
      setProp = state => { for (const k in lamps) { const on = k === state; lamps[k].material.color.set(on ? cols[k] : 0x222222); lamps[k].material.emissive.set(on ? cols[k] : 0x000000); } };
    }

    let cur = def.start, anim = null, pulse = 0;
    function show(id) {
      for (const k in nodes) { const n = nodes[k]; const on = k === id; n.mat.emissiveIntensity = on ? 0.75 : 0.1; n.halo.material.opacity = on ? 0.9 : 0; }
      const code = def.code ? def.code[id] : "";
      bitLeds.forEach((led, i) => { const b = code[i] === "1"; led.material.color.set(b ? 0x2cd1b1 : 0x333333); led.material.emissive.set(b ? 0x2cd1b1 : 0x000000); });
    }
    function placeToken(id) { token.position.copy(nodes[id].g.position).add(new THREE.Vector3(0, 1.35, 0)); }
    show(cur); placeToken(cur); setProp(cur);
    S.tickers.push((dt, t) => {
      if (anim) {
        anim.t = Math.min(1, anim.t + dt / anim.dur);
        token.position.copy(anim.edge.curve.getPoint(anim.t));
        anim.edge.mat.emissiveIntensity = 0.9 * (1 - anim.t) + 0.1;
        if (anim.t >= 1) { anim.edge.mat.emissiveIntensity = 0; cur = anim.to; placeToken(cur); show(cur); setProp(cur, anim.edge.e); const f = anim.done; anim = null; if (f) f(); }
      } else { token.position.y = nodes[cur].g.position.y + 1.35 + Math.sin(t * 3) * 0.08; }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.t += dt / s.dur; if (s.t >= 1) { hw.remove(s.m); sparks.splice(i, 1); continue; }
        s.m.position.copy(s.curve.getPoint(s.t));
      }
      if (pulse > 0) { pulse = Math.max(0, pulse - dt * 2.5); clk.material.emissive.set(0x7c4ddb); clk.material.emissiveIntensity = pulse; }
      logic.rotation.y += dt * 0.6;
      if (propTick) propTick(dt);
    });
    S.onPick = o => tip(el, o ? o.userData.info : "");
    tip(el, def.hint || "Drag to turn the scene. Click a sphere or a box to read about it.");
    return {
      get state() { return cur; },
      /** one clock tick that moves from the current state to `to` (along the edge with `label`) */
      step(to, lab, done) {
        if (anim) return false;
        pulse = 1;
        spark(wClk.c, 0xb79bff, 0.35);
        spark(wFwd.c, 0x6e9bff, 0.5);
        setTimeout(() => spark(wBack.c, 0xe9b44c, 0.5), 250);
        const edge = edges.find(x => x.e.from === cur && x.e.to === to && (!lab || x.e.label === lab)) || edges.find(x => x.e.from === cur && x.e.to === to);
        if (!edge) { cur = to; show(cur); placeToken(cur); setProp(cur); if (done) done(); return true; }
        anim = { edge, t: 0, dur: 0.9, to, done };
        return true;
      },
      reset() { anim = null; cur = def.start; show(cur); placeToken(cur); setProp(cur); },
      busy() { return !!anim; },
    };
  }

  // ======================================================================= the PIO block
  const PARTS = {
    imem: "<b>Instruction memory</b> - 32 slots, shared by all four state machines of this PIO block. Each slot holds one 16-bit PIO instruction. So a PIO program can be at most 32 instructions long.",
    sm: "<b>State machine (SM)</b> - a tiny processor that runs a PIO program, one instruction per clock cycle. Inside: <b>PC</b> (which instruction), scratch registers <b>X</b> and <b>Y</b>, the <b>OSR</b> (output shift register) and <b>ISR</b> (input shift register), and a clock divider.",
    tx: "<b>TX FIFO</b> - a 4-word queue from the CPU to the state machine. In MicroPython the CPU puts a word in with <code>sm.put()</code>; the PIO program takes it with <code>pull</code>.",
    rx: "<b>RX FIFO</b> - a 4-word queue from the state machine back to the CPU. The program sends with <code>push</code>; MicroPython reads with <code>sm.get()</code>.",
    cpu: "<b>The CPU side</b> (system bus). The two Cortex-M0+ cores set up the PIO, load the program and talk to it only through the FIFOs (and IRQ flags). Once started, the state machines run on their own.",
    gpio: "<b>GPIO pins</b> - any state machine can drive or read any of the GPIOs. You choose which pins with the pin mappings: <b>set_base</b>, <b>out_base</b>, <b>in_base</b>, <b>sideset_base</b>, <b>jmp_pin</b>.",
    irq: "<b>IRQ flags</b> - 8 flags shared by the four state machines (and the CPU). Used to let state machines wait for each other or to interrupt the CPU.",
    div: "<b>Clock divider</b> - each state machine can run slower than the 125 MHz system clock: SM clock = 125 MHz ÷ divider (1 to 65536). In MicroPython you just give <code>freq=</code>.",
    pio1: "<b>PIO1</b> - the RP2040 has two identical PIO blocks: PIO0 and PIO1. That is 8 state machines in total (MicroPython numbers them 0-7).",
  };

  function pio(el) {
    const S = stage(el, 19, new THREE.Vector3(0, 0.5, 0));
    if (!S) return { demo() {} };
    const { world } = S;
    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15 });
    const add = (geo, color, x, y, z, info) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); world.add(m); if (info) { m.userData.info = PARTS[info]; S.pickables.push(m); } return m; };
    // base plate = the PIO0 block
    add(new THREE.BoxGeometry(16, 0.3, 9), 0x16222c, 0, -0.15, 0);
    const b = label("PIO0", { size: 60, bg: false, color: "#2CD1B1" }); b.position.set(-6.6, 0.4, 3.8); world.add(b);
    // instruction memory: 32 slabs
    const slabs = [];
    for (let i = 0; i < 32; i++) {
      const s = add(new THREE.BoxGeometry(2.2, 0.09, 1.3), 0x30455a, -5.6, 0.12 + i * 0.12, -1.0, "imem");
      slabs.push(s);
    }
    const li = label("Instruction memory\n32 slots (shared)", { size: 32 }); li.position.set(-5.6, 4.6, -1.0); world.add(li);
    // four state machines
    const sms = [];
    for (let k = 0; k < 4; k++) {
      const x = -2.2 + k * 2.4;
      const g = new THREE.Group(); g.position.set(x, 0, -1.0); world.add(g);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.8, 1.9), new THREE.MeshStandardMaterial({ color: 0x1f6f63, roughness: 0.4, transparent: true, opacity: 0.92 }));
      body.position.y = 0.9; g.add(body);
      body.userData.info = PARTS.sm; S.pickables.push(body);
      const regs = ["PC", "X", "Y", "OSR", "ISR"];
      regs.forEach((r, j) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.1), mat(0x0b1116)); c.position.set(-0.62 + (j % 3) * 0.62, 1.3 - Math.floor(j / 3) * 0.42, 0.96); g.add(c);
        const t = label(r, { size: 30, bg: false }); t.scale.multiplyScalar(0.55); t.position.set(c.position.x, c.position.y, 1.03); g.add(t);
      });
      const dv = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 20), mat(0x7c4ddb)); dv.position.set(0.62, 0.45, 0.96); dv.rotation.x = Math.PI / 2; g.add(dv);
      dv.userData.info = PARTS.div; S.pickables.push(dv);
      const l = label("SM" + k, { size: 40 }); l.position.y = 2.25; g.add(l);
      // FIFOs: TX toward the CPU side (back), RX next to it
      const tx = [], rx = [];
      for (let q = 0; q < 4; q++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0x6e9bff, transparent: true, opacity: 0.25 }));
        t.position.set(-0.32, 0.3, -1.45 - q * 0.5); g.add(t); tx.push(t); t.userData.info = PARTS.tx; S.pickables.push(t);
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0xff8a4c, transparent: true, opacity: 0.25 }));
        r.position.set(0.32, 0.3, -1.45 - q * 0.5); g.add(r); rx.push(r); r.userData.info = PARTS.rx; S.pickables.push(r);
      }
      sms.push({ g, body, tx, rx, x });
    }
    const lt = label("TX FIFO (blue): CPU → SM\nRX FIFO (orange): SM → CPU", { size: 28 }); lt.position.set(1.4, 1.6, -4.6); world.add(lt);
    // CPU / bus bar at the back
    const cpu = add(new THREE.BoxGeometry(14.5, 0.7, 0.9), 0x2f62d6, 0, 0.35, -4.0, "cpu");
    const lc = label("System bus ← CPU (MicroPython: sm.put / sm.get)", { size: 30 }); lc.position.set(0, 1.25, -4.0); world.add(lc);
    // IRQ flags
    const irq = [];
    for (let i = 0; i < 8; i++) irq.push(add(new THREE.BoxGeometry(0.3, 0.3, 0.3), 0x5a6874, 6.3 + (i % 4) * 0.4, 0.35 + Math.floor(i / 4) * 0.4, -1.0, "irq"));
    const lq = label("8 IRQ flags", { size: 28 }); lq.position.set(6.9, 1.5, -1.0); world.add(lq);
    // GPIO pins in front
    const pins = [];
    for (let i = 0; i < 30; i++) {
      const p = add(new THREE.BoxGeometry(0.28, 0.55, 0.28), 0xa8b4be, -7.0 + i * 0.48, 0.3, 3.4, "gpio");
      pins.push(p);
    }
    const lg = label("GPIO 0 … 29", { size: 32 }); lg.position.set(0, 1.2, 4.1); world.add(lg);
    // wires SM -> pins
    sms.forEach(s => {
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(s.x, 0.3, 0), new THREE.Vector3(s.x, 0.2, 1.8), new THREE.Vector3(s.x, 0.3, 3.0));
      const w = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.04, 6), mat(0x4a5b68)); world.add(w); s.toPins = c;
    });
    // the second block, small, behind
    const p1 = add(new THREE.BoxGeometry(5, 0.3, 3), 0x16222c, 9.8, -0.15, -6.2, "pio1");
    const l1 = label("PIO1 (4 more SMs)", { size: 30 }); l1.position.set(9.8, 0.9, -6.2); world.add(l1);

    // animation state
    let pcIdx = [0, 3, 7, 12], pcTimer = 0;
    const packets = [];
    function packet(from, to, color, dur, done) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color }));
      world.add(m); packets.push({ m, from, to, t: 0, dur, done });
    }
    S.tickers.push(dt => {
      pcTimer += dt;
      if (pcTimer > 0.35) {
        pcTimer = 0;
        slabs.forEach(s => s.material.color.set(0x30455a));
        pcIdx = pcIdx.map((p, k) => (p + 1) % (8 + k));
        pcIdx.forEach((p, k) => { slabs[(p + k * 8) % 32].material.color.set([0x2cd1b1, 0xe9b44c, 0x6e9bff, 0xff8a4c][k]); });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]; p.t += dt / p.dur;
        const t = Math.min(1, p.t);
        p.m.position.lerpVectors(p.from, p.to, t); p.m.position.y += Math.sin(t * Math.PI) * 0.6;
        if (p.t >= 1) { world.remove(p.m); packets.splice(i, 1); if (p.done) p.done(); }
      }
    });
    S.onPick = o => tip(el, o ? o.userData.info : "");
    tip(el, "Drag to turn, scroll or pinch to zoom. <b>Click any part</b> to see what it does. The coloured slabs in the memory show each SM's program counter moving.");

    function wp(obj) { const v = new THREE.Vector3(); obj.getWorldPosition(v); return v; }
    return {
      /** CPU puts a word -> TX FIFO -> OSR -> out on a pin */
      demo() {
        const s = sms[0];
        const start = new THREE.Vector3(s.x, 0.9, -4.0);
        packet(start, wp(s.tx[3]), 0x6e9bff, 0.6, () => {
          s.tx[3].material.opacity = 0.9;
          setTimeout(() => {
            s.tx[3].material.opacity = 0.25;
            packet(wp(s.tx[0]), wp(s.body), 0x6e9bff, 0.6, () => {
              tip(el, "<b>pull</b>: the word left the TX FIFO and is now in the state machine's <b>OSR</b>. Next, <b>out pins, 1</b> shifts bits out to a GPIO, one bit per instruction.");
              let n = 0;
              const bit = () => {
                if (n >= 6) { pins.forEach(p => p.material.color.set(0xa8b4be)); return; }
                const on = [1, 0, 1, 1, 0, 1][n];
                packet(wp(s.body), wp(pins[15]), on ? 0xff5a4c : 0x55636e, 0.45, () => { pins[15].material.color.set(on ? 0xff5a4c : 0x55636e); n++; setTimeout(bit, 150); });
              };
              bit();
            });
          }, 300);
        });
        tip(el, "<b>sm.put(value)</b>: the CPU drops a 32-bit word into SM0's <b>TX FIFO</b> …");
      },
      back() {
        const s = sms[1];
        packet(wp(pins[14]), wp(s.body), 0x2cd1b1, 0.6, () => {
          tip(el, "<b>in pins, 1</b> shifted the pin's level into the <b>ISR</b>. Now <b>push</b> sends the ISR to the <b>RX FIFO</b> …");
          packet(wp(s.body), wp(s.rx[0]), 0xff8a4c, 0.5, () => {
            s.rx[0].material.opacity = 0.9;
            setTimeout(() => { s.rx[0].material.opacity = 0.25; packet(wp(s.rx[3]), new THREE.Vector3(s.x, 0.9, -4.0), 0xff8a4c, 0.6, () => tip(el, "… and the CPU reads it with <b>sm.get()</b>. The CPU never had to watch the pin itself.")); }, 400);
          });
        });
        tip(el, "A button on GPIO 14: the state machine samples it …");
      },
    };
  }

  window.Scenes3D = { fsm, pio, hasGL };
})();
