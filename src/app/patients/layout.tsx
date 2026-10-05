import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patient Directory — Human Healthcare',
  description: 'View and manage HHC patient profiles, photos, and visit history.',
};

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="staff-layout-root">
      {children}
    </div>
  );
}