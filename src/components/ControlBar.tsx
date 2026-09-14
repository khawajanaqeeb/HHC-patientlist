'use client';

import React from 'react';
import { Search, Package2, UserPlus, Save, CalendarSearch } from 'lucide-react';

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onOpenPackages: () => void;
  onOpenAddPatient: () => void;
  onOpenPatientVisitedSearch: () => void;
  onSave?: () => void;
  saveStatus: string;
  saveStatusColor: string;
}

export default function ControlBar({
  searchQuery,
  onSearchChange,
  onOpenPackages,
  onOpenAddPatient,
  onOpenPatientVisitedSearch,
  onSave,
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

      {/* Primary Actions */}
      <button className="btn btn-primary" onClick={onOpenPackages}>
        <Package2 size={13} />
        Packages
      </button>

      <button className="btn btn-primary" onClick={onOpenAddPatient}>
        <UserPlus size={13} />
        Add Patient
      </button>

      <button className="btn btn-primary" onClick={onOpenPatientVisitedSearch}>
        <CalendarSearch size={13} />
        Patient Visited Search
      </button>

      {/* Save Button */}
      <button className="btn btn-save" onClick={onSave}>
        <Save size={13} />
        Save
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
