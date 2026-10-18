import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({ value, title, fallbackCode, fallbackPin, size = 180 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('QR Render Error:', error);
      });
    }
  }, [value, size]);

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
      {title && <h4 className="font-semibold text-slate-800 text-sm mb-2">{title}</h4>}
      <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-100">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>
      
      {(fallbackCode || fallbackPin) && (
        <div className="mt-3 w-full pt-3 border-t border-slate-100 flex flex-col gap-1 text-xs">
          {fallbackCode && (
            <div className="flex justify-between items-center text-slate-600 bg-slate-50 px-2 py-1 rounded">
              <span className="font-medium">Fallback Code:</span>
              <span className="font-mono font-bold text-blue-600">{fallbackCode}</span>
            </div>
          )}
          {fallbackPin && (
            <div className="flex justify-between items-center text-slate-600 bg-slate-50 px-2 py-1 rounded">
              <span className="font-medium">Security PIN:</span>
              <span className="font-mono font-bold text-slate-800">{fallbackPin}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
