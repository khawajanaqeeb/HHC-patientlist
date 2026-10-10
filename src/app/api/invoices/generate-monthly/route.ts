import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postJournalEntry } from '@/lib/accounting';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST /api/invoices/generate-monthly
// Batch-generates monthly invoices from month_patients for a specific month
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    let monthId = '2026-10';
    try {
      const body = await request.json();
      if (body?.monthId) monthId = body.monthId;
    } catch {
      // Body optional
    }

    // 1. Fetch month info
    const { data: monthRow } = await db.from('months').select('*').eq('id', monthId).single();
    const monthLabel = monthRow?.label || monthId;

    // 2. Fetch plans
    const { data: plansData } = await db.from('plans').select('id, name, price, med');
    const plansMap = new Map<number, { name: string; price: number; med: number }>();
    (plansData || []).forEach((p) => {
      plansMap.set(p.id, { name: p.name, price: Number(p.price) || 0, med: Number(p.med) || 0 });
    });

    // 3. Fetch master subscribers & patients
    const [{ data: subscribers }, { data: masterPatients }] = await Promise.all([
      db.from('subscribers').select('id, name'),
      db.from('patients').select('id, legacy_patient_id, patient_code, name, subscriber_id'),
    ]);

    const subscriberByName = new Map<string, string>();
    (subscribers || []).forEach((s) => subscriberByName.set(s.name.trim().toLowerCase(), s.id));

    const patientByLegacyId = new Map<number, { id: string; patient_code: string; subscriber_id: string | null }>();
    (masterPatients || []).forEach((p) => {
      if (p.legacy_patient_id) {
        patientByLegacyId.set(p.legacy_patient_id, {
          id: p.id,
          patient_code: p.patient_code,
          subscriber_id: p.subscriber_id,
        });
      }
    });

    // 4. Fetch month_patients for this month
    const { data: monthPatients, error: mpErr } = await db
      .from('month_patients')
      .select('id, patient_id, name, subscriber, package_id, plan_id, med_given, master_patient_id')
      .eq('month_id', monthId)
      .order('patient_id');

    if (mpErr) throw new Error(mpErr.message);

    // 5. Fetch existing invoices to prevent duplicate billing
    const { data: existingInvoices } = await db
      .from('invoices')
      .select('notes, patient_id')
      .ilike('notes', `%Period: ${monthId}%`);

    const alreadyBilledPatients = new Set<string>();
    (existingInvoices || []).forEach((inv) => {
      if (inv.patient_id) alreadyBilledPatients.add(inv.patient_id);
    });

    const year = new Date().getFullYear();
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let createdCount = 0;
    let totalBilledPkr = 0;

    for (const mp of monthPatients || []) {
      const planId = mp.plan_id || mp.package_id;
      if (!planId) continue;

      const planInfo = plansMap.get(planId);
      if (!planInfo || planInfo.price <= 0) continue;

      // Find or resolve master patient
      const mpInfo = patientByLegacyId.get(mp.patient_id);
      const masterPatId = mp.master_patient_id || mpInfo?.id;
      if (!masterPatId) continue;

      if (alreadyBilledPatients.has(masterPatId)) continue; // skip already billed

      // Find subscriber ID
      let subscriberId = mpInfo?.subscriber_id;
      if (!subscriberId && mp.subscriber) {
        subscriberId = subscriberByName.get(mp.subscriber.trim().toLowerCase());
      }
      if (!subscriberId && subscribers && subscribers.length > 0) {
        // Fallback to first subscriber or create one
        subscriberId = subscribers[0].id;
      }
      if (!subscriberId) continue;

      // Check medicine excess
      const medGiven = Number(mp.med_given) || 0;
      const medLimit = planInfo.med || 0;
      const excessMed = medGiven > medLimit ? medGiven - medLimit : 0;
      const totalAmount = planInfo.price + excessMed;

      const invNumber = `HHC-INV-${year}-${String(1000 + createdCount + 1).padStart(4, '0')}`;

      // Insert invoice
      const { data: inv, error: invErr } = await db
        .from('invoices')
        .insert({
          invoice_number: invNumber,
          subscriber_id: subscriberId,
          patient_id: masterPatId,
          issue_date: issueDate,
          due_date: dueDate,
          currency: 'PKR',
          exchange_rate_usd: 278.50,
          plan_fee_pkr: planInfo.price,
          excess_medicine_pkr: excessMed,
          lab_charges_pkr: 0,
          discount_pkr: 0,
          tax_pkr: 0,
          total_pkr: totalAmount,
          paid_pkr: 0,
          balance_pkr: totalAmount,
          status: 'sent',
          notes: `Monthly care invoice for ${mp.name}. Period: ${monthId} (${monthLabel})`,
        })
        .select()
        .single();

      if (invErr) {
        console.warn('Error inserting invoice for patient:', mp.name, invErr.message);
        continue;
      }

      // Insert line items
      const lineItems = [
        {
          invoice_id: inv.id,
          description: `${planInfo.name} — Monthly Subscription Fee (${monthLabel})`,
          item_type: 'plan_fee',
          quantity: 1,
          unit_price_pkr: planInfo.price,
          total_price_pkr: planInfo.price,
        },
      ];

      if (excessMed > 0) {
        lineItems.push({
          invoice_id: inv.id,
          description: `Medicine — Excess over plan limit (Rs ${medLimit.toLocaleString()})`,
          item_type: 'excess_medicine',
          quantity: 1,
          unit_price_pkr: excessMed,
          total_price_pkr: excessMed,
        });
      }

      await db.from('invoice_line_items').insert(lineItems);

      // Auto-post double-entry journal entry
      try {
        const jnlLines = [
          {
            account_code: '1110',
            debit_pkr: totalAmount,
            credit_pkr: 0,
            description: `AR — Invoice ${inv.invoice_number}`,
          },
          {
            account_code: '2050',
            debit_pkr: 0,
            credit_pkr: planInfo.price,
            description: `Unearned Revenue — Invoice ${inv.invoice_number}`,
          },
        ];

        if (excessMed > 0) {
          jnlLines.push({
            account_code: '4070',
            debit_pkr: 0,
            credit_pkr: excessMed,
            description: `Medicine Excess Revenue — Invoice ${inv.invoice_number}`,
          });
        }

        await postJournalEntry({
          source_type: 'invoice',
          source_id: inv.id,
          description: `Invoice ${inv.invoice_number} Issued to Subscriber for ${monthLabel}`,
          entry_date: issueDate,
          lines: jnlLines,
        });
      } catch (jnlErr: any) {
        console.warn('Journal entry warning:', jnlErr.message);
      }

      createdCount++;
      totalBilledPkr += totalAmount;
    }

    return NextResponse.json({
      success: true,
      month_id: monthId,
      created_count: createdCount,
      total_billed_pkr: totalBilledPkr,
    });
  } catch (err: any) {
    console.error('Error generating monthly invoices:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
