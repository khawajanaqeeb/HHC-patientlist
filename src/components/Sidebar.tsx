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
  BookOpen,
} from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onToggle?: () => void;
  onOpenAddPatient: () => void;
  onOpenEnterVisit: () => void;
  onPrint: () => void;
  onOpenPackages: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

export default function Sidebar({
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
  onOpenAddPatient,
  onOpenEnterVisit,
  onPrint,
  onOpenPackages,
  onExport,
  onImport,
  onReset,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [dataOpsOpen, setDataOpsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const toggleSidebar = () => {
    setResetConfirm(false);
    if (externalOnToggle) {
      externalOnToggle();
    } else {
      setInternalOpen((v) => !v);
    }
  };

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

  const handleAction = (actionFn: () => void) => {
    actionFn();
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if (isOpen) {
        toggleSidebar();
      }
    }
  };

  const patientActions = [
    {
      label: 'Patient Directory',
      icon: <Users size={16} />,
      onClick: () => {
        if (typeof window !== 'undefined') window.location.href = '/patients';
      },
      title: 'View All Patients Directory',
    },
    {
      label: 'Enter Visit Data',
      icon: <ClipboardEdit size={16} />,
      onClick: () => handleAction(onOpenEnterVisit),
      highlight: true,
      title: 'Enter Visit Data',
    },
    {
      label: 'Register Patient',
      icon: <UserPlus size={16} />,
      onClick: () => handleAction(onOpenAddPatient),
      title: 'Register Patient',
    },
    {
      label: 'Plans',
      icon: <Package2 size={16} />,
      onClick: () => handleAction(onOpenPackages),
      title: 'Plans',
    },
    {
      label: 'Print Sheet',
      icon: <Printer size={16} />,
      onClick: () => handleAction(onPrint),
      title: 'Print Sheet',
    },
  ];

  const staffActions = [
    {
      label: 'View All Staff',
      icon: <Users size={16} />,
      onClick: () => {
        if (typeof window !== 'undefined') window.location.href = '/staff';
      },
      title: 'View All Staff Members',
    },
    {
      label: 'Add Staff Member',
      icon: <UserPlus size={16} />,
      onClick: () => {
        if (typeof window !== 'undefined') window.location.href = '/staff/new';
      },
      title: 'Add New Staff Member',
    },
  ];

  const handleThreeDotsClick = () => {
    if (!isOpen) {
      toggleSidebar();
      setDataOpsOpen(true);
    } else {
      setDataOpsOpen((v) => !v);
      setResetConfirm(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar${isOpen ? ' sidebar-expanded' : ' sidebar-collapsed'}`}>
      {/* ── Toggle button ── */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* ── 1. Patient Management Tab ── */}
      <button
        className={`sidebar-tab${expanded && isOpen ? ' active' : ''}`}
        onClick={() => {
          if (!isOpen) {
            toggleSidebar();
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

      {/* Patient sub-actions */}
      {isOpen && (
        <div className={`sidebar-sub ${expanded ? 'open' : ''}`}>
          {patientActions.map((a) => (
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
          {patientActions.map((a) => (
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

      {/* ── 2. Staff Management Tab (Top-Level) ── */}
      <button
        className={`sidebar-tab${staffOpen && isOpen ? ' active' : ''}`}
        style={{ marginTop: 4 }}
        onClick={() => {
          if (!isOpen) {
            toggleSidebar();
            setStaffOpen(true);
          } else {
            setStaffOpen((v) => !v);
          }
        }}
        title="Staff Management"
        aria-expanded={isOpen ? staffOpen : undefined}
      >
        <span className="sidebar-tab-icon"><Users size={16} style={{ color: '#6ee7b7' }} /></span>
        {isOpen && (
          <>
            <span className="sidebar-tab-label">Staff Management</span>
            <span className="sidebar-tab-chevron">
              {staffOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </>
        )}
      </button>

      {/* Staff sub-actions */}
      {isOpen && (
        <div className={`sidebar-sub ${staffOpen ? 'open' : ''}`}>
          {staffActions.map((a) => (
            <button
              key={a.label}
              className="sidebar-action"
              onClick={a.onClick}
              title={a.title}
            >
              <span className="sidebar-action-icon">{a.icon}</span>
              <span className="sidebar-action-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Icon-only button when collapsed for Staff */}
      {!isOpen && (
        <div className="icon-only-actions" style={{ marginTop: 4 }}>
          <button
            className="icon-only-btn"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/staff';
            }}
            title="Staff Management"
            style={{ color: '#6ee7b7' }}
          >
            <Users size={16} />
          </button>
        </div>
      )}

      {/* ── 3. Accounts Tab ── */}
      {isOpen ? (
        <button
          className="sidebar-tab"
          style={{ marginTop: 4 }}
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/accounts';
          }}
          title="Accounts & Finance"
        >
          <span className="sidebar-tab-icon"><BookOpen size={16} style={{ color: '#fbbf24' }} /></span>
          <span className="sidebar-tab-label">Accounts</span>
        </button>
      ) : (
        <div className="icon-only-actions" style={{ marginTop: 4 }}>
          <button
            className="icon-only-btn"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/accounts';
            }}
            title="Accounts & Finance"
            style={{ color: '#fbbf24' }}
          >
            <BookOpen size={16} />
          </button>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="sidebar-divider" />

      {/* ── 3. More Actions / Data Operations ── */}

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
  </>
  );
}
