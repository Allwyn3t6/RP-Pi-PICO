/*
 * PIO for Dummies - a small RP2040 PIO assembler and one-state-machine simulator.
 *
 * It follows the RP2040 datasheet (section 3.4): the nine instructions, delays,
 * side-set, .wrap, FIFOs (4 words each way), OSR/ISR with shift counters,
 * autopull/autopush and the JMP conditions. One clock cycle = one step().
 * Accepts pioasm syntax ("set pins, 1 [3]") and MicroPython rp2 syntax
 * ("set(pins, 1) [3]"), and can turn a program into either.
 *
 * Works in the browser (window.PIO) and in Node (module.exports) for testing.
 */
(function (root) {
  "use strict";

  const U32 = v => v >>> 0;
  const JMP_CONDS = { "": "always", "!x": "!x", "x--": "x--", "!y": "!y", "y--": "y--", "x!=y": "x!=y", "pin": "pin", "!osre": "!osre" };
  const IN_SRC = ["pins", "x", "y", "null", "isr", "osr"];
  const OUT_DST = ["pins", "x", "y", "null", "pindirs", "pc", "isr", "exec"];
  const MOV_DST = ["pins", "x", "y", "exec", "pc", "isr", "osr"];
  const MOV_SRC = ["pins", "x", "y", "null", "status", "isr", "osr"];
  const SET_DST = ["pins", "x", "y", "pindirs"];

  // ------------------------------------------------------------------ MicroPython -> pioasm (one line)
  const MP_COND = { not_x: "!x", x_dec: "x--", not_y: "!y", y_dec: "y--", x_not_y: "x!=y", pin: "pin", not_osre: "!osre" };

  function splitArgs(s) {
    const out = []; let depth = 0, cur = "", q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim() !== "") out.push(cur.trim());
    return out;
  }
  const unq = s => s.replace(/^["']|["']$/g, "");

  function mpLineToAsm(line) {
    // label("x") / wrap_target() / wrap()
    let m = line.match(/^label\(\s*["'](\w+)["']\s*\)$/);
    if (m) return m[1] + ":";
    if (/^wrap_target\(\s*\)$/.test(line)) return ".wrap_target";
    if (/^wrap\(\s*\)$/.test(line)) return ".wrap";
    m = line.match(/^(\w+)\((.*?)\)\s*((?:\.side\(\s*\d+\s*\))?)\s*(\[\s*\d+\s*\])?\s*((?:\.side\(\s*\d+\s*\))?)$/);
    if (!m) return null;
    let [, op, args, side1, delay, side2] = m;
    const side = (side1 || side2 || "").match(/\d+/);
    const a = splitArgs(args).map(x => x.trim());
    let asm;
    const val = x => {
      x = x.trim();
      let mm = x.match(/^invert\((.*)\)$/); if (mm) return "!" + val(mm[1]);
      mm = x.match(/^reverse\((.*)\)$/); if (mm) return "::" + val(mm[1]);
      return x;
    };
    switch (op) {
      case "nop": asm = "nop"; break;
      case "jmp":
        if (a.length === 1) asm = "jmp " + unq(a[0]);
        else asm = "jmp " + (MP_COND[a[0]] || a[0]) + ", " + unq(a[1]);
        break;
      case "wait": asm = "wait " + a[0] + " " + a[1] + " " + a.slice(2).join(" "); break;
      case "in_": asm = "in " + a[0] + ", " + a[1]; break;
      case "out": asm = "out " + a[0] + ", " + a[1]; break;
      case "push": case "pull": asm = op + (a.length ? " " + a.join(" ") : ""); break;
      case "mov": asm = "mov " + a[0] + ", " + val(a[1]); break;
      case "set": asm = "set " + a[0] + ", " + a[1]; break;
      case "irq": {
        let mode = "", idx = a[a.length - 1];
        if (a.length === 2) mode = a[0] === "block" ? "wait" : a[0];   // irq(block, 0) / irq(clear, 0)
        let rel = idx.match(/^rel\((\d+)\)$/);
        asm = "irq " + (mode ? mode + " " : "") + (rel ? rel[1] + " rel" : idx);
        break;
      }
      default: return null;
    }
    if (side) asm += " side " + side[0];
    if (delay) asm += " " + delay.replace(/\s+/g, "");
    return asm;
  }

  // @rp2.asm_pio(...) keyword arguments that matter to the simulator
  function parseDecorator(raw) {
    const d = {};
    let m = raw.match(/sideset_init\s*=\s*(\([^)]*\)|[\w.]+)/);
    if (m) d.sidesetCount = m[1].startsWith("(") ? splitArgs(m[1].slice(1, -1)).length : 1;
    if ((m = raw.match(/out_shiftdir\s*=\s*([\w.]+)/))) d.outShift = /RIGHT|1/.test(m[1]) ? "right" : "left";
    if ((m = raw.match(/in_shiftdir\s*=\s*([\w.]+)/))) d.inShift = /RIGHT|1/.test(m[1]) ? "right" : "left";
    if (/autopull\s*=\s*True/.test(raw)) d.autopull = true;
    if (/autopush\s*=\s*True/.test(raw)) d.autopush = true;
    if ((m = raw.match(/pull_thresh\s*=\s*(\d+)/))) d.pullThresh = +m[1];
    if ((m = raw.match(/push_thresh\s*=\s*(\d+)/))) d.pushThresh = +m[1];
    return d;
  }
  // MicroPython decides "optional side-set" itself: optional when some instruction has no .side()
  function mpSideOpt(lines) {
    return lines.some(l => {
      const t = l.replace(/#.*$/, "").trim();
      return /^\w+\(/.test(t) && !/^(label|wrap_target|wrap)\(/.test(t) && !/\.side\(/.test(t);
    });
  }

  // ------------------------------------------------------------------ assembler
  function assemble(source) {
    const errors = [];
    const lines = source.replace(/\r/g, "").split("\n");
    const prog = { name: "program", instr: [], labels: {}, wrapTarget: 0, wrap: -1, sideset: { count: 0, opt: false, pindirs: false }, lineOf: [], errors };
    const pending = [];
    lines.forEach((raw, i) => {
      let line = raw.replace(/(;|\/\/|#).*$/, "").trim();
      if (!line) return;
      // MicroPython: the decorator gives side-set and shift settings; def/import lines are skipped
      if (/^@rp2\.asm_pio/.test(line)) { prog.mp = parseDecorator(raw); if (prog.mp.sidesetCount) prog.sideset = { count: prog.mp.sidesetCount, opt: mpSideOpt(lines), pindirs: false }; return; }
      if (/^def\s|^import\s|^from\s|^#\s*fmt/.test(line)) return;
      if (/^\w+\(.*\)/.test(line) || /^\w+\(\)/.test(line)) {
        const conv = mpLineToAsm(line);
        if (conv === null) { errors.push({ line: i + 1, msg: "I don't understand: " + line }); return; }
        line = conv;
      }
      let m;
      if ((m = line.match(/^\.program\s+(\w+)/))) { prog.name = m[1]; return; }
      if ((m = line.match(/^\.side_set\s+(\d)(\s+opt)?(\s+pindirs)?$/))) {
        prog.sideset = { count: +m[1], opt: !!m[2], pindirs: !!m[3] };
        if (prog.sideset.count + (prog.sideset.opt ? 1 : 0) > 5) errors.push({ line: i + 1, msg: "side_set uses at most 5 bits" });
        return;
      }
      if (line === ".wrap_target") { prog.wrapTarget = pending.length; return; }
      if (line === ".wrap") { prog.wrap = pending.length - 1; return; }
      if (/^\.(origin|define|lang_opt|word)/.test(line)) return;
      if (line.startsWith(".")) { errors.push({ line: i + 1, msg: "Unknown directive " + line }); return; }
      while ((m = line.match(/^(\w+):\s*(.*)$/))) {
        if (prog.labels[m[1].toLowerCase()] !== undefined) errors.push({ line: i + 1, msg: "Label '" + m[1] + "' is used twice" });
        prog.labels[m[1].toLowerCase()] = pending.length;
        line = m[2].trim();
      }
      if (!line) return;
      pending.push({ text: line, line: i + 1 });
    });
    const ss = prog.sideset;
    const delayBits = 5 - ss.count - (ss.opt ? 1 : 0);
    const maxDelay = (1 << delayBits) - 1;
    for (const p of pending) {
      try {
        const ins = parseInstr(p.text, prog, maxDelay);
        ins.line = p.line;
        ins.text = p.text;
        prog.instr.push(ins);
        prog.lineOf.push(p.line);
      } catch (e) {
        errors.push({ line: p.line, msg: e.message });
        prog.instr.push({ op: "nop", delay: 0, side: null, line: p.line, text: p.text, bad: true });
        prog.lineOf.push(p.line);
      }
    }
    if (prog.instr.length > 32) errors.push({ line: pending[32].line, msg: "A PIO block holds only 32 instructions - this program has " + prog.instr.length });
    if (prog.wrap < 0) prog.wrap = prog.instr.length - 1;
    // resolve labels
    for (const ins of prog.instr) {
      if (ins.target !== undefined && typeof ins.target === "string") {
        if (/^\d+$/.test(ins.target)) ins.target = +ins.target;
        else if (prog.labels[ins.target] === undefined) { errors.push({ line: ins.line, msg: "No label called '" + ins.target + "'" }); ins.target = 0; }
        else ins.target = prog.labels[ins.target];
      }
    }
    if (ss.count && !ss.opt) {
      for (const ins of prog.instr) if (ins.side === null && !ins.bad) errors.push({ line: ins.line, msg: "With '.side_set " + ss.count + "' (not opt) every instruction needs 'side <value>'" });
    }
    return prog;
  }

  function num(s, what) {
    s = String(s).trim();
    let v;
    if (/^0x[0-9a-f]+$/i.test(s)) v = parseInt(s, 16);
    else if (/^0b[01]+$/i.test(s)) v = parseInt(s.slice(2), 2);
    else if (/^-?\d+$/.test(s)) v = parseInt(s, 10);
    else throw new Error("'" + s + "' should be a number" + (what ? " (" + what + ")" : ""));
    return v;
  }

  function parseInstr(text, prog, maxDelay) {
    let t = text.toLowerCase().replace(/\s+/g, " ").trim();
    let delay = 0, side = null, m;
    if ((m = t.match(/\[\s*([^\]]+)\]\s*$/))) {
      delay = num(m[1], "delay");
      t = t.slice(0, m.index).trim();
      if (delay < 0 || delay > maxDelay) throw new Error("Delay [" + delay + "] is too big - the most here is [" + maxDelay + "]" + (prog.sideset.count ? " because side-set uses some of the 5 bits" : ""));
    }
    if ((m = t.match(/\s+side\s+(\S+)$/))) {
      side = num(m[1], "side value");
      t = t.slice(0, m.index).trim();
      if (!prog.sideset.count) throw new Error("'side' needs a '.side_set' line at the top");
      if (side >= (1 << prog.sideset.count)) throw new Error("side value " + side + " needs more than " + prog.sideset.count + " side-set bit(s)");
    }
    const [op, ...restArr] = t.split(" ");
    const rest = restArr.join(" ");
    const args = rest ? rest.split(",").map(s => s.trim()) : [];
    const ins = { op, delay, side };
    switch (op) {
      case "nop": if (args.length) throw new Error("nop takes nothing after it"); break;
      case "jmp": {
        const parts = rest.includes(",") ? rest.split(",").map(s => s.trim()) : rest.split(" ").filter(Boolean);
        if (parts.length === 1 && parts[0]) { ins.cond = "always"; ins.target = parts[0]; }
        else if (parts.length === 2) { ins.cond = parts[0]; ins.target = parts[1]; }
        else throw new Error("jmp needs a target, e.g. 'jmp loop' or 'jmp x--, loop'");
        if (ins.cond !== "always" && !(ins.cond in JMP_CONDS)) throw new Error("Unknown jmp condition '" + ins.cond + "' (use !x, x--, !y, y--, x!=y, pin, !osre)");
        break;
      }
      case "wait": {
        const p = rest.replace(/,/g, " ").split(" ").filter(Boolean);
        if (p.length < 3) throw new Error("wait needs: polarity, source, index - e.g. 'wait 1 pin 0'");
        ins.pol = num(p[0], "polarity");
        ins.src = p[1];
        ins.index = num(p[2], "index");
        ins.rel = p[3] === "rel";
        if (ins.pol > 1) throw new Error("wait polarity is 0 or 1");
        if (!["gpio", "pin", "irq"].includes(ins.src)) throw new Error("wait source is gpio, pin or irq");
        break;
      }
      case "in": {
        if (args.length !== 2) throw new Error("in needs: source, bit count - e.g. 'in pins, 1'");
        if (!IN_SRC.includes(args[0])) throw new Error("in source is one of: " + IN_SRC.join(", "));
        ins.src = args[0]; ins.bits = num(args[1], "bit count");
        if (ins.bits < 1 || ins.bits > 32) throw new Error("bit count is 1 to 32");
        break;
      }
      case "out": {
        if (args.length !== 2) throw new Error("out needs: destination, bit count - e.g. 'out pins, 1'");
        if (!OUT_DST.includes(args[0])) throw new Error("out destination is one of: " + OUT_DST.join(", "));
        ins.dst = args[0]; ins.bits = num(args[1], "bit count");
        if (ins.bits < 1 || ins.bits > 32) throw new Error("bit count is 1 to 32");
        break;
      }
      case "push": case "pull": {
        const p = rest.split(" ").filter(Boolean);
        ins.ifx = false; ins.block = true;
        for (const w of p) {
          if (w === "block") ins.block = true;
          else if (w === "noblock") ins.block = false;
          else if ((op === "push" && w === "iffull") || (op === "pull" && w === "ifempty")) ins.ifx = true;
          else throw new Error("Unknown word '" + w + "' after " + op);
        }
        break;
      }
      case "mov": {
        if (args.length !== 2) throw new Error("mov needs: destination, source - e.g. 'mov x, osr'");
        if (!MOV_DST.includes(args[0])) throw new Error("mov destination is one of: " + MOV_DST.join(", "));
        let s = args[1].replace(/\s+/g, ""), opn = "none";
        if (s.startsWith("!") || s.startsWith("~")) { opn = "invert"; s = s.slice(1); }
        else if (s.startsWith("::")) { opn = "reverse"; s = s.slice(2); }
        if (!MOV_SRC.includes(s)) throw new Error("mov source is one of: " + MOV_SRC.join(", "));
        ins.dst = args[0]; ins.src = s; ins.mop = opn;
        break;
      }
      case "irq": {
        const p = rest.replace(/,/g, " ").split(" ").filter(Boolean);
        ins.mode = "set";
        if (["set", "nowait", "wait", "clear"].includes(p[0])) { ins.mode = p[0] === "nowait" ? "set" : p[0]; p.shift(); }
        if (!p.length) throw new Error("irq needs a flag number 0-7");
        ins.index = num(p[0], "irq number");
        ins.rel = p[1] === "rel";
        if (ins.index > 7) throw new Error("irq flags are 0 to 7");
        break;
      }
      case "set": {
        if (args.length !== 2) throw new Error("set needs: destination, value - e.g. 'set pins, 1'");
        if (!SET_DST.includes(args[0])) throw new Error("set destination is one of: " + SET_DST.join(", "));
        ins.dst = args[0]; ins.value = num(args[1], "value");
        if (ins.value < 0 || ins.value > 31) throw new Error("set can only load 0 to 31 (5 bits). For bigger numbers use the FIFO and pull");
        break;
      }
      default:
        throw new Error("'" + op + "' is not a PIO instruction. The nine are: jmp, wait, in, out, push, pull, mov, irq, set (and nop)");
    }
    return ins;
  }

  // ------------------------------------------------------------------ one state machine
  const DEFAULT_CFG = {
    setBase: 0, setCount: 1, outBase: 0, outCount: 1, sidesetBase: 0, inBase: 0, jmpPin: 0,
    outShift: "right", inShift: "left", autopull: false, pullThresh: 32, autopush: false, pushThresh: 32,
    fifoDepth: 4, initPindirs: 0, initPins: 0,
  };

  class StateMachine {
    constructor(prog, cfg) {
      this.prog = prog;
      this.cfg = Object.assign({}, DEFAULT_CFG, cfg || {});
      this.input = (gpio, cycle) => 0;          // external levels on input pins
      this.reset();
    }
    reset() {
      const c = this.cfg;
      this.pc = this.prog.wrapTarget >= 0 ? 0 : 0;
      this.x = 0; this.y = 0;
      this.osr = 0; this.osrCount = 32;          // empty: the first pull/autopull fills it
      this.isr = 0; this.isrCount = 0;
      this.tx = []; this.rx = [];
      this.pins = c.initPins >>> 0;              // output latch, one bit per GPIO
      this.pindirs = c.initPindirs >>> 0;
      this.delay = 0;
      this.stalled = false;
      this.stallReason = "";
      this.irq = 0;
      this.cycle = 0;
      this.lastPc = 0;
      this.halted = false;
      this.execCount = 0;
    }
    gpioLevel(g) {
      if ((this.pindirs >>> g) & 1) return (this.pins >>> g) & 1;
      return this.input(g, this.cycle) ? 1 : 0;
    }
    writePins(base, count, value) {
      for (let i = 0; i < count; i++) {
        const g = (base + i) & 31, b = (value >>> i) & 1;
        this.pins = U32(b ? this.pins | (1 << g) : this.pins & ~(1 << g));
      }
    }
    writeDirs(base, count, value) {
      for (let i = 0; i < count; i++) {
        const g = (base + i) & 31, b = (value >>> i) & 1;
        this.pindirs = U32(b ? this.pindirs | (1 << g) : this.pindirs & ~(1 << g));
      }
    }
    readPins(base, n) {
      let v = 0;
      for (let i = 0; i < n; i++) v |= this.gpioLevel((base + i) & 31) << i;
      return U32(v);
    }
    put(word) { if (this.tx.length >= this.cfg.fifoDepth) return false; this.tx.push(U32(word)); return true; }
    get() { return this.rx.length ? this.rx.shift() : undefined; }

    /** Advance one clock cycle. Returns {pc, executed, stalled, info}. */
    step() {
      const prog = this.prog;
      const ev = { cycle: this.cycle, pc: this.pc, executed: false, stalled: false, info: "" };
      if (!prog.instr.length) { this.cycle++; return ev; }
      if (this.delay > 0) {
        this.delay--; ev.info = "delay"; ev.delayCycle = true; this.cycle++; return ev;
      }
      const ins = prog.instr[this.pc];
      // side-set happens as soon as the instruction is issued, even if it then stalls
      if (ins.side !== null && ins.side !== undefined && prog.sideset.count) {
        if (prog.sideset.pindirs) this.writeDirs(this.cfg.sidesetBase, prog.sideset.count, ins.side);
        else this.writePins(this.cfg.sidesetBase, prog.sideset.count, ins.side);
      }
      const r = this.exec(ins);
      ev.pc = this.lastPc = this.pc;
      if (r.stall) {
        this.stalled = true; this.stallReason = r.stall; ev.stalled = true; ev.info = r.stall; this.cycle++; return ev;
      }
      this.stalled = false; this.stallReason = "";
      ev.executed = true; ev.info = r.info || "";
      this.execCount++;
      if (r.jump !== undefined) this.pc = r.jump;
      else if (this.pc === prog.wrap) this.pc = prog.wrapTarget;
      else this.pc = (this.pc + 1) % prog.instr.length;
      this.delay = r.noDelay ? 0 : ins.delay;
      this.cycle++;
      return ev;
    }

    srcValue(src) {
      switch (src) {
        case "pins": return this.readPins(this.cfg.inBase, 32);
        case "x": return this.x;
        case "y": return this.y;
        case "null": return 0;
        case "isr": return this.isr;
        case "osr": return this.osr;
        case "status": return this.tx.length < this.cfg.fifoDepth ? 0xFFFFFFFF : 0;  // simplified STATUS
      }
      return 0;
    }

    doPull(block) {
      if (!this.tx.length) {
        if (block) return false;
        this.osr = this.x; this.osrCount = 0; return true;     // noblock on empty: copy X
      }
      this.osr = this.tx.shift(); this.osrCount = 0; return true;
    }
    doPush(block) {
      if (this.rx.length >= this.cfg.fifoDepth) {
        if (block) return false;
        this.isr = 0; this.isrCount = 0; return true;          // noblock on full: the data is dropped
      }
      this.rx.push(U32(this.isr)); this.isr = 0; this.isrCount = 0; return true;
    }

    exec(ins) {
      const c = this.cfg;
      switch (ins.op) {
        case "nop": return { info: "nop" };
        case "jmp": {
          let take;
          switch (ins.cond) {
            case "always": take = true; break;
            case "!x": take = this.x === 0; break;
            case "x--": take = this.x !== 0; this.x = U32(this.x - 1); break;
            case "!y": take = this.y === 0; break;
            case "y--": take = this.y !== 0; this.y = U32(this.y - 1); break;
            case "x!=y": take = this.x !== this.y; break;
            case "pin": take = this.gpioLevel(c.jmpPin) === 1; break;
            case "!osre": take = this.osrCount < c.pullThresh; break;
          }
          return take ? { jump: ins.target, info: "jumped" } : { info: "no jump" };
        }
        case "wait": {
          let level;
          if (ins.src === "gpio") level = this.gpioLevel(ins.index);
          else if (ins.src === "pin") level = this.gpioLevel((c.inBase + ins.index) & 31);
          else level = (this.irq >>> ins.index) & 1;
          if (level !== ins.pol) return { stall: "waiting for " + ins.src + " " + ins.index + " to be " + ins.pol };
          if (ins.src === "irq" && ins.pol === 1) this.irq &= ~(1 << ins.index);
          return { info: "wait done" };
        }
        case "in": {
          if (c.autopush && this.isrCount >= c.pushThresh) {
            if (!this.doPush(true)) return { stall: "autopush: RX FIFO full" };
          }
          const n = ins.bits, mask = n === 32 ? 0xFFFFFFFF : ((1 << n) - 1) >>> 0;
          const data = U32(this.srcValue(ins.src) & mask);
          if (c.inShift === "left") this.isr = n === 32 ? data : U32((this.isr << n) | data);
          else this.isr = n === 32 ? data : U32((this.isr >>> n) | (data << (32 - n)));
          this.isrCount = Math.min(32, this.isrCount + n);
          if (c.autopush && this.isrCount >= c.pushThresh) {
            if (this.rx.length < c.fifoDepth) { this.rx.push(this.isr); this.isr = 0; this.isrCount = 0; }
          }
          return { info: "in " + n };
        }
        case "out": {
          if (c.autopull && this.osrCount >= c.pullThresh) {
            if (!this.doPull(true)) return { stall: "autopull: TX FIFO empty" };
          }
          const n = ins.bits, mask = n === 32 ? 0xFFFFFFFF : ((1 << n) - 1) >>> 0;
          let data;
          if (c.outShift === "left") { data = n === 32 ? this.osr : (this.osr >>> (32 - n)) & mask; this.osr = n === 32 ? 0 : U32(this.osr << n); }
          else { data = this.osr & mask; this.osr = n === 32 ? 0 : this.osr >>> n; }
          data = U32(data);
          this.osrCount = Math.min(32, this.osrCount + n);
          switch (ins.dst) {
            case "pins": this.writePins(c.outBase, Math.min(n, c.outCount), data); break;
            case "pindirs": this.writeDirs(c.outBase, Math.min(n, c.outCount), data); break;
            case "x": this.x = data; break;
            case "y": this.y = data; break;
            case "null": break;
            case "isr": this.isr = data; this.isrCount = n; break;
            case "pc": return { jump: data % this.prog.instr.length, info: "out pc" };
            case "exec": return { info: "out exec (not simulated)" };
          }
          return { info: "out " + n };
        }
        case "push": {
          if (ins.ifx && this.isrCount < c.pushThresh) return { info: "push skipped (not full)" };
          if (!this.doPush(ins.block)) return { stall: "push: RX FIFO is full - the CPU must read it" };
          return { info: "pushed" };
        }
        case "pull": {
          if (ins.ifx && this.osrCount < c.pullThresh) return { info: "pull skipped (not empty)" };
          if (!this.doPull(ins.block)) return { stall: "pull: TX FIFO is empty - waiting for the CPU" };
          return { info: "pulled" };
        }
        case "mov": {
          let v = this.srcValue(ins.src);
          if (ins.mop === "invert") v = U32(~v);
          else if (ins.mop === "reverse") { let r = 0; for (let i = 0; i < 32; i++) r = (r << 1) | ((v >>> i) & 1); v = U32(r); }
          switch (ins.dst) {
            case "pins": this.writePins(c.outBase, c.outCount, v); break;
            case "x": this.x = v; break;
            case "y": this.y = v; break;
            case "isr": this.isr = v; this.isrCount = 0; break;
            case "osr": this.osr = v; this.osrCount = 0; break;
            case "pc": return { jump: v % this.prog.instr.length, info: "mov pc" };
            case "exec": return { info: "mov exec (not simulated)" };
          }
          return { info: "mov" };
        }
        case "irq": {
          const idx = ins.index & 7;
          if (ins.mode === "clear") { this.irq &= ~(1 << idx); return { info: "irq clear" }; }
          if (ins.mode === "wait") {
            if (!this.irqWaiting) { this.irq |= 1 << idx; this.irqWaiting = true; }
            if ((this.irq >>> idx) & 1) return { stall: "irq wait: until the CPU clears flag " + idx };
            this.irqWaiting = false; return { info: "irq acknowledged" };
          }
          this.irq |= 1 << idx; return { info: "irq " + idx + " set" };
        }
        case "set": {
          switch (ins.dst) {
            case "pins": this.writePins(c.setBase, c.setCount, ins.value); break;
            case "pindirs": this.writeDirs(c.setBase, c.setCount, ins.value); break;
            case "x": this.x = ins.value; break;
            case "y": this.y = ins.value; break;
          }
          return { info: "set" };
        }
      }
      return { info: "?" };
    }
  }

  // ------------------------------------------------------------------ output in either syntax
  const COND_MP = { "!x": "not_x", "x--": "x_dec", "!y": "not_y", "y--": "y_dec", "x!=y": "x_not_y", "pin": "pin", "!osre": "not_osre" };

  function labelsAt(prog) {
    const at = {};
    for (const [k, v] of Object.entries(prog.labels)) (at[v] = at[v] || []).push(k);
    return at;
  }
  function targetName(prog, t) {
    for (const [k, v] of Object.entries(prog.labels)) if (v === t) return k;
    return String(t);
  }

  function toMicroPython(prog) {
    const at = labelsAt(prog), out = [];
    prog.instr.forEach((ins, i) => {
      if (i === prog.wrapTarget && prog.wrapTarget !== 0) out.push("wrap_target()");
      if (i === prog.wrapTarget && prog.wrapTarget === 0 && prog.wrap !== prog.instr.length - 1) out.push("wrap_target()");
      for (const l of at[i] || []) out.push('label("' + l + '")');
      let s;
      switch (ins.op) {
        case "nop": s = "nop()"; break;
        case "jmp": s = ins.cond === "always" ? 'jmp("' + targetName(prog, ins.target) + '")' : "jmp(" + COND_MP[ins.cond] + ', "' + targetName(prog, ins.target) + '")'; break;
        case "wait": s = "wait(" + ins.pol + ", " + ins.src + ", " + ins.index + ")"; break;
        case "in": s = "in_(" + ins.src + ", " + ins.bits + ")"; break;
        case "out": s = "out(" + ins.dst + ", " + ins.bits + ")"; break;
        case "push": s = "push(" + [ins.ifx ? "iffull" : "", ins.block ? "" : "noblock"].filter(Boolean).join(", ") + ")"; break;
        case "pull": s = "pull(" + [ins.ifx ? "ifempty" : "", ins.block ? "" : "noblock"].filter(Boolean).join(", ") + ")"; break;
        case "mov": s = "mov(" + ins.dst + ", " + (ins.mop === "invert" ? "invert(" + ins.src + ")" : ins.mop === "reverse" ? "reverse(" + ins.src + ")" : ins.src) + ")"; break;
        case "irq": s = ins.mode === "set" ? "irq(" + ins.index + ")" : ins.mode === "wait" ? "irq(block, " + ins.index + ")" : "irq(clear, " + ins.index + ")"; break;
        case "set": s = "set(" + ins.dst + ", " + ins.value + ")"; break;
      }
      if (ins.side !== null && ins.side !== undefined) s += " .side(" + ins.side + ")";
      if (ins.delay) s = s.padEnd(24) + "[" + ins.delay + "]";
      out.push(s);
      if (i === prog.wrap && prog.wrap !== prog.instr.length - 1) out.push("wrap()");
    });
    return out;
  }

  function toAsm(prog) {
    const at = labelsAt(prog), out = [];
    if (prog.sideset.count) out.push(".side_set " + prog.sideset.count + (prog.sideset.opt ? " opt" : ""));
    prog.instr.forEach((ins, i) => {
      if (i === prog.wrapTarget && (prog.wrapTarget !== 0 || prog.wrap !== prog.instr.length - 1)) out.push(".wrap_target");
      for (const l of at[i] || []) out.push(l + ":");
      out.push("    " + ins.text.replace(/\s+/g, " "));
      if (i === prog.wrap && prog.wrap !== prog.instr.length - 1) out.push(".wrap");
    });
    return out;
  }

  const api = { assemble, StateMachine, toMicroPython, toAsm, mpLineToAsm, DEFAULT_CFG };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PIO = api;
})(typeof window !== "undefined" ? window : this);
