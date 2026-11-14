# Littan → Hebra Viva — cambio guardado en borrador

**Estado actual: aplicado en Storyblok EN/ES, sin publicar.**
El titular autorizó ejecutar la propuesta mediante «haz el cambio de littan a
hebra viva». Se cargó una captura real nueva y se guardó una única actualización
del borrador de Home. No se ejecutó `publishStory` ni se modificó Vercel.

## Destino y alcance

- Espacio `1023389`, región `us`; Home ID `23893963`.
- UUID `8ec2e219-99d3-4dd4-884c-17e721aafe0a`.
- Sección projects `1a081b28-a33c-4aa3-b7cd-ed605bc630ce`.
- Bloque `4f6a2c22-67d5-4639-a520-d4cada19a218`, conservado en índice 5,
  dentro de «Más proyectos» en Home V2.

Se modificaron exclusivamente siete propiedades del bloque: `title`,
`description`, `description__i18n__es_co`, `image`, `previewUrl`, `gitUrl` y `tag`.
El resto del contenido completo de Home, los otros cinco proyectos, IDs, orden,
relaciones, imágenes ajenas y fechas editoriales permanecen idénticos.

Nombre: **Hebra Viva**. Enlace: <https://hebraviva.co/>.
El enlace al repositorio Littan quedó vacío. Tags: `all`, `web`, `ecommerce`;
se retiró `accessibility` para no heredar una atribución no aportada.

**Descripción EN**

An e-commerce platform that helps people choose products for curly and
Afro-textured hair. My technical work spans the shopping experience, catalog,
cart, logistics, SEO and analytics, using WordPress, WooCommerce, Docker, Caddy
and MariaDB.

**Descripción ES**

Un e-commerce que facilita elegir productos para cabello rizado y afro. Mi
trabajo técnico abarca la experiencia de compra, catálogo, carrito, logística,
SEO y analítica, con WordPress, WooCommerce, Docker, Caddy y MariaDB.

El catálogo y navegación se observaron públicamente; el stack y la contribución
técnica proceden del titular. No se afirman métricas, ventas ni resultados
comerciales. No se ejecutaron compras, pagos ni envíos de formularios.

## Localización e imagen verificadas

MAPI confirmó la clave nativa `description__i18n__es_co`. Título y tags no tenían
overrides; imagen y enlaces no son traducibles en el esquema actual. No se
crearon campos ni claves de localización adicionales.

Asset nuevo **241404860872383**, captura propia del catálogo, 1280 × 800,
114995 bytes. No contiene información personal ni direcciones residenciales.
Archivo público:
<https://a-us.storyblok.com/f/1023389/1280x800/94bdb257f4/hebra-viva-catalog.png>.
SHA-256: `74a6bebc2c632124e9520fb49caa383c35bfb529e21b2bdda1d30129c2cc3a20`.

Alt compartido compatible con el esquema: “Hebra Viva — catálogo de productos /
product catalog”. El asset anterior de Littan no se modificó ni eliminó.
La captura ya está en el CDN; la Home publicada todavía utiliza el asset anterior.

## Operación y verificación real

- Lectura MAPI completa, respaldo privado y comparación de concurrencia antes
  del guardado; `updated_at`, versión e identidad sin cambios inesperados.
- Una única `updateStory`, fusionando todo el contenido vigente:
  `publish:false`, `force_update:false`, `strict_mode:1`.
- Versión antes: `141032855860171`; después: `241405533182213`.
- Guardado: `2026-11-14T03:21:37.762Z` (UTC).
- MAPI posterior: `published:true`, `unpublished_changes:true`.
- CDA draft EN/ES: **Hebra Viva**, descripciones exactas, enlace correcto,
  repositorio anterior retirado y asset nuevo confirmado.
- CDA published EN/ES: **Littan Store**, contenido e imagen anteriores intactos.
- Las cuatro representaciones conservaron los otros cinco proyectos.

Storyblok avanzó `updated_at` también en CDA publicada al guardar el draft;
`published_at` sigue en `2026-02-03T12:24:09.795Z` y el contenido público no cambió.
El primer contraste draft/publicado detectó solo metadatos `_editable` del
editor. Se conservaron los paths del diagnóstico y se normalizó únicamente esa
clave, manteniendo `_uid` y todos los campos editoriales en la comparación.

Evidencia sanitizada: `artifacts/home-v2/hebra-viva/draft-change-01/`, con recibos
MAPI/CDA, asset y hashes. Preimágenes y payload completo en su subdirectorio
privado, fuera de Git. Los parámetros firmados de carga se usaron solo en
memoria, sin guardarlos ni mostrarlos. La propuesta anterior y el ensayo local
se conservan como historial; [el JSON propuesto](hebra-viva-replacement.proposed.json)
no es un payload para repetir la escritura.

No se cambió código, staging, artículos, esquema, flags ni infraestructura.
Los 11 archivos previamente preparados y los 17 históricos permanecen intactos.
No se crearon commits, pushes ni deployments. No se repitieron builds ni matrices
ajenas: se verificó el contenido real de MAPI/CDA y la imagen HTTPS.

**Siguiente paso: revisión visual del borrador en Storyblok. La publicación de
Home queda pendiente de autorización.**

Reality Checker: **PASS**, con lecturas independientes MAPI, comprobación del
asset, comparación completa de contenido y contraste CDA draft/publicada.
Dictamen local en `draft-change-01/reality-check.json`; no autoriza publicación.
