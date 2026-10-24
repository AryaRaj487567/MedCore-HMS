'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  Pill,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Archive,
  ArrowRight,
} from 'lucide-react';

export function PharmacistView() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any | null>(null);

  // Batch Form
  const [batchNum, setBatchNum] = useState('');
  const [mfgDate, setMfgDate] = useState('2025-01-01');
  const [expDate, setExpDate] = useState('2027-01-01');
  const [qty, setQty] = useState(100);
  const [cost, setCost] = useState(5.0);
  const [mrp, setMrp] = useState(12.0);

  // Dispense Form
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispenseQty, setDispenseQty] = useState(10);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/medicines');
      setMedicines(res.data || []);
      if (res.data?.length > 0 && !selectedMed) setSelectedMed(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // Add Batch
  const handleAddBatch = async () => {
    if (!selectedMed) return;
    try {
      await fetchApi(`/medicines/${selectedMed._id || selectedMed.id}/batches`, {
        method: 'POST',
        body: JSON.stringify({
          batchNumber: batchNum || `BATCH-${Date.now()}`,
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          quantity: qty,
          unitCost: cost,
          mrp,
        }),
      });

      alert('Inventory batch added to stock!');
      setShowAddBatchModal(false);
      loadMedicines();
    } catch (err: any) {
      alert(`Error adding batch: ${err.message}`);
    }
  };

  // FIFO Dispense
  const handleDispense = async () => {
    if (!selectedMed) return;
    try {
      const res = await fetchApi('/pharmacy/dispense', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ medicineId: selectedMed._id || selectedMed.id, quantity: dispenseQty }],
        }),
      });

      alert(`Dispensed ${dispenseQty} units via FIFO! Total MRP: ₹${res.data.dispensedDetails[0]?.totalCost}`);
      setShowDispenseModal(false);
      loadMedicines();
    } catch (err: any) {
      alert(`Dispensing error: ${err.message}`);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy & Medicine Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">FIFO inventory management, expiry quarantine, and stock tracking</p>
        </div>
        <button
          onClick={loadMedicines}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          Refresh Stock
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medicine Catalog */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
            <h2 className="font-bold text-base text-slate-800 flex items-center space-x-2">
              <Pill className="h-5 w-5 text-emerald-600" />
              <span>Pharmaceutical Catalog ({medicines.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Oldest non-expired batch consumed first (FIFO)</span>
          </div>

          <div className="space-y-3">
            {medicines.map((med) => {
              const isSelected = selectedMed?._id === med._id;
              const isLowStock = med.totalStock <= med.reorderLevel;

              return (
                <div
                  key={med._id || med.id}
                  onClick={() => setSelectedMed(med)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{med.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        {med.form}
                      </span>
                      {isLowStock && (
                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Generic: {med.genericName} • Manufacturer: {med.manufacturer}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900">{med.totalStock}</span>
                    <span className="text-[11px] text-slate-400 block">units in stock</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Medicine Batch Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
            <span>Batch Details & FIFO</span>
            {selectedMed && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddBatchModal(true)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                  title="Add Stock Batch"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowDispenseModal(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Dispense (FIFO)
                </button>
              </div>
            )}
          </h3>

          {selectedMed ? (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>Selected: <strong className="text-slate-800">{selectedMed.name}</strong></div>
                <div className="text-slate-500 mt-0.5">Reorder Threshold: {selectedMed.reorderLevel} units</div>
                <div className="text-slate-500 mt-0.5">Batches Registered: {selectedMed.batches?.length || 0}</div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase">Batches (FIFO Order)</span>
                {selectedMed.batches?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No batches recorded for this medicine.</p>
                ) : (
                  selectedMed.batches.map((batch: any, idx: number) => {
                    const isExpired = batch.expiryDate < today || batch.isQuarantined;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs ${
                          isExpired ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <strong className="font-mono text-slate-800">{batch.batchNumber}</strong>
                          {isExpired ? (
                            <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-sm uppercase">
                              Quarantined (Expired)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-1.5 py-0.5 rounded-sm">
                              Active Stock
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-600">
                          <div>Mfg: <strong className="font-mono">{batch.manufacturingDate}</strong></div>
                          <div>Exp: <strong className="font-mono">{batch.expiryDate}</strong></div>
                          <div>Qty: <strong className="font-mono">{batch.quantity} units</strong></div>
                          <div>MRP: <strong className="font-mono">₹{batch.mrp}</strong></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">Select a medicine to view batches.</div>
          )}
        </div>
      </div>

      {/* MODAL: Add Stock Batch */}
      {showAddBatchModal && selectedMed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Add Stock Batch</h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026-X1"
                  value={batchNum}
                  onChange={(e) => setBatchNum(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBatch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Add Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIFO Dispense */}
      {showDispenseModal && selectedMed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Dispense Medicine (FIFO)</h3>
              <button onClick={() => setShowDispenseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Oldest active non-expired batch will be automatically depleted first according to clinical protocol.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantity to Dispense</label>
                <input
                  type="number"
                  min="1"
                  max={selectedMed.totalStock}
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-sm font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispense}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Dispensing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
