# TalentScope

Aplicación local en español para guardar ofertas aportadas por el usuario, comparar competencias, gestionar candidaturas y preparar notificaciones por correo. Dos aplicaciones React (panel profesional y cuenta/conexiones) y cinco procesos REST: gateway, autenticación, ofertas, análisis y correo.

## Iniciar

Requiere Node.js 24 o superior.

```powershell
npm install
npm run dev
```

Abre http://localhost:5173 y crea una cuenta. Para configurar servicios externos, copia `.env.example` a `.env`, rellena los campos localmente y reinicia. No compartas secretos en el chat. `npm run build` compila ambos frontends; `npm test` verifica el modelo de afinidad. El directorio `data` contiene las bases SQLite de cada servicio y debe conservarse para mantener las cuentas y ofertas.

## Funciones

- Registro, inicio/cierre de sesión, contraseña con scrypt y sesiones HttpOnly caducadas a los siete días.
- Persistencia SQLite independiente por servicio. Acceso a ofertas y correos restringido a su propietario.
- Crear, editar, buscar, filtrar y eliminar ofertas; gestionar guardada, solicitud, entrevista y cerrada.
- Añadir competencias del perfil, datos de empresa, fuentes, solicitantes y vacantes opcionales.
- Análisis explicable de coincidencia exacta de competencias, normalizadas a minúsculas. No extrae automáticamente competencias de texto libre. No es un modelo predictivo de contratación.
- Correo al guardar ofertas si la opción está activada, envío manual e historial. Sin SMTP, muestra explícitamente vista previa/no enviada. No se monitorizan cambios en LinkedIn.
- Flujo OAuth/OIDC oficial para vincular una identidad LinkedIn a una cuenta de la app; valida firma, issuer, audience, state, nonce y caducidad. Este flujo necesita credenciales y aprobación de Sign In with LinkedIn using OpenID Connect. No sustituye el inicio de sesión propio ni concede acceso a ofertas.
- Estado Premium declarado por el usuario; no comprobado automáticamente.

La oferta de ejemplo es ficticia y solo se añade cuando el usuario elige explorarla. La fotografía es una imagen generada y decorativa; no representa ninguna empresa real.

## APIs y servicios

| Servicio | Puerto local | Responsabilidad |
|---|---|---|
| Gateway | 4100 | Sesión, límites de petición y coordinación |
| Auth | 4101 | Usuarios, perfiles y OAuth LinkedIn |
| Jobs | 4102 | Ofertas aisladas por propietario |
| Analysis | 4103 | Afinidad y contexto de competencia |
| Mail | 4104 | SMTP e historial de entregas |

El navegador utiliza `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/logout`, `/api/auth/linkedin/start`, `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/analysis`, `/api/jobs/:id/notify`, `/api/mail/history` y `/api/system`. `PATCH` edita perfil/oferta; `POST` registra, inicia/cierra sesión, crea ofertas y notifica; `DELETE` elimina ofertas. Los servicios internos solo escuchan en loopback y exigen un secreto interno generado al iniciar si no está configurado.

## LinkedIn

Registra una app en LinkedIn Developers, solicita el producto OIDC, y configura exactamente `http://localhost:5173/api/auth/linkedin/callback` como redirección. Usa el mismo origen en `PUBLIC_ORIGIN`. El estado Premium, la búsqueda de ofertas y los solicitantes no están disponibles por el mero inicio de sesión OIDC. Se requeriría una integración adicional autorizada y adaptada al contrato concreto de su API.

Referencias oficiales: [OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [acceso a APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access).

## Correo

Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` y, si el servidor lo exige, `SMTP_USER`/`SMTP_PASS`. En el puerto 587 se exige STARTTLS; en 465, TLS directo. Nunca se presenta una vista previa como correo enviado. Los errores quedan registrados y se pueden reintentar manualmente. No incluye cola duradera ni reintentos automáticos.

## Antes de producción

Esta entrega es una primera versión local. Necesita HTTPS y proxy de producción, servicios supervisados, copias de seguridad, almacenamiento y secretos gestionados, validación real de LinkedIn/SMTP, recuperación y verificación de correo, política de privacidad, observabilidad y revisión de seguridad. La construcción React y los servicios están preparados para desarrollo local, no desplegados públicamente. El análisis de empresa organiza notas y fuentes aportadas; no consulta ni verifica fuentes externas. No puede calcular una probabilidad fiable de contratación sin datos históricos y del proceso de selección.
