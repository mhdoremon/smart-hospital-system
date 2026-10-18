import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Keyboard, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CameraScanner({ onScan, placeholder = "Scan QR Code", active = true }) {
  const [useManual, setUseManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    if (!active || useManual) return;

    const scannerId = "html5-qr-reader";
    let scanner = null;

    try {
      scanner = new Html5QrcodeScanner(
        scannerId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          if (decodedText) {
            scanner.clear().catch(console.error);
            onScan(decodedText);
          }
        },
        (error) => {
          // Normal background search frame
        }
      );
    } catch (err) {
      console.warn("Scanner camera init failed, defaulting to manual", err);
      setUseManual(true);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [active, useManual, onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
      <div className="flex justify-between items-center w-full mb-3 pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-blue-600" />
          {placeholder}
        </span>
        <button
          onClick={() => setUseManual(!useManual)}
          type="button"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
        >
          <Keyboard className="w-3.5 h-3.5" />
          {useManual ? 'Use Camera' : 'Type Code Manually'}
        </button>
      </div>

      {!useManual ? (
        <div className="w-full max-w-[280px]">
          <div id="html5-qr-reader" className="overflow-hidden rounded-xl border border-slate-200" />
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Point camera at Patient Pass or Staff Pairing QR
          </p>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. CAREPASS:ENC-1234 or Fallback Code"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Process Code
          </button>
        </form>
      )}

      {scanError && (
        <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {scanError}
        </div>
      )}
    </div>
  );
}
