const { google } = require('googleapis');
const path = require('path');

const KEYFILEPATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Creates a new Google Sheet with the provided data.
 * @param {string} title - The title of the spreadsheet.
 * @param {Array<Array<string>>} data - The booking data to write to the sheet.
 * @returns {Promise<string>} The URL of the created spreadsheet.
 */
async function createSheet(title, data) {
  const resource = {
    properties: {
      title,
    },
  };

  try {
    const spreadsheet = await sheets.spreadsheets.create({ resource });
    const spreadsheetId = spreadsheet.data.spreadsheetId;

    const range = 'Sheet1!A1';
    const resourceBody = {
      values: data,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: resourceBody,
    });
    
    return spreadsheet.data.spreadsheetUrl;
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    throw new Error('Failed to create Google Sheet.');
  }
}

module.exports = { createSheet };