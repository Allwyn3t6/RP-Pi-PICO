# RP2040 Practice Lab

A self-paced practice game for **U21BM501 – Microcontroller and its Applications** (Units 1–3, 52 questions).
Students play on their own phone or a lab PC. Each wrong answer comes back later until it is learnt,
and each finished unit sends the student's result to the teacher's private Google Sheet.

**Play:** https://allwyn3t6.github.io/RP-Pi-PICO/practice-lab/

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The game (single page, no build step) |
| `config.js` | Holds the Google Apps Script web-app URL that receives scores |
| `apps-script/Code.gs` | Script to paste into the score sheet (Extensions > Apps Script) |

## What is recorded

One row per finished unit in the **Scores** tab: time, name, roll number, unit, questions right first time,
hints used, mistakes, stars, minutes taken and the questions missed on the first try.
The **Summary** tab shows each student's best result per unit, attempts per student and the questions missed most often.

Student scores never go into this repository. They are stored only in the teacher's Google Sheet.

## Setting up score collection (one time)

1. Open the score sheet, then **Extensions > Apps Script**.
2. Delete the sample code, paste the contents of `apps-script/Code.gs`, and save.
3. **Deploy > New deployment**, choose type **Web app**.
   Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and allow the permissions.
4. Copy the **Web app URL** (it ends in `/exec`).
5. Paste it into `config.js` between the quotes of `scoreUrl`, and commit.

If you later change `Code.gs`, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.
