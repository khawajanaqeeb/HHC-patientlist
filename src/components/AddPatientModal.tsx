'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ClipboardList, Edit3, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { MonthInfo, Package, PatientMonthData } from '@/lib/types';

type PatientWindowMode = 'search' | 'add' | 'edit' | 'delete';
type SearchField = 'name' | 'date' | 'subscriber' | 'package';

interface AddPatientModalProps {
  isOpen: boolean;
  initialMode?: PatientWindowMode;
  currentMonth: MonthInfo;
  packages: Package[];
  patients?: PatientMonthData[];
  patient?: PatientMonthData | null;
  onClose: () => void;
  onAdd: (name: string, subscriber: string, packageId: number | null, patientId?: number) => void;
  onDelete?: (patientId: number) => void;
}

const searchFields: { value: SearchField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'date', label: 'Visit date' },
  { value: 'package', label: 'Package' },
];

const getVisitCount = (patient: PatientMonthData, index: number) =>
  patient.v.reduce((total, day) => total + (day[index] === '✔' ? 1 : 0), 0);

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  initialMode = 'add',
  currentMonth,
  packages,
  patients = [],
  patient = null,
  onClose,
  onAdd,
  onDelete,
}) => {
  const [mode, setMode] = useState<PatientWindowMode>(initialMode);
  const [selectedPatient, setSelectedPatient] = useState<PatientMonthData | null>(patient);
  const [name, setName] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [packageId, setPackageId] = useState<number | null>(null);
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setSelectedPatient(patient);
    setSearchValue('');
    setError('');
  }, [isOpen, initialMode, patient]);

  useEffect(() => {
    setName(selectedPatient?.name ?? '');
    setSubscriber(selectedPatient?.subscriber ?? '');
    setPackageId(selectedPatient?.packageId ?? null);
  }, [selectedPatient]);

  const packageForPatient = (item: PatientMonthData) => packages.find((pkg) => pkg.id === item.packageId) ?? null;

  const filteredPatients = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) return patients;
    return patients.filter((item) => {
      if (searchField === 'name') return item.name.toLowerCase().includes(normalized);
      if (searchField === 'subscriber') return item.subscriber.toLowerCase().includes(normalized);
      if (searchField === 'package') return packageForPatient(item)?.name.toLowerCase().includes(normalized) ?? false;
      const selectedDay = Number(searchValue.slice(-2));
      return Number.isInteger(selectedDay) && selectedDay > 0 && item.v[selectedDay - 1]?.some((visit) => visit === '✔');
    });
  }, [patients, packages, searchField, searchValue]);

  if (!isOpen) return null;

  const detailPatient = selectedPatient;
  const selectedPackage = detailPatient ? packageForPatient(detailPatient) : null;
  const visitLabels = ['Doctor', 'Nurse + Physio', 'Nurse', 'Physio', 'Psychiatrist'];
  const title = mode === 'add' ? 'Add Patient' : mode === 'edit' ? 'Edit Patient' : mode === 'delete' ? 'Delete Patient' : 'Search Patients';

  const selectPatient = (nextPatient: PatientMonthData) => {
    setSelectedPatient(nextPatient);
    setError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter a patient name.');
      nameInputRef.current?.focus();
      return;
    }
    onAdd(name.trim(), subscriber.trim(), packageId, mode === 'edit' ? selectedPatient?.id : undefined);
    onClose();
  };

  const handleDelete = () => {
    if (!selectedPatient || !onDelete) return;
    const confirmed = window.confirm(`Warning: delete ${selectedPatient.name} from ${currentMonth.label}? All visits for this month will be removed. This cannot be undone.`);
    if (confirmed) onDelete(selectedPatient.id);
  };

  return (
    <div className="mbg" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal patient-manager-modal">
        <aside className="patient-manager-sidebar">
          <div className="patient-manager-brand"><UserRound size={21} /><span>Patient Manager</span></div>
          <p className="patient-manager-month">{currentMonth.label}</p>
          <nav className="patient-manager-nav" aria-label="Patient actions">
            <button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}><Search size={16} /> Search patient</button>
            <button className={mode === 'add' ? 'active' : ''} onClick={() => { setMode('add'); setSelectedPatient(null); }}><Plus size={16} /> Add patient</button>
            <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}><Edit3 size={16} /> Edit patient</button>
            <button className={`${mode === 'delete' ? 'active ' : ''}danger-link`} onClick={() => setMode('delete')}><Trash2 size={16} /> Delete patient</button>
          </nav>
          <div className="patient-manager-help"><ClipboardList size={15} /> Search a patient to view all details, then choose edit or delete.</div>
        </aside>

        <section className="patient-manager-content">
          <header className="patient-manager-heading">
            <div><span className="patient-manager-eyebrow">{currentMonth.label}</span><h2>{title}</h2></div>
            <button className="icon-btn" onClick={onClose} aria-label="Close patient manager"><X size={19} /></button>
          </header>

          {(mode === 'search' || mode === 'edit' || mode === 'delete') && (
            <section className="patient-manager-search-panel">
              <div className="patient-manager-search-row">
                <label>Search by<select value={searchField} onChange={(event) => setSearchField(event.target.value as SearchField)}>{searchFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label>
                {searchField === 'date' ? <label className="patient-manager-search-input">Visit date<input type="date" min={`${currentMonth.id}-01`} max={`${currentMonth.id}-${String(currentMonth.daysInMonth).padStart(2, '0')}`} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} /></label> : <label className="patient-manager-search-input">Search value<input type="search" placeholder={`Search by ${searchField}`} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} autoFocus /></label>}
                <span className="patient-manager-result-count">{filteredPatients.length} patient{filteredPatients.length === 1 ? '' : 's'}</span>
              </div>
              <div className="patient-manager-results">
                {filteredPatients.map((item) => { const itemPackage = packageForPatient(item); return <button key={item.id} className={`patient-manager-result ${selectedPatient?.id === item.id ? 'selected' : ''}`} onClick={() => selectPatient(item)}><strong>{item.name}</strong><span>{item.subscriber || 'No subscriber'} · {itemPackage?.name || 'No package'}</span></button>; })}
                {!filteredPatients.length && <div className="patient-manager-empty">No patients match this search.</div>}
              </div>
            </section>
          )}

          {mode === 'add' || mode === 'edit' ? (
            <form className="patient-manager-form" onSubmit={handleSubmit}>
              <div className="patient-manager-form-grid">
                <label>Patient name<input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ahmed Khan" /></label>
                <label>Subscriber<input value={subscriber} onChange={(event) => setSubscriber(event.target.value)} placeholder="Family member or organization" /></label>
                <label>Package<select value={packageId ?? ''} onChange={(event) => setPackageId(event.target.value ? Number(event.target.value) : null)}><option value="">No package</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              </div>
              {error && <div className="patient-manager-error">{error}</div>}
              <div className="mfoot"><button type="button" className="btn sec" onClick={onClose}><X size={14} /> Close</button><button type="submit" className="btn btn-save"><Check size={14} /> {mode === 'edit' ? 'Save changes' : 'Add patient'}</button></div>
            </form>
          ) : detailPatient ? (
            <section className="patient-detail-panel">
              <div className="patient-detail-header"><div><span className="patient-manager-eyebrow">Selected patient</span><h3>{detailPatient.name}</h3></div><span className="patient-detail-id">Patient #{detailPatient.id}</span></div>
              <div className="patient-detail-grid"><div><span>Subscriber</span><strong>{detailPatient.subscriber || '—'}</strong></div><div><span>Package</span><strong>{selectedPackage?.name || '—'}</strong></div><div><span>Package price</span><strong>{selectedPackage ? `PKR ${selectedPackage.price.toLocaleString()}` : '—'}</strong></div><div><span>Medicine given</span><strong>{detailPatient.medGiven || 0}</strong></div></div>
              <h4>Visit summary</h4>
              <div className="patient-visit-summary">{visitLabels.map((label, index) => <div key={label}><CalendarDays size={15} /><span>{label}</span><strong>{getVisitCount(detailPatient, index)} visits</strong></div>)}</div>
              <div className="mfoot"><button type="button" className="btn sec" onClick={onClose}><X size={14} /> Close</button>{mode !== 'search' && <button type="button" className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Confirm delete</button>}{mode === 'search' && <button type="button" className="btn btn-save" onClick={() => setMode('edit')}><Edit3 size={14} /> Edit details</button>}</div>
            </section>
          ) : <div className="patient-manager-empty large">Select a patient from the search results to view details.</div>}
        </section>
      </div>
    </div>
  );
};