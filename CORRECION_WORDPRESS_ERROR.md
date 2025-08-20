# Corrección del Error de WordPress: meta.ano no es del tipo string

## Problema Identificado

El sistema estaba generando el siguiente error al enviar certificados a WordPress:

```
Respuesta de WordPress para participación (status 400): Response {type: 'cors', url: 'https://certificados.checkmedicinemo.com/wp-json/wp/v2/certificados', redirected: false, status: 400, ok: false, …}

Error al enviar certificado de participación 1 a WordPress: {"code":"rest_invalid_type","message":"meta.ano no es del tipo string.","data":{"status":400},"additional_data":[{"param":"meta.ano"}]}
```

## Causa del Problema

El error se producía porque:

1. El campo `año` en algunos casos se enviaba como número en lugar de string
2. `new Date().getFullYear()` devuelve un número, no un string
3. La conversión a string no se estaba aplicando consistentemente en todos los casos
4. WordPress requiere que todos los campos meta sean de tipo string

## Soluciones Implementadas

### 1. Función de Validación de Campos

Se agregó una nueva función `ensureStringFields()` que garantiza que todos los campos meta sean strings:

```javascript
const ensureStringFields = (meta) => {
  const stringMeta = {};
  Object.keys(meta).forEach(key => {
    stringMeta[key] = String(meta[key] || '');
  });
  return stringMeta;
};
```

### 2. Corrección en el Procesamiento de Datos del Excel

Se modificó la línea donde se procesa el campo `año` desde el Excel:

```javascript
// Antes:
año: normalizedItem['año'] || new Date().getFullYear().toString(),

// Después:
año: String(normalizedItem['año'] || new Date().getFullYear()),
```

### 3. Aplicación de Validación en Envío a WordPress

Se aplicó la función `ensureStringFields()` en ambos tipos de certificados:

#### Para Certificados de Participación:
```javascript
meta: ensureStringFields({
  rut_estudiante: item['rut sin'],
  clave_acceso: item.clave,
  curso_nombre: item.nombreCurso,
  pdf_url: item.url_pdf,
  nombre_alumno: item.nombre,
  ano: item.año || new Date().getFullYear(),
  tipo_certificado: 'participacion',
  correo: item.correo,
  dia: item.dia,
  mes: item.mes
})
```

#### Para Certificados Regulares:
```javascript
meta: ensureStringFields({
  rut_estudiante: item['rut sin'],
  clave_acceso: item.clave,
  curso_nombre: item.nombreCurso,
  pdf_url: item.url_pdf,
  nombre_alumno: item.nombre,
  ano: item.año || new Date().getFullYear()
})
```

## Beneficios de la Corrección

1. **Prevención de Errores**: Todos los campos meta se convierten automáticamente a string
2. **Consistencia**: Se aplica la misma validación en todos los puntos de envío
3. **Robustez**: Maneja casos donde los valores puedan ser null, undefined o de otros tipos
4. **Mantenibilidad**: Centraliza la lógica de conversión en una función reutilizable

## Archivos Modificados

- `src/components/CertificateGenerator.jsx`
  - Agregada función `ensureStringFields()`
  - Corregida conversión del campo `año` en procesamiento de Excel
  - Aplicada validación en envío de certificados de participación
  - Aplicada validación en envío de certificados regulares

## Pruebas Recomendadas

1. Probar con un archivo Excel que contenga el campo `año` como número
2. Probar con un archivo Excel que no contenga el campo `año` (debería usar el año actual)
3. Verificar que no se generen errores 400 en la consola del navegador
4. Confirmar que los certificados se crean correctamente en WordPress

## Fecha de Corrección

**Fecha**: $(date)
**Estado**: Implementado y listo para pruebas