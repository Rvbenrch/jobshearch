# Junior Scope

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

**Comunidad:** publicaciones de proyecto, investigación o aportación con título, contenido y temas; borradores privados, publicación, búsqueda, edición y eliminación por su autor. Las publicaciones muestran su nombre a los miembros incluso si mantiene oculto su perfil. Esta versión no incluye comentarios, chat ni correo automático.

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
