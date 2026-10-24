'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { fetchApi } from '../../lib/api';
import {
  HeartPulse,
  FileText,
  FlaskConical,
  CreditCard,
  Calendar,
  Printer,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export function PatientPortal() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadPatientData = async () => {
      setLoading(true);
      try {
        const [recRes, labRes, invRes] = await Promise.all([
          fetchApi(`/medical-records/${user.patientId || user.id}`),
          fetchApi('/lab/orders'),
          fetchApi('/invoices'),
        ]);
        setRecords(recRes.data || []);
        setLabOrders(labRes.data || []);
        setInvoices(invRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPatientData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Patient Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Health Portal</h1>
            <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Self-Service
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Welcome, {user?.firstName} {user?.lastName} • Confidential Medical Records
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600">
          Hospital: <strong>City General</strong>
        </div>
      </div>

      {/* Grid: Health Timeline + Lab Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinical Encounters Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center space-x-2">
            <HeartPulse className="h-5 w-5 text-sky-600" />
            <span>My Clinical Encounters & Diagnosis</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading health history...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No prior medical records on file.</div>
          ) : (
            <div className="space-y-4">
              {records.map((rec) => (
                <div key={rec._id || rec.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">
                      Dr. {rec.doctor?.user?.lastName || 'Consultant'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-slate-700">
                    <strong>Chief Complaint:</strong> {rec.chiefComplaint}
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 text-[10px] block">CONFIRMED DIAGNOSIS</span>
                      <span className="font-bold text-slate-800">{rec.diagnosis?.description}</span>
                    </div>
                    {rec.diagnosis?.icd10Code && (
                      <span className="bg-sky-50 text-sky-700 font-mono font-bold px-2 py-0.5 rounded-sm text-[10px]">
                        ICD: {rec.diagnosis.icd10Code}
                      </span>
                    )}
                  </div>

                  {rec.vitals && (
                    <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                      <div>BP: <strong>{rec.vitals.bloodPressureSystolic}/{rec.vitals.bloodPressureDiastolic}</strong></div>
                      <div>Pulse: <strong>{rec.vitals.pulseRate} bpm</strong></div>
                      <div>BMI: <strong className="text-sky-700">{rec.vitals.bmi}</strong></div>
                    </div>
                  )}

                  <div className="text-slate-600 pt-1">
                    <strong>Doctor&apos;s Advice:</strong> {rec.treatmentPlan}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verified Lab Reports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center space-x-2">
            <FlaskConical className="h-5 w-5 text-indigo-600" />
            <span>Verified Laboratory Reports</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading lab reports...</div>
          ) : labOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No lab investigations recorded.</div>
          ) : (
            <div className="space-y-4">
              {labOrders.map((order) => (
                <div key={order._id || order.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-indigo-700">{order.orderNumber}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold ml-2">
                        APPROVED
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.tests?.map((t: any, idx: number) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">{t.testName}</div>
                          <div className="text-[10px] text-slate-400">Normal: {t.referenceRangeText}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">{t.resultValue} {t.unit}</span>
                          <div>
                            {t.isOutOfRange ? (
                              <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-sm font-bold">
                                Out of Range
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-sm font-bold">
                                Normal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoices & Receipts for Patient */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h2 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <span>My Medical Invoices & Payment Receipts</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="pb-3">Invoice Number</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Total Amount</th>
                <th className="pb-3">Amount Paid</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv._id || inv.id}>
                  <td className="py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3 text-slate-500 font-mono">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-900">₹{inv.total}</td>
                  <td className="py-3 font-mono text-emerald-600 font-bold">₹{inv.amountPaid}</td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
