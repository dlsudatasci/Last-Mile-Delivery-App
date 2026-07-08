# Devia Research Admin Dashboard (`admin-web/`)

This directory contains the **Next.js 16 (App Router)** internal research and management dashboard for the Devia Last-Mile Delivery Study. It connects directly to your **Google Cloud Firestore (`thesis-67`)** database using the **Firebase Admin SDK** to bypass client security rules and allow full administrative oversight.

---

## ⚡ Quick Start & Setup Guide

### 1. Install Dependencies
```bash
cd admin-web
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env.local` file:
```bash
# On Windows PowerShell:
copy .env.example .env.local

# On macOS / Linux:
cp .env.example .env.local
```

### 3. Add Your Service Account Key
To read/write all study data across collections without permission restrictions, the dashboard uses a Firebase Service Account:
1. Go to the [Firebase Console](https://console.firebase.google.com) $\rightarrow$ select project **`thesis-67`**.
2. Go to **Project Settings** (gear icon at top left) $\rightarrow$ **Service Accounts** tab.
3. Click **Generate new private key** $\rightarrow$ download the JSON file.
4. Open the downloaded JSON and copy the required fields into `.env.local`:
   ```env
   FIREBASE_PROJECT_ID=thesis-67
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@thesis-67.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```
*(Make sure the private key string includes the exact `\n` newline characters inside the quotation marks).*

### 4. Set Allowed Admin Emails
In `.env.local`, specify which research team email addresses are permitted to access the dashboard:
```env
ADMIN_ALLOWED_EMAILS=researcher@example.com,advisor@example.com
```

### 5. Run the Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your web browser. Upon signing in with an authorized Firebase Authentication account, a secure 7-day HTTP-only session cookie (`devia_admin_session`) is created automatically.

---

## 🧭 Dashboard Navigation & Features

| Route | Page Name | Functionality & Key Actions |
| :--- | :--- | :--- |
| **`/`** | **Dashboard Home** | Displays 6 real-time metric cards (`Users`, `Rides`, `Study Participants`, `Pending Claims`, `Unread Notifications`, `Open Tickets`) and live feeds for recent alerts. |
| **`/users`** | **Users Table** | Search and inspect up to 100 recent riders, including avatars, phone numbers, experience level, and policy consent. |
| **`/rides`** | **Rides Table** | Telemetry overview of recorded trips with distance (`km`), duration, average/max speed (`km/h`), elevation (`m`), and source flags (`GPX`, `Web`). |
| **`/study`** | **Study Participants** | Roster of enrolled research riders showing platform breakdown (`Grab`, `Foodpanda`), vehicle type, and active vs. removed status. |
| **`/claims`** | **Compensation Claims** | Financial validation portal. Review ₱250 compensation requests submitted after 10 rides and click **`✓ Validate`**, **`💸 Mark Paid`**, or **`✗ Reject`**. |
| **`/tickets`** | **Support Tickets** | Expand any row to read the rider's full problem description and click **`✓ Resolve`** once handled. |
| **`/notifications`** | **Notifications Center** | System alert feed (`Quota Reached`, `Claim Alert`) with live badge counters. Click **`✓ Read`** on individual items or **`✓ Mark all as read`**. |
| **`/events`** | **Events Manager** | Full **CRUD** content manager (`+ New Event`, `✏ Edit`, `🗑 Delete`). Instantly publishes community events and workshops to the mobile app. |

---

## 🔒 Security Architecture

* **Server-Only Admin SDK**: `lib/firebase-admin.ts` initializes the Admin SDK using `firebase-admin/app`, `getFirestore()`, `getAuth()`, and `getStorage()`. It runs strictly on the server side (`Node.js`) to prevent private keys from ever exposing to the browser.
* **HTTP-Only Cookies**: Client login tokens are exchanged via `/api/auth/login` for an HTTP-only browser cookie that cannot be accessed by client-side JavaScript (`XSS` protected).
* **Route Interception**: `middleware.ts` guards all protected pages and API endpoints, redirecting unauthenticated users immediately to `/login`.
