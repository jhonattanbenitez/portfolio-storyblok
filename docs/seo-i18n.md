# SEO e internacionalización: implementación local

## Dominio aprobado y entorno

Dominio canónico aprobado: `https://www.jhonattan.dev`.

Se conserva la precedencia `SITE_URL` → `NEXT_PUBLIC_SITE_URL` → respaldo aprobado. Un valor antiguo explícito en el hosting sigue teniendo prioridad sobre el respaldo del código. Antes de compilar/desplegar, establecer `SITE_URL=https://www.jhonattan.dev`; si existe `NEXT_PUBLIC_SITE_URL`, actualizarla también al mismo origen. No se han modificado variables reales, DNS ni hosting. Layout, canonical, Open Graph, hreflang, JSON-LD, sitemap y robots utilizan `getSiteUrl()`.

El código nuevo sustituye la decisión de dominio descrita en la sección histórica de `release-1.md`; no modifica retrospectivamente ese registro.

## Rutas e idiomas

- Inglés conserva sus URLs sin prefijo; español conserva `/es-co` y sus slugs reales. Se conservan `/home` → `/` y `/es/*` → `/es-co/*`.
- Artículos y categorías tienen identidad explícita mediante `content.language`. Un slug usado bajo el idioma incorrecto redirige con `permanentRedirect` a su traducción validada (ID, grupo y reciprocidad), o a la URL del propio registro si no existe traducción válida. Conserva valores repetidos del query string.
- Las variantes incorrectas anuncian `noindex, follow` y canonical al destino, sin hreflang inventado. Esto protege respuestas en streaming que pueden enviar HTTP 200 antes de materializar la redirección. Fuera de streaming, Next puede devolver 308.
- La navegación de categorías publica las URLs reales de sus alternates al selector existente, en ambos sentidos.
- No se renombra ni elimina ningún slug. Las URLs con erratas se conservan. No se inventan relaciones para páginas CMS compartidas por localización de campos ni para registros sin idioma explícito.
- Los casos de estudio conservan su resolución existente mediante alternates; no se infiere un idioma a partir del texto o del slug cuando falta `content.language`.
- Siguen consumiéndose registros separados y representaciones localizadas. No se migran, eliminan ni corrigen campos del CMS.

## SEO y colecciones

- Las introducciones se convierten a texto plano mediante el parser Markdown/GFM y sanitizador existentes antes de generar description, Open Graph, Twitter y JSON-LD. El HTML visible no cambia.
- Las entradas independientes del sitemap conservan su propia fecha de modificación, en lugar de tomar la fecha de la traducción procesada primero.
- Los artículos se consultan con `content_type=post` y orden explícito `content.date:desc,id:desc`. La fecha editorial es la existente; no se reemplaza por fecha de actualización.
- `getPosts()` recorre las páginas de 100 registros y conserva la colección completa actual. `getPostsPage({page, perPage, ...})` prepara consultas acotadas para una futura interfaz; valida números y límites de 1–100 del Delivery API.
- No se añaden controles de paginación ni se cambian diseños. Los artículos sin categoría siguen presentes en `/posts` y fuera de colecciones filtradas.
- `allowImportingTsExtensions` permite importar el helper Markdown por `.ts` desde SEO, compatible con el ejecutor Node nativo existente y el proyecto `noEmit`; no se añade un runner ni dependencias.

## Verificación

```bash
node --experimental-strip-types --test --test-isolation=none tests/*.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
SITE_URL=https://www.jhonattan.dev npm run build
npm run test:integration
git diff --check
```

El ejecutor de integración existente arranca procesos locales aislados, utiliza fixtures sintéticos y Chromium instalado, e intercepta servicios externos. Sus comprobaciones nuevas verifican dominio, description sin Markdown, sitemap/robots, selector EN↔ES de categorías y aliases de artículos/categorías. No escribe en Storyblok, no despliega y no activa medición remota.

## Pendientes antes de desplegar

1. Revisar los cambios locales anteriores junto con esta entrega; no se han confirmado en Git.
2. Aplicar las variables canónicas indicadas en el entorno de compilación y ejecución, y realizar un build nuevo.
3. Validar en staging todos los slugs vigentes, redirecciones, query strings, idiomas y canonicals/hreflang recíprocos; comprobar ausencia de bucles.
4. Confirmar las redirecciones de hosting hacia el dominio aprobado. No cambiar DNS automáticamente.
5. Comparar sitemap y robots desplegados con el inventario de URLs válidas; no deben anunciar el dominio anterior ni aliases con idioma equivocado.
6. Los errores editoriales, la imagen social de respaldo ausente y los textos alternativos de assets permanecen fuera de esta implementación; no se alteró contenido del CMS.

## Resultados obtenidos

- TypeScript sin emisión ni caché incremental: aprobado.
- ESLint: cero errores; conserva dos advertencias preexistentes en `contexts/ThemeContext.tsx`.
- Unitarias: 89/89 casos con `--test-isolation=none`; el comando normal también completa los diez archivos sin fallos.
- Build real de producción con el dominio aprobado: aprobado, 49 entradas procesadas.
- Integración HTTP/Chromium: 12/12 grupos aprobados. Incluye navegación real EN↔ES de categorías y los cuatro aliases sintéticos de artículos/categorías.
- La expectativa anterior de JSON-LD que conservaba HTML en description se actualizó al resultado exacto `Safe intro`; las demás aserciones de seguridad permanecen.
- Sitemap compilado: 45 URLs únicas, todas bajo `www.jhonattan.dev`.
- Lecturas reales con la capa nueva contra contenido publicado: 15 artículos EN y 15 ES, cinco artículos en cada categoría existente, IDs únicos y orden fecha/ID verificado.
- `git diff --check`: aprobado. HEAD permanece en `67d8bc6af630ebade122edfd5e4a147f4244012f`; sin commits ni pushes.
- `package.json` y `package-lock.json` conservan exactamente los hashes del inicio de esta tarea, incluidos los cambios que ya tenían.
- Respaldo previo revalidado: `[local path omitted]`, 256 archivos regulares verificados. El archivo incluye instrucciones de extracción en un directorio nuevo; excluye dependencias instaladas y `.next`.

Los resultados locales y las lecturas publicadas no equivalen a un despliegue. Sigue pendiente la comprobación del entorno de destino y la revisión editorial del contenido que no se modificó.
