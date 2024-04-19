export const createTablesQuery = `
  -- Enable Foreign Key support
  PRAGMA foreign_keys = ON;

  -- Users Table
  CREATE TABLE IF NOT EXISTS Users (
    Email TEXT PRIMARY KEY NOT NULL UNIQUE,
    SignUpDate DATETIME NOT NULL,
    IsPremium BOOLEAN NOT NULL DEFAULT 0
  );

  -- Documents Table
  CREATE TABLE IF NOT EXISTS Documents (
    DocumentID TEXT PRIMARY KEY NOT NULL,
    Title TEXT NOT NULL,
    UploadDate DATETIME NOT NULL,
    Content TEXT NOT NULL
  );

  -- UserDocuments Table
  CREATE TABLE IF NOT EXISTS UserDocuments (
    UserDocumentID TEXT PRIMARY KEY NOT NULL,
    Email TEXT NOT NULL,
    DocumentID TEXT NOT NULL,
    CurrentLocation INTEGER NOT NULL DEFAULT 0,
    CharacterLength INTEGER NOT NULL DEFAULT 10000,
    AccessDate DATETIME NOT NULL,
    IsActive BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (Email) REFERENCES Users(Email),
    FOREIGN KEY (DocumentID) REFERENCES Documents(DocumentID)
  );

  -- EmailQueue Table
  CREATE TABLE IF NOT EXISTS EmailQueue (
    QueueID TEXT PRIMARY KEY NOT NULL,
    UserDocumentID TEXT NOT NULL,
    ScheduledSendDate DATETIME NOT NULL,
    Status TEXT NOT NULL CHECK (Status IN ('pending', 'sent', 'failed')),
    FOREIGN KEY (UserDocumentID) REFERENCES UserDocuments(UserDocumentID)
  );
`;
