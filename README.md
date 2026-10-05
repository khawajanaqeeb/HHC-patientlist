# 🏥 HHC Patient & Staff Management System — Master Documentation

A full-stack **Next.js 15** web application for managing monthly patient visit tracking, master patient directory, and staff/doctor directory at **Human Healthcare (HHC)**. All data is real-time persisted in **Supabase** (PostgreSQL) and Supabase Storage.

> 📖 **Developer & AI Reference**: Full technical specification, API contracts, and database schema mappings are available in [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md).

---

## 📋 Table of Contents
1. [Features & Modules](#-features--modules)
2. [Windows Setup & Installation Guide](#-windows-setup--installation-guide)
3. [Database Migrations Sequence](#-database-migrations-sequence)
4. [Storage Buckets](#-storage-buckets)
5. [Architecture & Project Structure](#-architecture--project-structure)

---

## ✨ Features & Modules

### 1. Patient Visit Sheet (`/`)
- **Daily 5-Care Visit Matrix**: Track Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist visits day-by-day.
- **Enter Visit Data Modal**: Daily visit recording with live search, quota counters, and day navigation.
- **Package Allocations & Pricing**: Custom package limits and medicine budget tracking.
- **Multi-Month Support**: Create new tracking months while preserving patient rosters.

### 2. Patient Directory & Profiles (`/patients`)
- **Master Directory Grid**: View, search, and filter all registered patients across all months.
- **Status Management**: Active vs Inactive patient filter and toggle (`is_active`).
- **Row Actions**:
  - **View**: Inspect individual profile card & multi-month visit history (`/patients/[id]`).
  - **Edit**: Edit patient identity, subscriber details, assigned doctor, and address (`/patients/[id]/edit`).
  - **Deactivate / Activate**: Toggle active patient status.
  - **Delete**: Remove patient record with confirmation warning prompt.
- **Register New Patient**: Dedicated `+ Add Patient` modal in the directory header.

### 3. Staff Management Directory (`/staff`)
- **Personnel Registry**: Directory of doctors, nurses, physios, receptionists, and custom staff.
- **Auto Staff ID Generation**: `STF-001`, `DOC-002`, etc.
- **Photo Uploads**: Avatar upload & management via Supabase `staff-photos` storage bucket.
- **Contact & Location Links**: One-click Phone call, WhatsApp chat, and Google Maps iframe preview.

---

## 🖥️ Windows Setup & Installation Guide

### 1. Prerequisites
- **Node.js (LTS Version)** — [https://nodejs.org/](https://nodejs.org/)
- **Supabase Account & Project** — [https://supabase.com](https://supabase.com)

### 2. Clone & Install
```bash
git clone https://github.com/khawajanaqeeb/HHC-patientlist.git
cd HHC-patientlist
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

### 4. Create Desktop Shortcut
Right-click `create-shortcut.ps1` ➔ **Run with PowerShell** (or run `powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1`).

### 5. Running the Application
```bash
npm run dev
```
Or double-click the **HHC Patient Visit Sheet** desktop shortcut to launch Edge in standalone App Mode.

---

## 🗄️ Database Migrations Sequence

Execute all migration SQL files in `supabase/migrations/` in order inside **Supabase SQL Editor**:

1. `20260917000000_create_patient_visit_database.sql` — Initial `months`, `packages`, `month_patients` schema.
2. `20260922000000_replace_package_indexes.sql` — Package foreign key migration.
3. `20261004000000_add_patient_extended_fields.sql` — Extended profile columns (`subscriber_email`, `father_husband_name`, `dob`, `gender`, `address`, `google_address_location`, `assigned_doctor`).
4. `20261004100000_staff_management.sql` — `staff_members` table creation.
5. `20261006000000_add_patient_photo_path.sql` — `photo_path` column for patient avatars.
6. `20261006100000_add_patient_is_active.sql` — `is_active` status column for patients.

---

## 📦 Storage Buckets

Ensure the following public buckets are created in **Supabase Dashboard ➔ Storage**:
- `patient-photos`
- `staff-photos`

---

## 🏗️ Architecture & Project Structure

```
HHC-patientlist/
├── PROJECT_DOCUMENTATION.md      # Master developer & AI agent reference specification
├── README.md                     # Project setup & quick reference
├── create-shortcut.ps1           # Desktop shortcut installer
├── run-app.bat                   # Standalone Edge app runner
├── supabase/
│   └── migrations/               # SQL migrations in order (1 through 6)
└── src/
    ├── app/
    │   ├── page.tsx               # Patient Visit Sheet (Daily tracking matrix)
    │   ├── patients/              # Master Patient Directory & Profile Routes
    │   └── staff/                 # Master Staff Directory & Staff Form Routes
    ├── components/                # Modals, Table, ControlBar, TitleBar, PhotoUpload
    └── lib/                       # Supabase client, queries, types, validation
```

---

*Developed for Human Healthcare (HHC) Management*