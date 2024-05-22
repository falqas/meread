import { sendDailyPages } from './src/index';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

// Load environment variables from .env file
dotenv.config();

let db;

// Ensure database connection is established
function getDatabaseConnection() {
  if (!db) {
    db = new sqlite3.Database(
      './meread.db',
      sqlite3.OPEN_READWRITE,
      (err) => {
        if (err) {
          console.error('Cannot open database', err);
          process.exit(1); // Exit app if DB connection fails
        } else {
          console.log('Connected to SQLite database.');
        }
      }
    );
  }
  return db;
}

// Initialize database connection
getDatabaseConnection();

// Get the email argument from command line
const emailArg = process.argv[2];

if (!emailArg) {
  console.error(
    `Please provide an email address or 'ALL' as an argument.`
  );
  process.exit(1);
}
sendDailyPages(emailArg);

// Log to confirm the function has been triggered
const now = new Date();
console.log(
  `sendDailyPages function has been manually triggered at ${now}`
);
