-- Migration: Complete Accounting Core Schema
-- Includes:
-- 1. Seed account 4070 (Medicine Revenue - Excess Billing)
-- 2. Numbering sequences (subscriptions, invoices, payments, journals)
-- 3. Subscriptions table
-- 4. Medicine dispensing table (linked to patient)
-- 5. Lab orders table (linked to patient)
-- 6. Invoices & Invoice Line Items tables
-- 7. Payments table
-- 8. Double-entry Journal Entries & Line Items tables
-- 9. Revenue Recognition tracking table

-- 1. Ensure account 4070 is present in accounts
INSERT INTO public.accounts (code, name, type, sub_type)
VALUES ('4070', 'Medicine Revenue (Excess Billing)', 'revenue', 'service revenue')
ON CONFLICT (code) DO NOTHING;

-- 2. Numbering Sequences
CREATE SEQUENCE IF NOT EXISTS public.hhc_subscription_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hhc_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hhc_payment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.hhc_journal_seq START 1;

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_code text UNIQUE NOT NULL,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  plan_id integer NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  plan_name text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  total_recognized_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_subscriber_id_idx ON public.subscriptions (subscriber_id);
CREATE INDEX IF NOT EXISTS subscriptions_patient_id_idx ON public.subscriptions (patient_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);

-- 4. Medicine Dispensing Table
CREATE TABLE IF NOT EXISTS public.medicine_dispensing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dispensed_date date NOT NULL DEFAULT CURRENT_DATE,
  medicine_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  total_price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  prescribing_doctor text,
  notes text,
  invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medicine_dispensing_patient_id_idx ON public.medicine_dispensing (patient_id);
CREATE INDEX IF NOT EXISTS medicine_dispensing_date_idx ON public.medicine_dispensing (dispensed_date);
CREATE INDEX IF NOT EXISTS medicine_dispensing_invoice_id_idx ON public.medicine_dispensing (invoice_id);

-- 5. Lab Orders Table
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  test_name text NOT NULL,
  price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  cost_to_hhc_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  partner_lab text,
  is_included_in_plan boolean NOT NULL DEFAULT false,
  notes text,
  invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_orders_patient_id_idx ON public.lab_orders (patient_id);
CREATE INDEX IF NOT EXISTS lab_orders_date_idx ON public.lab_orders (order_date);
CREATE INDEX IF NOT EXISTS lab_orders_invoice_id_idx ON public.lab_orders (invoice_id);

-- 6. Invoices & Line Items
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE RESTRICT,
  patient_id uuid REFERENCES public.patients(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'PKR',
  exchange_rate_usd numeric(12, 4) NOT NULL DEFAULT 278.50,
  plan_fee_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  excess_medicine_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  lab_charges_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  discount_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  tax_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  total_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  paid_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  balance_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_subscriber_id_idx ON public.invoices (subscriber_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices (status);
CREATE INDEX IF NOT EXISTS invoices_issue_date_idx ON public.invoices (issue_date);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('plan_fee', 'excess_medicine', 'lab_test', 'service', 'discount', 'other')),
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  total_price_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_id_idx ON public.invoice_line_items (invoice_id);

-- Link back foreign keys on dispensing and labs to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'medicine_dispensing_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.medicine_dispensing
      ADD CONSTRAINT medicine_dispensing_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lab_orders_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.lab_orders
      ADD CONSTRAINT lab_orders_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE RESTRICT,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  exchange_rate_usd numeric(12, 4) NOT NULL DEFAULT 278.50,
  payment_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online', 'other')),
  destination_account_id uuid REFERENCES public.accounts(id),
  reference_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_subscriber_id_idx ON public.payments (subscriber_id);
CREATE INDEX IF NOT EXISTS payments_date_idx ON public.payments (payment_date);

-- 8. Double-Entry Journal Entries & Line Items
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type text NOT NULL CHECK (source_type IN ('invoice', 'payment', 'revenue_recognition', 'manual', 'expense', 'reversal')),
  source_id uuid,
  description text NOT NULL,
  is_void boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entries_date_idx ON public.journal_entries (entry_date);
CREATE INDEX IF NOT EXISTS journal_entries_source_idx ON public.journal_entries (source_type, source_id);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  credit_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entry_lines_entry_id_idx ON public.journal_entry_lines (entry_id);
CREATE INDEX IF NOT EXISTS journal_entry_lines_account_id_idx ON public.journal_entry_lines (account_id);
CREATE INDEX IF NOT EXISTS journal_entry_lines_account_code_idx ON public.journal_entry_lines (account_code);

-- 9. Revenue Recognition Log
CREATE TABLE IF NOT EXISTS public.revenue_recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  period_month text NOT NULL, -- Format: YYYY-MM
  recognition_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_pkr numeric(12, 2) NOT NULL DEFAULT 0,
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, period_month)
);

CREATE INDEX IF NOT EXISTS rev_rec_sub_idx ON public.revenue_recognitions (subscription_id);

-- Enable RLS and Service Role policies for all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_dispensing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_recognitions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'subscriptions', 'medicine_dispensing', 'lab_orders',
    'invoices', 'invoice_line_items', 'payments',
    'journal_entries', 'journal_entry_lines', 'revenue_recognitions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_all'
    ) THEN
      EXECUTE format('CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', t);
    END IF;
  END LOOP;
END $$;
