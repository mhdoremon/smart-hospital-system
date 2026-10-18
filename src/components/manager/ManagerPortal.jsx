import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  QrCode, 
  Power, 
  Users, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Laptop, 
  Lock, 
  Unlock,
  Radio,
  FileText,
  Activity
} from 'lucide-react';
import QRDisplay from '../common/QRDisplay';

export default function ManagerPortal({ sharedState, setSharedState }) {
  const [stationId, setStationId] = useState('STATION-OPD-102');
  const [targetRole, setTargetRole] = useState('DOCTOR');
  const [staffName, setStaffName] = useState('Dr. A. K. Gupta');
  const [room, setRoom] = useState('Room 102');
  
  const [pairingData, setPairingData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [loadingPairing, setLoadingPairing] = useState(false);
  const [activeStations, setActiveStations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionMessage, setActionMessage] = useState(null);

  // Poll active stations and audit logs
  useEffect(() => {
    fetchActiveStations();
    fetchAuditLogs();
    const interval = setInterval(() => {
      fetchActiveStations();
      fetchAuditLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for 45s TOTP pairing window
  useEffect(() => {
    if (!pairingData || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingData, secondsLeft]);

  const fetchActiveStations = async () => {
    try {
      const res = await fetch('/api/v1/auth/pairing/active-stations');
      const data = await res.json();
      if (data.ok) {
        setActiveStations(data.activeStations || []);
      }
    } catch (err) {
      console.warn('Error fetching stations:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit/logs');
      const data = await res.json();
      if (data.ok) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    }
  };

  const generatePairingQR = async () => {
    setLoadingPairing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/v1/auth/pairing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, targetRole })
      });
      const data = await res.json();
      if (data.ok) {
        setPairingData(data);
        setSecondsLeft(data.expiresInSeconds || 45);
      }
    } catch (err) {
      console.error('Pairing initiate error:', err);
    } finally {
      setLoadingPairing(false);
    }
  };

  const handleSimulateApproval = async () => {
    if (!pairingData) return;
    try {
      const res = await fetch('/api/v1/auth/pairing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: pairingData.pairId,
          pairingToken: pairingData.pairingToken,
          staffName,
          assignedRole: targetRole,
          room,
          stationId
        })
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage({ type: 'success', text: `Station ${stationId} successfully paired for 8-hour shift!` });
        setPairingData(null);
        fetchActiveStations();
        fetchAuditLogs();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Approval failed' });
      }
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleRevokeStation = async (staffToken, targetStationId) => {
    try {
      const res = await fetch('/api/v1/auth/pairing/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffToken, stationId: targetStationId })
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage({ type: 'revoked', text: `Terminal ${targetStationId} terminated immediately via Kill-Switch (<100ms)!` });
        fetchActiveStations();
        fetchAuditLogs();
      } else {
        alert(data.error || 'Revoke failed');
      }
    } catch (err) {
      console.error('Revoke error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Hospital Operations Command Center
          </h2>
          <p className="text-xs text-slate-500">Cryptographic Workstation Pairing, Shift JWT Minting & Instant Kill-Switch</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
            <Radio className="w-3.5 h-3.5 animate-pulse text-purple-600" />
            Zero-Trust Gateway Online
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : actionMessage.type === 'revoked'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-500 hover:text-slate-700 text-sm font-bold">×</button>
        </div>
      )}

      {/* Main Grid: Provisioning & Active Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Station Provisioning & Dynamic QR */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Laptop className="w-4 h-4 text-purple-600" />
              Provision New Staff Station
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Department & Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    if (e.target.value === 'DOCTOR') {
                      setStaffName('Dr. A. K. Gupta');
                      setStationId('STATION-OPD-102');
                      setRoom('Room 102');
                    } else if (e.target.value === 'RECEPTIONIST') {
                      setStaffName('Priya Sharma (Counter 1)');
                      setStationId('STATION-REC-01');
                      setRoom('Reception Desk A');
                    } else if (e.target.value === 'LAB') {
                      setStaffName('Anil Verma (Senior Tech)');
                      setStationId('STATION-LAB-04');
                      setRoom('Biochemistry Lab');
                    } else if (e.target.value === 'PHARMACY') {
                      setStaffName('Sunita Rao (Lead Pharmacist)');
                      setStationId('STATION-PHARM-02');
                      setRoom('Central Dispensary');
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  <option value="DOCTOR">Doctor Clinical Suite (EHR & Rx)</option>
                  <option value="RECEPTIONIST">Reception Desk (Walk-in & Cash)</option>
                  <option value="LAB">Diagnostic Lab (Specimen & Results)</option>
                  <option value="PHARMACY">Pharmacy POS (Dispensing & Stock)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Member Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Station ID</label>
                  <input
                    type="text"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room / Counter</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={generatePairingQR}
                disabled={loadingPairing}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {loadingPairing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                Generate 45s Dynamic Pairing QR
              </button>
            </div>
          </div>

          {/* Dynamic Pairing QR Display */}
          {pairingData && (
            <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-md text-center space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Dynamic TOTP Pairing QR
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                  secondsLeft > 10 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                }`}>
                  {secondsLeft}s remaining
                </span>
              </div>

              {secondsLeft > 0 ? (
                <>
                  <QRDisplay
                    value={pairingData.pairingToken}
                    title="Point Station Camera at this Code"
                    fallbackCode={pairingData.pairId}
                    size={180}
                  />

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(secondsLeft / 45) * 100}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSimulateApproval}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Station Handshake
                    </button>
                    <button
                      onClick={generatePairingQR}
                      className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl"
                      title="Refresh QR"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
                  <p className="text-xs font-bold text-rose-800">
                    Pairing QR Token Expired (45s window elapsed)
                  </p>
                  <button
                    onClick={generatePairingQR}
                    className="w-full py-2 bg-purple-600 text-white font-semibold text-xs rounded-xl hover:bg-purple-700"
                  >
                    Generate New QR Token
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Active Terminals & Kill-Switch Grid */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Active Paired Workstations ({activeStations.length})
                </h3>
                <p className="text-[11px] text-slate-400">Live authenticated terminal sessions</p>
              </div>
              <button
                onClick={fetchActiveStations}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {activeStations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                <Laptop className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                No active staff stations paired. Use the provisioning tool to connect a terminal.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStations.map((station) => (
                  <div
                    key={station.staffToken}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-bold text-slate-900 text-xs">{station.staffName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                          {station.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                        <span>Terminal: <strong className="font-mono text-slate-700">{station.stationId}</strong></span>
                        <span>Location: <strong>{station.room}</strong></span>
                        <span>Expires: <strong>8 hrs</strong></span>
                      </div>
                    </div>

                    {/* Kill-Switch Trigger Button */}
                    <button
                      onClick={() => handleRevokeStation(station.staffToken, station.stationId)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-end sm:self-center shrink-0"
                    >
                      <Power className="w-3.5 h-3.5" />
                      Revoke Now (Kill-Switch)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Trail Stream */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Security Audit & Access Event Trail
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-xs">No audit events recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 text-[11px] ${
                      log.severity === 'CRITICAL' || log.severity === 'SECURITY_ALERT'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : log.severity === 'WARN'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                          log.severity === 'CRITICAL' ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {log.action}
                        </span>
                        <span>{log.userOrRole}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{log.details}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
