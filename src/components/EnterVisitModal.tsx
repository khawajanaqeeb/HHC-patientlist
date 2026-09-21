'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardEdit, X, Check, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Package, PatientMonthData, MonthInfo, DayVisits, VisitValue } from '@/lib/types';
import { DAY_LETTERS, getWeekdayIndex, getDayClass } from '@/lib/calendar';

interface EnterVisitModalProps {
  isOpen: boolean;
  patients: PatientMonthData[];
  packages: Package[];
  currentMonth: MonthInfo;
  onClose: () => void;
  onRefresh: () => void;
}

const VISIT_TYPES: { label: string; short: string; colorClass: string }[] = [
  { label: 'Doctor',       short: 'D',      colorClass: 'ev-doc' },
  { label: 'Nurse+Physio', short: 'N+Phy',  colorClass: 'ev-nur' },
  { label: 'Nurse',        short: 'Nurse',   colorClass: 'ev-nurse' },
  { label: 'Physio',       short: 'Physio',  colorClass: 'ev-phy' },
  { label: 'Psychiatrist', short: 'Psych',   colorClass: 'ev-psy' },
];

const VISIT_CYCLE: VisitValue[] = ['✔', '✖', '—', ''];

function nextValue(current: string): VisitValue {
  const idx = VISIT_CYCLE.indexOf(current as VisitValue);
  return VISIT_CYCLE[(idx + 1) % VISIT_CYCLE.length];
}

export const EnterVisitModal: React.FC<EnterVisitModalProps> = ({
  isOpen,
  patients,
  packages,
  currentMonth,
  onClose,
  onRefresh,
}) => {
  const todayDay = new Date().getDate();
  const todayMonthId = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const defaultDay = currentMonth.id === todayMonthId
    ? Math.min(todayDay, currentMonth.daysInMonth)
    : 1;

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);
  const [subscriber, setSubscriber] = useState<string>('');
  const [pkgIdx, setPkgIdx] = useState<number>(-1);
  const [medGiven, setMedGiven] = useState<number>(0);
  const [visitValues, setVisitValues] = useState<DayVisits>(['', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgColor, setSaveMsgColor] = useState('#2e7d32');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const firstPatient = patients.length > 0 ? patients[0] : null;
      setSelectedPatientId(firstPatient ? firstPatient.id : null);
      setSelectedDay(defaultDay);
      setSaveMsg('');
      if (firstPatient) {
        setSubscriber(firstPatient.subscriber || '');
        setPkgIdx(firstPatient.pkgIdx);
        setMedGiven(firstPatient.medGiven || 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sync patient details and visits when selected patient changes
  useEffect(() => {
    if (selectedPatientId === null) {
      setSubscriber('');
      setPkgIdx(-1);
      setMedGiven(0);
      setVisitValues(['', '', '', '', '']);
      return;
    }
    const patient = patients.find((p) => p.id === selectedPatientId);
    if (!patient) {
      setVisitValues(['', '', '', '', '']);
      return;
    }
    setSubscriber(patient.subscriber || '');
    setPkgIdx(patient.pkgIdx);
    setMedGiven(patient.medGiven || 0);

    const dayIdx = selectedDay - 1;
    const existing = patient.v[dayIdx];
    setVisitValues(existing ? [...existing] as DayVisits : ['', '', '', '', '']);
  }, [selectedPatientId, patients]);

  // Sync visit values when day changes for the current patient
  useEffect(() => {
    if (selectedPatientId === null) {
      setVisitValues(['', '', '', '', '']);
      return;
    }
    const patient = patients.find((p) => p.id === selectedPatientId);
    if (!patient) return;

    const dayIdx = selectedDay - 1;
    const existing = patient.v[dayIdx];
    setVisitValues(existing ? [...existing] as DayVisits : ['', '', '', '', '']);
  }, [selectedDay]);

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const patientIndex = selectedPatient ? patients.findIndex((p) => p.id === selectedPatient.id) : -1;
  const currentPkg = pkgIdx >= 0 && packages[pkgIdx] ? packages[pkgIdx] : null;

  const weekdayIndex = getWeekdayIndex(currentMonth.year, currentMonth.month, selectedDay);
  const dayLetter = DAY_LETTERS[weekdayIndex];
  const dayClass = getDayClass(currentMonth.year, currentMonth.month, selectedDay);

  // Calculate live stats for this patient
  const nursePhysioAllocation = currentPkg ? Number(currentPkg.nurPhy ?? currentPkg.nur ?? 0) : null;
  const nurseAllocation = currentPkg ? Number(currentPkg.nur ?? 0) : null;
  const physioAllocation = currentPkg ? Number(currentPkg.phy ?? 0) : null;
  let docDone = 0;
  let npDone = 0;
  let nDone = 0;
  let phyDone = 0;
  let psyDone = 0;

  if (selectedPatient) {
    selectedPatient.v.forEach((dayV, idx) => {
      // Use currently edited visitValues if on the selected day
      const row = idx === selectedDay - 1 ? visitValues : dayV;
      if (row && row[0] === '✔') docDone++;
      if (row && row[1] === '✔') npDone++;
      if (row && row[2] === '✔') nDone++;
      if (row && row[3] === '✔') phyDone++;
      if (row && row[4] === '✔') psyDone++;
    });
  }

  const dAlloc = currentPkg ? Number(currentPkg.doc ?? 0) : null;
  const pAlloc = currentPkg ? Number(currentPkg.psy ?? 0) : null;
  const medAlloc = currentPkg ? Number(currentPkg.med ?? 0) : null;
  const medDiff = medAlloc !== null ? medAlloc - (medGiven || 0) : null;

  const handleToggleVisit = (typeIndex: number) => {
    setVisitValues((prev) => {
      const updated = [...prev] as DayVisits;
      updated[typeIndex] = nextValue(prev[typeIndex]);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    setSaveMsg('');

    try {
      // Build updated visit array
      const newV: DayVisits[] = selectedPatient.v.map((row, idx) => {
        if (idx === selectedDay - 1) return [...visitValues] as DayVisits;
        return row;
      });
      while (newV.length < currentMonth.daysInMonth) {
        newV.push(['', '', '', '', '']);
      }

      const res = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthId: currentMonth.id,
          subscriber,
          pkgIdx,
          medGiven: Number(medGiven) || 0,
          v: newV,
        }),
      });

      if (!res.ok) throw new Error('Failed to save patient visit data');

      setSaveMsg(`✔ Saved successfully for ${selectedPatient.name}`);
      setSaveMsgColor('#2e7d32');
      onRefresh();
    } catch {
      setSaveMsg('⚠ Save failed. Please try again.');
      setSaveMsgColor('#b71c1c');
    } finally {
      setSaving(false);
    }
  };

  const prevDay = () => setSelectedDay((d) => Math.max(1, d - 1));
  const nextDay = () => setSelectedDay((d) => Math.min(currentMonth.daysInMonth, d + 1));

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal ev-modal">
        {/* Header */}
        <div className="patient-search-heading">
          <div>
            <h2><ClipboardEdit size={17} /> Enter Patient Visit Data</h2>
            <p>Edit patient details (Subscriber, Package, Medicines) and record daily visits.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close enter visit modal">
            <X size={16} />
          </button>
        </div>

        {/* Patient selector */}
        <div className="ev-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="ev-label" htmlFor="ev-patient" style={{ margin: 0 }}>Select Patient</label>
            {patientIndex >= 0 && (
              <span className="ev-meta-pill" style={{ background: 'var(--teal)', color: '#fff' }}>
                S.No #{patientIndex + 1}
              </span>
            )}
          </div>
          <select
            id="ev-patient"
            className="ev-select"
            value={selectedPatientId ?? ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
          >
            {patients.map((p, idx) => (
              <option key={p.id} value={p.id}>
                #{idx + 1} - {p.name} {p.subscriber ? `(${p.subscriber})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Patient Details: Subscriber, Package, Medicine */}
        <div className="ev-section ev-details-grid">
          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-subscriber">Subscriber Name</label>
            <input
              id="ev-subscriber"
              type="text"
              className="ev-input"
              value={subscriber}
              onChange={(e) => setSubscriber(e.target.value)}
              placeholder="e.g. Self, Son, Insurance"
            />
          </div>

          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-package">Assigned Package</label>
            <select
              id="ev-package"
              className="ev-select"
              value={pkgIdx}
              onChange={(e) => setPkgIdx(parseInt(e.target.value, 10))}
            >
              <option value="-1">— None / Unassigned —</option>
              {packages.map((pk, i) => (
                <option key={pk.id || i} value={i}>
                  {pk.name} (PKR {pk.price})
                </option>
              ))}
            </select>
          </div>

          <div className="ev-field">
            <label className="ev-label" htmlFor="ev-med-given">
              Medicine Given (Rs.)
              {medAlloc !== null && (
                <span style={{ fontSize: '0.68rem', color: '#666', marginLeft: '6px', fontWeight: 500 }}>
                  Total: Rs. {medAlloc}
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                id="ev-med-given"
                type="number"
                min="0"
                step="1"
                className="ev-input"
                value={medGiven}
                onChange={(e) => setMedGiven(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: medDiff !== null && medDiff < 0 ? '#ffcdd2' : '#e8f5e9',
                  color: medDiff !== null && medDiff < 0 ? '#b71c1c' : '#1b5e20',
                }}
              >
                {medDiff !== null ? (medDiff < 0 ? `Extra: ${Math.abs(medDiff)}` : `Rem: ${medDiff}`) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Allocation & Remaining Summary */}
        <div className="ev-section ev-summary-section">
          <label className="ev-label">Visit Quota & Progress (Total / Done / Remaining)</label>
          <div className="ev-stats-strip">
            <div className="ev-stat-box">
              <span className="ev-stat-lbl">Doctor</span>
              <span className="ev-stat-val">
                {docDone} / {dAlloc ?? '—'}
              </span>
              <span className={`ev-stat-rem ${dAlloc !== null && (dAlloc - docDone) <= 0 ? 'ev-rem-zero' : ''}`}>
                {dAlloc !== null ? `${dAlloc - docDone} rem` : '—'}
              </span>
            </div>

            <div className="ev-stat-box">
              <span className="ev-stat-lbl">Nur+Phy</span>
              <span className="ev-stat-val">
                {npDone} / {nursePhysioAllocation ?? '—'}
              </span>
              <span className={`ev-stat-rem ${nursePhysioAllocation !== null && (nursePhysioAllocation - npDone) <= 0 ? 'ev-rem-zero' : ''}`}>
                {nursePhysioAllocation !== null ? `${nursePhysioAllocation - npDone} rem` : '—'}
              </span>
            </div>

            <div className="ev-stat-box" style={{ background: '#e1f5fe' }}>
              <span className="ev-stat-lbl">Nurse</span>
              <span className="ev-stat-val">
                {nDone} / {nurseAllocation ?? '—'}
              </span>
              <span className={`ev-stat-rem ${nurseAllocation !== null && (nurseAllocation - nDone) <= 0 ? 'ev-rem-zero' : ''}`}>
                {nurseAllocation !== null ? `${nurseAllocation - nDone} rem` : '—'}
              </span>
            </div>

            <div className="ev-stat-box" style={{ background: '#e0f2f1' }}>
              <span className="ev-stat-lbl">Physio</span>
              <span className="ev-stat-val">
                {phyDone} / {physioAllocation ?? '—'}
              </span>
              <span className={`ev-stat-rem ${physioAllocation !== null && (physioAllocation - phyDone) <= 0 ? 'ev-rem-zero' : ''}`}>
                {physioAllocation !== null ? `${physioAllocation - phyDone} rem` : '—'}
              </span>
            </div>

            <div className="ev-stat-box">
              <span className="ev-stat-lbl">Psycho</span>
              <span className="ev-stat-val">
                {psyDone} / {pAlloc ?? '—'}
              </span>
              <span className={`ev-stat-rem ${pAlloc !== null && (pAlloc - psyDone) <= 0 ? 'ev-rem-zero' : ''}`}>
                {pAlloc !== null ? `${pAlloc - psyDone} rem` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div className="ev-section">
          <label className="ev-label">Visit Date — {currentMonth.label}</label>
          <div className="ev-day-nav">
            <button className="icon-btn" onClick={prevDay} disabled={selectedDay <= 1} aria-label="Previous day">
              <ChevronLeft size={16} />
            </button>
            <div className={`ev-day-badge ${dayClass}`}>
              <span className="ev-day-num">{selectedDay}</span>
              <span className="ev-day-letter">{dayLetter}</span>
            </div>
            <button className="icon-btn" onClick={nextDay} disabled={selectedDay >= currentMonth.daysInMonth} aria-label="Next day">
              <ChevronRight size={16} />
            </button>

            {/* Quick day input */}
            <input
              id="ev-day-input"
              type="number"
              className="ev-day-input"
              min={1}
              max={currentMonth.daysInMonth}
              value={selectedDay}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 1 && v <= currentMonth.daysInMonth) setSelectedDay(v);
              }}
              aria-label="Enter day number"
            />
          </div>
        </div>

        {/* Visit type toggles */}
        <div className="ev-section">
          <label className="ev-label">Daily Care Type Checks for Day {selectedDay}</label>
          <div className="ev-types">
            {VISIT_TYPES.map((type, idx) => {
              const val = visitValues[idx];
              const isVisited = val === '✔';
              const isCancelled = val === '✖';
              const isNoVisit = val === '—';

              return (
                <button
                  key={type.label}
                  className={`ev-type-btn ${type.colorClass} ${isVisited ? 'ev-visited' : ''} ${isCancelled ? 'ev-cancelled' : ''} ${isNoVisit ? 'ev-novisit' : ''}`}
                  onClick={() => handleToggleVisit(idx)}
                  aria-label={`Toggle ${type.label} visit`}
                  title={`${type.label}: click to cycle ✔ Visited → ✖ Cancelled → — No Visit → Clear`}
                >
                  <span className="ev-type-short">{type.short}</span>
                  <span className="ev-type-val">
                    {val === '✔' && <Check size={14} strokeWidth={3} />}
                    {val === '✖' && <span>✖</span>}
                    {val === '—' && <span style={{ color: '#aaa' }}>—</span>}
                    {val === '' && <span className="ev-empty-dot" />}
                  </span>
                  <span className="ev-type-state">
                    {val === '✔' ? 'Visited' : val === '✖' ? 'Cancelled' : val === '—' ? 'No Visit' : 'Not set'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="ev-hint">Click a type to cycle: <strong>Not set → Visited ✔ → Cancelled ✖ → No Visit — → Not set</strong></p>
        </div>

        {/* Footer */}
        <div className="mfoot">
          {saveMsg && (
            <span className="ev-save-msg" style={{ color: saveMsgColor }}>{saveMsg}</span>
          )}
          <button
            className="btn btn-enter-visit"
            onClick={handleSave}
            disabled={saving || !selectedPatient}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save Details & Visits'}
          </button>
          <button className="btn sec" onClick={onClose}>
            <X size={13} /> Close
          </button>
        </div>
      </div>
    </div>
  );
};
