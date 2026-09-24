# 🏥 HHC Patient Visit Sheet

A full-stack **Next.js 15** web application for managing monthly patient visit tracking at **Human Healthcare (HHC)**. All data is persisted in **Supabase** (PostgreSQL). The app runs locally on Windows and opens in a clean Edge app window via a desktop shortcut.

---

## Features

- **Multi-month support** — Create sheets for any month. Patients and packages carry over automatically; visits reset to blank.
- **Supabase Cloud Database** — Real-time PostgreSQL backend via `@supabase/supabase-js` with service-role key (server-only).
- **Visit tracking** — Five care types per day per patient: Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist. Each cell cycles: ✔ Visited → ✖ Cancelled → — No Visit → Clear.
- **Enter Visit Modal** — Full-featured modal for recording daily visits with patient search (by name, date, subscriber, or package), live quota counters, and a day navigator.
- **Package management** — Define monthly visit allocations per package (Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist, Medicine budget).
- **Visit quota & progress** — Each patient row shows total allocated, done, and remaining visits per care type; colour-coded warnings when quota is low or exhausted.
- **Medicine tracking** — Record medicine given (Rs.) against package allocation; displays remaining or overage.
- **PKR / USD currency toggle** — Live exchange rate fetched on startup; falls back to Rs. 280/$ if unavailable.
- **Search & sort** — Filter patients by name; sort by S.No, Name, Subscriber, or Package.
- **JSON Export / Import** — Export any month's data as a `.json` backup; import to restore packages and patients.
- **Month reset** — Clear all visit data and package assignments for a month without deleting patients.
- **Print-ready** — Dedicated print stylesheet hides controls; the table prints cleanly.
- **Desktop shortcut** — `create-shortcut.ps1` creates a Windows shortcut with a custom HHC icon that starts the server and opens Edge in app mode.

---

## Project Structure

```
HHC-patientlist/
├── .env.example                  # Environment variable template
├── next.config.mjs               # Next.js config
├── package.json
├── create-shortcut.ps1           # Creates Windows desktop shortcut
├── run-app.bat                   # Starts server + opens Edge in app mode
├── app-icon.ico                  # Custom HHC app icon
├── supabase/
│   └── migrations/
│       ├── 20260917000000_create_patient_visit_database.sql   # Initial schema
│       └── 20260922000000_replace_package_indexes.sql         # pkg_idx → package_id FK migration
└── src/
    ├── app/
    │   ├── globals.css                # All styles — CSS variables, table, modals, print
    │   ├── layout.tsx                 # Root layout with metadata
    │   ├── page.tsx                   # Main page — all state, handlers, modal orchestration
    │   └── api/
    │       ├── data/route.ts          # GET  — load all data for a month
    │       ├── patients/
    │       │   ├── route.ts           # POST — add patient
    │       │   └── [id]/route.ts      # PATCH — update; DELETE — remove
    │       ├── packages/route.ts      # GET / POST — list & save packages
    │       ├── months/route.ts        # GET / POST — list & create months
    │       ├── patient-visited/route.ts # GET — patient visit search
    │       ├── reset/route.ts         # POST — reset month visits
    │       ├── export/route.ts        # GET  — export month as JSON
    │       ├── import/route.ts        # POST — import JSON backup
    │       └── exchange-rate/route.ts # GET  — live USD→PKR rate
    ├── components/
    │   ├── TitleBar.tsx            # Header: month selector, patient count, Add Month
    │   ├── ControlBar.tsx          # Search bar, action buttons, sync status
    │   ├── VisitTable.tsx          # Full multi-week read-only visit matrix
    │   ├── VisitDropdown.tsx       # Floating visit status picker
    │   ├── EnterVisitModal.tsx     # Patient edit: subscriber, package, medicine, daily visit toggles
    │   ├── PackageModal.tsx        # Package CRUD editor
    │   ├── AddPatientModal.tsx     # Add / edit / delete patient (search + form tabs)
    │   ├── PatientSearchModal.tsx  # Patient visit lookup modal
    │   ├── PatientVisitedModal.tsx # Visit history display modal
    │   └── AddMonthModal.tsx       # Upcoming month creator with carry-over option
    └── lib/
        ├── db.ts                   # All Supabase queries (singleton client, server-only)
        ├── calendar.ts             # Month/week/day utilities (pure functions)
        ├── validation.ts           # Input validation for API routes
        └── types.ts                # TypeScript interfaces
```

---

## Database Schema

Apply migrations in `supabase/migrations/` in order before first run.

| Table | Purpose |
|---|---|
| `months` | Month index — `id` (YYYY-MM), year, month, label, days_in_month |
| `packages` | Package definitions — visit allocations per care type + medicine budget |
| `month_patients` | Per-patient per-month record — name, subscriber, `package_id` FK, `med_given`, `visits_json` (JSONB 5-value array per day) |

> **Row Level Security is enabled** on all three tables. The service-role key is required for server-side access.

---

## Environment Variables

Create `.env.local` from `.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

> ⚠️ **Never** commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
copy .env.example .env.local

# 3. Apply Supabase migrations via Supabase SQL editor or CLI (in order)

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Desktop App (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1
```

Places an **HHC Patient Visit Sheet** shortcut on your Desktop. Double-clicking it runs `run-app.bat`, which starts `npm start` and opens Microsoft Edge in app mode (no address bar).

---

## Production Build

```bash
npm run build
npm start
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Vanilla CSS, Lucide React icons |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` v2 |
| Deployment | Local (Windows) / Vercel-ready |

---

## Setup & Windows Guide

For full step-by-step instructions — cloning, Supabase setup, desktop shortcut, and data migration — see [SETUP_GUIDE.md](SETUP_GUIDE.md).
