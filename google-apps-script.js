/**
 * Vivante Events — Google Apps Script
 * ====================================
 * SETUP:
 * 1. Create a Google Sheet and copy its ID from the URL:
 *    https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
 * 2. Open Extensions → Apps Script, paste this file into Code.gs
 * 3. Set YOUR_SHEET_ID and NOTIFICATION_EMAIL below
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL into js/main.js (SCRIPT_URL)
 *
 * Sheet headers (Row 1):
 * Timestamp | Full Name | Company | Phone | Email | Event Type |
 * Event Date | Guests | Budget | Message
 */

// ---- Configuration ----
var SHEET_ID = 'YOUR_SHEET_ID';
var SHEET_NAME = 'Enquiries';
var NOTIFICATION_EMAIL = 'hello@vivanteevents.com';

/**
 * Handle POST requests from the contact form.
 * @param {Object} e - Event object
 * @return {TextOutput} JSON response
 */
function doPost(e) {
  try {
    var data = parseRequestData(e);

    if (!data.fullName || !data.phone || !data.email) {
      return jsonResponse('error', 'Missing required fields.');
    }

    appendToSheet(data);
    sendNotificationEmail(data);

    return jsonResponse('success', 'Enquiry received.');
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse('error', 'Server error. Please try again.');
  }
}

/**
 * GET — health check and CORS preflight support.
 * Browsers may send GET to verify the endpoint.
 * @return {TextOutput}
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.preflight === '1') {
    return jsonResponse('success', 'OK');
  }
  return jsonResponse('success', 'Vivante Events form endpoint is active.');
}

/**
 * Parse JSON or form-encoded POST body.
 * @param {Object} e
 * @return {Object}
 */
function parseRequestData(e) {
  if (!e || !e.postData) {
    throw new Error('No post data received.');
  }

  var contentType = e.postData.type || '';

  if (contentType.indexOf('application/json') !== -1) {
    return JSON.parse(e.postData.contents);
  }

  if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
    var p = e.parameter || {};
    return {
      fullName: p.fullName || '',
      company: p.company || '',
      phone: p.phone || '',
      email: p.email || '',
      eventType: p.eventType || '',
      eventDate: p.eventDate || '',
      guests: p.guests || '',
      budget: p.budget || '',
      message: p.message || '',
    };
  }

  return JSON.parse(e.postData.contents);
}

/**
 * Append enquiry row to Google Sheet by ID.
 * @param {Object} data
 */
function appendToSheet(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp',
      'Full Name',
      'Company',
      'Phone',
      'Email',
      'Event Type',
      'Event Date',
      'Guests',
      'Budget',
      'Message',
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  sheet.appendRow([
    new Date(),
    data.fullName || '',
    data.company || '',
    data.phone || '',
    data.email || '',
    data.eventType || '',
    data.eventDate || '',
    data.guests || '',
    data.budget || '',
    data.message || '',
  ]);
}

/**
 * Send formatted email notification.
 * @param {Object} data
 */
function sendNotificationEmail(data) {
  var subject = 'New Event Enquiry — ' + (data.fullName || 'Unknown');

  var body = [
    'A new enquiry has been submitted via vivanteevents.com',
  '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'CONTACT DETAILS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Name:     ' + (data.fullName || '—'),
    'Company:  ' + (data.company || '—'),
    'Phone:    ' + (data.phone || '—'),
    'Email:    ' + (data.email || '—'),
  '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'EVENT DETAILS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Type:     ' + (data.eventType || '—'),
    'Date:     ' + (data.eventDate || '—'),
    'Guests:   ' + (data.guests || '—'),
    'Budget:   ' + (data.budget || '—'),
  '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'MESSAGE',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    data.message || '(No message provided)',
  '',
    'Submitted: ' +
      Utilities.formatDate(
        new Date(),
        'Asia/Kolkata',
        "dd MMM yyyy, HH:mm 'IST'"
      ),
  ].join('\n');

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    body: body,
    replyTo: data.email || NOTIFICATION_EMAIL,
  });
}

/**
 * Return JSON with CORS-friendly TextOutput.
 * Google Apps Script web app deployments handle CORS for fetch requests.
 * @param {string} result - "success" or "error"
 * @param {string} message
 * @return {TextOutput}
 */
function jsonResponse(result, message) {
  var payload = JSON.stringify({
    result: result,
    message: message,
  });

  return ContentService.createTextOutput(payload).setMimeType(
    ContentService.MimeType.JSON
  );
}
