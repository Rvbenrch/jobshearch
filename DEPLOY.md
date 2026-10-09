# Publicar Junior Scope

Necesita Node 24+ y almacenamiento persistente para SQLite. GitHub Pages no ejecuta estos servicios: publicar solo dist/ allí no proporciona registro, perfiles, ofertas ni publicaciones.

## Git

Antes de añadir archivos:

```powershell
git status --short
git check-ignore .env data/auth.sqlite data/community.sqlite
git diff --cached
```

check-ignore debe listar los archivos privados. No añadas .env, bases, CV, backups ni data/admin-access.txt. Añade solo código/documentación revisados, crea un commit y ejecuta git push a tu rama. Autoriza tu cuenta cuando Git lo solicite; nunca guardes tokens en URLs o archivos.

## Servidor

Ejecuta npm ci, npm run build y npm start. Configura en el servidor:

```text
PUBLIC_ORIGIN=https://tu-dominio.example
INTERNAL_SECRET=<secreto aleatorio privado>
DATA_DIRECTORY=<ruta de volumen persistente>
PORT=3000
```

Usa HTTPS y un proxy al puerto público. No expongas los puertos internos. GET /health comprueba gateway, Auth y Community. El lanzador arranca auth, community y gateway. El Dockerfile existente compila el frontend y ejecuta producción; monta un volumen para los datos.

El proveedor debe conservar DATA_DIRECTORY entre despliegues. Un filesystem efímero perdería cuentas y contenido al recrear el servidor. Haz backups privados y verifica su restauración.

Tras publicar, prueba registro Junior/Empresa, perfil, proyecto y oferta. Comprueba desde otra cuenta que borradores y edición ajena estén restringidos. Elimina el contenido de prueba.

Este documento no confirma una subida a GitHub ni una URL pública nueva.

## Revisiones de seguridad

Antes de publicar ejecuta npm run check:security y npm audit --omit=dev. Tras compilar ejecuta npm run test:production. Revisa SECURITY.md: describe medidas comprobadas y límites, sin prometer invulnerabilidad.

Para activar la protección previa al commit después de clonar:

```powershell
git config --local core.hooksPath .githooks
```

Nunca expongas los puertos internos ni la carpeta de datos. Mantén HTTPS, Node y dependencias actualizados y protege cuentas del proveedor y backups.
# Paquete de despliegue para revisión

`deploy/render.example.yaml` propone una sola instancia Docker en Frankfurt, plan `1c-2g`, disco persistente de 1 GB en `/app/data`, despliegues automáticos desactivados y health check `/health`. El tamaño es una propuesta de piloto por validar con carga. Importar la plantilla crea recursos de pago: no hacerlo hasta aprobar presupuesto y completar las puertas de CLOUD-PLAN.md. PUBLIC_ORIGIN se configura con el HTTPS realmente asignado; INTERNAL_SECRET se genera en el proveedor y no se escribe en Git. El nombre no se ha reservado ni existe una URL desplegada.

Referencia de configuración: [Blueprint de Render](https://render.com/docs/blueprint-spec). La tarifa final de cómputo, disco, transferencia y respaldos debe verificarse en el panel antes de contratar. No usar el filesystem efímero como almacén de usuarios y mensajes. Tampoco publicar solo dist en GitHub Pages esperando que ejecute Node/SQLite.

## Respaldar y comprobar una restauración

Detener el servidor y todos sus servicios antes del respaldo. Elegir una carpeta privada nueva, fuera del directorio de datos y de cualquier carpeta pública o versionada:

```powershell
node scripts/backup.mjs "RUTA_PRIVADA_DATOS" "RUTA_PRIVADA_BACKUPS\copia-nueva" --services-stopped
```

No copiar a ciegas una SQLite abierta con WAL. El script usa [VACUUM INTO de SQLite](https://www.sqlite.org/lang_vacuum.html), verifica las dos bases y genera manifest.json sin contenidos personales. Cifrar la copia y guardarla fuera del volumen original; el script no implementa cifrado ni respaldo programado. Un error no produce manifest de éxito y obliga a usar un destino nuevo tras resolverlo.

Para un ensayo de restauración, mantener parada la aplicación, copiar auth.sqlite y community.sqlite desde una copia verificada a un DATA_DIRECTORY nuevo y aislado, y levantar una instancia de staging con secretos/origen propios. Comprobar cuentas y roles, ofertas, candidaturas, mensajes, bloqueos y sesión. No reemplazar producción hasta aprobar el resultado; no reutilizar sesiones reales en staging. La prueba automática `scripts/backup-test.mjs` valida copias/restauración sintéticas; resta probar restart/redeploy y recuperación en el proveedor elegido.
