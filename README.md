# 🏥 HHC Patient Visit Sheet — Complete Documentation & Setup Guide

A full-stack **Next.js 15** web application for managing monthly patient visit tracking and healthcare allocations at **Human Healthcare (HHC)**. All data is real-time persisted in **Supabase** (PostgreSQL). The app runs locally on Windows and opens in a clean Microsoft Edge app window via a desktop shortcut.

---

## 📋 Table of Contents
1. [Features & Capabilities](#-features--capabilities)
2. [Data Management: Export, Import & Reset](#-data-management-export-import--reset)
3. [Windows Setup & Installation Guide](#-windows-setup--installation-guide)
   - [1. Prerequisites](#1-prerequisites)
   - [2. Download / Clone Repository](#2-download--clone-repository)
   - [3. Install Dependencies](#3-install-dependencies)
   - [4. Configure Supabase Environment](#4-configure-supabase-environment)
   - [5. Apply Database Migrations](#5-apply-database-migrations)
   - [6. Create Desktop Shortcut](#6-create-desktop-shortcut)
   - [7. Running the Application](#7-running-the-application)
   - [8. Data Transfer to New PC](#8-data-transfer-to-new-pc)
4. [Architecture & Database Schema](#-architecture--database-schema)
   - [Project Structure](#project-structure)
   - [Database Tables & Relationships](#database-tables--relationships)
   - [API Endpoints Directory](#api-endpoints-directory)
   - [Future Healthcare & Billing Roadmap](#future-healthcare--billing-roadmap)
5. [Troubleshooting Guide](#-troubleshooting-guide)

---

## ✨ Features & Capabilities

- **Multi-month support** — Create tracking sheets for any month. Patients and package definitions carry over automatically; daily visit matrices reset to blank.
- **Supabase Cloud Database** — Real-time PostgreSQL backend powered by `@supabase/supabase-js` using server-only service-role credentials.
- **5 Care-Type Visit Matrix** — Daily visit tracking across five care categories per patient: Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist. Status cycles: ✔ Visited → ✖ Cancelled → — No Visit → Clear.
- **Enter Visit Modal** — Daily visit recording with live search (by name, date, subscriber, or package), real-time quota counters, and day-by-day navigation.
- **Package Allocation Management** — Define monthly visit allocations per package type, including medicine budgets.
- **Live Quota Tracking** — Displays total allocated, done, and remaining visits per care type with visual color-coded warnings when quotas are low or exhausted.
- **Medicine Expense Tracking** — Record medicine provided (Rs.) against package limits; automatically calculates balance or overage.
- **PKR / USD Currency Toggle** — Live exchange rate fetched on startup with automatic fallback.
- **Search & Filter** — Filter patients by name, subscriber ID, or package; sort by S.No, Name, Subscriber, or Package.
- **Responsive Mobile-First UI** — Fully responsive layout featuring a collapsible sidebar drawer, touch-optimized matrix scrolling, and dynamic modals.
- **Print-Ready Stylesheet** — Dedicated CSS hides layout controls for clean physical printing.
- **Desktop Shortcut** — Automated PowerShell installer (`create-shortcut.ps1`) creates a Windows desktop shortcut with a custom HHC app icon.

---

## 🛠️ Data Management: Export, Import & Reset

The application includes three secure utility operations accessible from the left Sidebar / Action Drawer:

### 📤 1. Export Data (`Export` Button)
- **Functionality**: Generates and downloads a complete `.json` snapshot of the active month's data directly from Supabase.
- **Data Included**:
  - **Month Details**: Month ID (e.g., `2026-09`), year, month index, label, and day count.
  - **Package Definitions**: All defined packages, pricing, and visit quotas (Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist, Medicine budget).
  - **Patient Records**: Full patient roster, subscriber status, assigned package links, medicine expenses (`medGiven`), and the entire 31-day visit matrix.
  - **Metadata**: Timestamp (`exportedAt`).
- **How to Use**:
  1. Open the Sidebar / Action Drawer on the left side of the dashboard.
  2. Click **Export**.
  3. The browser automatically downloads `hhc-patient-list-[monthId].json` (e.g., `hhc-patient-list-2026-09.json`).
- **Best Practice**: Perform an Export before major package modifications, monthly resets, or software updates.

### 📥 2. Import Data (`Import` Button)
- **Functionality**: Restores or populates package definitions and patient visit records for the selected month from a valid JSON backup file.
- **How It Works**:
  - Validates the uploaded JSON structure for required `patients` and `PKGS` arrays.
  - Overwrites package definitions in Supabase with the imported package list.
  - Re-maps patient package associations (`packageId` / `pkgIdx`) to preserve quota integrity.
  - Normalizes daily visit matrices to fit the active month length.
- **How to Use**:
  1. Select the target month in the top navigation bar.
  2. Open the Sidebar Drawer and click **Import**.
  3. Choose your `.json` backup file in the native file picker.
  4. The system validates the payload, updates Supabase, and reloads the active patient visit grid.

### 🔄 3. Reset Month (`Reset Month` Button)
- **Functionality**: Clears all daily visit checkmarks, resets medicine expenses to Rs. 0, and unassigns package selections for every patient in the active month.
- **Safety Guarantee**:
  - **Roster Preservation**: Patient records (Names and Subscriber IDs) are **NOT deleted**. Only variable monthly activity data is cleared.
  - **Confirmation Security**: Requires explicit user confirmation via a browser alert before execution.
  - **Protected Styling**: Styled as a red danger action inside the secure utility section of the sidebar to prevent accidental clicks.
- **How to Use**:
  1. Ensure the correct month is active.
  2. Open the Sidebar Drawer and click **Reset Month**.
  3. Confirm the security prompt (*"Are you sure you want to reset all visit data and package assignments for this month?"*).
  4. The backend resets the month in Supabase and clears the visit matrix view.

---

## 🖥️ Windows Setup & Installation Guide

Follow these step-by-step instructions to set up and run the application on any Windows PC.

### 1. Prerequisites

Before installing, ensure the following software is installed:
1. **Node.js (LTS Version)** — Download & install from [https://nodejs.org/](https://nodejs.org/).
   Verify in Command Prompt:
   ```cmd
   node -v
   npm -v
   ```
2. **Git (Optional but recommended)** — Download & install from [https://git-scm.com/](https://git-scm.com/).
3. **Supabase Account & Project** — Sign up at [https://supabase.com](https://supabase.com) and create a project. Note your **Project URL** and **Service Role Key** from `Settings ➔ API`.

---

### 2. Download / Clone Repository

Open Command Prompt or PowerShell and run:
```bash
git clone https://github.com/khawajanaqeeb/HHC-patientlist.git
cd HHC-patientlist
```
*(Alternatively: Download the ZIP from GitHub and extract it to your PC).*

---

### 3. Install Dependencies

Run the following command inside the project directory:
```bash
npm install
```

---

### 4. Configure Supabase Environment

Create a **`.env.local`** file in the project root by copying `.env.example`:
```cmd
copy .env.example .env.local
```

Open `.env.local` in a text editor and add your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

> ⚠️ **Security Warning:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep it strictly server-side in `.env.local`. Never expose it in client-side code or commit it to Git.

---

### 5. Apply Database Migrations

In your **Supabase Project ➔ SQL Editor**, execute the migration SQL files in `supabase/migrations/` **in order**:

1. `20260917000000_create_patient_visit_database.sql` — Creates `months`, `packages`, and `month_patients` tables.
2. `20260922000000_replace_package_indexes.sql` — Migrates package references to use foreign keys.

*(Alternatively, use `supabase db push` via the Supabase CLI).*

---

### 6. Create Desktop Shortcut

Automated setup via `create-shortcut.ps1` attaches the custom Human Healthcare app icon (`app-icon.ico`):

**Method A: Right-Click (Easiest)**
1. Open the project folder in Windows File Explorer.
2. Right-click `create-shortcut.ps1`.
3. Select **Run with PowerShell**.

**Method B: Command Line**
```powershell
powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1
```

---

### 7. Running the Application

#### Option A: Desktop App Mode (Recommended for Daily Use)
Double-click the **HHC Patient Visit Sheet** shortcut on your Desktop. It executes `run-app.bat`, starting the server and launching **Microsoft Edge in app mode** (standalone window without browser tabs or address bar).

> Build production assets first:
> ```bash
> npm run build
> ```

#### Option B: Development Mode
For development or debugging:
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) in any browser.

---

### 8. Data Transfer to New PC

Because data is hosted in **Supabase Cloud**, setting up a new PC only requires cloning the repository, installing Node.js dependencies, and placing the same `.env.local` file. All monthly patient lists and visit matrices automatically sync. Use **Export** and **Import** for offline backups.

---

## 🏗️ Architecture & Database Schema

### Project Structure

```
HHC-patientlist/
├── .env.example                  # Environment variable template
├── next.config.mjs               # Next.js configuration
├── package.json
├── create-shortcut.ps1           # Windows PowerShell shortcut installer
├── run-app.bat                   # Server launcher & Edge app runner
├── app-icon.ico                  # Custom HHC desktop app icon
├── README.md                     # Consolidated master documentation
├── supabase/
│   └── migrations/
│       ├── 20260917000000_create_patient_visit_database.sql   # Initial schema
│       └── 20260922000000_replace_package_indexes.sql         # FK migration
└── src/
    ├── app/
    │   ├── globals.css                # CSS variables, table grid, drawer, responsive breakpoints
    │   ├── layout.tsx                 # Root layout with viewport metadata
    │   ├── page.tsx                   # Main page component & state orchestration
    │   └── api/
    │       ├── data/route.ts          # GET  — Load full month dataset
    │       ├── patients/
    │       │   ├── route.ts           # POST — Add patient
    │       │   └── [id]/route.ts      # PATCH — Update; DELETE — Remove patient
    │       ├── packages/route.ts      # GET / POST — Manage package allocations
    │       ├── months/route.ts        # GET / POST — List & create months
    │       ├── patient-visited/route.ts # GET — Visit lookup & history search
    │       ├── reset/route.ts         # POST — Clear month visit entries
    │       ├── export/route.ts        # GET  — Export month JSON backup
    │       ├── import/route.ts        # POST — Import month JSON backup
    │       └── exchange-rate/route.ts # GET  — Live USD/PKR exchange rate
    ├── components/
    │   ├── TitleBar.tsx            # Header: Month selector, patient count, add month
    │   ├── ControlBar.tsx          # Search bar, action drawer toggle, currency switch
    │   ├── VisitTable.tsx          # Monthly patient visit tracking matrix
    │   ├── VisitDropdown.tsx       # Interactive visit status picker
    │   ├── EnterVisitModal.tsx     # Visit entry modal with quota counters
    │   ├── PackageModal.tsx        # Package editor modal
    │   ├── AddPatientModal.tsx     # Add / Edit / Delete patient modal
    │   ├── PatientSearchModal.tsx  # Patient lookup modal
    │   ├── PatientVisitedModal.tsx # Patient visit history viewer
    │   └── AddMonthModal.tsx       # Month creator with patient carry-over option
    └── lib/
        ├── db.ts                   # Supabase client singleton & SQL queries
        ├── calendar.ts             # Date and month matrix utilities
        ├── validation.ts           # Input sanitization and validators
        └── types.ts                # TypeScript interfaces
```

---

### Database Tables & Relationships

| Table | Purpose | Key Columns |
|---|---|---|
| `months` | Month registry | `id` (YYYY-MM), `year`, `month`, `label`, `days_in_month` |
| `packages` | Package quotas & rates | `id`, `name`, `price`, `doc`, `nur_phy`, `nur`, `phy`, `psy`, `med`, `sort_order` |
| `month_patients` | Per-patient monthly record | `month_id` (FK), `patient_id`, `name`, `subscriber`, `package_id` (FK), `med_given`, `visits_json` (JSONB matrix) |

---

### API Endpoints Directory

- **`GET /api/data?monthId=YYYY-MM`** — Fetch month details, packages, and patient list with visit matrices.
- **`POST /api/patients`** — Create a new patient record for the active month.
- **`PATCH /api/patients/[id]`** — Update patient details, package, medicine, or daily visit entries.
- **`DELETE /api/patients/[id]`** — Delete a patient record from a month.
- **`GET / POST /api/packages`** — List existing packages or save package allocations.
- **`GET / POST /api/months`** — List existing months or create a new month with patient carry-over.
- **`POST /api/reset`** — Reset visit entries, medicine expenses, and package selections for a month.
- **`GET /api/export?monthId=YYYY-MM`** — Download a complete `.json` month backup file.
- **`POST /api/import`** — Upload and restore a `.json` month backup file.
- **`GET /api/exchange-rate`** — Fetch current USD to PKR exchange rate.

---

### Future Healthcare & Billing Roadmap

The database architecture is designed to support upcoming finance modules:
1. **Billing & Invoicing**: Generating invoices from package allocations and actual visit records.
2. **Payment Tracking**: Partial payments, receipts, and outstanding balance management.
3. **Expense Management**: Categorized clinic expenses and vendor management.
4. **Financial Reporting**: Income vs. expense summaries and patient ledger reports.

---

## ❓ Troubleshooting Guide

### PowerShell Execution Policy Warning
If Windows blocks `create-shortcut.ps1`, open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then execute `create-shortcut.ps1` again.

### Browser Doesn't Open Automatically
Make sure Microsoft Edge is installed (default on Windows 10/11). To use Google Chrome instead, open `run-app.bat` in a text editor and replace `msedge` with `chrome`.

### "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured"
Verify that `.env.local` exists in the root directory (not `.env`) and contains both variables without quotes.

### Table Does Not Exist Error
Execute both migration SQL files in your Supabase SQL Editor in numerical order (see [Step 5](#5-apply-database-migrations)).

### Page Loads But Shows No Data
Ensure your Supabase project status is active and that the `SUPABASE_SERVICE_ROLE_KEY` is accurately pasted in `.env.local`.

---

*HHC Patient Visit Sheet — Developed for Human Healthcare Management*
