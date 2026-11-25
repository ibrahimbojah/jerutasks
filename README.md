# JeruTasks – Task Management System

A full-stack web app for managing personal and shared tasks. Users can create tasks, share them with other users, discuss them in comments, and get notifications. Admins get a dashboard and user management.

> **Note:** This repository is a **reconstructed version** of our final project. The original source code was lost, so the code was rebuilt from the project documentation. The frontend components and the `register`, `login`, `find_users` and `admin_stats` endpoints follow the code printed in the documentation. The `tasks`, `comments`, `notifications` and `admin` endpoints were rewritten to match the API the frontend uses and the database design in the documentation.

## Features

- **Accounts:** registration and login, with passwords hashed using `password_hash` / `password_verify`.
- **Tasks:** create, edit and delete tasks with a title, description, due date and status (`pending` / `in_progress` / `completed`), plus filtering by owned or shared tasks.
- **Sharing:** the owner invites users by name or email. Each invitee gets a notification and can accept or decline. Collaborators can edit task details, but only the owner can delete a task or change who it's shared with.
- **Comments:** a discussion thread for each task. The other participants are notified of new comments.
- **Notifications:** for shares, responses, updates and comments, with an unread counter.
- **Admin panel:**
  - Statistics: users, tasks by status, and activity over the last 7 and 30 days.
  - User management: change role, reset password, change email, delete a user.
- **Security:**
  - Role-based access checks on every endpoint.
  - Prepared statements only (no SQL injection).
  - Database credentials kept out of the repo.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18, Vite, React Router, Axios |
| Backend  | PHP 8 (REST API, JSON), mysqli |
| Database | MySQL / MariaDB |
| Tools    | Git & GitHub, Postman |

## Project structure

```
jerutasks/
├── frontend/            React + Vite client
│   └── src/
│       ├── components/  Login, Register, TaskList, TaskForm, TaskComments,
│       │                Notifications, AdminPanel, AdminDashboard, UserManagement
│       ├── styles/
│       └── config.js    API base URL (from VITE_API_URL)
├── backend/             PHP REST API
│   ├── register.php  login.php  tasks.php  comments.php
│   ├── notifications.php  find_users.php  admin.php  admin_stats.php
│   ├── helpers.php  db.php
│   └── config.sample.php
└── database/
    └── schema.sql
```

## Database

Five tables: `users`, `tasks`, `task_shared` (with invite status), `notifications` and `task_comments`. All foreign keys use `ON DELETE CASCADE`. See [`database/schema.sql`](database/schema.sql).

## Getting started

**Requirements:** PHP 8 with mysqli, MySQL or MariaDB (XAMPP works), and Node.js 18+.

1. **Database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. **Backend**
   - Put the `backend/` folder where your web server can serve it, e.g. `htdocs/jerutasks/backend` in XAMPP.
   - Create your config file and fill in your database credentials:
     ```bash
     cp backend/config.sample.php backend/config.php
     ```
   - Quick option without XAMPP: `php -S localhost:8000 -t backend`.
3. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env      # set VITE_API_URL to your backend URL
   npm install
   npm run dev
   ```
4. **First admin:** register in the app, then run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```

## API overview

All endpoints return JSON shaped like `{ "status": "success" | "error", ... }`.

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `register.php` | POST | Create account |
| `login.php` | POST | Log in |
| `tasks.php` | GET, POST, PUT, DELETE | Tasks and sharing |
| `find_users.php` | GET | Search users to share with |
| `comments.php` | GET, POST, DELETE | Task comments |
| `notifications.php` | GET, PUT | List, mark read, accept/decline shares |
| `admin.php` | GET, PUT, POST, PATCH, DELETE | User management (admin) |
| `admin_stats.php` | GET | Dashboard statistics (admin) |

## Known limitations

This is an academic project. The API identifies users by the `user_id` sent from the client, and there are no session tokens yet. A production version should add JWT or session authentication and derive the user on the server.

## Authors

Final project in Software Engineering, College of Management Academic Studies, Jerusalem (2025).

- **Ibrahim Boga**
- **Mohammad Ja'fari**
