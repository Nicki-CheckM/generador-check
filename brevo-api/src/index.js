// Implementación para Cloudflare Workers
addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
  })
  
// Helper function for CORS headers
function corsHeaders() {
	return {
	  'Access-Control-Allow-Origin': '*',
	  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	  'Access-Control-Allow-Headers': 'Content-Type, api-key, Authorization',
	  'Access-Control-Max-Age': '86400'
	};
  }

async function handleRequest(request) {
  // Acceder a la API key como secreto
  // En Cloudflare Workers, los secretos se acceden directamente desde el objeto global
  const API_KEY = BREVO_API_KEY || '';// Acceso directo al secreto

  // Manejar preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }
  // Manejar solicitudes GET (cuando alguien visita la URL directamente)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'online',
      apiKeyConfigured: !!API_KEY,
      message: 'API de envío de correos. Esta API solo acepta solicitudes POST.',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json'
      }
    });
  }
  // Solo procesar solicitudes POST
  if (request.method !== 'POST') {
    return new Response('Método no permitido', {
      status: 405,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/plain'
      }
    });
  }
  // Verificar si la API key está configurada
  if (!API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error de configuración: La API key de Brevo no está configurada en el Worker'
    }), {
      status: 500,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json'
      }
    });
  }
  
	try {
	  // Obtener datos de la solicitud
	  const requestData = await request.json();
	  const { emails, subject, htmlContent } = requestData;
	  
	  console.log('Solicitud recibida:', {
		emailCount: emails?.length,
		subject,
		contentLength: htmlContent?.length
	  });
  
	  if (!emails || !Array.isArray(emails) || emails.length === 0) {
		return new Response(JSON.stringify({
			success: false,
			message: 'No se proporcionaron correos electrónicos válidos'
		  }), {
			status: 400,
			headers: {
			  ...corsHeaders(),
			  'Content-Type': 'application/json'
			}
		  });
	  }
  
	  // Aquí iría tu lógica para enviar correos con Brevo API
	  // Por ejemplo:
	  const results = [];
	  let successful = 0;
	  let failed = 0;
  
	  for (const email of emails) {
		try {
		  // Llamada a la API de Brevo
		  const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			  'api-key': BREVO_API_KEY, // Asegúrate de tener esta variable configurada
			},
			body: JSON.stringify({
			  sender: {
				name: "CheckMedicine",
				email: "contacto@checkmedicinemo.com" // Debe ser un remitente verificado en Brevo
			  },
			  to: [{ email }],
			  subject,
			  htmlContent
			})
		  });
  
		  const brevoData = await brevoResponse.json();
		  
		  if (brevoResponse.ok) {
			successful++;
			results.push({ email, success: true, messageId: brevoData.messageId });
		  } else {
			failed++;
			results.push({ email, success: false, error: brevoData.message || 'Error desconocido' });
		  }
		} catch (error) {
		  failed++;
		  results.push({ email, success: false, error: error.message });
		}
	  }
  
	  return new Response(JSON.stringify({
		success: true,
		successful,
		failed,
		results,
		message: `Se enviaron ${successful} correos correctamente y fallaron ${failed}.`
	  }), {
		status: 200,
		headers: {
		  ...corsHeaders(),
		  'Content-Type': 'application/json'
		}
	  });
	} catch (error) {
	  console.error('Error en el servidor:', error);
	  
	  return new Response(JSON.stringify({
		success: false,
		message: 'Error en el servidor: ' + error.message
	  }), {
		status: 500,
		headers: {
		  ...corsHeaders(),
		  'Content-Type': 'application/json'
		}
	  });
	}
  }
  
  // Función para enviar un correo individual
  async function handleSendEmail(request, corsHeaders) {
	try {
		if (request.method !== 'POST') {
		  return new Response('Method Not Allowed', { 
			status: 405,
			headers: corsHeaders()
		  });
		}
  
	  const requestData = await request.json();
	  const { to, subject, htmlContent, attachment } = requestData;
  
	  if (!to || !subject || !htmlContent) {
		return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
		  status: 400,
		  headers: {
			...corsHeaders(),
			'Content-Type': 'application/json'
		  }
		});
	  }
  
	  // Preparar datos para la API de Brevo
	  const emailData = {
		sender: {
		  name: "CheckMedicine",
		  email: "contacto@checkmedicinemo.com" 
		},
		to: [{ email: to }],
		subject: subject,
		htmlContent: htmlContent
	  };
  
	  // Agregar adjunto si existe
	  if (attachment) {
		emailData.attachment = [attachment];
	  }
  
	  // Enviar correo usando la API de Brevo
	  const response = await fetch('https://api.sendinblue.com/v3/smtp/email', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'api-key': API_KEY
		},
		body: JSON.stringify(emailData)
	  });
  
	  const responseData = await response.json();
  
	  return new Response(JSON.stringify(responseData), {
		headers: {
		  ...corsHeaders(),
		  'Content-Type': 'application/json'
		}
	  });
	} catch (error) {
	  return new Response(JSON.stringify({ error: error.message }), {
		status: 500,
		headers: {
		  ...corsHeaders(),
		  'Content-Type': 'application/json'
		}
	  });
	}
  }
  
  // Función para enviar correos masivos
  async function handleSendBulkEmails(request) {
	try {
	  if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { 
		  status: 405,
		  headers: corsHeaders()
		});
	  }
  
	  // ... resto del código ...
  
	  if (!emails || !emails.length || !subject || !htmlContent) {
		return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
		  status: 400,
		  headers: {
			...corsHeaders(),
			'Content-Type': 'application/json'
		  }
		});
	  }
  
	  // Verificar API key y mostrarla parcialmente para depuración
	  if (!API_KEY) {
		return new Response(JSON.stringify({ 
		  error: 'API Key no configurada',
		  message: 'La variable de entorno BREVO_API_KEY no está configurada en el Worker'
		}), {
		  status: 500,
		  headers: {
			...corsHeaders(), 
			'Content-Type': 'application/json'
		  }
		});
	  }
	  
	  // Mostrar los primeros 5 caracteres de la API key para verificar que está cargada
	  const apiKeyPreview = API_KEY ? `${API_KEY.substring(0, 5)}...` : 'No disponible';
  
	  // Resultados del envío con información detallada
	  const results = {
		total: emails.length,
		successful: 0,
		failed: 0,
		errors: [],
		apiResponses: [], // Para diagnóstico
		debugInfo: {
		  apiKeyPreview,
		  senderEmail: "contacto@checkmedicinemo.com",
		  timestamp: new Date().toISOString(),
		  requestOrigin: request.headers.get('origin') || 'No disponible'
		}
	  };
  
	  // Enviar correos de forma individual
	  for (const email of emails) {
		try {
		  // Preparar datos para la API de Brevo
		  const emailData = {
			sender: {
			  name: "Certificados Check Medicine",
			  email: "contacto@checkmedicinemo.com"
			},
			to: [{ email }],
			subject: subject,
			htmlContent: htmlContent
		  };
  
		  // Agregar adjunto si existe
		  if (attachment) {
			emailData.attachment = [attachment];
		  }
  
		  // Registrar intento de envío
		  console.log(`Intentando enviar correo a: ${email}`);
		  
		  // Enviar correo usando la API de Brevo
		  const response = await fetch('https://api.sendinblue.com/v3/smtp/email', {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			  'api-key': API_KEY
			},
			body: JSON.stringify(emailData)
		  });
  
		  // Capturar todos los detalles de la respuesta
		  const responseStatus = response.status;
		  const responseStatusText = response.statusText;
		  const responseData = await response.json();
		  
		  // Guardar respuesta completa para diagnóstico
		  results.apiResponses.push({ 
			email, 
			status: responseStatus,
			statusText: responseStatusText,
			response: responseData,
			timestamp: new Date().toISOString()
		  });
		  
		  if (response.ok) {
			results.successful++;
			console.log(`✅ Correo enviado exitosamente a: ${email}`);
		  } else {
			results.failed++;
			console.log(`❌ Error al enviar correo a: ${email}. Estado: ${responseStatus}`);
			results.errors.push({ 
			  email, 
			  status: responseStatus,
			  statusText: responseStatusText,
			  error: responseData,
			  timestamp: new Date().toISOString()
			});
		  }
		  
		  // Esperar un breve tiempo entre envíos para evitar límites de tasa
		  await new Promise(resolve => setTimeout(resolve, 200));
		  
		} catch (error) {
		  results.failed++;
		  console.error(`❌ Excepción al enviar correo a: ${email}`, error);
		  results.errors.push({ 
			email, 
			error: error.message,
			stack: error.stack,
			timestamp: new Date().toISOString()
		  });
		}
	  }
  
	  // Verificar con la API de Brevo el estado de la cuenta
	  try {
		const accountResponse = await fetch('https://api.sendinblue.com/v3/account', {
		  method: 'GET',
		  headers: {
			'api-key': API_KEY
		  }
		});
		
		if (accountResponse.ok) {
		  const accountData = await accountResponse.json();
		  results.debugInfo.accountStatus = {
			plan: accountData.plan || 'No disponible',
			credits: accountData.credits || 'No disponible'
		  };
		} else {
		  results.debugInfo.accountStatus = {
			error: 'No se pudo obtener información de la cuenta',
			status: accountResponse.status
		  };
		}
	  } catch (error) {
		results.debugInfo.accountStatus = {
		  error: 'Error al consultar estado de la cuenta',
		  message: error.message
		};
	  }
  
	  return new Response(JSON.stringify(results), {
		headers: {
			...corsHeaders(), 
			'Content-Type': 'application/json'
		  }
	  });
	} catch (error) {
	  console.error('❌ Error general en el procesamiento:', error);
	  return new Response(JSON.stringify({ 
		error: error.message,
		stack: error.stack,
		timestamp: new Date().toISOString()
	  }), {
		status: 500,
		headers: {
		   ...corsHeaders(), // Cambiado de ...corsHeaders a ...corsHeaders()
    'Content-Type': 'application/json'
		}
	  });
	}
  }