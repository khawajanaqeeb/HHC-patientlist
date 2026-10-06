'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  FileText,
  CreditCard,
  BookMarked,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Scale,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  basePath: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Accounts',
    icon: <BookOpen size={16} />,
    basePath: '/accounts',
    items: [
      { label: 'Dashboard', href: '/accounts', icon: <LayoutDashboard size={15} /> },
      { label: 'Chart of Accounts', href: '/accounts/chart-of-accounts', icon: <ListOrdered size={15} /> },
      { label: 'Plans', href: '/accounts/plans', icon: <BookMarked size={15} /> },
      { label: 'Subscriptions', href: '/accounts/subscriptions', icon: <Users size={15} /> },
      { label: 'Invoices', href: '/accounts/invoices', icon: <FileText size={15} /> },
      { label: 'Payments', href: '/accounts/payments', icon: <CreditCard size={15} /> },
      { label: 'Journal Entries', href: '/accounts/journal', icon: <BookOpen size={15} /> },
    ],
  },
];

const reportsItems: NavItem[] = [
  { label: 'Income Statement', href: '/accounts/reports/income-statement', icon: <TrendingUp size={15} /> },
  { label: 'Balance Sheet', href: '/accounts/reports/balance-sheet', icon: <Scale size={15} /> },
  { label: 'MRR Dashboard', href: '/accounts/reports/mrr', icon: <BarChart2 size={15} /> },
  { label: 'Revenue Recognition', href: '/accounts/reports/revenue-recognition', icon: <RefreshCw size={15} /> },
];

export default function AccountsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);

  // Auto-expand Reports group when on a reports route
  useEffect(() => {
    if (pathname.startsWith('/accounts/reports')) {
      setReportsOpen(true);
    }
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/accounts') return pathname === '/accounts';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="accounts-sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`accounts-sidebar${isOpen ? ' accounts-sidebar-expanded' : ' accounts-sidebar-collapsed'}`}>
        {/* Toggle button */}
        <button
          className="accounts-sidebar-toggle"
          onClick={() => setIsOpen((v) => !v)}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {/* Back to main app */}
        <button
          className="accounts-back-btn"
          onClick={() => router.push('/')}
          title="Back to Patient Sheet"
        >
          <span className="accounts-sidebar-icon"><ArrowLeft size={16} /></span>
          {isOpen && <span className="accounts-sidebar-label">Main App</span>}
        </button>

        <div className="accounts-sidebar-divider" />

        {/* Accounts Group */}
        <button
          className={`accounts-sidebar-tab${accountsOpen && isOpen ? ' active' : ''}`}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              setAccountsOpen(true);
            } else {
              setAccountsOpen((v) => !v);
            }
          }}
          title="Accounts"
          aria-expanded={isOpen ? accountsOpen : undefined}
        >
          <span className="accounts-sidebar-icon"><BookOpen size={16} /></span>
          {isOpen && (
            <>
              <span className="accounts-sidebar-label">Accounts</span>
              <span className="accounts-sidebar-chevron">
                {accountsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </>
          )}
        </button>

        {/* Accounts sub-items */}
        {isOpen && (
          <div className={`accounts-sidebar-sub ${accountsOpen ? 'open' : ''}`}>
            {navGroups[0].items.map((item) => (
              <button
                key={item.href}
                className={`accounts-sidebar-action${isActive(item.href) ? ' active-link' : ''}`}
                onClick={() => router.push(item.href)}
                title={item.label}
              >
                <span className="accounts-action-icon">{item.icon}</span>
                <span className="accounts-action-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Icon-only mode for accounts items */}
        {!isOpen && (
          <div className="accounts-icon-only-actions">
            {navGroups[0].items.map((item) => (
              <button
                key={item.href}
                className={`accounts-icon-btn${isActive(item.href) ? ' active-link' : ''}`}
                onClick={() => router.push(item.href)}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
        )}

        <div className="accounts-sidebar-divider" />

        {/* Reports Group */}
        <button
          className={`accounts-sidebar-tab${reportsOpen && isOpen ? ' active' : ''}`}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              setReportsOpen(true);
            } else {
              setReportsOpen((v) => !v);
            }
          }}
          title="Reports"
          aria-expanded={isOpen ? reportsOpen : undefined}
        >
          <span className="accounts-sidebar-icon"><BarChart2 size={16} /></span>
          {isOpen && (
            <>
              <span className="accounts-sidebar-label">Reports</span>
              <span className="accounts-sidebar-chevron">
                {reportsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </>
          )}
        </button>

        {/* Reports sub-items */}
        {isOpen && (
          <div className={`accounts-sidebar-sub ${reportsOpen ? 'open' : ''}`}>
            {reportsItems.map((item) => (
              <button
                key={item.href}
                className={`accounts-sidebar-action${isActive(item.href) ? ' active-link' : ''}`}
                onClick={() => router.push(item.href)}
                title={item.label}
              >
                <span className="accounts-action-icon">{item.icon}</span>
                <span className="accounts-action-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Icon-only mode for reports items */}
        {!isOpen && (
          <div className="accounts-icon-only-actions">
            {reportsItems.map((item) => (
              <button
                key={item.href}
                className={`accounts-icon-btn${isActive(item.href) ? ' active-link' : ''}`}
                onClick={() => router.push(item.href)}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
