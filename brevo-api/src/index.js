export default {
	async fetch(request, env, ctx) {
	  // Configurar CORS para permitir solicitudes desde tu aplicación
	  if (request.method === "OPTIONS") {
		return handleCORS();
	  }
  
	  // Solo permitir solicitudes POST
	  if (request.method !== "POST") {
		return new Response("Método no permitido", { status: 405 });
	  }
  
	  try {
		// Obtener los datos de la solicitud
		const data = await request.json();
		const { emails, subject, htmlContent } = data;
  
		// Validar los datos
		if (!emails || !Array.isArray(emails) || emails.length === 0) {
		  return new Response(
			JSON.stringify({ message: "Lista de correos inválida" }),
			{ status: 400, headers: corsHeaders() }
		  );
		}
  
		if (!subject) {
		  return new Response(
			JSON.stringify({ message: "El asunto es requerido" }),
			{ status: 400, headers: corsHeaders() }
		  );
		}
  
		if (!htmlContent) {
		  return new Response(
			JSON.stringify({ message: "El contenido del correo es requerido" }),
			{ status: 400, headers: corsHeaders() }
		  );
		}
  
		// Configurar la solicitud a la API de Brevo
		const brevoApiKey = env.BREVO_API_KEY;
		
		// Preparar los datos para la API de Brevo
		const brevoData = {
		  sender: {
			name: "Certificate Medicine",
			email: "contacto@checkmedicinemo.com"
		  },
		  to: emails.map(email => ({ email })),
		  subject: subject,
		  htmlContent: htmlContent
		};
  
		// Enviar la solicitud a la API de Brevo
		const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
			"api-key": brevoApiKey
		  },
		  body: JSON.stringify(brevoData)
		});
  
		// Procesar la respuesta de Brevo
		if (!brevoResponse.ok) {
		  const errorData = await brevoResponse.json();
		  console.error("Error de Brevo:", errorData);
		  return new Response(
			JSON.stringify({ 
			  message: "Error al enviar los correos", 
			  error: errorData 
			}),
			{ status: brevoResponse.status, headers: corsHeaders() }
		  );
		}
  
		// Respuesta exitosa
		return new Response(
		  JSON.stringify({
			message: "Correos enviados correctamente",
			successful: emails.length,
			failed: 0
		  }),
		  { status: 200, headers: corsHeaders() }
		);
	  } catch (error) {
		console.error("Error en el worker:", error);
		return new Response(
		  JSON.stringify({ message: "Error interno del servidor", error: error.message }),
		  { status: 500, headers: corsHeaders() }
		);
	  }
	}
  };
  
  // Función para manejar las solicitudes CORS preflight
  function handleCORS() {
	return new Response(null, {
	  status: 204,
	  headers: corsHeaders()
	});
  }
  
  // Función para configurar los headers CORS
  function corsHeaders() {
	return {
	  "Access-Control-Allow-Origin": "*",
	  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	  "Access-Control-Allow-Headers": "Content-Type",
	  "Content-Type": "application/json"
	};
  }