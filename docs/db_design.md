# Database Design & Schema Architecture

**Project Name:** Devia  
**Database Type:** Google Cloud Firestore (NoSQL Document Store)  
**Storage Type:** Google Cloud Storage (Firebase Storage)

---

## 1. Architectural Overview

Devia uses **Google Cloud Firestore**, a NoSQL document-oriented database, for high scalability, offline synchronization support, and real-time updates.

Unlike relational databases (SQL), Firestore uses a hierarchical structure consisting of **Collections**, **Documents**, and **Subcollections**. In our design:
* **Collections** (e.g., `users`, `rides`, `events`) contain independent documents.
* **Subcollections** (e.g., `rides/{rideId}/generatedRoutes`, `rides/{rideId}/map`) allow nested relationships.
* **Reference IDs** are used to create logical links (foreign keys) between collections.

### Smart Design Detail: Handling GPS Logs
Firestore documents have a maximum size limit of **1MB**. A GPS log for a long delivery ride can easily contain thousands of coordinates, which could cause a single document to exceed this limit.
* **Our Solution:** We isolate the detailed GPS coordinate array (`items: RidePoint[]`) in a fixed subcollection document at `/rides/{rideId}/map/points`. This keeps the main `/rides/{rideId}` document lightweight, cheap to list-query, and safe from document size limits.

---

## 2. Entity-Relationship Diagram (ERD) 
Last changed: 22/07/2026
Although Firestore is NoSQL, the logical relationships between data models can be visualized using a relational ERD.

```mermaid
erDiagram
    users {
        string userId PK "Firebase Auth UID"  
        string riderCode
        string preferredName  ""    
        string email UK ""  
        varchar phoneNum UK "varchar(10)"  
        enum gender  "Male, Female, Prefer not to Say"  
        enum ageRange  "---"  
        enum city  "---"  
        enum yearsExperience  ""  
        string deliveryPlatform  "Grab, Foodpanda, Lalamove"    
        boolean acceptedPolicies  ""  
        number createdAt  "Unix Timestamp ms" 
        number updatedAt  "Unix Timestamp ms" 
        string profilePicture  "Optional, Firebase Storage URL" 
    }

    rides {
        string rideId PK "Auto-generated UUID (also stored as field)"
        string userId FK "Points to users document ID"
        string rideName
        string startPoint ""
        string endPoint ""
        number startTime "Unix Timestamp ms"
        number endTime "Unix Timestamp ms"
        int duration "Seconds"
        number distance "Meters"
        number averageSpeed "m/s"
        number maxSpeed "m/s"
        number elevationGain "Meters"
        int deviationCount
        string reviewStatus
        number createdAt "Unix Timestamp ms"
    }

    map_points {
        string pointsId PK "Fixed document ID: 'points'"
        string rideId FK "Points to rides document ID"
        array items "Array of RidePoint coordinate objects"
        number latitude
        number longitude
        number timestamp
        number elevation
    }
    
    postTripQuestionnaire_response {
        string rideId PK "Auto-generated UUID"
        string rideId_FK FK "Points to rides document ID"
        string arrival
        number etaRating
        number stressRating
        string language
        number submittedAt
    }

    generatedRoutes {
        string routeId PK "Auto-generated UUID (stored as field)"
        string rideId FK "Points to rides document ID"
        enum type "Initial Route, Regenerated Route"
        array routePoints "Generated route GPS coordinate array"
        number sequence "Route generation order index"
        number generatedAt "Unix Timestamp ms"
        number remainingTravelTimeOriginal "in seconds"
        number remainingTravelTimeNew "in seconds"
        number remainingDistanceOriginal "in meters"
        number remainingDistanceNew "in meters"
    }

    deviations {
        string deviationId PK "Points to generatedRoutes document ID"
        string rideId FK "Points to rides document ID"
        string userId FK "Points to users document ID"
        int index
        string originalRoute
        number dateTime "Unix Timestamp ms"
        string gpsLocation
        string originalRouteEdge
        string deviatedEdge
        string streetName
        string generatedInstruction
        string deviationInstruction
        string type "'point' or 'segment'"
        array points "GPS coordinates of the deviation"
        number timestamp "Unix ms"
        number createdAt "Unix Timestamp ms"
        string mapMatchedEdge "98547_93724"
    }

    studies {
        string studyId PK "Auto-generated UUID (document ID)"
        string studyName
        string studyDescription
        number studyDate "Unix Timestamp ms"
        array studyMedia "Optional Storage URL list"
        string studyLocation
        string studyOrganizer
        string studyOrganizerEmail
        string studyOrganizerPhone
        number createdAt "Unix Timestamp ms"
    }

    studyParticipants {
        string userId PK "Firebase Auth UID (document ID)"
        string eventId FK "Points to events document ID"
        boolean acceptedTerms  ""  
        boolean acceptedPrivacy  ""  
        boolean acceptedDataUsage ""
        enum status  "(In Progress, Finished, Removed)"  
        number joinedAt "Unix Timestamp ms"
        number updatedAt "Unix Timestamp ms"
    }

    compensationClaims {
        string claimId PK "Auto-generated UUID (document ID)"
        string userId FK "Points to users / studyParticipants document ID"
        enum paymentMethod "'gcash' or 'maya' or 'gotyme'"
        string accountName
        string accountNumber
        string phoneNumber
        enum status "'pending_validation' or 'ready_to_claim' or 'paid' or 'rejected'"
        string referenceNumber "Format: DEVIA-YYYYMMDD-XXXXXX"
        number recordedSubmissions
        number amount "PHP - always 250"
        number createdAt "Unix Timestamp ms"
        number updatedAt "Unix Timestamp ms"
    }

    tickets {
        String ticketId PK "Auto-generated UUID"
        String userId FK
        String subject
        String description
        enum status "pending, resolved"
        number createdAt "Unix Timestamp ms"
    }

    deviationResponses {
        string responseId PK "UUID"
        string deviationId FK "Points to deviations document ID"
        string rideId FK "Points to rides document ID"
        enum primaryReason ""
        string primaryReasonOther
        enum trafficSeverity "1-5 Very Light, Light, Moderate, Heavy, Severe"
        string rushHourCause
        enum rushHour "yes, no, unsure"
        string chooseDuringNonRush
        enum wouldUseNonRushHour "yes, no, unsure"
        string blockageReason
        enum blockageType "Flood, Accident, Road Closure, Illegal Parking, Others"
        array personalStopReason
        enum personalStopType "Break, Meal, Restroom, Refuel, Took a Call, Acciden/Repair, Others"
        enum stopDuration "optional enum"
        enum deviateAgain "Always, Often, Sometimes, Rarely, Never"
        string avoidRoadFrequency
        enum usuallyAvoidRoad "Always, Often, Sometimes, Rarely, Never, I don't usually pass here"
        string language
        string otherDeviateReason "optional"
        number submittedAt "Unix Timestamp ms"
        number createdAt "Unix Timestamp ms"
    }

    local_accounts {
        string phone PK "Text"
        string rider_code "Text"
        string full_name "Text"
        string gender "Text"
        string age_range "Text"
        string city "Text"
        string years_experience "Text"
        number accepted_policies "Integer"
        string created_at "Text"
    }

    rider_code_registrations {
        string code PK "Text"
        string phone FK "Points to local_accounts.phone"
        string registered_at "Text"
    }

    recent_destinations {
        string user_id PK "Text"
        string name PK "Text"
        number longitude PK "Real"
        number latitude PK "Real"
        string full_address "Text"
        string updated_at "Text"
    }

    users ||--o{ rides : "records"
    users ||--o{ studyParticipants : "enrolls as"
    users ||--o{ tickets : "creates"
    studies ||--o{ studyParticipants : "rider joins via"
    studyParticipants ||--o| compensationClaims : "submits after completing study"
    rides ||--|| map_points : "stores GPS in"
    rides ||--o{ generatedRoutes : "generates routes during trip"
    generatedRoutes ||--o{ deviations : "contains deviation markers"
    deviations ||--o| deviationResponses : "collects user feedback via"
    rides ||--o| postTripQuestionnaire_response : "submits questionnaire"
    rides ||--o{ deviations : "directly detects deviations"
    local_accounts ||--o| rider_code_registrations : "registers rider code"
    local_accounts ||--o{ recent_destinations : "saves destinations"
```

---

## 3. Data Dictionary (Schema Specifications)

### 3.1. Collection: `users`
* **Path:** `/users/{userId}`
* **Document ID:** Firebase Auth UID. The document ID acts as the primary key; a separate `id` field is **not** stored in the Firestore document itself.
* **Purpose:** Stores profile details and onboarding survey information of the rider.

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `userId` | String | Yes | Firebase Auth UID |
| `riderCode` | String | Yes | Unique rider code assigned to the participant for the study |
| `preferredName` | String | Yes | Rider's preferred display name shown within the application |
| `email` | String | Yes | Firebase Auth email address |
| `phoneNum` | Varchar | Yes | Philippine mobile number, format: `09xxxxxxxxx` |
| `gender` | Enum | Yes | Gender identity selected during onboarding |
| `ageRange` | Enum | Yes | Age range category (e.g., "18-24", "25-34") |
| `city` | Enum |  Yes | Municipality/City where the rider primarily performs deliveries |
| `yearsExperience` | Enum | Yes | Experience range (e.g., "<1 year", "1-2 years") |
| `deliveryPlatform` | String | Yes | Primary delivery platform used (e.g., Grab, Foodpanda, Lalamove) |
| `acceptedPolicies` | Boolean | Yes | Must be `true`; agreed to Terms of Service & Privacy Policy|
| `createdAt` | Number | Yes | Unix timestamp (ms) when the user account was created |
| `updatedAt` | Number | Yes | Unix timestamp (ms) when the profile was last updated |
| `profilePicture` | String | No | Firebase Storage download URL for profile photo |
---

### 3.2. Collection: `rides`
* **Path:** `/rides/{rideId}`
* **Document ID:** Auto-generated UUID. The `id` field is also written into the document body.
* **Purpose:** Stores summary stats of a completed delivery trip.

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `rideId` | String | Yes | Same as the document ID |
| `userId` | String | Yes | Foreign key — the Firebase Auth UID of the rider |
| `rideName` | String | Yes | Name given to the trip |
| `startPoint` | String | Yes | Starting location of the trip |
| `endPoint` | String | Yes | Destination entered by the rider before starting the trip |
| `startTime` | Number | Yes | Unix timestamp (ms) when the ride started |
| `endTime` | Number | Yes | Unix timestamp (ms) when the ride ended |
| `duration` | Int | Yes | Total ride time in seconds |
| `distance` | Number | Yes | Total distance traveled in meters |
| `averageSpeed` | Number | Yes | Average speed in m/s |
| `maxSpeed` | Number | Yes | Peak speed in m/s |
| `elevationGain` | Number | Yes | Total elevation gain in meters |
| `deviationCount` | Int | Yes | Total number of deviations detected during the ride |
| `reviewStatus` | String | Yes | Current review status of user |
| `createdAt` | Number | Yes | Unix timestamp (ms) of when the ride record was created |
---

### 3.3. Subcollection: `map` → Document: `points` (Under `rides`)
* **Path:** `/rides/{rideId}/map/points`
* **Document ID:** Static, always `"points"`.
* **Purpose:** Stores the full GPS breadcrumb trail separately from the summary document to stay within Firestore's 1 MB document size limit.
  
Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `pointsId` | String | Yes | Static document ID |
| `rideId` | String | Yes | Parent ride document ID (foreign key referencing rides.rideId) |
| `items` | Array (Object) | Yes | Ordered list of `RidePoint` coordinate objects |

RidePoint Object
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `coordinate.latitude` | Number | Yes | Latitude coordinate of the recorded GPS point |
| `coordinate.longitude` | Number | Yes | Longitude coordinate of the recorded GPS point |
| `timestamp` | Number | Yes | Unix timestamp (ms) when the GPS point was recorded |
| `elevation` | Number | Yes | Elevation (meters) at the recorded GPS point |

#### `RidePoint` Object Shape
```json
{
  "coordinate": {
    "latitude": 14.598720,
    "longitude": 120.984222
  },
  "timestamp": 1720345678000,
  "elevation": 45.2
}
```

---

### 3.4. Subcollection: `generatedRoutes` (Under `rides`)
* **Path:** `/rides/{rideId}/generatedRoutes/{routeId}`
* **Document ID:** Auto-generated UUID. The `id` field is also written into the document body.
* **Purpose:** Stores each generated route during a trip. A new route is generated every time a rider deviates from the previous one — multiple generated routes are expected per trip (e.g., initial route → deviation → route 2 → deviation → route 3, and so on).

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `routeId` | String | Yes | Same as the document ID |
| `rideId` | String | Yes | Parent ride document ID (foreign key referencing rides.rideId) |
| `type` | Enum | Yes | Type of generated route (Initial Route or Regenerated Route) |
| `routePoints` | Array | Yes | Ordered list of RoutePoint objects representing the generated navigation route |
| `sequence` | Number| Yes | Route generation order index (1 = initial route, 2 = first regenerated route, etc.) |
| `generatedAt` | Number | Yes | Unix timestamp (ms) when the route was generated |
| `eta` | Int | Yes | Estimated travel time of the generated route, in minutes |
| `remainingDistanceOriginal` | Int | Yes | Remaining distance along the original route from the deviation point (meters) |
| `remainingDistanceNew` | Int | Yes | Remaining distance along the regenerated route from the deviation point (meters) |
---

### 3.5. Sub-subcollection: `deviations` (Under `generatedRoutes`)
* **Path:** `/rides/{rideId}/generatedRoutes/{routeId}/deviations/{deviationId}`
* **Document ID:** Auto-generated UUID. The `id` field is also written into the document body.
* **Purpose:** Stores each deviation marker the rider tagged during or after the trip, linked to the specific generated route that was active when the deviation occurred.

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `deviationId` | String | Yes | Same as the document ID |
| `routeId` | String | Yes | Parent generated route document ID (foreign key referencing generatedRoutes.routeId) |
| `rideId` | String | Yes | Parent ride document ID (foreign key referencing rides.rideId) |
| `userId` | String | Yes | Foreign key referencing users.userId (Firebase Auth UID of the rider) |
| `index` | Int | Yes | |
| `originalRoute` | String | Yes | |
| `dateTime` | Number | Yes | Unix timestamp (ms) when the deviation occurred |
| `gpsLocation` | String | Yes | |
| `originalRouteEdge` | String | Yes | |
| `deviatedEdge` | String | Yes | |
| `streetName` | String | Yes | Name of the road where the deviation occurred |
| `generatedInstruction` | String | Yes | |
| `deviationInstruction` | String | Yes | |
| `type` | String | Yes | Type of deviation (point or segment) |
| `points` | Array | Yes | GPS coordinates representing the deviation location or segment |
| `timestamp` | Number | Yes | Ride time offset (ms) for point deviations |
| `start_timestamp` | Number | Yes | Start time offset (ms) for segment deviations |
| `end_timestamp` | Number | Yes | End time offset (ms) for segment deviations |
| `createdAt` | Number | Yes | Unix timestamp (ms) when the deviation record was created |
| `mapMatchedEdge` | String | Yes | Identifier of the road network edge after map matching (e.g., 98547_93724) |


### 3.X. Sub-subcollection: `deviationResponses` (Under `deviations`)
* **Path:** `/rides/{rideId}/generatedRoutes/{routeId}/deviations/{deviationId}/deviationResponses/{responseId}`
* **Document ID:** Auto-generated UUID. The `id` field is also written into the document body.
* **Purpose:** Stores the rider's questionnaire responses describing the reason and circumstances for a recorded route deviation.

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `responseId` | String | Yes | Same as the document ID |
| `deviationId` | String | Yes | Foreign key referencing deviations.deviationId |
| `rideId` | String | Yes | Foreign key referencing rides.rideId |
| `primaryReason` | Enum | Yes | Primary reason selected by the rider for deviating from the generated route |
| `primaryReasonOther` | String | No | User-specified reason when Other is selected as the primary reason |
| `trafficSeverity` | Enum | No | Reported traffic severity; applicable when the deviation is traffic-related |
| `rushHourCause` | String | No | Optional explanation of why the rider believes rush hour contributed to the deviation |
| `rushHour` | Enum | No | Whether the rider believes the traffic was caused by rush hour (Yes, No, Unsure) |
| `chooseDuringNonRush` | String | No | Optional explanation of whether the rider would choose the same route during non-rush-hour conditions |
| `wouldUseNonRushHour` | Enum | No | Whether the rider would use the same route during non-rush-hour conditions (Yes, No, Unsure) |
| `blockageReason` | String | No | Optional explanation of the road blockage or hazard encountered |
| `blockageType` | Enum | No | Type of road blockage or hazard (Flood, Accident, Road Closure, Illegal Parking, Others) |
| `personalStopReason` | Array | No | One or more reasons for making a personal stop |
| `personalStopType` | Enum | No | Primary type of personal stop (Break, Meal, Restroom, Refuel, Took a Call, Accident/Repair, Others) |
| `stopDuration` | Enum | No | Approximate duration of the personal stop |
| `deviateAgain` | Enum | Yes | Likelihood of deviating again under similar circumstances (Always, Often, Sometimes, Rarely, Never) |
| `avoidRoadFrequency` | String | No | Optional explanation of the rider's road avoidance behavior |
| `usuallyAvoidRoad` | Enum | Yes | Frequency with which the rider usually avoids the road |
| `language` | String | Yes | Language version of the questionnaire completed by the rider (e.g., English or Tagalog) |
| `otherDeviateReason` | String | No | Additional explanation for the deviation not captured by the predefined options |
| `submittedAt` | Number| Yes | Unix timestamp (ms) when the questionnaire was submitted |
| `createdAt` | Number| Yes | Unix timestamp (ms) when the response record was created |
---

### 3.X. Sub-subcollection: `postTripQuestionnaire_response` (Under `rides`)
* **Path:** `/rides/{rideId}//postTripQuestionnaire_response/{rideId}`
* **Document ID:** Auto-generated UUID. The `id` field is also written into the document body.
* **Purpose:** Stores the rider's responses to the post-trip questionnaire completed after finishing a ride.

Last changed: 22/07/2026
| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `rideId` | String | Yes | Primary key and foreign key referencing rides.rideId |
| `arrival` | String | Yes | Rider's reported arrival status or trip outcome |
| `etaRating` | Number | Yes | Rider's rating of the estimated arrival time (ETA) |
| `stressRating` | Number | Yes | Rider's self-reported stress level during the trip |
| `language` | String | Yes | Language version of the questionnaire completed by the rider (e.g., English or Tagalog) |
| `submittedAt` | Number | Yes | Unix timestamp (ms) when the questionnaire was submitted |
---

### 3.6. Collection: `studyParticipants`
* **Path:** `/studyParticipants/{userId}`
* **Document ID:** Firebase Auth UID. A rider can only enroll in 1 study (document ID matches user ID).
* **Purpose:** Tracks which riders have consented to and enrolled in the research study through a specific event.

| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `userId` | String | Yes | Firebase Auth UID (also serves as document ID) |
| `eventId` | String | Yes | Foreign key — the `events` document ID of the event the rider joined through |
| `status` | String | Yes | `'joined'` or `'removed'` |
| `acceptedTerms` | Boolean | Yes | Must be `true` |
| `acceptedPrivacy` | Boolean | Yes | Must be `true` |
| `acceptedDataUsage` | Boolean | No | Set during onboarding enrollment flow |
| `joinedAt` | Number | Yes | Unix timestamp (ms) of enrollment |
| `updatedAt` | Number | Yes | Unix timestamp (ms) of last modification |

---

### 3.7. Collection: `compensationClaims`
* **Path:** `/compensationClaims/{claimId}`
* **Document ID:** Auto-generated UUID. Allows a rider to submit multiple claims across different study participations.
* **Purpose:** Manages ₱250 compensation claims submitted by study participants after completing the required number of qualifying ride submissions.

| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `claimId` | String | Yes | Auto-generated UUID, mirrors the document ID |
| `userId` | String | Yes | Foreign key — Firebase Auth UID of the claimant |
| `paymentMethod` | String | Yes | `'gcash'`, `'maya'`, or `'gotyme'` |
| `accountName` | String | Yes | Registered name of e-wallet account |
| `accountNumber` | String | Yes | E-wallet account number |
| `phoneNumber` | String | Yes | Normalized mobile number linked to the e-wallet |
| `status` | String | Yes | `'pending_validation'`, `'ready_to_claim'`, `'paid'`, or `'rejected'` |
| `referenceNumber` | String | Yes | Auto-generated format: `DEVIA-YYYYMMDD-XXXXXX` |
| `recordedSubmissions` | Number | Yes | Verified ride count at the time of claim (minimum: 10) |
| `amount` | Number | Yes | Fixed at `250` (Philippine Peso) |
| `createdAt` | Number | Yes | Unix timestamp (ms) when the claim was submitted |
| `updatedAt` | Number | Yes | Unix timestamp (ms) of last status change |

---

### 3.8. Collection: `tickets`
* **Path:** `/tickets/{ticketId}`
* **Document ID:** Auto-generated UUID.
* **Purpose:** Stores helpdesk/support requests submitted by riders from the in-app support screen.
* **Note:** The document ID is not saved as a field inside the document body.

| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `userId` | String | Yes | Firebase Auth UID of the submitter |
| `subject` | String | Yes | Brief summary of the support issue |
| `description` | String | Yes | Full description of the problem |
| `status` | String | Yes | Always `'pending'` on creation; updated by admin |
| `createdAt` | Number | Yes | Unix timestamp (ms) of submission |

---

### 3.9. Collection: `events`
* **Path:** `/events/{eventId}`
* **Document ID:** Auto-generated UUID (document ID not stored as field in reads, but injected as `id` in app-side code).
* **Purpose:** Community events/announcements pushed by admins and shown on the app dashboard.
* **Access:** Read-only for authenticated riders; write is blocked by Firestore rules (admin-only via Firebase console or backend).

| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `eventName` | String | Yes | Title of the event |
| `eventDescription` | String | Yes | Full body text of the announcement |
| `eventDate` | Number | Yes | Date of the physical event (Unix ms) |
| `eventLocation` | String | Yes | Venue or location description |
| `eventOrganizer` | String | Yes | Name of organizing group or person |
| `eventOrganizerEmail` | String | Yes | Organizer contact email |
| `eventOrganizerPhone` | String | Yes | Organizer contact phone |
| `eventMedia` | Array (String) | No | Firebase Storage URLs for image attachments |
| `createdAt` | Number | Yes | Unix timestamp (ms) of publication |

---

### 3.10. Collection: `adminNotifications`
* **Path:** `/adminNotifications/{notificationId}`
* **Document ID:** Either auto-generated UUID (for compensation claim alerts) or a fixed key `quota-{userId}` (for quota-reached alerts, to prevent duplicates).
* **Purpose:** Internal notification feed for the research team. Created automatically by the app when a rider hits 10 rides or submits a compensation claim. Only admins can read this collection (Firestore rules block all user reads).

| Field Name | Data Type | Required | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `type` | String | Yes | `'quota_reached_ready_for_cross_check'` or `'compensation_claim_ready_for_validation'` |
| `userId` | String | Yes | Firebase Auth UID of the triggering rider |
| `email` | String/null | Yes | Rider email for admin reference |
| `status` | String | Yes | Always `'unread'` on creation |
| `recordedSubmissions` | Number | No | Ride count at trigger time (for quota alerts) |
| `requiredSubmissions` | Number | No | Threshold value `10` (for quota alerts) |
| `referenceNumber` | String | No | Claim reference number (for compensation alerts) |
| `amount` | Number | No | Claim amount in PHP (for compensation alerts) |
| `createdAt` | Timestamp | Yes | Firestore `serverTimestamp()` — NOT a Unix number |

---

## 4. Storage Architecture (Firebase Cloud Storage)

Media files are stored in Firebase Storage using the following folder conventions:

| Storage Path | Associated With | Contents |
| :--- | :--- | :--- |
| `profile-images/{uid}` | `users` | Rider profile photo |

---

## 5. Security Rules Summary (`firestore.rules`)

Rules are defined in [firestore.rules](../firestore.rules) and follow the principle of least privilege:

| Collection | Read Rule | Write Rule |
| :--- | :--- | :--- |
| `users/{userId}` | Owner only (`auth.uid == userId`) | Owner only |
| `rides/{rideId}` | Owner only (`resource.data.userId == auth.uid`) | Create: authenticated + userId matches; Update/Delete: owner only |
| `rides/{rideId}/generatedRoutes` | Owner only (via ride parent ownership check) | Owner only |
| `rides/{rideId}/generatedRoutes/{routeId}/deviations` | Owner only (via ride parent ownership check) | Owner only |
| `studyParticipants/{participantId}` | Owner only (`resource.data.userId == auth.uid`) | Authenticated users |
| `compensationClaims/{claimId}` | Owner only (`resource.data.userId == auth.uid`) | Owner only |
| `tickets/{ticketId}` | Owner only (`resource.data.userId == auth.uid`) | Authenticated users |
| `adminNotifications/{id}` | **Nobody** (`allow read: if false`) | Authenticated users (app writes only) |
| `events/{eventId}` | Any authenticated user | **Nobody** (`allow write: if false`) |
| `app_version/{docId}` | **Everyone** (public, unauthenticated) | **Nobody** |

> **Key note:** Because `compensationClaims` uses surrogate document IDs, Firestore security rules must check `resource.data.userId == auth.uid` for it, whereas `studyParticipants` checks document ID equality (`studyParticipants/$(request.auth.uid)`).
