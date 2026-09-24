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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const actions = [
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
    {
      label: 'Export Data',
      icon: <Download size={15} />,
      onClick: onExport,
    },
    {
      label: 'Import Data',
      icon: <Upload size={15} />,
      onClick: handleImportClick,
    },
    {
      label: 'Reset Month',
      icon: <RotateCcw size={15} />,
      onClick: onReset,
      danger: true,
    },
  ];

  return (
    <aside className="sidebar">
      {/* ── Main Tab ── */}
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

      {/* ── Sub-actions ── */}
      <div className={`sidebar-sub ${expanded ? 'open' : ''}`}>
        {actions.map((a) => (
          <button
            key={a.label}
            className={`sidebar-action${a.highlight ? ' highlight' : ''}${a.danger ? ' danger' : ''}`}
            onClick={a.onClick}
            title={a.label}
          >
            <span className="sidebar-action-icon">{a.icon}</span>
            <span className="sidebar-action-label">{a.label}</span>
          </button>
        ))}
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
