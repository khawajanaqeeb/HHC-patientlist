'use client';

import { PlusCircle, LogOut, Menu, Calendar, ExternalLink, ChevronDown } from 'lucide-react';
import { MonthInfo } from '@/lib/types';

interface Props {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  patientCount: number;
  onSelectMonth: (id: string) => void;
  onOpenAddMonth: () => void;
  onOpenInNewWindow?: (id: string) => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export default function TitleBar({
  currentMonth,
  availableMonths,
  patientCount,
  onSelectMonth,
  onOpenAddMonth,
  onOpenInNewWindow,
  onLogout,
  onToggleSidebar,
}: Props) {
  return (
    <div className="title-bar">
      <div className="title-left">
        {onToggleSidebar && (
          <button
            className="burger-menu-btn"
            onClick={onToggleSidebar}
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h1>
          <img src="/logo.png" alt="Human Healthcare" className="app-logo" />
          <span className="title-text">{currentMonth.label || 'Patient Visit Sheet'} — Patient Visit Sheet</span>
        </h1>
      </div>

      <p className="title-sub">
        Human Healthcare (HHC) · Monthly Tracking Record · {patientCount} patient{patientCount !== 1 ? 's' : ''}
      </p>

      <div className="month-nav-container">
        {availableMonths.length > 0 && (
          <div className="month-select-wrapper" title="Select active month">
            <Calendar size={13} className="month-select-icon" />
            <select
              className="month-select"
              value={currentMonth.id}
              onChange={(e) => onSelectMonth(e.target.value)}
              aria-label="Select month"
            >
              {availableMonths.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="month-select-arrow" />
          </div>
        )}

        {onOpenInNewWindow && (
          <button
            className="btn-open-window"
            onClick={() => onOpenInNewWindow(currentMonth.id)}
            title={`Open ${currentMonth.label} in a separate window`}
          >
            <ExternalLink size={13} />
            <span>New Window</span>
          </button>
        )}

        <button className="btn-add-month" onClick={onOpenAddMonth} title="Add upcoming month">
          <PlusCircle size={13} />
          <span>Add Month</span>
        </button>

        {onLogout && (
          <button className="btn-logout" onClick={onLogout} title="Log out of admin session">
            <LogOut size={13} /> <span>Log Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
