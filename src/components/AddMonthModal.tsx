'use client';

import React, { useState, useEffect } from 'react';
import { MonthInfo } from '@/lib/types';
import { MONTH_NAMES } from '@/lib/calendar';
import { X, Check, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';

interface AddMonthModalProps {
  isOpen: boolean;
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  onClose: () => void;
  onCreateMonth: (year: number, month: number, carryOverFrom?: string) => void;
  onSelectMonth?: (monthId: string) => void;
  onOpenInNewWindow?: (monthId: string) => void;
}

export const AddMonthModal: React.FC<AddMonthModalProps> = ({
  isOpen,
  currentMonth,
  availableMonths,
  onClose,
  onCreateMonth,
  onSelectMonth,
  onOpenInNewWindow,
}) => {
  const [year, setYear] = useState<number>(currentMonth.year);
  const [month, setMonth] = useState<number>(currentMonth.month);
  const [carryOver, setCarryOver] = useState<boolean>(true);
  const [carryOverFrom, setCarryOverFrom] = useState<string>(currentMonth.id);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const sorted = [...availableMonths].sort((a, b) => a.id.localeCompare(b.id));
      const latest = sorted.length > 0 ? sorted[sorted.length - 1] : currentMonth;
      let nextY = latest.year;
      let nextM = latest.month + 1;
      if (nextM > 12) {
        nextM = 1;
        nextY++;
      }
      setYear(nextY);
      setMonth(nextM);
      setCarryOver(true);
      setCarryOverFrom(currentMonth.id || (sorted.length > 0 ? sorted[sorted.length - 1].id : ''));
      setError('');
    }
  }, [isOpen, availableMonths, currentMonth]);

  if (!isOpen) return null;

  const targetMonthId = `${year}-${String(month).padStart(2, '0')}`;
  const alreadyExists = availableMonths.some((m) => m.id === targetMonthId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyExists) {
      if (onSelectMonth) {
        onSelectMonth(targetMonthId);
        onClose();
      }
      return;
    }

    onCreateMonth(year, month, carryOver ? carryOverFrom : undefined);
    onClose();
  };

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(460px, 94vw)' }}>
        <h2>📅 Add Upcoming Month</h2>
        <p style={{ fontSize: '0.72rem', color: '#666', marginBottom: '14px' }}>
          Create a new monthly visit sheet with automatic day/week calendar generation.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  padding: '7px 9px',
                  fontSize: '0.78rem',
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
                  padding: '7px 9px',
                  fontSize: '0.78rem',
                  outline: 'none',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </div>
          </div>

          {alreadyExists ? (
            <div
              style={{
                background: '#e0f2fe',
                border: '1.5px solid #38bdf8',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 700, fontSize: '0.78rem' }}>
                <AlertCircle size={16} />
                <span>{MONTH_NAMES[month - 1]} {year} already exists!</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#0c4a6e', margin: 0 }}>
                This monthly visit sheet is already created in your system. You can switch to it or open it in a separate window side-by-side.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                {onSelectMonth && (
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#0284c7', fontSize: '0.74rem', padding: '5px 10px' }}
                    onClick={() => {
                      onSelectMonth(targetMonthId);
                      onClose();
                    }}
                  >
                    <ArrowRight size={13} /> Switch to {MONTH_NAMES[month - 1]}
                  </button>
                )}
                {onOpenInNewWindow && (
                  <button
                    type="button"
                    className="btn sec"
                    style={{ background: '#0369a1', fontSize: '0.74rem', padding: '5px 10px' }}
                    onClick={() => {
                      onOpenInNewWindow(targetMonthId);
                      onClose();
                    }}
                  >
                    <ExternalLink size={13} /> Open in New Window
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--blue-pale)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--teal-lt)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--teal)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={carryOver}
                  onChange={(e) => setCarryOver(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Carry over patient list &amp; packages
              </label>

              {carryOver && availableMonths.length > 0 && (
                <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                  <label style={{ fontSize: '0.69rem', fontWeight: 600, color: '#444', display: 'block', marginBottom: '3px' }}>
                    Copy patients &amp; packages from:
                  </label>
                  <select
                    value={carryOverFrom}
                    onChange={(e) => setCarryOverFrom(e.target.value)}
                    style={{
                      border: '1px solid var(--teal-lt)',
                      borderRadius: '5px',
                      padding: '4px 8px',
                      fontSize: '0.73rem',
                      color: 'var(--teal)',
                      fontWeight: 600,
                      background: '#fff',
                    }}
                  >
                    {availableMonths.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p style={{ fontSize: '0.68rem', color: '#555', marginTop: '6px', paddingLeft: '24px', lineHeight: 1.4 }}>
                Transfers all patient names, subscribers, and package assignments. All visits will start empty ready for data entry.
              </p>
            </div>
          )}

          {error && (
            <div style={{ fontSize: '0.72rem', color: 'var(--can-fg)', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div className="mfoot">
            <button type="button" className="btn sec" onClick={onClose}>
              <X size={13} /> Cancel
            </button>
            {!alreadyExists && (
              <button type="submit" className="btn" style={{ background: '#27ae60' }}>
                <Check size={13} /> Create Month
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
