'use client';

import React, { useRef } from 'react';
import { Search, Package2, UserPlus, Printer, ClipboardEdit, Download, Upload, RotateCcw } from 'lucide-react';

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onOpenPackages: () => void;
  onOpenAddPatient: () => void;
  onOpenEnterVisit: () => void;
  onPrint: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  saveStatus: string;
  saveStatusColor: string;
}

export default function ControlBar({
  searchQuery,
  onSearchChange,
  onOpenPackages,
  onOpenAddPatient,
  onOpenEnterVisit,
  onPrint,
  onExport,
  onImport,
  onReset,
  saveStatus,
  saveStatusColor,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

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
        Patient Management
      </button>

      <button className="btn btn-primary" onClick={onPrint}>
        <Printer size={13} />
        Print
      </button>

      {/* Data Operations */}
      <button className="btn sec" onClick={onExport} title="Export month data as JSON">
        <Download size={13} />
        Export
      </button>

      <button className="btn sec" onClick={handleImportClick} title="Import data from JSON backup">
        <Upload size={13} />
        Import
      </button>

      <button className="btn sec" onClick={onReset} title="Reset all visits for this month">
        <RotateCcw size={13} />
        Reset
      </button>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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