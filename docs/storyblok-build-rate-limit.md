# Home V2: corrección de consultas CDA y fallos de renderizado

Base: `feat/home-v2`, `7c88ceca3a8eb39570bad530c31cb8f362a5592f`.
Resultado: **candidato local validado para solicitar un nuevo deployment**. No se ejecutaron commits, pushes, deployments ni operaciones CMS/configuración remota.

## Causa y mediciones

Metadata y rendering pedían variantes distintas de la misma historia (`resolve_relations`), impidiendo compartir esas consultas. La resolución de alternates y el catálogo bilingüe añadían fan-out; no existía backpressure común. Algunos consumidores absorbían errores del proveedor como colecciones vacías, catálogo legacy o metadata genérica. Así, un build podía terminar correctamente sin garantizar contenido completo.

Un replay **offline** de los helpers originales para las 30 URLs acredita 120 llamadas lógicas, 90 inicios tras simular memoización por render, 60 identidades de petición y pico de 16 simultáneas. No representa el tráfico origin del deployment histórico: no reproduce la Data Cache entre rutas. Un catálogo frío de 15 historias aprobadas necesita 17 lecturas lógicas (links, listado y 15 representaciones ES).

El build final, con caché limpia, código actual y proveedor real, registró:

| Medición | Resultado |
| --- | --- |
| BUILD_ID | `zlDaiHKpSDMJN36OSZeLu` |
| Entorno | Node.js 24.21.0 / Next.js 16.4.6 / modelo ON / Analytics OFF |
| Consultas CDA nativas bajo la caché de Next | 27; 27 respuestas 200; 27 identidades distintas |
| Saltos HTTP observados por undici | 54: 27 redirecciones 301 y 27 respuestas 200 |
| Pico de consultas nativas simultáneas | 2 |
| Inicios nativos observados por segundo | Máximo 4 |
| Errores, 429 o solicitudes sin terminar | 0 |

Las redirecciones HTTP no son consultas lógicas adicionales del loader. No se recuperaron logs remotos de Vercel; no se atribuye al deployment anterior un número de peticiones no medido.

Storyblok documenta cuotas origin más bajas para colecciones de 75–100 elementos (6/s) que para historias individuales; el CDN tiene otros límites. Se eligió un ritmo conservador compartido. Referencias: [CDA](https://www.storyblok.com/docs/api/content-delivery/v2), [caché](https://www.storyblok.com/docs/concepts/caching).

## Archivos y comportamiento corregidos

| Archivos | Cambio |
| --- | --- |
| `lib/storyblok-transport.ts` (nuevo) | Transporte común: máximo 2 solicitudes activas, separación de inicios de 250 ms, cola máxima de 128, coalescencia exclusivamente published mientras están en vuelo, copias independientes para consumidores. |
| `lib/storyblok-data.ts` | Integra transporte, normaliza orden de parámetros, preserva políticas publicadas/draft. Alternates solo absorbe 404; otros errores se propagan. |
| `lib/editorial-server.ts` | No convierte fallos CDA en catálogo vacío/legacy. Proyección pública en Data Cache de Next con revalidate 3600 s, tags CMS y partición mediante digest de credencial. Sin caché permanente no invalidable en memoria. |
| `src/app/[[...slug]]/page.tsx` | Mismo loader publicado memoizado por render para metadata/cuerpo; mismas relaciones. No genera metadata genérica ante fallos. Draft evita ese memo publicado. Payload malformado es error, no 404. |
| `components/HomeV2/HomeV2.tsx` | Requiere colecciones completas; no presenta Home parcial tras `allSettled`. Espera frontera editorial antes de iniciar otras consultas. |
| `src/app/sitemap.ts` | Espera frontera editorial antes de iniciar otras consultas; evita solicitudes abandonadas cuando `connection()` interrumpe prerender. Los fallos no generan sitemap parcial. |
| `src/app/landing/page.tsx` | Propaga errores del proveedor; conserva 404 reales y control de flujo de Next. |
| `src/app/api/revalidate/route.ts` | Una invalidación autorizada por tag específico también invalida `cms`, del que depende la proyección nueva. No cambia autenticación ni cabeceras privadas. |
| `next.config.ts` | Un worker de generación, concurrencia estática 2 y metadata sin streaming (`htmlLimitedBots: /.*/`). |
| `src/app/loading.tsx` (retirado) | Elimina la frontera Suspense global que permitía emitir HTTP 200 antes de descubrir fallos CDA críticos. No elimina `LoadingSpinner` ni cambia contenido/diseño. |

Reintentos: máximo **4 intentos**, timeout por intento **8 s** (incluido JSON), presupuesto total **30 s**, incluyendo cola. Solo 429, 5xx y errores de red/timeout; 404 no se reintenta. Backoff exponencial desde 500 ms más jitter de hasta 250 ms. `Retry-After` admite segundos/fecha HTTP y es un mínimo: si excede 10 s o el presupuesto disponible, se falla en lugar de reintentar anticipadamente. Un cooldown 429 afecta a otras peticiones del proceso. Los errores externos no se copian a mensajes/cause con URL autenticada.

Se conservan `generateStaticParams`, las rutas existentes, el TTL publicado de 3600 s, los tags y `draft: no-store`. Los valores draft no se comparten ni entran en la proyección pública. La autorización de preview permanece intacta.

## Validación efectiva

| Control | Resultado |
| --- | --- |
| TypeScript: `tsc --noEmit --incremental false` | PASS |
| ESLint: `eslint .` | 0 errores; 3 warnings previos en ErrorBoundary/ThemeContext |
| Unitarias: `node --experimental-strip-types --test --test-reporter=tap tests/*.test.mjs` | **503/503**, sin skips; `STORYBLOK_FIELD_TRANSLATION_ENABLED=false` para el harness Node y `BLACKBOX_MIGRATION_SOURCE` apuntando al snapshot publicado local de las 18 pruebas históricas; los casos ON se ejercitan explícitamente y el build/HTTP son ON |
| Build real ON desde snapshot sin `.next` | PASS; métricas anteriores; 49 planes de generación completados |
| Home EN/ES + todos los artículos + muestras categorías/casos | **36 HTTP 200**, incluidos **30/30 artículos** y 15 parejas |
| Canonical, hreflang y JSON-LD de artículos/Home/casos | PASS: URL propia, alternates y contenido/fechas válidos; categorías conservan su contrato existente sin JSON-LD |
| Sitemap y robots | **45 URLs únicas**, 30 artículos; sin pérdida ni duplicación |
| Ruta inexistente y draft anónimo | 404 y 401 respectivamente; draft privado/no-store, sin cookie autorizada |
| Chromium | EN desktop 1440/claro y ES móvil 390/oscuro; imágenes reales, cambio de idioma bidireccional y navegación a artículo PASS |
| JavaScript, consola y Analytics | 0 errores JS/consola, 0 solicitudes Analytics; no envíos de formularios |
| Build offline con 429 persistente inyectado | **Exit 1 esperado**, cero tráfico real CDA: no se publica un artefacto estático parcial |
| Artefacto final real bajo 429 inyectado en runtime aislado | Home/artículo **HTTP 500 + noindex**, sin contenido válido ni canonical inventado; cero tráfico CDA real |
| Fallo tardío exclusivo de categorías Home | Replay offline con mismo código: EN/ES **HTTP 500 + noindex**, sin hero; puede conservar el canonical propio previamente resuelto correctamente |

Las regresiones ejecutan código de transporte/handlers y cubren 429 recuperable/agotado, Retry-After, 404, timeout del cuerpo, red, 5xx, JSON inválido, colisiones de cache, recuperación, cola/deadline, concurrencia entre endpoints y reintentos, draft privado, tags de invalidación y ausencia de metadata genérica. Los mocks unitarios no se presentan como prueba del runtime de Next: lo contrastan build y servidores reales locales.

Archivos de pruebas añadidos/modificados: `tests/storyblok-transport.test.mjs`, `tests/storyblok-build-probe.test.mjs`, `tests/storyblok-fail-closed.test.mjs`, `tests/storyblok-data.test.mjs`, `tests/seo-i18n-routing.test.mjs` y `tests/sensitive-api-responses.test.mjs`. Durante las comprobaciones HTTP/Chromium, el runtime real hizo otras 25 consultas CDA, todas 200, sin errores ni solicitudes pendientes; son un contador separado de las 27 del build.

Durante la investigación se rechazaron resultados incompletos aunque el build terminara con exit 0: una petición abandonada por sitemap y respuestas de error HTTP 200 por streaming. La evidencia anterior permanece separada; los resultados finales pertenecen al código que incluye ambas correcciones.

## Evidencia y reproducibilidad

Todo bajo `artifacts/home-v2/cda-build-01/` (ignorado; no se incorpora a Git):

- `candidate-source.json`: 166 archivos con SHA-256, idénticos en árbol fuente y snapshot aislado del build; no se copiaron `.env` ni respaldos privados.
- `checks-summary.json`, `*-result.json` y logs sanitizados: build, TypeScript, ESLint y unitarias.
- `real-build-probe.json` y `real-build-probe/`: contadores bajo caché y saltos HTTP, sin URL/headers/token/cuerpo.
- `architecture-baseline/`: replay original offline y límites de sus mediciones.
- `http-final-verified/`: harness ejecutado, resultados HTTP/navegador, capturas y manifiesto SHA-256.
- `final-runtime-fault-http.json`, `blocking-negative-summary.json`, `offline-fault-probe.json`: pruebas negativas, separadas del proveedor real positivo.
- `final-runtime-probe.json`, `final-integrity.json`, `final-evidence-manifest.json`: cierre de runtime, integridad de fuentes/Git y hashes de 20 archivos de evidencia. Sin coincidencias de credenciales locales conocidas; package/lock intactos, staging vacío y HEAD sin cambios. Ambos servidores aislados se detuvieron tras las pruebas.
- `first-real-attempt/`, `before-streaming-fix/`, `streaming-diagnosis/`: evidencia previa preservada, no certificación del candidato final.

Los scripts optativos `scripts/diagnostics/storyblok-build-probe.mjs` y `storyblok-build-summary.mjs` permiten observar otro build aislado mediante preload de Node. La instrumentación no forma parte del arranque normal. No habilitar el modo de fallo en un entorno real ni copiar `.next/cache` a Git: puede contener claves internas y contenido de CDA.

## Límites y revisión

- El límite es **por proceso/instancia**, no una cuota distribuida. Los workers de build están acotados; múltiples instancias Vercel pueden consumir cuota simultáneamente.
- Retirar el loading global y bloquear metadata aumenta potencialmente TTFB y elimina el spinner de navegación global. Es necesario para evitar un shell 200 ante fallo. Dos Home calientes midieron 603/749 ms; son observaciones locales, no benchmark ni garantía Vercel.
- Next puede conservar datos publicados previamente válidos durante revalidación fallida; no se reemplazan por colecciones vacías. No se ejecutó una invalidación remota.
- Se preservaron hallazgos editoriales anteriores: H1 adicionales en cinco artículos, espacio inicial en el título Black-Box EN y cuerpo idéntico en ambas historias legacy de Power of Functions. Se contrastó con sus fuentes independientes. No son regresiones de este cambio ni prueba de que ese cuerpo español esté traducido.
- No se probó un nuevo deployment de Vercel ni se reprodujo deliberadamente un 429 real mediante carga. El build real final no tuvo 429; los fallos y recuperación se prueban de forma controlada sin cargar al proveedor.

Revisión de Agency Agents: Frontend Developer implementó transporte; Software Architect contrastó fan-out y streaming; Application Security Engineer revisó privacidad/caché; Test Automation Engineer ejecutó HTTP/Chromium; Reality Checker contrastó fuentes, pruebas negativas, capturas y evidencia final de forma independiente. **Dictamen: GO para revisar y solicitar el deployment del candidato corregido**, sin certificar producción ni ejecutar el despliegue. Informe independiente: `reality-checker-final.json`, SHA-256 `918192aed40728f27ae86c07c6b4a5eccc26e4da86db673fc8c46fbeb292a801`.
