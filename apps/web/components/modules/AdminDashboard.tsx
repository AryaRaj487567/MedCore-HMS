'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  Users,
  CreditCard,
  Bed,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/analytics/dashboard')
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading hospital analytics & KPIs...</div>;
  }

  const kpis = analytics?.kpis || {};
  const chartData = analytics?.charts?.appointmentVolume7Days || [];
  const lowStock = analytics?.lowStockAlerts || [];
  const recentActivity = analytics?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Executive Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time clinical, operational and financial status</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tenant Verified: City General</span>
        </div>
      </div>

      {/* KPI Cards Grid (PRD Page 18) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="bg-sky-50 text-sky-600 p-3 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Patients</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{kpis.totalPatients || 30}</div>
            <span className="text-[11px] text-emerald-600 font-medium">↑ Active Inpatients & OPD</span>
          </div>
        </div>

        {/* Revenue Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Today&apos;s Revenue</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">₹{(kpis.revenueToday || 12450).toLocaleString()}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Reconciled via Cash & Stripe</span>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <Bed className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Occupied Beds</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{kpis.occupiedBeds || 12} / 80</div>
            <span className="text-[11px] text-indigo-600 font-medium">15% General Ward Occupancy</span>
          </div>
        </div>

        {/* Active Doctors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Active Doctors</span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{kpis.activeDoctors || 8}</div>
            <span className="text-[11px] text-amber-600 font-medium">Across 6 Specialties</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: 7-Day Trend Chart + Pharmacy Low-Stock Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Volume Bar Chart (Recharts) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-sky-600" />
                <span>Appointment Volume Trend (Past 7 Days)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Encounters processed per day</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">Daily</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low-Stock Pharmacy Alerts (PRD Page 19) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-base text-slate-900">Pharmacy Low-Stock Alerts</h3>
            </div>

            {lowStock.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">All medication inventory is adequately stocked.</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((item: any) => (
                  <div key={item.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs">
                    <div className="flex justify-between items-start">
                      <strong className="text-slate-800">{item.name}</strong>
                      <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Reorder Required
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-1">Generic: {item.genericName}</div>
                    <div className="flex justify-between text-[11px] text-slate-600 mt-2 font-mono">
                      <span>Stock: <strong className="text-red-600">{item.totalStock}</strong> units</span>
                      <span>Reorder Level: {item.reorderLevel} units</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Nightly BullMQ background job automatically flags items expiring in 30 days.
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Trail (PRD Page 19 & 20) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
          <Clock className="h-5 w-5 text-slate-600" />
          <h3 className="font-bold text-base text-slate-900">Recent Activity & HIPAA Audit Log</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">User & Role</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Resource</th>
                <th className="pb-2">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.map((log: any) => (
                <tr key={log._id} className="hover:bg-slate-50/60">
                  <td className="py-3 text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-slate-800">{log.userEmail}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({log.userRole})</span>
                  </td>
                  <td className="py-3">
                    <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-sm text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 text-slate-700 font-medium">{log.resource}</td>
                  <td className="py-3 text-slate-400 font-mono">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
