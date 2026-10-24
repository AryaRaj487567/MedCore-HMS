'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  Calendar,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Search,
} from 'lucide-react';

export function ReceptionistView() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Patient Form
  const [showRegModal, setShowRegModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '1995-05-15',
    gender: 'MALE',
    bloodGroup: 'B+',
    allergies: '',
  });

  // Booking Form
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<{ slot: string; isAvailable: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [reason, setReason] = useState('Routine consultation');

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, patRes] = await Promise.all([
        fetchApi('/doctors'),
        fetchApi('/patients?limit=50'),
      ]);
      setDoctors(docRes.data || []);
      setPatients(patRes.data || []);
      if (docRes.data?.length > 0) setSelectedDoctorId(docRes.data[0]._id || docRes.data[0].id);
      if (patRes.data?.length > 0) setSelectedPatientId(patRes.data[0]._id || patRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch doctor slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !bookingDate) return;
    fetchApi(`/doctors/${selectedDoctorId}/slots?date=${bookingDate}`)
      .then((res) => {
        setAvailableSlots(res.data.slots || []);
        const firstOpen = res.data.slots?.find((s: any) => s.isAvailable);
        if (firstOpen) setSelectedSlot(firstOpen.slot);
      })
      .catch(() => {});
  }, [selectedDoctorId, bookingDate]);

  // Handle Register Patient
  const handleRegisterPatient = async () => {
    try {
      const res = await fetchApi('/patients', {
        method: 'POST',
        body: JSON.stringify({
          ...newPatient,
          allergies: newPatient.allergies ? newPatient.allergies.split(',').map((s) => s.trim()) : [],
        }),
      });

      alert(`Patient registered successfully! MRN: ${res.data.mrn}`);
      setShowRegModal(false);
      loadData();
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    }
  };

  // Handle Book Appointment (Testing Concurrency & Double Booking)
  const handleBookAppointment = async () => {
    try {
      const res = await fetchApi('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          patientId: selectedPatientId,
          appointmentDate: bookingDate,
          timeSlot: selectedSlot,
          isEmergency,
          reason,
        }),
      });

      alert(`Appointment confirmed for ${bookingDate} at ${selectedSlot}! Real-time notification dispatched.`);
      setShowBookingModal(false);
      loadData();
    } catch (err: any) {
      alert(`Booking Failed: ${err.message} (${err.code || 'ERROR'})`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receptionist & Front Desk</h1>
          <p className="text-slate-500 text-sm mt-1">Patient registration, slot scheduling, and encounter intake</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowRegModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="h-4 w-4 text-sky-600" />
            <span>+ Register New Patient</span>
          </button>

          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span>+ Schedule Appointment</span>
          </button>
        </div>
      </div>

      {/* Patient Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-sky-600" />
            <h2 className="font-bold text-base text-slate-800">Hospital Patient Records ({patients.length})</h2>
          </div>
          <span className="text-xs text-slate-400">Scoped to City General</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="pb-3">MRN</th>
                <th className="pb-3">Patient Name</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Gender / Blood Group</th>
                <th className="pb-3">Allergies</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p._id || p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 font-mono font-bold text-sky-700">{p.mrn}</td>
                  <td className="py-3 font-semibold text-slate-900">
                    {p.user?.firstName || 'Patient'} {p.user?.lastName || ''}
                  </td>
                  <td className="py-3 text-slate-500">{p.user?.phone || 'N/A'}</td>
                  <td className="py-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm font-semibold">
                      {p.gender} • {p.bloodGroup || 'O+'}
                    </span>
                  </td>
                  <td className="py-3">
                    {p.allergies && p.allergies.length > 0 ? (
                      <span className="text-red-600 font-semibold">{p.allergies.join(', ')}</span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedPatientId(p._id || p.id);
                        setShowBookingModal(true);
                      }}
                      className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold"
                    >
                      Book Visit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register Patient */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-sky-600" />
                <span>Register New Hospital Patient</span>
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={newPatient.firstName}
                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newPatient.lastName}
                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DOB</label>
                  <input
                    type="date"
                    value={newPatient.dateOfBirth}
                    onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={newPatient.bloodGroup}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterPatient}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Generate MRN & Create Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Book Appointment */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                <span>Appointment Booking Engine</span>
              </h3>
              <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Emergency toggle */}
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                <div>
                  <div className="font-bold text-red-800">Emergency Encounter</div>
                  <div className="text-[11px] text-red-600">Bypasses schedule slot check & alerts doctor immediately</div>
                </div>
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="h-4 w-4 text-red-600 rounded-sm focus:ring-red-500"
                />
              </div>

              {/* Patient Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                >
                  {patients.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.user?.firstName} {p.user?.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Consulting Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                >
                  {doctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      Dr. {d.user?.firstName} {d.user?.lastName} — {d.specialization} (Fee: ₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              {/* Slots Grid */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Configured Time Slots</label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  {availableSlots.map(({ slot, isAvailable }) => (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable && !isEmergency}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        selectedSlot === slot
                          ? 'bg-sky-600 text-white'
                          : isAvailable || isEmergency
                          ? 'bg-slate-100 hover:bg-sky-100 text-slate-800'
                          : 'bg-slate-100 text-slate-300 line-through cursor-not-allowed'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookAppointment}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Booking ({selectedSlot || 'Select slot'})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
