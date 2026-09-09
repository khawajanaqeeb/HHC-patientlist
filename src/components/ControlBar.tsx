'use client';

import { Search, Package2, UserPlus, RotateCcw, Printer, Save, Check, AlertCircle } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  onPackages: () => void;
  onAddPatient: () => void;
  onReset: () => void;
  onPrint: () => void;
  onSave: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export default function ControlBar({
  search, onSearch, onPackages, onAddPatient, onReset, onPrint, onSave, saveStatus
}: Props) {
  return (
    <div className="ctrl">
      {/* Search */}
      <div className="search-box">
        <Search size={13} />
        <input
          type="text"
          placeholder="Search patient…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <button className="btn btn-primary" onClick={onPackages}>
        <Package2 size={13} />
        Packages
      </button>
      <button className="btn btn-primary" onClick={onAddPatient}>
        <UserPlus size={13} />
        Add Patient
      </button>
      <button className="btn btn-danger" onClick={onReset}>
        <RotateCcw size={12} />
        Reset
      </button>
      <button className="btn btn-primary" onClick={onPrint}>
        <Printer size={13} />
        Print
      </button>

      {/* Save */}
      <button
        className={`btn btn-save${saveStatus === 'saving' ? ' saving' : ''}`}
        onClick={onSave}
        disabled={saveStatus === 'saving'}
      >
        <Save size={13} />
        {saveStatus === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {/* Status pill */}
      {saveStatus === 'saved' && (
        <span className="save-status ok">
          <Check size={11} />
          Saved
        </span>
      )}
      {saveStatus === 'error' && (
        <span className="save-status err">
          <AlertCircle size={11} />
          Error
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
