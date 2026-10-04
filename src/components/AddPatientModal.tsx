'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Edit3,
  ExternalLink,
  Mail,
  MapPin,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { MonthInfo, Package, PatientMonthData } from '@/lib/types';

type PatientWindowMode = 'search' | 'add' | 'edit' | 'delete';
type SearchField = 'name' | 'subscriber' | 'doctor' | 'date' | 'package';

interface AddPatientModalProps {
  isOpen: boolean;
  initialMode?: PatientWindowMode;
  currentMonth: MonthInfo;
  packages: Package[];
  patients?: PatientMonthData[];
  patient?: PatientMonthData | null;
  onClose: () => void;
  onAdd: (
    name: string,
    subscriber: string,
    packageId: number | null,
    patientId?: number,
    extra?: {
      subscriberEmail?: string;
      fatherHusbandName?: string;
      dob?: string;
      gender?: string;
      address?: string;
      googleAddressLocation?: string;
      assignedDoctor?: string;
    }
  ) => void;
  onDelete?: (patientId: number) => void;
}

const searchFields: { value: SearchField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'doctor', label: 'Doctor' },
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

  // Form Fields
  const [name, setName] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [address, setAddress] = useState('');
  const [googleAddressLocation, setGoogleAddressLocation] = useState('');
  const [packageId, setPackageId] = useState<number | null>(null);

  // Doctors list from staff management
  const [doctors, setDoctors] = useState<{ id: string; name: string; staff_id: string }[]>([]);
  const [customDoctor, setCustomDoctor] = useState(false);

  // Search & Feedback States
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setSelectedPatient(patient);
    setSearchValue('');
    setCustomDoctor(false);
    setError('');
    setSuccessMsg('');

    // Fetch active doctors from Staff database
    fetch('/api/staff?designation=doctor&status=active')
      .then((res) => res.json())
      .then((data) => {
        if (data?.staff) {
          setDoctors(data.staff);
        }
      })
      .catch(() => {});
  }, [isOpen, initialMode, patient]);

  useEffect(() => {
    setName(selectedPatient?.name ?? '');
    setFatherHusbandName(selectedPatient?.fatherHusbandName ?? '');
    setDob(selectedPatient?.dob ?? '');
    setGender(selectedPatient?.gender ?? '');
    setSubscriber(selectedPatient?.subscriber ?? '');
    setSubscriberEmail(selectedPatient?.subscriberEmail ?? '');
    setAssignedDoctor(selectedPatient?.assignedDoctor ?? '');
    setAddress(selectedPatient?.address ?? '');
    setGoogleAddressLocation(selectedPatient?.googleAddressLocation ?? '');
    setPackageId(selectedPatient?.packageId ?? null);
  }, [selectedPatient]);

  const packageForPatient = (item: PatientMonthData) => packages.find((pkg) => pkg.id === item.packageId) ?? null;

  const filteredPatients = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) return patients;
    return patients.filter((item) => {
      if (searchField === 'name') {
        return (
          item.name.toLowerCase().includes(normalized) ||
          (item.fatherHusbandName && item.fatherHusbandName.toLowerCase().includes(normalized))
        );
      }
      if (searchField === 'subscriber') {
        return (
          item.subscriber.toLowerCase().includes(normalized) ||
          (item.subscriberEmail && item.subscriberEmail.toLowerCase().includes(normalized))
        );
      }
      if (searchField === 'doctor') {
        return item.assignedDoctor && item.assignedDoctor.toLowerCase().includes(normalized);
      }
      if (searchField === 'package') {
        return packageForPatient(item)?.name.toLowerCase().includes(normalized) ?? false;
      }
      const selectedDay = Number(searchValue.slice(-2));
      return Number.isInteger(selectedDay) && selectedDay > 0 && item.v[selectedDay - 1]?.some((visit) => visit === '✔');
    });
  }, [patients, packages, searchField, searchValue]);

  if (!isOpen) return null;

  const detailPatient = selectedPatient;
  const selectedPackage = detailPatient ? packageForPatient(detailPatient) : null;
  const visitLabels = ['Doctor', 'Nurse + Physio', 'Nurse', 'Physio', 'Psychiatrist', 'SV', 'FV', 'OPD'];
  const title =
    mode === 'add'
      ? 'Add Patient'
      : mode === 'edit'
      ? 'Edit Patient'
      : mode === 'delete'
      ? 'Delete Patient'
      : 'Search Patients';

  const selectPatient = (nextPatient: PatientMonthData) => {
    setSelectedPatient(nextPatient);
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter a patient name.');
      nameInputRef.current?.focus();
      return;
    }
    if (subscriberEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscriberEmail.trim())) {
      setError('Please enter a valid email address for subscriber email.');
      return;
    }

    const savedName = name.trim();
    const targetPatientId = mode === 'edit' ? selectedPatient?.id : undefined;

    await onAdd(savedName, subscriber.trim(), packageId, targetPatientId, {
      subscriberEmail: subscriberEmail.trim(),
      fatherHusbandName: fatherHusbandName.trim(),
      dob: dob.trim(),
      gender: gender.trim(),
      address: address.trim(),
      googleAddressLocation: googleAddressLocation.trim(),
      assignedDoctor: assignedDoctor.trim(),
    });

    setError('');
    if (mode === 'add') {
      setName('');
      setFatherHusbandName('');
      setDob('');
      setGender('');
      setSubscriber('');
      setSubscriberEmail('');
      setAssignedDoctor('');
      setAddress('');
      setGoogleAddressLocation('');
      setPackageId(null);
      setSuccessMsg(`✓ Patient "${savedName}" added successfully.`);
      nameInputRef.current?.focus();
    } else {
      setSuccessMsg(`✓ Patient "${savedName}" updated successfully.`);
    }
  };

  const handleDelete = async () => {
    if (!selectedPatient || !onDelete) return;
    const confirmed = window.confirm(
      `Warning: delete ${selectedPatient.name} from ${currentMonth.label}? All visits for this month will be removed. This cannot be undone.`
    );
    if (confirmed) {
      const deletedName = selectedPatient.name;
      await onDelete(selectedPatient.id);
      setSelectedPatient(null);
      setError('');
      setSuccessMsg(`✓ Patient "${deletedName}" deleted successfully.`);
    }
  };

  const formatMapUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="mbg" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal patient-manager-modal">
        <aside className="patient-manager-sidebar">
          <div className="patient-manager-brand">
            <UserRound size={21} />
            <span>Patient Manager</span>
          </div>
          <p className="patient-manager-month">{currentMonth.label}</p>
          <nav className="patient-manager-nav" aria-label="Patient actions">
            <button className={mode === 'search' ? 'active' : ''} onClick={() => { setMode('search'); setSuccessMsg(''); }}>
              <Search size={16} /> Search patient
            </button>
            <button className={mode === 'add' ? 'active' : ''} onClick={() => { setMode('add'); setSelectedPatient(null); setSuccessMsg(''); }}>
              <Plus size={16} /> Add patient
            </button>
            <button className={mode === 'edit' ? 'active' : ''} onClick={() => { setMode('edit'); setSuccessMsg(''); }}>
              <Edit3 size={16} /> Edit patient
            </button>
            <button className={`${mode === 'delete' ? 'active ' : ''}danger-link`} onClick={() => { setMode('delete'); setSuccessMsg(''); }}>
              <Trash2 size={16} /> Delete patient
            </button>
          </nav>
          <div className="patient-manager-help">
            <ClipboardList size={15} /> Search a patient to view full profile details, then edit or delete.
          </div>
        </aside>

        <section className="patient-manager-content">
          <header className="patient-manager-heading">
            <div>
              <span className="patient-manager-eyebrow">{currentMonth.label}</span>
              <h2>{title}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close patient manager">
              <X size={19} />
            </button>
          </header>

          {successMsg && (
            <div className="patient-manager-alert success">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} aria-label="Dismiss message"><X size={14} /></button>
            </div>
          )}

          {(mode === 'search' || mode === 'edit' || mode === 'delete') && (
            <section className="patient-manager-search-panel">
              <div className="patient-manager-search-row">
                <label>
                  Search by
                  <select value={searchField} onChange={(event) => setSearchField(event.target.value as SearchField)}>
                    {searchFields.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                </label>
                {searchField === 'date' ? (
                  <label className="patient-manager-search-input">
                    Visit date
                    <input
                      type="date"
                      min={`${currentMonth.id}-01`}
                      max={`${currentMonth.id}-${String(currentMonth.daysInMonth).padStart(2, '0')}`}
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                    />
                  </label>
                ) : (
                  <label className="patient-manager-search-input">
                    Search value
                    <input
                      type="search"
                      placeholder={`Search by ${searchField}`}
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      autoFocus
                    />
                  </label>
                )}
                <span className="patient-manager-result-count">
                  {filteredPatients.length} patient{filteredPatients.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="patient-manager-results">
                {filteredPatients.map((item) => {
                  const itemPackage = packageForPatient(item);
                  return (
                    <button
                      key={item.id}
                      className={`patient-manager-result ${selectedPatient?.id === item.id ? 'selected' : ''}`}
                      onClick={() => selectPatient(item)}
                    >
                      <strong>{item.name}</strong>
                      <span>
                        {item.subscriber ? `Sub: ${item.subscriber}` : 'No subscriber'} · {itemPackage?.name || 'No package'}
                      </span>
                      {item.assignedDoctor && (
                        <small className="patient-result-doc">Dr. {item.assignedDoctor}</small>
                      )}
                    </button>
                  );
                })}
                {!filteredPatients.length && (
                  <div className="patient-manager-empty">No patients match this search.</div>
                )}
              </div>
            </section>
          )}

          {mode === 'add' || mode === 'edit' ? (
            <form className="patient-manager-form modern-form" onSubmit={handleSubmit}>
              {/* Group 1: Personal Info */}
              <div className="form-section">
                <div className="form-section-header">
                  <User size={16} />
                  <span>Patient Personal Details</span>
                </div>
                <div className="patient-manager-form-grid">
                  <label>
                    <span className="label-text-wrap">Patient Name <span className="req">*</span></span>
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Ahmed Khan"
                      required
                    />
                  </label>
                  <label>
                    <span className="label-text-wrap">Father / Husband Name</span>
                    <input
                      value={fatherHusbandName}
                      onChange={(event) => setFatherHusbandName(event.target.value)}
                      placeholder="e.g. Mohammad Ali Khan"
                    />
                  </label>
                  <label>
                    <span className="label-text-wrap">Date of Birth</span>
                    <input
                      type="date"
                      value={dob}
                      onChange={(event) => setDob(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="label-text-wrap">Gender</span>
                    <select value={gender} onChange={(event) => setGender(event.target.value)}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Group 2: Subscriber & Care Team */}
              <div className="form-section">
                <div className="form-section-header">
                  <UserCheck size={16} />
                  <span>Subscriber &amp; Care Details</span>
                </div>
                <div className="patient-manager-form-grid">
                  <label>
                    <span className="label-text-wrap">Subscriber Name</span>
                    <input
                      value={subscriber}
                      onChange={(event) => setSubscriber(event.target.value)}
                      placeholder="Family member or sponsor name"
                    />
                  </label>
                  <label className="sub-email-label">
                    <span className="label-text-wrap"><Mail size={13} /> Subscriber Email</span>
                    <input
                      type="email"
                      value={subscriberEmail}
                      onChange={(event) => setSubscriberEmail(event.target.value)}
                      placeholder="subscriber@example.com"
                    />
                  </label>
                  <label>
                    <span className="label-text-wrap"><Stethoscope size={13} /> Assigned Doctor</span>
                    {doctors.length > 0 ? (
                      <select
                        value={customDoctor ? '__OTHER__' : assignedDoctor}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (val === '__OTHER__') {
                            setCustomDoctor(true);
                            setAssignedDoctor('');
                          } else {
                            setCustomDoctor(false);
                            setAssignedDoctor(val);
                          }
                        }}
                      >
                        <option value="">-- Select Doctor --</option>
                        {doctors.map((d) => {
                          const docName = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                          return (
                            <option key={d.id} value={docName}>
                              {docName} ({d.staff_id})
                            </option>
                          );
                        })}
                        {assignedDoctor && !doctors.some((d) => d.name === assignedDoctor || `Dr. ${d.name}` === assignedDoctor) && !customDoctor && (
                          <option value={assignedDoctor}>{assignedDoctor}</option>
                        )}
                        <option value="__OTHER__">+ Enter Custom Doctor Name</option>
                      </select>
                    ) : (
                      <input
                        value={assignedDoctor}
                        onChange={(event) => setAssignedDoctor(event.target.value)}
                        placeholder="e.g. Dr. Sarah Ahmed"
                      />
                    )}
                    {customDoctor && (
                      <input
                        style={{ marginTop: 6 }}
                        value={assignedDoctor}
                        onChange={(event) => setAssignedDoctor(event.target.value)}
                        placeholder="Enter doctor's full name"
                        autoFocus
                      />
                    )}
                  </label>
                  <label>
                    <span className="label-text-wrap">Assigned Package</span>
                    <select
                      value={packageId ?? ''}
                      onChange={(event) => setPackageId(event.target.value ? Number(event.target.value) : null)}
                    >
                      <option value="">No package</option>
                      {packages.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Group 3: Address & Maps Location */}
              <div className="form-section">
                <div className="form-section-header">
                  <MapPin size={16} />
                  <span>Address &amp; Location Pin</span>
                </div>
                <div className="patient-manager-form-grid full-width-grid">
                  <label className="full-col">
                    <span className="label-text-wrap">Patient Address</span>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="House/Street address, Area, City"
                    />
                  </label>
                  <label className="full-col">
                    <span className="label-text-wrap">Patient Google Address Location / Maps Link</span>
                    <div className="input-with-action">
                      <input
                        type="text"
                        value={googleAddressLocation}
                        onChange={(event) => setGoogleAddressLocation(event.target.value)}
                        placeholder="Paste Google Maps URL or Plus Code / Coordinates"
                      />
                      {googleAddressLocation.trim() && (
                        <a
                          href={formatMapUrl(googleAddressLocation)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-map-preview"
                          title="Open location on Google Maps"
                        >
                          <ExternalLink size={13} /> Open Map
                        </a>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {error && <div className="patient-manager-error">{error}</div>}

              <div className="mfoot">
                <button type="button" className="btn sec" onClick={onClose}>
                  <X size={14} /> Close
                </button>
                <button type="submit" className="btn btn-save">
                  <Check size={14} /> {mode === 'edit' ? 'Save changes' : 'Add patient'}
                </button>
              </div>
            </form>
          ) : detailPatient ? (
            <section className="patient-detail-panel modern-detail-panel">
              <div className="patient-detail-header">
                <div>
                  <span className="patient-manager-eyebrow">Patient Profile</span>
                  <h3>{detailPatient.name}</h3>
                  {detailPatient.fatherHusbandName && (
                    <p className="patient-subhead">s/o or w/o: {detailPatient.fatherHusbandName}</p>
                  )}
                </div>
                <span className="patient-detail-id">Patient #{detailPatient.id}</span>
              </div>

              <div className="patient-detail-grid multi-grid">
                <div>
                  <span>Gender</span>
                  <strong>{detailPatient.gender || '—'}</strong>
                </div>
                <div>
                  <span>Date of Birth</span>
                  <strong>{detailPatient.dob || '—'}</strong>
                </div>
                <div>
                  <span>Subscriber</span>
                  <strong>{detailPatient.subscriber || '—'}</strong>
                </div>
                <div>
                  <span>Subscriber Email</span>
                  <strong className="email-text">{detailPatient.subscriberEmail || '—'}</strong>
                </div>
                <div>
                  <span>Assigned Doctor</span>
                  <strong>{detailPatient.assignedDoctor ? `Dr. ${detailPatient.assignedDoctor}` : '—'}</strong>
                </div>
                <div>
                  <span>Package</span>
                  <strong>{selectedPackage?.name || '—'}</strong>
                </div>
                <div>
                  <span>Package Price</span>
                  <strong>{selectedPackage ? `PKR ${selectedPackage.price.toLocaleString()}` : '—'}</strong>
                </div>
                <div>
                  <span>Medicine Given</span>
                  <strong>{detailPatient.medGiven || 0}</strong>
                </div>
              </div>

              {(detailPatient.address || detailPatient.googleAddressLocation) && (
                <div className="patient-location-card">
                  <div className="card-title"><MapPin size={15} /> Address &amp; Location</div>
                  {detailPatient.address && <p className="patient-address-text">{detailPatient.address}</p>}
                  {detailPatient.googleAddressLocation && (
                    <a
                      href={formatMapUrl(detailPatient.googleAddressLocation)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-link-btn"
                    >
                      <ExternalLink size={13} /> View Google Maps Location
                    </a>
                  )}
                </div>
              )}

              <h4>Visit summary</h4>
              <div className="patient-visit-summary">
                {visitLabels.map((label, index) => (
                  <div key={label}>
                    <CalendarDays size={15} />
                    <span>{label}</span>
                    <strong>{getVisitCount(detailPatient, index)} visits</strong>
                  </div>
                ))}
              </div>

              <div className="mfoot">
                <button type="button" className="btn sec" onClick={onClose}>
                  <X size={14} /> Close
                </button>
                {mode !== 'search' && (
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>
                    <Trash2 size={14} /> Confirm delete
                  </button>
                )}
                {mode === 'search' && (
                  <button type="button" className="btn btn-save" onClick={() => setMode('edit')}>
                    <Edit3 size={14} /> Edit details
                  </button>
                )}
              </div>
            </section>
          ) : (
            <div className="patient-manager-empty large">Select a patient from the search results to view details.</div>
          )}
        </section>
      </div>
    </div>
  );
};