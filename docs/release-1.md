# Primera entrega: R0, S1, S2 y A1

Fecha de revisión: 12 de noviembre de 2026. Implementación local; sin despliegues, commits, pushes ni cambios en Storyblok, contenido editorial o formularios de contacto.

## R0: línea base de rutas y HTTP

El manifiesto versionado `tests/fixtures/routes.json` enumera las diez páginas App Router, tres handlers, rutas de metadata, redirecciones y familias de URLs públicas. Una prueba detecta la eliminación o incorporación accidental de rutas durante esta entrega. Los slugs de contenido permanecen en Storyblok; no se guarda una exportación editorial ni información de clientes.

| Familia | Responsable | Comportamiento esperado |
| --- | --- | --- |
| `/`, `/es-co` y otras páginas CMS | Catch-all opcional | Contenido publicado por defecto; 200 si existe. |
| `/posts`, `/es-co/posts` | Páginas explícitas | Colecciones publicadas filtradas por idioma. |
| `/posts/<slug>`, `/es-co/posts/<slug>` | Catch-all | Cada idioma conserva su slug y canonical. |
| `/case-studies`, `/es-co/case-studies` | Catch-all | Resuelve `case-studies/home`; conserva relaciones existentes. |
| Detalles de casos en ambos idiomas | Catch-all | Registros relacionados por identidad, sin reemplazar slugs. |
| `/categories`, `/es-co/categories` y detalles | Páginas explícitas | Comportamiento actual, dependiente de Storyblok. |
| `/contact` | Página explícita | 200; formulario sin cambios en esta entrega. |
| `/landing` | Página explícita | Contenido publicado o draft de una sesión autorizada. |
| `/home` | Configuración Next.js | 308 a `/`. |
| `/es` y `/es/*` | Proxy | 308 a `/es-co` y `/es-co/*`, conservando query string. |
| `/live-preview/*` sin autorización | Layout y página | 404 antes del streaming; sin solicitar contenido draft. |
| `/live-preview/*` autorizado | Página dinámica | 200 si existe; privado, `no-store`, `noindex`. |
| `/api/draft` | GET | 401 sin secreto válido; 400 para destino inválido; 503 si falta el token del servidor; 307 y cookie solo tras validar. |
| `/api/contact` | POST existente | Sin cambios; GET devuelve 405. No se envían mensajes en las pruebas. |
| `/api/revalidate` | GET existente | 401 sin autorización; no se invalida producción en las pruebas. |
| `/robots.txt`, `/sitemap.xml` | Metadata Routes | 200; generación y URLs sin cambios. |
| Slug inexistente | Catch-all y `notFound()` | Página de no encontrado con `noindex`; puede responder 200 si ya comenzó el streaming. Riesgo SEO preexistente, fuera de S1. |

Verificaciones públicas de solo lectura, mediante HEAD:

- `https://jhonattan.dev`: las once rutas consultadas responden 308 al mismo path bajo `https://www.jhonattan.dev`.
- `https://www.jhonattan.dev`: `/`, `/posts`, `/es-co/posts`, `/case-studies`, `/categories`, `/contact`, `/landing`, `/robots.txt` y `/sitemap.xml` responden 200.
- En `www`, `/home` responde 308 a `/`; `/es/posts`, 308 a `/es-co/posts`.
- No fue posible conectar con el dominio de respaldo `https://jhonattanbenitez.dev` desde este entorno. Esto no prueba su estado general ni autoriza a sustituirlo.
- No se rastrearon detalles de clientes ni se hicieron solicitudes autenticadas a producción. Las comprobaciones de familias dinámicas se completan con fixtures sintéticos locales.

### Dominio canónico

Se mantiene la precedencia `SITE_URL` → `NEXT_PUBLIC_SITE_URL` → `https://jhonattanbenitez.dev`. Las dos variables de dominio están ausentes en el entorno local revisado, por lo que aquí se utiliza el respaldo. No se modifican constantes ni configuración del hosting. Una prueba fija esta precedencia y el respaldo actual.

**Pendiente antes de desplegar:** comprobar en el entorno de destino el valor efectivo, los canonicals renderizados, el sitemap y las redirecciones del hosting. La diferencia entre el dominio observado y el respaldo exige una decisión explícita de dominio; esta entrega no ejecuta una migración SEO.

### Traducciones y previews

- La URL determina el idioma: inglés sin prefijo y español con `/es-co`.
- Los artículos traducidos son registros distintos; `alternates`, `group_id` y `content.language` verifican la relación. Sin una traducción válida no se anuncia un alternate inventado.
- Se conservan las pruebas existentes de colecciones, casos, cambio de idioma, query strings, canonical y hreflang.
- Las visitas ordinarias siguen solicitando contenido publicado, incluso durante el desarrollo.
- El Visual Editor inicia una sesión mediante `/api/draft` con un secreto exclusivo del servidor y un destino interno válido. Se conservan los parámetros `_storyblok*` necesarios para el bridge y se excluyen el secreto de entrada y los parámetros ajenos.
- La cookie de Next.js y la sesión de aplicación son HttpOnly y, en producción, Secure y SameSite=None. Se exige tanto Draft Mode como una sesión HMAC firmada, con nonce aleatorio y caducidad de una hora. Rotar `STORYBLOK_DRAFT_SECRET` invalida las firmas anteriores. Ni el referer, ni el iframe, ni una cookie de bypass aislada autorizan borradores. Las sesiones antiguas deben reiniciarse.

## S1: cambios de seguridad

- Layout y página comprueban autorización antes de renderizar o solicitar drafts. El control en el layout evita que el shell envíe un 200 antes de detectar la denegación. Todas las rutas que pueden seleccionar drafts usan la misma sesión firmada, incluidas las páginas ordinarias y la landing. Esto cubre también el bypass deliberadamente permisivo que Next.js aplica durante el desarrollo.
- La entrada valida el destino antes de habilitar la cookie: rechaza URLs, rutas relativas al protocolo, backslashes, controles, query/hash dentro del slug, traversal, codificación inválida o doble y destinos de infraestructura.
- Se conserva el origen de la solicitud al construir la redirección. La respuesta no transmite el secreto al destino ni mediante referrer.
- Las respuestas de entrada y de preview reciben `Cache-Control: private, no-store, max-age=0`, `X-Robots-Tag` y `Referrer-Policy: no-referrer`. Las páginas normales con cookie draft también quedan fuera de caché compartida e indexación mediante el proxy. La presencia de la cookie solo puede restringir caché/medición; nunca concede acceso.
- Se retira el fallback `NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN` del SDK y de la capa de datos. La entrega publicada mantiene su fallback público existente.
- La representación pública usa `StoryblokServerComponent` directamente. Así no consume el caché global de ediciones en vivo del SDK. La sesión autorizada conserva `StoryblokStory` y su bridge.

**Bloqueo de configuración:** el entorno revisado no tiene `STORYBLOK_PREVIEW_TOKEN` exclusivo del servidor y sí conserva configuración antigua de preview público. La aplicación falla cerrada: el editor necesitará que se revoque el token expuesto anteriormente y se configure uno nuevo en el servidor. No se copian credenciales, no se rotan claves desde esta tarea y no se modifica `.env.local`. El funcionamiento autorizado se valida con credenciales y contenido sintéticos.

## S2: inventario y renderizado

Antes de añadir la sanitización se inspeccionaron los 38 registros publicados, sin registrar nombres, slugs, identificadores, tokens ni cuerpos. El inventario definitivo con el parser Markdown (`npm run inventory:content`) encontró **0 campos `intro`/`content` con nodos HTML**. Los ejemplos dentro de bloques de código no se cuentan como HTML editorial. No se inspeccionó contenido draft privado.

El repositorio ya tenía un test que conserva `<aside class="note">`. Se mantiene ese contrato y el HTML seguro admitido por el esquema base de `rehype-sanitize`, incluidos `details` y `summary`.

- `rehype-sanitize` se ejecuta después del resaltado con una lista permitida de clases del highlighter.
- Se conservan Markdown, GFM, tablas, listas de tareas, notas al pie, enlaces relativos/HTTPS/mailto, bloques de código y el aside existente. Las notas al pie mantienen sus hashes publicados; los enlaces a identificadores saneados se ajustan sin retirar la protección frente a DOM clobbering.
- Se eliminan scripts, handlers, estilos, iframes, SVG ejecutable y protocolos peligrosos. Los identificadores HTML se protegen frente a DOM clobbering.
- Se elimina el fallback de `CaseStudy` que podía reinsertar la introducción cruda cuando el HTML sanitizado quedaba vacío.
- El JSON-LD escapa caracteres sensibles para HTML y separadores Unicode. Tras `JSON.parse`, los valores siguen siendo los mismos; ninguna cadena puede cerrar el elemento `script`.

No se alteran registros editoriales. El cambio intencional es que el HTML peligroso deja de ser ejecutable. HTML y clases arbitrarios fuera del esquema no son una función soportada.

## A1: consentimiento y medición

Se conserva el ID GA4 existente. La carga incondicional del layout se sustituye por un único cargador condicionado al consentimiento y a la habilitación explícita del entorno.

- Estado inicial sin scripts, cookies de GA nuevas ni eventos de medición.
- Aceptar persiste una elección versionada y permite una sola inicialización por documento.
- Rechazar no carga Analytics. Preferencias de cookies permite revisar y revocar la elección.
- Revocar activa inmediatamente `ga-disable`, elimina cookies GA accesibles desde el host/path y recarga un documento que ya cargó Analytics para descargar sus listeners. También se sincroniza entre pestañas.
- Una cookie de exclusión respalda las denegaciones si falla la escritura en localStorage. Una aceptación que no pueda guardarse no habilita Analytics. Si todos los mecanismos de persistencia fallan, la denegación sigue vigente en esa pestaña y se muestra el fallo al usuario.
- Las elecciones antiguas no se migran automáticamente: el visitante debe aceptar la nueva declaración de analítica opcional.
- No se carga Analytics en desarrollo, sesiones draft, `/live-preview/*`, URLs con `_storyblok`, ni dentro de iframes.
- Solo se envía una vista manual por cambio de pathname. No se envían búsquedas, fragmentos ni contenido del formulario. Anuncios, señales y personalización permanecen deshabilitados.

**Configuración pendiente de GA4:** `ANALYTICS_ENABLED` es una variable exclusiva del servidor, deshabilitada por defecto. Antes de establecerla a `true` únicamente en producción, hay que desactivar “Page changes based on browser history events” en Enhanced Measurement. `send_page_view: false` por sí solo no desactiva ese ajuste remoto y podría duplicar las vistas manuales. No se dispone de acceso a la propiedad para verificarlo o cambiarlo. Mantener Analytics deshabilitado evita introducir medición ambigua mientras se resuelve esa dependencia. [Documentación oficial](https://developers.google.com/analytics/devguides/collection/ga4/views).

## Archivos de la entrega

| Responsabilidad | Archivos |
| --- | --- |
| Autorización, destinos y SDK | `lib/request-security.ts`, `lib/draft-session.ts`, `lib/storyblok-data.ts`, `lib/storyblok.ts` |
| Preview y cabeceras | `src/app/api/draft/route.ts`, `src/app/live-preview/[[...slug]]/page.tsx`, `src/proxy.ts`, `next.config.ts` |
| Layout y representación segura | `src/app/layout.tsx`, `src/app/[[...slug]]/page.tsx`, `src/app/landing/page.tsx`, `components/CaseStudy.tsx`, `utils/markdown.ts`, `utils/seo.ts` |
| Consentimiento | `utils/analytics-consent.ts`, `components/ConsentedAnalytics.tsx`, `components/CookieBanner.tsx`, `translations/en.ts`, `translations/es.ts` |
| Línea base e inventario | `scripts/inventory-editorial.mjs`, `tests/fixtures/routes.json`, `tests/routes-baseline.test.mjs` |
| Regresiones | `tests/analytics-consent.test.mjs`, `tests/markdown.test.mjs`, `tests/security-correctness.test.mjs`, `tests/seo-localization.test.mjs`, `tests/storyblok-data.test.mjs` |
| Integración local | `tests/integration/security.mjs`, `tests/integration/server-fixtures.js` |
| Dependencias y documentación | `package.json`, `package-lock.json`, `README.md`, este informe |

Se añade una dependencia de ejecución justificada por sanitización (`rehype-sanitize`) y una de desarrollo para navegador (`playwright-core`). No se crean servicios de pago ni se descargan navegadores automáticamente.

## Validación y límites

Validación final con Node.js 24.21.0 y Chromium local:

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 9 archivos completados, sin fallos. |
| `node --experimental-strip-types --test --test-isolation=none tests/*.test.mjs` | 75 casos, 75 aprobados, 0 fallidos. Incluye firma, manipulación, expiración y rotación de sesión; destinos maliciosos; XSS; GFM; localización y consentimiento. |
| `tsc --noEmit --incremental false` | Sin errores. El build también ejecutó TypeScript correctamente. |
| `npm run lint` | 0 errores y 2 advertencias preexistentes en `contexts/ThemeContext.tsx` (`react-hooks/set-state-in-effect`). |
| `npm run build` | Build de producción completado con Next.js 16.1.6/Turbopack; 49 entradas procesadas y familias de rutas conservadas. El último build no reportó errores ni 429. |
| `npm run test:integration` | 10 grupos HTTP/navegador aprobados contra procesos locales de producción y desarrollo. |
| `npm run inventory:content` | 38 registros publicados; 0 campos Markdown con HTML editorial. |
| Inspección del bundle cliente | Los valores configurados del antiguo token de preview público, del secreto draft y del secreto de revalidación no aparecen en los archivos compilados de cliente. Solo se reportaron booleanos, nunca valores. |
| `git diff --check` | Sin errores de formato. |
| Comprobación del alcance | Archivos de contacto sin cambios; no se añadieron rutas, commits, pushes ni despliegues. |

Las pruebas HTTP/navegador usan un servidor Next.js de producción local, otro de desarrollo y upstreams sintéticos. Toda solicitud externa de Analytics o del bridge se intercepta; no se producen mediciones ni cambios remotos. Cubren continuidad de rutas, cookies falsificadas o incompletas, ausencia de token, bridge autorizado, aislamiento de ediciones frente a la vista pública, exclusión de indexación/caché, cargas XSS, JSON-LD, consentimiento previo, preferencias antiguas, navegación SPA, recarga, cookies aceptadas conservadas, revocación entre pestañas y exclusión de desarrollo/previews. En desarrollo también se prueba que el bypass permisivo de Next.js no permite leer drafts sin firma.

### Diferencias respecto al comportamiento anterior

| Antes | Después |
| --- | --- |
| `/live-preview/*` solicitaba drafts sin sesión verificada. | Denegación antes de solicitar datos, con 404 inicial y verificación repetida en la página. |
| La cookie de bypass de Next.js era la única señal de Draft Mode. | Se exige además una sesión firmada de una hora, también en desarrollo; las sesiones antiguas se reinician. |
| Un token público podía usarse para obtener drafts. | Solo se admite el token de preview del servidor; falta de configuración devuelve 503 en la entrada autorizada. |
| El SDK podía consumir su caché global de ediciones al representar contenido público. | La representación pública no lee ese caché; el bridge permanece en sesiones autorizadas. |
| El HTML de Markdown y las cadenas JSON-LD podían contener cargas ejecutables. | Se aplica sanitización y serialización segura, conservando contenido válido y enlaces GFM. |
| GA4 se cargaba independientemente del banner. | Se requiere habilitación explícita del entorno y consentimiento; desarrollo y previews quedan excluidos. |
| No existía una vía funcional de revocación. | Preferencias persistentes, sincronización entre pestañas y descarga del runtime al revocar. |
| URLs, traducciones, dominio y contacto existentes. | Se conservan; no se migran registros ni se corrigen formularios en esta entrega. |

El primer build real completó con advertencias de Storyblok 429 al resolver algunas traducciones. El siguiente build completó sin esos avisos. Ninguno equivale a una verificación del CMS draft ni de la propiedad GA4 real.

Antes de desplegar deben verificarse:

1. Token preview nuevo y exclusivo del servidor; revocación del que pudo haberse publicado antes. Retirar la variable pública antigua del hosting y hacer una compilación limpia del artefacto de despliegue.
2. Dominio efectivo, canonicals y sitemap en el entorno de destino, manteniendo las URLs vigentes.
3. Visual Editor real por HTTPS, Real paths existentes, parámetros del bridge y comportamiento de cookies de terceros en los navegadores soportados. La prueba local ejercita un iframe y bridge simulados.
4. CDN/hosting respetando `no-store` y `X-Robots-Tag` en respuestas normales, errores y redirecciones de previews; purgar cualquier caché de drafts de despliegues anteriores.
5. Acceso a GA4, desactivación de vistas automáticas por historial y revisión de medición mejorada para impedir captura de campos o parámetros sensibles; solo entonces habilitar la variable en producción y comprobar DebugView/Network con consentimiento.
6. Redacción de secretos de entrada en logs de acceso y URLs de configuración del editor. El secreto en query se conserva por compatibilidad del flujo de entrada; no debe publicarse en documentación ni links públicos.

Persisten fuera del alcance de esta entrega los fallos de contacto descritos en la auditoría, la política general de caché de `/api/revalidate`, el endurecimiento general de CSP, imágenes SEO de respaldo ausentes, metadata genérica de colecciones y respuestas de no encontrado públicas condicionadas por streaming. No se cambian para evitar ampliar R0/S1/S2/A1.
