# Piloto A: capa editorial Next.js con activación deshabilitada

Fecha: 13 de noviembre de 2026, America/Bogota.

**Estado posterior del release:** 14 guardados EN y 15 publicaciones EN
verificados; las 15 historias ES legacy siguen intactas. La QA local real pasó.
El commit `8a22062f` está integrado en main local; el push falló por autenticación
GitHub HTTPS. Production conserva C3 y el flag se revirtió a OFF; recuperación
pública 30 rutas / sitemap 45 verificada. Antes de ON también falta decidir
sobre 19 valores nativos visibles en siete ES, distintos de la base consolidada.
No se repitió ninguna escritura CMS. Véase el
[resultado efectivo y evidencia del release](bilingual-release-execution.md).
Se conserva a continuación el historial del piloto previo a ese release.

## Black-Box — aprobación editorial persistida en draft; sin publicación

**13 de noviembre de 2026, America/Bogota.** El titular autorizó expresamente
aprobar la traducción española mediante una única actualización del draft EN,
sin publicarlo. **Guardado y comprobaciones requeridas PASS.** Solo CMS Developer
ejecutó la escritura; Application Security Engineer y Reality Checker hicieron
las revisiones independientes según sus definiciones originales instaladas.

### Preimagen, concurrencia y cálculo efectivo

El respaldo
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-draft-saved-20261113T223731Z`
se conserva intacto; sus **36 archivos** se verificaron con hashes, tamaños y
permisos. Las lecturas actuales MAPI de EN y ES coincidieron íntegramente con
`cms/post-en.json` y `cms/post-es.json` de ese respaldo: contenido completo,
identidad, relaciones, slugs, fechas, imágenes y metadatos seleccionados.

Antes de escribir, EN estaba `published:true`, `unpublished_changes:true`, con
`updated_at:2026-11-13T22:34:59.236Z`, versión `241335088018557`, aprobación
`false` y hash vacío. ES seguía publicada, sin cambios pendientes y exactamente
igual al respaldo. Los nueve campos originales EN y los tres textos nativos
`__i18n__es_co` eran exactos; `slug_es` conservaba
`abstraccion-de-caja-negra-pensar-en-cajas`.

Se ejecutó el helper existente **`calculateDraftEditorialApprovalHash` sobre el
draft EN actual**, no sobre un fixture ni sustituyendo su resultado por el
candidato anterior. AppSec y Reality Checker contrastaron el cálculo con los
valores efectivos. El módulo del helper coincide con el respaldado; no cambió
su implementación. El hash vincula ID/UUID, locale, slugs EN/ES, los seis textos
y el UUID de categoría EN; fechas, imágenes y timestamps se verificaron aparte.

**Hash aprobado, recalculado y posteriormente verificado en MAPI/CDA:**

`417425b3d79373e0c0791efeb1c55c0ca2fdbf847c04285f6b93ba419320b948`

Coincide con el candidato previo porque los valores comprometidos siguen siendo
idénticos. La igualdad fue una comprobación posterior al cálculo. Después del
gate de las tres revisiones, CMS Developer releyó ambas historias inmediatamente
antes de escribir, contrastó nuevamente los hashes canónicos del contenido y
estado seleccionado, `updated_at` y versión, y recalculó el compromiso. No hubo
discrepancias. La relectura no constituye un bloqueo transaccional del CMS.

### Única actualización y relecturas MAPI

Operación: `updateStory`, espacio `1023389`, región `us`, EN
`104410751478034`, UUID `6bffd408-51d4-403b-a64a-cd22e3c3e287`, con
**`publish:false` y `force_update:false`**. El body incluyó solo `story.content`
completo, fusionado desde el draft vigente. El ledger se registró antes de
invocar la herramienta. No hubo reintentos ni otra operación mutante.

| Cambio de contenido autorizado | Antes | Después confirmado |
| --- | --- | --- |
| `es_translation_approved` | `false` | `true` |
| `es_approved_hash` | Cadena vacía | Hash recalculado indicado arriba |

**Los otros 13 campos permanecen exactamente iguales.** Esto incluye los seis
textos EN/ES, `_uid`, componente, idioma, `slug_es`, fecha visible, imágenes y
categoría. No se añadieron ni eliminaron claves: siguen siendo 15. Identidad,
slugs originales, relaciones y timestamps de publicación permanecen intactos.
La historia ES legacy `104417520187671`, UUID
`6f473dc7-3fbb-48cf-adca-db35a67cde00`, conserva todo su estado seleccionado,
publicada y sin cambios pendientes.

MAPI posterior confirma EN **`published:true`, `unpublished_changes:true`**.
El helper ejecutado sobre el draft releído vuelve a producir el hash persistido.
Fuera de los dos cambios de contenido, solo variaron los metadatos automáticos
EN `updated_at` y `current_version_id`:

| Metadata EN | Antes de aprobar | Después de aprobar |
| --- | --- | --- |
| `updated_at` | `2026-11-13T22:34:59.236Z` | `2026-11-13T23:27:32.584Z` — 18:27:32.584 en Bogotá |
| `current_version_id` | `241335088018557` | `241348004134663` |

**MAPI: 12/12 controles PASS**, seis lecturas de historias — precheck, inmediatas
y posteriores de ambos registros — y una sola actualización. UPDATE vuelve a
omitir `stage` y `stages`; se comprobó explícitamente esa forma de respuesta y
la igualdad de todos los campos compartidos. Las relecturas completas preservan
ambos campos. No se alteraron los resultados históricos de la comparación
estricta de la entrega anterior.

### CDA y aislamiento público

AppSec ejecutó cuatro consultas CDA por UUID, con cuatro respuestas **HTTP 200**:
draft EN predeterminada, draft EN con `language=es-co`, publicada EN y publicada
ES. Fueron seis GET contando dos redirecciones `cv` validadas al mismo endpoint.
Se utilizaron las credenciales ya disponibles en el servidor, exclusivamente en
memoria, con el token Preview privado para draft; sin registrar valores,
cabeceras privadas o URLs autenticadas ni recuperar secretos de Vercel.

| Verificación real | Resultado |
| --- | --- |
| CDA draft EN y representación `es-co` | Aprobación `true`, hash aprobado exacto, textos EN/ES correctos y completos; sin fallback inglés aceptado como traducción |
| Compromiso desde CDA | `calculateEditorialApprovalHash` recalculado desde las dos representaciones devuelve el mismo hash que MAPI |
| Campos compartidos y rutas draft | Fecha, imágenes, UUID de categoría y slugs preservados; prefijo `es-co/` de `full_slug` validado. `_editable`, `cached_url` localizado y `prep` se tratan como metadata de representación |
| CDA publicada EN y ES | Los nueve campos originales completos siguen exactamente iguales al contenido público anterior; sin campos nuevos de traducción o aprobación expuestos |
| Identidad y fechas de publicación públicas | IDs, UUIDs, slugs, `first_published_at` y `published_at` intactos en ambas identidades |

**CDA: 17/17 controles PASS.** El draft aprobado se entrega solo en las consultas
draft privadas verificadas. La conservación del contenido público y de sus
timestamps de publicación, junto con MAPI con cambios pendientes y el parámetro
`publish:false`, confirma que la aprobación **no publicó los cambios**. No se
ejecutaron `publishStory`, despublicación, eliminación ni escritura sobre ES.

**Metadata pública observada:** guardar la aprobación volvió a modificar
`updated_at` de EN en CDA publicada, de `2026-11-13T22:34:59.236Z` a
`2026-11-13T23:27:32.584Z`, aunque su contenido y fechas de publicación siguen
iguales. ES conserva `2025-10-30T01:51:41.509Z`. Como el código consume ese campo
para `dateModified` y sitemap `lastmod`, futuras lecturas o revalidaciones
podrían reflejarlo. No se cambió código para ocultarlo, ni se comprobó el HTML
o la caché actual de producción. No se afirma invariancia de toda la metadata
pública.

### Evidencia y cierre de esta autorización

Evidencia privada nueva en
`/tmp/blackbox-editorial-approval-20261113-t8hyo_0r`: preimágenes, contratos,
cálculo reproducible, payload propuesto y ejecutado, ledger, respuesta seleccionada
sin tokens o metadatos de usuarios, relecturas y snapshots CDA. Directorios
`0700`, archivos `0600`; contenido editorial fuera de Git.

- Manifiesto CMS: **18 archivos**, SHA-256
  `3c73484729c7dc4123d316b64c9246daba382d905c874f9365d1e44ae62c5fd0`.
- Manifiesto AppSec: **10 archivos**, SHA-256
  `78d576309c8330da709779ed84c177391de6a829bf8b26f622d2ed5dfb176388`.
- Revisión AppSec del payload: **5/5 PASS**, solo dos campos de control cambiados.

Respaldo persistente nuevo:
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-draft-approved-20261113T232936Z`.
Se verificaron **42 archivos** mediante hashes, tamaños y permisos privados;
el manifiesto tiene SHA-256
`a89e1f029b59e75f6d4c844c987240e169457f8ca9a338d0462d4690439a4263`.
Incluye la preimagen, cálculo reproducible, request ejecutado, estado aprobado,
CDA y una copia de este informe previa a añadir la referencia al respaldo.
Los respaldos anteriores no se alteraron. Copia en el mismo disco, sin cifrado;
los archivos privados y sus cuerpos editoriales no deben incorporarse a Git.

No se repitieron suites completas, builds o matriz de integración. No se
modificaron código funcional, pruebas, esquema, Vercel o flags, ni se crearon
commits, pushes o deployments. Se preservaron los cambios locales y HEAD C3 en
`feat/storyblok-field-translation-pilot-20261113`; solo se actualiza este informe.

**Reality Checker — dictamen independiente: PASS de la aprobación exclusiva del
draft EN.** Contrastó las preimágenes, el payload y ledger de una operación,
los dos cambios persistidos con los otros 13 campos intactos, ES completa y
los timestamps de publicación conservados. Recalculó el helper sobre MAPI y
desde las representaciones CDA: ambos resultados coinciden con el hash
persistido. Verificó los 18 archivos CMS y 10 AppSec contra sus manifiestos,
además de que solo cambió este informe en la línea base local de nueve archivos.
Confirma el aislamiento del contenido publicado y conserva el aviso de
`updated_at` global; no certifica HTML/caché de producción ni autoriza publicar
o activar el modelo. No realizó consultas remotas adicionales.

**La ejecución termina tras estas verificaciones. La aprobación queda guardada
en draft y la publicación sigue sin autorizar.** No se activa el modelo en
Next.js, Vercel o producción.

## Black-Box — draft sin aprobación guardado anteriormente (registro histórico)

**Registro histórico:** la aprobación `false` y el hash vacío de la entrega
siguiente corresponden al estado previo al guardado de aprobación actual. Se
conservan como preimagen; el resultado vigente y el hash aprobado figuran arriba.

**13 de noviembre de 2026, America/Bogota.** Tras actualizar Codex CLI a
`0.169.0`, completar OAuth manualmente y verificar una lectura real desde VS
Code, el titular autorizó una única actualización nueva del draft EN. Esta
ejecución **guardó correctamente el borrador** con una sola llamada
`updateStory`; no hubo publicación, aprobación editorial ni reintento.

### Preservación y comprobación inmediatamente anterior

CMS Developer, Application Security Engineer y Reality Checker releyeron sus
definiciones originales instaladas. **Solo CMS Developer ejecutó la escritura**;
el coordinador y los otros agentes no hicieron ninguna mutación.

El respaldo de la propuesta, intacto, sigue en
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-mapi-reconnected-20261113T220147Z`.
Sus **17 archivos** se verificaron mediante hashes. Ambas historias se leyeron
por MAPI y se contrastaron con las preimágenes y el plan respaldados: igualdad
exacta del contenido completo, hashes canónicos del contenido y estado
seleccionado, IDs/UUIDs, slugs, relaciones, categorías, fechas e imágenes.
`updated_at` y `current_version_id` coincidían; ambas estaban publicadas, sin
cambios pendientes y sin ninguno de los seis campos nuevos.

La revisión independiente dio PASS antes del guardado. Inmediatamente antes de
la única escritura, CMS Developer repitió las lecturas de EN y ES y volvió a
comprobar esas precondiciones. No hubo discrepancias. Esta comparación reduce
el riesgo de concurrencia; no proporciona un bloqueo transaccional del CMS.

### Operación y persistencia MAPI

Destino exclusivo: espacio `1023389`, región `us`, historia EN
`104410751478034`, UUID `6bffd408-51d4-403b-a64a-cd22e3c3e287`.
Parámetros efectivos: **`publish:false`, `force_update:false`**. El body contenía
solo `story.content`, fusionado íntegramente desde el draft EN vigente y
contrastado con la propuesta revisada. El ledger privado se registró antes de
invocar la operación. No se enviaron metadatos de solo lectura ni una orden de
despublicación.

| Campos | Resultado comprobado mediante relectura MAPI |
| --- | --- |
| Nueve originales EN: `_uid`, `date`, `image`, `intro`, `title`, `content`, `language`, `component`, `category_ref` | Todos exactamente iguales a la preimagen |
| `title__i18n__es_co`, `intro__i18n__es_co`, `content__i18n__es_co` | Añadidos; textos exactos de ES, incluido Markdown y saltos de línea |
| `slug_es` | Añadido: `abstraccion-de-caja-negra-pensar-en-cajas` |
| `es_translation_approved` / `es_approved_hash` | Añadidos: `false` / cadena vacía |
| Historia ES `104417520187671`, UUID `6f473dc7-3fbb-48cf-adca-db35a67cde00` | Estado seleccionado completo exactamente igual a su preimagen; sigue publicada y sin cambios pendientes |
| Identidad, slugs, relaciones y timestamps de publicación EN | Conservados |

MAPI posterior devuelve EN **`published:true`, `unpublished_changes:true`**.
Solo difieren los seis campos añadidos al contenido y los metadatos automáticos
EN `updated_at`, `current_version_id` y `unpublished_changes`.
`updated_at` es `2026-11-13T22:34:59.236Z` — 17:34:59.236 en Bogotá —;
`current_version_id` es `241335088018557`. No se calculó ni persistió un hash
de aprobación editorial.

Se ejecutaron **seis lecturas MAPI de historias y una única actualización**:
dos de precheck, dos inmediatamente anteriores y dos posteriores. No se
ejecutaron `publishStory`, `unpublishStory`, `deleteStory` ni otras mutaciones.

### CDA draft y publicada: resultados reales

AppSec utilizó exclusivamente las credenciales CDA ya disponibles en el servidor,
en memoria; el token Preview privado se usó para draft. No se recuperaron
credenciales de Vercel ni se usó CDA como autenticación MAPI. Los valores,
cabeceras privadas y URLs autenticadas no se imprimieron ni almacenaron.

| Consulta por UUID | Resultado |
| --- | --- |
| `version=draft`, EN predeterminada | HTTP 200; textos ingleses y campos compartidos originales, `slug_es` correcto, aprobación desactivada y hash vacío |
| `version=draft`, identidad EN con `language=es-co` | HTTP 200; los tres textos españoles coinciden exactamente con ES, sin fallback inglés; `full_slug` con prefijo `es-co/` esperado y slug nativo EN conservado |
| `version=published`, EN | HTTP 200; los nueve campos originales exactos, sin los seis campos nuevos; identidad, slugs, `first_published_at` y `published_at` conservados |
| `version=published`, ES | HTTP 200; contenido original completo e identidad intactos; mismos timestamps de publicación y sin campos nuevos |

En draft se admite `_editable` como metadata CDA. La representación española
ajusta `category_ref.cached_url` y `prep`, conservando su UUID; fecha editorial
visible e imágenes permanecen iguales. Las claves nativas guardadas en MAPI
usan `es_co`; el idioma solicitado a CDA sigue siendo `es-co`.

**CDA: 17/17 controles PASS**, cuatro consultas primarias HTTP 200 y seis GET
totales al contar dos redirecciones publicadas `cv` validadas al mismo endpoint.
No hubo reintentos adicionales ni consultas a endpoints del sitio en producción.
El contenido traducido nuevo solo se observó en draft con la credencial privada.
MAPI con cambios pendientes y los snapshots publicados anteriores preservados
confirman que los cambios **no se publicaron accidentalmente**.

**Efecto de metadata observado:** CDA publicada EN devuelve ahora
`updated_at:2026-11-13T22:34:59.236Z`, aun manteniendo el contenido anterior y
sus timestamps de publicación. CDA publicada ES conserva su `updated_at`
anterior. Storyblok expone así la modificación global de EN tras guardar el
draft. Como el código actual usa `updated_at` para `dateModified` y sitemap
`lastmod`, una futura lectura o revalidación podría reflejar esa fecha. Esta
consecuencia se infiere del código existente; no se verificó el HTML ni la
caché actual de producción y no se afirma que toda su metadata esté inalterada.
No se modificó código para ocultar este comportamiento.

### Evidencia, límites y cierre

Los controles requeridos de persistencia MAPI pasan. Se conserva además el
resultado **11/12, con un FAIL**, de una comparación extra estricta entre la
respuesta UPDATE y el GET posterior: UPDATE omite `stage` y `stages`, mientras
GET devuelve `null` y `[]`. Todos los campos compartidos coinciden y la
comparación independiente pre/post conserva esos metadatos. La diferencia de
forma y su interpretación están documentadas en `response-shape-analysis.json`;
no se cambió el resultado original para declararlo PASS ni se hizo otra consulta.

Evidencia privada temporal nueva en
`/tmp/blackbox-draft-save-authfixed-20261113-ppg81k3u`: preimágenes, contratos,
request ejecutado, ledger de una llamada, respuesta seleccionada sin tokens o
metadatos de usuarios, relecturas y cuatro snapshots CDA. Permisos `0700` en
directorios y `0600` en archivos; cuerpos editoriales fuera de Git.

- Manifiesto CMS: **15 archivos**, SHA-256
  `a9f4b6671e90f7aec3402e0339dd8fd3de6175a91465b9943bbee62ecf365a25`.
- Manifiesto AppSec: **8 archivos**, SHA-256
  `b9ab15a26e830158e75aac303af7c4b746b75cbaf5417b411419a3d4491f5691`.

Respaldo persistente nuevo, sin alterar los anteriores:
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-draft-saved-20261113T223731Z`.
Se verificaron **36 archivos** mediante hashes, tamaños y permisos privados;
el manifiesto tiene SHA-256
`716df042937c34094538e88135ad78967abd25ce9b793e1dbf302ef84c4159fa`.
Incluye preimágenes, request, ledger, estado posterior, CDA y una copia del
informe tomada al archivar, antes de añadir esta referencia. Es una copia en el
mismo disco, sin cifrado, y no debe incorporarse a Git.

No se repitió la suite local ni se ejecutaron builds o la matriz de integración:
esta entrega no cambia código funcional, pruebas, package o lock. Se preservaron
los cambios locales y HEAD C3 en la rama del piloto. Solo se actualiza este
informe. No se modificaron esquema, otras historias, Vercel o flags, ni se
crearon commits, pushes o deployments. La historia ES permanece intacta.

**Reality Checker — dictamen independiente:** PASS de los controles requeridos
para el guardado exclusivo del draft EN y su aislamiento público. Verificó el
contenido MAPI posterior contra el request y las preimágenes, la conservación
íntegra de ES, las representaciones CDA EN/ES y sus fechas de publicación;
contrastó los 15 archivos CMS y 8 AppSec con sus manifiestos. Conserva el FAIL
de igualdad estricta de respuestas como diferencia de forma explicada y el
aviso de `updated_at` público. No certifica HTML/caché de producción, publicación
futura ni aprobación editorial. No ejecutó nuevas consultas o pruebas remotas.

**Siguiente paso exclusivo:** validación visual manual del titular en Storyblok.
No guardar, aprobar o publicar de nuevo en esta ejecución. Esta entrega no
autoriza publicación ni activación del modelo o cambios en producción.

## Black-Box — preflight 401 anterior, sin nuevas actualizaciones (registro histórico)

**Registro histórico:** el bloqueo siguiente precede a la actualización de la
CLI y a la nueva autorización de esta entrega. El guardado y las verificaciones
actuales figuran arriba; no se presentan los 401 anteriores como el estado actual.

13 de noviembre de 2026. El titular volvió a autorizar el intento con «vuelve a
intentar», conservando el alcance de una única actualización EN del draft sin
publicar ni aprobar. **La ejecución se detuvo antes de escribir:** la primera
lectura MAPI EN del preflight devolvió API `401 Unauthorized`.

CMS Developer pudo consultar el catálogo y los contratos oficiales
`getStoryById` y `updateStory`; esto no demuestra autorización para leer datos.
La lectura de EN `104410751478034`, espacio `1023389`, región `us`, devolvió
`success:false`, `details.status:401`, sin historia. No se consultó ES después
del fallo, ni se intentaron login, recuperación de credenciales o métodos
alternativos. La causa concreta de autenticación sigue sin verificarse.

| Control de este reintento | Resultado |
| --- | --- |
| Respaldo de la propuesta anterior | **PASS**, 17 archivos verificados e intactos |
| Lectura MAPI actual EN | **BLOCKED: API 401 Unauthorized** |
| Lectura ES / precondiciones actuales | No ejecutada / no verificables tras el fallo EN |
| Nuevas llamadas `updateStory` | **0**; la llamada fallida de la entrega anterior es histórica y distinta |
| Nueva comparación CDA | No ejecutada; no hubo actualización nueva que verificar |
| Publicación, aprobación editorial y cálculo de su hash | No ejecutados |

Application Security Engineer revisó la propuesta local y mantuvo el lector
CDA sin ejecutar. No se repitieron pruebas, build ni matriz HTTP. El resultado
CDA de la entrega anterior conserva su evidencia histórica y no se presenta
como una nueva lectura. Código, pruebas, package/lock y cambios locales
anteriores se preservaron; solo se actualiza este informe.

Evidencia privada temporal nueva, sin alterar archivos de la ejecución previa:
`/tmp/blackbox-save-retry-20261113-eho7injf`. El subdirectorio `cms/` conserva el
error sanitizado, contratos, resumen y ledger con contador cero; cinco archivos
verificados, directorio `0700`, archivos `0600`. SHA-256 del manifiesto:
`6321ca3426500b9572c7ffbf65615047d841a0fa03a27280076bf12d10ce722a`.
La preimagen local se conserva en `root/before/` y el registro AppSec en
`appsec/preparation-status.json`. No se guardaron secretos.

**Dictamen: BLOCKED por autenticación en la lectura MAPI previa.** La nueva
autorización de una llamada mutante no se consumió. La ejecución queda detenida
hasta recuperar una lectura autorizada real de ambas historias y repetir la
comparación inmediata completa; no se enviará automáticamente una escritura.
No se modificaron Vercel, esquema o producción ni se crearon commits, pushes o
deployments.

**Reality Checker — revisión independiente:** BLOCKED en el preflight MAPI;
PASS de la detención y preservación, con cero nuevas llamadas mutantes.
Verificó los cinco archivos del manifiesto CMS y los dos del manifiesto AppSec,
sus hashes, tamaños y permisos. La línea base de ocho archivos confirma que
solo cambió el informe. No se consumió la nueva autorización ni se repitieron
consultas CDA, pruebas o cálculo de aprobación editorial.

## Black-Box — intento anterior de actualización: API 401 (registro histórico)

**Registro histórico:** en la entrega anterior sí se invocó una única llamada
`updateStory` que devolvió 401; el reintento actual se detuvo en la lectura EN y
no añadió ninguna llamada mutante. No deben sumarse como dos escrituras.

13 de noviembre de 2026. El titular autorizó una única actualización del draft
EN `104410751478034`, espacio `1023389`, región `us`, sin publicar ni aprobar.
**Se consumió exactamente una llamada `updateStory`; devolvió `401 Unauthorized`.
No se reintentó y no puede afirmarse un guardado exitoso.**

### Precheck inmediato y operación efectivamente ejecutada

CMS Developer verificó los **17 archivos** del respaldo privado
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-mapi-reconnected-20261113T220147Z`.
Leyó ambas historias mediante la conexión oficial MCP y repitió ambas lecturas
inmediatamente antes de la operación: cuatro lecturas satisfactorias. Las
preimágenes coincidieron íntegramente con el respaldo, incluidos IDs, UUIDs,
slugs, relaciones, categorías, imágenes, fecha editorial y contenido completo.
Ambas devolvieron `published:true`, `unpublished_changes:false`; `updated_at`
seguía siendo EN `2025-10-30T01:49:12.036Z`, ES `2025-10-30T01:51:41.509Z`,
y `current_version_id:null`. Los seis campos nuevos estaban ausentes.

La consulta del coordinador al catálogo MCP había respondido «MCP authentication
required. Reconnect to continue using this server», sin llegar a una operación
de historia ni devolver código HTTP. El agente CMS sí tenía lecturas y contrato
funcionales mediante la conexión oficial; se le asignó como **único ejecutor**,
con revisión independiente de esta delegación. No se recuperaron credenciales,
se alteraron permisos ni se creó un bypass. El coordinador no ejecutó ninguna
mutación. No se atribuye una causa de autenticación no demostrada.

Tras el segundo precheck, CMS Developer ejecutó el contenido completo fusionado
desde el draft EN vigente, coincidente con la propuesta respaldada:

| Parámetro/campo | Valor enviado |
| --- | --- |
| Operación / destino | `updateStory`, `space_id:1023389`, `id:104410751478034` |
| Parámetros | `publish:false`, `force_update:false` |
| Body | Solo `story.content`, los nueve campos originales completos y seis adiciones |
| `title__i18n__es_co`, `intro__i18n__es_co`, `content__i18n__es_co` | Textos exactos del draft ES, sin normalización de Markdown |
| `slug_es` | `abstraccion-de-caja-negra-pensar-en-cajas` |
| `es_translation_approved` / `es_approved_hash` | `false` / cadena vacía |

La propuesta no incluía una orden de despublicación ni metadatos ajenos.
Application Security Engineer y Reality Checker contrastaron contenido,
parámetros y alcance; no se calculó ningún hash de aprobación editorial en esta
ejecución. El ledger privado registró el intento antes de invocar la herramienta.

### Resultado y comprobación MAPI posterior

La respuesta de la operación contenía `success:false`, `details.status:401`,
`statusText:Unauthorized`, sin historia devuelta. La marca externa `isError`
de la herramienta era falsa, pero **el resultado de la API era un error**; no
se interpretó como éxito. Se registró el diagnóstico sanitizado y no se repitió
la escritura. La relectura posterior de EN también devolvió API `401`; se
detuvieron las lecturas MAPI y no se releyó ES después de ese fallo.

| Comprobación | Estado |
| --- | --- |
| Preimágenes sin cambios observados inmediatamente antes de escribir | **PASS**, lectura actual completa e inmediata; no constituye un bloqueo transaccional |
| Alcance y parámetros de la única actualización | **PASS**, comparados con la propuesta autorizada |
| Resultado del guardado | **FAIL: API 401 Unauthorized** |
| Persistencia de los seis campos y conservación de los nueve EN en MAPI | **BLOCKED**, relectura EN 401 |
| Estado posterior `published` / cambios draft pendientes EN | **BLOCKED**, no se dispone de respuesta MAPI posterior |
| Historia ES intacta después, mediante MAPI | **BLOCKED**, no se consultó tras el fallo de autenticación |
| Nueva publicación, aprobación o segundo intento | **No ejecutados** |

El error 401 es una respuesta de rechazo; la imposibilidad de releer impide
certificar por MAPI el estado final o descartar efectos con una comprobación
posterior independiente. No se afirma que los campos hayan persistido ni que
se haya comprobado la ausencia absoluta de cambios remotos. La causa concreta
del 401 — sesión, permisos u otra configuración — no está verificada.

### CDA, evidencia y decisión

Application Security Engineer ejecutó cuatro consultas CDA por UUID: publicada
EN, publicada ES, draft EN predeterminado y draft de la identidad EN con
`language=es-co`. Las cuatro devolvieron **HTTP 200**. Fueron seis GET en total:
dos redirecciones `cv` de la versión publicada se validaron al mismo endpoint.
Se usaron únicamente las credenciales CDA locales autorizadas, con el token
Preview privado para draft; sus valores, cabeceras y URLs autenticadas no se
imprimieron ni almacenaron. No se usó CDA para autenticar operaciones MAPI.

| Entrega comprobada | Resultado real |
| --- | --- |
| CDA publicada EN y ES | **PASS de aislamiento público**: contenido original completo de nueve campos exactamente igual a las preimágenes, identidades y slugs intactos; ninguno de los seis campos nuevos expuesto |
| CDA draft EN predeterminada | Nueve campos originales exactos y metadata `_editable` del Visual Editor; ninguno de los seis campos nuevos disponible |
| CDA draft EN con `language=es-co` | **FAIL de la traducción propuesta**: los tres textos coinciden con EN, no con ES; fallback inglés no aceptado como traducción |
| Categoría en la representación CDA española | Identidad UUID EN conservada; `cached_url` y `prep` cambian por representación. Esto no demuestra una traducción válida ni una mutación editorial |

Los controles estrictos del lector conservaron **cinco fallos** de la forma
esperada para la nueva traducción. La interpretación posterior se hizo solo
sobre los cuatro snapshots privados, sin nuevas consultas: `_editable` es
metadata CDA, no trabajo editorial inesperado; los seis campos están ausentes.
No se cambiaron las aserciones para convertir el camino nuevo en PASS. Los
resultados acreditan que la entrega pública continúa siendo la anterior y que
la nueva traducción **no se observa en CDA draft**, no una comprobación final
de persistencia MAPI. No se hizo un censo nuevo de los otros 28 artículos ni se
consultaron endpoints sensibles del sitio en producción.

Evidencia privada temporal en `/tmp/blackbox-save-20261113`: preimágenes y
contrato, parámetros enviados, ledger de una sola llamada y errores sanitizados.
No contiene tokens ni URLs autenticadas. No se realizaron cambios funcionales,
pruebas completas, builds, commits, pushes o deployments, ni cambios en Vercel,
esquemas u otras historias. No se habilitó el modelo.

El manifiesto CMS verifica once archivos; SHA-256
`34c2a1cdf23773ff722171cf7179a05fdfd6cf74f0bd7cd6983f331ce3be2ad7`.
El manifiesto AppSec verifica nueve archivos; SHA-256
`1d4f342b1aa343ae11f66b5714becde0754b154555be849700019375e1cd6fbb`.
Ambos directorios son `0700` y los archivos `0600`. Los snapshots, parámetros
enviados y cuerpos editoriales son privados y deben permanecer fuera de Git.

Respaldo persistente nuevo, sin modificar el respaldo de la propuesta:
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-draft-save-20261113T221102Z`.
Sus **33 archivos de evidencia** fueron verificados mediante hashes, tamaños y
permisos `0700`/`0600`. SHA-256 del manifiesto:
`c612caab3c0648becdd6a126a993f1c85793359da832879836aaa4d35627e29f`.
Se conserva la preimagen del informe y del código, el request autorizado y el
diagnóstico, sin credenciales. Mismo disco, sin cifrado. La rama permanece en
C3 y, respecto de la línea base de esta entrega, solo cambió este informe;
código funcional, pruebas, package y lock permanecen intactos.

**Estado actual: BLOCKED.** No queda un segundo intento autorizado en esta
ejecución. Antes de una futura escritura deberán verificarse nuevamente la
conexión oficial y ambas preimágenes; cualquier nuevo intento requiere una
autorización específica posterior. No se publicará esta historia ni se
ejecutarán operaciones de restauración o despublicación.

**Reality Checker — revisión independiente:** PASS de las preimágenes,
preservación del respaldo, parámetros de la única operación y aislamiento en
CDA publicada. Contrastó el ledger, el error API 401, los manifiestos y los
snapshots sin repetir consultas remotas. **FAIL de la actualización y de la
disponibilidad de la traducción propuesta; BLOCKED de la persistencia MAPI
posterior.** La metadata CDA no se interpretó como texto traducido ni como
confirmación del guardado. No se certifica producción y no se permite otro
intento automático.

## Black-Box — MAPI restablecido y payload preparado (preparación anterior)

**Registro histórico:** la preparación siguiente precede al único intento de
guardado de la sección actual. Su dictamen para solicitar autorización no
equivale a éxito de la actualización ni permite otro intento automático.

Continuación del 13 de noviembre de 2026 tras la autorización OAuth completada
por el titular. **Los dos pendientes acotados están cerrados:** el contrato SEO
EN está probado y la lectura MAPI real funciona. No se guardó ni publicó ninguna
historia, ni se concedió aprobación editorial o activación del modelo.

### Borradores actuales comparados con el publicado revisado

El agente CMS Developer utilizó la conexión oficial Storyblok MCP del espacio
`1023389`, región `us`. Hubo tres invocaciones `execute_readonly`: la primera
rechazó localmente los selectores `story.base_version_id` y
`story.main_version_id`, aunque `describe` los anunciaba. Tras retirar solo esos
dos selectores, las lecturas EN y ES fueron satisfactorias. **Cero errores de
autenticación en esta continuación**; no se inició otro login ni se recuperaron
credenciales. Se solicitaron todos los campos de `content` y los metadatos
editoriales y de concurrencia necesarios, excluyendo tokens y datos de usuarios.

| Historia | Estado MAPI | Comparación con el snapshot publicado anterior |
| --- | --- | --- |
| EN `104410751478034`, UUID `6bffd408-51d4-403b-a64a-cd22e3c3e287` | `published:true`, `unpublished_changes:false`; `updated_at:2025-10-30T01:49:12.036Z` | Nueve campos de `content` exactamente iguales; identidad, slugs, relaciones y metadatos comparables sin diferencias |
| ES `104417520187671`, UUID `6f473dc7-3fbb-48cf-adca-db35a67cde00` | `published:true`, `unpublished_changes:false`; `updated_at:2025-10-30T01:51:41.509Z` | Nueve campos de `content` exactamente iguales; identidad, slugs, relaciones y metadatos comparables sin diferencias |

No se observaron cambios editoriales pendientes ni contenido divergente que
requiera sobrescritura o reconciliación. Los seis campos previstos para la
consolidación todavía están ausentes. Se preservan los idiomas `english` y
`spanish`, la fecha editorial visible común `2025-10-22 00:00`, imágenes y las
categorías propias de cada historia. La comparación usa el snapshot CDA
publicado **anteriormente revisado** — SHA-256
`4d969ff4979c2de182e1abfb4a6f2b639da94fce2b46ff2e017b9b79f9d2fb98` —;
no se hizo otra consulta CDA ni se afirma un nuevo censo remoto de las 30
publicaciones. Solo se leyeron las dos historias originales.

`current_version_id` es `null` en ambas. Los otros dos IDs de versión no pudieron
obtenerse por la inconsistencia del selector; no se inventa ni envía un
`base_version_id`. Se registraron `updated_at` y hashes canónicos del contenido
y estado seleccionado de cada historia. Una futura escritura exige releer ambas
historias y contrastar esas precondiciones: **no existe bloqueo transaccional
demostrado** y las lecturas actuales no garantizan ausencia de cambios futuros.

### Payload completo fusionado y hash de revisión

Se preparó localmente `prepared/update-story-body.json`, con
`story.content` completo: clona los nueve campos del draft EN vigente y añade
únicamente los tres textos españoles nativos, `slug_es` y los dos campos de
control. La propuesta no reutiliza el cuerpo CDA como reemplazo del draft.

| Campo añadido | Valor propuesto, sin persistir |
| --- | --- |
| `title__i18n__es_co`, `intro__i18n__es_co`, `content__i18n__es_co` | Textos exactos del draft ES actual; sin normalizar Markdown ni saltos de línea |
| `slug_es` | `abstraccion-de-caja-negra-pensar-en-cajas` |
| `es_translation_approved` | `false` |
| `es_approved_hash` | Cadena vacía; la aprobación queda pendiente |

La metadata de la operación se conserva aparte, en `prepared/update-plan.json`:
`updateStory`, `space_id:1023389`, `id:104410751478034`, `publish:false` y
`force_update:false`. El contrato consultado indica que `publish` es booleano y
por defecto falso. Se conserva el objeto completo de contenido para evitar
pérdida de campos en su reemplazo. El body omite los metadatos ajenos y de solo
lectura; **no incluye `story.published:false`** ni una orden de despublicación.
La historia española no tiene ningún payload de actualización. Esta propuesta
no se envió al MCP y su ejecución continúa requiriendo autorización específica.

`calculateDraftEditorialApprovalHash` se ejecutó sobre el contenido EN fusionado
con los textos ES efectivos. Hash candidato de revisión:

`417425b3d79373e0c0791efeb1c55c0ca2fdbf847c04285f6b93ba419320b948`

Coincide con la simulación histórica porque las identidades, slugs, seis textos
y categoría comprometidos no han cambiado. Ahora se ha contrastado con ambos
drafts MAPI reales. **No es un hash persistido ni aprobación:** el draft EN
actual aún no tiene las claves traducidas, y la propuesta mantiene el campo
de aprobación vacío. Fecha, imágenes y timestamps no están incluidos en ese
compromiso; se verificaron por separado. No se modificó el helper ni el esquema.

### Validación, preservación y evidencia de la continuación

- **8/8 controles locales PASS:** identidad/estado, igualdad draft-snapshot,
  conservación de los nueve campos, solo seis adiciones, textos ES exactos,
  metadata e imágenes/fecha preservadas, hash del helper y body sin publicación
  ni aprobación; archivos fuente privados verificados sin cambios.
- Las **18/18 pruebas de migración y 23/23 regresiones SEO** de la entrega
  inmediatamente anterior conservan sus seis logs verificados; no se
  ejecutaron nuevamente ni se repitió build o matriz HTTP/Chromium.
- El primer script local de preparación falló por una variable indefinida antes
  de escribir artefactos de payload. Se corrigió y se guardó el script que pasó
  los ocho controles; no hubo efectos remotos ni cambios de código funcional.
- Rama y HEAD permanecen en `feat/storyblok-field-translation-pilot-20261113`,
  C3 `4f316fbd61916f6388ed2f179a2f14c8afea87d0`. Solo se actualiza este informe
  respecto de la nueva línea base; código, pruebas y package/lock se conservan.

Evidencia privada fuera de Git, con directorios `0700` y archivos `0600`:
`/tmp/blackbox-mapi-reconnected-20261113` contiene los dos drafts y el contrato
MCP, resumen y manifiesto; `/tmp/blackbox-mapi-followup-20261113-vvp6236x`
contiene la preimagen local, el script y el payload/plan/validaciones.
El resumen MAPI tiene SHA-256
`d244eaaa1db9416163e0131062e4d9a0b87be39d1c70d61a4c3ef1509377969f`;
su manifiesto, `33ed8607ae613838755d1f02479c63ea10eb4e66a293eead923431f28d3a5aa7`.
Estas ubicaciones de `/tmp` son temporales; la evidencia no contiene credenciales
pero sí contenido editorial y no debe incorporarse a Git.

Se creó además un archivo persistente nuevo, sin alterar respaldos anteriores:
`/home/jhonattanb/Backups/portfolio-storyblok/blackbox-mapi-reconnected-20261113T220147Z`.
Sus **17 archivos** fueron copiados y verificados con hashes y permisos
`0700`/`0600`; el manifiesto tiene SHA-256
`98c11829126a4073bfe4657de15bbee21ffb9b30ac25f8c76494f96f9cd47d4d`.
Contiene los drafts, contrato, resumen, preimagen local y propuesta completa.
Es una copia en el mismo disco y sin cifrado; no sustituye la relectura de
concurrencia necesaria antes de una futura escritura.

**Decisión:** GO para revisar la propuesta y solicitar autorización específica
de guardado del draft EN sin publicación ni aprobación. No se autoriza ni se
certifica publicación bilingüe, activación del modelo, Preview o producción.
Antes de cualquier mutación deberá releerse y detenerse ante cualquier cambio.
No se escribieron Storyblok, Vercel o flags persistentes; no se crearon commits,
pushes o deployments.

**Reality Checker — dictamen independiente:** PASS de la reconexión MAPI,
comparación de ambos drafts y preparación local. Verificó por separado el
contenido completo del body, las seis adiciones, textos ES exactos, aprobación
desactivada y hash del helper; recalculó las precondiciones y confirmó los
17 hashes/bytes y permisos del archivo persistente. Solo el informe cambió
respecto de la línea base de esta continuación. **GO para revisar y solicitar
permiso específico de guardado del draft EN, sin publicar ni aprobar**. No
certifica publicación real, Preview o producción; mantiene la relectura de
concurrencia obligatoria y la limitación de ausencia de bloqueo transaccional.

## Black-Box — decisión SEO y MAPI 401 (registro de la entrega anterior)

**Estado histórico:** el 401 y la necesidad de reconexión que siguen quedaron
resueltos con las dos lecturas MAPI de la continuación anterior. Se conservan
como evidencia del bloqueo original; el contrato SEO y sus 41 pruebas mantienen
su vigencia.

Actualización del 13 de noviembre de 2026. Rama
`feat/storyblok-field-translation-pilot-20261113`, HEAD C3
`4f316fbd61916f6388ed2f179a2f14c8afea87d0`. Se conservaron los cambios locales
anteriores. Esta entrega modifica únicamente las dos pruebas indicadas abajo y
este informe; no cambia código funcional, fixtures, package/lock ni el CMS.

### Contrato de timestamps aprobado por el titular

La identidad consolidada usa los timestamps de la historia base EN para **ambos
idiomas**: `first_published_at` para `JSON-LD.datePublished` y `updated_at` para
`JSON-LD.dateModified` y sitemap `lastmod`. La prueba compara con el snapshot EN
original, exige fechas válidas, modificación no anterior a primera publicación
y una sola entrada por URL. Son valores de la historia base, no constantes
editoriales ni timestamps históricos ES que deban conservarse por separado.

| Metadata ES de los snapshots revisados | Antes, historia ES | Contrato consolidado EN |
| --- | --- | --- |
| `datePublished` | `2025-10-23T01:16:45.100Z` | `2025-10-23T00:58:54.723Z` |
| `dateModified` / `lastmod` | `2025-10-30T01:51:41.509Z` | `2025-10-30T01:49:12.036Z` |

El titular acepta expresamente este cambio de metadata. Una publicación o
modificación futura usará los timestamps efectivos de EN; esta prueba no
predice sus valores. Permanecen las aserciones de fechas editoriales visibles,
contenido Markdown exacto, imágenes, ambas URLs históricas, canonical, hreflang,
categorías, otros 28 artículos y ausencia de duplicados. No se añaden campos a
Storyblok ni se modifica el algoritmo del hash editorial.

### Archivos y pruebas efectivas de esta entrega

| Archivo | Cambio acotado |
| --- | --- |
| `tests/blackbox-migration.test.mjs` | Reemplaza el caso de timestamps ES por el contrato EN aceptado; añade validación de sitemap con `buildSitemapEntries`. Conserva los otros 17 casos. |
| `tests/integration/blackbox-migration.mjs` | Describe el contrato y registra los valores EN esperados junto a las diferencias históricas ES en la evidencia; no altera las comprobaciones HTTP. |
| `docs/slug-es-integrated-pilot.md` | Decisión editorial, resultados actuales y bloqueo MAPI. |

| Verificación ejecutada | Resultado |
| --- | --- |
| Migración Black-Box | **18/18 PASS**, cero fallos u omisiones |
| `tests/seo-localization.test.mjs` | **9/9 PASS** |
| `tests/seo-i18n-routing.test.mjs` | **14/14 PASS** |
| Total de pruebas afectadas | **41/41 PASS** |
| Sintaxis de los dos archivos MJS y ESLint acotado | **PASS**, exit 0 |

La migración se ejecutó con `BLACKBOX_MIGRATION_SOURCE` apuntando al snapshot
privado publicado ya revisado; ninguna prueba consultó el CMS. Sin ese archivo,
los casos dependientes se omiten: **no ocurrió en esta ejecución**. No se
repitieron build, TypeScript, matriz HTTP/Chromium ni la suite completa, porque
solo cambió el contrato de una prueba y el descriptor de evidencia. Los
resultados anteriores que siguen más abajo son históricos, no ejecuciones nuevas
ni prueba de una publicación consolidada real.

Evidencia local sanitizada en
`/tmp/blackbox-timestamps-mapi-20261113-yn4lzp80`: `baseline.json` y `before/`
preservan once archivos de entrada; `qa/summary.json` registra resultados,
códigos de salida y hashes de seis logs. El snapshot privado de origen tiene
SHA-256 `4d969ff4979c2de182e1abfb4a6f2b639da94fce2b46ff2e017b9b79f9d2fb98`.
La evidencia de esta entrega en `/tmp` es temporal; el respaldo persistente de
la preparación anterior, indicado en su sección histórica, permanece intacto.

### MAPI: una lectura, 401 y detención de esa fase

La conexión oficial `storyblok` está configurada y habilitada, mediante
`streamable_http` en `https://mcp.storyblok.com/mcp`. Esto no demuestra que su
sesión OAuth sea válida. Se ejecutó una sola lectura `getStoryById` del espacio
`1023389`, historia EN `104410751478034`, solicitando el estado editable y
excluyendo credenciales de la salida. Resultado efectivo: **401 Unauthorized**.
No se consultó ES ni se insistió con otro método de autenticación. No se
recuperaron secretos de Vercel ni se usaron tokens CDA como sustitutos de MAPI.

Punto concreto de reconexión: en una terminal autorizada del titular, ejecutar
el comando OAuth de la conexión oficial, verificado con la ayuda local de Codex:

```sh
codex mcp login storyblok
```

Completar la autorización con una cuenta con acceso al espacio y después
reconectar o refrescar la sesión MCP de Storyblok antes de repetir una única
lectura. No se inició login/logout en esta entrega. El 401 no permite atribuir
una causa concreta a caducidad, permisos o configuración de cuenta.

Estado MAPI sanitizado: `cms/mapi-readonly-status.json` en la carpeta temporal
anterior, SHA-256
`c63d921816e253dab68056add27e624a32513f2c6e96ed13ef71c2ec56c2acfb`.
Los estados editables completos EN/ES, sus metadatos de concurrencia y las
modificaciones pendientes **siguen sin verificarse**. Por ello no se compararon
draft/publicado, no se preparó un payload completo ejecutable ni se recalculó un
hash sobre el draft vigente. El hash condicionado de la simulación histórica
no sustituye esos datos ni una aprobación editorial.

**Estado actual: pendiente SEO CERRADO; acceso MAPI BLOCKED.** La migración real
continúa **NO-GO** hasta leer ambos drafts y reconciliarlos con sus snapshots
publicados. La historia ES original debe permanecer intacta y publicada. No se
escribió o publicó en Storyblok, no se consultó/modificó Vercel, no se activaron
flags persistentes ni se crearon commits, pushes o deployments. No se afirma
una nueva verificación remota del estado de producción.

**Reality Checker — revisión independiente:** PASS del contrato SEO aprobado y
la preservación local; **41/41 pruebas** contrastadas con sus logs, cuyos seis
hashes coinciden con el resumen. Los ocho archivos funcionales/de soporte de la
línea base, incluido package/lock, permanecen intactos. **MAPI BLOCKED 401;
NO-GO de migración real** hasta verificar ambos drafts y concurrencia. La
revisión no certifica publicación consolidada ni producción.

## Black-Box Abstraction — preparación anterior y simulación ON (registro histórico)

**Alcance histórico:** los resultados 17/18 y el bloqueo por decisión de
timestamps que siguen corresponden a la preparación anterior. La decisión del
titular y su regresión están resueltas en el apartado actual; MAPI sigue bloqueado.

**No se ejecutó ninguna escritura o publicación de Storyblok.** MAPI respondió
401; se utilizó únicamente CDA publicada para los datos verificables. Se
prepararon snapshots, un diff **no ejecutable** de simulación y un hash
condicionado. El mecanismo local funciona, pero la migración real sigue
**NO-GO** por estado editable desconocido y preservación SEO pendiente.

### Identidad y contenido publicado comprobados

Espacio `1023389`, región `us`. Lectura actual del 13 de noviembre de 2026:

| Idioma | ID | UUID | URL histórica |
| --- | --- | --- | --- |
| EN | `104410751478034` | `6bffd408-51d4-403b-a64a-cd22e3c3e287` | `/posts/black-box-abstraction-thinking-in-boxes` |
| ES | `104417520187671` | `6f473dc7-3fbb-48cf-adca-db35a67cde00` | `/es-co/posts/abstraccion-de-caja-negra-pensar-en-cajas` |

CDA `version=published` devolvió ambas historias y un catálogo de **38
historias, incluidos los 30 artículos**, categorías y páginas auxiliares.
Comparten grupo `0fcc514b-0491-4e7f-acaa-2df788910117` y alternates publicados
recíprocos. Los snapshots de ambas historias coinciden antes/después de las
lecturas y con el catálogo. Fueron diez GET, incluyendo redirecciones `cv`
validadas al mismo endpoint; no se guardaron credenciales ni URLs autenticadas.

Title, Intro y Content son distintos según idioma. Se copiaron exactamente,
incluido Markdown, sin generación editorial. Fecha visible, imágenes, `_uid`
y componente coinciden. Las referencias de categoría difieren legítimamente:
EN `227c85f5-1bf3-42f0-9c39-ee0bc205846f` y ES
`63182ea4-37ee-424d-8270-7e35b2ae77e1` son categorías publicadas emparejadas;
la proyección mantiene la ruta española
`/es-co/categories/mi-viaje-usando-teachyourselfcs`.

**Datos editoriales BLOCKED:** una lectura MAPI de EN devolvió 401 y se detuvo
ese acceso, sin recuperar credenciales ni reintentar con otros mecanismos.
No se verificaron el draft EN/ES vigente, `unpublished_changes`, versiones de
escritura, campos no visibles en CDA ni concurrencia. La entrega por CDA
publicada no demuestra ausencia de borradores pendientes. No se reconstruyó un
payload `updateStory` a partir de CDA.

### Transformación propuesta, sin aplicar

El diff respaldado describe **publicado → simulación futura**, no una mutación
lista para enviar. Identifica `managementWritePayload:false`,
`draftStateVerified:false` y `realPublicationObserved:false`.

| Campo EN propuesto | Valor de la simulación |
| --- | --- |
| `title__i18n__es_co` | Copia exacta de `ES_publicado.content.title` |
| `intro__i18n__es_co` | Copia exacta de `ES_publicado.content.intro` |
| `content__i18n__es_co` | Copia exacta de `ES_publicado.content.content`, sin normalizar Markdown |
| `slug_es` | `abstraccion-de-caja-negra-pensar-en-cajas` |
| `es_translation_approved` | `true` **solo en el fixture de publicación futura** |
| `es_approved_hash` | Hash condicionado indicado abajo, **solo en el fixture** |

Se conservan los nueve campos originales del contenido EN publicado, incluidos
idioma `english`, fecha, imágenes, `_uid` y categoría; también sus ID, UUID,
slug, grupo y relaciones. La historia ES original y los otros 28 artículos se
mantienen idénticos en los datos. Las claves raw solo existen en la propuesta
privada de revisión; se eliminan de las respuestas CDA simuladas.

Se utilizó el helper existente `calculateDraftEditorialApprovalHash` con la
identidad EN real y los textos publicados exactos. Hash propuesto:

`417425b3d79373e0c0791efeb1c55c0ca2fdbf847c04285f6b93ba419320b948`

Este compromiso no equivale a aprobación humana, estado persistido ni verificación
del draft. No cubre fecha, imágenes o timestamps de publicación. No garantiza
preservar campos ajenos de un draft desconocido: precisamente por eso el
**payload ejecutable MAPI no se generó**.

### Pruebas nuevas y locales efectivamente ejecutadas

Solo se añadieron tres archivos; no cambió código funcional ni package/lock:

- `tests/integration/blackbox-migration-fixtures.js`: proveedor local de snapshots
  publicados y representaciones futuras simuladas; GET exclusivo y sin CDA live.
- `tests/integration/blackbox-migration.mjs`: preparación, diff/hash y build/HTTP/
  Chromium aislados; datos reales fuera de Git y del directorio servido.
- `tests/blackbox-migration.test.mjs`: regresiones específicas de esta pareja y
  su preservación. Sin snapshot privado, los casos dependientes quedan omitidos;
  en esta ejecución se proporcionó y hubo cero omisiones.

| Validación | Resultado |
| --- | --- |
| Nuevas unitarias | **18 casos: 17 PASS, 1 FAIL**, exit 1; cero omitidos/cancelados |
| Fallo conservado | Preservación exacta de `JSON-LD.datePublished` ES; no se debilitó la aserción |
| Syntax y ESLint de los tres archivos nuevos | PASS, sin errores ni avisos |
| Build aislado ON | PASS, Turbopack, BUILD_ID `cpWocviwkvMHMC0BDR3Xm` |
| HTTP/Chromium nuevo | **3/3 grupos PASS**: aprobado simulado, no aprobado y colisión |
| URLs, identidad y contenido | Ambas URLs históricas proyectadas al UUID EN; título, intro y Markdown exactos, selector y enlaces EN/ES recíprocos |
| Canonical/hreflang/listados/categorías | PASS del mecanismo con origen WWW esperado y categoría española equivalente |
| Otros artículos legacy | **28/28 HTTP 200 y canonical correcto**, UUID y contenido del catálogo intactos |
| Sitemap local ON | **45 URLs únicas, 30 artículos**, sin duplicados ni ensayo ficticio |
| Protección de ensayo | PASS local: ensayo ausente del catálogo/sitemap y sin contenido draft expuesto |
| Preservación de fecha visible e imágenes | PASS de datos/URLs; los bytes de imágenes se sustituyeron por placeholders en navegador |
| Observación de navegador | Cero errores JavaScript, HTTP 5xx, solicitudes Analytics o draft; **17 cancelaciones `ERR_ABORTED`** de navegación/prefetch |
| Copia de fuentes | **136/136 archivos** coinciden; `next-env.d.ts` solo se regeneró en la copia aislada |
| Guardas de aislamiento | **7/7 PASS** sintéticos del interceptor; revisión estática de paths privados y ausencia de configuración real |

El servidor solo escuchó en `127.0.0.1`; el flag ON se pasó al build/runtime de
esa copia mediante un entorno limitado y tokens ficticios. No se copiaron `.env`
ni Git, se preservó `.gitignore` y Analytics permaneció OFF. Las respuestas de
CDA durante estas pruebas fueron fixtures derivados del publicado, **no una
publicación consolidada real**. El bloqueo de CDA/browser externo no certifica
cero tráfico de todos los procesos nativos del build, como la descarga de fuentes.
Las capturas muestran render español desktop/móvil; no acreditan bytes originales
de imágenes, rendimiento ni QA visual integral.

No se repitieron las 371 unitarias ni los 19 grupos anteriores. Tampoco se
consultó o modificó Vercel: el Preview existente permanece fuera de esta prueba.
No se revalidó remotamente su QA ni el destino de producción en esta ejecución.

### Diferencia SEO que impide afirmar preservación completa

La proyección española clona la identidad EN y reemplaza solo los tres textos.
JSON-LD usa `first_published_at`/`updated_at`; el sitemap usa `updated_at`.
La fecha editorial visible es igual, pero estos timestamps son distintos:

| Metadata | ES publicada actual | Proyección ES con identidad EN |
| --- | --- | --- |
| `datePublished` | `2025-10-23T01:16:45.100Z` | `2025-10-23T00:58:54.723Z` |
| `dateModified` / `lastmod` | `2025-10-30T01:51:41.509Z` | `2025-10-30T01:49:12.036Z` |

La diferencia también se observó en el HTML local. `published_at` y `created_at`
son diferentes entre registros. Una publicación futura actualizará metadata y
no se puede predecir su timestamp exacto. No se cambió código ni se añadieron
campos para ocultar el delta. El titular debe decidir si admite metadata común
a la identidad EN o exige preservar fechas por idioma; mientras tanto, no se
certifica conservación SEO exacta.

### Condiciones futuras, rollback y decisión

Antes de preparar un body de escritura: restaurar acceso MAPI por el canal
autorizado, releer ambas historias completas y verificar publicación/cambios
pendientes. Comparar los campos revisados con CDA publicada; cualquier divergencia
requiere reconciliación editorial. Registrar hash canónico del contenido completo,
`updated_at` y versión si el proveedor la devuelve; comprobar que los seis campos
objetivo no contienen trabajo distinto. Releer inmediatamente antes de escribir
y detenerse si algo cambió. Esto reduce concurrencia, no crea un bloqueo
transaccional. El futuro body debe fusionarse con el **draft MAPI vigente**, no
con este snapshot CDA, conservando todos los campos ajenos.

Antes de publicar, el snapshot público legacy debe continuar sirviendo los
contenidos actuales. Después de una hipotética publicación aprobada, ON adoptaría
la identidad EN para ambas URLs y validaría el compromiso; OFF seguiría usando
las historias legacy. La historia ES debe permanecer publicada e intacta. Esta
secuencia no se ejecutó ni se autorizó en esta entrega.

Rollback actual: detener la instancia aislada y conservar los snapshots; no hay
mutación remota que revertir. Para una migración futura, mantener/restituir el
camino legacy OFF. Si solo existe un draft enriquecido, deshacer exclusivamente
sus campos propios contra una preimagen MAPI vigente y con autorización. Si EN
ya se publicó, modificar únicamente el draft **no** revierte CDA: una restauración
y republicación EN necesita autorización y control de concurrencia. No despublicar
EN ni borrar/modificar ES: rompería o pondría en riesgo las URLs históricas. Nunca
restaurar ciegamente un backup completo sobre cambios concurrentes.

Backups privados y diff de simulación:
`/home/jhonattanb/Backups/portfolio-storyblok/black-box-migration-preparation-20261113T213121Z`.
Contienen snapshots actuales EN/ES, catálogo, relaciones, preimagen local,
`local-on/publication-simulation-diff.json`, `simulation-data.json`, hash,
resultados, trazas y capturas; con manifiesto y `SHA256SUMS`. No hay credenciales;
directorios `0700`, archivos `0600`. Mismo disco, sin cifrado. Origen temporal:
`/tmp/black-box-migration-20261113-7voojmsy/`.

Participaron Software Architect, CMS Developer, Frontend Developer, Test
Automation Engineer, Application Security Engineer y Reality Checker según sus
definiciones originales. La revisión independiente confirma snapshots publicados
intactos en las lecturas, ausencia de escrituras CMS/Vercel y preservación de las
fuentes funcionales. El estado editable continúa BLOCKED.

**Dictamen: PASS del mecanismo local derivado de publicado; NO-GO para solicitar
la primera escritura/publicación real mientras falte MAPI vigente y la decisión
editorial sobre timestamps SEO.** No se activaron flags persistentes, crearon
commits/pushes/deployments ni se retiraron historias legacy.

## Preview con modelo OFF — READY; QA autenticada pendiente

El único reintento autorizado creó el Preview protegido
`dpl_APdyDndhGaVEcPtyWAMDVfk9vdxn`, READY, con Node 24.x según metadata remota y
Next.js 16.4.6 según el build. Un GET anónimo devuelve 302 hacia Vercel SSO.
Producción conserva C3. Las 30 rutas, el sitemap y la autorización del borrador
requieren todavía QA mediante sesión autenticada; no se presentan las pruebas
locales como evidencia HTTPS. Véase el
[informe del Preview, diagnóstico y límites](vercel-preview-field-translation-off.md).

## Corrección local de los dos contratos CDA — validación completada

13 de noviembre de 2026, America/Bogota. Rama
`feat/storyblok-field-translation-pilot-20261113`, HEAD C3
`4f316fbd61916f6388ed2f179a2f14c8afea87d0`. Las dos incompatibilidades de la
recomprobación siguiente se corrigieron localmente. El modelo continúa **OFF por
defecto y bloqueado en Production**. No se modificaron CMS, Vercel ni producción;
no hubo aprobación editorial, publicación, commits, pushes o deployments.

### Archivos corregidos en esta ejecución

Comparación contra la línea base tomada antes de esta entrega, que ya contenía
la capa editorial y sus cambios locales anteriores:

| Archivo | Corrección |
| --- | --- |
| `lib/storyblok-locales.ts` — nuevo | Mapa explícito tipado: CDA `es-co`, sufijo MAPI `es_co`, EN sin parámetro `language` |
| `lib/storyblok-data.ts` | `getStoryByUuid` consulta el código CDA del mapa, sin cambiar las consultas legacy |
| `lib/editorial-catalog.ts` | Exige exactamente `es-co/${base.full_slug}` en ES y conserva el sufijo nativo del helper MAPI desde el mapa |
| `tests/editorial-catalog.test.mjs` | Regresiones del código CDA, fallback inglés, ruta prefijada, identidad y draft sin `published` |
| `tests/integration/editorial-fixtures.js` | Representaciones con `lang:"es-co"`, `full_slug` prefijado y draft sin booleano MAPI; `es_co` devuelve inglés |
| `tests/integration/editorial.mjs` | Comprueba solicitudes UUID con `es-co` y ausencia de solicitudes con el código incorrecto |
| `docs/slug-es-integrated-pilot.md` | Este resultado y evidencia histórica conservada |

La base ya exige `posts/<slug>` válido. La representación española solo admite
el prefijo exacto esperado; no se decodifican ni eliminan segmentos arbitrarios.
Se preservan ID, UUID, slug nativo, aprobación, hash, categoría y colisiones.
Las URLs se construyen desde la base y `slug_es`, nunca desde el `full_slug` ES.
No se cambiaron los códigos de las rutas públicas ni se añadió `fallback_lang`.
El helper editorial sigue leyendo exclusivamente claves propias
`title/intro/content__i18n__es_co`; los aliases con guion no las sustituyen.

### Resultados efectivos

Node **24.21.0**, Next.js **16.4.6**. Ambas compilaciones son copias locales
aisladas del código actual, sin `.env` ni metadatos Git copiados. La referencia
Git del manifiesto OFF se leyó mediante `rev-parse`, sin escrituras Git.

| Validación | Resultado |
| --- | --- |
| TypeScript `tsc --noEmit --incremental false` | **PASS**, exit 0 |
| ESLint | **PASS**, 0 errores; 3 advertencias preexistentes en ErrorBoundary/ThemeContext |
| Suite unitaria completa | **371/371 PASS**, 0 fallos, omitidas o canceladas; 18 casos nuevos respecto a 353 |
| Subconjunto editorial, incluido en la suite | **65/65 PASS** |
| Build OFF, Turbopack | **PASS**, BUILD_ID `s23lKs1GA3SZilz7Zx9sJ` |
| HTTP/Chromium legacy contra ese build | **15/15 grupos PASS** |
| Artículos públicos reales, servidor local OFF | **30/30 HTTP 200**, canonical único esperado |
| Sitemap OFF | **45 URLs únicas**, incluidos los 30 artículos; mismo conjunto que el build anterior preservado; ensayo ausente |
| Aislamiento del ensayo real en servidor local OFF | **PASS**, respuesta de streaming 200 con `noindex`, sin artículo, textos de ensayo ni UUID expuestos |
| Build aislado ON con upstream sintético | **PASS**, BUILD_ID `FUdnfs9GKR6_SoZvkK4S6` |
| HTTP/Chromium del nuevo modelo | **4/4 grupos PASS**: proyección, OFF predeterminado, bloqueo Production y aislamiento sin credencial privada |
| Manifiesto OFF antes/después de integración | **PASS**, mismas fuentes y artefactos compilados |
| Preservación | `.env.local` y build original intactos; package/lock sin cambios; 143/143 archivos de la línea base respaldados y verificados, ninguno perdido |

Las regresiones incluyen 14 variantes de `full_slug` rechazadas —sin prefijo,
locale incorrecto, prefijo duplicado, slash inicial/final, query, fragmento,
codificación, traversal y controles—, cambios de ID/UUID/slug, traducción parcial,
hash inválido y ausencia de credencial privada. Un payload con inglés y ruta/ID
válidos falla el compromiso editorial y no crea ruta ES. Se conservan los
controles de `no-store`, colisiones y URLs legacy.

El replay local de **formas** CDA observadas usa contenido sintético propio:
campos traducidos resueltos, locale con guion, `full_slug` prefijado y draft sin
`published`. No se almacenaron cuerpos privados ni se presenta ese replay como
una nueva consulta CDA real. La evidencia CDA anterior sigue separada abajo.

En ON hubo cero errores JavaScript, respuestas HTTP 5xx, solicitudes Analytics
y solicitudes draft. Las trazas registran **17 cancelaciones `net::ERR_ABORTED`**
de navegación/prefetch, no cero solicitudes fallidas. Se guardaron capturas EN
de escritorio/móvil; no equivalen a QA visual integral. La integración legacy
prueba consentimiento con Analytics/editor sintéticos interceptados, sin enviar
mediciones reales; los builds permanecen con Analytics OFF.

### Incidencias del entorno de pruebas conservadas

La primera suite unitaria bajo sandbox contó 18 archivos en lugar de los casos
internos. Se conservó el log y se ejecutó fuera del sandbox: 371 casos reales.
La primera integración OFF pasó 14 grupos y falló al iniciar el runtime de
desarrollo del último grupo. El diagnóstico mostró `/contact` 500 por CSS
generado de Tailwind: la copia aislada omitía `.gitignore` y escaneaba cachés.
Se copiaron las reglas originales únicamente a esa copia y se preservó la caché
fallida fuera de ella. `/contact` pasó a 200; la misma integración pasó 15/15
sin modificar aserciones, aplicación o configuración del repositorio. El
manifiesto confirmó que se reutilizó el mismo build OFF. Se conservan ambos
resultados y los diagnósticos; no se borra el fallo inicial.

### Identidad, evidencia, límites y decisión

Fuente OFF: `ce5b8c8adebccc2e84427c6d4a5dc6e0856b3aeb1c544489b8eb3d19af455f04`.
Artefactos OFF: `ca2056d38c053b12c95149ab56bcb6aa660a19d6f006650f3c26914f67456db4`.
Manifiesto en
`/tmp/pilot-a-contract-fix-20261113-nt8l3nwb/off-root/.next/release-validation/s23lKs1GA3SZilz7Zx9sJ/manifest.json`.
Evidencia sanitizada en `/tmp/pilot-a-contract-fix-20261113-nt8l3nwb/`:
`baseline.json`, `before/`, logs unitarios, `off-validation/` —primer intento—,
`off-completion/`, `validation/final/real-legacy-http.json` y `on-integration/`.
Las 131 fuentes/configuraciones/tests comparadas coinciden con ambas copias de
validación; `next-env.d.ts` solo se regeneró dentro de las copias aisladas.
El `.gitignore` añadido al entorno OFF coincide con el original.

Frontend Developer implementó los dos contratos; Test Automation Engineer
actualizó y ejecutó sus pruebas; Application Security Engineer contrastó las
correcciones y los runners. AppSec verificó que gate, cálculo del compromiso,
selección de tokens y política de caché permanecen intactos **4/4** respecto a
la línea base. Reality Checker revisó independientemente fuentes, preservación,
manifiestos, resultados y trazas: **PASS local**, sin discrepancias en las 132
fuentes y 435 artefactos del manifiesto OFF, ni archivos perdidos de la base.

Respaldo persistente de la línea base, delta final y evidencia sanitizada:
`/home/jhonattanb/Backups/portfolio-storyblok/cda-contract-correction-20261113T145615-0500`.
Incluye `SHA256SUMS` para comprobar integridad. Excluye `.env`, credenciales y
cuerpos compilados; directorios `0700`, archivos `0600`. Es almacenamiento local
en el mismo disco, sin cifrado; los respaldos anteriores permanecen intactos.

**Decisión local: GO para continuar el piloto y preparar una futura validación
en Preview protegido, sujeta a autorización específica. NO-GO para activar el
modelo en producción.** No está validado el camino positivo con un artículo
real aprobado/publicado; el ensayo real no se aprobó ni publicó en esta entrega.
La lectura MAPI anterior devolvió 401 y no se reintentó aquí: ese límite sigue
documentado y no se sustituye por fixtures.

Rollback de esta entrega: el gate OFF conserva el camino legacy; para retirar
solo estas correcciones, revisar el delta contra `before/`, restituir únicamente
los cinco archivos de código/pruebas modificados y retirar el mapa nuevo solo
después de quitar sus imports. Preservar documentación e historia; no aplicar
reset/clean ni restaurar C2 sobre los cambios editoriales anteriores. No se ha
ejecutado rollback.

## Recomprobación CDA real — hallazgos anteriores corregidos localmente arriba

13 de noviembre de 2026, 14:28–14:32 America/Bogota. Esta comprobación sustituye
el bloqueo por credencial ausente de la sección siguiente. El token privado ya
está disponible mediante `@next/env` con precedencia de producción. El gate
`STORYBLOK_FIELD_TRANSLATION_ENABLED` permanece deshabilitado. No se recuperaron
credenciales de Vercel ni se registraron valores, URLs autenticadas o cuerpos.

### Resultado efectivo del proveedor y del adaptador

Se realizaron **7 GET CDA** acotados al mismo UUID: tres iniciales, tres de
seguimiento —incluido el salto de redirección publicada— y uno para precisar
slugs. No hubo consultas a otras historias ni mutaciones. Las comparaciones de
textos se hicieron en memoria contra respaldos editoriales reales, no fixtures.

| Comprobación | Resultado observado |
| --- | --- |
| Token local y capacidad Preview | **PASS**: draft accesible y ensayo ausente en la consulta publicada |
| Draft EN, idioma predeterminado sin `language` | **PASS**, HTTP 200; ID/UUID exactos y Title/Intro/Content idénticos al respaldo inglés |
| Draft solicitado con `language=es_co` | **FAIL de traducción**, HTTP 200; los tres textos son idénticos al inglés y difieren del español revisado |
| Draft solicitado con `language=es-co` | **PASS de contenido**, HTTP 200; los tres textos coinciden exactamente con el español revisado y difieren de EN |
| Identidad y campos compartidos EN/ES | **PASS**: mismo ID/UUID, `slug`, `slug_es`, `language`, fecha, `category_ref`, imagen, componente y UID de contenido |
| Aprobación editorial | **PASS de aislamiento**: `es_translation_approved:false` y `es_approved_hash:""` en CDA draft |
| Publicación | **PASS**: consulta publicada final HTTP 404; no devuelve el ensayo |
| `full_slug` de la representación ES correcta | **Diferencia real**: `es-co/` seguido del `full_slug` base; `slug` y `slug_es` no cambian |
| Forma de respuesta draft | Sin booleano `published`, `published_at:null`, sin claves raw `__i18n__`; ES correcta devuelve `lang:"es-co"` |
| Helper actual, estructura | Acepta los payloads reales en replay local, sin solicitudes HTTP adicionales; esto no prueba traducción correcta |
| Helper actual, parámetro de idioma | **FAIL**: transforma `es-co` en `es_co`, que en esta consulta produjo inglés |
| Catálogo actual, contraste de rutas | **Incompatible por inspección estática**: exige `es.full_slug === base.full_slug`; rechazaría la representación ES prefijada si alcanzase esa validación |
| MAPI actual | **BLOCKED**, una lectura MCP acotada devolvió HTTP 401; no se recuperaron credenciales ni se reintentó |

La primera consulta publicada registró una excepción de red/redirección con
seguimiento deshabilitado; su causa no se distinguió y no se reescribe ese
resultado como PASS. El seguimiento recibió HTTP 301 y permitió un
único salto tras validar el mismo origen/ruta, token, versión y UUID, con `cv`
numérico como único parámetro adicional. El destino final devolvió 404. No se
guardaron cabeceras ni `Location`. Esto demuestra ausencia en CDA publicada en
ese momento; no reconstruye un historial de publicación ni una lectura MAPI
actual de `published:false`.

### Contraste con MAPI y diferencias frente a fixtures

CMS Developer verificó **28/28 hashes** del respaldo nativo ya existente:
`slug-es-native-key-correction-20261113T120838-0500-verification`, fuera de Git.
La referencia `cms/draft-after-read.json` tiene SHA-256
`9d29139fd42775b52eb139290e3b3a26525f3f91e5a1a3b7cb28f37e5d7bc8d2`.
Las tres claves `__i18n__es_co` de ese respaldo coinciden con las traducciones
españolas originalmente revisadas del respaldo anterior y con CDA `es-co`.
La comparación actual es contra esa referencia verificada; la lectura MAPI
fresca está bloqueada por 401.

Las propiedades antiguas con guion siguen presentes en el respaldo con los
mismos textos. Por ello esta evidencia acredita equivalencia textual, pero no
identifica inequívocamente qué propiedad raw consumió internamente Storyblok.
No se eliminaron aliases ni se modificó contenido para resolver esa cuestión.

Los fixtures anteriores asumían `language=es_co`, representación ES sin prefijo
en `full_slug` y draft sintético con `published:false`. CDA real distingue el
código de consulta `es-co` del sufijo MAPI observado `es_co`, añade el prefijo a
`full_slug` y omite el booleano MAPI. El transporte draft ya acepta esa ausencia;
no hay que fabricar estados ni claves raw para ajustarlo.
La documentación oficial también muestra
[`language=es-co` para CDA](https://www.storyblok.com/docs/api/content-delivery/v2/stories/examples/retrieving-stories-in-a-particular-language).
No confundirlo con el formato de `fallback_lang` o de claves MAPI.

### Ajustes mínimos identificados y regresiones pendientes

Esta ejecución es de verificación: **no se modificaron loaders, catálogo ni
pruebas del repositorio**. Los ajustes pendientes son concretos:

1. En `getStoryByUuid`, conservar `es-co` como parámetro CDA; EN sigue omitiendo
   `language`. Mantener token privado, `no-store`, identidad y ausencia de fallback
   configurado.
2. En el contraste del catálogo, aceptar exclusivamente el prefijo ES esperado
   al comparar `full_slug` con la base. Mantener comprobaciones de UUID/ID/slug,
   rechazar otros prefijos o rutas y construir URLs desde la base y `slug_es`.
3. Corregir fixtures y cubrir ambos códigos: HTTP 200 con inglés no constituye
   traducción válida; el compromiso editorial debe rechazarlo sin adoptar ruta ES.
   Probar representación prefijada válida, prefijo inesperado, draft sin
   `published`, credencial privada ausente, EN predeterminado y `no-store`.

No se ejecutó el camino positivo publicado del modelo: el ensayo continúa sin
aprobación y no aparece en CDA publicada. El rechazo por `full_slug` se identificó
en la condición del catálogo, sin aprobar/publicar el ensayo ni fabricar una
publicación real. No se repitieron build o baterías generales; las comprobaciones
de esta ejecución son GET reales, comparaciones exactas y replay local del helper
con respuestas reales únicamente en memoria. Node emitió una advertencia de
detección de módulo al importar TypeScript directamente; no fue fallo de build.

### Evidencia sanitizada y revisión independiente

Directorio temporal `/tmp/cda-retry-20261113`, permisos `0700`; JSON `0600`.
Los archivos conservan estados, comparaciones booleanas y hashes; no contienen
tokens, URLs autenticadas, cabeceras ni cuerpos editoriales. Los hashes de textos
usan JSON UTF-8 compacto; el resumen CMS ordena claves de objetos y los resúmenes
CDA conservan su orden, por lo que hashes de objetos como `category_ref` no deben
compararse entre ambas serializaciones. La igualdad directa contra el respaldo
sí se verificó en memoria.

| Archivo | SHA-256 |
| --- | --- |
| `cda-result.json` | `82b2a7c6e1230d030c2b79bf6fd84a081d8aab9e05575b74cde80facdfc9a92e` |
| `followup-result.json` | `9a0873ab6f950f257e70bcf48e469026ee2e66e35a44faf2ada36b796529e1fd` |
| `slug-result.json` | `21c938c80556311189fa8503682b096268f3748d54b585bf49bcc8c4b6968141` |
| `cms-contract.json` | `98eab8cb6d88446a82bd5e7507e89e4906054a29c58a6694d030d842cf50101c` |

Participaron CMS Developer, Frontend Developer, Application Security Engineer,
Test Automation Engineer y Reality Checker según sus definiciones instaladas.
AppSec revisó los scripts antes de las consultas; QA y Frontend contrastaron los
resultados efectivos. Reality Checker: **PASS del contenido CDA con `es-co` y de
la ausencia publicada; FAIL de compatibilidad del adaptador actual; NO-GO para
activar el modelo** hasta corregir y verificar los dos contratos locales.
MAPI fresca sigue **BLOCKED 401**.

En el repositorio solo se actualiza este informe. No hubo escrituras CMS,
aprobación, publicaciones, cambios Vercel, commits, pushes ni deployments. Se
preservaron los cambios locales previos y el modelo permanece deshabilitado.

## Verificación CDA inicial — bloqueo histórico por credencial ausente, resuelto

Comprobación del 13 de noviembre de 2026. Se siguió el punto de parada solicitado:
`STORYBLOK_PREVIEW_TOKEN` no está disponible en la configuración efectiva local
del servidor comprobada. No se ejecutaron consultas CDA, MAPI ni Vercel.
Esta comprobación no determina la disponibilidad de la variable en otros procesos
o entornos remotos.

### Evidencia y alcance

CMS Developer cargó el entorno mediante `@next/env`, con precedencia de producción
y logger silencioso, en un proceso efímero. Se comprobaron existencia y valor no
vacío, sin imprimir ni almacenar el valor. Resultado sanitizado:

```json
{
  "checkedVariable": "STORYBLOK_PREVIEW_TOKEN",
  "present": false,
  "nonEmpty": false,
  "available": false,
  "sources": [],
  "result": "BLOCKED_MISSING_LOCAL_PREVIEW_TOKEN",
  "httpRequests": 0,
  "mcpRequests": 0
}
```

Evidencia local temporal: `/tmp/cda-draft-live-preflight/cms-token-presence.json`,
SHA-256 `a7311b3e6b8d786a0446a61b38146e490e2f5c6a93cbc2701b2849d3284f1f70`.
Directorio con permisos `0700`, archivo `0600`. El resumen anterior conserva el
resultado si se elimina `/tmp`; no contiene credenciales ni cuerpos editoriales.

| Requisito | Resultado de esta comprobación |
| --- | --- |
| Token privado disponible en servidor local | **BLOCKED**: ausente en el entorno efectivo comprobado |
| Capacidad Preview del token | **NOT RUN** |
| CDA draft EN predeterminado y ES `es_co` por UUID | **NOT RUN** |
| Comparación de textos aprobados, identidad y campos compartidos | **NOT RUN** |
| Contraste con claves MAPI nativas y detección de fallback inglés | **NOT RUN** |
| Nueva consulta `version=published` para verificar aislamiento | **NOT RUN**; se respetó la parada anterior a cualquier consulta |
| Diferencias entre CDA real y fixtures | **No determinadas**: no se obtuvo respuesta real |
| Compatibilidad real del adaptador con el ensayo | **Pendiente**, sin ajustes de código justificados |

Frontend Developer y Application Security Engineer revisaron únicamente el
contrato local: consulta por UUID con `find_by=uuid`; EN omite `language`, ES usa
`es_co`; draft exige el token privado y `cache:"no-store"`. No se añade
`fallback_lang` ni se permite reemplazar versión/token desde los parámetros.
El helper valida UUID de respuesta e ID numérico positivo; la comprobación real
pendiente debe exigir además el ID exacto `241243694889356` y el UUID
`7693c6a8-5b9b-470b-9f93-15f1d867eda5`.
La revisión estática no demuestra el contrato remoto ni la ausencia de fallback.

### Provisión privada necesaria y reanudación

El titular debe provisionar un token CDA autorizado con capacidad **Preview** del
espacio `1023389`, región `us`, mediante su gestor privado de secretos al proceso
del servidor o mediante edición local privada de `.env.local`, bajo el nombre
`STORYBLOK_PREVIEW_TOKEN`, conservando las demás variables. No utilizar un token
Management API ni un token público como sustituto. Se comprobó que `.env.local`
está ignorado por Git y tiene permisos `0600`.

No compartir el valor en la conversación, argumentos de comandos, historial ni
archivos versionados. No usar prefijo `NEXT_PUBLIC_` ni recuperar secretos de
Vercel. Reiniciar el servidor local, si está ejecutándose, para cargar el entorno
actualizado; mantener el modelo deshabilitado. Basta confirmar la provisión sin
comunicar el valor para reanudar la comprobación de disponibilidad y capacidad.

Test Automation Engineer deja pendientes los GET acotados al UUID conocido:
draft EN y `es_co`, comparación exacta de Title/Intro/Content con el respaldo
revisado y las claves MAPI `__i18n__es_co`, identidad, slugs, categoría, relaciones,
`language` y fecha. `content.language:english` es un campo editorial compartido,
no el selector de localización. Verificar aprobación `false` y hash vacío sin
suponer que CDA expone el indicador MAPI `published`. La consulta publicada debe
no devolver el ensayo; un error de autenticación o transporte no acredita su
ausencia pública. Comparar la forma real con los fixtures antes de proponer una
regresión o un ajuste; comprobar aislamiento de servidor, `no-store` y ausencia
de secretos en cliente o logs. La ausencia de claves raw `__i18n__` en CDA no
constituye por sí sola un fallo.

No se repitieron unitarias, integración ni build: los resultados posteriores de
este documento pertenecen a la entrega anterior y no sustituyen CDA real.
En esta comprobación solo se actualizó el informe; se preservaron los cambios
locales anteriores. No se modificaron CMS, código, configuración, aprobación,
publicación, Vercel ni producción. El modelo continúa deshabilitado por defecto.

**Reality Checker: BLOCKED_MISSING_LOCAL_PREVIEW_TOKEN.** Revisión independiente
de la evidencia sanitizada y del contrato estático: no existe evidencia nueva
de CDA bilingüe, capacidad Preview, ausencia de fallback o aislamiento publicado.
No procede declarar compatibilidad real ni habilitar el modelo con estos datos.

## Capa editorial real en Next.js — entrega anterior, conservada como referencia

**Implementada localmente y deshabilitada por defecto.** El sitio conserva su
camino C3 mientras no exista una activación explícita. No se modificaron Storyblok,
Vercel, sus variables ni producción; no hay commits, pushes o deployments.
El borrador de ensayo no está publicado ni aprobado y no se usa como artículo
público. No se activó ninguna aprobación editorial.

Base: HEAD y `main` siguen en C3
`4f316fbd61916f6388ed2f179a2f14c8afea87d0`; rama
`feat/storyblok-field-translation-pilot-20261113`. Los cambios funcionales son
locales y revisables. Se preservaron los 14 archivos anteriores del piloto y el
build anterior fuera del árbol; solo este informe evoluciona entre esos archivos.

### Archivos de esta entrega

| Archivo | Cambio |
| --- | --- |
| `lib/editorial-catalog.ts` — nuevo | Dominio puro: compromiso editorial, catálogo, colisiones, proyección de categorías/URLs y caché comprobable |
| `lib/editorial-server.ts` — nuevo | Adaptador exclusivo de servidor, catálogo publicado, render por solicitud y consultas ES en lotes de cuatro |
| `lib/storyblok-data.ts` | Reutiliza el transporte existente; añade consulta por UUID, paginación publicada sin filtro previo y wrappers con gate |
| `utils/types.ts` | Campos compartidos/localizados opcionales y metadata de proyección propia de la aplicación |
| `src/app/[[...slug]]/page.tsx` | Detalle/metadata/selector consumen URLs del catálogo cuando existe proyección |
| `src/app/sitemap.ts` | Sustituye solo las entradas de artículos por la proyección validada; conserva categorías y casos de estudio |
| `components/StoryCard.tsx` | Prioriza href editorial validado; no adivina el slug de una proyección y rechaza destinos malformados |
| `tests/editorial-catalog.test.mjs` — nuevo | 47 casos sobre modelo, transporte, aislamiento, URLs, hash, categorías, errores y caché |
| `tests/integration/editorial-fixtures.js` — nuevo | Respuestas CDA sintéticas sin claves raw ni `published:true` inventado; upstream solo de pruebas |
| `tests/integration/editorial.mjs` — nuevo | Build aislado y pruebas reales de Next HTTP/Chromium con datos sintéticos |
| `docs/slug-es-integrated-pilot.md` | Este informe, condiciones y evidencia |

No hay cambios de dependencias, lock, configuración Next, diseño visual,
formularios ni biblioteca de idiomas. Los prototipos anteriores siguen aislados:
la aplicación no los importa.

### Arquitectura implementada

El adaptador obtiene por CDA un inventario publicado completo, paginando por
el tamaño **raw** de cada lote antes de filtrar. Desde allí construye un único
catálogo de artículos y sus categorías legacy. Para los candidatos aprobados
consulta la representación española por UUID y valida su correspondencia.

La proyección produce `{uuid, locale, href, story, localizedUrls, categoryUuid,
categorySlug, model}`. El mismo resultado alimenta listado, detalle, categorías,
canonical/hreflang, sitemap, cards y selector de idioma. `story.editorial` es
metadata derivada por la aplicación, no una propiedad de publicación del CMS.
Las consultas legacy de detalle/listados eliminan esa propiedad de entrada;
el catálogo la construye de nuevo desde sus propias URLs validadas.

Resolución: URL localizada → entrada validada → UUID de la historia. EN conserva
`/posts/<slug nativo>` y ES usa `/es-co/posts/<slug_es>`. La representación ES
mantiene la identidad y los campos compartidos EN y solo sustituye Title, Intro
y Content por los valores localizados comprobados. El campo personalizado
`content.language` no se reescribe para simular un idioma nativo.

Un slug duplicado bloquea su adopción; una ruta ocupada por otra historia no se
sobrescribe. Adoptar una URL ES legacy exige la pareja publicada recíproca, mismo
grupo y referencias exactas. El registro ES original permanece en Storyblok;
su entrada se sustituye únicamente en la proyección para evitar duplicados
indexables. Un candidato incompleto, no aprobado o con hash obsoleto conserva
el contenido ES legacy válido, o no obtiene ruta ES si no existe alternativa.
Un catálogo ambiguo no se activa.

Las categorías se relacionan prioritariamente por UUID y pareja legacy recíproca;
`cached_url` solo conserva la compatibilidad legacy cuando falta el UUID. No se
migran las categorías ni se añade una base de datos. Las redirecciones entre
idiomas conservan los parámetros repetidos, igual que C3.

### Contratos observados y límites de la aprobación

Lecturas MCP reales de esta ejecución, exclusivamente `execute_readonly`:

- Esquema `post` 283246: diez campos, con las tres adiciones opcionales vigentes.
- Ensayo ID `241243694889356`, UUID `7693c6a8-5b9b-470b-9f93-15f1d867eda5`:
  tres claves nativas `__i18n__es_co` completas; propiedades antiguas con guion
  conservadas; `language:english`, publicación false, aprobación false y hash vacío.
- La configuración local, inspeccionada por **nombres**, no contiene
  `STORYBLOK_PREVIEW_TOKEN`. No se consultaron secretos de Vercel.

El transporte nuevo usa `stories/<UUID>?find_by=uuid`, con versión explícita.
EN omite `language` para consultar la base; ES traduce el locale público `es-co`
al parámetro nativo `es_co`. No envía `fallback_lang:"false"` como supuesto
booleano. Las consultas legacy C3 conservan su configuración cuando el gate está off.

Una representación pública debe provenir de `version=published`, tener ID/UUID
coherentes y `published_at` válido; si trae `published:false`, se rechaza.
No se fabrica `published:true`, no se exige un `unpublished_changes` de MAPI
en CDA y no se retira una publicación válida por un borrador editable posterior.
No se supone una configuración verificada de publicación individual por idioma.

CDA no devuelve las claves raw `__i18n__`. El helper editorial privado calcula
el mismo compromiso v1 desde las claves nativas **propias** `es_co`, sin aceptar
los aliases `es-co`. El catálogo público comprueba ese compromiso con los valores
EN/ES visibles, ID, UUID, slugs y categoría. Requiere aprobación boolean `true`,
hash de 64 caracteres y los tres textos completos; una casilla sola no basta.
Calcular el hash no publica, aprueba ni modifica nada.

Si CDA devuelve un fallback inglés diferente de lo revisado, el hash no coincide
y se rechaza la adopción. El hash no certifica el idioma ni el origen del campo:
un fallback exactamente idéntico al texto aprobado es indistinguible en CDA.
La revisión humana de las claves explícitas continúa siendo requisito previo.

**No se observó una respuesta CDA draft bilingüe real en esta entrega.**
Tampoco existe un artículo nuevo aprobado/publicado real que permita certificar
su adopción positiva: el ensayo continúa false/false/hash vacío. Las respuestas
CDA bilingües positivas de las pruebas son fixtures identificadas como tales.
No se reconstruyen claves raw ni estados de publicación a partir de esas respuestas.

### Activación, privacidad y caché

El gate privado es `STORYBLOK_FIELD_TRANSLATION_ENABLED === "true"`.
Su ausencia deshabilita el modelo; valores públicos `NEXT_PUBLIC_*`, query strings
o valores distintos del literal no lo activan. Además se bloquea en
`VERCEL_ENV=production` y en contexto de navegador. No se añadió ni cambió ninguna
variable persistente local o remota para activarlo.

La selección debe ser coherente durante **build y start**. Un build off conserva
el prerender C3 y debe reconstruirse antes de habilitar el modelo; cambiar solo
el entorno de un `next start` no es un procedimiento válido de activación.
En builds habilitados, `connection()` mantiene listados y sitemap por solicitud.
La enumeración de `generateStaticParams` consulta únicamente datos publicados
y no invoca APIs de solicitud durante la generación de parámetros.

Next mantiene la caché publicada por URL/opciones y tags existentes. React
comparte la proyección dentro del render; el loader compartido coalesce cargas
simultáneas y utiliza TTL cero en servidor. No mantiene un último snapshot válido
indefinido que sobreviva a errores o invalide la revalidación por tags. Se probaron
arranque frío, recuperación, expiración y errores. Las consultas ES se limitan a
lotes de cuatro, sin fan-out masivo de todos los candidatos.

Rutas públicas, listados, sitemap y parámetros estáticos consultan siempre
`published`. El catálogo no incluye drafts. El transporte UUID draft usa solo
el token privado y `no-store`; la ausencia de ese token falla antes de hacer I/O.
El circuito de preview conserva la sesión firmada y autorización previa de C3.
El renderer nuevo de traducción draft permanece sin activar hasta comprobar
su contrato privado real. No se envían tokens privados al cliente ni se crea
un endpoint nuevo de acceso a borradores.

### Validación efectiva del candidato final

Build local con el modelo **off**:
`ID4ka229mFbXqirWRrUji`, Node 24.21.0, Next.js 16.4.6.

| Comprobación | Resultado final |
| --- | --- |
| TypeScript | Exit 0 |
| ESLint sobre fuentes finales | Exit 0, cero errores y tres avisos preexistentes |
| Unitarias completas | 353/353, cero omitidas/canceladas; incluye 47 nuevas |
| Build de producción, modelo off | Exit 0 |
| Manifiesto del candidato | `--record` y `--verify` antes/después de integración correctos |
| Integración HTTP/Chromium anterior | 15/15 grupos |
| Build aislado habilitado con fixtures | Next/Turbopack + TypeScript aprobados, configuración del sitio sin cambios |
| Integración HTTP/Chromium del modelo | 4/4 grupos, incluida regresión de queries en aliases EN↔ES |
| Correspondencia clon/fuentes actuales | 123 archivos coincidentes; módulos runtime también contrastados por Reality Checker |
| URLs reales de artículos, modelo off y CDA público real | 30/30 HTTP 200 con canonical esperado |
| Sitemap real del candidato | 45 URLs únicas, exactamente las mismas del build previo; 30 artículos, dominio WWW y ensayo ausente |
| Ruta pública del ensayo | Respuesta streaming 200 con `noindex`, sin `<article>` ni valores/UUID del borrador |
| Chunks cliente finales | 20 archivos, cero coincidencias de cuatro valores privados conocidos y sus codificaciones; comprobación acotada |
| Configuración privada | `.env.local` aislado durante validación y restaurado con los mismos bytes y modo 0600 |

Las pruebas habilitadas ejercitan la misma implementación Next mediante un
upstream sintético, no CDA privado real. Incluyen detalle/listados/categorías,
canonical/hreflang/sitemap, navegación, gate off, guard de Production e inexistencia
de accesos draft anónimos. No enviaron Analytics ni correo y no hubo JavaScript
page errors. Las trazas registran cancelaciones `net::ERR_ABORTED` de prefetch/
navegación; no se presentan como cero solicitudes fallidas ni errores del CMS.

Hallazgo funcional real: la primera rama editorial perdía query strings al
redirigir. Se corrigió y la regresión comprueba ambos sentidos y parámetros
repetidos en el helper y en la URL final del navegador. Next puede emitir un
redirect de streaming con 200; el test exige `noindex`, canonical y navegación
con la query exacta, o 308 con Location correspondiente. No se modificó C3
para forzar otro estado HTTP.

Se conservaron los intentos fallidos del harness: symlinks de dependencias fuera
del root de Turbopack, raíz adicional insuficiente e instrumentación IPC que
interfería con workers del build. El ensayo final usa una copia de dependencias
ya instaladas, sin instalaciones ni cambios de configuración de la aplicación.
También se conservó la comprobación inicial que exigía 404 estricto al ensayo:
las 30 rutas ya pasaban; se verificó después la semántica documentada de
`notFound` en streaming mediante ausencia de contenido y `noindex`. No se borraron
pruebas para conseguir PASS.

### Evidencia, preservación y condiciones de Preview

Evidencia privada consolidada:
`/home/jhonattanb/Backups/portfolio-storyblok/editorial-layer-validation-20261113T122605-0500`.
Incluye fuentes previas, builds preservados, lecturas MCP proyectadas, logs
sanitizados, manifiesto del candidato, trazas/capturas y revisión independiente.
Los respaldos de las fases anteriores permanecen intactos. No es una ejecución CI.

Antes de un futuro Preview protegido:

1. Autorizar expresamente su creación; reconfirmar proyecto existente, target
   Preview y Vercel Authentication. Esta entrega no consulta ni modifica Vercel.
2. Conservar el modelo off para el candidato actualmente validado y verificar
   manifiesto, Node 24 y variables por nombre/ámbito, sin recuperar secretos.
3. Para un ensayo habilitado con el proveedor real, disponer de transporte
   privado autorizado y verificar representaciones CDA EN/ES, revisión/hash y
   publicación efectiva. No sustituir el token privado por uno público ni activar
   aprobaciones/publicar el ensayo para hacer pasar una prueba.
4. Reconstruir con la misma selección de flag en build/start solo tras aprobar
   ese alcance. No promover un build experimental a Production como alternativa
   a reconstruir y revisar su configuración.
5. Mantener las historias legacy, sus URLs y los aliases con guion hasta contar
   con otra autorización de limpieza o migración. El rollback local es desactivar
   y reconstruir, conservando los respaldos y la base C3.

Reality Checker contrastó independientemente fuentes, hashes, pruebas, trazas,
capturas, las 30 rutas reales y la conservación del sitemap. Dictamen:

- **PASS del candidato local con el modelo off.**
- **GO condicionado para preparar un Preview protegido con el modelo off**,
  después de autorización expresa y reconfirmación de SSO/configuración; no se crea aquí.
- **NO-GO para certificar CDA draft o activar el nuevo modelo con proveedor real**
  mientras faltan transporte privado y validación positiva del contrato publicado.
- **Sin GO para producción.**

La implementación local y los ensayos con fixtures no sustituyen esos contratos
reales pendientes. La pérdida de queries encontrada por Reality Checker quedó
corregida y respaldada por regresión unitaria y HTTP/navegador.

## Corrección de claves nativas — registro histórico anterior a la capa Next

**PASS de corrección y persistencia MAPI del único borrador existente.** Se
ejecutó un solo `updateStory` sobre ID `241243694889356`, UUID
`7693c6a8-5b9b-470b-9f93-15f1d867eda5`, espacio 1023389, región `us`.
No se crearon historias, modificaron esquemas, borraron propiedades ni publicaron
contenidos. El adaptador Next continúa desactivado. La siguiente comprobación
es manual en el Visual Editor, **sin otro guardado**.

### Causa confirmada y alcance

La primera operación de Codex utilizó `__i18n__es-co`. MAPI conservó esas
propiedades, pero eso no demostraba su reconocimiento como traducción nativa.
Tras la intervención manual declarada por el titular se observaron tres claves
`__i18n__es_co`, cuyo contenido eran los nombres literales de las propiedades
anteriores. También habían cambiado los campos compartidos `language` y `date`.
La comparación demuestra esos cambios, sin atribuirlos a un automatismo del editor.

| Campo | Propiedad anterior, conservada | Propiedad nativa corregida |
| --- | --- | --- |
| Title | `title__i18n__es-co` | `title__i18n__es_co` |
| Intro | `intro__i18n__es-co` | `intro__i18n__es_co` |
| Content | `content__i18n__es-co` | `content__i18n__es_co` |

Las propiedades con guion se conservan intactas para una limpieza posterior.
No se renombró el locale público, se cambiaron URLs ni se modificó Next.js.
`content.language` es un campo personalizado compartido del modelo legacy;
no es el selector nativo de traducción del Visual Editor.

### Respaldo y protección previa

Se releyó el contenido completo del borrador con metadatos seguros, verificando
ID/UUID, publicación false, aprobación false y hash vacío. No se recuperaron
`preview_token`, usuarios ni credenciales. El respaldo privado previo está en:

`/home/jhonattanb/Backups/portfolio-storyblok/slug-es-native-key-correction-20261113T120838-0500`.

Incluye las lecturas previas de CMS y del agente principal, el estado original
revisado, el body completo propuesto y las comprobaciones de restauración.
Sus **seis objetivos SHA-256 verifican**, con directorio 0700 y archivos 0600.
El respaldo fuente del ensayo anterior conserva válidos sus 46 objetivos.

SHA-256 del snapshot previo del agente principal:
`1c0a5ae1d0a8c6d4a4c6cf371c5cb4831adaa05cf318dbebbfb3bdd88ebeb69c`.

SHA-256 del body aprobado y ejecutado:
`6a950d9903d00204f572d81ab7d77c8c75989bb7329e3e68fba724489f1e2732`.

CMS Developer buscó y describió `updateStory`. Su contrato reemplaza
`story.content` completo; por eso el body se construyó por fusión de las 18
propiedades actuales. Frontend y AppSec contrastaron independientemente que
solo cambiaban los cinco valores autorizados. No se normalizó Markdown.

Inmediatamente antes de escribir se releyó el borrador y se comprobó igualdad
canónica exacta con la copia respaldada, incluidos contenido, metadatos
seleccionados, `updated_at` y `current_version_id`. La comparación pasó.
No se empleó una sobrescritura forzada. Esta comprobación no es una garantía
transaccional atómica entre GET y escritura; no se ha acreditado un bloqueo
de revisión del proveedor.

### Operación y valores restaurados

Única escritura remota de esta ejecución:

```text
execute_mutating(updateStory)
space_id: 1023389
id: 241243694889356
publish: false
force_update: false
story.content: fusión completa, 18 propiedades
```

No se enviaron cambios de nombre, slug, relaciones, release, traducción AI ni
parámetros de publicación por idioma. El mutador se ejecutó una sola vez;
las demás operaciones fueron lecturas. La respuesta se proyectó sin secretos.

| Valor corregido | Resultado persistido |
| --- | --- |
| `title__i18n__es_co` | `Caja negra — ensayo aislado` |
| `intro__i18n__es_co` | `Introducción sintética en español para el ensayo sin publicar.` |
| `content__i18n__es_co` | Markdown completo del respaldo: encabezado «Caja negra» y párrafo «Contenido sintético en español. Este borrador no está publicado.», con sus saltos de línea originales |
| `language` | `english`, confirmado por el respaldo original |
| `date` | `2026-11-13T00:00:00.000Z`, confirmado por el respaldo original |

Los tres valores ES se copiaron exactamente del respaldo revisado; no se usaron
los textos literales `title__i18n__es-co`, `intro__i18n__es-co` o
`content__i18n__es-co` como contenido editorial. Se conservaron las 18 claves,
con exactamente cinco diferencias y trece propiedades de contenido intactas.
Title, Intro y Content EN, `_uid`, categoría, slugs, identidad y relaciones
permanecen iguales. `es_translation_approved:false` y `es_approved_hash:""`.

### Persistencia y aislamiento comprobados

| Comprobación actual | Resultado |
| --- | --- |
| Relectura MAPI de CMS | PASS: 14 comprobaciones de corrección y preservación |
| Relectura MAPI independiente del agente principal | PASS: cinco cambios exactos, 18 claves, EN y aliases intactos |
| Frontend y Application Security Engineer | PASS: revisión independiente de payload y readback contra ambos respaldos |
| Identidad | ID/UUID originales conservados; no se creó otra historia |
| Estado editorial | `published:false`, ambas fechas de publicación null, aprobación false y hash vacío |
| Consulta MAPI publicada del ensayo | Cero coincidencias con `is_published:true` |
| Contenido completo y metadatos MAPI seleccionados de las 30 publicaciones | PASS: igualdad canónica y 30/30 pares SHA-256 idénticos antes/después |
| Inventario publicado | 30, sin diferencias de identidad, URLs, slugs ni relaciones; incluidos ambos originales del piloto |
| CDA `version=published` del ensayo | Cuatro 404: UUID y slug nativo, con idioma default y parámetro `es_co` |
| Control CDA publicado | 200 e identidad esperada de un artículo conocido, acreditando el espacio de la configuración pública |
| CDA draft / representación localizada | No ensayada; no se utilizaron credenciales públicas para leer drafts |
| Visual Editor después de la corrección | Pendiente de la lectura manual del titular, sin guardar |

La relectura independiente registró `updated_at:2026-11-13T17:09:51.208Z` y
`current_version_id:241255183158404`; esos fueron los únicos metadatos comparados
que cambiaron, además de los cinco valores de contenido. La historia continúa
sin publicar. Los 404 CDA acreditan ausencia publicada, no la correcta proyección
de una traducción en CDA draft.

Los GET de CDA usan exclusivamente configuración pública local existente y
`version=published`, con host y ruta fijos. Las redirecciones 301 solo aportan
el `cv` numérico del mismo host/ruta; no se guardan URLs con token ni `Location`.
El verificador usa un directorio nuevo y conserva la evidencia histórica.

### Revisión independiente, evidencia y siguiente paso

CMS Developer fue el único escritor. Frontend Developer y Application Security
Engineer revisaron la fusión y su resultado. Reality Checker contrastó
independientemente los respaldos, los cinco cambios, las 18 propiedades,
los 30 pares de hashes y la evidencia HTTPS. Su propia consulta MCP devolvió
401; no se presenta como una lectura propia exitosa. Las relecturas reales
posteriores de CMS y del agente principal sí pasaron y forman parte de la
evidencia contrastada. No se atribuye una verificación visual a las lecturas MAPI.

Dictamen: **PASS de corrección y aislamiento según la evidencia MAPI/CDA
publicada; pendiente de comprobación visual, sin GO para Preview o producción**.

Evidencia de CMS: 18 objetivos SHA-256 en su ledger y manifestación de una sola
actualización, cero creaciones, cambios de esquema, publicaciones o borrados.
La evidencia consolidada se conserva separadamente del respaldo previo sellado en:
`/home/jhonattanb/Backups/portfolio-storyblok/slug-es-native-key-correction-20261113T120838-0500-verification`.
Contiene su propio manifiesto y `SHA256SUMS`, sin alterar los seis objetivos del
respaldo previo. El artefacto CMS sellado conserva `ROOT_CHECK_PENDING` para CDA;
el resultado HTTPS posterior del agente principal acredita los cuatro 404 y el
control 200 y se archiva por separado.

No se ejecutaron pruebas build/TypeScript/ESLint/CI nuevas: dentro del repositorio
solo se actualizó este informe; código funcional, configuración y dependencias
permanecen intactos.

Siguiente comprobación manual, **sin necesidad de guardar**:

1. Recargar la historia de ensayo existente en la sesión autorizada de Storyblok.
2. Seleccionar Spanish (Colombia) en el selector nativo del editor y comprobar
   que Title, Intro y Content muestran los textos españoles completos.
3. Alternar a EN para comprobar sus textos; observar `language:english`, fecha
   restaurada y aprobación desactivada como campos compartidos.
4. No pulsar Save ni Publish. Comunicar el resultado de la lectura visual.

Permanecen pendientes la comprobación visual, CDA draft privado y cualquier
validación runtime de Next. La limpieza de las claves antiguas no está ejecutada.
No hay GO para Preview o producción, ni autorización de publicación o aprobación.
No se modificaron Next.js, Vercel, dominios, DNS ni producción; no hubo commits,
pushes ni deployments.

## Ensayo editorial inicial — registro histórico anterior a la corrección

Esta sección conserva el resultado anterior a la investigación del Visual Editor.
Sus claves con guion demostraron persistencia MAPI, no reconocimiento nativo;
la corrección actual y las claves reconocidas se describen arriba.

**PASS de persistencia editorial mediante Management API.** El titular autorizó
el cambio aditivo de esquema, una única historia sintética draft y el guardado
EN/ES exclusivamente en ella. Se ejecutaron esas operaciones y ninguna publicación.
**CDA draft privado: BLOCKED. Visual Editor en navegador: pendiente. NO-GO para
Preview o producción.** No se activó el adaptador de Next.js.

### Precondiciones y conexión MCP

El respaldo editorial de 21 objetivos SHA-256 y el payload aprobado conservaron
sus hashes. CMS Developer completó el preflight por MCP: siete campos exactos,
hash del esquema coincidente, rol admin/titular, ausencia de flags de bloqueo,
idioma `es-co` configurado, cero coincidencias de ambos slugs sintéticos,
inventario publicado de 30 idéntico al respaldo y ambos originales íntegros.

El contexto del agente principal devolvió inicialmente `401 Unauthorized` y
detuvo las escrituras. Reality Checker pudo leer el esquema dos veces; después
CMS Developer completó todas las precondiciones desde su conexión MCP oficial.
Solo entonces se permitió la secuencia autorizada. No se cambiaron cuentas,
extrajeron credenciales, crearon bypass ni reautenticaron sesiones. El 401 no
representa un fallo persistente de todos los contextos MCP.

### Operaciones realmente ejecutadas

CMS Developer fue el único escritor remoto. Cada contrato se buscó y describió
antes de usarlo; `execute_mutating` recibió el body dentro de `parameters`, según
el contrato MCP. Las respuestas se capturaron en memoria y se proyectaron sin
`preview_token`, usuarios ni otros valores sensibles.

| Operación | Ejecuciones | Resultado |
| --- | --- | --- |
| `updateComponent` mediante `execute_mutating` | 1 | Payload completo revisado; `update_content:false`; siete campos idénticos y tres adiciones |
| `createStory` mediante `execute_mutating` | 1 | Payload sintético revisado; `publish:false`, `use_default_preset:false`; una sola historia |
| `updateStory` mediante `execute_mutating` | 1 | Relectura, comprobación y fusión del contenido completo; solo tres campos ES añadidos al nuevo draft |
| Publicar, borrar, workflows o cambios en otras historias | 0 | No ejecutados |

Las lecturas efectivas incluyeron `getComponent`, `getSpace`, `getCurrentUser`,
`listStories` y `getStoryById`. QA y Reality Checker hicieron lecturas independientes
del nuevo borrador. El registro de evidencia distingue timestamps locales de un
audit log del proveedor; no se presenta como una exportación de actividades.

### Esquema antes y después

- Antes: siete campos. SHA-256 canónico:
  `dcfe1c70a43c139925b6ad4105d1f7ca3d133245d7e9fc00a4988984b8956cb2`.
- Después: exactamente diez campos. SHA-256 canónico:
  `e237bf6b1afc1fe23c6773340ac7358154a726b423ecd55e20596f92e81d54dd`.
- Las siete definiciones originales conservaron todas sus propiedades, IDs y
  posiciones. Los tres campos nuevos coinciden con la propuesta; el CMS asignó
  únicamente sus nuevos IDs. Todos son opcionales y no traducibles.
- La relectura final confirmó el mismo esquema después de los guardados.

La compatibilidad de Text/Boolean ya tiene evidencia de guardado real en este
espacio Starter. No se instaló Translatable Slugs ni se cambió el plan.

### Identidad y contenido del ensayo

| Dato | Valor comprobado |
| --- | --- |
| ID | `241243694889356` |
| UUID | `7693c6a8-5b9b-470b-9f93-15f1d867eda5` |
| Historia CMS | `posts/i18n-pilot-black-box-20261113` |
| `slug_es` | `i18n-piloto-caja-negra-20261113` |
| `language` compartido | `english` |
| `es_translation_approved` | Boolean `false` |
| `es_approved_hash` | String vacío |
| `published` | `false` |
| `published_at`, `first_published_at` | `null`, `null` |

EN y ES persisten dentro de la misma ID/UUID. El guardado ES conservó todos los
campos EN y compartidos, así como slugs, carpeta, grupo y alternates. Solo se
añadieron estas claves propias, releídas efectivamente por MAPI:

```text
title__i18n__es-co
intro__i18n__es-co
content__i18n__es-co
```

Los textos son ficticios; no proceden de los artículos publicados. No se activó
la aprobación ni se calculó un hash editorial. Las claves ya son observaciones
del CMS real, no el sufijo sintético utilizado por las fixtures anteriores.

### Publicación, Delivery API y preservación

- MAPI `listStories(is_published:true, by_ids:<ID del ensayo>)`: cero resultados.
- CDA HTTPS `version=published`: control con UUID de un artículo existente devolvió
  200 e identidad correcta, acreditando que la configuración pública corresponde
  al espacio esperado.
- Cuatro consultas publicadas del ensayo devolvieron **404**: por UUID y por slug
  nativo, cada uno en idioma default y `es-co`. No se atribuye esta prueba a MAPI.
- CDA redirigió inicialmente con 301 por `cv`. Se conservó ese resultado inicial.
  El verificador solo tomó el `cv` numérico de una redirección HTTPS al mismo host
  y ruta; reconstruyó el GET manteniendo destino, token local, idioma y
  `version=published`. No guardó `Location` ni URLs con credenciales.
- CDA draft privado: **BLOCKED**. No está provisionado localmente
  `STORYBLOK_PREVIEW_TOKEN`; no se recuperaron secretos remotos ni se usó una
  credencial pública para leer borradores. Se usó exclusivamente la configuración
  pública local existente para las consultas publicadas.
- Inventario publicado antes/después: **30**, con las mismas identidades, slugs,
  relaciones y metadatos seleccionados. Una sola historia sintética adicional
  permanece en borrador; no se afirma que el total de drafts del espacio sea uno.
- **30/30 contenidos completos y metadatos seleccionados idénticos**, comparados
  en memoria por JSON canónico y SHA-256. Los hashes privados anteriores y
  posteriores coinciden. Incluye ambos originales de Black-Box Abstraction.
  Los cuerpos de esas 30 historias no se copiaron a documentación ni logs.

### Pruebas, revisión y pendientes

| Comprobación de esta ejecución editorial | Resultado |
| --- | --- |
| Respaldo y payload aprobado | PASS: hashes originales válidos |
| Guardado/relectura del esquema | PASS: siete intactos y tres adiciones exactas |
| QA, lectura MAPI independiente del nuevo draft | PASS: 16 comprobaciones de persistencia, identidad y aislamiento |
| Regresión local integrada | PASS: 46/46 casos; distinta de las comprobaciones MAPI |
| Comparación de 30 historias completas | PASS: sin diferencias antes/después |
| Ausencia publicada MAPI y CDA | PASS: cero resultados MAPI y cuatro 404 CDA con control 200 |
| Selector/guardado visual de `es-co` en Visual Editor | PENDIENTE: no hubo sesión de navegador autorizada observable |
| Representaciones EN/ES en CDA draft privado | BLOCKED: transporte privado no disponible |
| Publicación por idioma, caché Next/Vercel e integración runtime | NO ENSAYADO; fuera de alcance |

Persistencia MAPI demuestra que el CMS conserva traducciones por campo en una
historia. No demuestra por sí sola el funcionamiento visual del selector del
editor, la proyección localizada de CDA ni publicación independiente por idioma.
No se repitieron build, TypeScript, ESLint o CI en esta ejecución editorial:
no cambió código funcional ni dependencias; sus resultados anteriores se
conservan como históricos. Tampoco se probó el adaptador en un Preview.

Application Security Engineer contrastó el esquema, la conservación EN/ES,
los hashes y el verificador HTTPS. Reality Checker verificó independientemente
el esquema, una lectura real del draft, los hashes anteriores/posteriores y C3.
Su dictamen distingue **PASS editorial MAPI**, **BLOCKED de CDA draft / pendiente
de UI**, y **NO-GO de Preview o producción**.

Los respaldos anteriores permanecen intactos. La evidencia nueva incluye ledger
de las tres operaciones, esquema posterior, respuestas proyectadas del ensayo,
30 pares de hashes sin cuerpos originales, QA independiente y resultados HTTPS.
Se conserva fuera de Git con manifiesto y hashes propios en
`/home/jhonattanb/Backups/portfolio-storyblok/slug-es-editorial-trial-20261113T112707-0500`.
CMS aporta 23 objetivos verificados en su propio `SHA256SUMS`; el manifiesto
consolidado añade QA, revisión independiente, evidencia HTTPS e informe final.

### Estado actual y siguientes verificaciones limitadas

El esquema ya tiene diez campos y el ensayo ya existe. **No repetir `createStory`
ni reaplicar el payload antiguo**: el test del esquema de siete campos describe
la línea base previa y debe fallar sobre el estado nuevo. Usar el ID/UUID existente
en futuras comprobaciones. El payload revisado se conserva sin editar como evidencia
de la autorización, no como mecanismo de sincronización permanente.

Quedan únicamente la comprobación manual del Visual Editor en sesión autorizada
y, cuando exista transporte privado apropiado, la lectura CDA draft EN/ES. No
extraer cookies, crear bypass ni consultar Vercel para recuperar secretos.
Mantener aprobación false y el borrador sin publicar. Cualquier publicación,
migración de originales, restauración/eliminación de campos o despliegue exige
otro alcance expresamente autorizado. No se ejecutaron commits, pushes ni cambios
en producción, Vercel, dominios o DNS.

## Preparación previa — registro histórico anterior a las mutaciones

El resto de este documento conserva la preparación anterior y sus decisiones en
ese momento. Las referencias a «sin mutaciones», «no creado» o «aprobación pendiente»
son históricas; el resultado actual es el ensayo autorizado descrito arriba.

**Preparación local anterior; ninguna mutación ejecutada en esa fase.** El contrato admite las tres
adiciones y la cuenta tiene rol `admin` y condición de titular del espacio.
Esto acredita los permisos configurados, sin probar una escritura ni certificar
el alcance efectivo de una operación OAuth de escritura. El ensayo remoto sigue
pendiente de autorización específica. No hay autorización de publicación, Preview
ni producción.

La integración de esta entrega es una simulación local de consumidores y caché.
No es un adaptador CDA conectado a Next.js, ni demuestra persistencia editorial
o caché efectiva de Next/Vercel. Esa parte depende del ensayo aún no autorizado.

## Preservación y fuentes reales

- Rama: `feat/storyblok-field-translation-pilot-20261113`.
- HEAD y `main`: `4f316fbd61916f6388ed2f179a2f14c8afea87d0` (C3).
- Los 124 archivos versionados de C3 siguen idénticos; no se cambia código
  funcional, dependencias, diseño ni imports de la aplicación.
- Se preservan byte por byte los ocho archivos de los dos pilotos anteriores.
  El árbol contiene esos archivos y los nuevos archivos locales sin commit.
- Lecturas del espacio 1023389 mediante Storyblok MCP: búsqueda, descripción y
  `execute_readonly`. Región `us`; región observada `us-east-1`.
- Inventario: 30 historias `post` publicadas. Los dos originales siguen
  publicados, sin cambios pendientes y con sus relaciones recíprocas.
- No se invocó `execute_mutating`, `execute_destructive`, publicación, aprobación
  de workflow, instalación ni modificación de configuración remota.

Se leyeron y utilizaron mediante delegación real las definiciones instaladas de
Software Architect, Frontend Developer, Test Automation Engineer,
Application Security Engineer y Reality Checker. El primer 401 observado por un
agente no se reprodujo en las lecturas posteriores del agente principal; no se
solicitó login ni se extrajeron credenciales.

## Esquema completo y compatibilidad

`getComponent`, ID 283246, devolvió `post.schema` completo. Última actualización
observada: `2025-10-07T18:48:52.045Z`. Son exactamente siete campos:

| Campo | Tipo efectivo | Posición | Traducible | Requerido |
| --- | --- | --- | --- | --- |
| `title` | `text` | 0 | Sí | Sí |
| `intro` | `markdown` | 1 | Sí | No declarado |
| `content` | `markdown` | 3 | Sí | No declarado |
| `image` | `multiasset`, imágenes | 4 | No declarado | false |
| `date` | `datetime` | 5 | No declarado | No declarado |
| `category_ref` | `multilink`, scope `categories` | 6 | No declarado | No declarado |
| `language` | `option`, english/spanish | 7 | No declarado | Sí |

Se conservan también los IDs de campo, opciones, orden, `link_scope`, `use_uuid`
y demás propiedades: no se normalizan valores ausentes a false en los originales.
No se rellena el hueco de posición 2 ni se reordena ningún campo.

Text y Boolean son tipos nativos admitidos por el contrato MCP y la
[referencia de tipos del proveedor](https://www.storyblok.com/docs/api/management/components/possible-field-types).
La documentación describe `translatable`, `pos`, `regex` y `max_length` en el
[objeto de campo](https://www.storyblok.com/docs/api/management/components/the-component-schema-field-object).
La comprobación no equivale a un guardado exitoso. El plan observado sigue siendo
`starter_2025`; no se requiere ni se instala Translatable Slugs.

## Diff exacto preparado, sin aplicar

El [JSON Patch de revisión](pilot-a-post-schema.patch.json) contiene una prueba
de igualdad sobre el esquema completo previo y estas tres adiciones exactas:

```json
{
  "slug_es": {
    "type": "text", "pos": 8, "required": false, "translatable": false,
    "max_length": 160, "regex": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
  },
  "es_translation_approved": {
    "type": "boolean", "pos": 9, "required": false, "translatable": false
  },
  "es_approved_hash": {
    "type": "text", "pos": 10, "required": false, "translatable": false,
    "max_length": 64, "regex": "^[a-f0-9]{64}$"
  }
}
```

El Patch es un documento de comparación; Storyblok no recibe ese JSON Patch.
El [payload completo propuesto](pilot-a-post-update.proposed.json) incluye los
siete campos originales y las tres adiciones. Solo contiene `component.schema`.
`updateComponent` reemplaza el esquema completo: enviar solo las tres adiciones
podría eliminar los campos actuales. Parámetros futuros: `space_id:1023389`,
`id:"283246"`, `update_content:false`. No renombrar el componente ni modificar
propiedades ajenas al esquema.

Se omite `default_value`: su contrato genérico es string y no se presupone una
coerción Boolean no ensayada. La historia nueva guardará `false` explícito. Un
valor ausente nunca equivale a aprobación. La aprobación requiere el booleano
literal `true` y un hash vigente. El hash vacío inicial no aprueba nada; debe
comprobarse en el ensayo cómo valida el editor un Text opcional con regex.

Precondiciones reproducibles:

- SHA-256 del esquema anterior, serializado con claves ordenadas, UTF-8,
  `ensure_ascii=false` y separadores `(',', ':')`:
  `dcfe1c70a43c139925b6ad4105d1f7ca3d133245d7e9fc00a4988984b8956cb2`.
- SHA-256 de los bytes del payload completo propuesto:
  `86e7963cfbba720d02a5a57092f44216d56d55f592ad64a7acc58e44914b178c`.
- Antes de una futura escritura, releer `post`, comparar esquema y metadatos
  relevantes y detenerse ante cualquier cambio. La comprobación local no es un
  bloqueo transaccional del proveedor; evitar edición concurrente durante el ensayo.

## Respaldo verificable fuera de Git

Directorio privado:
`/home/jhonattanb/Backups/portfolio-storyblok/slug-es-integrated-20261113T100040-0500`.

Contiene el esquema completo, contenido completo y metadatos seleccionados de
ambos originales, relaciones/slugs/IDs, inventario de 30 publicaciones,
configuración pertinente sin credenciales, resumen de permisos y cuatro
respuestas de historial. Incluye copia de los ocho archivos previos del piloto.
Son 21 objetivos verificados en `SHA256SUMS`, incluido `manifest.json`.

SHA-256 de `manifest.json`:
`6905c4450010826650a54c919a682a0b20e2fef58315679b3214d8535111e072`.

Comprobación local:

```bash
cd /home/jhonattanb/Backups/portfolio-storyblok/slug-es-integrated-20261113T100040-0500
sha256sum --check SHA256SUMS
```

Directorios 0700 y archivos 0600. No se recuperaron delivery tokens, private
tokens ni `preview_token`; tampoco se versionaron contenidos privados. El
respaldo no está cifrado y comparte disco con el proyecto.

**Límite:** los dos endpoints de versiones devolvieron cero entradas para cada
original. No se puede reconstruir un snapshot histórico publicado ni inventar
IDs de versión. Es respaldo del esquema y del estado editable observado, con
sus metadatos de publicación; no una exportación completa del espacio. Los
respaldos anteriores permanecen intactos.

## Ensayo editorial diseñado, todavía no creado

El [body de creación propuesto](pilot-a-trial-create.proposed.json) usa únicamente
contenido sintético EN y una nueva historia bajo la carpeta `posts` existente.
Los dos slugs consultados mediante `listStories` están libres en esta lectura:

- Base EN: `posts/i18n-pilot-black-box-20261113`.
- Campo ES: `i18n-piloto-caja-negra-20261113`.

La comprobación no reserva nombres. Repetirla antes de crear y comprobar también
colisiones en el catálogo futuro de `slug_es` — el campo Text no reserva un slug
nativo en Storyblok. No se usan los slugs históricos ni los IDs/UUID/grupo de los
originales. El CMS asignará la nueva identidad; registrar ID/UUID tras la lectura
de confirmación. El cálculo de aprobación solo podrá hacerse con esa identidad.

Parámetros futuros de `createStory`: `space_id:1023389`, `publish:false`,
`use_default_preset:false`; body en el JSON enlazado. `publish` es parámetro query
según `describe(createStory)`, no una propiedad del body enlazado. No incluir
release, programación ni fecha de primera publicación. No ejecutar ahora.

Secuencia del ensayo que necesitaría autorización específica:

1. Releer esquema/permisos/inventario; verificar respaldo y hashes.
2. Aplicar únicamente el payload aditivo revisado. Releer y comprobar que los
   siete campos originales siguen idénticos y los tres nuevos persisten.
3. Crear una sola historia draft con el body revisado y `publish:false`.
   Ante un timeout, buscar el slug antes de cualquier reintento para evitar duplicados.
4. Leer el draft mediante MAPI: identidad nueva, `published:false`, EN intacto,
   `slug_es` exacto, aprobación false y hash vacío/ausente según persistencia real.
5. Introducir ES sintético mediante el editor autorizado en idioma `es-co`:
   título «Caja negra — ensayo aislado», introducción y cuerpo completos. Guardar
   exclusivamente ese borrador. La primera lectura MAPI después del guardado
   identifica las claves localizadas reales; no convertir `es-co` por suposición
   en un sufijo de fixture ni fabricar claves a partir de CDA.
6. Guardados posteriores por MAPI requieren describir `updateStory`, releer y
   fusionar el contenido completo conservando las claves ajenas. Comparar hash
   previo; nunca enviar un fragmento de `story.content` que borre campos.
7. Con revisión humana del contenido explícito, calcular el compromiso con la
   nueva ID/UUID, campos EN/ES, slugs y categoría. Se puede ensayar aprobación
   true/hash y luego edición→hash inválido **solo en el borrador**, si esa operación
   está incluida expresamente en la autorización. No implica publicar ni aprobar
   mediante workflows del proveedor.
8. Comparar MAPI y CDA draft EN/ES mediante transporte privado autorizado.
   No recuperar secretos de Vercel ni usar un token público para leer drafts.
   Si no existe una credencial privada apropiada accesible de forma segura,
   detener únicamente esa validación. El MCP expuesto es Management API.
9. Confirmar que CDA `version=published` no devuelve el ensayo, que no aparece en
   el catálogo público y que las 30 publicaciones mantienen identidad/URLs.
   No publicar para hacer pasar una prueba. Conservar el borrador como evidencia;
   su eliminación requeriría otra autorización.

La configuración efectiva de publicación por idioma todavía no está acreditada.
`use_translated_stories:false`, `published_at` o un texto ES no la demuestran.
Este ensayo draft puede observar aprobación del proyecto y persistencia, pero
no demostrar publicación ni caché pública de una traducción. Esa prueba exigiría
otro alcance expresamente autorizado; aquí permanece prohibida.

## MAPI, CDA y política de traducción

MAPI permite inspeccionar los campos localizados explícitos del estado editable.
CDA devuelve representaciones de idioma y elimina las claves crudas `__i18n__`,
como documenta la [distinción CAPI/MAPI](https://www.storyblok.com/docs/tooling/cli/stories/find#--capi-filter).
Ni `language=es-co`, ni campos no vacíos, ni `fallback_lang:"false"` prueban que
exista traducción explícita. El parámetro de fallback es un código de idioma.

El adaptador futuro debe unir EN/ES **publicados** por ID/UUID y verificar que los
valores visibles coinciden con el compromiso editorial revisado. No reconstruir
claves crudas ni inventar estados de publicación. Un hash no es una firma, un
secreto ni prueba automática del idioma; CDA no permite distinguir un fallback
idéntico al texto aprobado. Un borrador posterior no debe retirar el snapshot
publicado válido. `cv` es una clave de caché, no una versión transaccional inmutable.
La [publicación conjunta o individual](https://www.storyblok.com/docs/concepts/internationalization#field-level-translation)
depende de la configuración efectiva del espacio; no se certifica aquí.

## Integración local y límite Next.js

`scripts/pilots/slug-es-integrated.mjs` conecta los evaluadores existentes con
loaders locales inyectados. Exige `sourceKind:synthetic-reviewed-snapshot`; no
acepta presentar respuestas CDA como snapshots crudos revisados. No hay red,
credenciales, dependencias nuevas ni importaciones desde la aplicación.

Se prepara y prueba:

- Paginación por tamaño/total upstream antes de filtrar por modelo o idioma.
- Un catálogo validado compartido por URL→UUID, detalle, listados, categorías,
  canonical/hreflang, cambio de idioma y sitemap sin duplicados indexables.
- Reutilización de las reglas de colisión y adopción de la pareja legacy; rechazo
  de `usableSnapshot:false`, traducción parcial, falta de aprobación o hash obsoleto.
- Categorías legacy relacionadas por UUID, grupo y alternates recíprocos.
- Caché de prueba con TTL, coalescencia, invalidación y copias defensivas.
- Arranque frío/error: fuente legacy publicada validada independiente o fallo
  controlado. No devolver indefinidamente snapshots expirados ni EN bajo URL ES.

La caché es memoria de un proceso de prueba: no acredita persistencia entre
instancias, caché CDN, revalidación Next ni aislamiento HTTP real de drafts.
Se consultaron las guías locales de la versión instalada antes de escribir código.
El futuro adaptador real deberá conectarse a `lib/storyblok-data.ts` y compartir
la proyección con detalle, cards, metadata y sitemap; queda pendiente del contrato
MAPI/CDA observado en el ensayo. No habilitarlo con una variable de producción.

## Restauración y riesgos de la mutación futura

El esquema es global: añadir campos cambia el editor de todas las historias de
tipo `post`, aunque no publique ni reescriba su contenido. Regex del editor no
sustituye validación de Next ni unicidad de URLs. Conservar la política legacy
permite mantener exactamente las dos URLs históricas durante la transición.

Reversión preferida: dejar las tres adiciones opcionales inertes, mantener el
borrador sin publicar y continuar con C3/legacy. No retirar campos ya utilizados.
Una restauración del esquema requerirá autorización específica, nuevo respaldo
del estado actual y comprobar que solo contiene las tres adiciones revisadas y
que nadie las utiliza. Ante cambios concurrentes, preparar una fusión revisada;
nunca sustituir ciegamente el esquema completo por el respaldo antiguo. No se
restauran ni se vuelven a publicar las historias originales porque no se tocan.

## Resultados efectivos y revisión independiente

| Comprobación de esta ejecución | Resultado |
| --- | --- |
| Nuevas pruebas integradas locales | 46/46, diez ejecuciones consecutivas después de la corrección |
| Suite completa, cada archivo ejecutado aisladamente | 306/306 casos, 17 archivos; cero omitidos/cancelados |
| `npm test` | Exit 0; el runner de esta sesión muestra 17/17 archivos agregados |
| TypeScript sobre el proyecto | Exit 0 |
| ESLint final | Exit 0, cero errores y tres avisos anteriores |
| Siete definiciones del esquema | Igualdad exacta con el respaldo, solo tres adiciones propuestas |
| Respaldo editorial | 21 objetivos SHA-256 comprobados |
| C3 y ocho archivos previos del piloto | Sin diferencias de contenido |
| Relectura MCP final | Esquema, inventario de 30 y ambos originales idénticos al inicio |
| Escrituras CMS, Vercel, producción, commits/pushes | Ninguna |

El runner de esta sesión agrega el resultado a nivel de fichero. Para no
atribuirle un recuento que no muestra, QA ejecutó también cada archivo directamente
y verificó con una prueba intencional fallida, fuera del repositorio, que el
runner devuelve exit 1 ante un fallo. Las 306 pruebas proceden de las ejecuciones
directas, no de interpretar 17 como 306.

Se conservaron los primeros resultados de 45 casos: 42 aprobados y tres fallos
por alternates de categoría malformados. Frontend añadió validación de array y
elemento; QA cubrió las tres regresiones y filas nulas. La ejecución final contiene
46 casos nuevos. No se presentan los intentos iniciales como aprobados.

TypeScript cubre los archivos TS/TSX configurados de C3; los nuevos módulos MJS
se comprobaron mediante sintaxis, ESLint y ejecución. No se les atribuye tipado
estático por haber pasado `tsc`. Las 30 rutas de la matriz integrada son sintéticas;
el inventario real de 30 procede separadamente de MCP. La comparación final
incluye cuerpos completos de ambos originales, pero no los de las otras 28 historias.

Comando de la nueva prueba local:

```bash
node --experimental-strip-types tests/slug-es-integrated.test.mjs
```

No se repitieron build, integración HTTP/Playwright ni CI: no cambió ningún archivo
del runtime C3 y el módulo nuevo no se importa en la aplicación. No reutilizar
el build o manifiesto de entregas anteriores como evidencia de esta integración;
sus fuentes no incluyen los nuevos archivos. Tampoco hay prueba visual de Next,
CDA draft/publicado o caché efectiva Next/Vercel en esta fase.

Archivos nuevos de esta entrega:

- `docs/slug-es-integrated-pilot.md`: este informe y protocolo.
- `docs/pilot-a-post-schema.patch.json`: diff exacto con precondición de revisión.
- `docs/pilot-a-post-update.proposed.json`: body completo propuesto, no ejecutado.
- `docs/pilot-a-trial-create.proposed.json`: body sintético de draft, no ejecutado.
- `scripts/pilots/slug-es-integrated.mjs`: integración local aislada.
- `tests/slug-es-integrated.test.mjs`: pruebas independientes de integración local.

Reality Checker verificó independientemente el respaldo, los 124 archivos de C3,
las siete definiciones, los ocho archivos previos y las pruebas directas. Su
dictamen distingue preparación local de integración real CMS/Next. La revisión
final y los logs se conservan con manifiesto propio en
`/home/jhonattanb/Backups/portfolio-storyblok/slug-es-integrated-validation-20261113T100424-0500`;
el respaldo editorial sellado de 21 objetivos no se modifica para añadir evidencia
posterior. Reality Checker confirmó el informe final sin marcadores pendientes:
PASS de preparación local, BLOCKED de ejecución remota y NO-GO de publicación.

## Operaciones y autorización

| Operación | Estado en esta entrega | Alcance futuro |
| --- | --- | --- |
| `getComponent`, `getSpace`, `getCurrentUser` | Lecturas ejecutadas | Releer inmediatamente antes de escribir |
| `getStoryById`, `listStories`, ambos endpoints de versiones | Lecturas ejecutadas | Comprobar preservación y draft nuevo |
| `describe(updateComponent/createStory)` | Contrato inspeccionado, sin invocación de escritura | Preparar la aprobación concreta |
| `updateComponent` | No ejecutada | Requiere aprobación del payload completo aditivo |
| `createStory` | No ejecutada | Requiere aprobación de un único draft y `publish:false` |
| Guardar ES/actualizar aprobación del draft | No ejecutado | Requiere autorización de esos guardados; describir contrato actualizado |
| CDA draft privado | No ejecutado | Requiere transporte privado autorizado disponible; sin secretos en Git/logs |
| Publicar, borrar, instalar apps, restaurar esquema | Prohibido | Fuera del ensayo diseñado |
| Vercel/Preview/producción/commits/pushes | Sin operaciones | Fuera de esta entrega |

**Decisión histórica de la preparación: GO técnico condicionado para comenzar únicamente el ensayo draft
diseñado**, después de aprobación específica de los payloads y de sus guardados,
relectura de permisos/esquema y disponibilidad del transporte privado necesario.
La ejecución remota queda **BLOCKED por aprobación específica pendiente**. La
publicación, migración de originales y activación del nuevo modelo en Preview o
producción son **NO-GO en esta fase**.
