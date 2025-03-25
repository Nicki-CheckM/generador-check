import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleOAuth2Callback, checkWorkerStatus } from '../utils/googleDriveService';

const OAuth2Callback = () => {
  const [status, setStatus] = useState('Procesando autenticación...');
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Check worker status first
        setStatus('Verificando estado del worker...');
        try {
          const workerStatus = await checkWorkerStatus();
          setDebugInfo(prev => prev + `\nWorker status: ${JSON.stringify(workerStatus)}`);
        } catch (statusError) {
          setDebugInfo(prev => prev + `\nError al verificar worker: ${statusError.message}`);
        }

        // Get the code directly from the URL search params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          const error = searchParams.get('error');
          throw new Error(`No se recibió código de autorización. Error: ${error || 'desconocido'}`);
        }
        
        setDebugInfo(prev => prev + `\nCódigo recibido: ${code.substring(0, 10)}...`);
        setStatus('Código recibido, obteniendo tokens...');
        
        // Get tokens with the code
        const tokens = await handleOAuth2Callback(window.location.href);
        
        setStatus('Autenticación exitosa. Redirigiendo...');
        // Redirect to home after successful authentication
        setTimeout(() => navigate('/'), 1500);
      } catch (error) {
        console.error('Error en el callback de OAuth:', error);
        setStatus(`Error de autenticación: ${error.message}`);
      }
    };

    processAuth();
  }, [navigate, location]);

  return (
    <div className="oauth-callback-container" style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Google Drive Authentication</h2>
      <p>{status}</p>
      {debugInfo && (
        <pre style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', padding: '10px', background: '#f5f5f5', overflow: 'auto' }}>
          {debugInfo}
        </pre>
      )}
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    </div>
  );
};

export default OAuth2Callback;