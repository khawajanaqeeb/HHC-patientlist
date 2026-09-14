'use client';

import React, { useEffect, useRef } from 'react';
import { VisitValue } from '@/lib/types';
import { Check, X, Minus, Eraser } from 'lucide-react';

export interface ActiveCellContext {
  patientIndex: number;
  patientName: string;
  dayIndex: number; // 0-based
  dayNumber: number; // 1-based
  dayLetter: string;
  typeIndex: 0 | 1 | 2 | 3; // 0=Doc, 1=Nur+Phy, 2=Phy, 3=Psy
  typeLabel: string;
  typeColor: string;
  anchorX: number;
  anchorY: number;
}

interface VisitDropdownProps {
  context: ActiveCellContext | null;
  onSelect: (value: VisitValue) => void;
  onClose: () => void;
}

export const VisitDropdown: React.FC<VisitDropdownProps> = ({
  context,
  onSelect,
  onClose,
}) => {
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!context || !ddRef.current) return;

    let top = context.anchorY + 8;
    let left = context.anchorX - 8;

    const width = 190;
    const height = 210;

    if (top + height > window.innerHeight) {
      top = Math.max(10, context.anchorY - height);
    }
    if (left + width > window.innerWidth) {
      left = Math.max(10, window.innerWidth - width - 10);
    }

    ddRef.current.style.top = `${top}px`;
    ddRef.current.style.left = `${left}px`;
    ddRef.current.style.display = 'block';
  }, [context]);

  if (!context) return null;

  const firstName = context.patientName.split(' ')[0];

  return (
    <>
      <div className="ov" onClick={onClose} />
      <div className="dd" ref={ddRef} style={{ display: 'none' }}>
        <div className="dd-hd">
          Day {context.dayNumber} ({context.dayLetter}) · {firstName} · {context.typeLabel}
        </div>
        <div className="ddi" onClick={() => onSelect('✔')}>
          <span className="ico" style={{ color: context.typeColor, fontWeight: 900 }}>
            ✔
          </span>
          <span>Visited</span>
        </div>
        <div className="ddi" onClick={() => onSelect('✖')}>
          <span className="ico" style={{ color: 'var(--can-fg)', fontWeight: 900 }}>
            ✖
          </span>
          <span>Cancelled</span>
        </div>
        <div className="dd-sep" />
        <div className="ddi" onClick={() => onSelect('—')}>
          <span className="ico" style={{ color: '#bbb', fontWeight: 900 }}>
            —
          </span>
          <span>No Visit</span>
        </div>
        <div className="dd-sep" />
        <div className="ddi clr" onClick={() => onSelect('')}>
          <span className="ico">⬜</span>
          <span>Clear</span>
        </div>
      </div>
    </>
  );
};
