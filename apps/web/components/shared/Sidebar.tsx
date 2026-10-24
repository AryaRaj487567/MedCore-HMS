'use client';

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '@medcore/types';
import {
  Calendar,
  Users,
  FileText,
  FlaskConical,
  Pill,
  CreditCard,
  LayoutDashboard,
  HeartPulse,
  Building2,
  Clock,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  const { user } = useAuthStore();
  const role = user?.role || UserRole.DOCTOR;

  // Generate navigation links based on user role
  const getNavItems = () => {
    switch (role) {
      case UserRole.DOCTOR:
        return [
          { id: 'dashboard', label: 'Doctor Dashboard', icon: LayoutDashboard },
          { id: 'appointments', label: 'Today’s Timeline', icon: Calendar },
          { id: 'patients', label: 'Patient Directory', icon: Users },
          { id: 'emr', label: 'Clinical Encounters', icon: HeartPulse },
          { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
          { id: 'lab_orders', label: 'Lab Orders', icon: FlaskConical },
        ];

      case UserRole.HOSPITAL_ADMIN:
        return [
          { id: 'dashboard', label: 'Hospital Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Revenue & Volume', icon: CreditCard },
          { id: 'doctors', label: 'Doctor Availability', icon: Clock },
          { id: 'departments', label: 'Departments & Beds', icon: Building2 },
          { id: 'low_stock', label: 'Pharmacy Stock Alerts', icon: AlertTriangle },
          { id: 'invoices', label: 'All Invoices', icon: ClipboardList },
        ];

      case UserRole.RECEPTIONIST:
        return [
          { id: 'dashboard', label: 'Front Desk Desk', icon: LayoutDashboard },
          { id: 'schedule', label: 'Appointment Scheduling', icon: Calendar },
          { id: 'register_patient', label: 'Patient Registration', icon: Users },
          { id: 'billing', label: 'Create Invoice', icon: CreditCard },
        ];

      case UserRole.NURSE:
        return [
          { id: 'dashboard', label: 'Nurse Station', icon: LayoutDashboard },
          { id: 'vitals', label: 'Record Vitals', icon: HeartPulse },
          { id: 'patients', label: 'Patient Triage', icon: Users },
        ];

      case UserRole.LAB_TECHNICIAN:
        return [
          { id: 'dashboard', label: 'Lab Worklist', icon: LayoutDashboard },
          { id: 'test_orders', label: 'Enter Test Results', icon: FlaskConical },
          { id: 'catalog', label: 'Reference Ranges', icon: ClipboardList },
        ];

      case UserRole.PHARMACIST:
        return [
          { id: 'dashboard', label: 'Pharmacy Desk', icon: LayoutDashboard },
          { id: 'dispense', label: 'FIFO Dispensing', icon: Pill },
          { id: 'inventory', label: 'Medicine Batches', icon: ClipboardList },
        ];

      case UserRole.ACCOUNTANT:
        return [
          { id: 'dashboard', label: 'Billing Summary', icon: LayoutDashboard },
          { id: 'invoices', label: 'Invoices & Receipts', icon: CreditCard },
          { id: 'payments', label: 'Stripe Webhook Sim', icon: ClipboardList },
        ];

      case UserRole.PATIENT:
        return [
          { id: 'dashboard', label: 'My Health Portal', icon: LayoutDashboard },
          { id: 'my_records', label: 'Clinical Encounters', icon: HeartPulse },
          { id: 'my_prescriptions', label: 'Prescriptions & PDFs', icon: FileText },
          { id: 'my_lab', label: 'Verified Lab Reports', icon: FlaskConical },
          { id: 'my_invoices', label: 'Invoices & Payments', icon: CreditCard },
          { id: 'book_visit', label: 'Book Appointment', icon: Calendar },
        ];

      case UserRole.SUPER_ADMIN:
        return [
          { id: 'dashboard', label: 'Platform Tenants', icon: LayoutDashboard },
          { id: 'onboard', label: 'Onboard Hospital', icon: Building2 },
          { id: 'system', label: 'System Analytics', icon: ClipboardList },
        ];

      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          {role.replace('_', ' ')} Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-700 shadow-xs shadow-sky-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hospital Tenant Tag */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
        <div className="font-semibold text-slate-700 flex items-center space-x-1.5">
          <Building2 className="h-3.5 w-3.5 text-sky-600" />
          <span>Tenant Isolated</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Scoping active on collection indexes. HIPAA compliant.
        </p>
      </div>
    </aside>
  );
}
