-- Migration: Create accounts (chart of accounts) table and seed with HHC standard accounts
-- Safe to run multiple times: uses IF NOT EXISTS

-- 1. Create the accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  sub_type     text,
  parent_id    uuid REFERENCES accounts(id),
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 3. Allow service role full access (matches existing RLS pattern in the project)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON accounts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Seed the standard HHC chart of accounts
-- Uses INSERT ... ON CONFLICT DO NOTHING so it is idempotent
INSERT INTO accounts (code, name, type, sub_type) VALUES
  -- ASSETS
  ('1010', 'Cash in Hand',                  'asset',   'current asset'),
  ('1020', 'Bank Account Main',             'asset',   'current asset'),
  ('1030', 'Bank Account Collections',      'asset',   'current asset'),
  ('1110', 'Accounts Receivable',           'asset',   'current asset'),
  ('1120', 'Subscription Receivable',       'asset',   'current asset'),
  ('1200', 'Prepaid Expenses',              'asset',   'current asset'),
  ('1300', 'Medical Supplies Inventory',    'asset',   'current asset'),
  ('1400', 'Fixed Assets Equipment',        'asset',   'fixed asset'),
  ('1410', 'Fixed Assets Vehicles',         'asset',   'fixed asset'),
  ('1420', 'Accumulated Depreciation',      'asset',   'fixed asset'),

  -- LIABILITIES
  ('2010', 'Accounts Payable',              'liability', 'current liability'),
  ('2020', 'Salaries Payable',              'liability', 'current liability'),
  ('2030', 'Tax Payable',                   'liability', 'current liability'),
  ('2050', 'Unearned Revenue Subscriptions','liability', 'current liability'),
  ('2060', 'Advance Payments from Clients', 'liability', 'current liability'),
  ('2070', 'Loans Payable',                 'liability', 'non-current liability'),

  -- EQUITY
  ('3010', 'Owner Capital',                 'equity',  'owner equity'),
  ('3020', 'Retained Earnings',             'equity',  'owner equity'),
  ('3030', 'Owner Drawings',                'equity',  'owner equity'),

  -- REVENUE
  ('4010', 'Subscription Revenue Basic',    'revenue', 'subscription revenue'),
  ('4020', 'Subscription Revenue Standard', 'revenue', 'subscription revenue'),
  ('4030', 'Subscription Revenue Premium',  'revenue', 'subscription revenue'),
  ('4040', 'Per-Visit Revenue',             'revenue', 'service revenue'),
  ('4050', 'Consultation Fees',             'revenue', 'service revenue'),
  ('4060', 'Lab Test Revenue',              'revenue', 'service revenue'),
  ('4080', 'Corporate Plan Revenue',        'revenue', 'subscription revenue'),
  ('4910', 'Discounts and Refunds',         'revenue', 'contra revenue'),

  -- COST OF SERVICES (expenses)
  ('5010', 'Staff Salaries Clinical',       'expense', 'cost of services'),
  ('5020', 'Medical Supplies Consumed',     'expense', 'cost of services'),
  ('5040', 'Medicines Cost',                'expense', 'cost of services'),
  ('5050', 'Lab Partner Payments',          'expense', 'cost of services'),
  ('5060', 'Transport Home Visits',         'expense', 'cost of services'),

  -- OPERATING EXPENSES
  ('6010', 'Admin Salaries',                'expense', 'operating expense'),
  ('6020', 'Office Rent',                   'expense', 'operating expense'),
  ('6030', 'Utilities',                     'expense', 'operating expense'),
  ('6040', 'Marketing and Advertising',     'expense', 'operating expense'),
  ('6050', 'Software and Subscriptions',    'expense', 'operating expense'),
  ('6060', 'Insurance',                     'expense', 'operating expense'),
  ('6070', 'Depreciation Expense',          'expense', 'operating expense'),
  ('6080', 'Legal and Professional Fees',   'expense', 'operating expense'),
  ('6110', 'Bank Charges',                  'expense', 'operating expense'),
  ('6120', 'Miscellaneous Expenses',        'expense', 'operating expense')

ON CONFLICT (code) DO NOTHING;
