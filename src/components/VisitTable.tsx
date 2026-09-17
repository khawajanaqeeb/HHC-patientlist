'use client';

import React from 'react';
import { Package, PatientMonthData, MonthInfo, VisitValue } from '@/lib/types';
import {
  DAY_LETTERS,
  getWeekdayIndex,
  getDayClass,
  getWeeksForMonth,
} from '@/lib/calendar';

interface VisitTableProps {
  currentMonth: MonthInfo;
  packages: Package[];
  patients: PatientMonthData[];
  currency: 'PKR' | 'USD';
  usdToPkrRate: number;
  searchQuery: string;
  sortColumn: 'sno' | 'name' | 'subscriber' | 'pkg' | null;
  sortDirection: 1 | -1;
  onSort: (col: 'sno' | 'name' | 'subscriber' | 'pkg') => void;
  onCurrencyChange: (currency: 'PKR' | 'USD') => void;
  onUpdatePatientPackage: (patientId: number, pkgIdx: number) => void;
    onUpdatePatientSubscriber: (patientId: number, subscriber: string) => void;
  onUpdatePatientMedicine: (patientId: number, medGiven: number) => void;
  onOpenDropdown: (
    patientIndex: number,
    patientName: string,
    dayIndex: number,
    dayNumber: number,
    dayLetter: string,
    typeIndex: 0 | 1 | 2 | 3 | 4,
    typeLabel: string,
    typeColor: string,
    clientX: number,
    clientY: number
  ) => void;
}

export const VisitTable: React.FC<VisitTableProps> = ({
  currentMonth,
  packages,
  patients,
  currency,
  usdToPkrRate,
  searchQuery,
  sortColumn,
  sortDirection,
  onSort,
  onCurrencyChange,
  onUpdatePatientPackage,
    onUpdatePatientSubscriber,
  onUpdatePatientMedicine,
  onOpenDropdown,
}) => {
  const weeks = getWeeksForMonth(currentMonth.daysInMonth);
  const fixedLeftCols = 18;
  const totalDayCols = currentMonth.daysInMonth * 5;
  const grandTotalCols = fixedLeftCols + totalDayCols;

  // Filter & Sort
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (!sortColumn) return 0;
    if (sortColumn === 'sno') {
      return sortDirection * (a.id - b.id);
    }
    if (sortColumn === 'name') {
      return sortDirection * (a.name.localeCompare(b.name) || a.id - b.id);
    }
    if (sortColumn === 'subscriber') {
      return sortDirection * (a.subscriber.localeCompare(b.subscriber) || a.id - b.id);
    }
    if (sortColumn === 'pkg') {
      const pa = a.pkgIdx >= 0 && packages[a.pkgIdx] ? packages[a.pkgIdx].name : '';
      const pb = b.pkgIdx >= 0 && packages[b.pkgIdx] ? packages[b.pkgIdx].name : '';
      return sortDirection * (pa.localeCompare(pb) || a.id - b.id);
    }
    return 0;
  });

  // Calculate patient stats
  const getStats = (p: PatientMonthData) => {
    const pkg = p.pkgIdx >= 0 && packages[p.pkgIdx] ? packages[p.pkgIdx] : null;
    const nursePhysioAllocation = pkg ? Number(pkg.nurPhy ?? pkg.nur ?? 0) : null;
    const nurseAllocation = pkg ? Number(pkg.nur ?? 0) : null;
    const physioAllocation = pkg ? Number(pkg.phy ?? 0) : null;
    let docDone = 0;
    let nurDone = 0;
    let nurseDone = 0;
    let phyDone = 0;
    let psyDone = 0;

    p.v.forEach((dayV) => {
      if (dayV && dayV[0] === '✔') docDone++;
      if (dayV && dayV[1] === '✔') nurDone++;
      if (dayV && dayV[2] === '✔') nurseDone++;
      if (dayV && dayV[3] === '✔') phyDone++;
      if (dayV && dayV[4] === '✔') psyDone++;
    });

    return {
      dAlloc: pkg ? Number(pkg.doc ?? 0) : null,
      dDone: docDone,
      dRem: pkg ? Number(pkg.doc ?? 0) - docDone : null,
      npAlloc: nursePhysioAllocation,
      npDone: nurDone,
      npRem: nursePhysioAllocation === null ? null : nursePhysioAllocation - nurDone,
      nAlloc: nurseAllocation,
      nRem: nurseAllocation === null ? null : nurseAllocation - nurseDone,
      phyAlloc: physioAllocation,
      phyRem: physioAllocation === null ? null : physioAllocation - phyDone,
      pAlloc: pkg ? Number(pkg.psy ?? 0) : null,
      pDone: psyDone,
      pRem: pkg ? Number(pkg.psy ?? 0) - psyDone : null,
      medAlloc: pkg ? Number(pkg.med ?? 0) : null,
    };
  };

  const getSortIcon = (col: 'sno' | 'name' | 'subscriber' | 'pkg') => {
    if (sortColumn !== col) return '⇅';
    return sortDirection === 1 ? '▲' : '▼';
  };

  return (
    <div className="wrap">
      <div className="frozen-patient-heading" aria-hidden="true">
        <div className="frozen-sno-heading">
          <button className="sb" onClick={() => onSort('sno')} tabIndex={-1}>
            S.No
          </button>
        </div>
        <div className="frozen-name-heading">
          <button className="sb" onClick={() => onSort('name')} tabIndex={-1}>
            Name <span>{getSortIcon('name')}</span>
          </button>
        </div>
      </div>
      <table>
        <thead>
          {/* Row 1: Group labels */}
          <tr className="rGrp">
            <th rowSpan={4} className="sticky-sno" style={{ width: '28px' }}>
              <button className="sb" onClick={() => onSort('sno')}>
                S.No <span>{getSortIcon('sno')}</span>
              </button>
            </th>
            <th rowSpan={4} className="sticky-name" style={{ minWidth: '150px' }}>
              <button className="sb" onClick={() => onSort('name')}>
                Name <span>{getSortIcon('name')}</span>
              </button>
            </th>
            <th rowSpan={4} style={{ minWidth: '130px', width: '130px' }}>
              <button className="sb" onClick={() => onSort('subscriber')}>
                Subscriber <span>{getSortIcon('subscriber')}</span>
              </button>
            </th>
            <th rowSpan={4} style={{ minWidth: '96px', width: '96px' }}>
              <button className="sb" onClick={() => onSort('pkg')}>
                Package <span>{getSortIcon('pkg')}</span>
              </button>
            </th>
            <th rowSpan={4} className="pkg-price-th" style={{ minWidth: '78px', fontSize: '0.7rem' }}>
              <label className="price-currency-label" htmlFor="price-currency">
                Price
                <select
                  id="price-currency"
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value as 'PKR' | 'USD')}
                  aria-label="Select price currency"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">Dollar</option>
                </select>
              </label>
            </th>
            <th colSpan={5} className="tot" style={{ fontSize: '0.72rem' }}>
              Total
            </th>
            <th colSpan={5} className="rem" style={{ fontSize: '0.72rem' }}>
              Remaining
            </th>
            <th colSpan={3} className="med" style={{ fontSize: '0.72rem' }}>
              Medicines (Rs.)
            </th>

            {weeks.map((w, wi) => (
              <th
                key={w.lbl}
                colSpan={w.days.length * 4}
                className={`wk ${wi > 0 ? 'wk-start' : ''}`}
              >
                {w.lbl}
              </th>
            ))}
          </tr>

          {/* Row 3: Sub-labels & Date numbers */}
          <tr className="rSub">
            <th className="doc" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Doctor
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Nur+Phy
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px', background: '#e1f5fe' }}>
              Nurse
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px', background: '#e0f2f1' }}>
              Physio
            </th>
            <th className="psy" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Psycho
            </th>

            <th className="doc" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Doctor
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Nur+Phy
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px', background: '#e1f5fe' }}>
              Nurse
            </th>
            <th className="nur" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px', background: '#e0f2f1' }}>
              Physio
            </th>
            <th className="psy" rowSpan={3} style={{ fontSize: '0.62rem', minWidth: '38px' }}>
              Psycho
            </th>

            <th className="med" rowSpan={3} style={{ fontSize: '0.6rem', width: '34px', minWidth: '34px' }}>
              Total
            </th>
            <th className="med" rowSpan={3} style={{ fontSize: '0.6rem', width: '52px', minWidth: '52px' }}>
              Given
            </th>
            <th className="med" rowSpan={3} style={{ fontSize: '0.6rem', minWidth: '42px' }}>
              Rem/Extra
            </th>

            {weeks.map((w, wi) =>
              w.days.map((d, di) => {
                const boundary = wi > 0 && di === 0 ? 'wk-start' : '';
                const dayClass = getDayClass(currentMonth.year, currentMonth.month, d);
                return (
                  <th
                    key={`d-${d}`}
                    colSpan={5}
                    className={`date ${dayClass} ${boundary}`}
                    style={{ fontWeight: 700, fontSize: '0.67rem' }}
                  >
                    {d}
                  </th>
                );
              })
            )}
          </tr>

          {/* Row 4: Day letters */}
          <tr className="rDay">
            {weeks.map((w, wi) =>
              w.days.map((d, di) => {
                const boundary = wi > 0 && di === 0 ? 'wk-start' : '';
                const wd = getWeekdayIndex(currentMonth.year, currentMonth.month, d);
                const dayClass = getDayClass(currentMonth.year, currentMonth.month, d);
                return (
                  <th
                    key={`dl-${d}`}
                    colSpan={5}
                    className={`${dayClass} ${boundary}`}
                  >
                    {DAY_LETTERS[wd]}
                  </th>
                );
              })
            )}
          </tr>

          {/* Row 5: Column care types (D, N+Phy, Nurse, Phy, Ps) */}
          <tr className="rType">
            {weeks.map((w, wi) =>
              w.days.map((d, di) => {
                const boundary = wi > 0 && di === 0 ? 'wk-start' : '';
                const s = getDayClass(currentMonth.year, currentMonth.month, d);
                return (
                  <React.Fragment key={`dt-${d}`}>
                    <th className={`td ${s ? s : ''} ${boundary}`}>D</th>
                    <th className={`tn ${s ? s : ''}`}>N+Phy</th>
                    <th className={`tn ${s ? s : ''}`}>Nurse</th>
                    <th className={`tn ${s ? s : ''}`}>Phy</th>
                    <th className={`tp ${s ? s : ''}`}>Ps</th>
                  </React.Fragment>
                );
              })
            )}
          </tr>
        </thead>

        <tbody>
          {sortedPatients.map((p, rowIndex) => {
            const originalIndex = patients.findIndex((pat) => pat.id === p.id);
            const pkg = p.pkgIdx >= 0 && packages[p.pkgIdx] ? packages[p.pkgIdx] : null;
            const s = getStats(p);
            const medDiff = s.medAlloc !== null ? s.medAlloc - (p.medGiven || 0) : null;

            return (
              <tr key={p.id}>
                <td className="sno sticky-sno">{rowIndex + 1}</td>
                <td className="name sticky-name">{p.name}</td>
                <td className="subscriber-cell">
                  <input
                    type="text"
                    value={p.subscriber}
                    aria-label={`Subscriber for ${p.name}`}
                    onChange={(e) => onUpdatePatientSubscriber(p.id, e.target.value)}
                  />
                </td>

                {/* Package dropdown */}
                <td className="pkg">
                  <div className="package-select-wrap">
                    <span className="package-selected-label">
                      {pkg ? pkg.name : '— Select —'}
                    </span>
                    <select
                      value={p.pkgIdx}
                      aria-label={`Package for ${p.name}`}
                      onChange={(e) => onUpdatePatientPackage(p.id, parseInt(e.target.value, 10))}
                    >
                      <option value="-1">— Select —</option>
                      {packages.map((pk, i) => (
                        <option key={pk.id || i} value={i}>
                          {pk.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Price */}
                <td className="pkg-price-cell">
                  {pkg
                    ? new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency,
                        maximumFractionDigits: currency === 'USD' ? 2 : 0,
                      }).format(currency === 'USD' ? (pkg.price || 0) / usdToPkrRate : pkg.price || 0)
                    : '—'}
                </td>

                {/* Total columns */}
                <td className="tot-doc">{s.dAlloc === null ? '—' : s.dAlloc}</td>
                <td className="tot-nur">{s.npAlloc === null ? '—' : s.npAlloc}</td>
                <td className="tot-nur" style={{ background: '#e1f5fe' }}>{s.nAlloc === null ? '—' : s.nAlloc}</td>
                <td className="tot-nur" style={{ background: '#e0f2f1' }}>{s.phyAlloc === null ? '—' : s.phyAlloc}</td>
                <td className="tot-psy">{s.pAlloc === null ? '—' : s.pAlloc}</td>

                {/* Remaining columns */}
                <td
                  className="rem-doc"
                  style={{
                    background:
                      s.dRem !== null
                        ? s.dRem <= 0
                          ? '#f5cba7'
                          : s.dRem <= 2
                          ? '#fff9c4'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {s.dRem === null ? '—' : s.dRem}
                </td>
                <td
                  className="rem-nur"
                  style={{
                    background:
                      s.npRem !== null
                        ? s.npRem <= 0
                          ? '#f5cba7'
                          : s.npRem <= 2
                          ? '#fff9c4'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {s.npRem === null ? '—' : s.npRem}
                </td>
                <td
                  className="rem-nur"
                  style={{
                    background:
                      s.nRem !== null
                        ? s.nRem <= 0
                          ? '#f5cba7'
                          : s.nRem <= 2
                          ? '#fff9c4'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {s.nRem === null ? '—' : s.nRem}
                </td>
                <td
                  className="rem-nur"
                  style={{
                    background:
                      s.phyRem !== null
                        ? s.phyRem <= 0
                          ? '#f5cba7'
                          : s.phyRem <= 2
                          ? '#fff9c4'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {s.phyRem === null ? '—' : s.phyRem}
                </td>
                <td
                  className="rem-psy"
                  style={{
                    background:
                      s.pRem !== null
                        ? s.pRem <= 0
                          ? '#f5cba7'
                          : s.pRem <= 2
                          ? '#fff9c4'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {s.pRem === null ? '—' : s.pRem}
                </td>

                {/* Medicine Total, Given, Rem */}
                <td className="med-total">{s.medAlloc === null ? '—' : s.medAlloc}</td>
                <td className="med-input">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={p.medGiven || 0}
                    onChange={(e) =>
                      onUpdatePatientMedicine(p.id, Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                  />
                </td>
                <td
                  className="med-rem"
                  style={{
                    color: medDiff !== null ? (medDiff < 0 ? '#B71C1C' : '#1B5E20') : undefined,
                    background:
                      medDiff !== null
                        ? medDiff < 0
                          ? 'var(--rem-zero)'
                          : 'var(--rem-ok)'
                        : undefined,
                  }}
                >
                  {medDiff === null ? '—' : medDiff}
                </td>

                {/* Visit cells (Weeks -> Days -> D, N, Ps) */}
                {weeks.map((w, wi) =>
                  w.days.map((d, di) => {
                    const dayIdx = d - 1;
                    const dc = getDayClass(currentMonth.year, currentMonth.month, d);
                    const wd = getWeekdayIndex(currentMonth.year, currentMonth.month, d);
                    const dayLetter = DAY_LETTERS[wd];
                    const boundary = wi > 0 && di === 0 ? 'wk-start' : '';

                    const cellValues = p.v[dayIdx] || ['', '', '', '', ''];
                    const TYPE_LABELS = ['Doctor', 'Nurse+Physio', 'Nurse', 'Physio', 'Psychiatrist'];
                    const TYPE_COLORS = ['var(--doc-fg)', 'var(--nur-fg)', 'var(--nur-fg)', 'var(--nur-fg)', 'var(--psy-fg)'];
                    const TYPE_CLASSES = ['vd', 'vn', 'vn', 'vn', 'vp'];

                    return (
                      <React.Fragment key={`v-${p.id}-${d}`}>
                        {[0, 1, 2, 3, 4].map((t) => {
                          const val = cellValues[t as 0 | 1 | 2 | 3 | 4] || '';
                          const isBoundary = t === 0 ? boundary : '';
                          const valClass =
                            val === '✔'
                              ? TYPE_CLASSES[t]
                              : val === '✖'
                              ? 'vx'
                              : '';

                          return (
                            <td
                              key={`c-${t}`}
                              className={`vc ${dc} ${isBoundary} ${valClass}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDropdown(
                                  originalIndex,
                                  p.name,
                                  dayIdx,
                                  d,
                                  dayLetter,
                                  t as 0 | 1 | 2 | 3 | 4,
                                  TYPE_LABELS[t],
                                  TYPE_COLORS[t],
                                  e.clientX,
                                  e.clientY
                                );
                              }}
                            >
                              {val === '✔' && (
                                <span
                                  style={{
                                    color: TYPE_COLORS[t],
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                  }}
                                >
                                  ✔
                                </span>
                              )}
                              {val === '✖' && (
                                <span
                                  style={{
                                    color: 'var(--can-fg)',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                  }}
                                >
                                  ✖
                                </span>
                              )}
                              {val === '—' && (
                                <span style={{ color: '#bbb', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
