import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patient Visit Sheet — Human Healthcare',
  description: 'Monthly Patient Visit Tracking System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
