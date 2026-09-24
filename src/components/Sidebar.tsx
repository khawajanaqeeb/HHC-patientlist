'use client';

import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  ClipboardEdit,
  Package2,
  UserPlus,
  Printer,
  Download,
  Upload,
  RotateCcw,
  ShieldAlert,
  X,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  onOpenAddPatient: () => void;
  onOpenEnterVisit: () => void;
  onPrint: () => void;
  onOpenPackages: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

export default function Sidebar({
  onOpenAddPatient,
  onOpenEnterVisit,
  onPrint,
  onOpenPackages,
  onExport,
  onImport,
  onReset,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [dataOpsOpen, setDataOpsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const handleResetClick = () => {
    if (resetConfirm) {
      setResetConfirm(false);
      onReset();
    } else {
      setResetConfirm(true);
    }
  };

  const cancelReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResetConfirm(false);
  };

  const primaryActions = [
    {
      label: 'Enter Visit Data',
      icon: <ClipboardEdit size={15} />,
      onClick: onOpenEnterVisit,
      highlight: true,
    },
    {
      label: 'Register Patient',
      icon: <UserPlus size={15} />,
      onClick: onOpenAddPatient,
    },
    {
      label: 'Packages',
      icon: <Package2 size={15} />,
      onClick: onOpenPackages,
    },
    {
      label: 'Print Sheet',
      icon: <Printer size={15} />,
      onClick: onPrint,
    },
  ];

  return (
    <aside className="sidebar">
      {/* ── Patient Management Tab ── */}
      <button
        className={`sidebar-tab ${expanded ? 'active' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="sidebar-tab-icon"><Users size={16} /></span>
        <span className="sidebar-tab-label">Patient Management</span>
        <span className="sidebar-tab-chevron">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* ── Primary sub-actions ── */}
      <div className={`sidebar-sub ${expanded ? 'open' : ''}`}>
        {primaryActions.map((a) => (
          <button
            key={a.label}
            className={`sidebar-action${a.highlight ? ' highlight' : ''}`}
            onClick={a.onClick}
            title={a.label}
          >
            <span className="sidebar-action-icon">{a.icon}</span>
            <span className="sidebar-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="sidebar-divider" />

      {/* ── Data Operations Tab ── */}
      <button
        className={`sidebar-tab data-ops-tab ${dataOpsOpen ? 'active' : ''}`}
        onClick={() => { setDataOpsOpen((v) => !v); setResetConfirm(false); }}
        aria-expanded={dataOpsOpen}
        title="Critical data operations — use with care"
      >
        <span className="sidebar-tab-icon ops-icon"><ShieldAlert size={15} /></span>
        <span className="sidebar-tab-label">Data Operations</span>
        <span className="sidebar-tab-chevron">
          {dataOpsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* ── Data ops sub-panel ── */}
      <div className={`sidebar-sub ${dataOpsOpen ? 'open' : ''}`}>

        {/* Export */}
        <button
          className="sidebar-action ops-export"
          onClick={onExport}
          title="Export month data as JSON backup"
        >
          <span className="sidebar-action-icon"><Download size={15} /></span>
          <span className="sidebar-action-label">Export Data</span>
        </button>

        {/* Import */}
        <button
          className="sidebar-action ops-import"
          onClick={handleImportClick}
          title="Import data from JSON — will overwrite current data"
        >
          <span className="sidebar-action-icon"><Upload size={15} /></span>
          <span className="sidebar-action-label">Import Data</span>
        </button>

        {/* Reset — two-step confirm */}
        {!resetConfirm ? (
          <button
            className="sidebar-action ops-reset"
            onClick={handleResetClick}
            title="Reset all visits for this month"
          >
            <span className="sidebar-action-icon"><RotateCcw size={15} /></span>
            <span className="sidebar-action-label">Reset Month</span>
          </button>
        ) : (
          <div className="reset-confirm-box">
            <div className="reset-confirm-header">
              <AlertTriangle size={12} />
              <span>This cannot be undone!</span>
            </div>
            <div className="reset-confirm-btns">
              <button className="reset-btn-confirm" onClick={handleResetClick}>
                Yes, Reset
              </button>
              <button className="reset-btn-cancel" onClick={cancelReset}>
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </aside>
  );
}
