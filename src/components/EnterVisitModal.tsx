'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardEdit, X, Check, Save, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Package, PatientMonthData, MonthInfo, DayVisits, VisitValue } from '@/lib/types';
import { DAY_LETTERS, getWeekdayIndex, getDayClass } from '@/lib/calendar';

type SearchField = 'name' | 'date' | 'subscriber' | 'package';

const emptySearchFields: Record<SearchField, boolean> = {
  name: false,
  date: false,
  subscriber: false,
  package: false,
};

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
  const [searchFields, setSearchFields] = useState<Record<SearchField, boolean>>(emptySearchFields);
  const [searchName, setSearchName] = useState('');
  const [searchSubscriber, setSearchSubscriber] = useState('');
  const [searchPackages, setSearchPackages] = useState<number[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [searchResults, setSearchResults] = useState<PatientMonthData[]>([]);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);
  const [subscriber, setSubscriber] = useState<string>('');
  const [packageId, setPackageId] = useState<number | null>(null);
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
      setSearchFields(emptySearchFields);
      setSearchName('');
      setSearchSubscriber('');
      setSearchPackages([]);
      setSearchDate('');
      setSearchResults([]);
      setSearchSubmitted(false);
      setSelectedDay(defaultDay);
      setSaveMsg('');
      if (firstPatient) {
        setSubscriber(firstPatient.subscriber || '');
        setPackageId(firstPatient.packageId);
        setMedGiven(firstPatient.medGiven || 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sync patient details and visits when selected patient changes
  useEffect(() => {
    if (selectedPatientId === null) {
      setSubscriber('');
      setPackageId(null);
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
    setPackageId(patient.packageId);
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
  const dateRange = {
    min: `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-01`,
    max: `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(currentMonth.daysInMonth).padStart(2, '0')}`,
  };
  const subscriberOptions = Array.from(new Set(patients.map((patient) => patient.subscriber.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  const selectedCriteria = (Object.keys(searchFields) as SearchField[]).filter((field) => searchFields[field]);
  const criteriaMissing = selectedCriteria.some((field) => {
    if (field === 'name') return !searchName.trim();
    if (field === 'subscriber') return !searchSubscriber;
    if (field === 'package') return searchPackages.length === 0;
    return !searchDate;
  });
  const filteredPatients = patients;

  const toggleSearchField = (field: SearchField) => {
    setSearchFields((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const toggleSearchPackage = (packageId: number) => {
    setSearchPackages((previous) => previous.includes(packageId)
      ? previous.filter((id) => id !== packageId)
      : [...previous, packageId]
    );
  };

  const searchPatients = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchSubmitted(true);
    if (!selectedCriteria.length || criteriaMissing) {
      setSearchResults([]);
      return;
    }

    const normalizedName = searchName.trim().toLowerCase();
    const selectedDay = searchDate ? Number(searchDate.slice(-2)) : null;
    setSearchResults(patients.filter((patient) => {
      const matchesName = !searchFields.name || patient.name.toLowerCase().includes(normalizedName);
      const matchesSubscriber = !searchFields.subscriber || patient.subscriber === searchSubscriber;
      const matchesPackage = !searchFields.package || (patient.packageId !== null && searchPackages.includes(patient.packageId));
      const matchesDate = !searchFields.date || (selectedDay !== null && patient.v[selectedDay - 1]?.some((visit) => visit === '✔'));
      return matchesName && matchesSubscriber && matchesPackage && matchesDate;
    }));
  };

  const selectPatient = (patientId: number) => {
    setSelectedPatientId(patientId);
    setSearchResults([]);
    setSearchSubmitted(false);
  };
  const currentPkg = packages.find((pkg) => pkg.id === packageId) ?? null;

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
          packageId,
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
          <form className="ev-search-panel" onSubmit={searchPatients}>
            <div className="ev-search-title"><Search size={14} /> Search patients</div>
            <div className="ev-search-criteria" aria-label="Search criteria">
              {(['name', 'date', 'subscriber', 'package'] as SearchField[]).map((field) => (
                <label key={field}>
                  <input type="checkbox" checked={searchFields[field]} onChange={() => toggleSearchField(field)} />
                  {field === 'package' ? 'Package' : field[0].toUpperCase() + field.slice(1)}
                </label>
              ))}
            </div>
            <div className="ev-search-fields">
              {searchFields.name && (
                <input type="search" value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder="Patient name" aria-label="Patient name search" />
              )}
              {searchFields.date && (
                <input type="date" min={dateRange.min} max={dateRange.max} value={searchDate} onChange={(event) => setSearchDate(event.target.value)} aria-label="Visit date search" />
              )}
              {searchFields.subscriber && (
                <select value={searchSubscriber} onChange={(event) => setSearchSubscriber(event.target.value)} aria-label="Subscriber search">
                  <option value="">Select subscriber</option>
                  {subscriberOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              )}
              <button className="btn" type="submit"><Search size={13} /> Search</button>
            </div>
            {searchFields.package && (
              <div className="ev-search-packages">
                {packages.map((item) => (
                  <label key={item.id}>
                    <input type="checkbox" checked={searchPackages.includes(item.id)} onChange={() => toggleSearchPackage(item.id)} />
                    {item.name}
                  </label>
                ))}
              </div>
            )}
            {searchSubmitted && !selectedCriteria.length && <p className="ev-search-empty">Select at least one search field.</p>}
            {searchSubmitted && selectedCriteria.length > 0 && criteriaMissing && <p className="ev-search-empty">Enter a value for every selected search field.</p>}
            {searchSubmitted && selectedCriteria.length > 0 && !criteriaMissing && (
              <div className="ev-search-results">
                {searchResults.length > 0 ? searchResults.map((patient) => (
                  <button key={patient.id} type="button" onClick={() => selectPatient(patient.id)}>
                    #{patients.findIndex((item) => item.id === patient.id) + 1} - {patient.name}
                    {patient.subscriber ? ` (${patient.subscriber})` : ''}
                  </button>
                )) : <span>No patients matched the selected criteria.</span>}
              </div>
            )}
          </form>
          <select
            id="ev-patient"
            className="ev-select"
            value={selectedPatientId ?? ''}
            onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
          >
            {filteredPatients.map((p) => {
              const originalIndex = patients.findIndex((patient) => patient.id === p.id);
              return (
              <option key={p.id} value={p.id}>
                #{originalIndex + 1} - {p.name} {p.subscriber ? `(${p.subscriber})` : ''}
              </option>
              );
            })}
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
              value={packageId ?? ''}
              onChange={(e) => setPackageId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="-1">— None / Unassigned —</option>
              {packages.map((pk) => (
                <option key={pk.id} value={pk.id}>
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
