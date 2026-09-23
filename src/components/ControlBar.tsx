'use client';

import React from 'react';
import { Search, Package2, UserPlus, ListFilter, Printer, ClipboardEdit } from 'lucide-react';

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onOpenPackages: () => void;
  onOpenAddPatient: () => void;
  onOpenPatientSearch: () => void;
  onOpenEnterVisit: () => void;
  onPrint: () => void;
  saveStatus: string;
  saveStatusColor: string;
}

export default function ControlBar({
  searchQuery,
  onSearchChange,
  onOpenPackages,
  onOpenAddPatient,
  onOpenPatientSearch,
  onOpenEnterVisit,
  onPrint,
  saveStatus,
  saveStatusColor,
}: Props) {
  return (
    <div className="ctrl">
      {/* Search */}
      <div className="search-box">
        <Search size={13} />
        <input
          type="text"
          placeholder="Search patient…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" onClick={onOpenPatientSearch}>
        <ListFilter size={13} />
        Search Patients
      </button>

      {/* Enter Visit Data — primary action */}
      <button className="btn btn-enter-visit" onClick={onOpenEnterVisit}>
        <ClipboardEdit size={13} />
        Enter Visit Data
      </button>

      {/* Primary Actions */}
      <button className="btn btn-primary" onClick={onOpenPackages}>
        <Package2 size={13} />
        Packages
      </button>

      <button className="btn btn-primary" onClick={onOpenAddPatient}>
        <UserPlus size={13} />
        Add Patient
      </button>

      <button className="btn btn-primary" onClick={onPrint}>
        <Printer size={13} />
        Print
      </button>

      {/* Save status message */}
      {saveStatus && (
        <span className="save-status" style={{ color: saveStatusColor }}>
          {saveStatus}
        </span>
      )}

      {/* Legend */}
      <div className="legend">
        <span className="leg"><span className="leg-sq" style={{ background: '#c8e6c9' }} />Doctor</span>
        <span className="leg"><span className="leg-sq" style={{ background: '#bbdefb' }} />Nurse+Physio</span>
        <span className="leg"><span className="leg-sq" style={{ background: '#e1bee7' }} />Psychiatrist</span>
        <span className="leg"><span className="leg-sq" style={{ background: '#ffcdd2' }} />Cancelled</span>
      </div>
    </div>
  );
}
