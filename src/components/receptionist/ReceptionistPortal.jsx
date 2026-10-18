import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  UserPlus, 
  Camera, 
  Printer, 
  Banknote, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  QrCode,
  Lock,
  Unlock,
  Building2,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import CameraScanner from '../common/CameraScanner';
import QRDisplay from '../common/QRDisplay';

export default function ReceptionistPortal({ sharedState, setSharedState }) {
  const [stationUnlocked, setStationUnlocked] = useState(true);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'register', 'queue'
  
  // Walk-in form state
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState('Male');
  const [doctorId, setDoctorId] = useState('DOC-101');
  const [slot, setSlot] = useState('11:00 AM');
  const [complaint, setComplaint] = useState('Walk-in Consultation');
  
  const [doctors, setDoctors] = useState([]);
  const [resolvedRecord, setResolvedRecord] = useState(null);
  const [resolveError, setResolveError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showThermalSlip, setShowThermalSlip] = useState(null);

  useEffect(() => {
    fetchQueue();
    fetchDoctors();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/v1/receptionist/queue');
      const data = await res.json();
      if (data.ok) {
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.warn('Queue fetch error:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/v1/directory/hospitals');
      const data = await res.json();
      if (data.ok) {
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.warn('Doctor fetch error:', err);
    }
  };

  const handleScanCode = async (code) => {
    setLoading(true);
    setResolveError(null);
    setResolvedRecord(null);

    try {
      const res = await fetch('/api/v1/clinical/qr/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: code, role: 'RECEPTIONIST' })
      });
      const data = await res.json();

      if (data.ok) {
        setResolvedRecord(data.data);
      } else {
        setResolveError(data.error || 'Failed to resolve token');
      }
    } catch (err) {
      console.error('QR resolve error:', err);
      setResolveError('Network communication error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWalkIn = async (e) => {
    e.preventDefault();
    if (!patientName || !phone) {
      alert('Patient Name and Phone are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          phone,
          doctorId,
          slot,
          complaint,
          paymentMode: 'CASH_AT_DESK'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setShowThermalSlip(data);
        fetchQueue();
        setPatientName('');
        setPhone('');
      } else {
        alert(data.error || 'Walk-in registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectCash = async (encounterId) => {
    try {
      const res = await fetch('/api/v1/receptionist/collect-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterId })
      });
      const data = await res.json();
      if (data.ok) {
        if (resolvedRecord && resolvedRecord.encounterId === encounterId) {
          setResolvedRecord(prev => ({ ...prev, paymentStatus: 'PAID' }));
        }
        fetchQueue();
      }
    } catch (err) {
      console.error('Collect cash error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            Reception Desk & Walk-in Terminal
          </h2>
          <p className="text-xs text-slate-500">Fast-track Walk-in Registration, Cash Handling & Zero-Leak HIPAA Redaction</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Zero-Leak HIPAA Guard Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'scan' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          1. Scan Patient CarePass / Search
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'register' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          2. New Walk-in Registration
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'queue' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          3. Today's Counter Queue ({queue.length})
        </button>
      </div>

      {/* TAB 1: SCAN PATIENT QR OR SEARCH */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <CameraScanner 
              onScan={handleScanCode} 
              placeholder="Scan Patient Pass or Fallback Token"
            />

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block">Reception Privacy Guarantee:</span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Receptionists only see administrative info (token #, patient name, room assignment, cash status).
                Past clinical history, medical diagnoses, lab investigations, and prescriptions are strictly sealed.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {loading && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Verifying CarePass against Zero-Trust resolver...</p>
              </div>
            )}

            {resolveError && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-800">Authorization / Access Blocked</h4>
                  <p className="mt-1">{resolveError}</p>
                </div>
              </div>
            )}

            {resolvedRecord && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Validated Patient Encounter
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {resolvedRecord.patientName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Encounter: {resolvedRecord.encounterId}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">
                      Token #{resolvedRecord.tokenNumber}
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">{resolvedRecord.fallbackCode}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Doctor:</span>
                    <span className="font-bold text-slate-800">{resolvedRecord.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Room / Chamber:</span>
                    <span className="font-bold text-slate-800">{resolvedRecord.room}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Appointment Slot:</span>
                    <span className="font-medium text-slate-700">{resolvedRecord.slot}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Consultation State:</span>
                    <span className="font-bold text-blue-600">{resolvedRecord.state}</span>
                  </div>
                </div>

                {/* Cash Payment Section */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">Payment Status:</span>
                    <span className={`text-xs font-bold ${resolvedRecord.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600 font-black'}`}>
                      {resolvedRecord.paymentStatus === 'PAID' ? '✓ PAID IN FULL (₹500)' : '⚠️ PENDING CASH COLLECTION (₹500)'}
                    </span>
                  </div>

                  {resolvedRecord.paymentStatus !== 'PAID' ? (
                    <button
                      onClick={() => handleCollectCash(resolvedRecord.encounterId)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                    >
                      <Banknote className="w-4 h-4" />
                      Collect Cash (₹500)
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                      Receipt Settled
                    </span>
                  )}
                </div>

                {/* HIPAA Privacy Badge */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{resolvedRecord._securityNotice || 'Clinical records redacted under zero-leak policy.'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WALK-IN REGISTRATION */}
      {activeTab === 'register' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-600" />
            Walk-in Patient Counter Registration
          </h3>

          <form onSubmit={handleRegisterWalkIn} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Doctor & Department</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty} - {d.room})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Immediate Slot</label>
                <input
                  type="text"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chief Complaint (Administrative)</label>
              <input
                type="text"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Brief reason for consultation"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Register Walk-in & Print Thermal Slip
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: COUNTER QUEUE */}
      {activeTab === 'queue' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Today's Patient Queue ({queue.length})
            </h3>
            <button
              onClick={fetchQueue}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Queue
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {queue.length === 0 ? (
              <p className="text-slate-400 text-center py-6">No patient encounters in queue.</p>
            ) : (
              queue.map((enc) => (
                <div
                  key={enc.encounterId}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center font-mono">
                      #{enc.tokenNumber}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{enc.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        {enc.doctorName} • {enc.room} • {enc.slot}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      enc.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {enc.paymentStatus}
                    </span>
                    <button
                      onClick={() => handleScanCode(`CAREPASS:${enc.encounterId}`)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs"
                    >
                      View Desk Slip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* THERMAL PRINT MODAL (FLAW 2 SOLUTION) */}
      {showThermalSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full border border-slate-300 shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 border-dashed border-slate-300">
              <h4 className="font-bold text-sm tracking-tight">SMART HOSPITAL NETWORK</h4>
              <p className="text-[10px] text-slate-500">OFFICIAL WALK-IN APPOINTMENT SLIP</p>
              <div className="text-2xl font-black mt-2 text-slate-900">
                TOKEN #{showThermalSlip.tokenNumber}
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-bold">{showThermalSlip.encounter.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{showThermalSlip.encounter.patientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Doctor:</span>
                <span className="font-bold">{showThermalSlip.encounter.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span>Room / Chamber:</span>
                <span className="font-bold">{showThermalSlip.encounter.room}</span>
              </div>
              <div className="flex justify-between">
                <span>Slot:</span>
                <span>{showThermalSlip.encounter.slot}</span>
              </div>
            </div>

            {/* High Density 2D DataMatrix QR */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
              <QRDisplay
                value={showThermalSlip.qrToken}
                fallbackCode={showThermalSlip.fallbackCode}
                fallbackPin={showThermalSlip.fallbackPin}
                size={140}
              />
              <span className="text-[10px] text-slate-500 mt-2 text-center">
                Valid for 12 Hours • Paper & Mobile Scan Compatible
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-dashed border-slate-300">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Physical Slip
              </button>
              <button
                onClick={() => setShowThermalSlip(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
