import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Banknote, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  QrCode, 
  RefreshCw,
  Building2,
  Stethoscope,
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import QRDisplay from '../common/QRDisplay';

export default function PatientPortal({ sharedState, setSharedState, citizenUser, onOpenAuth }) {
  const [step, setStep] = useState(1);
  const [patientName, setPatientName] = useState(citizenUser?.name || 'Rahul Verma');
  const [phone, setPhone] = useState(citizenUser?.phone ? citizenUser.phone.replace(/\D/g, '').slice(-10) : '9876543210');
  const [complaint, setComplaint] = useState('Fever for 2 days with sore throat and dry cough');
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  useEffect(() => {
    if (citizenUser) {
      if (citizenUser.name) setPatientName(citizenUser.name);
      if (citizenUser.phone) setPhone(citizenUser.phone.replace(/\D/g, '').slice(-10));
    }
  }, [citizenUser]);
  
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('DOC-101');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [paymentMode, setPaymentMode] = useState('UPI_ONLINE');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activePass, setActivePass] = useState(null);

  // Load hospitals & doctors on mount or restore cached pass
  useEffect(() => {
    fetchDirectory();
    // Check localStorage for offline emergency pass
    const cached = localStorage.getItem('smart_hospital_patient_pass');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setActivePass(parsed);
      } catch (e) {
        console.error('Failed to parse cached pass:', e);
      }
    }
  }, []);

  // Update active pass if sharedState changed
  useEffect(() => {
    if (sharedState?.activeEncounter && activePass && sharedState.activeEncounter.encounterId === activePass.encounter.encounterId) {
      setActivePass(prev => ({
        ...prev,
        encounter: { ...prev.encounter, ...sharedState.activeEncounter }
      }));
    }
  }, [sharedState]);

  const fetchDirectory = async () => {
    try {
      const res = await fetch('/api/v1/directory/hospitals');
      const data = await res.json();
      if (data.ok) {
        setHospitals(data.hospitals || []);
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.warn('Network offline or directory fetch error:', err);
    }
  };

  const handleRunTriage = async () => {
    if (!complaint.trim()) return;
    setTriageLoading(true);
    try {
      const res = await fetch('/api/v1/triage/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint })
      });
      const data = await res.json();
      setTriageResult(data);
      if (!data.emergency) {
        setStep(2);
      }
    } catch (err) {
      console.error('Triage error:', err);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    setBookingLoading(true);
    try {
      const res = await fetch('/api/v1/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          phone,
          doctorId: selectedDoctorId,
          slot: selectedSlot,
          complaint,
          paymentMode
        })
      });
      const data = await res.json();
      if (data.ok) {
        setActivePass(data);
        localStorage.setItem('smart_hospital_patient_pass', JSON.stringify(data));
        if (setSharedState) {
          setSharedState(s => ({ ...s, activeEncounter: data.encounter }));
        }
        setStep(3);
      } else {
        alert(data.error || 'Booking failed');
      }
    } catch (err) {
      console.error('Booking failed:', err);
      alert('Network failure. Please check connection.');
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'BOOKED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHECKED_IN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'IN_CONSULTATION': return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'PAUSED_LAB_PENDING': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'RESUMED_POST_LAB': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PHARMACY_QUEUED': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'DISPENSED':
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Patient Self-Service Portal
          </h2>
          <p className="text-xs text-slate-500">AI Symptom Triage, Slot Reservation & Offline CarePass</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button 
            onClick={() => setStep(1)} 
            className={`px-3 py-1.5 rounded-lg transition-all ${step === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
          >
            1. Triage
          </button>
          <button 
            onClick={() => setStep(2)} 
            className={`px-3 py-1.5 rounded-lg transition-all ${step === 2 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
          >
            2. Slot & Pay
          </button>
          <button 
            onClick={() => setStep(3)} 
            disabled={!activePass}
            className={`px-3 py-1.5 rounded-lg transition-all ${step === 3 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >
            3. CarePass QR
          </button>
        </div>
      </div>

      {/* STEP 1: AI SYMPTOM TRIAGE & DEMOGRAPHICS */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Patient Details & Symptom Triage
            </h3>

            {citizenUser ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Citizen SSO: <strong>{citizenUser.name}</strong> ({citizenUser.phone})</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900">
                  MSG91 Verified
                </span>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Have a Citizen Account? Sign in via real SMS OTP or Google for auto-fill.</span>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 self-start sm:self-auto"
                >
                  Sign In / OTP
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter patient full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Describe Symptoms or Chief Complaint
                </label>
                <span className="text-[11px] text-slate-400">Natural Language or Hindi / English</span>
              </div>
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your health problem, e.g. severe headache with vomiting, or fever and throat pain..."
              />
            </div>

            {/* Quick symptom pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 text-[11px] self-center">Quick Presets:</span>
              <button
                type="button"
                onClick={() => setComplaint('Fever with chills and throat infection')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
              >
                Fever & Throat
              </button>
              <button
                type="button"
                onClick={() => setComplaint('Severe knee pain and difficulty walking')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
              >
                Knee & Bone Pain
              </button>
              <button
                type="button"
                onClick={() => setComplaint('Chest pain with heavy sweating and breathlessness')}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium"
              >
                Chest Pain (Emergency Test)
              </button>
            </div>

            <button
              onClick={handleRunTriage}
              disabled={triageLoading || !complaint.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {triageLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running AI Clinical Triage...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run AI Clinical Triage & Proceed
                </>
              )}
            </button>
          </div>

          {/* Triage Preview Panel */}
          <div className="space-y-4">
            {triageResult && triageResult.emergency && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 shadow-md">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
                  EMERGENCY RED-FLAG TRIGGERED
                </div>
                <p className="text-xs leading-relaxed font-semibold mb-3">
                  {triageResult.alert}
                </p>
                <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs">
                  <span className="font-bold text-rose-800">Assigned Counter: </span>
                  {triageResult.suggestedSpecialty}
                </div>
                <a 
                  href="tel:112"
                  className="mt-3 block text-center py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 shadow"
                >
                  Dial Emergency Services (112)
                </a>
              </div>
            )}

            {triageResult && !triageResult.emergency && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Triage Analysis Complete
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Recommended Specialty:</span>
                    <span className="font-bold text-slate-800 text-sm">{triageResult.specialty}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Urgency Rating:</span>
                    <span className="font-semibold text-slate-700">{triageResult.clinicalBrief?.urgencyLevel}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] text-slate-600">
                    {triageResult.clinicalBrief?.clinicalImpression}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Zero-Trust Guarantee
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Your appointment CarePass contains a rotating cryptographic token. Receptionists can only verify queue and payment; medical records remain sealed until scanned by your treating physician.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DOCTOR DIRECTORY & PAYMENT */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                Select Doctor & Hospital Node
              </h3>
              <span className="text-xs text-slate-400">Step 2 of 3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedDoctorId === doc.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                      <p className="text-xs text-blue-600 font-medium">{doc.specialty}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                      ★ {doc.rating}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 my-3 border-t border-b border-slate-100 py-2">
                    <div className="flex justify-between">
                      <span>Room Location:</span>
                      <span className="font-medium text-slate-700">{doc.room}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consultation Fee:</span>
                      <span className="font-bold text-slate-900">₹{doc.fee}</span>
                    </div>
                  </div>

                  {/* Slot selector */}
                  {selectedDoctorId === doc.id && (
                    <div className="mt-2 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600 block">Available Slots:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {doc.slots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedSlot(slot); }}
                            className={`py-1 text-[11px] rounded-lg font-medium border ${
                              selectedSlot === slot 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Payment Choice */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Select Payment Rail
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMode === 'UPI_ONLINE' 
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' 
                    : 'border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="paymode"
                    checked={paymentMode === 'UPI_ONLINE'}
                    onChange={() => setPaymentMode('UPI_ONLINE')}
                    className="text-blue-600"
                  />
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <div className="text-xs">
                    <div>Instant Online UPI / Card</div>
                    <span className="text-[11px] text-slate-400 font-normal">Pre-approved Fast-track token</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMode === 'CASH_AT_DESK' 
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' 
                    : 'border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="paymode"
                    checked={paymentMode === 'CASH_AT_DESK'}
                    onChange={() => setPaymentMode('CASH_AT_DESK')}
                    className="text-blue-600"
                  />
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <div className="text-xs">
                    <div>Pay Cash at Counter</div>
                    <span className="text-[11px] text-slate-400 font-normal">Settle with Receptionist</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Back to Triage
              </button>
              <button
                type="button"
                onClick={handleBookAppointment}
                disabled={bookingLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                {bookingLoading ? 'Reserving Slot...' : 'Confirm Booking & Generate CarePass'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CAREPASS APPOINTMENT PASS & TRACKING */}
      {step === 3 && activePass && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Digital Pass */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-200 font-bold">
                      Official Healthcare Appointment Pass
                    </span>
                    <h3 className="text-xl font-black mt-1 tracking-tight">
                      Token #{activePass.tokenNumber}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur rounded-lg text-xs font-mono font-bold">
                      {activePass.fallbackCode}
                    </span>
                    <div className="text-[10px] text-blue-200 mt-1">Fallback Reference</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-white/20 pt-3">
                  <div>
                    <span className="text-blue-200 block text-[10px]">Patient</span>
                    <span className="font-bold">{activePass.encounter.patientName}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 block text-[10px]">Doctor</span>
                    <span className="font-bold">{activePass.encounter.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 block text-[10px]">Location</span>
                    <span className="font-bold">{activePass.encounter.room}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 block text-[10px]">Slot Time</span>
                    <span className="font-bold">{activePass.encounter.slot}</span>
                  </div>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Live Hospital Workflow State:</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(activePass.encounter.state)}`}>
                    {activePass.encounter.state.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Patient QR presentation */}
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
                  <QRDisplay
                    value={activePass.qrToken}
                    title="Scan at Hospital Counter or Doctor's Desk"
                    fallbackCode={activePass.fallbackCode}
                    fallbackPin={activePass.fallbackPin}
                    size={190}
                  />

                  <div className="space-y-3 text-xs text-slate-600 max-w-xs">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                      <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Rolling Cryptographic Pass
                      </span>
                      <p className="text-[11px] text-blue-800">
                        This DataMatrix token contains signed authorization. Show your screen or thermal print slip at any terminal.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                        <WifiOff className="w-4 h-4 text-slate-500" />
                        Offline Basement Storage
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Cached in browser storage. Valid even without cellular reception in radiology or underground rooms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Journey Guidance */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hospital Visit Checklist
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span><strong>Reception Desk:</strong> {activePass.encounter.paymentStatus === 'PAID' ? 'Scan QR for instant fast-track token check-in.' : 'Pay cash at counter to validate ticket.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span><strong>Doctor Consultation:</strong> Proceed to <strong>{activePass.encounter.room}</strong> when your token #{activePass.tokenNumber} is announced.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span><strong>Lab & Pharmacy:</strong> Digital orders appear on your CarePass automatically if ordered.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setActivePass(null);
                setStep(1);
              }}
              className="w-full py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
