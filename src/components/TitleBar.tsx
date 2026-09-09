'use client';

import { Calendar, PlusCircle, ChevronDown } from 'lucide-react';
import { Month } from '@/lib/types';

interface Props {
  months: Month[];
  currentMonthId: string;
  onMonthChange: (id: string) => void;
  onAddMonth: () => void;
}

export default function TitleBar({ months, currentMonthId, onMonthChange, onAddMonth }: Props) {
  const current = months.find(m => m.id === currentMonthId);
  const monthLabel = current?.label ?? 'Patient Visit Sheet';

  return (
    <div className="title-bar">
      <h1>
        <Calendar size={20} />
        {monthLabel} — Patient Visit Sheet
      </h1>
      <p>Human Healthcare (HHC) · Monthly Tracking Record</p>

      <div className="month-nav-container">
        <div className="month-select-wrapper">
          <Calendar size={13} color="rgba(255,255,255,0.8)" />
          <select
            className="month-select"
            value={currentMonthId}
            onChange={e => onMonthChange(e.target.value)}
          >
            {months.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={13} color="rgba(255,255,255,0.7)" />
        </div>

        <button className="btn-add-month" onClick={onAddMonth}>
          <PlusCircle size={13} />
          Add Month
        </button>
      </div>
    </div>
  );
}
