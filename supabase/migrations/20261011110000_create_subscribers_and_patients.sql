-- Migration: Create master subscribers and patients tables, migrate historical records, and link month_patients
-- Safe to run multiple times: uses IF NOT EXISTS and ON CONFLICT checks

-- 1. Create subscribers table
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and service role policy for subscribers
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.subscribers
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Create master patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code text UNIQUE NOT NULL,
  legacy_patient_id integer,
  name text NOT NULL,
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
  subscriber_name text,
  subscriber_email text,
  father_husband_name text,
  dob text,
  gender text,
  address text,
  google_address_location text,
  assigned_doctor text,
  photo_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and service role policy for patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.patients
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS patients_subscriber_id_idx ON public.patients (subscriber_id);
CREATE INDEX IF NOT EXISTS patients_legacy_id_idx ON public.patients (legacy_patient_id);

-- 3. Link month_patients to master patients
ALTER TABLE public.month_patients
  ADD COLUMN IF NOT EXISTS master_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS month_patients_master_id_idx ON public.month_patients (master_patient_id);

-- 4. Seed subscribers from historical month_patients
INSERT INTO public.subscribers (name, email)
SELECT DISTINCT ON (LOWER(TRIM(subscriber)))
  TRIM(subscriber) AS name,
  NULLIF(TRIM(subscriber_email), '') AS email
FROM public.month_patients
WHERE NULLIF(TRIM(subscriber), '') IS NOT NULL
ORDER BY LOWER(TRIM(subscriber)), month_id DESC;

-- 5. Seed master patients from historical month_patients (taking latest month record per patient_id)
WITH ranked_patients AS (
  SELECT
    patient_id,
    name,
    subscriber,
    subscriber_email,
    father_husband_name,
    dob,
    gender,
    address,
    google_address_location,
    assigned_doctor,
    photo_path,
    COALESCE(is_active, true) as is_active,
    ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY month_id DESC, id DESC) as rn
  FROM public.month_patients
  WHERE NULLIF(TRIM(name), '') IS NOT NULL
)
INSERT INTO public.patients (
  patient_code,
  legacy_patient_id,
  name,
  subscriber_id,
  subscriber_name,
  subscriber_email,
  father_husband_name,
  dob,
  gender,
  address,
  google_address_location,
  assigned_doctor,
  photo_path,
  is_active
)
SELECT
  'P-' || LPAD(rp.patient_id::text, 3, '0') AS patient_code,
  rp.patient_id AS legacy_patient_id,
  TRIM(rp.name) AS name,
  s.id AS subscriber_id,
  TRIM(rp.subscriber) AS subscriber_name,
  TRIM(rp.subscriber_email) AS subscriber_email,
  rp.father_husband_name,
  rp.dob,
  rp.gender,
  rp.address,
  rp.google_address_location,
  rp.assigned_doctor,
  rp.photo_path,
  rp.is_active
FROM ranked_patients rp
LEFT JOIN public.subscribers s ON LOWER(TRIM(s.name)) = LOWER(TRIM(rp.subscriber))
WHERE rp.rn = 1
ON CONFLICT (patient_code) DO NOTHING;

-- 6. Backlink month_patients to master patients table
UPDATE public.month_patients mp
SET master_patient_id = p.id
FROM public.patients p
WHERE p.legacy_patient_id = mp.patient_id
  AND mp.master_patient_id IS NULL;

-- 7. Trigger to automatically link or register master patient whenever month_patients is added
CREATE OR REPLACE FUNCTION public.sync_month_patient_master_link()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id uuid;
  v_sub_id uuid;
BEGIN
  -- If master_patient_id is not already provided, look up by legacy patient_id
  IF NEW.master_patient_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    SELECT id INTO v_patient_id FROM public.patients WHERE legacy_patient_id = NEW.patient_id LIMIT 1;
    
    IF v_patient_id IS NOT NULL THEN
      NEW.master_patient_id := v_patient_id;
    ELSE
      -- Find or create subscriber
      IF NULLIF(TRIM(NEW.subscriber), '') IS NOT NULL THEN
        SELECT id INTO v_sub_id FROM public.subscribers WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.subscriber)) LIMIT 1;
        IF v_sub_id IS NULL THEN
          INSERT INTO public.subscribers (name, email)
          VALUES (TRIM(NEW.subscriber), NULLIF(TRIM(NEW.subscriber_email), ''))
          RETURNING id INTO v_sub_id;
        END IF;
      END IF;

      -- Insert into master patients
      INSERT INTO public.patients (
        patient_code,
        legacy_patient_id,
        name,
        subscriber_id,
        subscriber_name,
        subscriber_email,
        father_husband_name,
        dob,
        gender,
        address,
        google_address_location,
        assigned_doctor,
        photo_path,
        is_active
      ) VALUES (
        'P-' || LPAD(NEW.patient_id::text, 3, '0'),
        NEW.patient_id,
        TRIM(NEW.name),
        v_sub_id,
        TRIM(NEW.subscriber),
        TRIM(NEW.subscriber_email),
        NEW.father_husband_name,
        NEW.dob,
        NEW.gender,
        NEW.address,
        NEW.google_address_location,
        NEW.assigned_doctor,
        NEW.photo_path,
        COALESCE(NEW.is_active, true)
      ) RETURNING id INTO v_patient_id;

      NEW.master_patient_id := v_patient_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_month_patient_master_link ON public.month_patients;
CREATE TRIGGER trg_sync_month_patient_master_link
BEFORE INSERT ON public.month_patients
FOR EACH ROW EXECUTE FUNCTION public.sync_month_patient_master_link();
