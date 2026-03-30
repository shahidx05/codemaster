# CodeMaster

CodeMaster is a full-stack, comprehensive coding practice and contest platform designed to bridge the gap between algorithmic learning and competitive programming. With discrete roles for Admins, Teachers, and Students, it offers an engaging environment where educators can orchestrate contests and students can rigorously test their programming skills in JavaScript, C++, and Python.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Monaco Editor
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Code Execution**: Piston API (v2) securely runs C++ and Python code in isolated environments

## Prerequisites
- Node.js 18+
- MongoDB 6+
- Internet access (required for Piston API calls from `emkc.org` to execute C++ and Python code securely)

## Setup Steps

1. **Clone the repository**
2. **Install Server Dependencies**
   ```bash
   cd server && npm install
   ```
3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend && npm install
   ```
4. **Configure Environment Variables**
   Copy `server/.env.example` to `server/.env` and ensure the values outline your local environment settings.
   ```bash
   cp server/.env.example server/.env
   ```
5. **Start MongoDB**
   Ensure your local or remote MongoDB instance is running.
6. **Seed the Database**
   Seed the database with default problems and users (adds 10+ seeded algorithmic problems):
   ```bash
   cd server && npm run seed
   ```
7. **Start the Backend**
   ```bash
   cd server && npm run dev
   ```
   *(Starts the backend API on port 5000)*
8. **Start the Frontend**
   Open a new terminal tab and start your Vite server:
   ```bash
   cd frontend && npm run dev
   ```
   *(Starts the frontend UI on port 5173)*

## User Roles
- **Admin**: Has full platform control. Can seed problems, oversee all users, and manage access.
- **Teacher**: Can create unique problems using dynamic test-cases, toggle public/private visibility, orchestrate contests, and monitor student leaderboards.
- **Student**: Can practice problems across supported languages (JS, C++, Python), participate in competitive timed contests, and utilize the full suite of the test arena including compilation error diagnostics.
