import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { EPub } from 'epub2';
import { v4 as uuidv4 } from 'uuid';
import multer, { FileFilterCallback } from 'multer';
import * as cron from 'node-cron';
import sgMail from '@sendgrid/mail';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

import { createTablesQuery } from './models.js';
const ALL_USERS = 'ALL';

cron.schedule('30 6 * * *', () => {
  // Task runs every day at 6:30 AM
  const now = new Date();
  sendDailyPages(ALL_USERS);
  console.log(`sendDailyPages task has run at ${now}`);
});

let db;

function getDatabaseConnection() {
  if (!db) {
    db = new sqlite3.Database(
      './meread.db',
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          console.error('Cannot open database', err);
          process.exit(1);
        } else {
          console.log('Connected to SQLite database.');
        }
      }
    );
  }
  return db;
}

function createTables() {
  const db = getDatabaseConnection();
  db.exec(createTablesQuery, (err) => {
    if (err) {
      console.error('Error creating tables', err.message);
    } else {
      console.log('Tables created or already exist.');
    }
  });
}

function init() {
  getDatabaseConnection();
  createTables();
}

init();

function dispatchEmail(msg: any) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgMail
    .send(msg)
    .then(() => {
      const now = new Date();
      console.log(`Email sent at ${now}`);
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function sendDailyPages(user: string, DocumentID?: string) {
  // user is either an email address or the string 'ALL'
  // get userId (or all users if null)
  // for each user, get their daily page
  // email users their current page
  // increment their current location for tomorrow's email
  let userEmailsWithCurrentLocation;
  const params = [];

  if (user === ALL_USERS) {
    userEmailsWithCurrentLocation = `SELECT Email, DocumentID, CurrentLocation, CharacterLength FROM UserDocuments WHERE IsActive = 1`;
  } else if (user && DocumentID) {
    userEmailsWithCurrentLocation = `SELECT Email, DocumentID, CurrentLocation, CharacterLength FROM UserDocuments WHERE IsActive = 1 AND Email = ? AND DocumentID = ?`;
    params.push(user, DocumentID);
  } else {
    userEmailsWithCurrentLocation = `SELECT Email, DocumentID, CurrentLocation, CharacterLength FROM UserDocuments WHERE IsActive = 1 AND Email = ?`;
    params.push(user);
  }

  db.all(
    userEmailsWithCurrentLocation,
    params,
    (err, userCurrentLocationRows) => {
      if (err) {
        console.error('Error getting users', err.message);
        return;
      }

      userCurrentLocationRows.forEach((userCurrentLocationRow) => {
        const { CurrentLocation, CharacterLength } =
          userCurrentLocationRow;

        const contentBufferLength = 50; // Buffer of 50 characters between today's content and yesterday's content, for better continuity/context

        const getTodaysContent = `SELECT SUBSTR(Content, ${Math.max(
          CurrentLocation - contentBufferLength,
          0
        )}, ${
          CharacterLength + contentBufferLength
        }) as TodaysContent FROM Documents WHERE DocumentID = ?`;
        db.get(
          getTodaysContent,
          [userCurrentLocationRow.DocumentID],
          (err, contentRow) => {
            if (err) {
              console.error('Error getting next page', err.message);
              return;
            } else {
              const msg = {
                to: userCurrentLocationRow.Email, // Change to your recipient
                from: {
                  name: 'MeRead',
                  email: 'mereadreadme@gmail.com', // Sender email address
                },
                subject: 'Your daily page, friend.',
                html: contentRow.TodaysContent,
              };
              // Update current location of row
              const updateCurrentLocation = `UPDATE UserDocuments SET CurrentLocation = CurrentLocation + ${CharacterLength} WHERE DocumentID = ?`;
              db.run(
                updateCurrentLocation,
                [userCurrentLocationRow.DocumentID],
                (err) => {
                  if (err) {
                    console.error(
                      'Error updating current location',
                      err.message
                    );
                    return;
                  }
                }
              );
              dispatchEmail(msg);
            }
          }
        );
      });
    }
  );
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this uploads directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  },
});
const upload = multer({
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  storage,
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (file.mimetype === 'application/epub+zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .epub files are allowed!'));
    }
  },
});

app.get('/', (req: Request, res: Response) => {
  res.send(`

<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>MeRead</title>
        <style type="text/css">
            body {
                margin: 40px auto;
                max-width: 650px;
                line-height: 1.6;
                font-size: 18px;
                color: #444;
                padding: 0 10px
            }

            h1,h2,h3 {
                line-height: 1.2
            }
        </style>
    </head>
    <body>
        <header>
            <h1>MeRead 📚</h1>
            <h3>Yes, you - read! Upload a book, friend</h3>
          </header>
        <form action="/upload" method="post" enctype="multipart/form-data">
          <label for="email">
          <h3>1. Email</h3>
          </label>
          <input type="email" id="email" name="email" required><br><br>
          <h3>2. ePub file</h3>
          <input type="file" id="epubFile" name="epubFile" accept=".epub" required><br><br>
          <h3>3. Upload</h3>
          <button type="submit">Upload File</button>
        </form>
    </body>
</html>
  `);
});

app.post('/upload', upload.single('epubFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Please upload an EPUB file.');
  }

  try {
    const db = getDatabaseConnection();

    // get or create user
    const maybeUserQuery = `SELECT * FROM Users WHERE Email = ?`;
    db.get(maybeUserQuery, [req.body.email], (err, row) => {
      if (err) {
        console.error('Error getting user', err.message);
        return res.status(500).send('Error getting user.');
      }

      if (!row) {
        const insertUser = `INSERT INTO Users (Email, SignUpDate) VALUES (?, ?)`;
        db.run(
          insertUser,
          [req.body.email, new Date().toISOString()],
          (err) => {
            if (err) {
              console.error('Error inserting user', err.message);
              return res.status(500).send('Error inserting user.');
            }
          }
        );
      }
    });

    const epub = await EPub.createAsync(req.file.path);

    const title = epub.metadata.title;

    const allChapterIds = epub.flow.map((chapter: any) => chapter.id);
    const allContent = await Promise.all(
      allChapterIds.map((id: string) => {
        return new Promise((resolve, reject) => {
          epub.getChapter(id, (err: any, data: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      })
    );
    const allContentAsString = allContent.join('');
    const sql = `INSERT INTO Documents (DocumentID, Title, UploadDate, Content) VALUES (?, ?, ?, ?)`;
    const newDocumentID = uuidv4(); // Ensure uuidv4 is imported properly
    const now = new Date().toISOString();

    await db.run(
      sql,
      [newDocumentID, title, now, allContentAsString],
      function (err) {
        if (err) {
          console.error('Error inserting into database', err.message);
          return res
            .status(500)
            .send('Error storing file information.');
        }

        res.send(
          `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>MeRead</title>
        <style type="text/css">
            body {
                margin: 40px auto;
                max-width: 650px;
                line-height: 1.6;
                font-size: 18px;
                color: #444;
                padding: 0 10px
            }

            h1,h2,h3 {
                line-height: 1.2
            }
        </style>
    </head>
    <body>
        <header>
            <h1>File uploaded, friend 📚</h1>
          </header>
          <h3>Check your email (spam folder, probably) for your first daily page!</h3>
          <h3>See you again tomorrow at 6:30am ET</h3>
    </body>
</html>
          `
        );
      }
    );

    // create new record in UserDocuments table
    const newUserDocumentID = uuidv4();
    const insertUserDocument = `INSERT INTO UserDocuments (UserDocumentID, Email, DocumentID, CurrentLocation, AccessDate) VALUES (?, ?, ?, ?, ?)`;
    await db.run(
      insertUserDocument,
      [newUserDocumentID, req.body.email, newDocumentID, 1, now],
      (err) => {
        if (err) {
          console.error('Error inserting user document', err.message);
          return res
            .status(500)
            .send(
              'Error inserting user document. Do you already have a book uploaded?'
            );
        }
      }
    );

    sendDailyPages(req.body.email, newDocumentID);
  } catch (error) {
    console.error('Error processing file', error);
    res.status(500).send('Error processing file.');
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});
