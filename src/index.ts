// next steps:
// send new chapter each day
// store to sql
// does sendgrid support email replies? e.g. send more chapters daily
// store user email in sql
// NO user auth - just have users table with email and book/chapter number
// upload doc flow
// deploy
// add chapter to subject
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import EPub from 'epub2';
import { v4 as uuidv4 } from 'uuid';
import multer, { FileFilterCallback } from 'multer';
import * as cron from 'node-cron';
import sgMail from '@sendgrid/mail';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
import sqlite3 from 'sqlite3';

import { createTables } from './models';

cron.schedule('30 6 * * *', () => {
  console.log('Sending new page at 6:30am every day');
});

const db = new sqlite3.Database('./meread.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables', err.message);
      } else {
        console.log('Tables created or already exist.');
      }
    });
  }
});

function dispatchEmail(msg: any) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('apikey', process.env.SENDGRID_API_KEY);
  console.log('MESSAGE', msg);

  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent');
    })
    .catch((error: any) => {
      console.error(error);
    });
}

function getDailyPages() {
  // get all users
  // for each user, get their daily page
  // email users their current page
  // increment their current location for tomorrow's email

  const userEmailsWithCurrentLocation = `SELECT Email, DocumentID, CurrentLocation, CharacterLength FROM UserDocuments WHERE IsActive = 1`;

  db.all(
    userEmailsWithCurrentLocation,
    [],
    (err, userCurrentLocationRows) => {
      if (err) {
        console.error('Error getting users', err.message);
        return;
      }

      userCurrentLocationRows.forEach(
        (userCurrentLocationRow: any) => {
          const { CurrentLocation, CharacterLength } =
            userCurrentLocationRow;

          const contentBufferLength = 50; // Buffer of 50 characters between today's content and yesterday's content, for better continuity/context

          const getTodaysContent = `SELECT SUBSTR(Content, ${
            CurrentLocation - contentBufferLength
          }, ${
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
                  to: (userCurrentLocationRow as any).Email, // Change to your recipient
                  from: 'mereadreadme@gmail.com',
                  subject: 'Your daily page, friend.',
                  html: (contentRow as any).TodaysContent,
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
        }
      );
    }
  );
}

getDailyPages();
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
  storage: multer.diskStorage({}),
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
  getDailyPages();
  res.send(`
    <h2>Upload an EPUB File</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <label for="email">Email:</label><br>
      <input type="email" id="email" name="email" required><br><br>
      <input type="file" id="epubFile" name="epubFile" accept=".epub" required><br><br>
      <button type="submit">Upload File</button>
    </form>
  `);
});

// app.post(
//   '/upload',
//   upload.single('epubFile'),
//   (req: Request, res: Response) => {
//     const email = req.body.email;
//     const file = req.file;

//     if (!file) {
//       return res.status(400).send('Please upload an EPUB file.');
//     }

//     const db = new sqlite3.Database(
//       './meread.db',
//       sqlite3.OPEN_READWRITE,
//       async (err) => {
//         if (err) {
//           console.error('Error opening database', err.message);
//           return res.status(500).send('Database error.');
//         }
//         const epubfile = req.file;
//         if (!epubfile) {
//           // Handle the case when req.file is undefined
//           // For example, return an error response
//           return res.status(400).send('Please upload an EPUB file.');
//         }

//         const epub = await EPub.createAsync(epubfile.path);

//         // createAsync(epubfile.path).then(
//         //   (epub: any) => {
//         //     console.log(epub);
//         //     const flow = epub.flow;
//         //     const chapter1 = flow[4];
//         //     const chapter1Id = chapter1.id;

//         //     const chapter1Content = epub.getChapter(
//         //       chapter1Id,
//         //       (err: any, data: any) => {
//         //         console.log('nonraw');
//         //         console.log(data);
//         //       }
//         //     );
//         //   }
//         // );
//         console.log('epub', epub);
//         const newDocumentID = uuidv4();
//         const sql = `INSERT INTO Documents (DocumentID, Title, UploadDate, Content) VALUES (${newDocumentID}, My Title, Date, Foobarbaz)`;
//         db.run(sql, [email, file.originalname, file.size], (err) => {
//           if (err) {
//             console.error(
//               'Error inserting into database',
//               err.message
//             );
//             return res
//               .status(500)
//               .send('Error storing file information.');
//           }

//           res.send(
//             'File uploaded and information stored successfully.'
//           );
//         });

//         db.close();
//       }
//     );
//   }
// );

app.post('/upload', upload.single('epubFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Please upload an EPUB file.');
  }

  try {
    const db = new sqlite3.Database(
      './meread.db',
      sqlite3.OPEN_READWRITE
    );

    // get or create user
    const maybeUser = `SELECT * FROM Users WHERE Email = ?`;

    db.get(maybeUser, [req.body.email], (err, row) => {
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

    const epub = await EPub.createAsync(req.file.path); // Assuming EPub is from 'epub2' and it supports createAsync

    // Assuming you want to do something with `epub` here
    // For example, extracting text content, title, etc.
    const title = epub.metadata.title; // Placeholder for actual title extraction logic

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
    // TODO uncomment when ready to send email
    // Correct SQL query with placeholders
    const sql = `INSERT INTO Documents (DocumentID, Title, UploadDate, Content) VALUES (?, ?, ?, ?)`;
    const newDocumentID = uuidv4(); // Ensure uuidv4 is imported properly
    const now = new Date().toISOString();

    db.run(
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
          'File uploaded and information stored successfully.'
        );
      }
    );

    // create new record in UserDocuments table
    const newUserDocumentID = uuidv4();
    const insertUserDocument = `INSERT INTO UserDocuments (UserDocumentID, Email, DocumentID, CurrentLocation, AccessDate) VALUES (?, ?, ?, ?, ?)`;
    db.run(
      insertUserDocument,
      [newUserDocumentID, req.body.email, newDocumentID, 1, now],
      (err) => {
        if (err) {
          console.error('Error inserting user document', err.message);
          return res
            .status(500)
            .send('Error inserting user document.');
        }
      }
    );

    db.close();
  } catch (error) {
    console.error('Error processing file', error);
    res.status(500).send('Error processing file.');
  }
});

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port}`
  );
});
