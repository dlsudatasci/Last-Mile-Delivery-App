# Devia — Last-Mile Delivery Route Deviation Research Mobile Application

**Devia** is a specialized research platform designed to investigate and analyze why last-mile delivery couriers (e.g., Grab, Foodpanda, Lalamove) deviate from optimized navigation routes. This repository houses the **React Native (Expo) Mobile Application**, **Google Cloud Firestore Database Rules & Schema**, and **Automated Build & CI/CD Pipelines**.

> **Note on Monorepo Separation:** As mandated by thesis deployment requirements, the **Devia Research Admin Web Dashboard (Next.js 16)** is maintained and hosted in a separate dedicated GitHub repository.

---

## 🏗️ System Architecture & Components

```
┌──────────────────────────┐       ┌──────────────────────────┐
│  Devia Mobile App        │       │  Google Cloud Firestore  │
│  (React Native / Expo)   │ ───►  │  Project: thesis-67      │
│  • GPS Route Recording   │       │  • Users & Rides Data    │
│  • Deviation Surveys     │       │  • Study Enrollment      │
│  • Study Registration    │       │  • Compensation Claims   │
└──────────────────────────┘       └──────────────────────────┘
```

1. **Mobile Application (`app/` & root)**: Built with React Native, Expo 52, and Mapbox SDK. Allows riders to record GPS trips, compare actual paths against baseline routes, answer post-trip deviation questionnaires, and submit compensation claims.
2. **Backend Database (`firestore.rules` & `docs/`)**: Hosted on Google Cloud Firestore (`thesis-67`). Enforces strict client security rules (`resource.data.userId == auth.uid`) while providing scalable JSON document storage.
3. **Containerized Build Environment (`Dockerfile`)**: A Debian-based Docker image pre-configured with Node.js 20, Java 17, and Android SDK 34 for reproducible CI/CD testing and native Android compilation.
4. **Research Admin Dashboard**: Hosted in a separate standalone repository, enabling the research team to monitor live stats, audit GPS telemetry, validate compensation claims, and publish community events via the Firebase Admin SDK.

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
* **Admin Bypass**: The research dashboard connects from its own standalone repository using the **Firebase Admin SDK (Service Account)**, completely bypassing client rules to allow full administrative oversight.

---

## 📊 Tutorial Part 6: Research Admin Dashboard

As required by thesis separation guidelines, the **Devia Admin Dashboard (Next.js 16)** is maintained and hosted in a separate standalone repository. Please refer to that repository for server configuration, environment variable setup (`.env.local`), and Firebase Admin SDK credentials.

---

## 📁 Repository Directory Structure

```
Devia-Mobile-App/
├── app/                       # React Native / Expo Mobile App screens & tabs
├── components/                # Reusable mobile UI components (Map, Camera, Rides, etc.)
├── lib/                       # Mobile app business logic, Firebase CRUD, hooks & stores
├── assets/                    # Mobile app fonts, icons, and static images
├── stores/                    # Zustand state management stores
├── types/                     # TypeScript schema declarations and domain models
├── docs/                      # Thesis documentation & database specs
│   ├── DATABASE_DESIGN.md     # Complete Firestore schema & data dictionary
│   ├── ERD.md                 # Standalone academic Entity-Relationship Diagram doc
│   ├── FULL_SYSTEM_SPECIFICATIONS.md # Thesis-ready full system specifications
│   └── erd_diagram.png        # High-resolution dark-theme ERD diagram image
├── Dockerfile                 # Debian Bullseye container with Node 20, Java 17, Android SDK 34
├── firestore.rules            # Google Cloud Firestore client security rules
├── package.json               # Mobile app dependencies and scripts
└── README.md                  # Master project tutorial and documentation guide
```
