# Subir a GitHub y publicar TalentScope

## 1. Subir el código

Desde PowerShell:

```powershell
cd "C:\Users\Rubén\Documents\Codex\2026-10-07\c8\outputs\talent-scope"
git status
git check-ignore data/admin-access.txt data/auth.sqlite .env
git add README.md DEPLOY.md package.json package-lock.json index.html account.html admin.html vite.config.js .gitignore .env.example .dockerignore .node-version Dockerfile services web
git diff --cached --stat
git commit -m "Remodel TalentScope with public job search and market dashboard"
git push origin main
```

Si los cambios ya están en un commit, basta con `git push origin main`. Usa la autenticación de GitHub que solicite Git en tu ordenador. No escribas tokens en comandos, URLs ni archivos del proyecto. Las bases de datos, la contraseña del administrador local y `.env` están excluidos; `.env.example` solo contiene nombres de variables y ejemplos sin secretos.

## 2. Por qué GitHub Pages no ejecuta toda la app

Una dirección como `https://rvbenrch.github.io/personal/` corresponde a un sitio GitHub Pages. No se ha comprobado el workflow concreto de ese repositorio. Pages sirve archivos HTML, CSS y JavaScript; no ejecuta los servicios Node.js, SQLite, SMTP o credenciales de proveedores. Publicar únicamente `dist/` deja sin funcionamiento el inicio de sesión y las APIs.

Para mantener Pages como interfaz habría que alojar la API aparte y adaptar URL base, CORS, cookies y rutas al subdirectorio. Esta entrega usa un único origen HTTPS para reducir esa configuración.

Fuente: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## 3. Desplegar la aplicación completa en Render desde GitHub

1. En Render, crea **New → Web Service** y conecta `Rvbenrch/jobshearch`.
2. Selecciona la rama `main` y el runtime **Node**.
3. Usa **Build Command:** `npm ci && npm run build`.
4. Usa **Start Command:** `npm start`.
5. Configura Node 24; el repositorio incluye `.node-version`.
6. Añade un disco persistente montado en `/var/data` y configura `DATA_DIRECTORY=/var/data`. La solución SQLite necesita una única instancia con disco persistente; no selecciones un servicio sin persistencia para conservar cuentas.
7. Configura `PUBLIC_ORIGIN=https://TU-SERVICIO.onrender.com`. El lanzador también puede usar `RENDER_EXTERNAL_URL` si Render la proporciona.
8. Configura **Health Check Path:** `/health`.
9. Añade las claves de Adzuna, LinkedIn y SMTP como variables de entorno secretas si necesitas esos servicios. No son necesarias para las fuentes Greenhouse iniciales.
10. Publica y comprueba crear una cuenta, iniciar sesión, buscar ofertas, guardar una y reiniciar el servicio conservando los datos.

El disco persistente de Render requiere un servicio de pago según su documentación; revisa el coste actual antes de contratar. No se ha creado ningún servicio ni contratado ningún plan automáticamente.

Referencias: [despliegue Node](https://render.com/docs/deploy-node-express-app), [discos persistentes](https://render.com/docs/disks).

Los servicios internos se ejecutan como procesos independientes dentro del mismo despliegue y se comunican por REST en loopback. Solo el servidor de producción recibe tráfico público. No se publican los puertos internos.

## 4. Administrador del despliegue

Los datos del administrador de tu ordenador no se suben a GitHub ni se copian al servidor. En la consola privada del servicio, ejecuta:

```sh
node services/bootstrap-admin.mjs TU_CORREO
```

La contraseña se guarda en el archivo privado `$DATA_DIRECTORY/admin-access.txt`. Consúltalo únicamente en la consola privada y conserva esa credencial de forma segura. No uses esa contraseña en el README, en GitHub Actions ni en los logs públicos. No vuelvas a ejecutar el comando salvo que quieras restablecer la contraseña e invalidar sus sesiones.

## 5. Alternativa Docker

```sh
docker build -t talentscope .
docker run --name talentscope -p 3000:3000 -v talentscope-data:/app/data -e PUBLIC_ORIGIN=http://localhost:3000 talentscope
```

Abre `http://localhost:3000`. Para publicar en Internet utiliza HTTPS mediante el alojamiento o un proxy y cambia `PUBLIC_ORIGIN` a la URL final. Guarda las variables secretas fuera de Git; no incluyas `.env` ni `data/` en la imagen. El Dockerfile está preparado pero no se ha ejecutado una construcción Docker en este entorno.

## 6. Actualizaciones y límites

Render puede desplegar automáticamente cada push a la rama conectada. Mantén el volumen y haz copias de seguridad coherentes de SQLite. El servicio tiene varias bases de datos; una copia del archivo principal mientras WAL está activo puede ser incompleta: utiliza las herramientas de backup de SQLite o detén el servicio para una copia consistente.

Antes de un uso público amplio faltan verificación de email, recuperación de contraseña, retención configurable de actividad, revisión de privacidad y pruebas de carga. La versión actual es una aplicación educativa funcional, con un despliegue preparado, no una garantía de disponibilidad empresarial.

## Activar el perfil obligatorio de currículum

Configura OPENAI_API_KEY como secreto del servidor y OPENAI_CV_MODEL (por defecto gpt-4.1-mini). En desarrollo usa .env; en el alojamiento, las variables privadas del servicio. Nunca uses VITE_OPENAI_API_KEY ni subas la clave a Git. Después reinicia con npm.cmd run dev en Windows o reinicia el servicio de producción.

También el administrador deberá completar el CV en su siguiente acceso. Sin clave el análisis no estará activado y no se podrá completar este paso. PDF/DOCX/TXT se procesan en memoria; instala las nuevas dependencias con npm.cmd ci al actualizar el repositorio.

Antes de abrir el servicio a terceros, completa PRIVACY_CONTROLLER y PRIVACY_CONTACT y adapta las condiciones de tratamiento y conservación al despliegue real. El botón de aceptación no sustituye las obligaciones del responsable. Las pruebas usan una respuesta simulada de OpenAI; valida acceso, saldo y un CV de prueba sin datos personales en el despliegue configurado.
