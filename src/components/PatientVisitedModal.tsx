'use client';

import React, { useEffect, useState } from 'react';
import { CalendarSearch, Check, X, Printer } from 'lucide-react';
import { PatientVisitSearchResult } from '@/lib/types';
import { printHtml } from '@/lib/print';

interface PatientVisitedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export const PatientVisitedModal: React.FC<PatientVisitedModalProps> = ({ isOpen, onClose }) => {
  const [date, setDate] = useState('');
  const [today, setToday] = useState('');
  const [results, setResults] = useState<PatientVisitSearchResult[]>([]);
  const [monthLabel, setMonthLabel] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentDate = getToday();
      setToday(currentDate);
      setDate(currentDate);
      setResults([]);
      setMonthLabel('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (date > today) {
      setMessage('This date is not scheduled yet. Please select today or an earlier date.');
      setResults([]);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/patient-visited?date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not search visits.');
      setResults(data.patients || []);
      setMonthLabel(data.month || '');
      if (!data.patients?.length) setMessage('No patient visits were recorded for this date.');
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : 'Could not search visits.');
    } finally {
      setLoading(false);
    }
  };

  const printResults = () => {
    const table = document.querySelector('.patient-search-modal .patient-search-table');
    if (!table) return;
    printHtml('Patient Visited Search Results', `<h1>Patient Visited Search Results</h1><p class="meta">${monthLabel} · ${results.length} patient${results.length === 1 ? '' : 's'}</p>${table.outerHTML}`);
  };

  return (
    <div className="mbg" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal patient-search-modal">
        <div className="patient-search-heading">
          <div>
            <h2><CalendarSearch size={17} /> Patient Visited Search</h2>
            <p>Select today or a previous date to see recorded visits.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close patient visited search"><X size={16} /></button>
        </div>

        <form className="patient-search-form" onSubmit={search}>
          <label htmlFor="visited-date">Visit date</label>
          <input id="visited-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </form>

        {monthLabel && <div className="patient-search-meta">{monthLabel} · {results.length} patient{results.length === 1 ? '' : 's'}</div>}
        {message && <div className="patient-search-message">{message}</div>}

        {results.length > 0 && (
          <div className="patient-search-table-wrap">
            <table className="patient-search-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Patient</th><th>Subscriber</th><th>Package</th><th>Price</th>
                  <th>Doctor</th><th>Nurse+Physio</th><th>Nurse</th><th>Physio</th><th>Psycho</th>
                  <th>Doctor rem.</th><th>Nurse+Physio rem.</th><th>Nurse rem.</th><th>Physio rem.</th><th>Psycho rem.</th>
                </tr>
              </thead>
              <tbody>
                {results.map((patient, resultIndex) => (
                  <tr key={patient.id}>
                    <td>{resultIndex + 1}</td>
                    <td>{patient.name}</td>
                    <td>{patient.subscriber || '—'}</td>
                    <td>{patient.packageName || '—'}</td>
                    <td>{patient.packagePrice === null ? '—' : patient.packagePrice.toLocaleString()}</td>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <td key={index}>{patient.visited[index as 0 | 1 | 2 | 3 | 4] === '✔' ? <Check size={14} /> : '—'}</td>
                    ))}
                    <td>{patient.remaining.doctor ?? '—'}</td>
                    <td>{patient.remaining.nursePhysio ?? '—'}</td>
                    <td>{patient.remaining.nurse ?? '—'}</td>
                    <td>{patient.remaining.physio ?? '—'}</td>
                    <td>{patient.remaining.psycho ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mfoot">
          {results.length > 0 && <button type="button" className="btn sec print-search-btn" onClick={printResults}><Printer size={13} /> Print results</button>}
          <button type="button" className="btn sec" onClick={onClose}><X size={13} /> Close</button>
        </div>
      </div>
    </div>
  );
};