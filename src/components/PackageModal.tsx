'use client';

import React, { useState, useEffect } from 'react';
import { Package, PatientMonthData } from '@/lib/types';
import { Plus, Trash2, Check, X } from 'lucide-react';

interface PackageModalProps {
  isOpen: boolean;
  packages: Package[];
  patients: PatientMonthData[];
  onClose: () => void;
  onSave: (packages: Package[]) => void;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  packages: initialPackages,
  patients,
  onClose,
  onSave,
}) => {
  const [pkgList, setPkgList] = useState<Package[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPkgList(JSON.parse(JSON.stringify(initialPackages)));
    }
  }, [isOpen, initialPackages]);

  if (!isOpen) return null;

  const handleChange = (index: number, field: keyof Package, value: any) => {
    setPkgList((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: field === 'name' ? value : Math.max(0, parseInt(value, 10) || 0),
      };
      return copy;
    });
  };

  const handleAddRow = () => {
    const nextId = pkgList.length ? Math.max(...pkgList.map((p) => p.id || 0)) + 1 : 1;
    setPkgList((prev) => [
      ...prev,
      {
        id: nextId,
        name: `New Package ${prev.length + 1}`,
        doc: 0,
        nur: 0,
        psy: 0,
        med: 0,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    const pkg = pkgList[index];
    const isUsed = patients.some((p) => p.pkgIdx === index);
    if (
      isUsed &&
      !window.confirm(
        `"${pkg.name}" is assigned to one or more patients. Delete it anyway? Their package assignment will be cleared.`
      )
    ) {
      return;
    }

    setPkgList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(pkgList);
    onClose();
  };

  return (
    <div className="mbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>⚙ Package Definitions</h2>
        <p style={{ fontSize: '0.71rem', color: '#666', marginBottom: '10px' }}>
          Set monthly visit allocations per package. These auto-populate the Total columns when a package is selected for a patient.
        </p>

        <table className="ptbl">
          <thead>
            <tr>
              <th>Package Name</th>
              <th style={{ background: 'var(--doc-fg)' }}>🩺 Doctor</th>
              <th style={{ background: 'var(--nur-fg)' }}>💉 Nurse+Physio</th>
              <th style={{ background: 'var(--psy-fg)' }}>🧠 Psychiatrist</th>
              <th style={{ background: '#E65100' }}>💊 Medicine (Rs.)</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pkgList.map((pkg, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={pkg.name}
                    onChange={(e) => handleChange(i, 'name', e.target.value)}
                    style={{
                      width: '130px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--teal)',
                      border: '1.5px solid var(--teal-lt)',
                      borderRadius: '4px',
                      padding: '2px 5px',
                      fontSize: '0.72rem',
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={pkg.doc}
                    onChange={(e) => handleChange(i, 'doc', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={pkg.nur}
                    onChange={(e) => handleChange(i, 'nur', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={pkg.psy}
                    onChange={(e) => handleChange(i, 'psy', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pkg.med || 0}
                    onChange={(e) => handleChange(i, 'med', e.target.value)}
                    style={{ width: '64px' }}
                  />
                </td>
                <td style={{ fontWeight: 700 }}>{pkg.doc + pkg.nur + pkg.psy}</td>
                <td>
                  <button
                    className="btn sec"
                    style={{ padding: '3px 8px', fontSize: '0.65rem' }}
                    onClick={() => handleDeleteRow(i)}
                    title="Delete Package"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '9px', fontSize: '0.69rem', color: '#888' }}>
          💡 Numbers entered here become the monthly visit quota for each care type, and the medicine budget (in Rs.) for the Medicines column.
        </div>

        <div style={{ marginTop: '10px' }}>
          <button className="btn" onClick={handleAddRow}>
            <Plus size={13} /> Add Package
          </button>
        </div>

        <div className="mfoot">
          <button className="btn sec" onClick={onClose}>
            <X size={13} /> Cancel
          </button>
          <button className="btn" onClick={handleSave}>
            <Check size={13} /> Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
