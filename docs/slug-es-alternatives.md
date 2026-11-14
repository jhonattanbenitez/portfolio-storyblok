# Evaluación A/B/C: traducciones y URLs sin Translatable Slugs

Fecha: 13 de noviembre de 2026, America/Bogota.

**Recomendación: A como siguiente piloto**, porque permite una identidad editorial
y conserva exactamente los dos canonical históricos. **C es más sencilla hoy en
producción**: no conviene migrar los 15 pares solo por reducir el contador de
registros. La ventaja de A debe compensar el mantenimiento de su política de
aprobación y resolución. B no satisface la conservación exacta del canonical ES.

Esta dirección sustituye únicamente el bloqueo de la propuesta anterior basada
en la app nativa: el [piloto previo](field-level-translation-pilot.md) sigue siendo
un registro válido de que esa app no está disponible. Un campo Text propio no
es un Translatable Slug del proveedor.

Esta evaluación modifica únicamente cuatro archivos nuevos de documentación,
prototipo offline y pruebas. No modifica esquema, historias, rutas del sitio,
producción, plan, apps ni dependencias. Los cuatro archivos del piloto anterior y
los 124 archivos versionados de C3 se conservan intactos. HEAD y `main` siguen en
`4f316fbd61916f6388ed2f179a2f14c8afea87d0`, sin commits ni pushes.

## Comparación

| Criterio | A: campos + `slug_es` | B: slug común + redirects | C: historias separadas + MCP |
| --- | --- | --- | --- |
| Identidad editorial por artículo | Una | Una | Dos |
| Ambos canonical históricos con 200 | Sí | No: ES cambia de canonical | Sí |
| Complejidad inicial | Media y acotada: proyección de idiomas, validación y revisión | Media: necesita la misma política de contenido, más redirects | Baja en runtime; automatización editorial adicional |
| Mantenimiento | Campos/traducción y aprobación de un registro | Lo mismo, más aliases históricos permanentes | Sincronizar relaciones, metadatos y dos publicaciones |
| Migración | Incremental, conservando legacy | Incluye migración de URL e indexación | Sin migración de modelo |
| Reversibilidad | Alta mientras ambos legacy siguen publicados | Exige conservar reversión de redirects/canonical | Modelo actual preservado |
| App o plan adicional | No requiere Translatable Slugs/Growth | No requiere Translatable Slugs/Growth | No requiere Translatable Slugs/Growth |
| Costes restantes | Desarrollo, revisión, traducción y consumo API | Los de A y mantenimiento de redirects | Automatización, revisión, traducción/AI y consumo API |

No se presupone que traducción, desarrollo o llamadas API sean gratuitos. No se
contrató ni instaló ningún servicio. El ahorro de registros no elimina el trabajo
de traducir o revisar. Con 30 historias actuales, C es una alternativa válida si
el dolor de duplicación editorial es pequeño.

## Compatibilidad comprobada del campo nativo

Lecturas MCP actuales del espacio 1023389, región `us`, confirmaron:

- Plan `starter_2025`, región observada `us-east-1`.
- `post` tiene siete campos editoriales; `title` ya es Text nativo.
- `slug_es` todavía no existe.
- `title`, `intro` y `content` son traducibles. `language` y `category_ref` son compartidos.
- Cuota de componentes 200 disponible; añadir un campo al componente existente
  no crea otro componente. No se expuso una cuota por campo adicional.
- Translatable Slugs no está disponible. Las condiciones editoriales de campos
  tampoco están disponibles: esta propuesta no depende de ellas.
- La descripción del contrato de actualización acepta tipos nativos Text,
  Boolean y Option. Se inspeccionó la descripción, **no se ejecutó el mutador**.

Conclusión: `slug_es` es compatible con el contrato nativo y no depende del derecho
a la app de slugs. No se ha probado un guardado real, porque está prohibido en esta
fase. Antes de aplicar un cambio habrá que reconfirmar permisos y límites.

Propuesta de campos compartidos, sin cambios aplicados:

| Campo | Tipo | Política |
| --- | --- | --- |
| `slug_es` | Text | Opcional/no traducible, solo leaf, máximo 160 caracteres |
| `es_translation_approved` | Boolean | Opcional/no traducible; valor inicial false |
| `es_approved_hash` | Text | Opcional/no traducible; compromiso del contenido revisado |

La sintaxis propuesta de slug es `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Es una política del
proyecto, no una limitación general de los slugs de Storyblok. Regex y longitud
en el CMS ayudan al editor; Next repite ambas comprobaciones y verifica unicidad.
No se convierte silenciosamente a minúsculas ni se recorta, decodifica o
translitera una URL. Acentos, espacios, separadores, `%`, consultas, fragmentos y
controles se rechazan. Un segmento como `api` es válido bajo `/posts/api`: no se
introduce un registro arbitrario de palabras reservadas.

**Precaución para la implementación futura:** la actualización reemplaza
`component.schema` completo. Hay que recuperar, respaldar y fusionar el esquema,
conservando sus siete campos. La tabla anterior no es un payload para enviar
aisladamente ni una instrucción para modificar el CMS ahora.

## Resolución mínima propuesta en Next.js

Se conserva el router actual y sus prefijos. Un catálogo publicado paginado y
cacheado produce índices efímeros por identidad y por `(locale, slug)`. Es una
proyección del CMS, no otra base de datos ni un registro permanente de traducciones.

1. Recuperar todos los lotes publicados antes de filtrar. Paginar por tamaño/total
   upstream: filtrar primero por idioma podría truncar un lote mixto.
2. Obtener las representaciones EN/ES publicadas y unirlas por UUID, nunca por
   título u orden de respuesta. Se puede usar consulta por UUID con `find_by=uuid`,
   `version=published` y el idioma; un catálogo ES paginado reduce consultas por
   artículo. Respetar caché, tags y cuotas existentes.
3. Construir la proyección elegible, validando aprobación y coherencia del payload.
   `cv` es una clave de caché, no un identificador transaccional inmutable.
4. Resolver el slug ES a la identidad EN antes de pedir la historia. Consultar
   directamente el slug ES antiguo al CDN seguiría devolviendo el registro legacy.
5. Compartir las URLs resultantes entre listado, detalle, canonical, hreflang,
   sitemap y selector. No construir enlaces ES cuando falta una variante válida.

Un `slug_es` de texto no reserva una ruta nativa en Storyblok. La colisión con la
historia ES existente se resuelve en el namespace de URLs de la aplicación.
No exige instalar Translatable Slugs ni renombrar el slug real de una historia.

Las categorías pueden seguir como pares legacy: mapear referencias por UUID y
alternates válidos, no solo por `cached_url`, que puede apuntar a la categoría EN
o quedar obsoleto. El hash de revisión incluye la identidad de la categoría.

### Duplicados y transición

- Un slug inválido nunca genera una URL inventada.
- Dos candidatos con el mismo `slug_es` no se resuelven por orden ni por
  sobrescritura de Map; se bloquea su adopción y se conserva el legacy válido.
- Una URL ocupada por un artículo ajeno no puede ser robada por un candidato.
- La sustitución de ES requiere la misma identidad EN, grupo coincidente,
  exactamente un alternate publicado y recíproco en cada historia, URL histórica
  exacta y contenido elegible/aprobado.
- Un candidato incompleto, sin aprobación o con hash desactualizado conserva la
  historia ES legacy y ambos destinos de idioma legacy.
- Después de una adopción válida, las dos URLs se proyectan desde la identidad EN;
  el ES legacy no produce otra entrada indexable, aunque su historia siga intacta.

Snapshots publicados contradictorios o una misma identidad con dos rutas EN
invalidan el catálogo (`usableSnapshot:false`). Las rutas que el prototipo permite
inspeccionar en ese estado son propuestas diagnósticas: **no se activa ese catálogo**.
Un adaptador futuro debe conservar una proyección validada o usar la resolución
legacy publicada mientras exista. Hay que probar errores y arranques en frío;
un Map en memoria no garantiza por sí solo un último catálogo válido en Vercel.

## Completitud, aprobación y fallback

La aprobación es una política editorial del proyecto sobre el artículo publicado,
no una publicación independiente de idioma que el proveedor no haya acreditado.
Una casilla por sí sola queda obsoleta después de una edición.

Protocolo futuro de revisión, todavía no ejecutado:

1. Mantener `es_translation_approved=false` mientras se edita.
2. Revisar por MCP los campos ES explícitos del borrador y su mapa de claves real.
   Exigir título, introducción y cuerpo completos según el criterio del piloto.
   No suponer una conversión de `es-co` a un sufijo de claves.
3. Una persona revisa el idioma y calcula el hash de los valores EN/ES, identidad,
   slug y categoría revisados. El cálculo admite borrador y no lo vuelve público.
4. Con autorización editorial posterior, guardar aprobación/hash y publicar el
   artículo con esos campos de forma coherente. No se necesita publicar primero
   contenido sin aprobación para poder calcular el hash.
5. En runtime consumir únicamente contenido publicado y comprobar UUID,
   metadatos coherentes, aprobación y hash de los valores recibidos. Cualquier
   discrepancia excluye el candidato ES y conserva el legacy publicado.

El hash no es una firma, un secreto ni un control de permisos. Vincula la revisión
al payload visible: una edición de EN, ES, slug o categoría invalida la aprobación.
No importar las credenciales privadas de Management API al runtime público.

**Límite del proveedor:** CDA elimina las claves originales `__i18n__`. No se puede
afirmar que `language=es-co`, un texto no vacío o `fallback_lang:"false"` demuestren
ausencia de fallback. La revisión de claves explícitas ocurre antes de publicar;
el runtime solo sirve valores coincidentes con los aprobados. Si un fallback
produce exactamente el mismo texto aprobado, CDA no permite detectar ese origen.
No se promete demostrarlo ni detectar automáticamente traducciones malas.

Tampoco debe retirarse una traducción publicada solo porque haya un borrador
posterior: la prueba del payload publicado se mantiene separada del último estado
editable de MAPI. El protocolo real y sus claves/caché aún necesitan validación
con un registro de ensayo autorizado.

## Black-Box Abstraction y propuesta de piloto

URLs que A conserva sin redirección:

- `/posts/black-box-abstraction-thinking-in-boxes`
- `/es-co/posts/abstraccion-de-caja-negra-pensar-en-cajas`

El modelo sintético reutiliza la identidad EN y añade campos ES, `slug_es` y la
aprobación. Conserva una copia ficticia del par original para probar rollback.
No se copió contenido privado del CMS a las fixtures ni se modificaron los dos
originales publicados.

Para una fase futura: respaldar esquema/historias/relaciones, autorizar el cambio
aditivo de esquema, ensayar un borrador aislado y comprobar las respuestas reales.
Después, integrar una proyección pequeña en la capa editorial, catch-all, sitemap
y href de cards, sin rediseñar las vistas. Mantener los originales durante el
Preview y el cutover. Archivar/despublicar legacy requeriría otra autorización;
no se ejecuta ni se elimina ningún registro en esta evaluación.

El adaptador real debe generar canonical a la URL de cada variante, hreflang solo
para variantes válidas, un sitemap deduplicado por URL/identidad e índices de
categorías equivalentes. El selector usa esas mismas URLs, no cambia únicamente
el prefijo sobre un slug que pueda ser distinto.

### Por qué B no elimina el mantenimiento de slugs históricos

B serviría ES bajo `/es-co/posts/black-box-abstraction-thinking-in-boxes` y devolvería
308 desde la URL española histórica. El canonical y el hreflang ES pasarían a la
nueva URL. Los aliases españoles deben permanecer en configuración o metadata
después de retirar los registros legacy; el trabajo de conservarlos no desaparece.
No se garantiza que una migración de URL sea neutra en visibilidad SEO.

### Qué automatizaría C

C puede detectar la pareja por IDs/grupo, crear un borrador faltante de forma
idempotente y preparar la traducción/relaciones para revisión antes de publicar.
No debe duplicar historias por reintentos ni publicar por inferencia de idioma.
Requiere permisos privados y autorización de escritura editorial separada; no se
implementó ni ejecutó esa automatización aquí. Conserva dos registros por artículo.

## Evidencia local y límites

Agentes reales utilizados: Software Architect, Frontend Developer,
Test Automation Engineer y Reality Checker; cada uno leyó su definición instalada.
Frontend verificó configuración/esquema y describió el contrato de modificación
usando solo lecturas MCP. Las historias y el esquema permanecen intactos.

Archivos nuevos de esta evaluación:

- `scripts/pilots/slug-es-routing.mjs`: propuesta ejecutable offline, sin imports del sitio.
- `tests/fixtures/slug-es-pilot.json`: campos/IDs/contenidos ficticios.
- `tests/slug-es-pilot.test.mjs`: A/B/C, slugs, colisiones, aprobación, snapshots y SEO.
- Este documento.

El prototipo reutiliza las atestaciones normalizadas del piloto anterior para
simular un snapshot publicado con claves explícitas. No son propiedades nuevas
del SDK ni prueba de que CDA entregue esas claves. No es un adaptador listo para
conectarlo al sitio ni demuestra convivencia runtime de ambos modelos.

Resultados actuales: **102 pruebas nuevas en diez ejecuciones consecutivas**, y
**260/260 unitarias** de la suite completa; cero fallos/reintentos. ESLint:
cero errores y tres avisos existentes. TypeScript: exit 0. No se repitieron build
e integración en esta evaluación, porque no se modificó el runtime. Los resultados
del build/integración del piloto anterior no se atribuyen al nuevo adaptador.

Los casos incluyen conservación exacta de ambas URLs, búsqueda por identidad,
no ganador por orden, fallback legacy, navegación por ambos idiomas, canonical,
hreflang, sitemap y equivalencia de categorías. Las fixtures son sintéticas;
el inventario real de 30 publicaciones se comprobó separadamente por MCP.

## Decisión y reversibilidad

**GO para continuar el piloto local A; integración/Preview condicionados** a
verificar esquema aplicado con autorización, claves reales, revisión/publicación
coherentes, catálogo completo, errores/cold-start y convivencia con legacy.
El impedimento de pago del piloto anterior no afecta a un campo Text normal.
Esto no autoriza modificar Storyblok ni desplegar.

C sigue en producción mientras tanto. Para revertir la evaluación local, archivar
y verificar los cuatro archivos nuevos antes de cambiar de rama; no usar
reset/clean ni perder los cuatro archivos del piloto anterior. Un futuro rollback
editorial debe restaurar publicación/URLs legacy antes de volver a C3 si alguna
historia legacy hubiera sido retirada. B además requiere revertir sus redirects.

## Fuentes oficiales

- [Tipos nativos de campo](https://www.storyblok.com/docs/api/management/components/possible-field-types)
- [Text y Boolean](https://www.storyblok.com/docs/concepts/fields)
- [Contrato de campo](https://www.storyblok.com/docs/api/management/components/the-component-schema-field-object)
- [Consulta localizada por UUID](https://www.storyblok.com/docs/api/content-delivery/v2/stories/examples/retrieving-localized-stories-by-uuid)
- [CDA elimina claves de traducción](https://www.storyblok.com/docs/tooling/cli/stories/find/examples)
- [Caché y cv](https://www.storyblok.com/docs/concepts/caching)
