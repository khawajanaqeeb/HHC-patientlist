# 🖥️ HHC Patient Visit Sheet — Complete Setup & Desktop Shortcut Guide

This guide provides step-by-step instructions on how to install, set up, configure Supabase, create a desktop shortcut, and run the **HHC Patient Visit Sheet** application on **any Windows PC**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Download / Clone the Repository](#step-1-download--clone-the-repository)
3. [Step 2: Install Project Dependencies](#step-2-install-project-dependencies)
4. [Step 3: Configure Supabase](#step-3-configure-supabase)
5. [Step 4: Apply Database Migrations](#step-4-apply-database-migrations)
6. [Step 5: Create Desktop Shortcut with App Icon](#step-5-create-desktop-shortcut-with-app-icon)
7. [Step 6: Run the Application](#step-6-run-the-application)
8. [Step 7 (Optional): Transfer Existing Data to New PC](#step-7-optional-transfer-existing-data-to-new-pc)
9. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Before installing the app on a new PC, ensure the following software is installed:

1. **Node.js (LTS Version)**
   - Download & Install from: [https://nodejs.org/](https://nodejs.org/)
   - Verify installation in Command Prompt:
     ```cmd
     node -v
     npm -v
     ```

2. **Git (Optional but recommended)**
   - Download & Install from: [https://git-scm.com/](https://git-scm.com/)

3. **Supabase account & project**
   - Sign up at [https://supabase.com](https://supabase.com) and create a project.
   - You will need the **Project URL** and **Service Role Key** from your project's API settings.

---

## Step 1: Download / Clone the Repository

Open **Command Prompt** or **PowerShell** on the target PC and run:

```bash
git clone https://github.com/khawajanaqeeb/HHC-patientlist.git
cd HHC-patientlist
```

*(Alternatively: Go to [https://github.com/khawajanaqeeb/HHC-patientlist](https://github.com/khawajanaqeeb/HHC-patientlist), click **Code ➔ Download ZIP**, and extract the folder on your PC).*

---

## Step 2: Install Project Dependencies

Inside the project folder (`HHC-patientlist`), run:

```bash
npm install
```

This installs Next.js 15, React 19, Supabase client, Lucide React icons, and all required libraries.

---

## Step 3: Configure Supabase

Create a file named **`.env.local`** in the project root (copy from `.env.example`):

```cmd
copy .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

> ⚠️ **Security:** The Service Role Key bypasses Row Level Security. Keep it **server-side only**. Never commit `.env.local` or paste it in browser code.

---

## Step 4: Apply Database Migrations

Go to your **Supabase project → SQL Editor** and run the migration files **in order**:

1. `supabase/migrations/20260917000000_create_patient_visit_database.sql`
   - Creates `months`, `packages`, and `month_patients` tables with RLS enabled.

2. `supabase/migrations/20260922000000_replace_package_indexes.sql`
   - Replaces the old `pkg_idx` integer column with a proper `package_id` foreign key.
   - **Only required if you have existing data from before September 22, 2026.** Safe to run on a fresh database.

Alternatively, use the Supabase CLI:

```bash
supabase db push
```

---

## Step 5: Create Desktop Shortcut with App Icon

We have included an automated PowerShell script (`create-shortcut.ps1`) that creates a desktop shortcut with the custom Human Healthcare app icon (`app-icon.ico`).

### Method A: Right-Click (Easiest)
1. Open the `HHC-patientlist` project folder in Windows File Explorer.
2. **Right-click** on `create-shortcut.ps1`.
3. Select **Run with PowerShell**.

### Method B: Via Command Prompt / PowerShell
Run the following command inside the project folder:
```powershell
powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1
```

You will see a confirmation message:
> `Desktop shortcut successfully created on your Desktop!`

---

## Step 6: Run the Application

### Option A — Desktop Shortcut (Recommended for daily use)
1. **Double-click** the **"HHC Patient Visit Sheet"** shortcut on your Desktop.
2. `run-app.bat` starts `npm start` in the background and opens **Microsoft Edge** in a clean standalone app window (no address bar or tabs).

> The shortcut uses `npm start` (production mode). You must build first if you haven't:
> ```bash
> npm run build
> ```

### Option B — Development Mode
For development or debugging, use:
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) in any browser.

---

## Step 7 (Optional): Transfer Existing Data to New PC

The application stores all data in **Supabase**, so a new PC only needs:

1. The cloned repository.
2. Node.js installed.
3. The same `.env.local` file (copy it from the old PC — **do not commit it to Git**).

No local database files exist; all data lives in the cloud. Use the in-app **Export** button for an additional JSON backup, and **Import** to restore on any machine.

---

## 🔒 Data Management Operations: Export, Import & Reset

The system includes three secure utility tools in the left Sidebar / Action Drawer:

### 📤 1. Export Data (`Export` Button)
- **Purpose**: Creates an immediate `.json` backup of all packages, patient information, medicine expenses, and daily visit entries for the active month.
- **When to Use**:
  - At the end of each month before opening a new month.
  - Before making major batch updates or package modifications.
  - For archiving and offline compliance records.
- **How to Perform**:
  1. Open the **Sidebar Drawer** on the main dashboard.
  2. Click the **Export** button in the utility section.
  3. Save the downloaded file (`hhc-patient-list-[month].json`) to a secure location (e.g., Google Drive or an external backup drive).

### 📥 2. Import Data (`Import` Button)
- **Purpose**: Restores a month's patients, packages, and visit history from a `.json` backup file into Supabase.
- **When to Use**:
  - Restoring data after an accidental modification.
  - Moving patient lists and package configurations to a new database or local instance.
- **How to Perform**:
  1. Select the desired target month in the top navigation bar.
  2. Open the **Sidebar Drawer** and click **Import**.
  3. Select your `.json` backup file in the file picker.
  4. The system validates the file structure, updates Supabase, and reloads the active patient visit grid.

### 🔄 3. Reset Month (`Reset` Button)
- **Purpose**: Clears all visit checkmarks, resets medicine expenses to Rs. 0, and unassigns package selections for the active month.
- **Safety Guarantee**: **Patient Names and Subscriber IDs are preserved**. This action only clears monthly activity data, not the patient list.
- **When to Use**:
  - Re-starting a month's recording from scratch.
  - Clearing sample or test data.
- **How to Perform**:
  1. Ensure the correct month is selected in the top bar.
  2. Open the **Sidebar Drawer** and scroll to the secure red/danger **Reset Month** button.
  3. Click **Reset Month** and confirm the browser security prompt.
  4. The table will update to present a clean, unassigned visit grid for that month.

---

## Troubleshooting

### ❓ PowerShell Execution Policy Warning
If Windows blocks running `create-shortcut.ps1`, open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then run `create-shortcut.ps1` again.

### ❓ Browser doesn't open automatically
Make sure Microsoft Edge is installed (default on Windows 10/11). If you prefer Google Chrome, open `run-app.bat` in a text editor and change `msedge` to `chrome`.

### ❓ "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured" error
Make sure `.env.local` exists in the project root (not `.env`) and contains both variables without quotes around values.

### ❓ Table does not exist errors
Run both migration SQL files in Supabase SQL Editor in the correct order (see Step 4).

### ❓ Page loads but shows no data
Check that Row Level Security policies in Supabase allow the service-role key, or that RLS is configured correctly. The service-role key should bypass RLS by default.

---

*HHC Patient Visit Sheet — Built for Human Healthcare Management*

