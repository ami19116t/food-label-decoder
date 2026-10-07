import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const lockRef = useRef(false);
  const [status, setStatus] = useState('Starting camera…');
  const [error, setError] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    const scanner = new Html5Qrcode('reader', { verbose: false });
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 280, height: 160 },
      aspectRatio: 1.777778,
    };

    const onSuccess = async (decodedText) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setStatus('Barcode found. Loading product…');
      try {
        await scanner.stop();
      } catch (_) {}
      try {
        await scanner.clear();
      } catch (_) {}
      if (mountedRef.current) onDetected(decodedText);
    };

    const onScanFailure = () => {
      // Normal: this callback fires while the camera is searching.
    };

    const start = async () => {
      try {
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          throw new Error('Camera access requires HTTPS (or localhost).');
        }

        let cameras = [];
        try {
          cameras = await Html5Qrcode.getCameras();
        } catch (_) {}

        if (cameras.length > 0) {
          const preferred = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[0];
          await scanner.start(preferred.id, config, onSuccess, onScanFailure);
        } else {
          await scanner.start({ facingMode: { ideal: 'environment' } }, config, onSuccess, onScanFailure);
        }

        if (mountedRef.current) setStatus('Camera ready — place the barcode inside the box.');
      } catch (err) {
        console.error('Barcode scanner error:', err);
        if (mountedRef.current) {
          setError(err?.message || 'Unable to access the camera.');
          setStatus('Camera could not be started.');
        }
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      const cleanup = async () => {
        try { await scanner.stop(); } catch (_) {}
        try { await scanner.clear(); } catch (_) {}
      };
      cleanup();
    };
  }, []);

  const close = async () => {
    try { await scannerRef.current?.stop(); } catch (_) {}
    try { await scannerRef.current?.clear(); } catch (_) {}
    onClose();
  };

  return (
    <div className="modal">
      <div className="scannerCard">
        <div className="modalHead">
          <div>
            <b>Scan product barcode</b>
            <div className="scannerStatus">{status}</div>
          </div>
          <button className="closeScanner" onClick={close} aria-label="Close scanner">✕</button>
        </div>

        <div id="reader" className="readerBox" />

        {error ? (
          <div className="scannerError">
            <strong>Camera access failed</strong>
            <p>{error}</p>
            <p>On Windows, allow camera access in your browser. If using a phone, open the app over HTTPS or use localhost on the development machine.</p>
          </div>
        ) : (
          <p>Allow camera permission and hold the barcode inside the scanning box.</p>
        )}
      </div>
    </div>
  );
}
