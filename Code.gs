// ============================================================
// CLIQUE DANCE STUDIO — Booking System Backend
// Google Apps Script (Code.gs)
// Deploy as: Web App > Execute as Me > Anyone can access
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace after creating your Sheet
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // Replace with your payments folder ID

const TABS = {
  scheduleA: 'Schedule_A',
  bookingsA: 'Bookings_A',
  scheduleB: 'Schedule_B',
  bookingsB: 'Bookings_B',
  settings:  'Settings',
};

// ── CORS HELPER ─────────────────────────────────────────────
function corsResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── ROUTER ──────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getSlots')     return handleGetSlots(e);
  if (action === 'getSchedule')  return handleGetSchedule(e);

  return corsResponse({ error: 'Unknown action' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'submitBooking') return handleSubmitBooking(data);

    return corsResponse({ error: 'Unknown action' });
  } catch (err) {
    return corsResponse({ error: err.message });
  }
}

// ── GET: SLOTS ───────────────────────────────────────────────
// Returns classes + bookings for a given studio and date range
// Called by the website to build the availability grid
function handleGetSlots(e) {
  const studio = e.parameter.studio; // 'A' or 'B'
  const dateStr = e.parameter.date;  // 'YYYY-MM-DD', returns full week

  if (!studio || !dateStr) return corsResponse({ error: 'Missing studio or date' });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const scheduleTab = studio === 'A' ? TABS.scheduleA : TABS.scheduleB;
  const bookingsTab = studio === 'A' ? TABS.bookingsA : TABS.bookingsB;

  const classes  = getClasses(ss, scheduleTab, dateStr);
  const bookings = getBookings(ss, bookingsTab, dateStr);

  return corsResponse({ classes, bookings });
}

// Returns all class rows for a given date (exact match on date column)
function getClasses(ss, tabName, dateStr) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Date, Start, End, ClassName
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = formatDate(row[0]);
    if (!rowDate) continue;

    // Return all classes within a 5-week window of the requested date
    results.push({
      date:      rowDate,
      start:     row[1], // e.g. "09:00"
      end:       row[2], // e.g. "10:00"
      className: row[3],
      type:      'class',
    });
  }

  return results;
}

// Returns all booking rows for a given date
function getBookings(ss, tabName, dateStr) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = formatDate(row[4]); // Column E: Date
    if (!rowDate) continue;

    const status = (row[10] || '').toString().trim().toLowerCase(); // Column K: Status
    if (status === 'rejected') continue; // Don't show rejected slots

    results.push({
      id:        row[0],  // Column A: Booking ID
      date:      rowDate,
      start:     row[5],  // Column F: Start Time
      end:       row[6],  // Column G: End Time
      status:    status || 'pending',
      type:      'booking',
    });
  }

  return results;
}

// ── GET: SCHEDULE (for admin reference) ─────────────────────
function handleGetSchedule(e) {
  const studio = e.parameter.studio;
  if (!studio) return corsResponse({ error: 'Missing studio' });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tabName = studio === 'A' ? TABS.scheduleA : TABS.scheduleB;
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return corsResponse({ error: 'Tab not found' });

  const data = sheet.getDataRange().getValues();
  return corsResponse({ schedule: data });
}

// ── POST: SUBMIT BOOKING ─────────────────────────────────────
function handleSubmitBooking(data) {
  const {
    studio, name, contact, instagramOrEmail,
    date, startTime, endTime, numberOfPeople,
    fileData, fileName, fileType, paymentType,
  } = data;

  if (!studio || !name || !date || !startTime || !endTime || !fileData) {
    return corsResponse({ success: false, error: 'Missing required fields' });
  }

  // 1. Check capacity
  const capacity = studio === 'A' ? 40 : 6;
  if (parseInt(numberOfPeople) > capacity) {
    return corsResponse({
      success: false,
      error: `Studio ${studio} can only accommodate ${capacity} people.`,
    });
  }

  // 2. Check for conflicts (class or confirmed/pending booking on same slot)
  const conflict = checkConflict(studio, date, startTime, endTime);
  if (conflict) {
    return corsResponse({ success: false, error: 'That slot is no longer available.' });
  }

  // 3. Upload payment proof to Drive
  const driveLink = uploadToDrive(fileData, fileName, fileType, name, date, studio);

  // 4. Log booking to Sheets
  const bookingId = logBooking({
    studio, name, contact, instagramOrEmail,
    date, startTime, endTime, numberOfPeople,
    driveLink, paymentType,
  });

  return corsResponse({ success: true, bookingId });
}

// ── CONFLICT CHECK ───────────────────────────────────────────
function checkConflict(studio, date, startTime, endTime) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const scheduleTab = studio === 'A' ? TABS.scheduleA : TABS.scheduleB;
  const bookingsTab = studio === 'A' ? TABS.bookingsA : TABS.bookingsB;

  const classes  = getClasses(ss, scheduleTab, date);
  const bookings = getBookings(ss, bookingsTab, date);

  const all = [...classes, ...bookings].filter(s => s.date === date);

  for (const slot of all) {
    if (timesOverlap(startTime, endTime, slot.start, slot.end)) {
      return true;
    }
  }

  return false;
}

function timesOverlap(start1, end1, start2, end2) {
  const toMins = t => {
    const [h, m] = t.toString().split(':').map(Number);
    return h * 60 + m;
  };
  return toMins(start1) < toMins(end2) && toMins(end1) > toMins(start2);
}

// ── DRIVE UPLOAD ─────────────────────────────────────────────
function uploadToDrive(base64Data, fileName, fileType, clientName, date, studio) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Clean filename: Studio_Date_ClientName_originalfile.jpg
  const safeClient = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanName  = `Studio${studio}_${date}_${safeClient}_${fileName}`;

  const decoded = Utilities.base64Decode(base64Data);
  const blob    = Utilities.newBlob(decoded, fileType, cleanName);
  const file    = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

// ── LOG BOOKING TO SHEETS ────────────────────────────────────
function logBooking({ studio, name, contact, instagramOrEmail, date, startTime, endTime, numberOfPeople, driveLink, paymentType }) {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tabName = studio === 'A' ? TABS.bookingsA : TABS.bookingsB;
  const sheet   = ss.getSheetByName(tabName);

  const bookingId = 'BK-' + Date.now();
  const timestamp = new Date();

  // Columns: ID | Name | Contact | IG/Email | Date | Start | End | People | Payment Proof | Timestamp | Status | Payment Type
  sheet.appendRow([
    bookingId,
    name,
    contact,
    instagramOrEmail,
    date,
    startTime,
    endTime,
    numberOfPeople,
    driveLink,
    timestamp,
    'pending', // Default status — you change this to 'confirmed' or 'rejected' in the sheet
    paymentType || 'dp', // 'dp' = downpayment only, 'full' = full payment
  ]);

  return bookingId;
}

// ── UTILITY ──────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

// ── SHEET SETUP HELPER ───────────────────────────────────────
// Run this ONCE manually from the Apps Script editor to create all tabs and headers
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const scheduleHeaders = ['Date', 'Start Time', 'End Time', 'Class Name'];
  const bookingHeaders  = [
    'Booking ID', 'Name', 'Contact', 'Instagram / Email',
    'Date', 'Start Time', 'End Time', 'Number of People',
    'Payment Proof (Drive Link)', 'Submitted At', 'Status', 'Payment Type',
  ];
  const settingsData = [
    ['Setting', 'Value'],
    ['Studio A Capacity', 40],
    ['Studio B Capacity', 6],
    ['Operating Hours Start', '08:00'],
    ['Operating Hours End', '22:00'],
    ['Slot Interval (minutes)', 60],
  ];

  const tabs = [
    { name: TABS.scheduleA, headers: scheduleHeaders },
    { name: TABS.bookingsA, headers: bookingHeaders },
    { name: TABS.scheduleB, headers: scheduleHeaders },
    { name: TABS.bookingsB, headers: bookingHeaders },
  ];

  tabs.forEach(({ name, headers }) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  // Settings tab
  let settingsSheet = ss.getSheetByName(TABS.settings);
  if (!settingsSheet) settingsSheet = ss.insertSheet(TABS.settings);
  settingsSheet.clearContents();
  settingsSheet.getRange(1, 1, settingsData.length, 2).setValues(settingsData);
  settingsSheet.getRange(1, 1, 1, 2).setFontWeight('bold');

  Logger.log('✅ All tabs created successfully.');
}
