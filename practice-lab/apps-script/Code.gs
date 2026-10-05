/**
 * RP2040 Practice Lab: receives a student's result and adds it to the "Scores" tab.
 * Paste this into Extensions > Apps Script of the "RP2040 Practice Lab – Student Scores" sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */
const SHEET_NAME = 'Scores';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const text = (v, max) => {
      let t = String(v == null ? '' : v).trim().slice(0, max);
      if (/^[=+\-@]/.test(t)) t = "'" + t;          // stop formula injection
      return t;
    };
    const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));

    const name = text(d.name, 60), roll = text(d.roll, 20).toUpperCase(), unit = text(d.unit, 50);
    if (!name || !roll || !/^(M[1-8]|MIX) .{1,40}$/.test(unit)) return reply({ ok: false, error: 'bad data' });

    SpreadsheetApp.getActive().getSheetByName(SHEET_NAME).appendRow([
      new Date(), name, roll, unit,
      num(d.first, 50), num(d.total, 50), num(d.hints, 200), num(d.mistakes, 200),
      num(d.stars, 3), Math.round(num(d.minutes, 600) * 10) / 10,
      text(d.missed, 3000)
    ]);
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return reply({ ok: true, message: 'RP2040 Practice Lab score service is running.' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
