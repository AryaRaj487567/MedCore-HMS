'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore, DEMO_USERS } from '../store/authStore';
import { UserRole } from '@medcore/types';
import { Header } from '../components/shared/Header';
import { Sidebar } from '../components/shared/Sidebar';

// Module Views
import { DoctorDashboard } from '../components/modules/DoctorDashboard';
import { AdminDashboard } from '../components/modules/AdminDashboard';
import { ReceptionistView } from '../components/modules/ReceptionistView';
import { LabTechView } from '../components/modules/LabTechView';
import { PharmacistView } from '../components/modules/PharmacistView';
import { AccountantView } from '../components/modules/AccountantView';
import { PatientPortal } from '../components/modules/PatientPortal';

import {
  Activity,
  ShieldCheck,
  Stethoscope,
  Building2,
  Users,
  FlaskConical,
  Pill,
  CreditCard,
  HeartPulse,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const { user, token, quickLoginAsRole, loginWithCredentials, isLoading, error } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Auto-login as Doctor by default if not logged in yet to allow immediate exploration
  useEffect(() => {
    const savedUser = localStorage.getItem('medcore_user');
    const savedToken = localStorage.getItem('medcore_access_token');
    if (!user && !savedUser) {
      // Default initial login as Doctor
      quickLoginAsRole(UserRole.DOCTOR);
    } else if (savedUser && savedToken && !user) {
      try {
        useAuthStore.getState().setSession(JSON.parse(savedUser), savedToken);
      } catch {
        // quiet
      }
    }
  }, []);

  // When role changes, reset current tab to dashboard
  useEffect(() => {
    setCurrentTab('dashboard');
  }, [user?.role]);

  // If not logged in, show login page with 1-click role switcher
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-full text-sky-400 text-xs font-semibold">
              <Activity className="h-4 w-4" />
              <span>Multi-Tenant Cloud Hospital Management Platform</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              MedCore <span className="text-sky-400">HMS</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Digitised end-to-end clinical and administrative workflows for multi-branch hospitals. Strictly conforming to PRD specifications.
            </p>
          </div>

          {/* Quick 1-Click Role Login Cards */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-sky-400" />
                  <span>Explore Demo Accounts (9 Roles)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Click any persona below for instantaneous instant login with realistic seeded clinical data:</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { role: UserRole.DOCTOR, icon: Stethoscope, title: 'Doctor', desc: 'Encounters, EMR, Vitals & Prescriptions', color: 'sky' },
                { role: UserRole.HOSPITAL_ADMIN, icon: Building2, title: 'Hospital Admin', desc: 'KPIs, Revenue, 7-Day Trend Chart & Audit', color: 'emerald' },
                { role: UserRole.RECEPTIONIST, icon: Users, title: 'Receptionist', desc: 'Patient Registration & Slot Booking Engine', color: 'blue' },
                { role: UserRole.LAB_TECHNICIAN, icon: FlaskConical, title: 'Lab Technician', desc: 'Reference Ranges & Approval Workflow', color: 'indigo' },
                { role: UserRole.PHARMACIST, icon: Pill, title: 'Pharmacist', desc: 'FIFO Dispensing & Expired Quarantine', color: 'teal' },
                { role: UserRole.ACCOUNTANT, icon: CreditCard, title: 'Accountant', desc: 'Aggregated Invoices & Stripe Webhooks', color: 'amber' },
                { role: UserRole.PATIENT, icon: HeartPulse, title: 'Patient', desc: 'Health Records, Lab Reports & PDF Prescriptions', color: 'rose' },
                { role: UserRole.NURSE, icon: Activity, title: 'Nurse', desc: 'Vitals Recording & Inpatient Triage', color: 'cyan' },
                { role: UserRole.SUPER_ADMIN, icon: ShieldCheck, title: 'Super Admin', desc: 'Multi-Tenant Onboarding & Global Oversight', color: 'purple' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    onClick={() => quickLoginAsRole(item.role)}
                    disabled={isLoading}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/80 hover:border-sky-500/50 text-left transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-slate-800 rounded-xl text-sky-400 group-hover:text-white group-hover:bg-sky-600 transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-sky-400">
                          1-Click Login
                        </span>
                      </div>
                      <div className="font-bold text-sm text-slate-100 mt-3">{item.title}</div>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                    <div className="mt-3 flex items-center text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                      <span>Launch Portal</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render role-specific view
  const renderRoleDashboard = () => {
    switch (user.role) {
      case UserRole.DOCTOR:
        return <DoctorDashboard />;
      case UserRole.HOSPITAL_ADMIN:
        return <AdminDashboard />;
      case UserRole.RECEPTIONIST:
        return <ReceptionistView />;
      case UserRole.LAB_TECHNICIAN:
        return <LabTechView />;
      case UserRole.PHARMACIST:
        return <PharmacistView />;
      case UserRole.ACCOUNTANT:
        return <AccountantView />;
      case UserRole.PATIENT:
        return <PatientPortal />;
      case UserRole.NURSE:
        return <DoctorDashboard />; // Reusable clinical encounters
      case UserRole.SUPER_ADMIN:
        return <AdminDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {renderRoleDashboard()}
        </main>
      </div>
    </div>
  );
}
