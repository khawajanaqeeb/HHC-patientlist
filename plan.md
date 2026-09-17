# HHC Healthcare and Finance Implementation Plan

## 1. Confirm the Product Scope

Define the complete workflow before changing the database or application:

- Patient registration and monthly patient records
- Packages and service allocations
- Patient services and visits
- Invoices and invoice items
- Payments and payment methods
- Outstanding balances
- Discounts, refunds, and cancelled services
- Expenses and vendors
- Cash and bank accounts
- Monthly income and expense reports
- Tax requirements
- User roles and approval rules

Decide whether the first release needs simple income/expense tracking or formal double-entry accounting.

## 2. Choose the Accounting Model

### Initial operational finance model

Use this model if the immediate goal is billing and reporting:

- Patients
- Packages
- Service records
- Invoices
- Invoice items
- Payments
- Expenses
- Vendors
- Accounts
- Financial transactions

### Formal accounting model

Use this model if official accounting records are required:

- Chart of accounts
- Journal entries
- Journal lines with debit and credit values
- Fiscal periods
- Period closing and locking
- Audit history

Do not implement both models at once unless the accounting requirements are already clear.

## 3. Define the Main Business Flow

1. A patient receives a service.
2. The service is recorded against the patient and relevant month.
3. The system calculates billable items from the package or service price.
4. An invoice is created with fixed historical prices.
5. A payment is recorded against the invoice.
6. The outstanding balance is recalculated.
7. Income reports include the invoice and payment correctly.
8. Corrections use voids, reversals, refunds, or adjustments instead of silently deleting financial history.

## 4. Define the Data Boundaries

Keep clinical and financial data related but separate.

```text
Patient
  -> Patient month
  -> Service or visit
  -> Invoice
  -> Invoice item
  -> Payment
```

Invoice items must store the price and description used at billing time. Future package-price changes must not change existing invoices.

## 5. Plan the Supabase Architecture

Use Supabase PostgreSQL as the shared production database.

Use:

- Supabase Auth for user login
- Profiles and roles for application permissions
- Row Level Security for database access control
- Server-side Supabase access for privileged operations
- Environment variables for Supabase URL and keys
- The service-role key only on the server

The browser must never receive or use the service-role key.

## 6. Define Users and Permissions

Start with these possible roles:

- Administrator
- Finance manager
- Reception or regular user
- Healthcare staff
- Read-only accountant

Document who may:

- Edit patients and packages
- Generate invoices
- Record or reverse payments
- Add or edit expenses
- View financial reports
- Change package prices
- Close or reopen financial periods
- Manage users and permissions

## 7. Design the Supabase Schema

Potential tables:

- `profiles`
- `roles`
- `patients`
- `packages`
- `patient_months`
- `service_records`
- `invoices`
- `invoice_items`
- `payments`
- `expenses`
- `vendors`
- `accounts`
- `journal_entries`
- `journal_lines`
- `audit_logs`

Finalize relationships, required fields, status values, indexes, unique constraints, currency rules, timestamps, and deletion/voiding behavior before implementation.

## 8. Create Versioned Database Migrations

Create SQL migrations for:

1. Core patient and package data
2. User profiles and roles
3. Services and visits
4. Invoices and invoice items
5. Payments
6. Expenses and vendors
7. Reports or accounting views
8. Audit logs and period closing, if required

Apply migrations first to a development Supabase project or development schema. Do not make manual production-only changes that cannot be reproduced.

## 9. Back Up and Migrate Existing Data

Before migration:

1. Export the current SQLite database.
2. Preserve a dated backup outside the application database folder.
3. Export the current JSON data as an additional backup.
4. Import patients and packages into Supabase.
5. Import monthly patient and visit data.
6. Compare record counts and sample records manually.
7. Keep JSON and SQLite backups until the Supabase version is verified.

The current application uses a local SQLite/libSQL database in `src/lib/db.ts`. Migration should be treated as a controlled data conversion, not a simple connection-string change.

## 10. Update the Application Data Layer

Replace direct local database access with a server-side Supabase data layer.

Update existing API routes carefully:

- `/api/data`
- `/api/patients`
- `/api/packages`
- `/api/months`
- `/api/export`
- `/api/import`

Add separate finance routes:

- `/api/invoices`
- `/api/payments`
- `/api/expenses`
- `/api/reports`
- `/api/accounts`

Keep accounting calculations in server-side services or library modules, not inside UI components.

## 11. Implement in Stages

### Stage 1: Authentication and database foundation

- Configure Supabase environment variables.
- Add authentication.
- Add profiles and roles.
- Add Row Level Security.
- Connect the application to Supabase.

### Stage 2: Existing patient module migration

- Migrate patients, packages, months, and visits.
- Preserve current patient workflows.
- Preserve export and import backups.
- Verify the existing application before adding finance features.

### Stage 3: Billing

- Add service records.
- Create invoice generation.
- Add invoice items and historical prices.
- Support invoice statuses such as draft, issued, paid, partially paid, overdue, and void.

### Stage 4: Payments

- Add payment entry.
- Support partial payments and multiple payments per invoice.
- Track payment method and reference number.
- Add refunds and payment reversals.

### Stage 5: Expenses

- Add vendors.
- Add expense categories.
- Record expenses with payment account and receipt references.
- Add approval status if needed.

### Stage 6: Reports

- Patient balances
- Invoice aging
- Monthly income
- Monthly expenses
- Net result
- Payments by method
- Package revenue
- Outstanding receivables

### Stage 7: Formal accounting, if required

- Chart of accounts
- Journal posting rules
- Debit and credit validation
- Fiscal periods
- Period closing
- Audit trail

## 12. Test Financial Correctness

Test calculations and permissions independently from the UI:

- Invoice totals
- Discounts
- Partial payments
- Overpayments
- Refunds
- Package price changes
- Cancelled visits
- Duplicate payments
- Voided invoices
- Multiple users editing the same record
- Role restrictions
- Month or period closing
- Backup and restore
- Migration accuracy

Financial records should be append-only or reversible wherever practical.

## 13. Deployment and Operations

Before production release:

- Configure production Supabase environment variables.
- Enable database backups.
- Verify Row Level Security policies.
- Create an administrator account.
- Test restore procedures.
- Document user workflows.
- Document how to reverse or correct transactions.
- Monitor database errors and failed API requests.

## 14. Naming Decision

No rename is required because the Supabase project is named `HHC-finance`.

These names are independent:

```text
Supabase project: HHC-finance
Repository: HHC-patientlist
Local folder: HHC-patientlist
```

Keep the current repository and folder names during planning and initial Supabase integration. Consider renaming later to a broader name such as `HHC-healthcare-management` after the final application scope is confirmed.

If the folder is renamed later, review:

- Desktop shortcut scripts
- `README.md`
- `SETUP_GUIDE.md`
- `package.json`
- Git remote configuration
- Deployment configuration

## 15. Definition of Done for the First Finance Release

The first release is ready when:

- Users can sign in with the correct role.
- Existing patient data is available from Supabase.
- Services can be billed consistently.
- Invoices preserve historical prices.
- Payments correctly update balances.
- Expenses appear in reports.
- Unauthorized users cannot access restricted data.
- Financial corrections leave an audit trail.
- Existing patient visit workflows still work.
- Data backups and restoration have been tested.
