# Junior Scope

## Demo visual gratuita en GitHub Pages

La demo usa una entrada independiente (`demo.html` y `web/demo.jsx`) y ejemplos ficticios. Permite cambiar entre Junior, Empresa y Admin, buscar ofertas por país, explorar perfiles, publicar ejemplos, reaccionar/comentar y simular candidaturas, descartes, mensajes y moderación. No hay registro real ni contraseñas. Los cambios viven únicamente en memoria de la pestaña y desaparecen al recargar; no se envían a personas o servidores.

```powershell
npm.cmd run build:demo
npm.cmd run preview:demo
```

El compilador crea `dist-demo`, con rutas `/jobshearch/`, sin copiar `public/` ni leer archivos `.env`. Solo se publican HTML, CSS y JavaScript inspeccionados. La aplicación real y sus servicios quedan independientes de esta demo.

Para publicar: en GitHub, Settings → Pages → Source: GitHub Actions. El workflow `.github/workflows/pages.yml` compila y publica únicamente `dist-demo`. Se puede ejecutar desde Actions → Publicar demo visual → Run workflow. No requiere configurar claves propias. La dirección prevista tras un despliegue correcto es https://rvbenrch.github.io/jobshearch/; consultar Actions para confirmar que está publicada. El prototipo no contiene cifras reales del mercado laboral ni datos de usuarios.

Comunidad para personas que empiezan su trayectoria profesional y empresas que quieren descubrir su potencial. Reúne perfiles de juniors, proyectos, investigaciones y oportunidades publicadas por las propias empresas.

Esta versión sustituye el flujo de TalentScope: **no requiere CV, no utiliza Ollama ni IA y no busca/importa ofertas de portales externos**. No crea perfiles ni ofertas ficticias. Los catálogos muestran estados vacíos hasta que sus miembros publiquen.

## Experiencias y permisos

| Tipo | Funcionalidades |
| --- | --- |
| Junior | Crear su perfil, decidir su publicación, gestionar sus propios proyectos/investigaciones/aportaciones y consultar contenido publicado. |
| Empresa | Presentar su empresa, descubrir juniors y gestionar exclusivamente sus propias ofertas. |
| Administrador | Permiso independiente del tipo. Consultar cuentas e interacciones; no concede publicación como otro tipo ni edición de contenido ajeno. |

El registro permite seleccionar Junior/Empresa. Las cuentas anteriores conservan contraseña, identificador, datos y rol; eligen su tipo en el siguiente acceso. El tipo elegido no se cambia desde el cliente. Los datos antiguos no se convierten automáticamente en contenido público.

## Funcionalidades

**Perfil junior:** nombre, presentación, descripción personal, estudios, titulaciones, FP, idiomas, competencias, prácticas, qué aporta, ubicación, disponibilidad y portfolio. Sin exigir años de experiencia. El perfil solo aparece en el directorio tras activar expresamente su publicación. Correo de acceso, contraseña, rol y datos de CV antiguos quedan fuera de las fichas públicas.

**Comunidad:** publicaciones de proyecto, investigación o aportación con título, contenido y temas; borradores privados, publicación, búsqueda, edición y eliminación por su autor. Las publicaciones muestran su nombre a los miembros incluso si mantiene oculto su perfil. Incluye conversaciones con comentarios y fotos; no incluye chat privado ni correo automático.

**Ofertas propias:** título, descripción, salario con periodicidad, ubicación, modalidad, idiomas, grados, FP, prácticas/formación, competencias e imagen PNG/JPEG/WebP de hasta 500 KB. Se rechazan imágenes SVG y URLs externas. Borradores y ofertas cerradas solo se muestran a su propietario; las publicadas aparecen en el catálogo general. Límite de 200 entradas por cuenta y catálogo. No existe un campo de años de experiencia y se rechazan los campos de años conocidos; el texto libre no se modera automáticamente.

**Administración:** cuentas e interacciones recientes, accesible solo a administradores. El servidor conserva el historial anterior y registra altas, accesos, cambios de perfil y gestión de ofertas/aportaciones.

La API comprueba la propiedad usando la sesión. Enviar otro ownerId, nombre de autor o rol desde el navegador no concede permisos. Los perfiles y condiciones son declaraciones de sus autores. No hay puntuación de afinidad ni estimación de probabilidad de contratación.

## Arquitectura de multiservicios REST

Frontend React con Vite en desarrollo y un servidor Node en producción. Tres procesos independientes se comunican mediante HTTP/JSON:

| Servicio | Puerto | Responsabilidad |
| --- | --- | --- |
| Gateway | 4100 | Sesión, control de origen, límite de peticiones y enrutamiento. |
| Auth | 4101 | Registro, perfiles, directorio y administración. |
| Community | 4106 | Ofertas y publicaciones persistentes; permisos de propietario. |

Los servicios internos escuchan en 127.0.0.1 y requieren INTERNAL_SECRET. El gateway transmite identidad y tipo tras validar la sesión. Auth usa auth.sqlite y Community usa community.sqlite; los datos se guardan en data/ o DATA_DIRECTORY. El lanzador coordina procesos, sin prometer alta disponibilidad ni infraestructura distribuida.

Tecnologías: Node 24+, HTTP y SQLite nativos, React 19, Vite 7, Lucide React y CSS responsive. Contraseñas con scrypt y sal aleatoria, tokens aleatorios guardados con SHA-256, cookie HttpOnly/SameSite=Lax y Secure en HTTPS. No necesita claves de IA ni APIs de empleo. Los archivos históricos del producto anterior pueden permanecer en el repositorio, pero no se ejecutan desde los lanzadores ni las entradas HTML actuales.

## Ejecutar en Windows

Desde la carpeta del proyecto:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173/ y deja la terminal abierta. Si tenías la versión anterior ejecutándose, deténla con Ctrl+C y vuelve a iniciar. npm.cmd evita el bloqueo de npm.ps1 sin cambiar la política de PowerShell.

La configuración opcional está en .env; usa .env.example como referencia. PUBLIC_ORIGIN define el origen, INTERNAL_SECRET la autenticación interna, PORT_OFFSET los puertos y DATA_DIRECTORY la ruta privada. Si falta el secreto, el lanzador genera uno para sus procesos. Las variables antiguas de IA no se utilizan.

## Validación

```powershell
npm.cmd test
npm.cmd run build
```

La prueba de integración usa bases temporales aisladas. Comprueba sesiones, elección y migración del tipo, conservación del administrador y datos anteriores, privacidad, ausencia de datos ficticios, borradores, publicación/cierre, propiedad de edición/eliminación, imágenes, formación, interacciones y rechazo de rutas antiguas. Comprueba el contenido escrito en SQLite; no modifica cuentas reales. También se han comprobado los formularios React por tipo y el contenido de la ficha de oferta mediante renderizado de componentes.

Estas pruebas no equivalen a un despliegue público ni a una auditoría completa de seguridad o accesibilidad.

## Privacidad y Git

.env y .env.* salvo .env.example, data/, node_modules/ y dist/ están excluidos de Git. No publiques bases, sesiones, credenciales locales, documentos ni backups. Los datos personales antiguos se conservan en disco para evitar pérdidas, sin mostrarlos automáticamente en el directorio. Antes de un lanzamiento público define política de privacidad, condiciones, retención, moderación y backups acordes con el uso real.

## Finalidad educativa e investigación

Proyecto educativo para estudiar APIs REST, separación de servicios, permisos por propietario e interfaces para talento junior. No pretende suplantar ni plagiar plataformas de empleo o la identidad de sus marcas. No implica afiliación con ellas.

La dificultad para encontrar empleo depende de formación, mercado, ubicación y otras circunstancias. Esta aplicación no demuestra que una persona desempleada no se esfuerce. Sus registros describen esta comunidad, no una medición representativa de oferta/demanda laboral ni una garantía de contratación.

Consulta DEPLOY.md para Git y alojamiento con backend y almacenamiento persistente.

## Imágenes, conversaciones y moderación

Las publicaciones y comentarios admiten hasta cuatro imágenes PNG/JPEG/WebP de 500 KB cada una. Las reacciones permiten Me gusta o No me gusta, una por persona y publicación, con cambio o retirada; los contadores proceden de SQLite. Cualquier miembro puede comentar o republicar contenido publicado. Una republicación conserva autor y referencia al original; no copia su contenido a otro autor. Si se elimina u oculta el original, la republicación permanece con atribución y un aviso de contenido no disponible. Las republicaciones no se editan como si fueran el original y su propietario puede eliminarlas.

Desde Descubrir juniors, Publicar mi perfil abre un aviso centrado con los campos visibles. Continuar solo abre el formulario de revisión; se publica al aceptar la opción y guardar. Se conserva el consentimiento y se puede ocultar el perfil. Empresas no reciben el botón de autopublicación junior.

Administración permite revisar denuncias sobre personas o publicaciones, resolverlas o desestimarlas con motivo, bloquear temporal o permanentemente y desbloquear. Los usuarios bloqueados conservan lectura y denuncias, ven motivo y fecha de fin, y no pueden subir contenido, imágenes, comentarios, reacciones, republicaciones, ofertas ni cambios de perfil publicado. El temporal expira automáticamente. El historial conserva las acciones. El administrador puede alternar su propio espacio Junior/Empresa con un selector, conservando los campos de cada perfil por separado, sin entrar en cuentas ajenas ni cambiar sus permisos.

La comunidad incluye comentarios en esta versión; no incluye chat privado ni notificaciones automáticas por correo. Consulta SECURITY.md para protecciones, comprobaciones y límites reales de seguridad.

El plan de nube, el subdominio gratuito propuesto y la decisión pendiente de presupuesto están en CLOUD-PLAN.md. Es planificación: no hay recursos contratados ni publicación autorizada en ese documento.
# Candidaturas y conversaciones privadas

Desde una oferta publicada, un junior puede presentar su candidatura con consentimiento explícito, escribir a la empresa o descartar la oportunidad únicamente para su propia lista. En «Ofertas descartadas» puede recuperarla. Descartar no retira una candidatura ni cierra la oferta.

«Mis candidaturas y mensajes» conserva las conversaciones del junior. «Candidatos y mensajes» y el botón de candidatos de cada oferta muestran a la empresa sus propios candidatos, fecha, estado y perfil profesional compartido al presentarse. Una conversación iniciada sin candidatura solo comparte el nombre y los mensajes. El perfil puede estar oculto en el directorio y compartirse expresamente con una empresa al aplicar. No se incluyen correo de acceso, credenciales, roles, otros espacios administrativos ni currículum antiguo.

Hay una candidatura/conversación por junior y oferta. Estados: conversación iniciada, enviada, en revisión, preseleccionada, no seleccionada y retirada. La empresa cambia los estados de sus candidaturas activas. El junior puede retirar su candidatura: se elimina la copia del perfil; permanecen los mensajes privados. Puede volver a aplicar mientras la oferta esté publicada, aceptando de nuevo el consentimiento. Cerrar o eliminar la oferta impide nuevas candidaturas y conversaciones, pero conserva la lectura y respuesta de las conversaciones existentes.

Los mensajes se guardan en SQLite y solo pueden leerlos sus dos participantes; ser administrador no permite leer conversaciones ajenas. Se presentan como texto escapado. Límites por usuario: veinte conversaciones nuevas al día, doscientas en total, cien mensajes al día y cuatro mil caracteres por mensaje. Los bloqueos impiden aplicar y enviar mensajes, conservando lectura, retirada y descartes personales. No se envían correos externos.

Las bandejas consultan cambios cada veinte segundos y la conversación cada diez; no es chat por WebSocket. Las pruebas usan bases aisladas y comprueban consentimiento, duplicados, privacidad, propiedad, estados, bloqueos, retirada, cursores de mensajes y persistencia. Reinicia el proceso de desarrollo para activar los endpoints nuevos.

La propuesta de alojamiento está en `deploy/render.example.yaml`. Es un ejemplo para revisión, no un despliegue ejecutado. Antes de importarlo hay que aprobar coste y completar `CLOUD-PLAN.md`.
