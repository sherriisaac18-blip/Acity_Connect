# Acity Connect

## Project Overview
Acity Connect is a smart campus marketplace and skill exchange platform for Academic City students. Students can register with an institutional email, create a profile, post second-hand items, offer or request skills, express interest in listings, and track trade requests. Admin users can approve, edit, flag, and delete listings while viewing platform activity.

The app now uses a Node.js backend API instead of browser localStorage. The backend serves the frontend pages and stores users, listings, and requests in `data.json` on the server.

## Deployment Links
Frontend and Backend on Render: Add your Render Web Service link here after deployment.

GitHub Repository: Add your public GitHub repository link here.

## Login Details
Admin Account: admin@acity.edu.gh | Password: admin123

Student Account: student@acity.edu.gh | Password: password123

New users must register with an Academic City email domain such as `@acity.edu.gh`, `@acity.edu`, or `@acity.ac.gh`.

## Feature Checklist
- [x] Registration and login system
- [x] Registration restricted to institutional ACity email domains
- [x] Passwords stored as server-side hashes
- [x] User profile page with personal information
- [x] Skills Offered and Skills Needed fields
- [x] Profile update functionality
- [x] Create item and skill listings
- [x] Listings include title, description, category, type, and status
- [x] Searchable and filterable listing feed
- [x] Interested button for listings
- [x] Request/notification tracking page
- [x] Users can accept or reject requests for their listings
- [x] Admin dashboard
- [x] Admin listing approval
- [x] Admin listing edit, flag, and delete actions
- [x] Platform activity statistics
- [x] Render-ready backend using Node.js

## Installation Instructions
1. Clone the repository:
```bash
git clone https://github.com/sherriisaac18-blip/Acity_Connect.git
```

2. Open the project folder:
```bash
cd Acity_Connect
```

3. Start the server:
```bash
npm start
```

4. Open the app:
```text
http://localhost:3000
```

No npm packages are required because the backend uses Node.js built-in modules.

## Render Deployment Instructions
Create a new Render Web Service and use these settings:

- Environment: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: leave blank if the files are in the repository root

After deployment, use the Render Web Service URL as both the frontend and backend deployment link because the Node server serves the HTML pages and API routes together.
