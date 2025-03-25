export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Configuración de CORS mejorada
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    // Manejar preflight OPTIONS de forma más explícita
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    // Depuración de variables de entorno
    if (path === '/debug') {
      // Listar todas las propiedades disponibles en env
      const envKeys = Object.keys(env);
      return new Response(JSON.stringify({
        message: 'Variables de entorno disponibles',
        envKeys: envKeys,
        hasClientId: 'REACT_APP_GOOGLE_OAUTH_CLIENT_ID' in env,
        hasClientSecret: 'REACT_APP_GOOGLE_OAUTH_CLIENT_SECRET' in env,
        // Intentar diferentes nombres de variables
        clientIdValue: env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID ? 'Existe (valor oculto)' : 'No existe',
        clientSecretValue: env.REACT_APP_GOOGLE_OAUTH_CLIENT_SECRET ? 'Existe (valor oculto)' : 'No existe',
        clientIdAlt: env.CLIENT_ID ? 'Existe (valor oculto)' : 'No existe',
        clientSecretAlt: env.CLIENT_SECRET ? 'Existe (valor oculto)' : 'No existe'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Acceder a las variables de entorno a través del parámetro env
    // Intentar diferentes nombres de variables
    const CLIENT_ID = env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || env.CLIENT_ID;
    const CLIENT_SECRET = env.REACT_APP_GOOGLE_OAUTH_CLIENT_SECRET || env.CLIENT_SECRET;
    const REDIRECT_URI = 'https://check-certificado.vercel.app/oauth2callback';
    const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

    // Añadir endpoint de status para depuración
    if (path === '/status' || path === '/ping') {
      return new Response(JSON.stringify({
        status: 'ok',
        clientIdExists: !!CLIENT_ID,
        clientSecretExists: !!CLIENT_SECRET,
        redirectUri: REDIRECT_URI,
        envKeys: Object.keys(env).length > 0 ? 'Hay variables disponibles' : 'No hay variables disponibles'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Rutas de la API
    if (path === '/getAuthUrl') {
      return handleGetAuthUrl(CLIENT_ID, REDIRECT_URI, SCOPES, corsHeaders);
    } else if (path === '/getTokens') {
      return handleGetTokens(request, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, corsHeaders);
    } else if (path === '/uploadToDrive') {
      return handleUploadToDrive(request, corsHeaders);
    }

    // Respuesta para rutas no encontradas
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Ruta no encontrada',
      path: path,
      availableRoutes: ['/getAuthUrl', '/getTokens', '/uploadToDrive', '/status', '/ping', '/debug']
    }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};

// Función para generar URL de autorización
async function handleGetAuthUrl(CLIENT_ID, REDIRECT_URI, SCOPES, corsHeaders) {
  try {
    if (!CLIENT_ID) {
      throw new Error('CLIENT_ID is not defined');
    }

    // Construir URL de autorización manualmente
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Función para obtener tokens con el código de autorización
async function handleGetTokens(request, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, corsHeaders) {
  try {
    if (!CLIENT_ID) {
      throw new Error('CLIENT_ID is not defined');
    }
    
    if (!CLIENT_SECRET) {
      throw new Error('CLIENT_SECRET is not defined');
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    const requestData = await request.json();
    const code = requestData.code;

    if (!code) {
      return new Response(JSON.stringify({ error: 'No se proporcionó código' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Intercambiar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    return new Response(JSON.stringify({ tokens }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Función para subir archivo a Google Drive
async function handleUploadToDrive(request, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    // Procesar FormData
    const formData = await request.formData();
    const file = formData.get('file');
    const tokensString = formData.get('tokens');
    
    if (!file || !tokensString) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const tokens = JSON.parse(tokensString);
    const accessToken = tokens.access_token;

    // Crear archivo en Drive (metadata)
    const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: file.name,
        mimeType: 'application/pdf'
      })
    });

    const metadata = await metadataResponse.json();
    const fileId = metadata.id;

    // Subir contenido del archivo
    const fileBuffer = await file.arrayBuffer();
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type
      },
      body: fileBuffer
    });

    // Configurar permisos para que sea público
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    // Obtener enlace compartido
    const shareResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const shareData = await shareResponse.json();

    return new Response(JSON.stringify({ 
      fileId: fileId,
      webViewLink: shareData.webViewLink 
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}