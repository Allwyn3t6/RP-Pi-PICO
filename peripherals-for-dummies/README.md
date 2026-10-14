# RP2040 Peripherals for Dummies

A plain-language, self-paced study tool for **U21BM501 – Microcontroller and its Applications**.
It starts with Helper 0, "The basics" (no prerequisites: pins, volts, bits, hex, clocks, units, registers), then covers ten RP2040 peripherals: Timer, PWM, ADC, UART, I²C, SPI, RTC, Watchdog, SSI/XIP and USB.

**Open:** https://allwyn3t6.github.io/RP-Pi-PICO/peripherals-for-dummies/

## What each helper (peripheral) has

| Tab | What the student does |
| --- | --- |
| 1 · Understand | One-line summary, an everyday "Picture this" story, a 4-step animated diagram, a jargon buster |
| 2 · Play | A live simulator with three "Try this" tasks |
| 3 · Real life | Biomedical uses, Pico pins to wire, common beginner mistakes |
| 4 · Code | A short MicroPython (or C SDK) program to copy into Thonny or Wokwi |
| 5 · Check yourself | Three questions; all correct completes the helper |

A helper is complete when Understand, Play and Check yourself are all done (three green dots).
Progress is stored only in the student's own browser. No scores are sent anywhere;
for score-tracked revision use the [Practice Lab](../practice-lab/).

## Files

`index.html` is the whole tool: one page, no build step. It loads GSAP and anime.js from cdnjs and fonts from Google Fonts.
To change wording, edit the `D` object near the end of the script (one entry per helper).
