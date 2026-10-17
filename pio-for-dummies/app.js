/* PIO for Dummies - chapters, widgets, simulator UI, missions, quizzes and progress. */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hex = (v, n) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(n || 8, "0");

  // ===================================================================== progress (this browser only)
  const KEY = "pio-for-dummies-v1";
  let P;
  try { P = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { P = {}; }
  P = Object.assign({ name: "", xp: 0, done: {}, quiz: {}, missions: {}, seen: {}, exam: null }, P);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* private mode */ } };
  const RANKS = [[0, "Beginner"], [100, "Gate Keeper"], [250, "Flip-Flopper"], [450, "State Shifter"], [700, "PIO Apprentice"], [1000, "PIO Programmer"], [1400, "PIO Wizard"]];
  function rank(xp) { let r = RANKS[0]; for (const x of RANKS) if (xp >= x[0]) r = x; return r; }
  function addXP(n, why) {
    P.xp += n; save(); drawXP();
    const t = h("div", { class: "note ok", style: "position:fixed;right:18px;bottom:18px;z-index:50;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.25)" }, "+" + n + " XP  " + (why || ""));
    document.body.append(t); setTimeout(() => t.remove(), 2200);
  }
  function drawXP() {
    const r = rank(P.xp), i = RANKS.indexOf(r), next = RANKS[i + 1];
    $("#rank").textContent = r[1];
    $("#xp").textContent = P.xp + " XP";
    $("#xpfill").style.width = next ? Math.round(100 * (P.xp - r[0]) / (next[0] - r[0])) + "%" : "100%";
  }
  function once(key, n, why) { if (!P.seen[key]) { P.seen[key] = 1; addXP(n, why); } }

  // theme toggle
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  // ===================================================================== quizzes
  function quiz(id, qs, onPass) {
    const box = h("div", { class: "quiz" });
    let right = 0;
    qs.forEach((q, qi) => {
      box.append(h("div", { class: "q", html: (qi + 1) + ". " + q.q }));
      const why = h("div", { class: "why" });
      let answered = false;
      q.o.forEach((o, oi) => {
        const b = h("button", { class: "opt", html: o });
        b.addEventListener("click", () => {
          if (answered) return;
          if (oi === q.a) {
            answered = true; b.classList.add("right"); right++;
            why.innerHTML = "✔ " + q.why;
            if (!P.quiz[id + ":" + qi]) { P.quiz[id + ":" + qi] = 1; addXP(20, "correct answer"); }
            if (right === qs.length) { box.append(h("div", { class: "note ok", html: "<b>All correct!</b> This chapter is complete." })); if (onPass) onPass(); }
          } else { b.classList.add("wrong"); why.innerHTML = "✘ Not this one - think again. " + (q.hint || ""); }
        });
        box.append(b);
      });
      box.append(why);
    });
    return box;
  }
  function markDone(ch) { if (!P.done[ch]) { P.done[ch] = 1; save(); addXP(50, "chapter complete"); drawRail(); } }

  // ===================================================================== small widgets
  const W = {};

  // ---- why PIO: CPU bit-banging vs PIO (jitter)
  W.jitter = el => {
    const cv = h("canvas", { class: "scope", style: "height:190px" });
    const btn = h("button", { class: "btn primary" }, "⚡ An interrupt arrives (USB, timer, Wi-Fi...)");
    const msg = h("p", { class: "status" }, "Both lines are sending the same bits: 1 0 1 1 0 0 1 0 ...");
    el.append(h("div", { class: "btns" }, btn), cv, msg);
    const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1];
    let t = 0, hit = -10;
    btn.addEventListener("click", () => { hit = Math.floor(t / 20) + 2; msg.innerHTML = "<b style='color:var(--danger)'>The CPU stopped to run the interrupt.</b> Its bit came out too long - a NeoPixel LED would show the wrong colour. The PIO line did not even notice."; once("jit", 10, "saw the jitter problem"); });
    function draw() {
      if (!el.isConnected) return;
      requestAnimationFrame(draw);
      t += 0.6;
      const g = cv.getContext("2d"), w = cv.width = cv.clientWidth * devicePixelRatio, hh = cv.height = cv.clientHeight * devicePixelRatio;
      g.scale(devicePixelRatio, devicePixelRatio);
      const W2 = cv.clientWidth, css = getComputedStyle(document.body);
      g.font = "13px " + css.getPropertyValue("--f-body");
      const rows = [["CPU (bit-banging)", 45, css.getPropertyValue("--sig3")], ["PIO state machine", 130, css.getPropertyValue("--sig1")]];
      rows.forEach(([name, y, col], r) => {
        g.fillStyle = css.getPropertyValue("--muted"); g.fillText(name, 8, y - 26);
        g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath();
        let x = 0, k = Math.floor(t / 20) - 12, first = true;
        let off = (t % 20) * 1.6;
        for (let i = 0; i < 40; i++) {
          const n = k + i, b = bits[((n % bits.length) + bits.length) % bits.length];
          let len = 32;
          if (r === 0 && n === hit) len = 32 * 2.6;
          const yy = y - (b ? 20 : 0);
          const xx = x - off;
          if (first) { g.moveTo(xx, yy); first = false; } else g.lineTo(xx, yy);
          g.lineTo(xx + len, yy);
          if (r === 0 && n === hit) { g.save(); g.fillStyle = "rgba(240,106,94,.18)"; g.fillRect(xx, y - 30, len, 40); g.restore(); }
          x += len;
          if (x - off > W2) break;
        }
        g.stroke();
      });
    }
    draw();
  };

  // ---- logic gates
  W.gates = el => {
    let A = 0, B = 0;
    const sw = (name, get, set) => { const b = h("button", { class: "sw" }, name + " ", h("span", { class: "bit" }, "0")); b.addEventListener("click", () => { set(get() ? 0 : 1); upd(); }); return b; };
    const sa = sw("A", () => A, v => A = v), sb = sw("B", () => B, v => B = v);
    const tbl = h("table", { class: "t", style: "max-width:520px" });
    const G = [["AND", (a, b) => a & b, "1 only if A AND B are 1"], ["OR", (a, b) => a | b, "1 if A OR B (or both) is 1"], ["XOR", (a, b) => a ^ b, "1 if A and B are different"], ["NOT A", a => 1 - a, "the opposite of A"], ["NAND", (a, b) => 1 - (a & b), "NOT AND - every other gate can be built from NANDs"]];
    tbl.innerHTML = "<tr><th>Gate</th><th>Output</th><th>Rule</th></tr>" + G.map(g => "<tr><td><b>" + g[0] + "</b></td><td><span class='led g'></span> <span class='mono'></span></td><td>" + g[2] + "</td></tr>").join("");
    el.append(h("div", { class: "btns" }, sa, sb), tbl);
    function upd() {
      [sa, sb].forEach((b, i) => { const v = i ? B : A; b.classList.toggle("on", !!v); $(".bit", b).textContent = v; });
      $$("tr", tbl).slice(1).forEach((tr, i) => { const v = G[i][1](A, B); $(".led", tr).classList.toggle("on", !!v); $(".mono", tr).textContent = v; });
      once("gates", 10, "played with gates");
    }
    upd(); P.seen.gates = P.seen.gates || 0;
  };

  // ---- D flip-flop
  W.dff = el => {
    let D = 0, Q = 0, hist = [];
    const sd = h("button", { class: "sw" }, "D (data) ", h("span", { class: "bit" }, "0"));
    const ck = h("button", { class: "btn primary" }, "⤒ Clock edge");
    const q = h("span", {}, h("span", { class: "led g" }), " Q = ", h("b", { class: "mono" }, "0"));
    const svg = h("div");
    const say = h("p", { class: "status" }, "Change D as often as you like - Q does not care. Then press Clock.");
    el.append(h("div", { class: "btns" }, sd, ck, q), svg, say);
    sd.addEventListener("click", () => { D ^= 1; hist.push({ D, clk: 0, Q }); upd("D changed to " + D + ". Q still shows " + Q + " - it is waiting for a clock edge."); });
    ck.addEventListener("click", () => { Q = D; hist.push({ D, clk: 1, Q }); upd("Clock edge! Q copied D, so Q = " + Q + ". Q will now keep this value - it REMEMBERS - until the next edge."); once("dff", 10, "clocked a flip-flop"); });
    function upd(m) {
      if (hist.length > 14) hist = hist.slice(-14);
      sd.classList.toggle("on", !!D); $(".bit", sd).textContent = D;
      $(".led", q).classList.toggle("on", !!Q); $("b", q).textContent = Q;
      if (m) say.textContent = m;
      const n = hist.length, cw = 38, rows = [["D", "D", "var(--sig2)"], ["CLK", "clk", "var(--sig4)"], ["Q", "Q", "var(--sig1)"]];
      let s = "<svg class='wave' viewBox='0 0 " + (60 + 14 * cw) + " 130'>";
      rows.forEach(([lab, key, col], r) => {
        const y0 = 30 + r * 38;
        s += "<text x='4' y='" + (y0 + 4) + "' fill='currentColor' font-size='13'>" + lab + "</text>";
        let path = "", prev = null;
        hist.forEach((e, i) => {
          const x = 50 + i * cw, v = key === "clk" ? 0 : e[key], y = y0 + (v ? -12 : 10);
          if (key === "clk") { path += (i ? "L" : "M") + x + " " + (y0 + 10) + (e.clk ? " L" + (x + 6) + " " + (y0 + 10) + " L" + (x + 6) + " " + (y0 - 12) + " L" + (x + 20) + " " + (y0 - 12) + " L" + (x + 20) + " " + (y0 + 10) : "") + " L" + (x + cw) + " " + (y0 + 10); return; }
          path += (prev === null ? "M" : "L") + x + " " + y + " L" + (x + cw) + " " + y; prev = v;
        });
        s += "<path d='" + path + "' fill='none' stroke='" + col + "' stroke-width='2.5'/>";
      });
      s += "</svg>";
      svg.innerHTML = s;
    }
    hist.push({ D, clk: 0, Q }); upd();
  };

  // ---- 3-bit counter
  W.counter = el => {
    let n = 0, timer = null;
    const leds = [2, 1, 0].map(i => h("span", { class: "pin" }, h("span", { class: "led g" }), "Q" + i));
    const dec = h("b", { class: "mono", style: "font-size:28px" }, "0");
    const ck = h("button", { class: "btn primary" }, "⤒ Clock edge");
    const auto = h("button", { class: "btn" }, "▶ Auto clock");
    const say = h("p", { class: "status" });
    el.append(h("div", { class: "pinsrow" }, ...leds, h("span", {}, " = "), dec), h("div", { class: "btns" }, ck, auto), say);
    function upd() { leds.forEach((l, i) => $(".led", l).classList.toggle("on", !!((n >> (2 - i)) & 1))); dec.textContent = n; say.innerHTML = "State <b>" + n + "</b> (binary <span class='mono'>" + n.toString(2).padStart(3, "0") + "</span>). The next-state logic says: next = " + ((n + 1) % 8) + "."; }
    const tick = () => { n = (n + 1) % 8; upd(); once("counter", 10, "counted with flip-flops"); };
    ck.addEventListener("click", tick);
    auto.addEventListener("click", () => { if (timer) { clearInterval(timer); timer = null; auto.textContent = "▶ Auto clock"; } else { timer = setInterval(() => { if (!el.isConnected) return clearInterval(timer); tick(); }, 700); auto.textContent = "❚❚ Stop"; } });
    upd();
  };

  // ---- FSM block diagram (SVG)
  W.fsmBlock = el => {
    el.innerHTML = `<svg viewBox="0 0 760 250" class="wave" role="img" aria-label="Block diagram of a state machine">
      <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
      <g fill="none" stroke="currentColor" stroke-width="2">
        <rect x="150" y="60" width="160" height="80" rx="10" stroke="var(--copper)"/>
        <rect x="380" y="60" width="160" height="80" rx="10" stroke="var(--sig2)"/>
        <rect x="610" y="60" width="130" height="80" rx="10" stroke="var(--sig1)"/>
        <path d="M30 100H150" marker-end="url(#ar)"/>
        <path d="M310 100H380" marker-end="url(#ar)" class="flow"/>
        <path d="M540 100H610" marker-end="url(#ar)" class="flow"/>
        <path d="M740 100H756" />
        <path d="M460 140V200H230V140" marker-end="url(#ar)" stroke="var(--copper)" class="flow"/>
        <path d="M460 230V140" marker-end="url(#ar)" stroke="var(--sig4)"/>
      </g>
      <g fill="currentColor" font-size="15" text-anchor="middle">
        <text x="80" y="90">inputs</text>
        <text x="230" y="96" font-weight="700">Next-state</text><text x="230" y="116">logic (gates)</text>
        <text x="460" y="96" font-weight="700">State register</text><text x="460" y="116">(flip-flops)</text>
        <text x="675" y="96" font-weight="700">Output</text><text x="675" y="116">logic → outputs</text>
        <text x="345" y="215" font-size="13">present state is fed back</text>
        <text x="510" y="244" font-size="13">clock</text>
      </g>
      <style>.flow{stroke-dasharray:6 6;animation:dash 1s linear infinite}@keyframes dash{to{stroke-dashoffset:-12}}</style>
    </svg>`;
  };

  // ---- 3D turnstile
  W.turnstile = el => {
    const stage = h("div");
    const coin = h("button", { class: "btn" }, "🪙 Insert coin");
    const push = h("button", { class: "btn" }, "✋ Push the arm");
    const tick = h("button", { class: "btn primary" }, "⤒ Clock tick");
    const auto = h("label", {}, h("input", { type: "checkbox" }), " clock ticks by itself");
    const state = h("p", { class: "status" });
    const tbl = h("table", { class: "t", style: "max-width:600px" });
    const rows = [["L", "coin", "U", "unlock"], ["L", "push", "L", "stay locked"], ["U", "push", "L", "let one person through, lock again"], ["U", "coin", "U", "already free (coin wasted)"]];
    const name = { L: "LOCKED (0)", U: "UNLOCKED (1)" };
    tbl.innerHTML = "<tr><th>Present state</th><th>Input</th><th>Next state</th><th>What happens</th></tr>" + rows.map(r => `<tr><td>${name[r[0]]}</td><td>${r[1]}</td><td>${name[r[2]]}</td><td>${r[3]}</td></tr>`).join("");
    el.append(stage, h("div", { class: "btns" }, coin, push, tick, auto), state, tbl);
    stage.style.height = "440px";
    const fsm = Scenes3D.fsm(stage, {
      states: [{ id: "L", name: "LOCKED", color: 0xe23b2e, x: -3.6, z: 0.8, info: "The arm will not turn. Output: lock ON." }, { id: "U", name: "UNLOCKED", color: 0x2ecc71, x: 3.6, z: 0.8, info: "One person may push through. Output: lock OFF." }],
      edges: [{ from: "L", to: "U", label: "coin" }, { from: "U", to: "L", label: "push" }, { from: "L", to: "L", label: "push" }, { from: "U", to: "U", label: "coin" }],
      start: "L", prop: "turnstile", bits: 1, code: { L: "0", U: "1" },
      hint: "A <b>turnstile</b> at a metro gate is a state machine with 2 states. Choose an input, then let the <b>clock tick</b>. Drag to look around; the box row behind is the real hardware.",
    });
    let input = null, timer = null;
    function show(m) {
      const cur = fsm.state;
      state.innerHTML = "Present state: <b>" + name[cur] + "</b>. Input waiting: <b>" + (input || "none") + "</b>. " + (m || "");
      $$("tr", tbl).forEach((tr, i) => tr.classList.toggle("hit", i > 0 && rows[i - 1][0] === cur && rows[i - 1][1] === input));
    }
    coin.addEventListener("click", () => { input = "coin"; show("It will be read at the next clock edge."); });
    push.addEventListener("click", () => { input = "push"; show("It will be read at the next clock edge."); });
    function doTick() {
      if (fsm.busy && fsm.busy()) return;
      const cur = fsm.state;
      if (!input) { fsm.step(cur, null, () => show("Clock tick with no input: the state stays the same.")); return; }
      const r = rows.find(x => x[0] === cur && x[1] === input);
      const used = input; input = null;
      fsm.step(r[2], used, () => { show("Clock edge: state became " + name[r[2]] + " - " + r[3] + "."); once("turnstile", 15, "drove the 3D state machine"); });
      show("Clock edge! Reading input " + used + " …");
    }
    tick.addEventListener("click", doTick);
    $("input", auto).addEventListener("change", e => {
      if (e.target.checked) timer = setInterval(() => { if (!el.isConnected) return clearInterval(timer); doTick(); }, 1800);
      else { clearInterval(timer); timer = null; }
    });
    show();
  };

  // ---- 3D traffic light (Moore machine with a counter)
  W.traffic = el => {
    const stage = h("div"); stage.style.height = "420px";
    const run = h("button", { class: "btn primary" }, "▶ Run the clock");
    const step = h("button", { class: "btn" }, "⤒ One tick");
    const say = h("p", { class: "status" });
    el.append(stage, h("div", { class: "btns" }, run, step), say);
    const fsm = Scenes3D.fsm(stage, {
      states: [{ id: "G", name: "GREEN", color: 0x2ecc71, x: 0, z: -4.2 }, { id: "Y", name: "YELLOW", color: 0xf1c40f, x: 3.9, z: 2.4 }, { id: "R", name: "RED", color: 0xe23b2e, x: -3.9, z: 2.4 }],
      edges: [{ from: "G", to: "Y", label: "count = 4" }, { from: "Y", to: "R", label: "count = 1" }, { from: "R", to: "G", label: "count = 3" }],
      start: "G", prop: "traffic", bits: 2, code: { G: "00", Y: "01", R: "10" },
      hint: "A <b>Moore machine</b>: the lamps (outputs) depend only on the state. A small counter decides how many clock ticks to stay in each state - exactly what PIO's <b>delay</b> and <b>X/Y loops</b> do.",
    });
    const hold = { G: 4, Y: 1, R: 3 }, nxt = { G: "Y", Y: "R", R: "G" };
    let cnt = 0, timer = null;
    function tick() {
      if (fsm.busy()) return;
      const s = fsm.state; cnt++;
      if (cnt >= hold[s]) { cnt = 0; fsm.step(nxt[s], null, upd); say.textContent = "Counter reached " + hold[s] + " → move to " + nxt[s] + "."; }
      else { upd(); }
      once("traffic", 15, "ran a Moore machine");
    }
    function upd() { const s = fsm.state; say.innerHTML = "State <b>" + s + "</b>, counter = <b>" + cnt + "</b> of " + hold[s] + " ticks."; }
    step.addEventListener("click", tick);
    run.addEventListener("click", () => { if (timer) { clearInterval(timer); timer = null; run.textContent = "▶ Run the clock"; } else { timer = setInterval(() => { if (!el.isConnected) return clearInterval(timer); tick(); }, 1000); run.textContent = "❚❚ Stop"; } });
    upd();
  };

  // ---- evolution timeline
  W.timeline = el => {
    const eras = [
      ["1960s", "Logic gates on chips", "TTL chips such as the 7400 (four NAND gates) put gates in a package. Output depends only on the inputs right now - no memory."],
      ["1960s-70s", "Flip-flops, registers, counters", "Chips like the 7474 (D flip-flops) and 7490 (counter). Now circuits can remember and count clock ticks."],
      ["1970s", "Hard-wired state machines", "Designers drew a state diagram and built it from gates + flip-flops. Every serial-port chip (UART) is such a machine - but its job is fixed forever."],
      ["1971", "The microprocessor", "Intel's 4004: one general machine that follows a program. Very flexible - but software timing wobbles when interrupts arrive."],
      ["1978-85", "Programmable logic (PAL, FPGA)", "Chips you can 'wire' with a file: build any state machine you like. Powerful, but a separate, more costly chip and harder to learn."],
      ["1980s-now", "Microcontrollers", "CPU + memory + fixed peripherals (UART, SPI, I²C, PWM, ADC) on one chip. Great - until you need a protocol nobody built in."],
      ["2021", "RP2040 PIO", "Raspberry Pi put 8 tiny programmable state machines inside the microcontroller. Each runs a short program with exact, cycle-by-cycle timing: you build the peripheral you need."],
    ];
    const box = h("div", { style: "display:grid;gap:10px" });
    eras.forEach(([when, what, why], i) => {
      box.append(h("div", { class: "card", style: "display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:start;" + (i === eras.length - 1 ? "border-color:var(--accent);border-width:2px" : "") },
        h("div", { class: "kicker" }, when), h("div", {}, h("b", {}, what), h("div", { style: "color:var(--muted)" }, why))));
    });
    el.append(box);
  };

  // ---- 3D PIO block
  W.pio3d = el => {
    const stage = h("div"); stage.style.height = "480px";
    const a = h("button", { class: "btn primary" }, "▶ Follow data: CPU → pin");
    const b = h("button", { class: "btn" }, "▶ Follow data: pin → CPU");
    el.append(stage, h("div", { class: "btns" }, a, b));
    const sc = Scenes3D.pio(stage);
    a.addEventListener("click", () => { sc.demo(); once("pio3d", 15, "followed data through PIO"); });
    b.addEventListener("click", () => sc.back());
  };

  // ---- clock divider calculator
  W.clock = el => {
    const inp = h("input", { type: "number", value: "2000", min: "1", style: "width:140px;font:inherit;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)" });
    const out = h("div", { class: "card" });
    el.append(h("div", { class: "btns" }, h("label", {}, "freq = ", inp, " Hz  (system clock 125 MHz)")), out);
    function upd() {
      const f = +inp.value, div = 125e6 / f;
      const t = 1 / f;
      const fmt = s => s >= 1e-3 ? (s * 1e3).toPrecision(3) + " ms" : s >= 1e-6 ? (s * 1e6).toPrecision(3) + " µs" : (s * 1e9).toPrecision(3) + " ns";
      let warn = "";
      if (div > 65536) warn = "<div class='note bad'>Too slow! The divider can be at most 65536, so the lowest freq is about <b>1908 Hz</b>. For slower things, use delays and loops.</div>";
      if (div < 1) warn = "<div class='note bad'>Too fast! A state machine cannot run faster than the system clock.</div>";
      out.innerHTML = "Clock divider = 125 000 000 ÷ " + f + " = <b>" + div.toFixed(2) + "</b><br>One instruction (one cycle) takes <b>" + fmt(t) + "</b>.<br>A program of 20 cycles takes " + fmt(20 * t) + "." + warn;
    }
    inp.addEventListener("input", upd); upd();
  };

  // ---- instruction cards
  const INSTR = [
    ["JMP", "Jump - go to another line (maybe only if a condition is true).", "jmp loop\njmp x--, loop\njmp pin, high", 'jmp("loop")\njmp(x_dec, "loop")\njmp(pin, "high")', "Conditions: !x (X is 0), x-- (X not 0, then X - 1), !y, y--, x!=y, pin (jmp pin is 1), !osre (OSR still has bits). x-- is how PIO counts loops."],
    ["WAIT", "Stall until a pin or an IRQ flag has a level.", "wait 1 pin 0\nwait 0 gpio 14\nwait 1 irq 3", "wait(1, pin, 0)\nwait(0, gpio, 14)\nwait(1, irq, 3)", "'pin' counts from in_base; 'gpio' is the real GPIO number. Use it to wait for a button, a clock edge or another state machine."],
    ["IN", "Shift bits INTO the ISR (input shift register).", "in pins, 1\nin x, 8", "in_(pins, 1)\nin_(x, 8)", "Sources: pins, x, y, null (zeros), isr, osr. Collect bits here, then push them to the CPU. (In MicroPython it is in_ because 'in' is a Python word.)"],
    ["OUT", "Shift bits OUT of the OSR (output shift register) to somewhere.", "out pins, 1\nout x, 5", "out(pins, 1)\nout(x, 5)", "Destinations: pins, x, y, null, pindirs, pc, isr, exec. The bit order depends on out_shiftdir (right = lowest bit first)."],
    ["PUSH", "Send the ISR to the RX FIFO, for the CPU.", "push\npush noblock\npush iffull", "push()\npush(noblock)\npush(iffull)", "Blocks (waits) if the RX FIFO is full - the CPU must read with sm.get(). The ISR is cleared after a push."],
    ["PULL", "Take the next word from the TX FIFO into the OSR.", "pull\npull noblock\npull ifempty", "pull()\npull(noblock)\npull(ifempty)", "Blocks (waits) while the TX FIFO is empty - until the CPU calls sm.put(). 'pull noblock' on an empty FIFO copies X into the OSR instead."],
    ["MOV", "Copy from a source to a destination, optionally inverted (!) or bit-reversed (::).", "mov x, osr\nmov pins, !x\nmov isr, ::x", "mov(x, osr)\nmov(pins, invert(x))\nmov(isr, reverse(x))", "Destinations: pins, x, y, exec, pc, isr, osr. Sources: pins, x, y, null, status, isr, osr. 'nop' is really mov y, y."],
    ["IRQ", "Set or clear one of the 8 IRQ flags (to signal the CPU or another SM).", "irq 0\nirq wait 1\nirq clear 2", "irq(0)\nirq(block, 1)\nirq(clear, 2)", "'irq wait' sets the flag and waits until someone clears it - a handshake. MicroPython can run a Python function: sm.irq(handler)."],
    ["SET", "Put a small number (0-31) straight into pins, pindirs, X or Y.", "set pins, 1\nset pindirs, 1\nset x, 7", "set(pins, 1)\nset(pindirs, 1)\nset(x, 7)", "The simplest instruction. 'set pins' controls up to 5 pins starting at set_base. Only 5 bits: for bigger numbers use pull/out."],
  ];
  W.icards = el => {
    const g = h("div", { class: "icards" });
    INSTR.forEach(([n, does, asm, mp, more]) => g.append(h("div", { class: "icard" }, h("h4", {}, n), h("div", { class: "does" }, does),
      h("div", { class: "tabs2" }, h("span", { class: "tag" }, "assembly")), h("pre", {}, asm), h("div", { class: "tabs2" }, h("span", { class: "tag" }, "MicroPython")), h("pre", {}, mp), h("div", { style: "font-size:14.5px;color:var(--muted)" }, more))));
    el.append(g, h("div", { class: "note", html: "<b>Every instruction can also carry:</b> a <b>delay</b> <code>[n]</code> - wait n more cycles after it, and a <b>side-set</b> <code>side 1</code> - change a few pins at the same moment, for free. <code>nop</code> means do nothing for one cycle (useful with a delay)." }));
  };

  // ===================================================================== simulator UI
  const GROUPS = {
    led: (gp) => ({ gpio: gp, kind: "led", label: "GP" + gp }),
  };
  function parseValue(s) {
    s = String(s).trim();
    if (/^'.'$|^".+"$/.test(s) || (s.length === 1 && !/\d/.test(s))) return s.replace(/^['"]|['"]$/g, "").split("").map(c => c.charCodeAt(0));
    if (/^0x[0-9a-f]+$/i.test(s)) return [parseInt(s, 16) >>> 0];
    if (/^0b[01]+$/i.test(s)) return [parseInt(s.slice(2), 2) >>> 0];
    if (/^\d+$/.test(s)) return [parseInt(s, 10) >>> 0];
    return null;
  }

  /**
   * SimUI(el, opts)
   *   opts.code, opts.cfg (StateMachine config), opts.pins [{gpio, kind:"led"|"button"}], opts.bar [gpio...] (LED bar),
   *   opts.cpu (show put/get), opts.watch [gpio...] for the scope, opts.readOnly, opts.compact, opts.onChange(code)
   */
  function SimUI(el, opts) {
    const ui = {}; let prog = null, sm = null, running = false, speed = opts.speed || 8, acc = 0, last = 0, hist = [], syntax = "asm", inputs = {};
    const ta = h("textarea", { spellcheck: "false", "aria-label": "PIO program" });
    ta.value = opts.code || "";
    if (opts.readOnly) ta.readOnly = true;
    const gut = h("div", { class: "gut" }), pcl = h("div", { class: "pcline" });
    const area = h("div", { class: "area" }, pcl, ta);
    const ed = h("div", { class: "editor" }, gut, area);
    if (opts.height) ed.style.height = opts.height + "px";
    const errs = h("div", { class: "errs" });
    const bAsm = h("button", { class: "on" }, "Assembly"), bMp = h("button", {}, "MicroPython");
    const synTabs = h("div", { class: "tabs2" }, bAsm, bMp);
    const bReset = h("button", { class: "btn small" }, "⟲ Reset"), bStep = h("button", { class: "btn small" }, "Step 1 cycle"), bRun = h("button", { class: "btn small primary" }, "▶ Run");
    const sp = h("select", { style: "font:inherit;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)" });
    [[2, "slow"], [8, "normal"], [40, "fast"], [400, "very fast"]].forEach(([v, t]) => sp.append(h("option", { value: v }, t)));
    sp.value = String(speed);
    sp.addEventListener("change", () => speed = +sp.value);
    const status = h("div", { class: "status" });
    const regs = h("div", { class: "regs" });
    const pinsRow = h("div", { class: "pinsrow" });
    const scope = h("canvas", { class: "scope" });
    const left = h("div", {}, opts.readOnly ? null : synTabs, ed, errs);
    const ctrl = h("div", { class: "ctrl" }, bReset, bStep, bRun, h("label", {}, "speed ", sp));
    const right = h("div", { class: "machine" }, ctrl, status, regs, pinsRow, scope);
    let cpuBox = null;
    if (opts.cpu) {
      const vin = h("input", { value: opts.cpuDefault || "0xA5", style: "width:110px;font:14px var(--f-mono);padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)" });
      const put = h("button", { class: "btn small" }, "sm.put()"), get = h("button", { class: "btn small" }, "sm.get()");
      const got = h("div", { class: "mono", style: "font-size:13px;min-height:20px" });
      put.addEventListener("click", () => {
        if (!sm) reset();
        const vals = parseValue(vin.value); if (!vals) { got.textContent = "Type a number like 165, 0xA5, 0b1010 or a letter like 'P'"; return; }
        let n = 0; for (const v of vals) if (sm.put(v)) n++;
        got.textContent = n < vals.length ? "TX FIFO full - only " + n + " word(s) went in. (On a real Pico, sm.put() would wait.)" : "put " + vals.map(v => hex(v, 2)).join(", ");
        paint();
      });
      get.addEventListener("click", () => { if (!sm) return; const v = sm.get(); got.textContent = v === undefined ? "RX FIFO is empty (on a real Pico, sm.get() would wait)" : "sm.get() → " + v + "  (" + hex(v) + ")"; paint(); });
      cpuBox = h("div", { class: "card", style: "margin-top:8px" }, h("b", {}, "CPU (your MicroPython code)"), h("div", { class: "btns" }, vin, put, get), got);
      right.append(cpuBox);
    }
    const mpOut = h("pre", { class: "code", style: "display:none" });
    el.append(h("div", { class: "sim" }, left, right));

    function lines() { return ta.value.split("\n").length; }
    function drawGutter(errLines) {
      gut.innerHTML = "";
      for (let i = 1; i <= lines(); i++) gut.append(h("div", { class: errLines && errLines.has(i) ? "err" : "" }, String(i)));
      gut.scrollTop = ta.scrollTop;
    }
    ta.addEventListener("scroll", () => { gut.scrollTop = ta.scrollTop; placePc(); });
    function compile() {
      prog = PIO.assemble(ta.value);
      const errLines = new Set(prog.errors.map(e => e.line));
      drawGutter(errLines);
      errs.innerHTML = prog.errors.length ? prog.errors.slice(0, 4).map(e => "Line " + e.line + ": " + esc(e.msg)).join("<br>") : "";
      return prog;
    }
    ta.addEventListener("input", () => { compile(); stop(); sm = null; hist = []; paint(); if (opts.onChange) opts.onChange(ta.value); });
    ta.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("    ", s, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } });
    function setSyntax(s) {
      const p = compile(); if (p.errors.length) { errs.innerHTML = "Fix the errors first, then switch."; return; }
      syntax = s; bAsm.classList.toggle("on", s === "asm"); bMp.classList.toggle("on", s === "mp");
      const keepComments = s === "asm" ? PIO.toAsm(p) : PIO.toMicroPython(p).map(l => "    " + l);
      ta.value = (s === "mp" ? "# MicroPython syntax (paste inside your @rp2.asm_pio function)\n" : "") + keepComments.join("\n");
      ta.dispatchEvent(new Event("input"));
    }
    bAsm.addEventListener("click", () => syntax !== "asm" && setSyntax("asm"));
    bMp.addEventListener("click", () => syntax !== "mp" && setSyntax("mp"));

    // pins
    const pinEls = {};
    (opts.pins || []).forEach(p => {
      if (p.kind === "button") {
        const b = h("button", { class: "pushbtn", title: "press and hold" }, "GP" + p.gpio);
        const dn = e => { e.preventDefault(); inputs[p.gpio] = 1; b.classList.add("down"); paint(); };
        const up = () => { inputs[p.gpio] = 0; b.classList.remove("down"); paint(); };
        b.addEventListener("pointerdown", dn); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up);
        pinsRow.append(h("div", { class: "pin" }, b, p.label || "button"));
      } else {
        const l = h("span", { class: "led" });
        pinEls[p.gpio] = l;
        pinsRow.append(h("div", { class: "pin" }, l, p.label || "GP" + p.gpio));
      }
    });
    if (opts.bar) {
      const bar = h("div", { class: "pin" });
      const row = h("div", { style: "display:flex;gap:4px" });
      opts.bar.slice().reverse().forEach(g => { const l = h("span", { class: "led" }); pinEls[g] = l; row.append(h("div", { class: "pin" }, l, String(g))); });
      bar.append(row, "GP7 … GP0  (value: ", h("b", { class: "mono barv" }, "0"), ")");
      pinsRow.append(bar);
    }

    function reset() {
      compile();
      sm = new PIO.StateMachine(prog, Object.assign({}, opts.cfg, prog.mp || {}));
      sm.input = g => inputs[g] || 0;
      hist = [];
      paint();
    }
    function stepN(n) {
      if (!sm) reset();
      if (prog.errors.length) { stop(); errs.innerHTML = "Fix the errors before running.<br>" + errs.innerHTML; return; }
      for (let i = 0; i < n; i++) {
        sm.step();
        const snap = {}; (opts.watch || []).forEach(g => snap[g] = sm.gpioLevel(g)); hist.push(snap);
        if (hist.length > 400) hist.shift();
      }
      paint();
    }
    function frame(now) {
      if (!running || !el.isConnected) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      acc += dt * speed;
      const n = Math.floor(acc); acc -= n;
      if (n) stepN(n);
      requestAnimationFrame(frame);
    }
    function stop() { running = false; bRun.textContent = "▶ Run"; }
    bRun.addEventListener("click", () => { if (running) return stop(); if (!sm) reset(); if (prog.errors.length) return; running = true; bRun.textContent = "❚❚ Pause"; last = performance.now(); acc = 0; requestAnimationFrame(frame); });
    bStep.addEventListener("click", () => { stop(); stepN(1); });
    bReset.addEventListener("click", () => { stop(); reset(); });

    function placePc() {
      if (!sm || !prog || !prog.instr.length) { pcl.style.display = "none"; return; }
      const ins = prog.instr[sm.delay > 0 ? sm.lastPc : sm.pc];
      if (!ins) { pcl.style.display = "none"; return; }
      pcl.style.display = "block";
      pcl.style.top = (10 + (ins.line - 1) * 22 - ta.scrollTop) + "px";
    }
    function bits32(v, used, dir) {
      const s = (v >>> 0).toString(2).padStart(32, "0");
      return "<span class='bits32'>" + s.replace(/(.{8})(?!$)/g, "$1 ") + "</span>";
    }
    function paint() {
      placePc();
      if (!sm) { regs.innerHTML = ""; status.textContent = prog && prog.errors.length ? "" : "Press Step or Run. Each step = one clock cycle."; drawScope(); paintPins(null); return; }
      const ins = prog.instr[sm.pc];
      status.className = "status" + (sm.stalled ? " stall" : "");
      status.innerHTML = "Cycle <b>" + sm.cycle + "</b> · " + (sm.stalled ? "⏸ stalled: " + esc(sm.stallReason) : sm.delay > 0 ? "delay: " + sm.delay + " more cycle(s)" : "next: <span class='mono'>" + esc(ins ? ins.text : "") + "</span>");
      const fifo = (arr, n) => "<div class='fifo'>" + Array.from({ length: 4 }, (_, i) => "<span class='" + (i < arr.length ? "full" : "") + "'>" + (i < arr.length ? hex(arr[i], 2).slice(0, 6) : "") + "</span>").join("") + "</div>";
      regs.innerHTML =
        "<div class='reg'><div class='l'>PC</div><div class='v'>" + sm.pc + "</div></div>" +
        "<div class='reg'><div class='l'>X</div><div class='v'>" + sm.x + "</div></div>" +
        "<div class='reg'><div class='l'>Y</div><div class='v'>" + sm.y + "</div></div>" +
        "<div class='reg'><div class='l'>DELAY</div><div class='v'>" + sm.delay + "</div></div>" +
        "<div class='reg wide'><div class='l'>OSR · " + (32 - sm.osrCount) + " bits left (shift " + sm.cfg.outShift + ")</div>" + bits32(sm.osr) + "</div>" +
        "<div class='reg wide'><div class='l'>ISR · " + sm.isrCount + " bits in (shift " + sm.cfg.inShift + ")</div>" + bits32(sm.isr) + "</div>" +
        "<div class='reg wide'><div class='l'>TX FIFO (CPU → SM)</div>" + fifo(sm.tx) + "</div>" +
        "<div class='reg wide'><div class='l'>RX FIFO (SM → CPU)</div>" + fifo(sm.rx) + "</div>";
      paintPins(sm); drawScope();
    }
    function paintPins(s) {
      for (const g in pinEls) {
        const on = s ? (((s.pindirs >>> g) & 1) && ((s.pins >>> g) & 1)) : 0;
        pinEls[g].classList.toggle("on", !!on);
        pinEls[g].title = s && !((s.pindirs >>> g) & 1) ? "GP" + g + " is an INPUT (pindir 0) - it cannot light an LED" : "";
        pinEls[g].style.opacity = s && !((s.pindirs >>> g) & 1) ? 0.45 : 1;
      }
      if (opts.bar) { const v = s ? opts.bar.reduce((a, g, i) => a | ((((s.pindirs >>> g) & (s.pins >>> g)) & 1) << i), 0) : 0; const b = $(".barv", pinsRow); if (b) b.textContent = v + " = " + hex(v, 2); }
    }
    function drawScope() {
      const w = scope.clientWidth, hh = scope.clientHeight; if (!w) return;
      scope.width = w * devicePixelRatio; scope.height = hh * devicePixelRatio;
      const g = scope.getContext("2d"); g.scale(devicePixelRatio, devicePixelRatio);
      const css = getComputedStyle(document.body), cols = ["--sig1", "--sig2", "--sig3", "--sig4"].map(v => css.getPropertyValue(v));
      const ws = opts.watch || [], n = 160, dx = (w - 60) / n;
      g.font = "12px " + css.getPropertyValue("--f-mono"); g.fillStyle = css.getPropertyValue("--muted");
      g.fillText("last " + n + " cycles", w - 110, 12);
      const rowH = Math.min(46, (hh - 14) / Math.max(1, ws.length));
      ws.forEach((gp, r) => {
        const y0 = 18 + r * rowH, hi = y0 + 4, lo = y0 + rowH - 10;
        g.fillStyle = css.getPropertyValue("--muted"); g.fillText("GP" + gp, 4, (hi + lo) / 2 + 4);
        g.strokeStyle = cols[r % 4]; g.lineWidth = 2; g.beginPath();
        const seg = hist.slice(-n);
        seg.forEach((s, i) => { const x = 50 + i * dx, y = s[gp] ? hi : lo; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); g.lineTo(x + dx, y); });
        g.stroke();
      });
      if (!ws.length) { g.fillStyle = css.getPropertyValue("--muted"); g.fillText("(no pins watched)", 10, 40); }
    }
    new ResizeObserver(() => drawScope()).observe(scope);
    compile(); paint();
    ui.getCode = () => ta.value;
    ui.setCode = c => { ta.value = c; ta.dispatchEvent(new Event("input")); };
    ui.prog = () => compile();
    ui.stop = stop;
    ui.toMp = () => { const p = compile(); return p.errors.length ? null : p; };
    return ui;
  }

  // ===================================================================== missions
  const LED = 15, BTN = 14, UARTPIN = 4;
  function runHeadless(code, cfg, scenario, cycles) {
    const prog = PIO.assemble(code);
    if (prog.errors.length) return { prog, error: "Your program has errors: line " + prog.errors[0].line + ": " + prog.errors[0].msg };
    const sm = new PIO.StateMachine(prog, Object.assign({}, cfg, prog.mp || {}));
    const tr = { pins: [], dirs: [], rx: [], drainedAt: [] };
    if (scenario && scenario.init) scenario.init(sm);
    sm.input = (g, c) => scenario && scenario.input ? scenario.input(g, c) : 0;
    for (let i = 0; i < cycles; i++) {
      if (scenario && scenario.each) scenario.each(sm, i, tr);
      sm.step();
      tr.pins.push(sm.pins); tr.dirs.push(sm.pindirs);
    }
    return { prog, sm, tr };
  }
  const lvl = (tr, g) => tr.pins.map((p, i) => ((tr.dirs[i] >>> g) & 1) ? (p >>> g) & 1 : 0);
  function runsOf(a) { const r = []; let v = a[0], c = 0; for (const x of a) { if (x === v) c++; else { r.push([v, c]); v = x; c = 1; } } r.push([v, c]); return r; }
  function decodeUart(a, bit) {
    const out = []; let i = 1;
    while (i < a.length - bit * 10) {
      if (a[i - 1] === 1 && a[i] === 0) {
        let b = 0; for (let k = 0; k < 8; k++) b |= a[i + Math.floor(bit * (1.5 + k))] << k;
        const stop = a[i + Math.floor(bit * 9.5)];
        out.push({ b, stop }); i += bit * 9 + Math.floor(bit / 2);
      } else i++;
    }
    return out;
  }

  const MISSIONS = [
    {
      id: "m1", title: "Lights on!", learn: "SET, pindirs", target: 2,
      goal: "Switch ON the LED on <b>GP15</b> and keep it on.",
      story: "A brand-new pin is an <b>input</b> - it only listens. To drive an LED it must become an <b>output</b> first (<code>pindirs</code> = pin directions). Then set its value to 1.",
      code: "; Mission 1: switch the LED on GP15 on.\n; A new pin starts as an INPUT. Make it an output first,\n; then make it 1 (3.3 V).\nset pindirs, ???\nset pins, ???\n",
      solution: "set pindirs, 1\nset pins, 1\n",
      hints: ["<code>???</code> must be numbers. 1 means output / high, 0 means input / low.", "Both lines need a 1.", "Answer: <code>set pindirs, 1</code> then <code>set pins, 1</code>."],
      cfg: { setBase: LED, setCount: 1 }, pins: [{ gpio: LED, kind: "led" }], watch: [LED], cycles: 60,
      check(r) { const a = lvl(r.tr, LED); if (a.slice(-30).every(v => v === 1)) return [true, "The LED is on. You just wrote your first PIO program!"]; if (!((r.sm.pindirs >>> LED) & 1)) return [false, "GP15 is still an input - check the pindirs line."]; return [false, "GP15 is an output but not 1 - check the pins line."]; },
      mp: { deco: "", sm: "freq=2000, set_base=Pin(15)", after: "" },
    },
    {
      id: "m2", title: "Blink", learn: "delay [n], wrap", target: 2,
      goal: "Make GP15 <b>ON for exactly 10 cycles, then OFF for exactly 10 cycles</b>, forever.",
      story: "Every instruction takes 1 clock cycle. Writing <code>[n]</code> after an instruction makes the state machine wait <b>n more</b> cycles. At the end of the program it jumps back to the top by itself - this is called <b>wrap</b>, and it costs no time.",
      code: "; Mission 2: ON for 10 cycles, OFF for 10 cycles, forever.\n; (GP15 is already an output here - set_init does that.)\n; An instruction takes 1 cycle; [n] adds n more cycles.\nset pins, 1\nset pins, 0\n",
      solution: "set pins, 1 [9]\nset pins, 0 [9]\n",
      hints: ["Right now each line lasts 1 cycle. You need 10.", "1 cycle for the instruction + 9 cycles of delay = 10.", "Answer: <code>set pins, 1 [9]</code> and <code>set pins, 0 [9]</code>."],
      cfg: { setBase: LED, setCount: 1, initPindirs: 1 << LED }, pins: [{ gpio: LED, kind: "led" }], watch: [LED], cycles: 200,
      check(r) {
        const rs = runsOf(lvl(r.tr, LED)).slice(1, -1);
        if (rs.length < 6) return [false, "The LED is not blinking - it must change between 1 and 0."];
        const bad = rs.find(x => x[1] !== 10);
        if (bad) return [false, "One " + (bad[0] ? "ON" : "OFF") + " time lasted " + bad[1] + " cycles. Both must be exactly 10."];
        return [true, "Perfect 10 + 10 cycles. On a real Pico at freq=2000 that is 5 ms + 5 ms: 100 blinks a second."];
      },
      mp: { deco: "set_init=rp2.PIO.OUT_LOW", sm: "freq=2000, set_base=Pin(15)", after: "# At freq=2000 one cycle is 0.5 ms: 10+10 cycles = 100 blinks a second (looks dimly lit)." },
    },
    {
      id: "m3", title: "Exactly 5 flashes", learn: "X register, jmp x--", target: 5,
      goal: "Flash GP15 <b>exactly 5 times</b>, then stay OFF for ever.",
      story: "The state machine has two scratch registers, <b>X</b> and <b>Y</b>, to count with. <code>jmp x--, label</code> means: <i>if X is not 0, jump to label</i> - and X goes down by 1 every time. So the loop body runs <b>X + 1</b> times.",
      code: "; Mission 3: flash GP15 exactly 5 times, then stop.\n; jmp x--, flash : if X is not 0, jump to flash (and X = X - 1)\n    set x, ???        ; how many times should we go round AGAIN?\nflash:\n    set pins, 1 [2]\n    set pins, 0 [2]\n    jmp x--, flash\nstop:\n    jmp stop          ; park here for ever\n",
      solution: "    set x, 4\nflash:\n    set pins, 1 [2]\n    set pins, 0 [2]\n    jmp x--, flash\nstop:\n    jmp stop\n",
      hints: ["The body runs once, and then once more for every time the jump is taken.", "With X = 0 you get 1 flash. With X = 1 you get 2 flashes…", "Answer: <code>set x, 4</code> → 5 flashes."],
      cfg: { setBase: LED, setCount: 1, initPindirs: 1 << LED }, pins: [{ gpio: LED, kind: "led" }], watch: [LED], cycles: 400,
      check(r) {
        const a = lvl(r.tr, LED), n = runsOf(a).filter(x => x[0] === 1).length;
        if (a.slice(-200).some(v => v)) return [false, "The LED must stay OFF after the flashes - " + n + " flashes so far and still going. Did you keep the 'stop' loop?"];
        if (n !== 5) return [false, "I counted " + n + " flash" + (n === 1 ? "" : "es") + ". Change the number in set x."];
        return [true, "Exactly 5! X counted the loops for you: 4, 3, 2, 1, 0 - stop."];
      },
      mp: { deco: "set_init=rp2.PIO.OUT_LOW", sm: "freq=2000, set_base=Pin(15)", after: "# 5 flashes of 3 ms each - put bigger delays/loops in to see them on a real LED." },
    },
    {
      id: "m4", title: "Slow blink", learn: "loops for long delays", target: 6,
      goal: "GP15 <b>ON for exactly 100 cycles, OFF for exactly 100 cycles</b>, forever.",
      story: "The biggest delay is <code>[31]</code> (5 bits). For longer times, wait inside a <b>loop</b>: <code>jmp x--, label [n]</code> jumping to itself takes <b>(X + 1) × (n + 1)</b> cycles. Remember the other instructions take 1 cycle each too!",
      code: "; Mission 4: ON for 100 cycles, OFF for 100 cycles, forever.\n; A loop 'here: jmp x--, here [n]' takes (X+1)*(n+1) cycles.\n.wrap_target\n    set pins, 1\n    set x, ???\non:\n    jmp x--, on [?]\n    set pins, 0\n    set x, ???\noff:\n    jmp x--, off [?]\n.wrap\n",
      solution: ".wrap_target\n    set pins, 1\n    set x, 13\non:\n    jmp x--, on [6]\n    set pins, 0\n    set x, 13\noff:\n    jmp x--, off [6]\n.wrap\n",
      hints: ["Each half has 2 single-cycle instructions (set pins, set x) + the loop. So the loop must take 98 cycles.", "98 = 14 × 7. So (X+1) = 14 and (n+1) = 7.", "Answer: <code>set x, 13</code> and <code>jmp x--, on [6]</code> (and the same for off)."],
      cfg: { setBase: LED, setCount: 1, initPindirs: 1 << LED }, pins: [{ gpio: LED, kind: "led" }], watch: [LED], cycles: 700,
      check(r) {
        const rs = runsOf(lvl(r.tr, LED)).slice(1, -1);
        if (rs.length < 4) return [false, "The LED must keep blinking - I saw only " + rs.length + " changes."];
        const bad = rs.find(x => x[1] !== 100);
        if (bad) return [false, "One " + (bad[0] ? "ON" : "OFF") + " time was " + bad[1] + " cycles, not 100."];
        return [true, "100 + 100 cycles. At freq=2000 that is a visible 5 blinks per second on a real Pico."];
      },
      mp: { deco: "set_init=rp2.PIO.OUT_LOW", sm: "freq=2000, set_base=Pin(15)", after: "# 200 cycles at freq=2000 = 0.1 s: a visible blink (5 per second)." },
    },
    {
      id: "m5", title: "Copy the button", learn: "jmp pin, inputs", target: 5,
      goal: "The LED on GP15 must <b>copy the button on GP14</b>: pressed = ON, released = OFF.",
      story: "<code>jmp pin, label</code> jumps when the <b>jmp pin</b> (here the button, GP14) reads 1. Try it: press and hold the round button while the program runs.",
      code: "; Mission 5: the LED (GP15) copies the button (GP14).\n; jmp pin, label : jump if the jmp pin (GP14) is 1\nloop:\n    jmp pin, on\n    set pins, 0\n    jmp loop\non:\n    set pins, ???\n    jmp loop\n",
      solution: "loop:\n    jmp pin, on\n    set pins, 0\n    jmp loop\non:\n    set pins, 1\n    jmp loop\n",
      hints: ["When the button is pressed the program goes to 'on'. What should the LED be there?", "Answer: <code>set pins, 1</code>."],
      cfg: { setBase: LED, setCount: 1, initPindirs: 1 << LED, jmpPin: BTN, inBase: BTN }, pins: [{ gpio: LED, kind: "led" }, { gpio: BTN, kind: "button", label: "button GP14" }], watch: [BTN, LED], cycles: 400,
      scenario: { input: (g, c) => g === BTN && ((c > 40 && c < 120) || (c > 200 && c < 230) || (c > 300 && c < 360)) ? 1 : 0 },
      check(r) {
        const led = lvl(r.tr, LED);
        const btn = i => (i > 40 && i < 120) || (i > 200 && i < 230) || (i > 300 && i < 360) ? 1 : 0;
        let wrong = 0;
        for (let i = 10; i < led.length; i++) { let stable = true; for (let k = 1; k <= 5; k++) if (btn(i - k) !== btn(i)) stable = false; if (stable && led[i] !== btn(i)) wrong++; }
        if (wrong) return [false, "The LED did not match the button for " + wrong + " cycles (I pressed it 3 times)."];
        return [true, "The LED follows the button within a few cycles - a tiny 'peripheral' with no CPU at all."];
      },
      mp: { deco: "set_init=rp2.PIO.OUT_LOW", sm: "freq=2000, set_base=Pin(15), jmp_pin=Pin(14, Pin.IN, Pin.PULL_DOWN)", after: "# Wire a push button from GP14 to 3.3 V." },
    },
    {
      id: "m6", title: "The CPU talks", learn: "PULL, OUT, TX FIFO", target: 2,
      goal: "Show every number the CPU sends on the <b>8 LEDs GP0-GP7</b>.",
      story: "The CPU drops 32-bit words into the <b>TX FIFO</b> with <code>sm.put()</code>. <code>pull</code> takes the next word into the <b>OSR</b> (and waits if the FIFO is empty). <code>out pins, n</code> moves <b>n bits</b> from the OSR to the pins. Use the CPU box: type 0xA5 and press <b>sm.put()</b>.",
      code: "; Mission 6: show each number from the CPU on GP0-GP7.\n; pull        : TX FIFO -> OSR (waits while the FIFO is empty)\n; out pins, n : OSR -> n pins (lowest bit first here)\npull\nout pins, ???\n",
      solution: "pull\nout pins, 8\n",
      hints: ["How many LEDs are there?", "Answer: <code>out pins, 8</code>."],
      cfg: { outBase: 0, outCount: 8, initPindirs: 0xFF, outShift: "right" }, bar: [0, 1, 2, 3, 4, 5, 6, 7], cpu: true, cpuDefault: "0xA5", watch: [0, 1, 2, 3], cycles: 120,
      scenario: { each(sm, i) { if (i === 5) sm.put(0xA5); if (i === 40) sm.put(0x3C); if (i === 80) sm.put(0x81); } },
      check(r) {
        const v = i => r.tr.pins[i] & 0xFF;
        const want = [[35, 0xA5], [75, 0x3C], [115, 0x81]];
        for (const [i, w] of want) if (v(i) !== w) return [false, "The CPU sent " + hex(w, 2) + " but the LEDs showed " + hex(v(i), 2) + "."];
        return [true, "Every byte showed up on the LEDs. The CPU only did sm.put() - the state machine did the rest."];
      },
      mp: { deco: "out_init=(rp2.PIO.OUT_LOW,)*8, out_shiftdir=rp2.PIO.SHIFT_RIGHT", sm: "freq=2000, out_base=Pin(0)", after: "for n in (0xA5, 0x3C, 0x81):\n    sm.put(n)\n    time.sleep(1)" },
    },
    {
      id: "m7", title: "Doorbell counter", learn: "WAIT, IN, PUSH, RX FIFO", target: 4,
      goal: "Every time the button on GP14 is <b>pressed</b>, send <b>one</b> word to the CPU.",
      story: "<code>wait 1 pin 0</code> stalls until in-pin 0 (GP14) is 1. <code>in pins, 1</code> copies one bit into the <b>ISR</b>. <code>push</code> sends the ISR to the <b>RX FIFO</b>, where MicroPython reads it with <code>sm.get()</code>. Careful: a press lasts many cycles!",
      code: "; Mission 7: one word to the CPU for every press of GP14.\n.wrap_target\n    wait 1 pin 0      ; wait until the button is pressed\n    in pins, 1        ; read it into the ISR\n    push              ; ISR -> RX FIFO -> CPU\n    wait ? pin 0      ; ...and then?\n.wrap\n",
      solution: ".wrap_target\n    wait 1 pin 0\n    in pins, 1\n    push\n    wait 0 pin 0\n.wrap\n",
      hints: ["Without the last line, one long press would be counted again and again.", "Wait until the button is released: level 0.", "Answer: <code>wait 0 pin 0</code>."],
      cfg: { inBase: BTN, initPindirs: 0 }, pins: [{ gpio: BTN, kind: "button", label: "button GP14" }], cpu: true, cpuDefault: "1", watch: [BTN], cycles: 400,
      scenario: {
        input: (g, c) => g === BTN && ((c > 30 && c < 90) || (c > 150 && c < 200) || (c > 260 && c < 330)) ? 1 : 0,
        each(sm, i, tr) { if (i % 8 === 0) { let v; while ((v = sm.get()) !== undefined) tr.rx.push(v); } },
      },
      check(r) {
        let v; while ((v = r.sm.get()) !== undefined) r.tr.rx.push(v);
        const n = r.tr.rx.length;
        if (n === 3) return [true, "3 presses → 3 words. That is how a PIO program reports events to the CPU."];
        if (n > 3) return [false, "I pressed 3 times but the CPU got " + n + " words - one press is counted many times."];
        return [false, "I pressed 3 times but the CPU got only " + n + " word(s)."];
      },
      mp: { deco: "", sm: "freq=2000, in_base=Pin(14, Pin.IN, Pin.PULL_DOWN)", after: "count = 0\nwhile True:\n    sm.get()              # waits for the next press\n    count += 1\n    print('presses:', count)" },
    },
    {
      id: "m8", title: "Boss: build a UART", learn: "side-set, out, a real protocol", target: 4,
      goal: "Send bytes on <b>GP4</b> as a serial UART: <b>8 cycles per bit</b>, start bit 0, 8 data bits (lowest first), stop bit 1. The line rests at 1. I will send <b>\"PIO\"</b>.",
      story: "This is how Raspberry Pi's own example makes an extra serial port. <code>side 0</code> / <code>side 1</code> sets GP4 <i>at the same moment</i> as the instruction runs - <b>side-set</b>. <code>.side_set 1 opt</code> means: 1 side-set pin, and side is optional.",
      code: "; Mission 8 (boss): a UART transmitter on GP4.\n; 1 bit = 8 cycles. Frame: start 0, 8 data bits (LSB first), stop 1.\n.side_set 1 opt\n    pull           side 1 [7]  ; stop bit / idle = 1, then wait for a byte\n    set x, ???     side 0 [7]  ; start bit = 0; X counts the data bits\nbitloop:\n    out pins, 1                ; one data bit\n    jmp x--, bitloop [?]       ; 1 + ? = 8 cycles per bit\n",
      solution: ".side_set 1 opt\n    pull           side 1 [7]\n    set x, 7       side 0 [7]\nbitloop:\n    out pins, 1\n    jmp x--, bitloop [6]\n",
      hints: ["There are 8 data bits, and the loop runs X + 1 times.", "Each bit: out (1 cycle) + jmp (1 cycle) + delay = 8.", "Answer: <code>set x, 7</code> and <code>jmp x--, bitloop [6]</code>."],
      cfg: { outBase: UARTPIN, outCount: 1, setBase: UARTPIN, sidesetBase: UARTPIN, initPindirs: 1 << UARTPIN, initPins: 1 << UARTPIN, outShift: "right" }, pins: [{ gpio: UARTPIN, kind: "led", label: "GP4 TX" }], cpu: true, cpuDefault: "'P'", watch: [UARTPIN], cycles: 420,
      scenario: { init(sm) { "PIO".split("").forEach(c => sm.put(c.charCodeAt(0))); } },
      check(r) {
        const fr = decodeUart(lvl(r.tr, UARTPIN), 8);
        const txt = fr.map(f => String.fromCharCode(f.b)).join("");
        if (txt === "PIO" && fr.every(f => f.stop === 1)) return [true, "The receiver decoded <b>\"PIO\"</b>. You built a serial port out of 4 instructions - that is the power of PIO!"];
        return [false, "A UART receiver read: \"" + esc(txt.replace(/[^\x20-\x7e]/g, "?")) + "\" (" + fr.length + " frames) instead of \"PIO\". Check the bit count and the 8-cycle timing."];
      },
      mp: { deco: "sideset_init=rp2.PIO.OUT_HIGH, out_init=rp2.PIO.OUT_HIGH, out_shiftdir=rp2.PIO.SHIFT_RIGHT", sm: "freq=8 * 9600, sideset_base=Pin(4), out_base=Pin(4)", after: "# Check it: wire GP4 to GP5 and read it back with the hardware UART1.\nfrom machine import UART\nuart = UART(1, baudrate=9600, tx=Pin(8), rx=Pin(5))\nfor c in 'PIO':\n    sm.put(ord(c))\ntime.sleep(0.1)\nprint(uart.read())        # b'PIO'" },
    },
  ];

  function mpScript(m, prog) {
    const body = PIO.toMicroPython(prog).map(l => "    " + l).join("\n");
    const name = m.id === "m8" ? "uart_tx" : "mission_" + m.id.slice(1);
    return "import rp2\nimport time\nfrom machine import Pin\n\n@rp2.asm_pio(" + m.mp.deco + ")\ndef " + name + "():\n" + body + "\n\nsm = rp2.StateMachine(0, " + name + ", " + m.mp.sm + ")\nsm.active(1)\n" + (m.mp.after ? m.mp.after + "\n" : "");
  }

  W.missions = el => {
    let cur = 0, sim = null;
    const list = h("div", { class: "mlist" });
    const body = h("div");
    el.append(list, body);
    function stars(id) { const s = (P.missions[id] || {}).stars || 0; return "★".repeat(s) + "☆".repeat(3 - s); }
    function drawList() {
      list.innerHTML = "";
      MISSIONS.forEach((m, i) => { const b = h("button", { class: i === cur ? "on" : "" }, (i + 1) + ". " + m.title + " ", h("span", { class: "stars" }, stars(m.id))); b.addEventListener("click", () => { cur = i; show(); }); list.append(b); });
      const sb = h("button", { class: cur === -1 ? "on" : "" }, "🧪 Sandbox"); sb.addEventListener("click", () => { cur = -1; show(); }); list.append(sb);
    }
    function show() {
      if (sim) sim.stop();
      drawList(); body.innerHTML = "";
      if (cur === -1) return sandbox();
      const m = MISSIONS[cur], rec = P.missions[m.id] || {};
      let fails = 0, peeked = !!rec.peeked;
      body.append(h("div", { class: "mbrief" },
        h("div", { class: "kicker" }, "Mission " + (cur + 1) + " · learn: " + m.learn),
        h("h3", { style: "font-size:24px;margin:4px 0" }, m.title),
        h("p", { html: "<b>Goal:</b> " + m.goal }), h("p", { html: m.story })));
      const host = h("div");
      body.append(host);
      sim = SimUI(host, { code: rec.code || m.code, cfg: m.cfg, pins: m.pins, bar: m.bar, cpu: m.cpu, cpuDefault: m.cpuDefault, watch: m.watch, onChange: c => { P.missions[m.id] = Object.assign(P.missions[m.id] || {}, { code: c }); save(); } });
      const res = h("div", { class: "result" });
      const hintBox = h("div");
      let hintN = 0;
      const bCheck = h("button", { class: "btn primary" }, "✔ Check my mission");
      const bHint = h("button", { class: "btn" }, "💡 Hint");
      const bSol = h("button", { class: "btn" }, "Show the answer");
      const bStart = h("button", { class: "btn" }, "Start again");
      const mpBtn = h("button", { class: "btn" }, "🐍 Get the MicroPython program");
      const mpBox = h("div");
      body.append(h("div", { class: "btns" }, bCheck, bHint, bSol, bStart, mpBtn), hintBox, res, mpBox);
      bHint.addEventListener("click", () => { if (hintN < m.hints.length) { hintBox.append(h("div", { class: "note", html: "💡 " + m.hints[hintN] })); hintN++; } });
      bSol.addEventListener("click", () => {
        if (!confirm("Show the answer? You can still finish the mission, but you will get at most 1 star.")) return;
        peeked = true; P.missions[m.id] = Object.assign(P.missions[m.id] || {}, { peeked: true }); save();
        sim.setCode(m.solution);
      });
      bStart.addEventListener("click", () => sim.setCode(m.code));
      bCheck.addEventListener("click", () => {
        const r = runHeadless(sim.getCode(), m.cfg, m.scenario, m.cycles);
        if (r.error) { res.innerHTML = "<div class='note bad'>" + esc(r.error) + "</div>"; return; }
        const [ok, msg] = m.check(r);
        if (!ok) { fails++; res.innerHTML = "<div class='note bad'><b>Not yet.</b> " + msg + (fails >= 2 && hintN < m.hints.length ? " <i>Try a hint.</i>" : "") + "</div>"; return; }
        const n = r.prog.instr.length;
        const s = peeked ? 1 : n <= m.target ? 3 : 2;
        const old = (P.missions[m.id] || {}).stars || 0;
        P.missions[m.id] = Object.assign(P.missions[m.id] || {}, { stars: Math.max(old, s), code: sim.getCode() }); save();
        if (s > old) addXP(50 * (s - old), "mission " + (cur + 1) + " " + "★".repeat(s));
        res.innerHTML = "<div class='note ok'><b>Mission complete! <span class='stars'>" + "★".repeat(s) + "☆".repeat(3 - s) + "</span></b><br>" + msg +
          "<br><small>" + n + " instruction" + (n === 1 ? "" : "s") + " (target " + m.target + "). " + (peeked ? "You looked at the answer, so 1 star - try the next one on your own!" : s < 3 ? "Can you do it in " + m.target + " instructions for ★★★?" : "Optimal!") + "</small></div>";
        drawList(); maybeDone();
      });
      mpBtn.addEventListener("click", () => {
        const p = sim.toMp();
        if (!p) { mpBox.innerHTML = "<div class='note bad'>Fix the errors in your program first.</div>"; return; }
        const code = mpScript(m, p);
        const copy = h("button", { class: "btn small" }, "Copy");
        copy.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(code); copy.textContent = "Copied ✔"; });
        mpBox.innerHTML = "";
        mpBox.append(h("div", { class: "note", html: "This is <b>your</b> program as a complete MicroPython script for a Raspberry Pi Pico. Paste it into Thonny (or a Wokwi Pico project) and run it." }), copy, h("pre", { class: "code" }, code));
        once("mp-" + m.id, 10, "exported to MicroPython");
      });
    }
    function sandbox() {
      body.append(h("div", { class: "mbrief", html: "<div class='kicker'>Sandbox</div><h3 style='font-size:24px;margin:4px 0'>Try anything</h3><p>LED on <b>GP15</b> (set / out / side-set pin), button on <b>GP14</b> (in pin 0 and jmp pin), CPU box for <code>sm.put()</code> / <code>sm.get()</code>. OUT shifts right (lowest bit first). Paste MicroPython <code>@rp2.asm_pio</code> code too - the decorator's settings are used.</p>" }));
      const host = h("div"); body.append(host);
      sim = SimUI(host, { code: P.sandbox || "; Your playground\n.wrap_target\n    set pins, 1 [31]\n    set pins, 0 [31]\n.wrap\n", cfg: { setBase: LED, outBase: LED, sidesetBase: LED, inBase: BTN, jmpPin: BTN, initPindirs: 1 << LED, outShift: "right" }, pins: [{ gpio: LED, kind: "led" }, { gpio: BTN, kind: "button", label: "button GP14" }], cpu: true, watch: [BTN, LED], onChange: c => { P.sandbox = c; save(); } });
    }
    function maybeDone() { const n = MISSIONS.filter(m => (P.missions[m.id] || {}).stars).length; if (n >= 6) markDone("missions"); }
    show();
  };

  // ---- a read-only demo simulator
  W.demo = (el, arg) => {
    const D = {
      blink: { code: "; 2 instructions, 64 cycles per blink\n.wrap_target\n    set pins, 1 [31]   ; 1 + 31 = 32 cycles ON\n    set pins, 0 [31]   ; 32 cycles OFF\n.wrap                  ; back to the top, free\n", cfg: { setBase: LED, initPindirs: 1 << LED }, pins: [{ gpio: LED, kind: "led" }], watch: [LED] },
      stall: { code: "; pull waits (stalls) until the CPU puts a word\n.wrap_target\n    pull               ; TX FIFO -> OSR, or wait\n    out pins, 1        ; lowest bit to the LED\n.wrap\n", cfg: { outBase: LED, initPindirs: 1 << LED, outShift: "right" }, pins: [{ gpio: LED, kind: "led" }], cpu: true, cpuDefault: "1", watch: [LED] },
      side: { code: "; side-set: change GP14 'for free' on any instruction\n.side_set 1\n.wrap_target\n    set pins, 1   side 0\n    set pins, 0   side 1\n.wrap\n", cfg: { setBase: LED, sidesetBase: BTN, initPindirs: (1 << LED) | (1 << BTN) }, pins: [{ gpio: LED, kind: "led" }, { gpio: BTN, kind: "led", label: "GP14 (side)" }], watch: [LED, BTN] },
    }[arg];
    SimUI(el, Object.assign({ readOnly: true, height: 200, speed: 8 }, D));
  };

  // ===================================================================== chapters
  const sec = (n, title, html) => "<div class='sec'><h3><span class='step'>" + n + "</span>" + title + "</h3>" + html + "</div>";
  const w = (name, arg) => "<div data-w='" + name + "'" + (arg ? " data-arg='" + arg + "'" : "") + "></div>";

  const CH = [
    {
      id: "start", t: "Start here", s: "How this works",
      html: () => `<div class="kicker">PIO for Dummies</div><h2>Learn PIO from zero</h2>
      <p class="lede">The RP2040 on your Raspberry Pi Pico has a secret weapon: <b>PIO - Programmable Input/Output</b>. By the end of this journey you will write PIO programs yourself, test them here in a simulator, and run them on a real Pico in MicroPython.</p>
      <div class="two"><div class="card"><b>Your path</b><ol style="margin:.4em 0 0 1.1em;padding:0">
      <li>Why PIO exists</li><li>From logic gates to <b>state machines</b> (in 3D)</li><li>A 3D tour inside the PIO block</li><li>How a state machine runs - the rules</li><li>The nine instructions</li><li><b>Missions</b>: program PIO in the simulator</li><li>PIO in MicroPython</li><li>Final challenge and certificate</li></ol></div>
      <div class="card"><b>How to play</b><p>Read, play with every widget, and answer the quick questions at the end of each chapter. You earn <b>XP</b> and climb ranks: Beginner → Gate Keeper → … → <b>PIO Wizard</b>. Missions give up to ★★★.</p>
      <p>Your progress is saved in this browser only.</p>
      <label>Your name (for the certificate):<br><input id="nameIn" style="font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px;width:100%;background:var(--surface);color:var(--ink)"></label></div></div>
      <div class="note">No prerequisites! If words like <i>GPIO</i>, <i>bit</i> or <i>hex</i> are new to you, first open Helper 0 of <a href="../peripherals-for-dummies/">RP2040 Peripherals for Dummies</a>.</div>`,
      after: el => { const i = $("#nameIn", el); i.value = P.name; i.addEventListener("input", () => { P.name = i.value; save(); }); once("start", 10, "welcome!"); },
    },
    {
      id: "why", t: "Why PIO?", s: "The problem it solves",
      html: () => `<div class="kicker">Chapter 1</div><h2>Why does PIO exist?</h2>
      <p class="lede">Your microcontroller already has a UART, SPI, I²C and PWM. So why would it need anything else?</p>
      ${sec("1", "Fixed peripherals speak one language each", `<p>A UART block is a little circuit that can <b>only</b> do UART. An I²C block can only do I²C. They are fast and easy - but fixed forever when the chip was made.</p>
      <div class="picture"><b>Picture this:</b> a post office with one counter for letters and one for parcels. Fine - until someone arrives with a camel.</div>`)}
      ${sec("2", "The camels: devices with their own protocol", `<p>Many real devices speak something no peripheral was built for: <b>NeoPixel (WS2812) LEDs</b> (each bit is 1.25 µs long and the timing must be right to a fraction of a microsecond), <b>VGA video</b>, <b>DHT temperature sensors</b>, extra serial ports, rotary encoders, old protocols in medical and lab equipment…</p>`)}
      ${sec("3", "The old fix: bit-banging with the CPU", `<p>The CPU can switch a pin on and off in a loop - "bit-banging". It works, but the CPU is also busy with USB, Wi-Fi, timers and your program. Every <b>interrupt</b> makes it late. Press the button:</p>${w("jitter")}`)}
      ${sec("4", "PIO: little helpers that only do I/O", `<p>PIO gives you <b>8 tiny processors</b> (state machines) whose only job is wiggling and reading pins. Each runs a very short program (up to 32 instructions) with <b>exact timing: one instruction per clock cycle</b>, and nothing can interrupt it. The CPU just hands them data.</p>
      <div class="picture"><b>Picture this:</b> instead of the manager (the CPU) running to the door every time the bell rings, you hire 8 doormen. Each follows a tiny written recipe, perfectly on time, and only bothers the manager with finished results.</div>`)}
      ${sec("✔", "Check yourself", "<div data-quiz='why'></div>")}`,
    },
    {
      id: "fsm", t: "Gates → state machines", s: "Digital electronics, in 3D",
      html: () => `<div class="kicker">Chapter 2</div><h2>From logic gates to state machines</h2>
      <p class="lede">PIO's helpers are called <b>state machines</b>. To understand that word, let's climb the ladder of digital electronics, one step at a time.</p>
      ${sec("1", "Logic gates: decide, but forget", `<p>A gate looks at its inputs <b>right now</b> and gives an output. Change the inputs and the output changes at once. A circuit made only of gates is called <b>combinational logic</b>: it has <b>no memory</b>.</p>${w("gates")}`)}
      ${sec("2", "The flip-flop: one bit of memory", `<p>A <b>D flip-flop</b> copies its input D to its output Q - but <b>only at the moment the clock rises</b> (a "clock edge"). Between edges, Q holds its value whatever D does. That is <b>memory</b>, and it is <b>synchronous</b>: things change only on clock ticks.</p>${w("dff")}`)}
      ${sec("3", "Many flip-flops: a register, and a counter", `<p>Put 3 flip-flops side by side and you have a 3-bit <b>register</b>: it remembers a number 0-7. Add a little logic that calculates "number + 1" and feed it back: on every clock edge the register becomes the next number. That is a <b>counter</b> - the simplest state machine. Each number is a <b>state</b>.</p>${w("counter")}`)}
      ${sec("4", "The recipe of every state machine", `<p>A <b>finite state machine (FSM)</b> has three parts:</p>
      <ol><li><b>State register</b> (flip-flops): remembers the present state.</li><li><b>Next-state logic</b> (gates): from the present state and the inputs, works out the next state.</li><li><b>Output logic</b>: decides the outputs. If outputs depend only on the state, it is a <b>Moore</b> machine; if they also depend on the inputs, a <b>Mealy</b> machine.</li></ol>
      <p>On every clock edge the register loads the next state. Designers draw it as a <b>state diagram</b> (circles = states, arrows = transitions) and a <b>state table</b>.</p>${w("fsmBlock")}`)}
      ${sec("5", "See one in 3D: the metro turnstile", `<p>Two states, LOCKED and UNLOCKED; two inputs, coin and push. Pick an input, then tick the clock - watch the token travel, the flip-flop bit change and the turnstile react. <b>Drag</b> to look around; <b>click</b> a part to read about it.</p>${w("turnstile")}`)}
      ${sec("6", "A Moore machine with a counter: traffic lights", `<p>Here the lamps depend only on the state, and a counter decides how many ticks each state lasts. Keep this picture in mind: a PIO program does exactly this - its <b>program counter</b> is the state, and delays and X/Y counters decide how long it stays.</p>${w("traffic")}`)}
      ${sec("7", "How we got from gates to PIO", w("timeline"))}
      ${sec("✔", "Check yourself", "<div data-quiz='fsm'></div>")}`,
    },
    {
      id: "meet", t: "Meet PIO", s: "3D tour of the hardware",
      html: () => `<div class="kicker">Chapter 3</div><h2>Inside the PIO block</h2>
      <p class="lede">The RP2040 has <b>two PIO blocks</b> (PIO0 and PIO1). Each block has <b>four state machines</b> and one shared <b>instruction memory</b>. Turn the model, click the parts, and follow the data.</p>
      ${w("pio3d")}
      ${sec("1", "The parts list", `<table class="t"><tr><th>Part</th><th>How many</th><th>What it is for</th></tr>
      <tr><td>PIO blocks</td><td>2 (PIO0, PIO1)</td><td>Each is independent; MicroPython numbers the state machines 0-7 (0-3 in PIO0, 4-7 in PIO1).</td></tr>
      <tr><td>State machines</td><td>4 per block</td><td>Each runs a program, one instruction per clock cycle.</td></tr>
      <tr><td>Instruction memory</td><td>32 instructions per block</td><td>Shared by the 4 state machines of that block. A program is at most 32 instructions.</td></tr>
      <tr><td>PC (program counter)</td><td>1 per SM</td><td>Which instruction runs next - this is the machine's <b>state</b>.</td></tr>
      <tr><td>X and Y</td><td>2 per SM, 32-bit</td><td>Scratch registers: counters, saved values.</td></tr>
      <tr><td>OSR (output shift register)</td><td>1 per SM, 32-bit</td><td>Holds data on its way <b>out</b> to pins (filled by <code>pull</code>, emptied by <code>out</code>).</td></tr>
      <tr><td>ISR (input shift register)</td><td>1 per SM, 32-bit</td><td>Collects data coming <b>in</b> (filled by <code>in</code>, sent by <code>push</code>).</td></tr>
      <tr><td>TX FIFO / RX FIFO</td><td>4 words each, per SM</td><td>Queues between the CPU and the SM. They can be joined into one 8-word queue in one direction.</td></tr>
      <tr><td>Clock divider</td><td>1 per SM</td><td>Runs the SM slower than the system clock: 125 MHz ÷ 1 … 65536.</td></tr>
      <tr><td>IRQ flags</td><td>8 per block</td><td>Signals between state machines and to the CPU.</td></tr>
      <tr><td>GPIO</td><td>any of GP0-GP29</td><td>Each SM is told which pins to use: set_base, out_base, in_base, sideset_base, jmp_pin.</td></tr></table>`)}
      ${sec("2", "Why is it called a 'state machine'?", `<p>Remember the recipe from Chapter 2? A PIO state machine is the same idea, made programmable: its <b>state</b> is the program counter (plus X, Y, OSR, ISR), its <b>next-state logic</b> is the instruction at that address, and its <b>outputs</b> are the pins. Instead of soldering gates, you write a few lines of code.</p>`)}
      ${sec("✔", "Check yourself", "<div data-quiz='meet'></div>")}`,
    },
    {
      id: "rules", t: "How it runs", s: "Cycles, delays, wrap, stalls",
      html: () => `<div class="kicker">Chapter 4</div><h2>The rules of the game</h2>
      <p class="lede">Five rules explain everything a state machine does. Learn them and PIO timing becomes simple arithmetic.</p>
      ${sec("1", "One instruction = one clock cycle", `<p>Exactly one. No caches, no interrupts, no surprises. If the SM clock is 2000 Hz, every instruction takes 0.5 ms. You choose the clock with <code>freq=</code> in MicroPython:</p>${w("clock")}`)}
      ${sec("2", "Delay [n]: wait n more cycles", `<p>Write <code>[n]</code> (0-31) after any instruction and the SM idles n extra cycles after it. <code>set pins, 1 [31]</code> takes 32 cycles. Watch the cycle counter and the DELAY box:</p>${w("demo", "blink")}`)}
      ${sec("3", "Wrap: the free loop", `<p>After the last instruction the SM jumps back to the first one <b>by itself, taking no time</b>. With <code>.wrap_target</code> and <code>.wrap</code> you can choose which part repeats (anything before .wrap_target runs only once - good for setup).</p>`)}
      ${sec("4", "Stall: waiting does not count", `<p>Some instructions may have to wait: <code>wait</code> (for a pin or IRQ), <code>pull</code> when the TX FIFO is empty, <code>push</code> when the RX FIFO is full. The SM <b>stalls</b> on that instruction - it simply repeats it every cycle until it can finish, and any delay starts only after that. Press Run, then type <code>1</code> or <code>0</code> in the CPU box and press <b>sm.put()</b>:</p>${w("demo", "stall")}`)}
      ${sec("5", "Side-set: change pins for free", `<p>Some pins can be set "on the side" of any instruction - in the same cycle, costing nothing. Declare <code>.side_set 1</code> and add <code>side 0</code> or <code>side 1</code>. Side-set uses some of the same 5 bits as the delay, so delays get shorter (with 1 side-set pin the biggest delay is 15; with <code>opt</code> it is 7).</p>${w("demo", "side")}`)}
      ${sec("6", "Pin groups", `<p>Each instruction talks to its own group of pins, which you choose when you start the SM:</p>
      <table class="t"><tr><th>Group</th><th>Used by</th><th>MicroPython argument</th></tr><tr><td>SET pins (1-5)</td><td>set pins / set pindirs</td><td>set_base=Pin(n)</td></tr><tr><td>OUT pins (1-32)</td><td>out pins, mov pins</td><td>out_base=Pin(n)</td></tr><tr><td>IN pins</td><td>in pins, wait … pin</td><td>in_base=Pin(n)</td></tr><tr><td>Side-set pins (1-5)</td><td>side …</td><td>sideset_base=Pin(n)</td></tr><tr><td>JMP pin (1)</td><td>jmp pin</td><td>jmp_pin=Pin(n)</td></tr></table>`)}
      ${sec("✔", "Check yourself", "<div data-quiz='rules'></div>")}`,
    },
    {
      id: "instr", t: "The 9 instructions", s: "The whole language",
      html: () => `<div class="kicker">Chapter 5</div><h2>Nine instructions. That's the whole language.</h2>
      <p class="lede">A normal processor has hundreds of instructions. PIO has nine, all about moving bits between pins, registers and the CPU. Each one is shown in <b>assembly</b> (pioasm, used in C and in this simulator) and in <b>MicroPython</b>.</p>
      ${w("icards")}
      ${sec("✔", "Which instruction would you use?", "<div data-quiz='instr'></div>")}`,
    },
    {
      id: "missions", t: "Missions", s: "Program PIO yourself",
      html: () => `<div class="kicker">Chapter 6</div><h2>Missions: program the state machine</h2>
      <p class="lede">Eight missions, from switching on an LED to building your own serial port. Edit the program, press <b>Run</b> or <b>Step</b> to watch it, then <b>Check my mission</b>. Complete 6 missions to finish the chapter.</p>
      <div class="note"><b>How to read the simulator:</b> the yellow bar marks the instruction that runs next. On the right you see the registers, the FIFOs, the pins and a logic analyser (the waveform). Write in assembly, or switch to MicroPython syntax - both work.</div>
      ${w("missions")}`,
    },
    {
      id: "mp", t: "PIO in MicroPython", s: "Run it on a real Pico",
      html: () => `<div class="kicker">Chapter 7</div><h2>PIO in MicroPython</h2>
      <p class="lede">Everything you wrote in the missions runs on a real Pico (or in a Wokwi Pico simulation) with MicroPython's <code>rp2</code> module. Here is a complete program, line by line.</p>
      ${sec("1", "Anatomy of a PIO program", `<pre class="code"><span class="k">import</span> rp2
<span class="k">from</span> machine <span class="k">import</span> Pin

<span class="c"># 1. The PIO program. The decorator sets pin start-up values and options.</span>
@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)
<span class="k">def</span> blink():
    wrap_target()
    set(pins, 1)   [31]      <span class="c"># 32 cycles ON</span>
    nop()          [31]
    nop()          [31]
    nop()          [31]      <span class="c"># 4 x 32 = 128 cycles</span>
    set(pins, 0)   [31]      <span class="c"># 32 cycles OFF</span>
    nop()          [31]
    nop()          [31]
    nop()          [31]
    wrap()

<span class="c"># 2. Pick a state machine (0-7), load the program, choose the clock and the pins.</span>
sm = rp2.StateMachine(0, blink, freq=2000, set_base=Pin(25))

<span class="c"># 3. Start it. From now on it runs by itself - the CPU is free.</span>
sm.active(1)</pre>
      <p>At 2000 Hz one cycle is 0.5 ms, so 128 cycles ON + 128 OFF = 0.128 s + 0.128 s: about 4 blinks per second. <b>Pin(25)</b> is the LED on the original Pico; on a <b>Pico W</b> the LED is wired to the Wi-Fi chip, so use an external LED (e.g. GP15 with a 330 Ω resistor).</p>`)}
      ${sec("2", "Assembly ↔ MicroPython", `<table class="t"><tr><th>Assembly</th><th>MicroPython</th><th>Note</th></tr>
      <tr><td><code>set pins, 1 [3]</code></td><td><code>set(pins, 1) [3]</code></td><td>same idea, Python call syntax</td></tr>
      <tr><td><code>loop:</code></td><td><code>label("loop")</code></td><td>labels are strings</td></tr>
      <tr><td><code>jmp x--, loop</code></td><td><code>jmp(x_dec, "loop")</code></td><td>!x → not_x, y-- → y_dec, x!=y → x_not_y, !osre → not_osre</td></tr>
      <tr><td><code>in pins, 1</code></td><td><code>in_(pins, 1)</code></td><td>in_ with an underscore</td></tr>
      <tr><td><code>mov x, !osr</code></td><td><code>mov(x, invert(osr))</code></td><td>:: becomes reverse(…)</td></tr>
      <tr><td><code>out pins, 1 side 0</code></td><td><code>out(pins, 1) .side(0)</code></td><td>needs sideset_init in the decorator</td></tr>
      <tr><td><code>.wrap_target</code> / <code>.wrap</code></td><td><code>wrap_target()</code> / <code>wrap()</code></td><td></td></tr>
      <tr><td><code>irq wait 0</code></td><td><code>irq(block, 0)</code></td><td></td></tr></table>`)}
      ${sec("3", "The decorator and the StateMachine", `<table class="t"><tr><th>Write</th><th>Means</th></tr>
      <tr><td><code>set_init=rp2.PIO.OUT_LOW</code></td><td>the SET pin starts as an output, low (several pins: a tuple)</td></tr>
      <tr><td><code>out_init=…</code>, <code>sideset_init=…</code></td><td>the same for OUT and side-set pins</td></tr>
      <tr><td><code>out_shiftdir=rp2.PIO.SHIFT_RIGHT</code></td><td>out sends the lowest bit first (MicroPython's default is SHIFT_LEFT: highest bit first)</td></tr>
      <tr><td><code>autopull=True, pull_thresh=8</code></td><td>refill the OSR automatically every 8 bits (no pull instruction needed)</td></tr>
      <tr><td><code>rp2.StateMachine(0, prog, freq=…, set_base=…, out_base=…, in_base=…, sideset_base=…, jmp_pin=…)</code></td><td>state machine 0-7, its program, its clock (about 1908 Hz to 125 MHz), and its pins</td></tr>
      <tr><td><code>sm.active(1)</code> / <code>sm.active(0)</code></td><td>start / stop</td></tr>
      <tr><td><code>sm.put(x)</code> / <code>sm.get()</code></td><td>write to the TX FIFO / read the RX FIFO (they wait if full / empty)</td></tr>
      <tr><td><code>sm.tx_fifo()</code> / <code>sm.rx_fifo()</code></td><td>how many words are waiting</td></tr>
      <tr><td><code>sm.irq(handler)</code></td><td>run a Python function when the program executes <code>irq …</code></td></tr></table>`)}
      ${sec("4", "Common mistakes", `<ul><li><b>The LED never lights:</b> the pin is still an input - add <code>set_init=rp2.PIO.OUT_LOW</code> (or <code>set(pindirs, 1)</code>), and check the base pin.</li>
      <li><b>ValueError on freq:</b> below about 1908 Hz the divider overflows. Make it slower with delays and loops instead.</li>
      <li><b>Bits come out backwards:</b> check <code>out_shiftdir</code> / <code>in_shiftdir</code>.</li>
      <li><b>Program too long:</b> 32 instructions per PIO block, shared by its 4 state machines.</li>
      <li><b>The program freezes:</b> it is probably stalled on <code>pull</code> (nobody called sm.put) or <code>push</code> (nobody calls sm.get).</li></ul>
      <div class="note">No Pico at hand? <a href="https://wokwi.com/projects/new/micropython-pi-pico" target="_blank" rel="noopener">Wokwi's Pico simulator</a> runs MicroPython PIO programs in the browser. Every mission has a "Get the MicroPython program" button.</div>`)}
      ${sec("✔", "Translate!", "<div data-quiz='mp'></div>")}`,
    },
    {
      id: "final", t: "Final challenge", s: "Exam and certificate",
      html: () => `<div class="kicker">Chapter 8</div><h2>Final challenge</h2>
      <p class="lede">Ten questions from the whole journey. Score 7 or more to earn your certificate. You can try as often as you like.</p>
      <div data-w="exam"></div><div data-w="cert"></div>`,
    },
  ];

  // ===================================================================== quiz banks
  const Q = {
    why: [
      { q: "Why can't a UART peripheral drive NeoPixel LEDs?", o: ["It is too slow", "It is a fixed circuit that only speaks the UART protocol", "NeoPixels need 5 V"], a: 1, why: "Fixed peripherals are built for one protocol. PIO lets you make your own." },
      { q: "What goes wrong when the CPU bit-bangs a protocol?", o: ["The pins wear out", "Interrupts make its timing wobble", "It uses too much flash memory"], a: 1, why: "The CPU has other work; every interrupt delays the next pin change." },
      { q: "How many PIO state machines does the RP2040 have?", o: ["2", "4", "8"], a: 2, why: "2 PIO blocks × 4 state machines = 8." },
    ],
    fsm: [
      { q: "A circuit made only of logic gates…", o: ["remembers its last output", "has no memory: the output depends only on the present inputs", "needs a clock"], a: 1, why: "That is combinational logic." },
      { q: "When does a D flip-flop change its output Q?", o: ["Whenever D changes", "Only at the clock edge", "Never"], a: 1, why: "It copies D at the rising clock edge and holds it until the next edge." },
      { q: "The three parts of a state machine are…", o: ["CPU, RAM, flash", "State register, next-state logic, output logic", "Input, clock, power"], a: 1, why: "Flip-flops remember the state, gates compute the next state and the outputs." },
      { q: "In a Moore machine the outputs depend on…", o: ["the state only", "the inputs only", "the state and the inputs"], a: 0, why: "Moore: state only (like the traffic light). Mealy: state and inputs." },
      { q: "In a PIO state machine, what plays the role of the 'state'?", o: ["The GPIO pins", "The program counter (with X, Y, OSR, ISR)", "The TX FIFO"], a: 1, why: "The PC says where in the recipe we are; the instruction there decides what happens next." },
    ],
    meet: [
      { q: "How many instructions fit in one PIO block's memory?", o: ["32", "256", "4096"], a: 0, why: "32 instructions, shared by the block's 4 state machines." },
      { q: "Which register holds data on its way OUT to the pins?", o: ["ISR", "OSR", "Y"], a: 1, why: "Output Shift Register: pull fills it, out empties it." },
      { q: "How does the CPU send data to a state machine?", o: ["Through the TX FIFO (sm.put)", "By writing the pins", "Through the RX FIFO"], a: 0, why: "TX = CPU → SM, RX = SM → CPU." },
      { q: "What are X and Y?", o: ["Pin numbers", "32-bit scratch registers for counting and storing", "The two PIO blocks"], a: 1, why: "They are the SM's two general-purpose registers." },
    ],
    rules: [
      { q: "How long does 'set pins, 1 [4]' take?", o: ["1 cycle", "4 cycles", "5 cycles"], a: 2, why: "1 cycle for the instruction + 4 delay cycles." },
      { q: "freq=2000. How long is one cycle?", o: ["2 ms", "0.5 ms", "2000 s"], a: 1, why: "1 / 2000 Hz = 0.0005 s = 0.5 ms." },
      { q: "What does wrap cost?", o: ["Nothing - 0 cycles", "1 cycle like a jmp", "It depends on the program"], a: 0, why: "Wrapping back to .wrap_target is free." },
      { q: "'pull' runs while the TX FIFO is empty. What happens?", o: ["It reads 0", "The SM stalls until the CPU puts data", "The program crashes"], a: 1, why: "A blocking pull waits; nothing else runs on that SM meanwhile." },
      { q: "What is side-set for?", o: ["Changing some pins in the same cycle as another instruction", "Setting the clock", "Choosing a state machine"], a: 0, why: "It saves cycles: a pin change rides along with any instruction." },
    ],
    instr: [
      { q: "Count down a loop 5 times:", o: ["set x, 4 then jmp x--, loop", "wait 5 pin 0", "push 5"], a: 0, why: "jmp x-- jumps while X is not 0, decrementing it each time." },
      { q: "Get the next word from the CPU:", o: ["push", "pull", "in"], a: 1, why: "pull: TX FIFO → OSR." },
      { q: "Wait until a button on in-pin 0 is pressed (1):", o: ["wait 1 pin 0", "jmp pin", "set pins, 1"], a: 0, why: "wait stalls until the level matches." },
      { q: "Send 8 bits from the OSR to 8 LEDs:", o: ["in pins, 8", "out pins, 8", "mov pins, 8"], a: 1, why: "out takes bits from the OSR to the OUT pins." },
      { q: "Report collected input bits to the CPU:", o: ["pull", "push", "irq"], a: 1, why: "push: ISR → RX FIFO → sm.get()." },
      { q: "Put the number 25 into Y:", o: ["mov y, 25", "set y, 25", "out y, 25"], a: 1, why: "set loads 0-31 directly." },
    ],
    mp: [
      { q: "MicroPython for: <code>jmp x--, loop</code>", o: ['jmp(x--, "loop")', 'jmp(x_dec, "loop")', 'jmp(not_x, "loop")'], a: 1, why: "x-- is written x_dec." },
      { q: "MicroPython for: <code>in pins, 1</code>", o: ["in(pins, 1)", "in_(pins, 1)", "input(pins, 1)"], a: 1, why: "in is a Python keyword, so it is in_." },
      { q: "Your LED never lights, the program looks right. First thing to check?", o: ["set_init / pindirs - is the pin an output?", "Buy a new Pico", "Raise freq to 125 MHz"], a: 0, why: "A pin that is still an input cannot drive the LED." },
      { q: "Which line starts a state machine?", o: ["sm.put(1)", "sm.active(1)", "rp2.start()"], a: 1, why: "active(1) starts it, active(0) stops it." },
      { q: "With out_shiftdir=rp2.PIO.SHIFT_RIGHT, which bit does 'out pins, 1' send first?", o: ["The lowest bit (bit 0)", "The highest bit (bit 31)", "A random bit"], a: 0, why: "Shift right: bits leave from the bottom - LSB first, as UART needs." },
    ],
  };
  const EXAM = [
    { q: "PIO stands for…", o: ["Programmable Input/Output", "Parallel Interrupt Output", "Pico Internal Oscillator"], a: 0 },
    { q: "A flip-flop changes its output…", o: ["at the clock edge", "whenever the input changes", "only at power-up"], a: 0 },
    { q: "How many state machines share one 32-instruction memory?", o: ["1", "4", "8"], a: 1 },
    { q: "How many cycles: <code>set pins, 0 [9]</code>?", o: ["9", "10", "1"], a: 1 },
    { q: "With X = 2, how many times does a loop ending in <code>jmp x--, loop</code> run its body?", o: ["2", "3", "1"], a: 1 },
    { q: "Which instruction moves data from the CPU into the OSR?", o: ["push", "pull", "mov"], a: 1 },
    { q: "Which instruction sends the ISR to the CPU?", o: ["push", "pull", "out"], a: 0 },
    { q: "The biggest number <code>set</code> can load is…", o: ["255", "31", "1"], a: 1 },
    { q: "freq=10000. One instruction takes…", o: ["0.1 ms", "10 ms", "1 µs"], a: 0 },
    { q: "MicroPython for <code>out pins, 1 side 0</code>:", o: ["out(pins, 1).side(0)", "out(pins, 1, side=0)", "side(0, out(pins, 1))"], a: 0 },
  ];
  W.exam = el => {
    const box = h("div", { class: "quiz" }); const picks = {};
    EXAM.forEach((q, i) => {
      box.append(h("div", { class: "q", html: (i + 1) + ". " + q.q }));
      q.o.forEach((o, j) => { const b = h("button", { class: "opt", html: o }); b.addEventListener("click", () => { $$(".opt", b.parentNode).filter(x => x.dataset.q == i).forEach(x => x.style.borderColor = ""); picks[i] = j; b.style.borderColor = "var(--accent)"; }); b.dataset.q = i; box.append(b); });
    });
    const go = h("button", { class: "btn primary" }, "Hand in my answers");
    const res = h("div");
    go.addEventListener("click", () => {
      let s = 0; EXAM.forEach((q, i) => { if (picks[i] === q.a) s++; });
      $$(".opt", box).forEach(b => { const i = +b.dataset.q, j = EXAM[i].o.indexOf(b.innerHTML); });
      const best = Math.max(P.exam || 0, s); const first = P.exam === null || s > (P.exam || 0); P.exam = best; save();
      res.innerHTML = "<div class='note " + (s >= 7 ? "ok" : "bad") + "'>You scored <b>" + s + " / 10</b>. " + (s >= 7 ? "Passed! Your certificate is below." : "You need 7. Revisit the chapters and try again.") + "</div>";
      if (s >= 7) { if (first) addXP(100, "final challenge"); markDone("final"); drawCert(); }
    });
    el.append(box, h("div", { class: "btns" }, go), res);
  };
  let drawCert = () => {};
  W.cert = el => {
    drawCert = () => {
      const ms = MISSIONS.map(m => (P.missions[m.id] || {}).stars || 0), nm = ms.filter(Boolean).length, st = ms.reduce((a, b) => a + b, 0);
      if (!(P.exam >= 7)) { el.innerHTML = ""; return; }
      el.innerHTML = "<div class='cert'><div class='kicker'>Certificate of completion</div><h2>PIO for Dummies</h2><p>This certifies that</p><h2 style='color:var(--accent)'>" + esc(P.name || "(write your name on the Start page)") + "</h2><p>learned the RP2040's Programmable I/O - from flip-flops and state machines to writing and running PIO programs - and completed <b>" + nm + " of " + MISSIONS.length + " missions</b> (" + st + " ★), final score <b>" + P.exam + "/10</b>, rank <b>" + rank(P.xp)[1] + "</b> (" + P.xp + " XP).</p><p class='mono'>" + new Date().toLocaleDateString() + "</p></div><div class='btns noprint'><button class='btn' onclick='window.print()'>🖨 Print / save as PDF</button></div>";
    };
    drawCert();
  };

  // ===================================================================== navigation
  let curCh = 0;
  function drawRail() {
    const r = $("#chapters"); r.innerHTML = "";
    CH.forEach((c, i) => {
      const b = h("button", { class: "chap" + (i === curCh ? " on" : "") + (P.done[c.id] ? " done" : "") }, h("span", { class: "n" }, P.done[c.id] ? "✓" : String(i)), h("span", { class: "t" }, c.t, h("span", { class: "s" }, c.s)));
      b.addEventListener("click", () => go(i));
      r.append(b);
    });
  }
  function go(i) {
    curCh = Math.max(0, Math.min(CH.length - 1, i));
    const c = CH[curCh], main = $("#main");
    main.innerHTML = c.html();
    $$("[data-w]", main).forEach(el => { try { W[el.dataset.w](el, el.dataset.arg); } catch (e) { console.error(e); el.textContent = "(this part could not start: " + e.message + ")"; } });
    $$("[data-quiz]", main).forEach(el => el.append(quiz(el.dataset.quiz, Q[el.dataset.quiz], () => markDone(c.id))));
    if (c.after) c.after(main);
    if (c.id === "start") markDone("start");
    const nav = h("div", { class: "navrow noprint" });
    nav.append(curCh > 0 ? h("button", { class: "btn", onclick: () => go(curCh - 1) }, "← " + CH[curCh - 1].t) : h("span"));
    if (curCh < CH.length - 1) nav.append(h("button", { class: "btn primary", onclick: () => go(curCh + 1) }, CH[curCh + 1].t + " →"));
    main.append(nav);
    drawRail();
    try { history.replaceState(null, "", "#" + c.id); } catch (e) { }
    window.scrollTo({ top: 0 });
    main.focus({ preventScroll: true });
  }
  window.App = { go, MISSIONS, runHeadless, P };
  drawXP();
  const start = CH.findIndex(c => "#" + c.id === location.hash);
  go(start >= 0 ? start : 0);
})();
