# Instructions:

1. git clone this repo & install dependencies (`npm install` or `yarn install`)
2. run `npm start` (or `ts-node index.ts` if you have `ts-node` installed globally)

# Schema

### Users Table

| Field      | Type     | Description                       |
| ---------- | -------- | --------------------------------- |
| Email      | String   | User's email address              |
| SignUpDate | DateTime | Date the user account was created |

### Documents Table

| Field      | Type     | Description                          |
| ---------- | -------- | ------------------------------------ |
| DocumentID | Integer  | Primary Key                          |
| Title      | String   | Document title                       |
| UploadDate | DateTime | Date the document was first uploaded |
| TotalPages | Integer  | Number of pages in the document      |

### UserDocuments Table

| Field          | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| UserDocumentID | Integer | Primary Key                              |
| UserID         | Integer | Foreign Key, references Users            |
| DocumentID     | Integer | Foreign Key, references Documents        |
| CurrentPage    | Integer | The current page number the user is on   |
| IsActive       | Boolean | Indicates if this is the active document |

### EmailQueue Table

| Field             | Type     | Description                                     |
| ----------------- | -------- | ----------------------------------------------- |
| QueueID           | Integer  | Primary Key                                     |
| UserDocumentID    | Integer  | Foreign Key, references UserDocuments           |
| ScheduledSendDate | DateTime | The date when the email is scheduled to be sent |
| Status            | String   | The status of the email (Pending, Sent, Failed) |

This schema outlines the core data structure for the "readyou" project, designed to support multiple users, document management, user document progress tracking, and a queue for managing and scheduling emails.

readyou-node/
│
├── src/ # Source files
│ ├── api/ # API-specific route handlers
│ │ ├── documents.js # Routes for document-related operations
│ │ └── users.js # Routes for user-related operations
│ │
│ ├── config/ # Configuration files
│ │ └── index.js # Central configuration file
│ │
│ ├── controllers/ # Controllers for handling business logic
│ │ ├── documentsController.js # Document-related logic
│ │ └── usersController.js # User-related logic
│ │
│ ├── models/ # Database models
│ │ ├── Document.js # Document model
│ │ ├── EmailQueue.js # EmailQueue model
│ │ ├── User.js # User model
│ │ └── UserDocument.js # UserDocument model
│ │
│ ├── services/ # Services for detailed business logic
│ │ ├── emailService.js # Service for email-related operations
│ │ └── userService.js # Service for user-related operations
│ │
│ ├── utils/ # Utility functions and helpers
│ │ └── db.js # Database connection and utilities
│ │
│ └── app.js # Entry point of the application
│
├── views/ # Views/templates, if serving directly
│ └── index.ejs # Example template
│
├── public/ # Public static files
│ ├── css/ # CSS files
│ ├── js/ # JavaScript files
│ └── images/ # Image files
│
├── node_modules/ # Node.js modules (don't commit to version control)
│
├── .env # Environment variables
├── .gitignore # Specifies intentionally untracked files to ignore
├── package.json # Project metadata and dependencies
├── package-lock.json # Locked versions of each dependency
└── README.md # Project overview and documentation
