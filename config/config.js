import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

let config = {};

config.username = process.env.AMQUSER;
config.password = process.env.AMQPASS;
config.settings =
  '6082s1111111132s000011110000002s1111005051o1100k012r02i0a46511002s0111110111002s0111002s01a111111111102a1111111111i01k503-11111--';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SHEET_ID = process.env.SHEET_ID;

const saveSong = async song => {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets('v4');

  const request = {
    spreadsheetId: SHEET_ID,
    range: 'Sheet',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [song],
    },
    auth,
  };

  sheets.spreadsheets.values.append(request, err => {
    if (err) throw err;
  });
};

export { config, saveSong, readline };
