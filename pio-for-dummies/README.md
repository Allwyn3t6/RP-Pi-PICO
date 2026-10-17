# PIO for Dummies

A browser game that teaches the RP2040's Programmable I/O (PIO) from zero.

Live: https://allwyn3t6.github.io/RP-Pi-PICO/pio-for-dummies/

## Chapters

0. Start here
1. Why PIO? Fixed peripherals, bit-banging and timing jitter
2. Gates → state machines: logic gates, D flip-flop, counter, FSM block diagram, a 3D turnstile (Mealy/Moore), a 3D traffic light, and a timeline from TTL to PIO
3. Meet PIO: a 3D model of the PIO block (state machines, instruction memory, FIFOs, OSR/ISR, IRQ flags, GPIO)
4. How it runs: cycles, clock divider, delay, wrap, stalls, side-set, pin groups
5. The 9 instructions, in assembly and in MicroPython
6. Missions: 8 graded programming missions in the simulator, from one LED to a UART transmitter, plus a sandbox
7. PIO in MicroPython: the `rp2` module, the decorator, common mistakes
8. Final challenge: a 10-question exam and a printable certificate

## Files

| File | What it does |
|---|---|
| `index.html` | Page layout and styles (light and dark) |
| `pio-sim.js` | PIO assembler (pioasm and MicroPython syntax) and a cycle-exact state machine simulator |
| `scenes3d.js` | Three.js scenes: state machines in 3D, the PIO block |
| `app.js` | Chapters, widgets, simulator UI, missions, quizzes, XP and progress |

Progress is saved in the student's browser (localStorage). No server and no build step are needed.

The simulator models one state machine: PC, X, Y, OSR/ISR with shift counters, 4-word TX/RX FIFOs,
autopull/autopush, delays, side-set (with `opt`), wrap, stalls and all 9 instructions. It does not model
several state machines together or the DMA.
