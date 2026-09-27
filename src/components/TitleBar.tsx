'use client';

import { PlusCircle, LogOut, Menu } from 'lucide-react';
import { MonthInfo } from '@/lib/types';

interface Props {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  patientCount: number;
  onSelectMonth: (id: string) => void;
  onOpenAddMonth: () => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export default function TitleBar({
  currentMonth,
  patientCount,
  onOpenAddMonth,
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
        <button className="btn-add-month" onClick={onOpenAddMonth}>
          <PlusCircle size={13} />
          Add Month
        </button>
        {onLogout && (
          <button className="btn-logout" onClick={onLogout} title="Log out of admin session">
            <LogOut size={13} /> Log Out
          </button>
        )}
      </div>
    </div>
  );
}
