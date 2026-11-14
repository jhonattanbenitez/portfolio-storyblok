# Piloto local de traducción por campos

Fecha: 13 de noviembre de 2026, America/Bogota.

**NO-GO para un Preview del nuevo modelo con slugs traducidos.** El espacio
1023389 no tiene disponible la función `has_translatable_slugs_app`: el MCP
devuelve `limit: "false"`, `is_available: false`, origen `SubscriptionPlan`,
plan `starter_2025`. Se detuvo la implementación dependiente de esa función.
El resultado local es preparación, un evaluador offline y fixtures; no una
migración editorial ni un adaptador activado en el sitio.

Agentes instalados leídos y utilizados mediante delegación real:

| Nombre exacto | Responsabilidad |
| --- | --- |
| Software Architect | Arquitectura y alternativa de menor modificación |
| Frontend Developer | Revisión de Next.js, rutas y guías locales de esta versión |
| CMS Developer | Contrato del proveedor y lecturas MCP de configuración/esquemas |
| Test Automation Engineer | Fixtures y pruebas nuevas |
| Reality Checker | Contraste independiente de integridad, CMS, backup y resultados |

No se encontró una definición instalada exclusiva de Storyblok. CMS Developer
es un perfil Drupal/WordPress; su análisis se apoyó en documentación oficial y
consultas reales del MCP, sin atribuirle una especialidad instalada inexistente.

## Base y preservación

- HEAD inicial limpio: `4f316fbd61916f6388ed2f179a2f14c8afea87d0` (C3).
- Rama independiente: `feat/storyblok-field-translation-pilot-20261113`.
- `main` permanece en C3; no hay commits, pushes ni despliegues.
- No se copiaron archivos anteriores de C2 ni se modificaron los 124 archivos
  versionados de C3. Las rutas, vistas, consentimiento y seguridad siguen intactos.
- Todas las consultas editoriales utilizaron Storyblok MCP `execute_readonly`,
  precedido de búsqueda y descripción. No se llamó a publicar, guardar, instalar,
  traducir, cambiar esquemas o borrar. OAuth se reconectó mediante el flujo oficial,
  sin extraer ni imprimir credenciales.

## Inspección efectiva del CMS

Pareja existente:

| Idioma | Historia | URL pública que debe conservarse |
| --- | --- | --- |
| EN | `posts/black-box-abstraction-thinking-in-boxes` | `/posts/black-box-abstraction-thinking-in-boxes` |
| ES | `posts/abstraccion-de-caja-negra-pensar-en-cajas` | `/es-co/posts/abstraccion-de-caja-negra-pensar-en-cajas` |

Las dos historias están publicadas, sin cambios pendientes, comparten grupo y
tienen alternates recíprocos. Conservan los marcadores `english`/`spanish` y
no contienen claves localizadas `__i18n__`. Ambas tienen `translated_slugs: []`;
su `localized_paths` español reproduce el slug base con `published: null`.
Ese fallback no demuestra un slug español propio ni publicación de traducción.

El inventario MCP confirmó **30 historias `post` publicadas**, una página de 30.
No se modificó ninguna. Los IDs y contenidos se conservan solo en el respaldo
privado, no en las fixtures de Git.

Configuración y esquema observados:

| Dato | Resultado |
| --- | --- |
| Región | `us-east-1`, correspondiente a la región solicitada `us` |
| Idioma base | Etiqueta `English`; `en` sigue siendo la convención del frontend |
| Idioma adicional | `es-co` |
| `post.title` | Traducible y requerido por CMS |
| `post.intro`, `post.content` | Traducibles; no requeridos por el esquema |
| `post.category_ref`, `language`, `date`, `image` | Compartidos/no traducibles |
| `Category.name`, `description` | Traducibles; categorías no migradas |
| Publicación por idioma | No acreditada como configuración efectiva; no se infiere del flag `use_translated_stories: false` |
| Translatable Slugs | Derecho explícitamente no disponible |

Una cuota con nombre parecido y disponibilidad `true` no revoca el derecho de
función explícitamente deshabilitado. El catálogo MCP no ofreció una operación
de app provisions; tampoco se ha certificado una instalación activa de la app.
El idioma ES tiene `ai_translation_code: "en"`; debe revisarse antes de cualquier
futuro uso de traducción automática. No se utilizó ni cambió esa configuración.

### Respaldo editorial

Se guardaron fuera de Git, con directorio 0700 y archivos 0600, las respuestas
seleccionadas de las dos historias: campos base/localizados, contenido, imágenes,
categorías, grupo/alternates, IDs, slugs y metadatos de publicación; el inventario
de 30 publicaciones; la proyección de configuración comprobada; y las respuestas
de ambos endpoints de historial para ambas historias. Hay manifiesto y SHA-256.
La ubicación concreta se entrega en el informe final, sin publicar los datos.

**Limitación:** `getStoryVersions` y `listStoryVersions(show_content=true)`
devolvieron cero entradas para cada historia. El índice devuelve
`current_version_id: null`. No se inventaron IDs de versión ni se presenta este
respaldo del estado editable actual como reconstrucción de versiones históricas.
`published: true` y `unpublished_changes: false` quedaron registrados, sin
convertirlos en una prueba de publicación independiente de un idioma.

## Arquitectura actual y objetivo mínimo

C3 consulta `language`, pero selecciona artículos por `content.language`, resuelve
la otra historia mediante ID/grupo/alternate recíproco, obtiene rutas de links y
genera una URL principal por historia en sitemap. Un registro base `english`
con campos ES quedaría excluido del listado español y su ruta podría redirigir a
EN. `StoryCard` puede construir una ruta con el slug base cuando no hay traducción.

La alternativa mínima futura es ampliar la capa editorial existente, conservando
las vistas y `LocalizedUrl[]`. No hace falta `[lang]`, otra biblioteca de idiomas,
otro CMS ni un registro permanente adicional de traducciones. El modelo legacy
debe continuar hasta que exista una sustitución completa, publicada y con identidad
y URL verificadas. Las categorías siguen legacy; una referencia compartida a la
categoría EN no coincide automáticamente con el filtro ES por `cached_url`.

Los puntos futuros de cambio serían `lib/storyblok-data.ts`, `utils/types.ts`,
el helper de metadata/detalle en la ruta catch-all, sitemap y los enlaces de cards.
**Ninguno se cambió en esta entrega.** Mantener C3 es actualmente la opción de
menor modificación y conserva las URLs, aunque mantiene la duplicación editorial.

## Implementación local independiente

- `scripts/pilots/field-translation-content.mjs`: evaluador puro, sin red ni
  importaciones desde la aplicación. No resuelve URLs, slugs ni historias del CMS.
- `tests/fixtures/field-translation-pilot.json`: una historia bilingüe ficticia,
  IDs/textos sintéticos y sufijo opaco `fixture_es`. No es el respaldo editorial
  ni demuestra que ese sufijo corresponda al idioma real `es-co`.
- `tests/field-translation-pilot.test.mjs`: contrato offline y regresiones usando
  los helpers legacy reales de C3.

El evaluador exige artículo publicado, ID numérico positivo seguro, identidad de
snapshot coincidente, ausencia explícita de cambios pendientes, evidencia externa
de snapshot publicado y modo de publicación conocido. Los campos `publication`
del input son **atestaciones normalizadas del test**, no propiedades inventadas
en la respuesta Storyblok. Un futuro adaptador debe obtener evidencia verificable;
poner esas banderas en `true` no verifica por sí solo un CMS.

En modo individual exige publicación explícita del idioma; cualquier evidencia
negativa explícita se rechaza también en modo conjunto. El modo conjunto no se
deduce de la configuración no confirmada de este espacio.

`title`, `intro` y `content` deben existir como propiedades localizadas propias,
no vacías, con un mapa de claves explícito. Exigir los tres es un criterio
editorial conservador del piloto, más estricto que el esquema del CMS. No hay
fallback a campos base, traducciones heredadas ni conversión supuesta de códigos.
Textos iguales entre idiomas pueden ser legítimos; el evaluador no certifica que
un texto escrito explícitamente sea español correcto. Hace falta revisión humana.

No se usa `fallback_lang: "false"` como prueba de completitud: la documentación
del proveedor describe ese parámetro como código de idioma, no como booleano.
Tampoco bastan `story.lang`, un slug disponible o `published_at` del artículo.

## Pruebas y límites

La matriz nueva incluye traducción completa, ausente, parcial, vacía, campos
heredados, artículo no publicado, snapshot no confirmado/draft/ID inválido,
publicación individual/conjunta, valores iguales legítimos y ausencia de mutación.
También comprueba las URLs históricas de la pareja, canonical/hreflang, categorías
y sitemap deduplicado con los helpers actuales.

La regresión de 30 registros usa 15 parejas **sintéticas** propias. El recuento real
de 30 procede separadamente del inventario MCP. Los casos de slug inexistente
demuestran que la preparación de contenido no promete una URL: no existe todavía
un adaptador nuevo de slugs que pueda probarse de extremo a extremo.

Resultados efectivos, sin reintentos de fallos:

| Comprobación | Resultado |
| --- | --- |
| Nuevas pruebas offline/legacy | 49 pruebas, 10 ejecuciones consecutivas aprobadas |
| Suite unitaria completa | 158/158, cero fallos (109 anteriores y 49 nuevas) |
| TypeScript | Exit 0 |
| ESLint | Cero errores, tres avisos existentes |
| Build | Exit 0, Node 24.21.0 y Next 16.4.6 |
| Integración existente | 15/15 grupos |
| Manifiesto del nuevo build | Registro y verificación posterior correctos |
| URLs reales de artículos | Las 30 del inventario MCP coinciden con las 30 del sitemap generado |
| Sitemap completo | 45 URLs únicas bajo `https://www.jhonattan.dev` |
| Conservación remota | Lectura final de las 30 publicaciones sin diferencias de identidad, slugs o metadatos de publicación |

Ambas URLs históricas del piloto aparecen en ese sitemap. No se compararon los
cuerpos completos de las otras 28 publicaciones. La integración existente valida
C3; no se presenta como compatibilidad runtime del modelo nuevo. Los logs
saneados, manifiestos y resultados detallados permanecen fuera de Git.

El build recibió únicamente configuración pública necesaria, con Analytics
deshabilitado y `.env.local` apartado para evitar su carga automática. El archivo
privado se restauró con los mismos bytes y permisos 0600. Las pruebas de
consentimiento usan stubs locales, sin mediciones reales ni envíos de correo.

## Procedimiento futuro para una única pareja — no ejecutado

1. Resolver mediante decisión humana la disponibilidad de Translatable Slugs.
   No cambiar plan ni instalar/configurar nada automáticamente. Releer después
   el entitlement y la configuración efectiva; confirmar publicación conjunta o
   individual y el significado de sus flags en respuestas reales.
2. Renovar el respaldo privado completo y comprobar fechas, IDs, relaciones y
   versiones disponibles. Obtener una evidencia reproducible del snapshot
   publicado. El MCP hospedado es Management API; no asumir que su lectura normal
   equivale a una respuesta publicada de Content Delivery API.
3. Con autorización editorial separada, preparar un candidato **en borrador y
   aislado**, sin modificar ninguna historia publicada ni las otras 28. Conservar
   ambos originales como recuperación. Verificar las claves localizadas reales,
   poblar los tres campos ES y revisar editorialmente el resultado.
4. Mantener fecha/imagen/referencias compartidas y comprobar la correspondencia
   de categorías EN/ES mediante sus identidades y alternates. No duplicar
   manualmente nuevas relaciones como solución permanente.
5. Probar primero un slug aislado del candidato. La historia ES actual ya ocupa
   `posts/abstraccion-de-caja-negra-pensar-en-cajas`: no se ha demostrado que el CMS
   acepte esa colisión. Resolver por UUID ayuda a leer, pero no acredita aceptación
   ni prioridad de la URL. No renombrar ni retirar el original para averiguarlo.
6. Solo tras esos gates, implementar el adaptador pequeño en los puntos indicados.
   Listado, detalle, metadata, selector y sitemap deben compartir la misma decisión
   de elegibilidad. No emitir rutas/alternates/sitemap de ES si falta contenido,
   slug o publicación; mantener la historia legacy válida durante la transición.
7. Autorizar y validar posteriormente un Preview protegido con fixtures/candidato
   draft, sin habilitar Analytics ni indexación del Preview. Comprobar ambas URLs
   históricas, categorías, ausencia de duplicados y las 30 publicaciones legacy.
8. Un cutover real requerirá otra autorización y un plan explícito de identidad,
   publicación, slugs y aliases. No suprimir la historia ES del índice hasta que la
   sustitución publicada tenga la misma URL canónica y supere todas las pruebas.
   Preferir conservar la identidad EN existente si la resolución comprobada lo
   permite; el candidato aislado es un ensayo, no una elección automática de un
   nuevo ID permanente. Inventariar referencias entrantes antes de decidirlo.

## Rollback y decisión

Hoy no hay migración remota que revertir. Para volver localmente a C3: archivar
los archivos nuevos fuera de Git, verificar sus hashes y cambiar a `main`; solo
cambiar de rama dejaría los archivos sin seguimiento en el directorio. No usar
reset/clean ni copiar las versiones anteriores de C2.

Después de una futura migración CMS, un rollback solo de código no bastaría si se
retiró la pareja legacy: primero habría que recuperar su estado editorial y sus
URLs desde un respaldo verificado. Los IDs/campos del candidato y originales
deben permanecer diferenciados hasta aprobar el cutover.

**Decisión actual:** preparación local permitida; **NO-GO para probar en Preview
el modelo field-level con slugs localizados** hasta resolver el entitlement y
demostrar publicación, snapshots y colisiones. No se activó un segundo modelo
editorial en runtime ni se ejecutó migración alguna.

## Referencias oficiales

- [Internationalization for Stories](https://www.storyblok.com/docs/api/management/stories/internationalization-for-stories)
- [Translatable Slugs](https://www.storyblok.com/docs/apps/translatable-slugs)
- [Internationalization y publicación](https://www.storyblok.com/docs/concepts/internationalization)
- [MCP Server y alcance Management](https://www.storyblok.com/docs/tooling/mcp-server)
- [Versiones con contenido](https://www.storyblok.com/docs/api/management/stories/get-story-versions-new)
- [Consulta localizada por UUID](https://www.storyblok.com/docs/api/content-delivery/v2/stories/examples/retrieving-localized-stories-by-uuid)
- [Filtros traducidos](https://www.storyblok.com/docs/api/content-delivery/v2/filter-queries/field-level-translation)
