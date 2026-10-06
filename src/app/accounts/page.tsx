import { redirect } from 'next/navigation';

// The Accounts dashboard will be at /accounts
// For now, redirect to chart-of-accounts until Step 12 builds the dashboard
export default function AccountsPage() {
  redirect('/accounts/chart-of-accounts');
}
