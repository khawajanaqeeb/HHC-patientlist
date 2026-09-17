'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Package } from '@/lib/types';
import { UserPlus, X, Check } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  packages: Package[];
  onClose: () => void;
  onAdd: (name: string, subscriber: string, pkgIdx: number) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  packages,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [pkgIdx, setPkgIdx] = useState<number>(-1);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSubscriber('');
      setPkgIdx(-1);
      setError('');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a patient name.');
      nameInputRef.current?.focus();
      return;
    }
    onAdd(name.trim(), subscriber.trim(), pkgIdx);
    onClose();
  };

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(380px, 94vw)' }}>
        <h2>➕ Add New Patient</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              value={pkgIdx}
              onChange={(e) => setPkgIdx(parseInt(e.target.value, 10))}
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
              <option value="-1">— Select —</option>
              {packages.map((pk, i) => (
                <option key={pk.id || i} value={i}>
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
              <Check size={13} /> Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
