'use client';

import React, { useEffect, useState } from 'react';
import { Search, X, Printer } from 'lucide-react';
import { MonthInfo, Package, PatientMonthData } from '@/lib/types';
import { printHtml } from '@/lib/print';

type SearchField = 'name' | 'date' | 'subscriber' | 'package';

interface PatientSearchModalProps {
  isOpen: boolean;
  currentMonth: MonthInfo;
  packages: Package[];
  patients: PatientMonthData[];
  currency: 'PKR' | 'USD';
  usdToPkrRate: number;
  onClose: () => void;
}

const emptyFields: Record<SearchField, boolean> = {
  name: false,
  date: false,
  subscriber: false,
  package: false,
};

const getMonthDateRange = (month: MonthInfo) => ({
  min: `${month.year}-${String(month.month).padStart(2, '0')}-01`,
  max: `${month.year}-${String(month.month).padStart(2, '0')}-${String(month.daysInMonth).padStart(2, '0')}`,
});

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({
  isOpen,
  currentMonth,
  packages,
  patients,
  currency,
  usdToPkrRate,
  onClose,
}) => {
  const [fields, setFields] = useState<Record<SearchField, boolean>>(emptyFields);
  const [name, setName] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
  const [date, setDate] = useState('');
  const [results, setResults] = useState<PatientMonthData[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFields(emptyFields);
      setName('');
      setSubscriber('');
      setSelectedPackages([]);
      setDate('');
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const dateRange = getMonthDateRange(currentMonth);
  const selectedCriteria = (Object.keys(fields) as SearchField[]).filter((field) => fields[field]);
  const subscriberOptions = Array.from(
    new Set(patients.map((patient) => patient.subscriber.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const toggleField = (field: SearchField) => {
    setFields((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const togglePackage = (packageId: number) => {
    setSelectedPackages((previous) => previous.includes(packageId)
      ? previous.filter((id) => id !== packageId)
      : [...previous, packageId]
    );
  };

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setSearched(true);

    if (!selectedCriteria.length) {
      setResults([]);
      return;
    }

    const normalizedName = name.trim().toLowerCase();
    const selectedDay = date ? Number(date.slice(-2)) : null;

    setResults(
      patients.filter((patient) => {
        const patientPackage = packages.find((pkg) => pkg.id === patient.packageId)?.name || '';
        const matchesName = !fields.name || (normalizedName.length > 0 && patient.name.toLowerCase().includes(normalizedName));
        const matchesSubscriber = !fields.subscriber || (subscriber.length > 0 && patient.subscriber === subscriber);
        const matchesPackage = !fields.package || (patient.packageId !== null && selectedPackages.includes(patient.packageId));
        const matchesDate = !fields.date || (selectedDay !== null && patient.v[selectedDay - 1]?.some((visit) => visit === '✔'));

        return matchesName && matchesSubscriber && matchesPackage && matchesDate;
      })
    );
  };

  const criteriaMissing = selectedCriteria.some((field) => {
    if (field === 'name') return !name.trim();
    if (field === 'subscriber') return !subscriber;
    if (field === 'package') return selectedPackages.length === 0;
    return !date;
  });

  const printResults = () => {
    const table = document.querySelector('.patient-search-modal .patient-search-table');
    if (!table) return;
    printHtml('Patient Search Results', `<h1>Patient Search Results</h1><p class="meta">${currentMonth.label} · ${results.length} matching patient${results.length === 1 ? '' : 's'}</p>${table.outerHTML}`);
  };

  return (
    <div className="mbg" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal patient-search-modal">
        <div className="patient-search-heading">
          <div>
            <h2><Search size={17} /> Search Patients</h2>
            <p>Choose one or more fields. Selected fields are matched together.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close patient search"><X size={16} /></button>
        </div>

        <form onSubmit={search}>
          <div className="search-criteria-list" aria-label="Search criteria">
            {(['name', 'date', 'subscriber', 'package'] as SearchField[]).map((field) => (
              <label className="search-criterion" key={field}>
                <input type="checkbox" checked={fields[field]} onChange={() => toggleField(field)} />
                <span>{field === 'package' ? 'Package' : field[0].toUpperCase() + field.slice(1)}</span>
              </label>
            ))}
          </div>

          <div className="patient-search-form search-fields-form">
            {fields.name && (
              <label htmlFor="patient-search-name">Name
                <input id="patient-search-name" type="search" value={name} onChange={(event) => setName(event.target.value)} placeholder="Patient name" autoFocus />
              </label>
            )}
            {fields.date && (
              <label htmlFor="patient-search-date">Visit date
                <input id="patient-search-date" type="date" min={dateRange.min} max={dateRange.max} value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            )}
            {fields.subscriber && (
              <label htmlFor="patient-search-subscriber">Subscriber
                <select id="patient-search-subscriber" value={subscriber} onChange={(event) => setSubscriber(event.target.value)}>
                  <option value="">Select subscriber</option>
                  {subscriberOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
            {fields.package && (
              <fieldset className="search-package-fieldset">
                <legend>Package</legend>
                <div className="search-package-options">
                  {packages.length > 0 ? packages.map((item) => (
                    <label className="search-package-option" key={item.id}>
                      <input type="checkbox" checked={selectedPackages.includes(item.id)} onChange={() => togglePackage(item.id)} />
                      <span>{item.name}</span>
                    </label>
                  )) : <span className="search-empty-option">No packages available</span>}
                </div>
              </fieldset>
            )}
            <button className="btn" type="submit">Search</button>
          </div>
        </form>

        {searched && !selectedCriteria.length && <div className="patient-search-message">Select at least one search field.</div>}
        {searched && selectedCriteria.length > 0 && criteriaMissing && <div className="patient-search-message">Enter a value for every selected search field.</div>}
        {searched && selectedCriteria.length > 0 && !criteriaMissing && (
          <>
            <div className="patient-search-meta">{results.length} matching patient{results.length === 1 ? '' : 's'} in {currentMonth.label}</div>
            {results.length > 0 ? (
              <div className="patient-search-table-wrap">
                <table className="patient-search-table">
                  <thead><tr><th>S.No</th><th>Patient</th><th>Subscriber</th><th>Package</th><th>Price</th></tr></thead>
                  <tbody>
                    {results.map((patient, resultIndex) => {
                      const patientPackageRecord = packages.find((pkg) => pkg.id === patient.packageId);
                      const patientPackage = patientPackageRecord?.name || '—';
                      const packagePrice = patientPackageRecord ? patientPackageRecord.price || 0 : null;
                      return (
                        <tr key={patient.id}>
                          <td>{resultIndex + 1}</td>
                          <td>{patient.name}</td>
                          <td>{patient.subscriber || '—'}</td>
                          <td>{patientPackage}</td>
                          <td>{packagePrice === null ? '—' : new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency,
                            maximumFractionDigits: currency === 'USD' ? 2 : 0,
                          }).format(currency === 'USD' ? packagePrice / usdToPkrRate : packagePrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="patient-search-message">No patients matched the selected criteria.</div>}
          </>
        )}

        <div className="mfoot">
          {results.length > 0 && <button type="button" className="btn sec print-search-btn" onClick={printResults}><Printer size={13} /> Print results</button>}
          <button type="button" className="btn sec" onClick={onClose}><X size={13} /> Close</button>
        </div>
      </div>
    </div>
  );
};