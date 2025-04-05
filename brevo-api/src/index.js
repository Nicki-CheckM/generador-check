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
		
		// Modificación: Enviar correos individuales a cada destinatario
		let successCount = 0;
		let failCount = 0;
		let errors = [];
  
		// Función para esperar un tiempo determinado (en ms)
		const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
		// Enviar correos uno por uno
		for (const email of emails) {
		  // Preparar los datos para la API de Brevo (un solo destinatario)
		  const brevoData = {
			sender: {
			  name: "CheckMedicine",
			  email: "contacto@checkmedicinemo.com"
			},
			to: [{ email }], // Solo un destinatario por correo
			subject: subject,
			htmlContent: htmlContent,
			// Añadir cabeceras para mejorar la entrega
			headers: {
			  "List-Unsubscribe": "<mailto:contacto@checkmedicinemo.com?subject=unsubscribe>"
			},
			// Opcional: configurar responder a
			replyTo: {
			  email: "contacto@checkmedicinemo.com",
			  name: "CheckMedicine"
			}
		  };
  
		  try {
			// Enviar la solicitud a la API de Brevo
			const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
				method: "POST",
				headers: {
				  "Content-Type": "application/json",
				  "api-key": brevoApiKey
				},
				body: JSON.stringify(brevoData)
			  });
	
			  if (brevoResponse.ok) {
				successCount++;
			  } else {
				const errorData = await brevoResponse.json();
				failCount++;
				errors.push({ email, error: errorData });
				console.error(`Error al enviar a ${email}:`, errorData);
			  }
			  
			  // Añadir un retraso de 300ms entre cada envío para evitar límites de tasa
			  await delay(300);
			  
			} catch (emailError) {
			  failCount++;
			  errors.push({ email, error: emailError.message });
			  console.error(`Error al enviar a ${email}:`, emailError);
			}
		  }
  

	      // Respuesta con resultados
		  return new Response(
			JSON.stringify({
			  message: "Proceso de envío completado",
			  successful: successCount,
			  failed: failCount,
			  errors: errors.length > 0 ? errors : undefined
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