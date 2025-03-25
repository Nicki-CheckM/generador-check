// Implementación para Cloudflare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Configuración de Brevo API
const BREVO_API_KEY = process.env.BREVO_API_KEY; // Nombre corregido de la variable de entorno

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Configuración de CORS - Permitir específicamente tu dominio de Vercel
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://check-certificado.vercel.app',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };

  // Manejar preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Manejar la ruta principal (la que usas en tu frontend)
  if (path === '/' || path === '') {
    return handleSendBulkEmails(request, corsHeaders);
  }
  
  // Rutas adicionales de la API
  if (path === '/sendEmail') {
    return handleSendEmail(request, corsHeaders);
  } else if (path === '/sendBulkEmails') {
    return handleSendBulkEmails(request, corsHeaders);
  }

  return new Response('Not Found', { 
    status: 404,
    headers: corsHeaders 
  });
}
  
  // Función para enviar un correo individual
  async function handleSendEmail(request, corsHeaders) {
    try {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { 
          status: 405,
          headers: corsHeaders
        });
      }
  
      const requestData = await request.json();
      const { to, subject, htmlContent, attachment } = requestData;
  
      if (!to || !subject || !htmlContent) {
        return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
  
      // Preparar datos para la API de Brevo
      const emailData = {
        sender: {
          name: "Certificados Check Medicine",
          email: "noreply@checkmedicine.com" // Cambia esto a tu correo remitente
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
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify(emailData)
      });
  
      const responseData = await response.json();
  
      return new Response(JSON.stringify(responseData), {
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

  async function handleSendBulkEmails(request, corsHeaders) {
    try {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { 
          status: 405,
          headers: corsHeaders
        });
      }
  
      const requestData = await request.json();
      const { emails, subject, htmlContent, attachment } = requestData;
  
      if (!emails || !emails.length || !subject || !htmlContent) {
        return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
  
      // Resultados del envío
      const results = {
        total: emails.length,
        successful: 0,
        failed: 0,
        errors: []
      };
  
      // Enviar correos de forma individual
      for (const email of emails) {
        try {
          // Preparar datos para la API de Brevo
          const emailData = {
            sender: {
              name: "Certificados Check Medicine",
              email: "noreply@checkmedicine.com" // Cambia esto a tu correo remitente
            },
            to: [{ email }],
            subject: subject,
            htmlContent: htmlContent
          };
  
          // Agregar adjunto si existe
          if (attachment) {
            emailData.attachment = [attachment];
          }
  
          // Enviar correo usando la API de Brevo
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': BREVO_API_KEY
            },
            body: JSON.stringify(emailData)
          });
  
          const responseData = await response.json();
          
          if (response.ok) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({ email, error: responseData });
          }
          
          // Esperar un breve tiempo entre envíos para evitar límites de tasa
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          results.failed++;
          results.errors.push({ email, error: error.message });
        }
      }
  
      return new Response(JSON.stringify(results), {
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