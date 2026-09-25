'use client';

import React, { useState, useRef } from 'react';
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
  MoreVertical,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dataOpsOpen, setDataOpsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleThreeDotsClick = () => {
    if (!isOpen) {
      setSidebarOpen(true);
      setDataOpsOpen(true);
    } else {
      setDataOpsOpen((v) => !v);
      setResetConfirm(false);
    }
  };

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
              onClick={a.onClick}
              title={a.title}
            >
              {a.icon}
            </button>
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="sidebar-divider" />

      {/* ── More Actions / Data Operations (Three Dots Menu) ── */}
      <button
        className={`sidebar-tab data-ops-tab${dataOpsOpen && isOpen ? ' active' : ''}`}
        onClick={handleThreeDotsClick}
        title="More Actions (Export, Import, Reset)"
        aria-expanded={isOpen ? dataOpsOpen : undefined}
      >
        <span className="sidebar-tab-icon ops-icon"><MoreVertical size={16} /></span>
        {isOpen && (
          <>
            <span className="sidebar-tab-label">More Actions</span>
            <span className="sidebar-tab-chevron">
              {dataOpsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </>
        )}
      </button>

      {/* Data ops sub-panel under three dots (expanded sidebar) */}
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

      {/* Icon-only Three Dots button when collapsed */}
      {!isOpen && (
        <div className="icon-only-actions">
          <button
            className="icon-only-btn ops-icon-btn"
            onClick={handleThreeDotsClick}
            title="More Actions (Export, Import, Reset)"
          >
            <MoreVertical size={16} />
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
