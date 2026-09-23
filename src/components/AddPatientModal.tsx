'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Package, PatientMonthData } from '@/lib/types';
import { UserPlus, X, Check } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  packages: Package[];
  patients?: PatientMonthData[];
  patient?: { id: number; name: string; subscriber: string; packageId: number | null } | null;
  onClose: () => void;
  onAdd: (name: string, subscriber: string, packageId: number | null, patientId?: number) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  packages,
  patients = [],
  patient = null,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [packageId, setPackageId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const applyPatientFields = (nextPatient: { id: number; name: string; subscriber: string; packageId: number | null } | null) => {
    setSelectedPatientId(nextPatient?.id ?? null);
    setName(nextPatient?.name ?? '');
    setSubscriber(nextPatient?.subscriber ?? '');
    setPackageId(nextPatient?.packageId ?? null);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      applyPatientFields(patient);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const isEditing = Boolean(patient || selectedPatientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a patient name.');
      nameInputRef.current?.focus();
      return;
    }
    onAdd(name.trim(), subscriber.trim(), packageId, selectedPatientId ?? patient?.id);
    onClose();
  };

  const handleSelectExistingPatient = (value: string) => {
    const patientId = value ? Number(value) : null;
    if (!patientId) {
      applyPatientFields(null);
      return;
    }

    const existingPatient = patients.find((item) => item.id === patientId) ?? null;
    applyPatientFields(existingPatient ? {
      id: existingPatient.id,
      name: existingPatient.name,
      subscriber: existingPatient.subscriber,
      packageId: existingPatient.packageId,
    } : null);
  };

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(380px, 94vw)' }}>
        <h2>{isEditing ? '✏️ Edit Patient' : '➕ Add New Patient'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {patients.length > 0 && (
            <div>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--teal)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Edit existing patient
              </label>
              <select
                value={selectedPatientId ?? ''}
                onChange={(e) => handleSelectExistingPatient(e.target.value)}
                style={{
                  width: '100%',
                  border: '1.5px solid var(--teal-lt)',
                  borderRadius: '6px',
                  padding: '6px 9px',
                  fontSize: '0.78rem',
                  outline: 'none',
                  background: 'var(--gold-lt)',
                  color: 'var(--teal)',
                  fontWeight: 700,
                }}
              >
                <option value="">Add new patient</option>
                {patients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.subscriber ? ` — ${item.subscriber}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--teal)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Subscriber (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Family member or organization"
              value={subscriber}
              onChange={(e) => setSubscriber(e.target.value)}
              style={{
                width: '100%',
                border: '1.5px solid var(--teal-lt)',
                borderRadius: '6px',
                padding: '6px 9px',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--teal)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Patient Name
            </label>
            <input
              type="text"
              ref={nameInputRef}
              placeholder="e.g. Ahmed Khan"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              style={{
                width: '100%',
                border: '1.5px solid var(--teal-lt)',
                borderRadius: '6px',
                padding: '6px 9px',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--teal)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Package (optional)
            </label>
            <select
              value={packageId ?? ''}
              onChange={(e) => setPackageId(e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '100%',
                border: '1.5px solid var(--teal-lt)',
                borderRadius: '6px',
                padding: '6px 9px',
                fontSize: '0.78rem',
                outline: 'none',
                background: 'var(--gold-lt)',
                color: 'var(--teal)',
                fontWeight: 700,
              }}
            >
              <option value="">— Select —</option>
              {packages.map((pk) => (
                <option key={pk.id} value={pk.id}>
                  {pk.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ fontSize: '0.71rem', color: 'var(--can-fg)', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div className="mfoot">
            <button type="button" className="btn sec" onClick={onClose}>
              <X size={13} /> Cancel
            </button>
            <button type="submit" className="btn">
              <Check size={13} /> {isEditing ? 'Save Changes' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
