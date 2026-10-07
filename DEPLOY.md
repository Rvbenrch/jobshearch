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

Usa HTTPS y un proxy al puerto público. No expongas los puertos internos. GET /health comprueba gateway y autenticación. El lanzador arranca auth, community y gateway. El Dockerfile existente compila el frontend y ejecuta producción; monta un volumen para los datos.

El proveedor debe conservar DATA_DIRECTORY entre despliegues. Un filesystem efímero perdería cuentas y contenido al recrear el servidor. Haz backups privados y verifica su restauración.

Tras publicar, prueba registro Junior/Empresa, perfil, proyecto y oferta. Comprueba desde otra cuenta que borradores y edición ajena estén restringidos. Elimina el contenido de prueba.

Este documento no confirma una subida a GitHub ni una URL pública nueva.
