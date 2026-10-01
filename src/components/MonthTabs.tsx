'use client';

import React from 'react';
import { Calendar, Plus, ExternalLink } from 'lucide-react';
import { MonthInfo } from '@/lib/types';

interface MonthTabsProps {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  patientCount: number;
  onSelectMonth: (monthId: string) => void;
  onOpenAddMonth: () => void;
  onOpenInNewWindow: (monthId: string) => void;
}

export const MonthTabs: React.FC<MonthTabsProps> = ({
  currentMonth,
  availableMonths,
  patientCount,
  onSelectMonth,
  onOpenAddMonth,
  onOpenInNewWindow,
}) => {
  return (
    <div className="month-tab-bar">
      <div className="month-tabs-scroll">
        {availableMonths.map((m) => {
          const isActive = m.id === currentMonth.id;
          return (
            <div
              key={m.id}
              className={`month-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMonth(m.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectMonth(m.id);
                }
              }}
              title={`Switch to ${m.label}`}
            >
              <Calendar size={13} className="month-tab-icon" />
              <span className="month-tab-name">{m.label}</span>
              {isActive && (
                <span className="month-tab-badge" title={`${patientCount} patients in this month`}>
                  {patientCount} pts
                </span>
              )}
              <button
                type="button"
                className="month-tab-popout"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInNewWindow(m.id);
                }}
                title={`Open ${m.label} in a separate window`}
                aria-label={`Open ${m.label} in new window`}
              >
                <ExternalLink size={11} />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="month-tab-add"
          onClick={onOpenAddMonth}
          title="Create new monthly sheet"
        >
          <Plus size={13} />
          <span>New Month</span>
        </button>
      </div>

      <div className="month-tabs-actions">
        <button
          type="button"
          className="btn-open-window-pill"
          onClick={() => onOpenInNewWindow(currentMonth.id)}
          title={`Open ${currentMonth.label} in a separate side-by-side window`}
        >
          <ExternalLink size={12} />
          <span>Open in New Window</span>
        </button>
      </div>
    </div>
  );
};
