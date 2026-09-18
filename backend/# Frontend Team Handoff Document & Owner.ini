# Frontend Team Handoff Document & Ownership Boundary

> **Comprehensive collaboration guide for Person A & Person B/C to work concurrently without merge conflicts.**

---

## 1. High-Level Architecture & Root Routing

The frontend is built on **React 18** with **React Native for Web** and **Vite**. The top-level root component is [`frontend/src/App.jsx`](file:///c:/Breadcrumbs-/frontend/src/App.jsx), which acts as the application router and state coordinator.

```
                           [ App.jsx ]  (Root Router & Shared State)
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│          TEAMMATE            │        │             YOU              │
│    (Auth, Profile & Data)    │        │  (Daily Check-In & Care UI)  │
├──────────────────────────────┤        ├──────────────────────────────┤
│ • AuthModal.jsx              │        │ • FindCarePage.jsx           │
│ • ProfileModal.jsx           │        │ • HeroScreen (in App.jsx)    │
│ • WelcomePage.jsx            │        │ • Mascot.jsx                 │
│ • TherapistPortalModal.jsx   │        │ • CalendarModal.jsx          │
│ • Auth functions in api.js   │        │ • Care functions in api.js   │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 2. Shared Data Contract (The Interface)

To prevent breaking each other's code, both teammates must adhere to the single `account` object contract passed throughout the application:

```typescript
interface Account {
  user_id: string;        // Unique identifier (e.g. "alex_01" or "demo_escalating")
  display_name: string;   // User's name shown in navbar and greetings
  role: "patient" | "therapist"; // Drives root screen routing
  email?: string;         // Optional contact email
  created_at?: string;    // ISO date string
}
```

### Flow of Account Data:
1. When **Teammate's** `AuthModal` finishes sign-in/sign-up, it calls:
   `onSuccess(account: Account)`
2. `App.jsx` stores `account` in `activeAccount` state.
3. `App.jsx` automatically routes:
   - `role === "patient"` → Renders `HeroScreen` or `FindCarePage` (passing `account={activeAccount}`)
   - `role === "therapist"` → Renders `TherapistPortalModal` (passing `therapistAccount={activeAccount}`)

---

## 3. Teammate's Ownership & Responsibilities

### Files Owned by Teammate:
1. `frontend/src/components/AuthModal.jsx`:
   - Patient & Clinician sign-in/sign-up forms.
   - Role picker tab (`"I am seeking support"` vs. `"I am a licensed therapist"`).
   - Form validation, error messaging, and password/token handling.
2. `frontend/src/components/ProfileModal.jsx`:
   - Account settings & active persona switcher (`demo_escalating`, `demo_improving`, `demo_flagged`).
   - GDPR Right-to-Delete trigger calling `deleteUserData(userId)`.
3. `frontend/src/components/WelcomePage.jsx`:
   - Landing page hero section, initial CTA buttons, and entry gateway.
4. `frontend/src/components/TherapistPortalModal.jsx`:
   - Clinician triage table showing linked patients, 7-day decay scores, and severity pills.

### Backend Endpoints Consumed by Teammate:
| Endpoint | Method | Purpose |
|---|---|---|
| `/accounts` | POST | Register new user / therapist |
| `/accounts/{user_id}` | GET | Fetch profile details |
| `/therapists/{tid}/patients` | GET | List patients linked to this therapist |
| `/users/{user_id}/entries` | DELETE | Permanently wipe user diary data |

---

## 4. Your Ownership & Responsibilities

### Files Owned by You:
1. `frontend/src/components/FindCarePage.jsx`:
   - 2-column therapist recommendation UI matching design specifications.
   - **"Your Care Preferences"**: Preferred format (Video / Voice / Text), Therapist Gender (Any / Female / Male / Non-binary), and Sliding Scale Priority toggle.
   - **"Need someone right now?"**: 988 crisis action button (`tel:988`).
   - 15-minute gentle intro booking modal and full practitioner profile modal.
2. `HeroScreen` (inside `frontend/src/App.jsx`):
   - Daily decompression stage with microphone recording & text reflection box.
   - Real-time recording timer and animated mascot status.
   - Patient-safe confirmation card (strictly zero clinical scores).
3. `frontend/src/components/Mascot.jsx`:
   - Animated acorn mascot states (`idle`, `listening`, `thinking`).
4. `frontend/src/components/CalendarModal.jsx`:
   - Calendar grid of historical daily check-ins.
5. `frontend/src/components/ReportModal.jsx`:
   - Deep clinical breakdown component (embedded into the clinician workspace).

### Backend Endpoints Consumed by You:
| Endpoint | Method | Purpose |
|---|---|---|
| `/entries/audio` | POST | Upload audio recording (WebM) for Whisper transcription & stress analysis |
| `/entries/text` | POST | Submit text reflection for analysis |
| `/users/{user_id}/overview` | GET | Fetch gentle wellness summary (no clinical scores) |
| `/users/{user_id}/therapists/{cat}` | GET | Multi-factor therapist search with query filters |
| `/therapists/{tid}/patients/{pid}` | POST | Link patient record to therapist |
| `/users/{user_id}/entries` | GET | Fetch reflection history for calendar timeline |

---

## 5. Development & Git Workflow Best Practices

1. **Do Not Touch Each Other's Components**: Edit only the files assigned to your scope.
2. **Shared File Protocol (`App.jsx` & `api.js`)**:
   - In `App.jsx`, do not change the core router props without syncing.
   - In `services/api.js`, each person adds their respective functions to their dedicated sections without modifying existing function signatures.
3. **Always Run Pre-Commit Build Check**:
   ```powershell
   cd frontend
   npm run build
   ```
   If the Vite build succeeds with 0 errors, your code is safe to merge!
