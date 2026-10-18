import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Send, 
  QrCode, 
  Upload, 
  RefreshCw,
  Activity,
  Check
} from 'lucide-react';
import CameraScanner from '../common/CameraScanner';

export default function LabPortal({ sharedState, setSharedState }) {
  const [activeOrder, setActiveOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [tubeBarcode, setTubeBarcode] = useState('SPEC-77291');
  const [etaMinutes, setEtaMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Structured Analyte Results
  const [results, setResults] = useState({
    hemoglobin: '13.8 g/dL (Normal)',
    wbc: '14,200 /cumm (HIGH ⚠️)',
    platelets: '2.10 Lakhs/cumm (Normal)',
    neutrophils: '82% (ELEVATED ⚠️)'
  });
  const [panicAlert, setPanicAlert] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update active order when sharedState changes
  useEffect(() => {
    if (sharedState?.activeLabOrder) {
      setActiveOrder(prev => {
        if (!prev || prev.orderId === sharedState.activeLabOrder.orderId) {
          return { ...prev, ...sharedState.activeLabOrder };
        }
        return prev;
      });
      fetchOrders();
    }
  }, [sharedState]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/v1/lab/orders');
      const data = await res.json();
      if (data.ok) {
        setOrdersList(data.orders || []);
      }
    } catch (err) {
      console.warn('Lab orders fetch error:', err);
    }
  };

  const handleScanLabQR = async (token) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/v1/clinical/qr/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, role: 'LAB' })
      });
      const data = await res.json();
      if (data.ok && data.type === 'LAB_ORDER') {
        setActiveOrder(data.data);
        setStatusMsg({ type: 'success', text: `Accessioned Order ${data.data.orderId} for ${data.data.patientName}` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Invalid Lab Requisition Token' });
      }
    } catch (err) {
      console.error('Scan error:', err);
      setStatusMsg({ type: 'error', text: 'Network failure reading lab token' });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSpecimen = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch('/api/v1/lab/collect-specimen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          tubeBarcode,
          etaMinutes
        })
      });
      const data = await res.json();
      if (data.ok) {
        setActiveOrder(data.order);
        setStatusMsg({ type: 'success', text: `Specimen tube ${tubeBarcode} bound. Status broadcast: ETA ${etaMinutes} mins.` });
        fetchOrders();
      }
    } catch (err) {
      console.error('Specimen collect error:', err);
    }
  };

  const handleUploadResults = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch('/api/v1/lab/upload-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          results,
          panicAlert
        })
      });
      const data = await res.json();
      if (data.ok) {
        setActiveOrder(data.order);
        setStatusMsg({ type: 'success', text: `Results released! Auto-alert sent to Doctor desk & patient app.` });
        fetchOrders();
      }
    } catch (err) {
      console.error('Upload result error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-rose-600" />
            Diagnostic Pathology Lab Portal
          </h2>
          <p className="text-xs text-slate-500">Specimen Tube Tracking, Structured Results Entry & Panic Limit Alerting</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
            <Activity className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            Lab Analyzer Mesh Online
          </span>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-500 text-sm font-bold">×</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Worklist */}
        <div className="lg:col-span-5 space-y-4">
          <CameraScanner 
            onScan={handleScanLabQR}
            placeholder="Scan Lab Order QR (LAB:LAB-xxxx)"
          />

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600" />
                Active Requisitions ({ordersList.length})
              </span>
              <button onClick={fetchOrders} className="text-slate-400 hover:text-slate-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar text-xs">
              {ordersList.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No pending laboratory orders.</p>
              ) : (
                ordersList.map((ord) => (
                  <div
                    key={ord.orderId}
                    onClick={() => handleScanLabQR(`LAB:${ord.orderId}`)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeOrder?.orderId === ord.orderId
                        ? 'bg-rose-50 border-rose-400 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-900">{ord.orderId} • {ord.patientName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : ord.status === 'SPECIMEN_COLLECTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Tests: {ord.tests.join(', ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Specimen Accessioning & Results Entry */}
        <div className="lg:col-span-7 space-y-5">
          {!activeOrder && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
              <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Investigation Selected</h4>
              <p>Scan a patient's Lab Requisition token to bind specimen tube and enter results.</p>
            </div>
          )}

          {activeOrder && (
            <div className="space-y-5">
              {/* Order Info Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                      Requisition Order Accession
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {activeOrder.orderId} - {activeOrder.patientName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prescribed by {activeOrder.doctorName} • Priority: <strong className="text-rose-700">{activeOrder.priority}</strong>
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activeOrder.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeOrder.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Ordered Investigations:</span>
                  <ul className="list-disc pl-4 text-slate-600">
                    {activeOrder.tests.map(t => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              </div>

              {/* Step 1: Vacutainer Tube Binding */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Step 1: Specimen Tube Barcode Binding & ETA
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vacutainer Tube Barcode</label>
                    <input
                      type="text"
                      value={tubeBarcode}
                      onChange={(e) => setTubeBarcode(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Estimated Turnaround (Minutes)</label>
                    <input
                      type="number"
                      value={etaMinutes}
                      onChange={(e) => setEtaMinutes(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCollectSpecimen}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Bind Tube & Broadcast Status: SAMPLE_IN_PROCESS
                </button>
              </div>

              {/* Step 2: Structured Results Entry */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 2: Enter Numerical Analyte Values
                  </h4>
                  <span className="text-[11px] text-rose-600 font-bold">Panic Limits Watch Active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hemoglobin (Hb)</label>
                    <input
                      type="text"
                      value={results.hemoglobin}
                      onChange={(e) => setResults({ ...results, hemoglobin: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Leukocyte Count (WBC)</label>
                    <input
                      type="text"
                      value={results.wbc}
                      onChange={(e) => setResults({ ...results, wbc: e.target.value })}
                      className="w-full p-2 border border-rose-300 bg-rose-50/50 rounded-xl focus:ring-2 focus:ring-rose-500 font-semibold text-rose-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Platelet Count</label>
                    <input
                      type="text"
                      value={results.platelets}
                      onChange={(e) => setResults({ ...results, platelets: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Neutrophils</label>
                    <input
                      type="text"
                      value={results.neutrophils}
                      onChange={(e) => setResults({ ...results, neutrophils: e.target.value })}
                      className="w-full p-2 border border-rose-300 bg-rose-50/50 rounded-xl focus:ring-2 focus:ring-rose-500 font-semibold text-rose-900"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  <input
                    type="checkbox"
                    checked={panicAlert}
                    onChange={(e) => setPanicAlert(e.target.checked)}
                    className="rounded text-rose-600"
                  />
                  <span>Attach Verbal Critical Panic Value Alert (WBC &gt; 14,000 / Neutrophils elevated)</span>
                </label>

                <button
                  onClick={handleUploadResults}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Sign, Generate PDF & Release Results to Doctor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
