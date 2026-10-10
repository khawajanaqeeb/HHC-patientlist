# 🏥 HHC Patient & Staff Management System — Complete Architecture & Developer Reference

This document serves as the **master architecture reference** for AI coding assistants and developers working on the **Human Healthcare (HHC)** management codebase. It details the complete system design, database schemas, API contracts, page routes, and deployment requirements.

---

## 📌 1. Tech Stack Overview

- **Framework**: Next.js 15 (App Router, Server Actions, Client Components)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Vanilla CSS (`src/app/globals.css` with CSS variables, custom glassmorphism, flexbox/grid responsive layouts)
- **Database**: Supabase PostgreSQL powered by `@supabase/supabase-js` (Service Role Key for server-only operations)
- **Storage**: Supabase Storage (`patient-photos` and `staff-photos` buckets for profile avatars)
- **Icons**: `lucide-react`
- **Desktop Mode**: Microsoft Edge App Mode via `run-app.bat` and PowerShell shortcut installer (`create-shortcut.ps1`)

---

## 🗄️ 2. Database Schema & Migration Sequence

All database migrations are located in `supabase/migrations/` and must be executed in Supabase SQL Editor in numerical sequence:

### Migration 1: `20260917000000_create_patient_visit_database.sql`
- Creates `months` table (stores month registry: `id` e.g. `2026-10`, `year`, `month`, `label`, `days_in_month`).
- Creates `packages` table (stores care allocations: `id`, `name`, `price`, `doc`, `nur_phy`, `nur`, `phy`, `psy`, `med`, `sort_order`).
- Creates `month_patients` table (stores per-month patient records & visit matrix).

### Migration 2: `20260922000000_replace_package_indexes.sql`
- Migrates package references in `month_patients` to foreign keys referencing `packages.id`.

### Migration 3: `20261004000000_add_patient_extended_fields.sql`
- Adds extended profile columns to `month_patients`:
  - `subscriber_email` (text)
  - `father_husband_name` (text)
  - `dob` (text, YYYY-MM-DD)
  - `gender` (text, 'male' | 'female' | 'other')
  - `address` (text)
  - `google_address_location` (text)
  - `assigned_doctor` (text)

### Migration 4: `20261004100000_staff_management.sql`
- Creates `staff_members` table for managing clinic staff & doctors:
  - `id` (uuid, primary key)
  - `staff_id` (text, unique e.g. `STF-001`, `DOC-002`)
  - `name` (text)
  - `father_husband_name` (text)
  - `father_husband_name_type` (text, 'father' | 'husband')
  - `gender` (text)
  - `designation_type` (text, 'doctor' | 'nurse' | 'physio' | 'receptionist' | 'other')
  - `designation_custom` (text)
  - `qualification` (text)
  - `contact_number` (text)
  - `whatsapp` (text)
  - `email` (text)
  - `address` (text)
  - `google_maps_url` (text)
  - `latitude` / `longitude` (double precision)
  - `photo_path` (text, storage path in `staff-photos`)
  - `is_active` (boolean, default true)
  - `created_at` / `updated_at` (timestamptz)

### Migration 5: `20261006000000_add_patient_photo_path.sql`
- Adds `photo_path` (text) to `month_patients` for patient avatar storage in `patient-photos` bucket.

### Migration 6: `20261006100000_add_patient_is_active.sql`
- Adds `is_active` (boolean, default true) to `month_patients` to enable patient active/inactive status toggling.

### Other migrations (also required)
- `20260930000000_add_sv_flu_opd_to_packages.sql` — adds `sv`, `flu`, `opd` allocation columns to `packages`.
- `20261005000000_add_father_husband_name_type.sql` — adds `father_husband_name_type` to `staff_members`.
- `20261007000000_create_accounts_chart.sql` — creates the chart-of-accounts table used by `/accounts`.

> **Note:** `src/lib/db.ts` silently falls back to a reduced column set if optional columns are missing, which can drop fields without any error. Always apply every migration.

---

## 📁 3. Core Modules & Page Routing Structure

The application is structured into three primary workflow modules:

```
src/app/
├── page.tsx                       # 1. Main Monthly Patient Visit Sheet (Daily matrix tracking)
├── patients/
│   ├── page.tsx                   # 2. Centralized Master Patient Directory (Search, filter, status, actions)
│   └── [id]/
│       ├── page.tsx               # Individual Patient Profile & Multi-Month Visit History
│       └── edit/
│           └── page.tsx           # Dedicated Edit Patient Profile Page
└── staff/
    ├── page.tsx                   # 3. Master Staff Directory (Doctors, Nurses, Physios, Staff)
    ├── new/
    │   └── page.tsx               # Register New Staff Member Page
    └── [id]/
        ├── page.tsx               # Individual Staff Profile (Identity, contact, location map iframe)
        └── edit/
            └── page.tsx           # Edit Staff Member Page (Photo upload, credentials, maps location)
```

### Module 1: Patient Visit Sheet (`/`)
- **Purpose**: Daily operational visit matrix for active month.
- **Key Features**:
  - Month switching dropdown & month creator modal.
  - Interactive daily visit checkmarks per care type (Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist).
  - Quota counters and live balance indicators.
  - Enter Visit modal (`EnterVisitModal.tsx`).
  - Package editor modal (`PackageModal.tsx`).
  - Register New Patient modal (`AddPatientModal.tsx`).

### Module 2: Master Patient Directory (`/patients`)
- **Purpose**: Master registry of all patients across all months.
- **Key Features**:
  - Search bar (by name, subscriber, doctor, ID).
  - Filters: Gender, Status (`Active` / `Inactive`), Month.
  - Quick summary stat cards (Total, Active, Male, Female).
  - **Row Action Buttons**:
    - **View**: Navigates to `/patients/[id]`.
    - **Edit**: Navigates to `/patients/[id]/edit`.
    - **Deactivate / Activate**: Toggles `is_active` status.
    - **Delete**: Triggers deletion warning modal & removes patient records.
  - Header **`+ Add Patient`** button: Opens `AddPatientModal` to register new patients.

### Module 3: Staff Management (`/staff`)
- **Purpose**: Directory of all HHC personnel and doctors.
- **Key Features**:
  - Auto-generated Staff IDs (`STF-001`, `DOC-002`).
  - Avatar photo uploads (`staff-photos` Supabase storage bucket).
  - One-click Phone call (`tel:`) and WhatsApp chat (`https://wa.me/...`) links.
  - Google Maps iframe preview for staff residential locations.
  - Filter by Designation type (Doctor, Nurse, Physio, etc.) and Status.

---

## 🌐 4. API Endpoints Reference

### Patients API
- **`GET /api/data?monthId=YYYY-MM`**: Loads full active month dataset (month info, packages, patient roster & visit matrix).
- **`GET /api/patients/all?search=...&gender=...&status=...&month=...`**: Fetches flat deduplicated patient list across all months with filters.
- **`GET /api/patients/[id]`**: Fetches single patient record and their full enrolled months array.
- **`POST /api/patients`**: Registers a new patient for a specified month.
- **`PATCH /api/patients/[id]`**: Updates a patient. Accepts snake_case (profile pages) **and** camelCase (visit sheet) keys: `name`, `subscriber`, `gender`, `dob`, `address`, `assigned_doctor`/`assignedDoctor`, `subscriber_email`/`subscriberEmail`, `father_husband_name`/`fatherHusbandName`, `google_address_location`/`googleAddressLocation`, `photo_path`, `is_active`, plus visit-sheet data `packageId`, `medGiven`, `v` (daily visit matrix → `visits_json`). If the body includes `monthId`, only that month's row is updated; otherwise all months. Returns `404` if no row matched.
- **`DELETE /api/patients/[id]?monthId=YYYY-MM`**: With `monthId`, deletes the patient from that month only (visit sheet). Without it, deletes the patient across all months (patient directory).

### Staff API
- **`GET /api/staff?search=...&designation=...&gender=...&status=...`**: List staff members.
- **`GET /api/staff/[id]`**: Get single staff profile.
- **`POST /api/staff`**: Create staff member.
- **`PATCH /api/staff/[id]`**: Update staff member or `is_active` toggle.
- **`DELETE /api/staff/[id]`**: Remove staff member.
- **`GET /api/staff/next-id?designation=...`**: Generate next auto-incremented staff ID.

### Photos & Storage API
- **`POST /api/photos/upload`**: Uploads image file (`FormData` with `bucket` = `patient-photos` | `staff-photos`, `entityId`, `file`).
- **`DELETE /api/photos/upload`**: Removes photo file from storage bucket.
- **`POST /api/photos/signed-urls`**: Returns signed URLs for array of storage paths in batch.

### Utilities & Systems API
- **`GET / POST /api/packages`**: Package allocations and pricing.
- **`GET / POST /api/months`**: Month registry and new month creation.
- **`POST /api/reset`**: Reset daily visit checkmarks & medicine given for a month.
- **`GET /api/export?monthId=YYYY-MM`**: Download JSON month snapshot.
- **`POST /api/import`**: Upload and restore JSON month snapshot.
- **`GET / POST /api/accounts`, `PATCH / DELETE /api/accounts/[id]`**: Chart of accounts.
- **`GET /api/patient-visited?date=YYYY-MM-DD`**: Patients visited on a given date.

### Authentication
All `/api/*` routes except login/logout/auth-check are protected by `src/middleware.ts` (session cookie). Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET` (see `.env.example`). Set them in Vercel too for online deployments.

---

## 📦 5. Required Storage Buckets

Make sure the following two public buckets are created in **Supabase Dashboard ➔ Storage ➔ Buckets**:

1. **`patient-photos`**: Stores patient profile avatars.
2. **`staff-photos`**: Stores staff member profile photos.

---

## 🛠️ 6. Guidelines for AI Assistants Modifying Code

1. **Preserve Database Structure**: Do not remove existing columns in `month_patients` or `staff_members`. Always use `if not exists` in migration SQLs.
2. **UTF-8 Encoding**: On Windows PowerShell, write files in UTF-8 without BOM (`System.Text.UTF8Encoding $false`) to prevent Next.js webpack compilation errors.
3. **Build Verification**: Always run `npm run build` after major UI or routing changes to confirm TypeScript validity.
4. **Git Workflow**: Always stage (`git add .`), commit with descriptive conventional commit messages (`feat: ...`, `fix: ...`, `style: ...`), and push to `origin/main`.
5. **Never trust a `success` response blindly**: Supabase `update()` with no matching rows is not an error. Use `.select()` and check the row count (as done in `PATCH /api/patients/[id]`).

---

## 🩺 7. Troubleshooting: Data Not Saving

1. Verify `SUPABASE_URL` in `.env` matches the Supabase project you are inspecting.
2. Verify all migrations ran (`select column_name from information_schema.columns where table_name = 'month_patients'` should list 18 columns incl. `package_id`, `visits_json`, `med_given`, `is_active`, `photo_path`).
3. Restart `npm run dev` after code/env changes.
4. Check the `PATCH /api/patients/...` response in the browser Network tab and the dev-server terminal for errors.

---

*Documented for Human Healthcare (HHC) Development Team*