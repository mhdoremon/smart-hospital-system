import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  User, 
  ShieldCheck, 
  ClipboardList, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  Wifi, 
  Lock,
  LogOut,
  ChevronRight,
  Shield,
  KeyRound
} from 'lucide-react';

import PatientPortal from './components/patient/PatientPortal';
import ManagerPortal from './components/manager/ManagerPortal';
import ReceptionistPortal from './components/receptionist/ReceptionistPortal';
import DoctorPortal from './components/doctor/DoctorPortal';
import LabPortal from './components/lab/LabPortal';
import PharmacyPortal from './components/pharmacy/PharmacyPortal';
import StaffAuthGate from './components/common/StaffAuthGate';

export default function App() {
  // Session State: null = Public Patient Mode | { role: 'DOCTOR' | 'RECEPTIONIST' | 'LAB' | 'PHARMACY' | 'MANAGER', ... }
  const [staffSession, setStaffSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('staff_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sharedState, setSharedState] = useState({
    activeEncounter: null,
    activeLabOrder: null,
    activePrescription: null,
    pairingToken: null
  });

  // Global WebSocket listener for real-time inter-frontend alerts
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}`);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingEvent(data);
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        console.warn('WS Init failed:', err);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const handleIncomingEvent = (event) => {
    // If manager triggered remote kill-switch, force logout staff terminal
    if (event.type === 'FORCE_LOGOUT') {
      handleLockStation();
      return;
    }

    const newNotice = {
      id: Date.now(),
      type: event.type,
      text: getNotificationText(event),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setNotifications(prev => [newNotice, ...prev.slice(0, 4)]);

    // Auto update shared state
    if (event.type === 'ENCOUNTER_CREATED' || event.type === 'ENCOUNTER_STATE_CHANGED') {
      setSharedState(s => ({ ...s, activeEncounter: event.payload }));
    } else if (event.type === 'LAB_ORDER_CREATED' || event.type === 'LAB_REPORT_COMPLETED') {
      setSharedState(s => ({ ...s, activeLabOrder: event.payload }));
    } else if (event.type === 'PRESCRIPTION_CREATED' || event.type === 'PRESCRIPTION_DISPENSED') {
      setSharedState(s => ({ ...s, activePrescription: event.payload }));
    }
  };

  const getNotificationText = (event) => {
    switch (event.type) {
      case 'ENCOUNTER_CREATED':
        return `New appointment: ${event.payload.patientName} (${event.payload.room})`;
      case 'STAFF_PAIRING_APPROVED':
        return `Station Paired: ${event.payload.staffName} (${event.payload.role})`;
      case 'LAB_ORDER_CREATED':
        return `Lab test ordered for ${event.payload.patientName} [STAT]`;
      case 'LAB_REPORT_COMPLETED':
        return `Lab Results Ready for Dr. review (${event.payload.orderId})`;
      case 'PRESCRIPTION_CREATED':
        return `Prescription sent to Pharmacy (${event.payload.prescriptionId})`;
      case 'PRESCRIPTION_DISPENSED':
        return `Medications dispensed to patient at Pharmacy`;
      case 'FORCE_LOGOUT':
        return `Terminal session revoked by Hospital Manager`;
      default:
        return `Event: ${event.type}`;
    }
  };

  const handleStaffLogin = (session) => {
    setStaffSession(session);
    try {
      sessionStorage.setItem('staff_session', JSON.stringify(session));
    } catch (e) {}
  };

  const handleLockStation = () => {
    setStaffSession(null);
    try {
      sessionStorage.removeItem('staff_session');
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Smart Hospital OS
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {staffSession ? `${staffSession.role} STATION` : 'CITIZEN PORTAL'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  {staffSession ? `Authenticated to: ${staffSession.room}` : 'Unified Multi-Tenant Healthcare Network'}
                </p>
              </div>
            </div>

            {/* Right Actions & Status */}
            <div className="flex items-center gap-3">
              {/* Event Mesh Indicator */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                wsConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'animate-pulse' : ''}`} />
                {wsConnected ? 'Live Mesh' : 'Connecting...'}
              </div>

              {/* Staff Authentication Gate Button vs Active Staff Lock Button */}
              {!staffSession ? (
                <button
                  onClick={() => setIsAuthGateOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Clinical Staff Access</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-800">{staffSession.staffName}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active Workstation Shift
                    </div>
                  </div>
                  <button
                    onClick={handleLockStation}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                    title="Lock terminal and return to Citizen Portal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Lock Station</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Live Activity Notification Ticker */}
      {notifications.length > 0 && (
        <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-blue-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Event</span>
            <span className="truncate">{notifications[0].text}</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px] shrink-0">{notifications[0].time}</span>
        </div>
      )}

      {/* Main View: Strictly Filtered by Authenticated Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!staffSession ? (
          /* Public / Citizen View: ONLY Patient Portal */
          <PatientPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : staffSession.role === 'DOCTOR' ? (
          /* Locked Doctor Station */
          <DoctorPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : staffSession.role === 'RECEPTIONIST' ? (
          /* Locked Receptionist Station */
          <ReceptionistPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : staffSession.role === 'LAB' ? (
          /* Locked Lab Station */
          <LabPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : staffSession.role === 'PHARMACY' ? (
          /* Locked Pharmacy Station */
          <PharmacyPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : staffSession.role === 'MANAGER' ? (
          /* Locked Executive Manager Console */
          <ManagerPortal sharedState={sharedState} setSharedState={setSharedState} />
        ) : (
          <div className="p-8 text-center text-slate-500">Unrecognized workstation role.</div>
        )}
      </main>

      {/* Staff Authentication Gate Modal */}
      <StaffAuthGate 
        isOpen={isAuthGateOpen} 
        onClose={() => setIsAuthGateOpen(false)} 
        onAuthenticated={handleStaffLogin} 
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Hospital Multi-Tenant Healthcare OS • Zero-Trust Role-Based Isolation</span>
          <span className="font-mono text-[11px] text-slate-400">Node: churuone.in • Secure FHIR Core</span>
        </div>
      </footer>
    </div>
  );
}
