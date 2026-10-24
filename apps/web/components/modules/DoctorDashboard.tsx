'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { fetchApi } from '../../lib/api';
import {
  Calendar,
  Clock,
  User,
  HeartPulse,
  Pill,
  FlaskConical,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Printer,
  ChevronRight,
  Activity,
} from 'lucide-react';

export function DoctorDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Modals state
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);

  // EMR Form State
  const [vitals, setVitals] = useState({
    bpSys: 120,
    bpDia: 80,
    pulse: 72,
    temp: 98.6,
    spO2: 98,
    heightCm: 175,
    weightKg: 70,
    bmi: 22.9,
  });
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosisDesc, setDiagnosisDesc] = useState('');
  const [icd10, setIcd10] = useState('I10');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [allergies, setAllergies] = useState('');

  // Prescription Form State
  const [prescriptionItems, setPrescriptionItems] = useState([
    { medicineName: 'Paracetamol 650mg (Dolo)', form: 'TABLET', dosage: '650 mg', frequency: 'BD', durationDays: 5, instructions: 'After food' },
  ]);
  const [specialAdvice, setSpecialAdvice] = useState('');

  // Lab Order State
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // Load appointments
  const loadAppointments = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetchApi(`/appointments?date=${today}`);
      setAppointments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // Load lab tests catalog
    fetchApi('/lab/tests').then((res) => setAvailableTests(res.data || [])).catch(() => {});
  }, []);

  // Auto calculate BMI
  const updateVitals = (key: string, value: any) => {
    const next = { ...vitals, [key]: Number(value) };
    if (next.heightCm > 0 && next.weightKg > 0) {
      const hM = next.heightCm / 100;
      next.bmi = parseFloat((next.weightKg / (hM * hM)).toFixed(1));
    }
    setVitals(next);
  };

  // Submit EMR Encounter
  const handleSaveEncounter = async () => {
    if (!selectedAppointment) return;
    try {
      const res = await fetchApi('/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedAppointment.patientId,
          appointmentId: selectedAppointment._id,
          vitals: {
            bloodPressureSystolic: vitals.bpSys,
            bloodPressureDiastolic: vitals.bpDia,
            pulseRate: vitals.pulse,
            temperature: vitals.temp,
            spO2: vitals.spO2,
            heightCm: vitals.heightCm,
            weightKg: vitals.weightKg,
            bmi: vitals.bmi,
          },
          chiefComplaint: chiefComplaint || 'Routine medical encounter',
          diagnosis: {
            description: diagnosisDesc || 'Clinical observation',
            icd10Code: icd10,
            type: 'CONFIRMED',
          },
          treatmentPlan: treatmentPlan || 'Symptomatic management',
          allergiesRecorded: allergies ? allergies.split(',').map((s) => s.trim()) : [],
        }),
      });

      alert('Electronic Medical Record saved! Appointment marked as completed.');
      setShowEncounterModal(false);
      loadAppointments();
    } catch (err: any) {
      alert(`Error saving EMR: ${err.message}`);
    }
  };

  // Submit Prescription
  const handleSavePrescription = async () => {
    if (!selectedAppointment) return;
    try {
      // Find or create linked record ID
      const recordRes = await fetchApi(`/medical-records/${selectedAppointment.patientId}`);
      const latestRecord = recordRes.data?.[0];

      if (!latestRecord) {
        alert('Please save an EMR encounter record first before issuing prescription.');
        return;
      }

      const res = await fetchApi('/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedAppointment.patientId,
          medicalRecordId: latestRecord._id || latestRecord.id,
          appointmentId: selectedAppointment._id,
          items: prescriptionItems,
          specialInstructions: specialAdvice,
        }),
      });

      alert(`Prescription ${res.data.prescriptionNumber} issued! Patient and Pharmacy notified.`);
      setShowPrescriptionModal(false);
      // Open printable PDF preview in new window
      window.open(`http://localhost:3001/api/v1/prescriptions/${res.data._id}/pdf`, '_blank');
    } catch (err: any) {
      alert(`Error issuing prescription: ${err.message}`);
    }
  };

  // Submit Lab Order
  const handleSaveLabOrder = async () => {
    if (!selectedAppointment || selectedTestIds.length === 0) return;
    try {
      const res = await fetchApi('/lab/orders', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedAppointment.patientId,
          appointmentId: selectedAppointment._id,
          testIds: selectedTestIds,
        }),
      });
      alert(`Lab Order ${res.data.orderNumber} dispatched to Laboratory Worklist!`);
      setShowLabModal(false);
      setSelectedTestIds([]);
    } catch (err: any) {
      alert(`Error ordering lab test: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctor Clinical Station</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Live Encounters
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Dr. {user?.firstName} {user?.lastName} • Cardiology & Internal Medicine
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">TODAY&apos;S QUEUE</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {appointments.filter((a) => a.status !== 'CANCELLED').length} Patients
            </span>
          </div>
          <button
            onClick={loadAppointments}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Grid: Today's Timeline + Patient Action Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline (PRD Page 18) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-base text-slate-800">Today&apos;s Appointments Timeline</h2>
            </div>
            <span className="text-xs text-slate-400">Sorted chronologically</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading appointment schedule...</div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No appointments scheduled for today.</div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const isSelected = selectedAppointment?._id === appt._id;
                const isEmergency = appt.isEmergency;

                // Status styling
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (appt.status === 'CONFIRMED') badgeClass = 'bg-sky-100 text-sky-800';
                if (appt.status === 'IN_PROGRESS') badgeClass = 'bg-amber-100 text-amber-800 animate-pulse';
                if (appt.status === 'COMPLETED') badgeClass = 'bg-emerald-100 text-emerald-800';

                return (
                  <div
                    key={appt._id}
                    onClick={() => setSelectedAppointment(appt)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
                        : isEmergency
                        ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Slot time */}
                      <div className="text-center w-16 shrink-0">
                        <span className="text-sm font-bold text-slate-900 block font-mono">{appt.timeSlot}</span>
                        <span className="text-[10px] text-slate-400 uppercase">30 mins</span>
                      </div>

                      <div className="h-8 w-px bg-slate-200" />

                      {/* Patient details */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">
                            {appt.patient?.user?.firstName || 'Patient'} {appt.patient?.user?.lastName || ''}
                          </span>
                          {isEmergency && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-bounce">
                              Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          MRN: <span className="font-mono">{appt.patient?.mrn || 'N/A'}</span> • {appt.reason || 'General Checkup'}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeClass}`}>
                        {appt.status}
                      </span>
                      <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Panel for Selected Patient */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center space-x-2">
              <User className="h-4 w-4 text-sky-600" />
              <span>Encounter Workspace</span>
            </h3>

            {selectedAppointment ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Selected Patient</span>
                  <div className="font-bold text-slate-900 text-sm mt-1">
                    {selectedAppointment.patient?.user?.firstName} {selectedAppointment.patient?.user?.lastName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    MRN: <strong className="font-mono">{selectedAppointment.patient?.mrn}</strong> | Blood Group: {selectedAppointment.patient?.bloodGroup || 'O+'}
                  </div>
                  <div className="text-xs text-red-600 font-semibold mt-1">
                    Allergies: {selectedAppointment.patient?.allergies?.join(', ') || 'None reported'}
                  </div>
                </div>

                {/* Encounter Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setShowEncounterModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <HeartPulse className="h-4 w-4" />
                      <span>1. Record EMR & Vitals</span>
                    </div>
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => setShowPrescriptionModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Pill className="h-4 w-4 text-emerald-600" />
                      <span>2. Issue Prescription & PDF</span>
                    </div>
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => setShowLabModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <FlaskConical className="h-4 w-4 text-indigo-600" />
                      <span>3. Order Lab Investigations</span>
                    </div>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                Select an appointment from the timeline to start encounter, vitals, or prescriptions.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Encounter records are immutable and append-only per PRD clinical specs.
          </div>
        </div>
      </div>

      {/* MODAL 1: Electronic Medical Record (EMR) */}
      {showEncounterModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Clinical Encounter Record (EMR)</h3>
              <button onClick={() => setShowEncounterModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Vitals Grid with Auto BMI */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Patient Vitals (Auto-calculated BMI)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-500">BP Systolic</span>
                    <input
                      type="number"
                      value={vitals.bpSys}
                      onChange={(e) => updateVitals('bpSys', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">BP Diastolic</span>
                    <input
                      type="number"
                      value={vitals.bpDia}
                      onChange={(e) => updateVitals('bpDia', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Pulse (bpm)</span>
                    <input
                      type="number"
                      value={vitals.pulse}
                      onChange={(e) => updateVitals('pulse', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">SpO2 (%)</span>
                    <input
                      type="number"
                      value={vitals.spO2}
                      onChange={(e) => updateVitals('spO2', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Height (cm)</span>
                    <input
                      type="number"
                      value={vitals.heightCm}
                      onChange={(e) => updateVitals('heightCm', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Weight (kg)</span>
                    <input
                      type="number"
                      value={vitals.weightKg}
                      onChange={(e) => updateVitals('weightKg', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold mt-1"
                    />
                  </div>
                  <div className="col-span-2 bg-sky-100/60 p-2 rounded-lg border border-sky-200 text-center">
                    <span className="text-[11px] text-sky-800 font-semibold block">Calculated BMI</span>
                    <span className="text-base font-bold text-sky-900 font-mono">{vitals.bmi} kg/m²</span>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Chief Complaint & Symptoms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient reports palpitations and dizziness for past 3 days..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              {/* ICD-10 Diagnosis */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">ICD-10 Code</label>
                  <input
                    type="text"
                    value={icd10}
                    onChange={(e) => setIcd10(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Confirmed Diagnosis</label>
                  <input
                    type="text"
                    placeholder="e.g. Essential (primary) hypertension"
                    value={diagnosisDesc}
                    onChange={(e) => setDiagnosisDesc(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              {/* Treatment Plan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Treatment Plan & Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Advised low-salt DASH diet, initiate ACE inhibitor, review in 14 days..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowEncounterModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEncounter}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save Encounter & Complete Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Issue Prescription */}
      {showPrescriptionModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <Pill className="h-5 w-5 text-emerald-600" />
                <span>Issue Prescription (Digital Signature & PDF Export)</span>
              </h3>
              <button onClick={() => setShowPrescriptionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">Medication List</span>
                  <button
                    onClick={() =>
                      setPrescriptionItems([
                        ...prescriptionItems,
                        { medicineName: 'Amoxicillin 500mg', form: 'CAPSULE', dosage: '500 mg', frequency: 'TDS', durationDays: 7, instructions: 'After food' },
                      ])
                    }
                    className="text-xs text-sky-600 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Another Medicine</span>
                  </button>
                </div>

                {prescriptionItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-5">
                      <span className="text-[10px] text-slate-400">Medicine</span>
                      <input
                        type="text"
                        value={item.medicineName}
                        onChange={(e) => {
                          const copy = [...prescriptionItems];
                          copy[idx].medicineName = e.target.value;
                          setPrescriptionItems(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 mt-0.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400">Dosage</span>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => {
                          const copy = [...prescriptionItems];
                          copy[idx].dosage = e.target.value;
                          setPrescriptionItems(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 mt-0.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400">Frequency</span>
                      <select
                        value={item.frequency}
                        onChange={(e) => {
                          const copy = [...prescriptionItems];
                          copy[idx].frequency = e.target.value as any;
                          setPrescriptionItems(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 mt-0.5"
                      >
                        <option value="OD">OD (1/day)</option>
                        <option value="BD">BD (2/day)</option>
                        <option value="TDS">TDS (3/day)</option>
                        <option value="QID">QID (4/day)</option>
                        <option value="SOS">SOS (As needed)</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <span className="text-[10px] text-slate-400">Days</span>
                      <input
                        type="number"
                        value={item.durationDays}
                        onChange={(e) => {
                          const copy = [...prescriptionItems];
                          copy[idx].durationDays = Number(e.target.value);
                          setPrescriptionItems(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 mt-0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Doctor&apos;s Advice & Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Avoid cold beverages, drink plenty of warm fluids."
                  value={specialAdvice}
                  onChange={(e) => setSpecialAdvice(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrescription}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Issue & View Letterhead PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Order Lab Test */}
      {showLabModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <FlaskConical className="h-5 w-5 text-indigo-600" />
                <span>Order Laboratory Investigations</span>
              </h3>
              <button onClick={() => setShowLabModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">Select diagnostic tests to add to the laboratory queue:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableTests.map((t) => {
                  const isChecked = selectedTestIds.includes(t._id);
                  return (
                    <label
                      key={t._id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked ? 'bg-indigo-50/50 border-indigo-400' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTestIds([...selectedTestIds, t._id]);
                            else setSelectedTestIds(selectedTestIds.filter((id) => id !== t._id));
                          }}
                          className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">{t.name}</div>
                          <div className="text-[10px] text-slate-400">Sample: {t.sampleType}</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-700">₹{t.price}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowLabModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLabOrder}
                  disabled={selectedTestIds.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Order {selectedTestIds.length} Test(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
