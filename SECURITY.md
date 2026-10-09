# Seguridad de Junior Scope

Revisión local realizada el 7 de octubre de 2026 sobre el producto Junior/Empresa y su API activa. No es una certificación ni una garantía de invulnerabilidad.

## Resultado de la revisión de credenciales

Se revisaron los archivos versionados y los 10 commits locales existentes antes de esta ampliación. No se encontraron .env privados, bases SQLite, directorios data/ ni archivos admin-access.txt versionados. Tampoco se encontraron patrones de claves OpenAI o tokens GitHub reales. La comprobación muestra únicamente recuentos; nunca imprime valores secretos. No puede reconocer todas las contraseñas o formatos de secreto posibles, ni auditar ramas remotas que no estén descargadas.

Las contraseñas se guardan como hash scrypt de 64 bytes con sal aleatoria de 16 bytes, no como texto original. Los tokens de sesión aleatorios de 32 bytes se guardan mediante SHA-256. No se devuelven hashes, sales ni tokens en las respuestas públicas de registro o perfil. El correo de acceso se muestra únicamente al titular y a administradores autorizados, nunca en el directorio junior.

Las bases, sesiones, datos personales y posibles archivos locales de acceso quedan en data/ o DATA_DIRECTORY, fuera de Git y del directorio público dist/. .env está ignorado; .env.example contiene ejemplos. No introduzcas secretos en variables VITE_, código React, imágenes o documentación.

## Protecciones activas

- Sesión HttpOnly/SameSite=Lax, Secure en HTTPS, expiración y revocación al cerrar sesión.
- Verificación de rol, tipo, identidad y propiedad en servidor. Registrar una cuenta no permite asignarse admin. Cambiar de espacio es una acción exclusiva de admin sobre su propia cuenta.
- Escrituras del navegador con Origin obligatorio y permitido. Orígenes ajenos y peticiones sin Origin se rechazan. El servicio interno usa un secreto de al menos 32 caracteres y comparación en tiempo constante; sin secreto configurado no inicia.
- Servicios internos en loopback, sin exposición directa prevista a Internet. Datos y archivos privados no se sirven por HTTP.
- Límites de peticiones, intentos por cuenta/IP, tamaño de JSON, cabeceras y tiempo de recepción. Las estructuras de los cuerpos JSON deben ser objetos.
- SQL con parámetros para datos y tablas limitadas por lista permitida. React presenta texto escapado; no se introduce HTML aportado por usuarios. Portfolio/web solo admiten HTTP/HTTPS.
- Imágenes PNG/JPEG/WebP con comprobación de formato, firma y máximo 500 KB por imagen, cuatro por publicación/comentario. SVG y URLs externas no se admiten. Límites de publicaciones y comentarios.
- CSP, protección contra iframes, nosniff, política de referencias, HSTS con origen HTTPS y restricción de permisos de cámara/micrófono/geolocalización en producción. El origen público de producción debe ser HTTPS salvo pruebas locales.
- En sistemas Unix se restringen permisos del directorio de datos y de las bases a su propietario. En Windows se depende de los permisos de la carpeta del usuario; no se promete cifrado ni cambio de ACL del sistema.
- Bloqueo de escrituras comprobado en gateway y Community, con el estado de Auth consultado de nuevo. No depende de desactivar botones. El bloqueo temporal expira por fecha; el permanente dura hasta desbloqueo administrativo.
- Motivo y fin del bloqueo visibles al afectado. Conserva lectura, sesión y denuncias. Puede ocultar un perfil público mediante la acción específica, pero no modificar contenido mientras esté bloqueado.
- Denuncias, decisiones, motivos, actor y fechas persistentes. La denuncia no bloquea automáticamente al denunciado. No se bloquea a administradores desde el panel para evitar perder acceso administrativo.

## Verificación repetible

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:production
npm.cmd run check:security
npm.cmd audit --omit=dev
```

La integración comprueba privacidad, permisos, consentimiento, imágenes, reacciones coherentes, comentarios, atribución y retirada del original, denuncias, bloqueos temporales/permanentes/expirados, desbloqueo y alternancia administrativa. Las pruebas de React verifican formularios, avisos, controles y escape de texto; no sustituyen una revisión visual completa en navegadores.

Las pruebas de producción usan bases independientes y verifican cookie Secure/HttpOnly, cabeceras, rechazo de Origin ausente, control administrativo aunque se falsifiquen cabeceras, límites de cuerpo y ausencia de archivos privados en rutas públicas. La auditoría de dependencias de producción devolvió cero vulnerabilidades conocidas en el momento de esta revisión; esto puede cambiar y hay que repetirla.

## Antes y después del despliegue

Configura HTTPS real con el proveedor o proxy, secreto privado y volumen persistente. No expongas los puertos internos. Las bases contienen información personal sin cifrado de aplicación: protege el disco, el volumen, las cuentas del alojamiento y los backups; mantenerlas fuera de Git no equivale a cifrarlas.

Mantén Node y dependencias actualizados, realiza backups privados y prueba restauraciones. Aplica restricciones de acceso al proveedor, autentificación reforzada en GitHub/alojamiento y rotación de secretos si hubiera una exposición. La aplicación todavía no incorpora MFA, verificación de correo, antivirus de archivos ni protección distribuida frente a DDoS. Los límites actuales se aplican por proceso y no sustituyen un proxy/WAF para un despliegue público con alto tráfico.

Los bloqueos impiden nuevas escrituras, no borran automáticamente material ya publicado. No se declara borrado retroactivo de copias que otros usuarios hayan leído o descargado. Las denuncias conservan motivo, contexto textual y referencias, sin crear un archivo completo de todas las imágenes originales.

Para notificar un incidente, comunícalo privadamente al responsable del despliegue; nunca publiques claves, contraseñas, bases o datos de usuarios en una issue pública.

## Protección antes de un commit

En este checkout se ha activado .githooks/pre-commit: comprueba archivos privados y patrones de secretos tanto en el archivo actual como en el contenido preparado en Git. Así detecta una clave ya preparada aunque luego se borre del archivo sin volver a añadirlo. El hook rechaza el commit si encuentra estos casos. La prueba usa secretos ficticios en un repositorio temporal independiente.

Los hooks no se activan automáticamente al clonar. En un checkout nuevo:

```powershell
git config --local core.hooksPath .githooks
```

No sustituye revisar git diff --cached, controles del alojamiento ni escáneres adicionales. Un usuario puede omitir hooks y no todos los formatos de secreto son reconocibles por estas reglas. Backups, uploads, bases auxiliares y archivos .key/.pem también están excluidos de Git.

Nota sobre esta entrega: el detector directo y sus pruebas pasan, pero Git no pudo ejecutar Git Bash para el hook dentro del entorno restringido de Codex en Windows (NtCreateDirectoryObject, acceso denegado). No se ha omitido el hook para forzar un commit. Los cambios quedan preparados; debe comprobarse la ejecución del hook desde una terminal normal antes de subirlos. La configuración local del hook permanece activada.
# Privacidad de candidaturas y mensajes

Las nuevas rutas de candidaturas validan participante, empresa propietaria y espacio en servidor. Un admin ajeno recibe el mismo rechazo que cualquier tercero. La copia del perfil se obtiene de Auth con una lista permitida de campos, nunca del cuerpo enviado por React. Compartirla requiere aceptación y versión de consentimiento, registradas con fecha; retirar la candidatura elimina esa copia de la base activa. No borra los mensajes ni los respaldos anteriores: hace falta completar una política de retención antes de producción.

Las pruebas nuevas comprueban que un perfil privado puede compartirse con consentimiento sin aparecer en el directorio; que credenciales, correo de acceso y CV antiguo no se copian; y que otros juniors/empresas/admin no acceden a mensajes. También comprueban el bloqueo de escrituras, la retirada permitida al bloqueado, límites y que cerrar/eliminar una oferta conserva solo las conversaciones ya existentes.

`scripts/backup.mjs` genera dos copias SQLite mediante VACUUM INTO, valida integridad y detecta cambios de versión durante la operación. Requiere detener todos los servicios y una carpeta nueva fuera de DATA_DIRECTORY. La confirmación de parada no verifica por sí sola todos los procesos: el operador debe comprobarla. El respaldo contiene datos privados y no está cifrado por este script; mantenerlo fuera de Git, con permisos y cifrado externo. Se probó la restauración con datos sintéticos. No se han copiado ni subido bases reales.
