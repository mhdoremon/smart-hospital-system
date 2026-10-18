import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  User, 
  FlaskConical, 
  Pill, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Camera, 
  Lock, 
  Unlock, 
  Clock, 
  FileText, 
  Send, 
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Activity,
  History,
  Phone
} from 'lucide-react';
import CameraScanner from '../common/CameraScanner';
import QRDisplay from '../common/QRDisplay';

export default function DoctorPortal({ sharedState, setSharedState }) {
  // Flaw 1: 4-digit Quick PIN Screen Lock
  const [screenLocked, setScreenLocked] = useState(false);
  const [quickPin, setQuickPin] = useState('1234');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Doctor Info
  const [doctorInfo] = useState({
    id: 'DOC-101',
    name: 'Dr. A. K. Gupta',
    specialty: 'General Medicine',
    room: 'Room 102'
  });

  // Active Patient / Encounter State
  const [roomQueue, setRoomQueue] = useState([]);
  const [activeEncounter, setActiveEncounter] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // SOAP Clinical Documentation
  const [soapNotes, setSoapNotes] = useState({
    subjective: 'Patient reports 2-day fever, sore throat, and fatigue.',
    objective: 'BP: 120/80 mmHg, Pulse: 88 bpm, SpO2: 98%, Temp: 101.2°F, Pharyngeal erythema present.',
    assessment: 'Acute Viral Pharyngitis vs Streptococcal Upper Respiratory Tract Infection',
    plan: 'Oral hydration, antipyretics, and throat swab investigation.'
  });

  // Diagnostic Lab Ordering State
  const [labTests, setLabTests] = useState([
    { name: 'Complete Blood Count (CBC) with Differential', selected: true },
    { name: 'C-Reactive Protein (CRP) Quantitative', selected: false },
    { name: 'Rapid Strep Throat Swab Antigen', selected: false },
    { name: 'Serum Creatinine & Electrolytes', selected: false }
  ]);
  const [labPriority, setLabPriority] = useState('STAT (Urgent)');
  const [generatedLabOrder, setGeneratedLabOrder] = useState(null);

  // E-Prescription State
  const [medications, setMedications] = useState([
    { name: 'Paracetamol 650mg', dosage: '1 Tab TDS x 3 Days', quantity: 10, barcode: '8902049110294', shelf: 'Rack-A | Shelf-1' },
    { name: 'Amoxicillin 500mg', dosage: '1 Cap TDS x 5 Days', quantity: 15, barcode: '8901032049102', shelf: 'Rack-C | Shelf-2' }
  ]);
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [allergyAlertData, setAllergyAlertData] = useState(null);
  const [overrideReason, setOverrideReason] = useState('Severe infection refractory to macrolides; critical clinical need');
  const [overrideAuthorizedBy, setOverrideAuthorizedBy] = useState('Medical Superintendent Dr. S. Bannerjee');
  const [generatedRx, setGeneratedRx] = useState(null);

  useEffect(() => {
    fetchDoctorQueue();
    const interval = setInterval(fetchDoctorQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update room queue when sharedState changes
  useEffect(() => {
    if (sharedState?.activeEncounter) {
      setRoomQueue(prev => {
        const index = prev.findIndex(e => e.encounterId === sharedState.activeEncounter.encounterId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...sharedState.activeEncounter };
          return updated;
        }
        return [sharedState.activeEncounter, ...prev];
      });
    }
  }, [sharedState]);

  const fetchDoctorQueue = async () => {
    try {
      const res = await fetch(`/api/v1/clinical/encounters?doctorId=${doctorInfo.id}`);
      const data = await res.json();
      if (data.ok) {
        setRoomQueue(data.encounters || []);
      }
    } catch (err) {
      console.warn('Doctor queue fetch error:', err);
    }
  };

  const handleScanPatientQR = async (token) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/clinical/qr/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, role: 'DOCTOR' })
      });
      const data = await res.json();
      if (data.ok) {
        setActiveEncounter(data.data.encounter);
        setPatientRecord(data.data.patientFullRecord);
        if (data.data.activeLabOrders?.length > 0) {
          setGeneratedLabOrder(data.data.activeLabOrders[0]);
        }
        if (data.data.activePrescriptions?.length > 0) {
          setGeneratedRx(data.data.activePrescriptions[0]);
        }
      } else {
        setErrorMsg(data.error || 'Invalid Patient Pass');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg('Failed to decrypt patient record');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateState = async (newState) => {
    if (!activeEncounter) return;
    try {
      const res = await fetch('/api/v1/clinical/encounter/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          newState,
          notes: JSON.stringify(soapNotes)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setActiveEncounter(data.encounter);
        fetchDoctorQueue();
      }
    } catch (err) {
      console.error('Update state error:', err);
    }
  };

  const handleOrderLabTests = async () => {
    if (!activeEncounter) return;
    const selected = labTests.filter(t => t.selected).map(t => t.name);
    if (selected.length === 0) {
      alert('Please select at least one laboratory investigation.');
      return;
    }

    try {
      const res = await fetch('/api/v1/clinical/order-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          tests: selected,
          priority: labPriority
        })
      });
      const data = await res.json();
      if (data.ok) {
        setGeneratedLabOrder(data.labOrder);
        setActiveEncounter(prev => ({ ...prev, state: 'PAUSED_LAB_PENDING', labOrderId: data.labOrder.orderId }));
        fetchDoctorQueue();
      }
    } catch (err) {
      console.error('Lab order error:', err);
    }
  };

  const handlePrescribeMedications = async (withOverride = false) => {
    if (!activeEncounter) return;
    try {
      const res = await fetch('/api/v1/clinical/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          medications,
          allergyOverride: withOverride,
          overrideReason: withOverride ? overrideReason : null,
          overrideAuthorizedBy: withOverride ? overrideAuthorizedBy : null
        })
      });
      const data = await res.json();
      if (data.ok) {
        setGeneratedRx(data.prescription);
        setAllergyModalOpen(false);
        setActiveEncounter(prev => ({ ...prev, state: 'PHARMACY_QUEUED', prescriptionId: data.prescription.prescriptionId }));
        fetchDoctorQueue();
      } else if (data.requiresOverride) {
        // Trigger Hard-Stop Modal
        setAllergyAlertData(data);
        setAllergyModalOpen(true);
      } else {
        alert(data.error || 'Prescription failed');
      }
    } catch (err) {
      console.error('Prescription error:', err);
    }
  };

  const handlePinUnlock = (e) => {
    e.preventDefault();
    if (enteredPin === quickPin) {
      setScreenLocked(false);
      setEnteredPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Screen locked screen (Architecture Flaw 1)
  if (screenLocked) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Doctor Screen Inactive</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter 4-digit quick PIN to resume clinical session (Default: 1234)
            </p>
          </div>

          <form onSubmit={handlePinUnlock} className="space-y-3">
            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-widest text-xl font-bold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {pinError && <p className="text-xs text-rose-600 font-semibold">Incorrect PIN code</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              Unlock Clinical Desk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            Doctor Clinical Suite & EHR
          </h2>
          <p className="text-xs text-slate-500">
            {doctorInfo.name} • {doctorInfo.specialty} • {doctorInfo.room}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreenLocked(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Lock Screen (PIN 1234)
          </button>
        </div>
      </div>

      {/* Main Grid: Room Queue & Active Patient EHR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Room Queue & CarePass Scanner */}
        <div className="lg:col-span-4 space-y-4">
          <CameraScanner 
            onScan={handleScanPatientQR}
            placeholder="Scan Patient CarePass QR"
          />

          {/* Active Queue List */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Room Queue ({roomQueue.length})
              </span>
              <button onClick={fetchDoctorQueue} className="text-slate-400 hover:text-slate-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar text-xs">
              {roomQueue.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No patients waiting in queue.</p>
              ) : (
                roomQueue.map((enc) => (
                  <div
                    key={enc.encounterId}
                    onClick={() => handleScanPatientQR(`CAREPASS:${enc.encounterId}`)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeEncounter?.encounterId === enc.encounterId
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-900">#{enc.tokenNumber} {enc.patientName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{enc.slot}</span>
                    </div>

                    {/* State Badges */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {enc.state === 'RESUMED_POST_LAB' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white animate-bounce flex items-center gap-1">
                          <FlaskConical className="w-3 h-3" />
                          RESULTS READY - RE-CALL
                        </span>
                      ) : enc.state === 'PAUSED_LAB_PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Lab In-Process
                        </span>
                      ) : enc.state === 'IN_CONSULTATION' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          In Consultation
                        </span>
                      ) : enc.state === 'PHARMACY_QUEUED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                          At Pharmacy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                          {enc.state}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Longitudinal EHR, AI Brief & Clinical Actions */}
        <div className="lg:col-span-8 space-y-5">
          {loading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Decrypting longitudinal patient EHR...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!activeEncounter && !loading && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Patient Currently Loaded in Room</h4>
              <p>Select a patient from the queue or scan a CarePass QR code to begin consultation.</p>
            </div>
          )}

          {activeEncounter && (
            <div className="space-y-5">
              {/* Patient Banner with Allergy Flag */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{activeEncounter.patientName}</h3>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                        {patientRecord?.uhid || activeEncounter.patientUhid}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Phone: {activeEncounter.patientPhone} • Complaint: <em>"{activeEncounter.complaint}"</em>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateState('IN_CONSULTATION')}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm"
                    >
                      Begin Consultation
                    </button>
                    <button
                      onClick={() => handleUpdateState('COMPLETED')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm"
                    >
                      Complete & Discharge
                    </button>
                  </div>
                </div>

                {/* CRITICAL ALLERGY ALERT BANNER */}
                {patientRecord?.allergies?.length > 0 && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold">DOCUMENTED SEVERE DRUG ALLERGIES: </span>
                        <span className="font-black text-rose-700 underline">
                          {patientRecord.allergies.join(', ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-rose-200 font-bold px-2 py-0.5 rounded text-rose-900">
                      Contraindication Hard-Stop Engaged
                    </span>
                  </div>
                )}

                {/* AI Briefing Module */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    AI Longitudinal Clinical Briefing
                  </div>
                  <ul className="list-disc pl-4 text-slate-700 space-y-0.5 text-[11px]">
                    <li>Patient has 3-year history of Type 2 Diabetes; last HbA1c was 6.8% under Metformin control.</li>
                    <li>Current chief complaint: Acute fever with pharyngitis. Baseline vitals elevated (Temp 101.2°F).</li>
                    <li><strong className="text-rose-700">Safety Flag:</strong> Documented anaphylactic / rash reaction to Penicillin derivatives. Avoid all beta-lactams.</li>
                  </ul>
                </div>
              </div>

              {/* SOAP Documentation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Clinical SOAP Note & Vitals
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subjective (S)</label>
                    <textarea
                      rows={2}
                      value={soapNotes.subjective}
                      onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Objective (O) / Vitals</label>
                    <textarea
                      rows={2}
                      value={soapNotes.objective}
                      onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assessment (A)</label>
                    <textarea
                      rows={2}
                      value={soapNotes.assessment}
                      onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Plan (P)</label>
                    <textarea
                      rows={2}
                      value={soapNotes.plan}
                      onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lab Order Panel */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-rose-600" />
                    Order Diagnostic Laboratory Investigations
                  </h4>
                  <span className="text-[11px] text-slate-400">Flow: Consultation pauses until lab report returns</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {labTests.map((test, idx) => (
                    <label key={test.name} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={test.selected}
                        onChange={(e) => {
                          const updated = [...labTests];
                          updated[idx].selected = e.target.checked;
                          setLabTests(updated);
                        }}
                        className="rounded text-rose-600"
                      />
                      <span>{test.name}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <select
                    value={labPriority}
                    onChange={(e) => setLabPriority(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="STAT (Urgent)">STAT (Urgent - 45 min)</option>
                    <option value="Routine">Routine (Same Day)</option>
                  </select>

                  <button
                    onClick={handleOrderLabTests}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Issue Signed Lab Requisition QR
                  </button>
                </div>

                {generatedLabOrder && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-900 block">Active Order: {generatedLabOrder.orderId}</span>
                      <span className="text-slate-600">Status: {generatedLabOrder.status} • Tube: {generatedLabOrder.tubeBarcode || 'Awaiting Collection'}</span>
                    </div>
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-rose-200">
                      LAB:{generatedLabOrder.orderId}
                    </span>
                  </div>
                )}
              </div>

              {/* Prescription & Allergy Hard-Stop Engine */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-teal-600" />
                    Electronic Prescription & Allergy Hard-Stop Engine
                  </h4>
                </div>

                {/* Medication List */}
                <div className="space-y-2 text-xs">
                  {medications.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-slate-500 ml-2 font-mono">({m.dosage})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        NDC: {m.barcode} • {m.shelf}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMedications([
                      ...medications,
                      { name: 'Cefuroxime Axetil 500mg', dosage: '1 Tab BD x 5 Days', quantity: 10, barcode: '8901032049102', shelf: 'Rack-C | Shelf-2' }
                    ])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Medication
                  </button>

                  <button
                    onClick={() => handlePrescribeMedications(false)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <Pill className="w-4 h-4" />
                    Sign & Transmit E-Prescription (RX_QR)
                  </button>
                </div>

                {generatedRx && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-900 block">Prescription Signed: {generatedRx.prescriptionId}</span>
                      <span className="text-slate-600">Status: {generatedRx.status} • Transmitted to Central Pharmacy</span>
                    </div>
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-teal-200">
                      RX:{generatedRx.prescriptionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ALLERGY HARD-STOP EMERGENCY OVERRIDE MODAL */}
      {allergyModalOpen && allergyAlertData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full border-2 border-rose-500 shadow-2xl space-y-4 text-xs">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertOctagon className="w-7 h-7 animate-bounce" />
              </div>
              <h3 className="text-base font-black text-rose-800 uppercase tracking-tight">
                CRITICAL ALLERGY HARD-STOP TRIGGERED
              </h3>
              <p className="text-rose-900 font-semibold leading-relaxed">
                {allergyAlertData.error}
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-1">
              <div className="font-bold">Detected Allergen: {allergyAlertData.allergen}</div>
              <p>Prescribing Penicillin or its derivatives to this patient is clinically contraindicated and automatically blocked by the hospital safety mesh.</p>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-800">
                Medical Superintendent Override Reason *
              </label>
              <textarea
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                placeholder="Clinical justification for emergency override..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Authorizing Authority Name *
              </label>
              <input
                type="text"
                value={overrideAuthorizedBy}
                onChange={(e) => setOverrideAuthorizedBy(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAllergyModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel & Change Meds
              </button>
              <button
                type="button"
                onClick={() => handlePrescribeMedications(true)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition-colors"
              >
                Execute Override & Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
