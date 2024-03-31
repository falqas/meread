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

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const epubfile = 'The Rust Programming Language.epub';
import sqlite3 from 'sqlite3';

import { createTables } from './models';

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

    db.close((err) => {
      if (err) {
        console.error('Error closing database', err.message);
      } else {
        console.log('Closed the database connection.');
      }
    });
  }
});

// const epubfile = 'alice2.epub';
// const epub = new EPub(epubfile);
const epub = EPub.createAsync(epubfile).then((epub: any) => {
  console.log(epub);
  const flow = epub.flow;
  const chapter1 = flow[4];
  const chapter1Id = chapter1.id;

  const chapter1Content = epub.getChapter(
    chapter1Id,
    (err: any, data: any) => {
      console.log('nonraw');
      console.log(data);
    }
  );

  const chapter1ContentRaw = epub.getChapterRaw(
    chapter1Id,
    (err: any, data: any) => {
      console.log('raw');
      console.log(data);
    }
  );
});

// create sqlite db
// connect to email
console.log('ep1', epub);

app.get('/', (req: Request, res: Response) => {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const epub = EPub.createAsync(epubfile).then((epub: any) => {
    console.log(epub);
    const flow = epub.flow;
    const chapter1 = flow[4];
    const chapter1Id = chapter1.id;

    const chapter1Content = epub.getChapter(
      chapter1Id,
      (err: any, data: any) => {
        console.log('nonraw');
        console.log(data);
        const msg = {
          to: 'falqas@gmail.com', // Change to your recipient
          from: 'mereadreadme@gmail.com', // Change to your verified sender
          subject: 'Sending with SendGrid is Fun',
          text:
            'and easy to do aaaa even with Node.js' +
            data.slice(0, 100),
          html: data,
          // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        };
        sgMail
          .send(msg)
          .then(() => {
            console.log('Email sent');
          })
          .catch((error: any) => {
            console.error(error);
          });
      }
    );
  });
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port}`
  );
});
