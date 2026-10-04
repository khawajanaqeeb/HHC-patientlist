import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Management — Human Healthcare',
  description: 'Manage HHC staff members, view profiles, and track personnel.',
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="staff-layout-root">
      {children}
    </div>
  );
}
