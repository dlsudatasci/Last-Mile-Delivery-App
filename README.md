# Devia — Last-Mile Delivery Route Deviation Research Platform

**Devia** is a comprehensive research platform designed to investigate and analyze why last-mile delivery riders (e.g., Grab, Foodpanda, Lalamove) deviate from optimized navigation routes. The system consists of a **React Native (Expo) Mobile Application** for riders, a **Google Cloud Firestore NoSQL Database**, and a **Next.js 16 Research Admin Dashboard** for real-time data analysis and study management.

---

## 🏗️ System Architecture & Components

```
┌──────────────────────────┐       ┌──────────────────────────┐       ┌──────────────────────────┐
│  Devia Mobile App        │       │  Google Cloud Firestore  │       │  Devia Admin Dashboard   │
│  (React Native / Expo)   │ ───►  │  Project: thesis-67      │ ◄───  │  (Next.js 16 / Admin SDK)│
│  • GPS Route Recording   │       │  • Users & Rides Data    │       │  • Real-Time Metrics     │
│  • Deviation Surveys     │       │  • Study Enrollment      │       │  • Claim Validation      │
│  • Study Registration    │       │  • Compensation Claims   │       │  • Community Events      │
└──────────────────────────┘       └──────────────────────────┘       └──────────────────────────┘
```

1. **Mobile Application (`app/` & root)**: Built with React Native, Expo 52, and Mapbox SDK. Allows riders to record GPS trips, compare actual paths against optimized screenshots, answer post-trip deviation questionnaires, and submit compensation claims.
2. **Backend Database (`firestore.rules` & `docs/`)**: Hosted on Google Cloud Firestore (`thesis-67`). Enforces strict client security rules while providing scalable JSON document storage.
3. **Research Admin Dashboard (`admin-web/`)**: Built with Next.js 16 (App Router), Turbopack, and the Firebase Admin SDK. Bypasses client rules securely to give researchers full CRUD management over riders, trips, claims, tickets, notifications, and events.
4. **Containerized Build Environment (`Dockerfile`)**: A Debian-based Docker image pre-configured with Node.js 20, Java 17, and Android SDK 34 for reproducible CI/CD testing and native Android compilation.

---

## 🚀 Tutorial Part 1: Running the Mobile App (`Root / Expo`)

### Prerequisites
* **Node.js**: Version `20.x` LTS recommended (Node 24 may cause `ERR_SOCKET_BAD_PORT` in Expo CLI).
* **Mapbox Token**: Required for rendering interactive maps (`rnmapbox`).
* **Expo Go App** (iOS/Android) or **Android Studio / Xcode** for native device simulation.

### Step-by-Step Setup

1. **Clone & Install Dependencies**
   ```bash
   git clone https://github.com/nathan/Last-Mile-Delivery-App.git
   cd Last-Mile-Delivery-App
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory with your Mapbox tokens:
   ```env
   MAPBOX_DOWNLOAD_TOKEN=sk.your_mapbox_secret_token_here
   EXPO_PUBLIC_MAPBOX_KEY=pk.your_mapbox_public_token_here
   ```
   > **Note**: Firebase configuration is handled via native files (`google-services.json` for Android, `GoogleService-Info.plist` for iOS), **not** via `.env` variables. These files are already present in the repository root and are pre-configured for the `thesis-67` project.

3. **Start the Development Server**
   ```bash
   npm start
   # or explicitly using Expo:
   npx expo start --clear
   ```

4. **Run on Device or Simulator**
   * **Physical Device**: Scan the QR code shown in your terminal using the **Expo Go** app (Android) or Camera (iOS).
   * **Android Emulator**: Press `a` in the terminal while Expo is running (requires Android Studio running).
   * **iOS Simulator**: Press `i` in the terminal (requires Xcode on macOS).

5. **Code Validation & Testing**
   Run our comprehensive verification suite before committing:
   ```bash
   npm test               # Runs both ESLint and TypeScript checks
   npm run lint           # Run ESLint validation only
   npm run tsc            # Run TypeScript type check (--noEmit)
   ```

> ⚠️ **Node Version Troubleshooting**: If Expo fails under Node 24 with `ERR_SOCKET_BAD_PORT`, switch to Node 20 using `nvm`:
> ```bash
> nvm install 20
> nvm use 20
> npm install
> npx expo start
> ```

> **Android Permissions**: The app declares 6 Android permissions in `app.config.ts` — `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_MEDIA_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_LOCATION`. These are required for GPS background recording during delivery trips and are automatically included in native builds.

---

## 🐳 Tutorial Part 2: Docker & Automated Build Environment (`Dockerfile`)

We provide a production-grade **Dockerfile** (`node:20-bullseye-slim` with Java 17 JDK and Android SDK 34 pre-installed) to guarantee exact build reproducibility across any machine and for automated CI/CD pipelines.

### Why Use Docker?
* Eliminates the need to manually install Java, Android command-line tools, and build SDKs on your local machine.
* Ensures identical environment setups across all team members.
* Automatically validates code checks and tests in isolated containers.

### 1. Build the Docker Image
From the root repository directory, run:
```bash
docker build -t devia-app .
```
*(This downloads Debian Bullseye, Node 20, Java 17, and accepts all Android SDK 34 licenses automatically).*

### 2. Run Automated Verification inside Docker
By default, running the container executes `npm test` (`eslint .` + `tsc --noEmit`) to verify codebase integrity:
```bash
docker run --rm devia-app
```

### 3. Interactive Development & Android Compiling inside Docker
To mount your local code into the container and open an interactive bash shell (useful for compiling native Android builds or testing CLI commands):
```bash
# On Linux / macOS:
docker run --rm -it -v $(pwd):/app devia-app bash

# On Windows PowerShell:
docker run --rm -it -v "${PWD}:/app" devia-app bash
```
Once inside the shell, you have full access to `npm`, `npx expo`, and Android SDK tools (`sdkmanager`, `adb`).

---

## ⚙️ Tutorial Part 3: EAS Cloud Builds (`eas.json`)

Devia uses **Expo Application Services (EAS)** for cloud-based native builds. This lets you generate installable `.apk` or `.ipa` files without needing Android Studio or Xcode installed locally.

### Prerequisites
```bash
npm install -g eas-cli
eas login    # Log in with your Expo account (owner: andre.swe)
```

### Build Profiles

| Profile | Command | Distribution | Purpose |
| :--- | :--- | :--- | :--- |
| `development` | `eas build --profile development` | Internal | Development client build with hot-reload support for testing native modules |
| `preview` | `eas build --profile preview` | Internal | Internal test build shared with team before release |
| `production` | `eas build --profile production` | Internal | Release APK (`buildType: apk`) with auto-incrementing version, published to `production` OTA channel |
| `androidprod` | `eas build --profile androidprod` | Internal | Alternate production APK variant published to `androidprod` OTA channel |

### OTA Updates (Over-The-Air)
EAS Update allows pushing JavaScript bundle updates to devices without re-building the native APK:
```bash
eas update --channel production --message "Bug fix: ride recording"
```
Updates are delivered to all installed apps on the `production` channel within minutes.

---

## 🔄 Tutorial Part 4: Automated CI/CD Pipeline (`.github/workflows/ci.yml`)

Every push or pull request to `main` / `master` automatically triggers a **GitHub Actions CI pipeline** that builds the Docker image and runs the full test suite inside it.

### What it Does Automatically
1. **Checkout**: Clones the latest code from the repository.
2. **Docker Buildx Setup**: Configures Docker with BuildKit for efficient layer caching.
3. **Build Docker Image**: Builds the full Dockerfile (`node:20-bullseye-slim` + Java 17 + Android SDK 34).
4. **Run Verification**: Runs `npm test` inside the container which executes **ESLint** (`npm run lint`) and **TypeScript type checking** (`tsc --noEmit`). Any type errors or lint violations will fail the pipeline and block the PR from merging.

### Trigger Conditions
```yaml
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
```
The pipeline runs on every commit pushed to `main`/`master` and on every opened Pull Request targeting those branches.

> **No secrets required for CI**: The Docker container does not need Firebase credentials to run linting and TypeScript checks. The `google-services.json` and `GoogleService-Info.plist` files are excluded from Docker builds via `.dockerignore`.

---

## 🗄️ Tutorial Part 5: Backend & Database Architecture (`Firestore`)

Devia uses **Google Cloud Firestore** (`thesis-67`) as its central cloud database.

### Core Documentation
For academic thesis specifications, logical schemas, and relational maps, consult our dedicated documentation:
* **[`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md)**: Exhaustive breakdown of all 9 top-level collections, data types, indexes, and mobile app CRUD functions.
* **[`docs/ERD.md`](./docs/ERD.md)**: Standalone thesis-ready Entity-Relationship Diagram featuring Mermaid schemas, subcollection hierarchies (`rides/{id}/map/points`, `rides/{id}/annotations`), storage bucket paths, and a high-resolution exportable diagram (`erd_diagram.png`).

### Security & Access Control (`firestore.rules`)
Client-side database access from the mobile app is strictly governed by `firestore.rules`:
* **Riders (`users/{userId}`)**: Can only read/write their own user profile, recorded trips, annotations, and claims.
* **Public Trips**: Rides marked `isPublic == true` can be read by all authenticated riders for community comparison.
* **Admin Bypass**: The research dashboard (`admin-web/`) connects using the **Firebase Admin SDK (Service Account)**, completely bypassing client rules to allow full administrative oversight.

---

## 📊 Tutorial Part 6: Research Admin Dashboard (`admin-web/`)

The **Devia Admin Dashboard** (`admin-web/`) is a dedicated Next.js 16 web application enabling the research team to monitor live stats, manage users, validate compensation claims, resolve support tickets, and publish community events.

### Step-by-Step Dashboard Setup

1. **Navigate to the Dashboard Directory**
   ```bash
   cd admin-web
   npm install
   ```

2. **Create Your Local Environment File**
   Copy the provided template to create your `.env.local` file:
   ```bash
   # On Windows PowerShell:
   copy .env.example .env.local

   # On macOS / Linux:
   cp .env.example .env.local
   ```

3. **Get Your Firebase Service Account Credentials**
   The dashboard requires server-side Admin SDK credentials to read/write all study data:
   * Go to the [Firebase Console](https://console.firebase.google.com) $\rightarrow$ select project **`thesis-67`**.
   * Go to **Project Settings** (gear icon) $\rightarrow$ **Service Accounts** tab.
   * Click **Generate new private key** and download the JSON file.
   * Open the downloaded JSON and copy the values into your `admin-web/.env.local` file:
     ```env
     FIREBASE_PROJECT_ID=thesis-67
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@thesis-67.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
     ```
   *(Note: The private key string must include the `\n` newline characters enclosed in quotes).*

4. **Authorize Research Team Emails**
   In `admin-web/.env.local`, specify which Firebase Authentication email addresses are allowed to sign in to the admin panel (comma-separated):
   ```env
   ADMIN_ALLOWED_EMAILS=researcher1@example.com,advisor@example.com
   ```

5. **Start the Dashboard Development Server**
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your web browser.

6. **Log In to the Admin Panel**
   * Sign in using the exact email and password associated with your Firebase Authentication account (must match one of the emails listed in `ADMIN_ALLOWED_EMAILS`).
   * Upon login, the server issues a secure 7-day HTTP-only session cookie (`devia_admin_session`).

### Dashboard Features & Pages
* **`/` (Dashboard Home)**: Displays live aggregate counts (`users`, `rides`, `studyParticipants`, `compensationClaims`, `tickets`, `adminNotifications`) and instant feeds for unread alerts and pending claims.
* **`/users`**: Searchable table of all registered riders with avatar previews, contact info, and policy acceptance status.
* **`/rides`**: Telemetry log of all recorded trips including distance (`km`), duration, speed (`km/h`), elevation gain (`m`), and source flags (`GPX`, `Web`).
* **`/study`**: Roster of enrolled research participants with consent tracking (`Terms`, `Privacy`) and platform breakdown (`Grab`, `Foodpanda`).
* **`/claims`**: Financial workflow allowing admins to **Validate**, **Mark Paid**, or **Reject** ₱250 compensation claims submitted by riders who reached their 10-ride study quota.
* **`/tickets`**: Expandable customer support portal where admins can read full rider issue descriptions and mark tickets as **Resolved**.
* **`/notifications`**: System alert center showing milestone notifications (`Quota Reached`, `Claim Alert`) with individual or batch **Mark as Read** actions.
* **`/events`**: Full **CRUD Content Manager** allowing researchers to publish, edit, or delete workshops, safety webinars, and community announcements directly to the mobile app.

---

## 📁 Repository Directory Structure

```
Last-Mile-Delivery-App-1/
├── app/                       # React Native / Expo Mobile App screens & tabs
├── components/                # Reusable mobile UI components (Map, Camera, Rides, etc.)
├── lib/                       # Mobile app business logic, Firebase CRUD, hooks & stores
├── assets/                    # Mobile app fonts, icons, and static images
├── docs/                      # Thesis documentation & database specs
│   ├── DATABASE_DESIGN.md     # Complete Firestore schema & data dictionary
│   ├── ERD.md                 # Standalone academic Entity-Relationship Diagram doc
│   └── erd_diagram.png        # High-resolution dark-theme ERD diagram image
├── admin-web/                 # Next.js 16 Research Admin Web Dashboard
│   ├── app/                   # App Router pages (Dashboard, Users, Rides, Claims, etc.)
│   ├── components/            # Dashboard tables, modal managers, sidebar navigation
│   ├── lib/                   # Firebase Admin SDK v13 & session cookie auth helpers
│   ├── .env.example           # Environment template for admin service account config
│   └── package.json           # Next.js dependencies and scripts
├── Dockerfile                 # Debian Bullseye container with Node 20, Java 17, Android SDK 34
├── firestore.rules            # Google Cloud Firestore client security rules
├── package.json               # Mobile app dependencies and scripts
└── README.md                  # Master project tutorial and documentation guide
```
