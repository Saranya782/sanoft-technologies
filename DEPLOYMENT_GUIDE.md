# Sanoft Task Management System - Deployment Guide

This document outlines the exact steps required to deploy the application from scratch, as well as how to update the deployment when you make changes to the codebase.

## Prerequisites
Before you begin, ensure you have the following installed:
1. [Node.js](https://nodejs.org/) (v20+ recommended)
2. [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)
3. [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

You must also be logged in:
- Google Cloud: run `gcloud auth login`
- Firebase: run `firebase login`

---

## 1. Deploying the Backend (Google Cloud Run)

The backend is a NestJS application containerized using Docker and hosted on Google Cloud Run.

### **Initial Deployment or Pushing Updates**
Whenever you modify files in the `backend/` folder (e.g., adding a new API endpoint, modifying a cron job, fixing a bug), run the following commands to deploy the new version:

```bash
# 1. Navigate to the backend directory
cd backend/

# 2. Deploy to Cloud Run (This automatically builds the Docker container and pushes it)
gcloud run deploy sanoft-backend --source . --region us-central1 --allow-unauthenticated
```

### **Setting Environment Variables**
If you add new `.env` variables to your backend:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/run).
2. Select the `sanoft-backend` service.
3. Click **Edit & Deploy New Revision**.
4. Go to the **Variables & Secrets** tab.
5. Add your variables (like `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, etc.).
6. Click **Deploy**.

---

## 2. Deploying the Frontend (Firebase Hosting)

The frontend is a React application built with Vite and hosted on Firebase Hosting.

### **Initial Deployment or Pushing Updates**
Whenever you modify files in the `frontend/` folder (e.g., changing UI components, adding pages), you must rebuild the React app and push the static files to Firebase.

```bash
# 1. Navigate to the frontend directory
cd frontend/

# 2. Build the production application
npm run build

# 3. Deploy the built files to Firebase Hosting
firebase deploy --only hosting
```

### **Frontend Environment Variables**
The frontend uses environment variables prefixed with `VITE_` (e.g., `VITE_API_BASE_URL`).
These variables are baked into the application *during the build process*.
If you change `frontend/.env`:
1. Save the `.env` file.
2. You **must** run `npm run build` again.
3. Then run `firebase deploy --only hosting`.

---

## 3. Database Updates (Firestore)

Because Firestore is a NoSQL database, you do not need to run "migrations" like you would in a SQL database. 
- If you add a new field to your frontend/backend code, Firestore will simply accept the new field the next time a document is saved.
- Ensure your Firebase Security Rules (in the Firebase Console) are updated if you add highly sensitive new collections.

---

## 4. Troubleshooting Checklist

- **"Address Already In Use (EADDRINUSE)"**: You are trying to start a local server on a port that is already running in another terminal tab. Close the other terminal tab.
- **Frontend not calling the live backend**: Ensure `VITE_API_BASE_URL` in `frontend/.env` points to your Cloud Run URL (`https://sanoft-backend-XYZ.run.app`) and that you have rebuilt the frontend.
- **Changes not showing on the live site**: Your browser might be caching the old version. Try opening the URL in an Incognito window or perform a Hard Refresh (`Ctrl + F5` or `Cmd + Shift + R`).
