# Entity-Relationship Diagram — Devia

**Project Name:** Devia — Last-Mile Delivery Route Research App  
**Database:** Google Cloud Firestore (NoSQL Document Store)  
**Storage:** Google Cloud Firebase Storage  
**Version:** 1.0  

---

## 1. Conceptual Overview

Devia uses **Google Cloud Firestore**, a NoSQL document-oriented database. Unlike relational databases, Firestore organizes data in a **Collection → Document → Subcollection** hierarchy.

| Relational Concept | Firestore Equivalent |
|:---|:---|
| Table | Collection |
| Row | Document |
| Column | Field |
| Primary Key | Document ID (auto-UUID or Firebase Auth UID) |
| Foreign Key | Reference ID field (string pointing to another document) |
| Nested Table | Subcollection |
| Enum / Lookup | Constrained string field |

---

## 2. Entity-Relationship Diagram

![Devia ERD](./erd_diagram.png)

> **Mermaid source** (renders on GitHub):

```mermaid
erDiagram
    users {
        string userId PK "Firebase Auth UID (doc ID)"
        string username "Rider display name"
        string fullName "Full name from onboarding"
        string email "Firebase Auth email"
        string phone "Philippine mobile 09xxxxxxxxx"
        string gender "Gender identity"
        string ageRange "e.g. 18-24 or 25-34"
        string city "Delivery city or municipality"
        string yearsExperience "e.g. less-than-1 or 1-2 years"
        string deliveryPlatform "e.g. Grab Foodpanda Lalamove"
        string vehicleType "e.g. Motorcycle Bicycle Car"
        boolean acceptedPolicies "Must be true"
        string avatarUrl "Optional Firebase Storage URL"
        string createdAt "ISO 8601 timestamp"
        string updatedAt "ISO 8601 timestamp"
    }

    rides {
        string id PK "Auto UUID, also stored as field"
        string userId FK "Points to users document ID"
        string rideName "Trip label"
        number startTime "Unix ms"
        number endTime "Unix ms"
        number duration "Seconds"
        number distance "Meters"
        number averageSpeed "m/s"
        number maxSpeed "m/s"
        number elevationGain "Meters"
        number createdAt "Unix ms"
    }

    map_points {
        string id PK "Fixed doc ID: points"
        array items "Ordered RidePoint coordinates array"
    }

    generatedRoutes {
        string id PK "Auto UUID, stored as field"
        string rideId FK "Points to rides document ID"
        array routePoints "Generated route GPS coordinates"
        number sequence "Route generation order index"
        number generatedAt "Unix ms"
    }

    deviations {
        string id PK "Auto UUID, stored as field"
        string generatedRouteId FK "Points to generatedRoutes document ID"
        string userId FK "Points to users document ID"
        string type "point or segment"
        array points "GPS coordinates of the deviation"
        array additionalTags "Optional checklist tags"
        string source "Optional e.g. auto-generated-from-video"
        number timestamp "Optional Unix ms for point"
        number start_timestamp "Optional Unix ms for segment start"
        number end_timestamp "Optional Unix ms for segment end"
        number createdAt "Unix ms"
    }

    events {
        string id PK "Auto UUID (doc ID)"
        string eventName "Event title"
        string eventDescription "Body text"
        number eventDate "Unix ms"
        string eventLocation "Venue"
        string eventOrganizer "Organizer name"
        string eventOrganizerEmail "Organizer email"
        string eventOrganizerPhone "Organizer phone"
        array eventMedia "Optional Storage URL list"
        number createdAt "Unix ms"
    }

    studyParticipants {
        string participantId PK "Auto UUID (doc ID)"
        string userId FK "Points to users document ID"
        string eventId FK "Points to events document ID"
        string status "joined or removed"
        boolean acceptedTerms "Must be true"
        boolean acceptedPrivacy "Must be true"
        boolean acceptedDataUsage "Optional onboarding flag"
        number joinedAt "Unix ms"
        number updatedAt "Unix ms"
    }

    compensationClaims {
        string claimId PK "Auto UUID (doc ID)"
        string participantId FK "Points to studyParticipants document ID"
        string userId FK "Points to users document ID"
        string paymentMethod "gcash or maya or gotyme"
        string accountName "E-wallet registered name"
        string accountNumber "E-wallet account number"
        string phoneNumber "E-wallet linked mobile"
        string status "pending_validation or ready_to_claim or paid or rejected"
        string referenceNumber "DEVIA-YYYYMMDD-XXXXXX"
        number recordedSubmissions "Verified ride count min 10"
        number amount "Fixed at 250 PHP"
        number createdAt "Unix ms"
        number updatedAt "Unix ms"
    }

    tickets {
        string ticketId PK "Auto UUID (doc ID)"
        string userId FK "Points to users document ID"
        string subject "Brief issue summary"
        string description "Full problem description"
        string status "pending or resolved"
        number createdAt "Unix ms"
    }

    users ||--o{ rides : "records"
    users ||--o{ studyParticipants : "enrolls as"
    users ||--o{ tickets : "creates"
    events ||--o{ studyParticipants : "rider joins via"
    studyParticipants ||--o| compensationClaims : "submits after completing study"
    rides ||--|| map_points : "GPS stored in subcollection"
    rides ||--o{ generatedRoutes : "generates routes during trip"
    generatedRoutes ||--o{ deviations : "contains deviation markers"
```

---

## 3. Firestore Collection Hierarchy

```
Firestore Root
│
├── users/
│   └── {userId}                             ← Firebase Auth UID as doc ID
│
├── rides/
│   └── {rideId}                             ← Auto UUID
│       ├── map/                             ← Subcollection
│       │   └── points                       ← Fixed doc ID: GPS breadcrumb trail
│       └── generatedRoutes/                 ← Subcollection
│           └── {routeId}                    ← Auto UUID: one per generated route
│               └── deviations/              ← Sub-subcollection
│                   └── {deviationId}        ← Auto UUID: deviation markers
│
├── studyParticipants/
│   └── {userId}                             ← Firebase Auth UID as doc ID
│
├── compensationClaims/
│   └── {userId}                             ← Firebase Auth UID as doc ID
│
├── tickets/
│   └── {ticketId}                           ← Auto UUID
│
├── events/
│   └── {eventId}                            ← Auto UUID
│
└── app_version/
    └── {docId}                              ← Version metadata (public read)
```

---

## 4. Firebase Storage Paths

| Storage Path | Linked Collection / Document | Contents |
|:---|:---|:---|
| `profile-images/{uid}` | `users/{uid}` → `avatarUrl` | Rider profile photo |
| `rides/{rideId}/annotations/{annotationId}` | `rides/{rideId}/annotations/{annotationId}` → `mediaUri` | Photo or audio deviation note |
| `rides/{rideId}/videos/` | `rides/{rideId}` → `rideVideo` | Dashcam video (not yet formally implemented) |

---

## 5. System Data Flow

```
┌────────────────────────────────────────┐
│         Rider (Mobile App)             │
│   React Native + Expo (iOS / Android)  │
│                                        │
│  • Register / Login (phone number)     │
│  • Record GPS delivery ride            │
│  • Tag deviation annotations           │
│  • Upload dashcam video                │
│  • Join research study                 │
│  • Submit ₱250 compensation claim      │
└──────────────────┬─────────────────────┘
                   │
          Firebase Client SDK
          (SDK rules enforced)
                   │
                   ▼
┌────────────────────────────────────────┐
│            Google Firebase             │
│                                        │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ Firebase     │  │ Firebase       │  │
│  │ Auth         │  │ Storage        │  │
│  └──────┬───────┘  └───────┬────────┘  │
│         │ UID              │ URLs      │
│  ┌──────▼───────────────────▼───────┐  │
│  │        Cloud Firestore           │  │
│  │   (security rules enforced)      │  │
│  └──────────────────────────────────┘  │
└────────────────────┬───────────────────┘
                     │
          Firebase Admin SDK
          (server-side, rules bypassed)
                     │
                     ▼
┌────────────────────────────────────────┐
│       Admin Web Dashboard              │
│  Next.js 14 (App Router) — same repo  │
│                                        │
│  • View all users & rides              │
│  • Manage study participants           │
│  • Process compensation claims         │
│  • Resolve support tickets             │
│  • Publish / edit community events     │
│  • Monitor admin notifications         │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│       Research Team / Admin            │
└────────────────────────────────────────┘
```

---

## 6. Security Model Summary

| Collection | Mobile App Access | Admin Web Access |
|:---|:---|:---|
| `users/{userId}` | Owner read/write only | Full read/write (Admin SDK) |
| `rides/{rideId}` | Owner read/write only | Full read/write (Admin SDK) |
| `rides/{rideId}/map/points` | Owner only | Full access (Admin SDK) |
| `rides/{rideId}/generatedRoutes` | Owner only | Full access (Admin SDK) |
| `rides/{rideId}/generatedRoutes/{routeId}/deviations` | Owner only | Full access (Admin SDK) |
| `studyParticipants/{userId}` | Owner read/write only | Full read/write (Admin SDK) |
| `compensationClaims/{userId}` | Owner read/write only | Full read/write + status updates |
| `tickets/{ticketId}` | Owner read; any auth write | Full read/write; mark resolved |
| `events/{eventId}` | Read only (authenticated) | Full CRUD via Admin SDK |
| `app_version/{docId}` | Public read | Full write via Admin SDK |

---

## 7. Relationship Table

| From | To | Cardinality | Description |
|:---|:---|:---|:---|
| `users` | `rides` | One-to-Many | A rider records many delivery trips |
| `users` | `studyParticipants` | One-to-Many | A rider can enroll in multiple study events over time |
| `users` | `tickets` | One-to-Many | A rider creates multiple support tickets |
| `events` | `studyParticipants` | One-to-Many | A rider joins the study by enrolling through an event |
| `studyParticipants` | `compensationClaims` | One-to-One (optional) | Each study participation can produce at most one compensation claim |
| `rides` | `map/points` | One-to-One | Each ride has exactly one GPS breadcrumb document |
| `rides` | `generatedRoutes` | One-to-Many | A ride generates multiple routes as deviations occur during the trip |
| `generatedRoutes` | `deviations` | One-to-Many | Each generated route can have many deviation markers tagged by the rider |
