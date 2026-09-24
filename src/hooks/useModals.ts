import { useState } from 'react';
import { PatientMonthData } from '@/lib/types';

export function useModals() {
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patientWindowMode, setPatientWindowMode] = useState<'search' | 'add'>('add');
  const [isAddMonthModalOpen, setIsAddMonthModalOpen] = useState(false);
  const [isEnterVisitModalOpen, setIsEnterVisitModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientMonthData | null>(null);

  const openAddPatient = () => {
    setPatientWindowMode('search');
    setEditingPatient(null);
    setIsAddPatientModalOpen(true);
  };

  const closeAddPatient = () => {
    setIsAddPatientModalOpen(false);
    setEditingPatient(null);
  };

  return {
    isPackageModalOpen,
    setIsPackageModalOpen,
    isAddPatientModalOpen,
    patientWindowMode,
    isAddMonthModalOpen,
    setIsAddMonthModalOpen,
    isEnterVisitModalOpen,
    setIsEnterVisitModalOpen,
    editingPatient,
    setEditingPatient,
    openAddPatient,
    closeAddPatient,
  };
}
