'use client';

import { Calendar, PlusCircle } from 'lucide-react';
import { MonthInfo } from '@/lib/types';

interface Props {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  patientCount: number;
  onSelectMonth: (id: string) => void;
  onOpenAddMonth: () => void;
}

export default function TitleBar({ currentMonth, availableMonths, patientCount, onSelectMonth, onOpenAddMonth }: Props) {
  return (
    <div className="title-bar">
      <h1>
        <img src="/logo.png" alt="Human Healthcare" className="app-logo" />
        {currentMonth.label} — Patient Visit Sheet
      </h1>
      <p>Human Healthcare (HHC) · Monthly Tracking Record · {patientCount} patient{patientCount !== 1 ? 's' : ''}</p>

      <div className="month-nav-container">
        <button className="btn-add-month" onClick={onOpenAddMonth}>
          <PlusCircle size={13} />
          Add Month
        </button>
      </div>
    </div>
  );
}
