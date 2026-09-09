'use client';

import React, { useState } from 'react';
import { MonthInfo } from '@/lib/types';
import { MONTH_NAMES } from '@/lib/calendar';
import { CalendarPlus, X, Check } from 'lucide-react';

interface AddMonthModalProps {
  isOpen: boolean;
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  onClose: () => void;
  onCreateMonth: (year: number, month: number, carryOverFrom?: string) => void;
}

export const AddMonthModal: React.FC<AddMonthModalProps> = ({
  isOpen,
  currentMonth,
  availableMonths,
  onClose,
  onCreateMonth,
}) => {
  // Suggest next logical month
  let nextYear = currentMonth.year;
  let nextMonth = currentMonth.month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  const [year, setYear] = useState<number>(nextYear);
  const [month, setMonth] = useState<number>(nextMonth);
  const [carryOver, setCarryOver] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monthId = `${year}-${month.toString().padStart(2, '0')}`;
    if (availableMonths.some((m) => m.id === monthId)) {
      setError(`Month ${MONTH_NAMES[month - 1]} ${year} already exists.`);
      return;
    }

    onCreateMonth(year, month, carryOver ? currentMonth.id : undefined);
    onClose();
  };

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(420px, 94vw)' }}>
        <h2>📅 Add Upcoming Month</h2>
        <p style={{ fontSize: '0.71rem', color: '#666', marginBottom: '12px' }}>
          Create a new monthly visit sheet with automatic day/week calendar generation.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--teal)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Month
              </label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(parseInt(e.target.value, 10));
                  setError('');
                }}
                style={{
                  width: '100%',
                  border: '1.5px solid var(--teal-lt)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '0.76rem',
                  outline: 'none',
                  fontWeight: 700,
                  color: 'var(--teal)',
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '100px' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--teal)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Year
              </label>
              <input
                type="number"
                min="2020"
                max="2040"
                value={year}
                onChange={(e) => {
                  setYear(parseInt(e.target.value, 10) || 2026);
                  setError('');
                }}
                style={{
                  width: '100%',
                  border: '1.5px solid var(--teal-lt)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '0.76rem',
                  outline: 'none',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--blue-pale)',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--teal-lt)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.73rem',
                fontWeight: 700,
                color: 'var(--teal)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={carryOver}
                onChange={(e) => setCarryOver(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Carry over patient list &amp; packages from {currentMonth.label}
            </label>
            <p style={{ fontSize: '0.67rem', color: '#555', marginTop: '4px', paddingLeft: '23px' }}>
              Transfers all patients with their package allocations, with all visits reset to 0/empty for the new month.
            </p>
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
            <button type="submit" className="btn" style={{ background: '#27ae60' }}>
              <Check size={13} /> Create Month
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
