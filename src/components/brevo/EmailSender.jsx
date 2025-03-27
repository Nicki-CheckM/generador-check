import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import * as XLSX from 'xlsx';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import './EmailSender.css';

// Obtener credenciales de variables de entorno
const ADMIN_USER = env.REACT_APP_ADMIN_USER || "";
const ADMIN_PASSWORD = env.REACT_APP_ADMIN_PASSWORD || "";



const EmailSender = () => {
  const [file, setFile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  // Manejar la carga del archivo Excel
  useEffect(() => {
    const checkAuth = () => {
      const tokens = localStorage.getItem('googleDriveTokens');
      setIsAuthenticated(!!tokens);
      
      // Verificar si hay autenticación de admin guardada
      const adminAuth = localStorage.getItem('adminAuthenticated');
      setIsAdminAuthenticated(adminAuth === 'true');
    };
    
    checkAuth();
    
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
    // Función para manejar el inicio de sesión de admin
    const handleAdminLogin = () => {
      if (loginUser === ADMIN_USER && loginPassword === ADMIN_PASSWORD) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        setShowLoginDialog(false);
        setLoginError('');
        setLoginUser('');
        setLoginPassword('');
      } else {
        setLoginError('Usuario o contraseña incorrectos');
      }
    };
      // Función para cerrar sesión de admin
  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          // Extraer correos electrónicos
          const extractedEmails = [];
          jsonData.forEach(row => {
            // Buscar específicamente en la columna "Correo"
            if (row.Correo && typeof row.Correo === 'string' && row.Correo.includes('@') && row.Correo.includes('.')) {
              extractedEmails.push(row.Correo.trim());
            }
          });
          
          // Eliminar duplicados
          const uniqueEmails = [...new Set(extractedEmails)];
          setEmails(uniqueEmails);
          setError(null);
        } catch (error) {
          setError('Error al procesar el archivo Excel. Asegúrate de que sea un archivo válido.');
          console.error('Error al procesar Excel:', error);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Manejar cambios en el editor de texto enriquecido
  const onEditorStateChange = (editorState) => {
    setEditorState(editorState);
  };

  // Convertir el contenido del editor a HTML
  const getHtmlContent = () => {
    return draftToHtml(convertToRaw(editorState.getCurrentContent()));
  };

 // Enviar correos masivos
 const handleSendEmails = async () => {
  

   // Verificar autenticación nuevamente justo antes de enviar
   const tokens = localStorage.getItem('googleDriveTokens');
   if (!tokens) {
     setError('Debes autenticarte con Google Drive primero');
     return;
   }
  if (!isAuthenticated) {
    setError('Debes autenticarte con Google Drive primero');
    return;
  }
    // Verificar autenticación de admin
    if (!isAdminAuthenticated) {
      setError('Necesitas credenciales de administrador para enviar correos');
      setShowLoginDialog(true);
      return;
    }

  if (!emails.length) {
    setError('No hay correos electrónicos para enviar.');
    return;
  }

  if (!subject) {
    setError('Por favor, ingresa un asunto para el correo.');
    return;
  }

  const htmlContent = getHtmlContent();
  if (htmlContent === '<p></p>') {
    setError('Por favor, ingresa el contenido del correo.');
    return;
  }

  setLoading(true);
  setError(null);
  setResult(null);

  try {
    console.log('Enviando correos a:', emails);
    console.log('Asunto:', subject);
    console.log('Contenido HTML:', htmlContent);
    
    // Intentamos enviar directamente sin verificación previa
    const response = await fetch('https://brevo-api.certificatemedicine.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails,
        subject,
        htmlContent
      })
    });
    
    // Log the raw response for debugging
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers]));
    
    // Intentamos obtener la respuesta JSON
    let data;
    try {
      data = await response.json();
      console.log('Response data:', data);
    } catch (e) {
      // Si no podemos parsear JSON, usamos el texto
      const text = await response.text();
      console.error('Failed to parse JSON response:', text);
      throw new Error(`Error en la respuesta: ${text}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || `Error del servidor: ${response.status}`);
    }
    
    setResult({
      successful: data.successful || emails.length,
      failed: data.failed || 0,
      message: data.message || 'Correos enviados correctamente'
    });
  } catch (error) {
    console.error('Error completo:', error);
    setError('Error al enviar los correos: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <Container maxWidth="md" className="email-container" sx={{ height: '100%', p: 0 }}>
      <Paper elevation={3} className="email-paper" sx={{ m: 0 }}>

  
        <Box className="email-content">
                {/* Mostrar estado de autenticación de admin */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {isAdminAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Alert severity="success" sx={{ py: 0, mr: 1 }}>
                  <Typography variant="body2">Admin autenticado</Typography>
                </Alert>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  onClick={handleAdminLogout}
                >
                  Cerrar sesión
                </Button>
              </Box>
            ) : (
              <Button 
                variant="outlined" 
                color="primary" 
                size="small" 
                onClick={() => setShowLoginDialog(true)}
              >
                Iniciar sesión como admin
              </Button>
            )}
          </Box>
          <Box mb={2}>
            <Typography variant="h6" gutterBottom fontSize="1rem">
              1. Sube un archivo Excel con correos electrónicos
            </Typography>
            <Button
              variant="contained"
              component="label"
              fullWidth
              size="small"
            >
              Seleccionar Archivo Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
            {file && (
              <Typography variant="body2" mt={1} fontSize="0.8rem">
                Archivo seleccionado: {file.name}
              </Typography>
            )}
            {emails.length > 0 && (
              <Alert severity="success" sx={{ mt: 1, py: 0 }}>
                <Typography variant="body2">
                  Se encontraron {emails.length} correos electrónicos
                </Typography>
              </Alert>
            )}
          </Box>
  
          <Box mb={2}>
            <Typography variant="h6" gutterBottom fontSize="1rem">
              2. Configura tu mensaje
            </Typography>
            <TextField
              label="Asunto del correo"
              variant="outlined"
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              margin="dense"
              size="small"
            />
            <Typography variant="subtitle1" mt={1} mb={0.5} fontSize="0.9rem">
              Contenido del correo:
            </Typography>
            <Box sx={{ border: '1px solid #ccc', height: '150px', mb: 1 }}>
              <Editor
                editorState={editorState}
                wrapperClassName="email-wrapper"
                editorClassName="email-editor"
                onEditorStateChange={onEditorStateChange}
                toolbar={{
                  options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'emoji'],
                  inline: { options: ['bold', 'italic', 'underline'] },
                }}
              />
            </Box>
          </Box>
  
          {error && (
            <Alert severity="error" sx={{ mb: 1, py: 0 }}>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}
  
          {result && (
            <Alert severity="success" sx={{ mb: 1, py: 0 }}>
              <Typography variant="body2">
                Envío completado: {result.successful} correos enviados correctamente, {result.failed} fallidos.
              </Typography>
            </Alert>
          )}
             {!isAuthenticated && (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
            <Typography variant="body2">
              Debes iniciar sesión con Google Drive para enviar correos.
            </Typography>
          </Alert>
        )}
        {!isAdminAuthenticated && (
            <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
              <Typography variant="body2">
                Necesitas credenciales de administrador para enviar correos.
              </Typography>
            </Alert>
          )}
        </Box>
  
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="medium"
          onClick={handleSendEmails}
          disabled={loading || !emails.length || !isAuthenticated || !isAdminAuthenticated}
          sx={{ 
            mt: 1,
            opacity: (loading || !emails.length || !isAuthenticated || !isAdminAuthenticated) ? 0.7 : 1,
            cursor: (loading || !emails.length || !isAuthenticated || !isAdminAuthenticated) ? 'not-allowed' : 'pointer'
          }}
        >
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Enviar Correos'}
        </Button>
      </Paper>
            {/* Diálogo de inicio de sesión de admin */}
            <Dialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)}>
        <DialogTitle>Iniciar sesión como administrador</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Usuario"
              type="email"
              fullWidth
              variant="outlined"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Contraseña"
              type="password"
              fullWidth
              variant="outlined"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            {loginError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {loginError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoginDialog(false)}>Cancelar</Button>
          <Button onClick={handleAdminLogin} variant="contained">Iniciar sesión</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );

};

export default EmailSender;