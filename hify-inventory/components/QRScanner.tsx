'use client';
import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let scanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScan(decodedText);
            scanner.stop();
          },
          () => {}
        );
        setStarted(true);
      } catch (err: any) {
        setError(err?.message || 'Camera access denied. Please allow camera permissions.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col modal-backdrop fade-in">
      <div className="flex items-center justify-between p-4 pt-12">
        <h2 className="font-display font-semibold text-lg" style={{ color: 'white' }}>Scan QR Code</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        {error ? (
          <div className="card p-6 text-center">
            <div className="text-3xl mb-3">📷</div>
            <p className="text-sm" style={{ color: 'var(--hify-muted)' }}>{error}</p>
          </div>
        ) : (
          <>
            <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden" />
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Point camera at a Pi QR code
            </p>
          </>
        )}
      </div>
    </div>
  );
}
