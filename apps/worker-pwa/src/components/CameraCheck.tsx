import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CameraStatus = 'idle' | 'granted' | 'denied';

export function CameraCheck() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const handleTestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setErrorMessage('');
      setStatus('granted');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('denied');
    }
  };

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <button
        type="button"
        onClick={handleTestCamera}
        style={{
          width: '100%',
          padding: '1.25rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          borderRadius: '0.75rem',
          border: 'none',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          cursor: 'pointer',
        }}
      >
        {t('worker.cameraCheck.button')}
      </button>

      {status === 'granted' && (
        <p style={{ color: '#16a34a', fontWeight: 600, marginTop: '0.75rem' }}>
          {t('worker.cameraCheck.granted')}
        </p>
      )}

      {status === 'denied' && (
        <p style={{ color: '#dc2626', fontWeight: 600, marginTop: '0.75rem' }}>
          {t('worker.cameraCheck.denied')}: {errorMessage}
        </p>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          marginTop: '0.75rem',
          borderRadius: '0.75rem',
          display: status === 'granted' ? 'block' : 'none',
          backgroundColor: '#000000',
        }}
      />
    </section>
  );
}

export default CameraCheck;
