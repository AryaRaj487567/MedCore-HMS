'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  FlaskConical,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';

export function LabTechView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultValues, setResultValues] = useState<Record<string, number>>({});
  const [resultNotes, setResultNotes] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/lab/orders');
      setOrders(res.data || []);
      if (res.data?.length > 0 && !selectedOrder) setSelectedOrder(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Collect Sample
  const handleCollectSample = async (orderId: string) => {
    try {
      await fetchApi(`/lab/orders/${orderId}/sample`, { method: 'PATCH' });
      alert('Sample marked as collected. Ready for test analysis.');
      loadOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Submit Results
  const handleSubmitResults = async () => {
    if (!selectedOrder) return;
    try {
      const testResults = selectedOrder.tests.map((t: any) => ({
        testId: t.testId,
        resultValue: Number(resultValues[t.testId] || 0),
        resultNotes,
      }));

      const res = await fetchApi(`/lab/orders/${selectedOrder._id}/result`, {
        method: 'PATCH',
        body: JSON.stringify({ testResults }),
      });

      alert('Results entered! Reference ranges checked. Ready for senior approval.');
      setShowResultModal(false);
      loadOrders();
    } catch (err: any) {
      alert(`Error entering results: ${err.message}`);
    }
  };

  // Approve Report
  const handleApproveReport = async (orderId: string) => {
    try {
      await fetchApi(`/lab/orders/${orderId}/approve`, { method: 'PATCH' });
      alert('Lab report officially approved! Doctor and patient notified.');
      loadOrders();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Diagnostic Laboratory Worklist</h1>
          <p className="text-slate-500 text-sm mt-1">Specimen processing, reference range checking, and report sign-off</p>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          Refresh Orders
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center space-x-2">
            <FlaskConical className="h-5 w-5 text-indigo-600" />
            <span>Test Orders Queue ({orders.length})</span>
          </h2>

          <div className="space-y-3">
            {orders.map((order) => {
              const isSelected = selectedOrder?._id === order._id;
              let statusColor = 'bg-slate-100 text-slate-700';
              if (order.status === 'ORDERED') statusColor = 'bg-amber-100 text-amber-800';
              if (order.status === 'SAMPLE_COLLECTED') statusColor = 'bg-sky-100 text-sky-800';
              if (order.status === 'COMPLETED') statusColor = 'bg-indigo-100 text-indigo-800';
              if (order.status === 'APPROVED') statusColor = 'bg-emerald-100 text-emerald-800';

              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-indigo-700">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {order.patient?.userId?.firstName} {order.patient?.userId?.lastName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Tests: {order.tests.map((t: any) => t.testName).join(', ')}
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>

                    {order.status === 'ORDERED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCollectSample(order._id);
                        }}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Collect Sample
                      </button>
                    )}

                    {(order.status === 'SAMPLE_COLLECTED' || order.status === 'COMPLETED') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowResultModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Enter Results
                      </button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveReport(order._id);
                        }}
                        className="ml-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Approve & Publish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Order Detail & Reference Ranges */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Investigation Details</span>
          </h3>

          {selectedOrder ? (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>Order: <strong className="font-mono text-slate-800">{selectedOrder.orderNumber}</strong></div>
                <div className="mt-1">
                  Patient: <strong>{selectedOrder.patient?.userId?.firstName} {selectedOrder.patient?.userId?.lastName}</strong>
                </div>
                <div className="mt-1 text-slate-500">Status: {selectedOrder.status}</div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase">Test Results Breakdown</span>
                {selectedOrder.tests.map((test: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 text-xs bg-white">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{test.testName}</span>
                      <span>₹{test.price}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      Reference Range: <strong className="font-mono">{test.referenceRangeText || 'Standard'}</strong>
                    </div>

                    <div className="mt-2 flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                      <span className="text-[11px] text-slate-600">Recorded Value:</span>
                      {test.resultValue != null ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900">{test.resultValue} {test.unit || ''}</span>
                          {test.isOutOfRange ? (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              Out of Range
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              Normal
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending analysis</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">Select a lab order to inspect.</div>
          )}
        </div>
      </div>

      {/* MODAL: Enter Results */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Enter Clinical Lab Results</h3>
              <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Values will be automatically checked against clinical reference ranges:
              </p>

              {selectedOrder.tests.map((t: any) => (
                <div key={t.testId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{t.testName}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{t.referenceRangeText}</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Measured Result Value</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 14.5"
                      value={resultValues[t.testId] || ''}
                      onChange={(e) =>
                        setResultValues({ ...resultValues, [t.testId]: parseFloat(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technician Remarks & Observations</label>
                <textarea
                  rows={2}
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="e.g. Sample processed on automated analyzer. Quality control passed."
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResults}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Verify & Save Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
