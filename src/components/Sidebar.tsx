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
  PanelLeftOpen,
  PanelLeftClose,
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
  // Sidebar rail: collapsed (icon-only) by default on landing
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  // When sidebar is icon-only, clicking an icon directly fires the action
  const iconAction = (fn: () => void) => {
    if (!sidebarOpen) fn();
  };

  const primaryActions = [
    {
      label: 'Enter Visit Data',
      icon: <ClipboardEdit size={16} />,
      onClick: onOpenEnterVisit,
      highlight: true,
      title: 'Enter Visit Data',
    },
    {
      label: 'Register Patient',
      icon: <UserPlus size={16} />,
      onClick: onOpenAddPatient,
      title: 'Register Patient',
    },
    {
      label: 'Packages',
      icon: <Package2 size={16} />,
      onClick: onOpenPackages,
      title: 'Packages',
    },
    {
      label: 'Print Sheet',
      icon: <Printer size={16} />,
      onClick: onPrint,
      title: 'Print Sheet',
    },
  ];

  const isOpen = sidebarOpen;

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-expanded' : ' sidebar-collapsed'}`}>

      {/* ── Toggle button ── */}
      <button
        className="sidebar-toggle"
        onClick={() => { setSidebarOpen((v) => !v); setResetConfirm(false); }}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* ── Patient Management Tab ── */}
      <button
        className={`sidebar-tab${expanded && isOpen ? ' active' : ''}`}
        onClick={() => {
          if (!isOpen) {
            setSidebarOpen(true);
            setExpanded(true);
          } else {
            setExpanded((v) => !v);
          }
        }}
        title="Patient Management"
        aria-expanded={isOpen ? expanded : undefined}
      >
        <span className="sidebar-tab-icon"><Users size={16} /></span>
        {isOpen && (
          <>
            <span className="sidebar-tab-label">Patient Management</span>
            <span className="sidebar-tab-chevron">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </>
        )}
      </button>

      {/* ── Primary sub-actions (only when sidebar open) ── */}
      {isOpen && (
        <div className={`sidebar-sub ${expanded ? 'open' : ''}`}>
          {primaryActions.map((a) => (
            <button
              key={a.label}
              className={`sidebar-action${a.highlight ? ' highlight' : ''}`}
              onClick={a.onClick}
              title={a.title}
            >
              <span className="sidebar-action-icon">{a.icon}</span>
              <span className="sidebar-action-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Icon-only quick actions when collapsed */}
      {!isOpen && (
        <div className="icon-only-actions">
          {primaryActions.map((a) => (
            <button
              key={a.label}
              className={`icon-only-btn${a.highlight ? ' highlight' : ''}`}
              onClick={() => iconAction(a.onClick)}
              title={a.title}
            >
              {a.icon}
            </button>
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="sidebar-divider" />

      {/* ── Data Operations Tab ── */}
      <button
        className={`sidebar-tab data-ops-tab${dataOpsOpen && isOpen ? ' active' : ''}`}
        onClick={() => {
          if (!isOpen) {
            setSidebarOpen(true);
            setDataOpsOpen(true);
          } else {
            setDataOpsOpen((v) => !v);
            setResetConfirm(false);
          }
        }}
        title="Data Operations"
        aria-expanded={isOpen ? dataOpsOpen : undefined}
      >
        <span className="sidebar-tab-icon ops-icon"><ShieldAlert size={15} /></span>
        {isOpen && (
          <>
            <span className="sidebar-tab-label">Data Operations</span>
            <span className="sidebar-tab-chevron">
              {dataOpsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </>
        )}
      </button>

      {/* Data ops sub-panel (expanded sidebar only) */}
      {isOpen && (
        <div className={`sidebar-sub ${dataOpsOpen ? 'open' : ''}`}>
          <button className="sidebar-action ops-export" onClick={onExport} title="Export month data as JSON backup">
            <span className="sidebar-action-icon"><Download size={15} /></span>
            <span className="sidebar-action-label">Export Data</span>
          </button>

          <button className="sidebar-action ops-import" onClick={handleImportClick} title="Import data from JSON — overwrites current data">
            <span className="sidebar-action-icon"><Upload size={15} /></span>
            <span className="sidebar-action-label">Import Data</span>
          </button>

          {!resetConfirm ? (
            <button className="sidebar-action ops-reset" onClick={handleResetClick} title="Reset all visits for this month">
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
                <button className="reset-btn-confirm" onClick={handleResetClick}>Yes, Reset</button>
                <button className="reset-btn-cancel" onClick={cancelReset}>
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Icon-only data ops when collapsed */}
      {!isOpen && (
        <div className="icon-only-actions">
          <button className="icon-only-btn ops-export-icon" onClick={() => iconAction(onExport)} title="Export Data">
            <Download size={15} />
          </button>
          <button className="icon-only-btn ops-import-icon" onClick={() => iconAction(handleImportClick)} title="Import Data">
            <Upload size={15} />
          </button>
          <button className="icon-only-btn ops-reset-icon" onClick={() => iconAction(onReset)} title="Reset Month">
            <RotateCcw size={15} />
          </button>
        </div>
      )}

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
