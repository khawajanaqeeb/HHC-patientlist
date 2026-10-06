import type { Metadata } from 'next';
import AccountsSidebar from '@/components/AccountsSidebar';

export const metadata: Metadata = {
  title: 'Accounts — Human Healthcare',
  description: 'Accounting, Finance & Subscriptions Management for Human Healthcare.',
};

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="accounts-layout-root">
      <AccountsSidebar />
      <main className="accounts-main">{children}</main>
    </div>
  );
}
