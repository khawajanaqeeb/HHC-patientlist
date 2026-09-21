# 🏥 HHC Patient Visit Sheet

A full-stack **Next.js** web application for managing monthly patient visit tracking at **Human Healthcare (HHC)**.

---

## Features

- **Multi-month support** — Create sheets for upcoming months (October, November, …). Patients and packages carry over automatically with visits reset.
- **Supabase Cloud Database** (`@supabase/supabase-js`) — All data is persisted directly in Supabase.
- **Visit tracking** — Click any day/care-type cell to mark ✔ Visited, ✖ Cancelled, — No Visit, or ⬜ Clear.
- **Package management** — Define monthly allocations per package (Doctor, Nurse+Physio, Psychiatrist, Medicine budget).
- **Auto-seeded** — Automatically imports all 44 patients and 12 packages from `patient-visit-data-2026-09-09 (2).json` on first run.
- **Search & sort** — Filter patients by name; sort by S.No, Name, or Package.
- **JSON Export / Import** — Export any month's data as a `.json` backup; import to restore.
- **Print-ready** — Dedicated print stylesheet hides controls for a clean printout.
- **Exact UI** — Same teal/gold/doctor-green/nurse-blue/psych-purple color palette as the original HTML.

---

## Project Structure

```
src/
├── app/
│   ├── globals.css           # Full CSS matching original HTML styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main page with state management
│   └── api/
│       ├── data/route.ts     # GET all data for a month
│       ├── patients/
│       │   ├── route.ts      # POST - add patient
│       │   └── [id]/route.ts # PATCH - update patient; DELETE - remove
│       ├── packages/route.ts # GET/POST packages
│       ├── months/route.ts   # GET/POST months
│       ├── reset/route.ts    # POST - reset month visits
│       ├── export/route.ts   # GET - export JSON
│       └── import/route.ts   # POST - import JSON
├── components/
│   ├── TitleBar.tsx          # Header with month navigation & Add Month button
│   ├── ControlBar.tsx        # Search, action buttons, legend
│   ├── VisitTable.tsx        # Full multi-week visit matrix table
│   ├── VisitDropdown.tsx     # Floating status picker
│   ├── PackageModal.tsx      # Package definitions editor
│   ├── AddPatientModal.tsx   # New patient form
│   └── AddMonthModal.tsx     # Upcoming month creator with carry-over
└── lib/
    ├── db.ts                 # Supabase database layer (@supabase/supabase-js)
    ├── calendar.ts           # Dynamic calendar utilities (any month/year)
    └── types.ts              # TypeScript interfaces
```

## Setup & Desktop Shortcut Guide

For detailed instructions on setting up, cloning, creating the desktop icon, and running this application on any PC, read the **[SETUP_GUIDE.md](file:///f:/client-projects/HHC-patientlist/SETUP_GUIDE.md)**.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Database

Data is stored in **Supabase** via PostgreSQL. Tables:

| Table | Purpose |
|---|---|
| `months` | Month index (id, year, month, label, days_in_month) |
| `packages` | Package definitions with visit allocations |
| `month_patients` | Per-patient per-month data (package assignment, medicine given, visit JSON) |

---

## Production Build

```bash
npm run build
npm start
```
