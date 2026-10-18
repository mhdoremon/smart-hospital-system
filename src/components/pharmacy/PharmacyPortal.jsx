import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Barcode, 
  Printer, 
  PackageCheck, 
  Lock, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Check, 
  Clock, 
  Archive 
} from 'lucide-react';
import CameraScanner from '../common/CameraScanner';

export default function PharmacyPortal({ sharedState, setSharedState }) {
  const [activeRx, setActiveRx] = useState(null);
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [scannedPackBarcode, setScannedPackBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [lockoutAlert, setLockoutAlert] = useState(null);
  const [showDosageLabel, setShowDosageLabel] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
    const interval = setInterval(fetchPrescriptions, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update active prescription when sharedState changes
  useEffect(() => {
    if (sharedState?.activePrescription) {
      setActiveRx(prev => {
        if (!prev || prev.prescriptionId === sharedState.activePrescription.prescriptionId) {
          return { ...prev, ...sharedState.activePrescription };
        }
        return prev;
      });
      fetchPrescriptions();
    }
  }, [sharedState]);

  const fetchPrescriptions = async () => {
    try {
      const res = await fetch('/api/v1/pharmacy/prescriptions');
      const data = await res.json();
      if (data.ok) {
        setPrescriptionsList(data.prescriptions || []);
      }
    } catch (err) {
      console.warn('Prescriptions fetch error:', err);
    }
  };

  const handleScanRxQR = async (token) => {
    setLoading(true);
    setStatusMsg(null);
    setLockoutAlert(null);
    try {
      const res = await fetch('/api/v1/clinical/qr/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, role: 'PHARMACY' })
      });
      const data = await res.json();
      if (data.ok && data.type === 'PRESCRIPTION') {
        setActiveRx(data.data);
        if (data.data.status === 'DISPENSED') {
          setLockoutAlert('SECURITY ALERT: This prescription has already been dispensed! Double-dispensing is prohibited.');
        } else {
          setStatusMsg({ type: 'info', text: `Loaded Prescription ${data.data.prescriptionId} for ${data.data.patientName}` });
        }
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Invalid Prescription Token' });
      }
    } catch (err) {
      console.error('Scan error:', err);
      setStatusMsg({ type: 'error', text: 'Network failure resolving prescription token' });
    } finally {
      setLoading(false);
    }
  };

  const handleDispenseMedications = async (verifyBarcode = true) => {
    if (!activeRx) return;
    setLoading(true);
    setStatusMsg(null);
    setLockoutAlert(null);

    try {
      const res = await fetch('/api/v1/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId: activeRx.prescriptionId,
          scannedBarcode: verifyBarcode && scannedPackBarcode ? scannedPackBarcode : 'BYPASS_VERIFICATION'
        })
      });
      const data = await res.json();

      if (data.ok) {
        setActiveRx(data.prescription);
        setShowDosageLabel(data.prescription);
        setStatusMsg({ type: 'success', text: 'Medications dispensed successfully and inventory deducted.' });
        fetchPrescriptions();
      } else {
        // Double-dispense replay attack or lockout
        if (res.status === 409) {
          setLockoutAlert(data.error || 'SECURITY LOCKOUT: Double-dispense replay blocked.');
        } else {
          setStatusMsg({ type: 'error', text: data.error || 'Dispense failed' });
        }
      }
    } catch (err) {
      console.error('Dispense error:', err);
      setStatusMsg({ type: 'error', text: 'Network error executing dispense' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Pharmacy / Medical Dispense POS
          </h2>
          <p className="text-xs text-slate-500">Controlled Electronic Dispensing, Shelf Locating & Anti-Double-Dispense Lock</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Anti-Replay Lock Active
          </span>
        </div>
      </div>

      {/* Lockout Warning Banner */}
      {lockoutAlert && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-rose-900 text-xs flex items-start gap-3 shadow-md">
          <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-800 uppercase tracking-tight">
              ANTI-DOUBLE-DISPENSE LOCK ENGAGED
            </h4>
            <p className="font-semibold leading-relaxed">{lockoutAlert}</p>
            <p className="text-[11px] text-rose-700">
              The cryptographic token for this prescription has already been consumed. Replay attacks are strictly prevented.
            </p>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : statusMsg.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-500 text-sm font-bold">×</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Scanner & Rx Worklist */}
        <div className="lg:col-span-5 space-y-4">
          <CameraScanner 
            onScan={handleScanRxQR}
            placeholder="Scan Prescription QR (RX:RX-xxxx)"
          />

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                Prescription Queue ({prescriptionsList.length})
              </span>
              <button onClick={fetchPrescriptions} className="text-slate-400 hover:text-slate-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar text-xs">
              {prescriptionsList.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No active prescriptions.</p>
              ) : (
                prescriptionsList.map((rx) => (
                  <div
                    key={rx.prescriptionId}
                    onClick={() => handleScanRxQR(`RX:${rx.prescriptionId}`)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeRx?.prescriptionId === rx.prescriptionId
                        ? 'bg-teal-50 border-teal-500 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-900">{rx.prescriptionId} • {rx.patientName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rx.status === 'DISPENSED' ? 'bg-slate-200 text-slate-700' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {rx.medications.map(m => m.name).join(', ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Prescription Details, Shelf Locating & Dispense Action */}
        <div className="lg:col-span-7 space-y-5">
          {!activeRx && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
              <Pill className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Prescription Loaded</h4>
              <p>Scan a patient's RX_QR code to view medication list, locate shelves, and dispense.</p>
            </div>
          )}

          {activeRx && (
            <div className="space-y-5">
              {/* Rx Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                      Prescription Order
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {activeRx.prescriptionId} - {activeRx.patientName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prescribed by {activeRx.doctorName} • Issued: {new Date(activeRx.issuedAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activeRx.status === 'DISPENSED' ? 'bg-slate-200 text-slate-800' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {activeRx.status}
                  </span>
                </div>

                {activeRx.allergyOverride && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Formal Medical Superintendent Override Applied: </span>
                      "{activeRx.overrideReason}" ({activeRx.overrideAuthorizedBy})
                    </div>
                  </div>
                )}
              </div>

              {/* Medication Shelf Locating Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-teal-600" />
                  Prescribed Drugs & Pharmacy Bin / Shelf Location
                </h4>

                <div className="space-y-3">
                  {activeRx.medications.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Dosage: <strong>{m.dosage}</strong> • Qty: <strong>{m.quantity}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700">
                          📍 {m.shelf}
                        </div>
                        <button
                          type="button"
                          onClick={() => setScannedPackBarcode(m.barcode)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-mono"
                          title="Simulate barcode scan"
                        >
                          Auto-Scan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pack Barcode Verification & Dispense Action */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-teal-600" />
                  Manufacturer Pack Barcode Verification (NDC / GS1)
                </h4>

                <div className="space-y-2 text-xs">
                  <label className="block font-semibold text-slate-700">
                    Scan or Enter Physical Package Barcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedPackBarcode}
                      onChange={(e) => setScannedPackBarcode(e.target.value)}
                      placeholder="e.g. 8901032049102"
                      className="flex-1 p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setScannedPackBarcode('8901032049102')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      Preset Code
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleDispenseMedications(true)}
                  disabled={loading || activeRx.status === 'DISPENSED'}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  {activeRx.status === 'DISPENSED' 
                    ? 'Prescription Already Dispensed (Locked)' 
                    : 'Verify Barcode, Deduct Stock & Dispense Meds'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* THERMAL DOSAGE LABEL MODAL */}
      {showDosageLabel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full border border-slate-300 shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 border-dashed border-slate-300">
              <h4 className="font-bold text-sm tracking-tight">SMART HOSPITAL PHARMACY</h4>
              <p className="text-[10px] text-slate-500">OFFICIAL PATIENT MEDICATION LABEL</p>
              <div className="text-lg font-black mt-1 text-slate-900">
                RX #{showDosageLabel.prescriptionId}
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div>Patient: <strong>{showDosageLabel.patientName}</strong></div>
              <div>Prescriber: <strong>{showDosageLabel.doctorName}</strong></div>
              <div>Dispensed: <strong>{new Date().toLocaleString()}</strong></div>
              <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                <span className="font-bold block">Medications & Instructions:</span>
                {showDosageLabel.medications.map((m, i) => (
                  <div key={i} className="p-1 bg-slate-50 rounded">
                    • <strong>{m.name}</strong>: {m.dosage} (Qty: {m.quantity})
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-dashed border-slate-300">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Label Slip
              </button>
              <button
                onClick={() => setShowDosageLabel(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
