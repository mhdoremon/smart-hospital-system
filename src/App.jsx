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
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import PatientPortal from './components/patient/PatientPortal';
import ManagerPortal from './components/manager/ManagerPortal';
import ReceptionistPortal from './components/receptionist/ReceptionistPortal';
import DoctorPortal from './components/doctor/DoctorPortal';
import LabPortal from './components/lab/LabPortal';
import PharmacyPortal from './components/pharmacy/PharmacyPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
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
        const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
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

  const tabs = [
    { id: 'patient', label: '1. Patient Portal', icon: User, color: 'text-blue-600' },
    { id: 'manager', label: '2. Manager Console', icon: ShieldCheck, color: 'text-purple-600' },
    { id: 'receptionist', label: '3. Reception Desk', icon: ClipboardList, color: 'text-amber-600' },
    { id: 'doctor', label: '4. Doctor Suite', icon: Stethoscope, color: 'text-emerald-600' },
    { id: 'lab', label: '5. Diagnostic Lab', icon: FlaskConical, color: 'text-rose-600' },
    { id: 'pharmacy', label: '6. Pharmacy POS', icon: Pill, color: 'text-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Smart Hospital OS
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Multi-Tenant
                  </span>
                </h1>
                <p className="text-xs text-slate-500">Zero-Trust Unified Healthcare Platform</p>
              </div>
            </div>

            {/* Status & Live Indicators */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                wsConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'animate-pulse' : ''}`} />
                {wsConnected ? 'Event Mesh Live' : 'Connecting Mesh...'}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-200">
                <span className="font-medium">City Node:</span>
                <span className="font-mono font-semibold text-slate-800">Churu Central Hospital</span>
              </div>
            </div>
          </div>

          {/* Portal Switcher Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 py-2 border-t border-slate-100 custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Live Activity Notification Ticker */}
      {notifications.length > 0 && (
        <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-blue-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Real-Time</span>
            <span className="truncate">{notifications[0].text}</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px] shrink-0">{notifications[0].time}</span>
        </div>
      )}

      {/* Main Content Area Rendering Active Portal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'patient' && (
          <PatientPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
        {activeTab === 'manager' && (
          <ManagerPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
        {activeTab === 'receptionist' && (
          <ReceptionistPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
        {activeTab === 'doctor' && (
          <DoctorPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
        {activeTab === 'lab' && (
          <LabPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
        {activeTab === 'pharmacy' && (
          <PharmacyPortal sharedState={sharedState} setSharedState={setSharedState} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>Smart Hospital Multi-Tenant Healthcare OS • Render & Docker Ready • Powered by Medplum & Logto</p>
      </footer>
    </div>
  );
}
