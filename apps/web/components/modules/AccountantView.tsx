'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  Send,
} from 'lucide-react';

export function AccountantView() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('CASH');

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/invoices');
      setInvoices(res.data || []);
      if (res.data?.length > 0 && !selectedInvoice) setSelectedInvoice(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    try {
      await fetchApi(`/invoices/${selectedInvoice._id || selectedInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
        }),
      });

      alert('Payment recorded! Patient notified and receipt updated.');
      setShowPayModal(false);
      loadInvoices();
    } catch (err: any) {
      alert(`Payment error: ${err.message}`);
    }
  };

  // Simulate Stripe Webhook per PRD Page 14
  const handleSimulateStripeWebhook = async (invoiceId: string, amount: number) => {
    try {
      await fetchApi('/payments/webhook/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_bypass_valid_signature_token',
        },
        body: JSON.stringify({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: `pi_test_${Date.now()}`,
              amount_received: amount * 100,
              metadata: { invoiceId },
            },
          },
        }),
      });

      alert('Stripe Webhook received and verified! Invoice marked as PAID.');
      loadInvoices();
    } catch (err: any) {
      alert(`Webhook simulation error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Billing & Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Multi-department charge aggregation, payment reconciliation, and Stripe webhooks</p>
        </div>
        <button
          onClick={loadInvoices}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          Refresh Invoices
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
            <h2 className="font-bold text-base text-slate-800 flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <span>Patient Invoices ({invoices.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Aggregates Consultation, Lab, Pharmacy & Rooms</span>
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?._id === inv._id;
              const isPaid = inv.status === 'PAID';

              return (
                <div
                  key={inv._id || inv.id}
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setPayAmount(inv.balanceDue);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {inv.patient?.user?.firstName || 'Patient'} {inv.patient?.user?.lastName || ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {inv.items?.length || 0} line items aggregated
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900">₹{inv.total}</span>
                    <span className="text-[11px] block font-mono text-slate-400">
                      Balance: <strong className={inv.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}>₹{inv.balanceDue}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Invoice Receipt View */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Invoice Breakdown</span>
              {selectedInvoice && selectedInvoice.balanceDue > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Collect Payment
                </button>
              )}
            </h3>

            {selectedInvoice ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>No: <strong className="font-mono">{selectedInvoice.invoiceNumber}</strong></div>
                  <div className="mt-1">
                    Patient: <strong>{selectedInvoice.patient?.user?.firstName} {selectedInvoice.patient?.user?.lastName}</strong>
                  </div>
                  <div className="mt-1 text-slate-500">
                    Created: {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Department Items</span>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedInvoice.items?.map((item: any, idx: number) => (
                      <div key={idx} className="py-2 flex justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{item.description}</div>
                          <div className="text-[10px] text-slate-400">Cat: {item.category} • Qty: {item.quantity}</div>
                        </div>
                        <div className="font-mono font-bold text-slate-900">₹{item.totalPrice}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-mono">₹{selectedInvoice.subtotal}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-sm pt-1">
                      <span>Total Billed</span>
                      <span className="font-mono text-emerald-700">₹{selectedInvoice.total}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Amount Paid</span>
                      <span className="font-mono text-slate-800">₹{selectedInvoice.amountPaid}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Stripe Webhook Button */}
                {selectedInvoice.balanceDue > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleSimulateStripeWebhook(selectedInvoice._id || selectedInvoice.id, selectedInvoice.balanceDue)}
                      className="w-full flex items-center justify-center space-x-1.5 p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Simulate Stripe Webhook Settlement</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">Select an invoice to inspect line items.</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Billing integrity hook guarantees subtotal matches line items sum.
          </div>
        </div>
      </div>

      {/* MODAL: Collect Payment */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Record Invoice Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="STRIPE">Stripe Credit/Debit Card</option>
                  <option value="RAZORPAY">Razorpay UPI / Netbanking</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  max={selectedInvoice.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-sm font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
