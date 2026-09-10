# 🖥️ HHC Patient Visit Sheet — Complete Setup & Desktop Shortcut Guide

This guide provides step-by-step instructions on how to install, set up, create a desktop shortcut, and run the **HHC Patient Visit Sheet** application on **any Windows PC**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Download / Clone the Repository](#step-1-download--clone-the-repository)
3. [Step 2: Install Project Dependencies](#step-2-install-project-dependencies)
4. [Step 3: Create Desktop Shortcut with App Icon](#step-3-create-desktop-shortcut-with-app-icon)
5. [Step 4: Run the Application](#step-4-run-the-application)
6. [Step 5 (Optional): Transfer Existing Data to New PC](#step-5-optional-transfer-existing-data-to-new-pc)
7. [Troubleshooting](#troubleshooting)

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

This installs Next.js, React, SQLite client, and all required libraries.

---

## Step 3: Create Desktop Shortcut with App Icon

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

## Step 4: Run the Application

You can now start the application in **Clean App Window Mode** anytime by:

1. **Double-clicking** the **"HHC Patient Visit Sheet"** shortcut on your Desktop.
2. The server will start automatically in the background, and Microsoft Edge will open the application in a clean, standalone app window (no address bar or tabs).

---

## Step 5 (Optional): Transfer Existing Data to New PC

The app stores all patients, months, and visit history locally in a SQLite database file located in the `.data/` folder.

To transfer your current patient data from your old PC to the new PC:
1. Open the project folder on the old PC.
2. Copy the hidden **`.data`** folder.
3. Paste the **`.data`** folder into the project directory on the new PC.

---

## Troubleshooting

### ❓ PowerShell Execution Policy Warning
If Windows blocks running `create-shortcut.ps1`, open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then run `create-shortcut.ps1` again.

### ❓ Browser doesn't open automatically
Make sure Microsoft Edge is installed (default on Windows 10/11). If you prefer Google Chrome, open `run-app.bat` and change `msedge` to `chrome`.

---

*HHC Patient Visit Sheet — Built for Human Healthcare Management*
