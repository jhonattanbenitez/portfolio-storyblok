# Lote bilingüe: listo para una autorización de ejecución

> Estado posterior: el titular autorizó el release definitivo sin nuevo Preview.
> El intento inicial se detuvo por HTTP 401 y posteriormente se reanudó; véase
> [estado vigente del release](bilingual-release-execution.md). El resto de
> este documento conserva la preparación y sus condiciones históricas.

13 de noviembre de 2026, America/Bogota. **15 parejas listas; 0 bloqueos de
contenido o seguridad en la preparación. GO para revisar y autorizar el lote;
publicación y activación siguen sin autorizar.** No hubo escrituras remotas,
commits, pushes ni deployments en esta entrega.

| Resultado ejecutivo | Evidencia |
| --- | --- |
| Inventario actual | 30 lecturas MAPI por ID y CDA publicada actual: 15 parejas recíprocas, 30 URLs y 15 identidades principales previstas |
| Cambios preparados | 14 guardados EN con traducciones exactas y aprobación/hash; Black-Box aprobado se reutiliza sin guardarlo; 15 publicaciones EN futuras, ninguna escritura ES ni historia nueva |
| Hashes y contenido | 15 compromisos verificados con el helper; preimágenes completas y propuestas privadas; textos, fechas visibles, imágenes, categorías y relaciones preservados |
| Matriz local | 2/2 escenarios HTTP/Chromium PASS: 30 URLs por escenario, 45 URLs exactas de sitemap, 15 cambios de idioma y dos categorías; 15 identidades consolidadas y 22 en transición mixta |
| Verificación de código | TypeScript y ESLint PASS; 157 unitarias iniciales, 27 del planificador final y 83 del contrato de activación PASS; ejecuciones solapadas, no sumarlas como casos distintos |
| Build | `Ih_aMS7SDZeU5VILd3DLq`, un build exitoso compartido por la matriz; dos intentos fallidos y un fallo de selector conservados, HTTP reanudado sin recompilar |
| Seguridad | Sin consultas draft desde la app simulada, Analytics o errores JavaScript; límites de archivos privados y gates de concurrencia/reanudación verificados |

**La única autorización posterior debe aceptar dos decisiones editoriales:**
20 campos nativos existentes en siete EN se sustituirían por los textos exactos
de su ES legacy, conservando sus valores anteriores en los respaldos. Además,
las 15 páginas ES compartirían `first_published_at`/`updated_at` de EN para
JSON-LD y sitemap: 11 diferencias de primera publicación superan un día y la
mayor ronda 225 días. Las fechas editoriales visibles permanecen idénticas.
No debe extenderse automáticamente a las otras parejas la aceptación previa de
Black-Box. `approval-conditions.json` fija ambas condiciones para el lote.

Manifiesto de datos:
`58bf6e75ccb8d9e271dbdc0c0b2e07785224ad69caf4019c96035ae0832b881b`.
Los 15 hashes y el detalle por pareja están en `executive-review.json` y
`prepared-final/migration-manifest.json` del respaldo privado indicado al cierre.

El resultado positivo de publicación consolidada real se comprobará con
Black-Box como canario antes de publicar las otras 14. La QA actual usa una
publicación futura simulada, imágenes de sustitución y fuente local; no
certifica el Preview ON de Vercel ni producción. Los 18 `ERR_ABORTED` por
escenario corresponden a navegación/prefetch y se conservan en los diagnósticos.
El build local de QA contiene fixtures y **no debe desplegarse**. Preview y
Production se construirán desde el candidato revisado y la CDA publicada real,
después del gate de las 15 publicaciones.

## Contrato de ejecución

`scripts/pilots/bilingual-batch.mjs` es un preparador y planificador **sin red**.
Genera el manifiesto, payloads y ledger privado, pero no llama a Storyblok ni a
Vercel. Un único operador CMS autorizado consume sus acciones secuencialmente.
Los archivos reales permanecen fuera de Git y de cualquier directorio servido,
con directorios `0700` y archivos `0600`.

```bash
node --experimental-strip-types scripts/pilots/bilingual-batch.mjs verify --manifest "$BATCH_DIR/migration-manifest.json"
node --experimental-strip-types scripts/pilots/bilingual-batch.mjs next-action --manifest "$BATCH_DIR/migration-manifest.json" --ledger "$LEDGER_FILE"
```

`BATCH_DIR` y `LEDGER_FILE` designan el lote sellado y su último ledger válido.
Para cada acción, `begin --manifest M --ledger L --fresh F --output NUEVO_DIR
--authorized yes --acknowledge-replacements yes` exige lecturas MAPI recientes
`F={en,es}`, verifica contenido completo, identidad, `updated_at` y versión, y
escribe el ledger de intento **antes** de entregar `action-private.json`.
El operador solo puede usar `--authorized yes` tras comprobar la autorización
ligada al manifiesto y a `approval-conditions.json`, incluidos los timestamps.
Ejecuta esa única operación y guarda evidencia MAPI/CDA; después,
`record --manifest M --ledger LEDGER_INTENTO --action ID --evidence E
--out-ledger NUEVO_LEDGER` registra el resultado verificado. Las rutas nuevas
no sobrescriben evidencia anterior. Nunca copiar cuerpos editoriales a stdout.

Un resultado `failed`, `uncertain` o sin recibo produce `reconcile-readonly`:
releer primero; no repetir automáticamente la escritura. La verificación de una
acción ya aplicada permite continuar sin duplicarla. Cualquier divergencia
inesperada o evidencia incompleta detiene el lote y las etapas posteriores.

## Puertas del lote, en orden

| Puerta | Condición obligatoria y operación futura |
| --- | --- |
| 1. Congelar propuesta | Manifiesto íntegro; 15 parejas por grupo/alternates/ID/UUID; 30 URLs exactas; hashes de textos y preimágenes. Resolver cualquier bloqueo, sin normalizar fechas, imágenes o Markdown. |
| 2. Autorizar una vez | Aprobación humana ligada al `manifestId` y `approval-conditions.json`: 20 sustituciones nativas, timestamps SEO EN para las 15 páginas ES, 14 guardados aprobados, 15 publicaciones EN y patch concreto. Si se incluye activación definitiva, esa misma autorización debe cubrir commits/pushes, Preview, flag ON en build/runtime de Production y rollback condicional OFF. |
| 3. Guardar 14 drafts | Para cada EN: precheck inmediato y ledger; contenido completo fusionado, `publish:false`, `force_update:false`. MAPI posterior, CDA draft EN/ES y CDA publicada anterior deben coincidir con el manifiesto. Black-Box se omite como guardado y se verifica vigente. |
| 4. Publicar 15 EN | Solo después de verificar todos los guardados. Precheck inmediato por pareja; una publicación EN por identidad y recibo MAPI/CDA publicada EN/ES con aprobación/hash válidos. No publicar ni modificar ES legacy. Black-Box se publica primero como canario; un fallo bloquea el resto. |
| 5. Cerrar catálogo | `verify-published --manifest M --ledger L --evidence E` exige las 15 publicaciones verificadas y evidencia CDA actual agregada: 15 identidades principales, 30 rutas históricas, textos/hash/aprobación exactos, categorías conservadas y ES legacy intactas. Solo habilita preparar Preview; HTML, navegación y sitemap reales se verifican en la puerta 7. |
| 6. Preparar activación | Aplicar al candidato futuro únicamente el patch revisado descrito abajo, con preimagen/hash exactos. Node 24.x y Next 16.4.6; `SITE_URL=https://www.jhonattan.dev`, Analytics OFF y `STORYBLOK_FIELD_TRANSLATION_ENABLED=true` idéntico en build/runtime del Preview mediante opciones de ese deployment. No activar Production todavía. |
| 7. Preview protegido | Un Preview ON del proyecto existente `portfolio-nextjs`, equipo `jhonattanbenitezs-projects`; conservar Vercel Authentication. Validar HTTPS y navegador autorizado: 30 artículos, sitemap de 45 URLs, idiomas, categorías, controles privados y ausencia de Analytics. El Preview OFF anterior no acredita este candidato ON. |
| 8. Activación final | Solo con todas las puertas anteriores y autorización explícita: candidato reproducible/versionado y `main` remoto sin cambios inesperados. Reconfirmar despliegue automático de esa rama y habilitar el único flag no secreto en Production, build/runtime ON, antes del push autorizado. Verificar el deployment resultante; no crear además otro deployment CLI ni promover ciegamente un Preview con variables de Preview. No se declara GO de producción ahora. |
| 9. Vigilancia y rollback | Comprobar URLs, sitemap, navegación, errores y aislamiento. Si falla la activación, detener el avance y ejecutar únicamente el rollback OFF previamente autorizado; conservar evidencia del fallo. |

## Patch de activación y rollback

El código actual bloquea el modelo en Production incluso con el flag `true`.
Se preparó **solo como artefacto privado** `devops/production-opt-in.patch`
(SHA-256 `73412d57e2770aa96abc32174fc1754e78735ba82c2ab90c54d84374ca799a3f`).
Elimina esa exclusión y conserva servidor exclusivamente, opt-in estricto y
default OFF; no crea otra variable. La preimagen del módulo es
`1ce2427d0e6035fcbce73cea9edaced670d9f233c65ad64f29884d0eed6b8847`.
Diez casos aislados del predicado pasan, incluido Production sin flag OFF y
navegador siempre OFF. La matriz validó una copia aislada con el cambio y el
flag ON en build/runtime; el runtime del repositorio conserva el guard original.

`devops/test-contract.patch` actualiza las dos pruebas unitarias del antiguo
bloqueo absoluto y conserva el caso de integración legacy con flag explícito
OFF. El combinado `devops/activation-ready.patch` tiene SHA-256
`88b467349874db7c509e06fca5b233ffb120b725919ce7fcf3ade1f403ec18ff`;
su aplicación en seco y sintaxis de los tres tests pasan. No elimina aserciones
de contenido, SEO, consentimiento o autorización. Las 83 unitarias del candidato
se ejecutaron en esa copia con el contrato revisado, sin otro build. Su resultado
no certifica el runtime real de Vercel.

Rollback del modelo: mantener/reinstalar un artefacto conocido OFF —referencia
histórica C3 `4f316fbd`, deployment `dpl_FFK3nDCcSEEqmCsRxRJZJTpmxwQo`— o
reconstruir el candidato con flag OFF **en build y runtime**. El cambio de
variable runtime aislado no basta para un build seleccionado con ON. Las ES
legacy preservadas mantienen sus URLs; no despublicarlas ni borrarlas. El
rollback OFF no revierte el contenido CMS ni su `updated_at`: una restauración
de EN publicada exigiría nueva comparación de concurrencia y republicación
expresamente autorizada; nunca restaurar un backup completo a ciegas.

No se consultó Vercel en esta preparación. Los IDs y protecciones anteriores
son referencias documentales que deben reconfirmarse antes del despliegue.
Los fallos del harness —captura vacía, mock de fuentes incompatible con
Turbopack y selector H1 ambiguo— conservan su evidencia; se corrigieron sin
cambiar contenido ni código funcional. La lectura de listado MAPI dio 401,
pero se completó el inventario mediante 30 GET directos actuales, sin recuperar
credenciales ni reintentar escrituras.

La publicación puede cambiar de nuevo el `updated_at` público EN. El rollback
OFF recupera las rutas/textos legacy, pero no restaura automáticamente ese
metadato CMS. No se ocultó este comportamiento con cambios de código.

## Respaldo sellado y preservación

Respaldo privado persistente:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-batch-prepared-20261114T000209Z`.
Sus 422 archivos inventariados se cotejaron por SHA-256, con directorios `0700`
y archivos `0600`. SHA-256 de `archive-manifest.json`:
`b70fe10a8221f8d998931bb9dc192103bebedd683ba42631f166f53e61af404b`.
El respaldo conserva preimágenes actuales, propuestas, ledger vacío, evidencia
de fallos y pruebas, y una instantánea de 153 fuentes; no contiene credenciales.
Está en el mismo disco y no está cifrado. Un enlace sintético interno usado en
pruebas de seguridad se archivó desreferenciado; su procedencia está registrada.

`review-package.json` vincula fuentes y evidencias mediante SHA-256
`5d6c5538eb7bba26de0ac6ce7a42ed394142184c42b7622540c49236b366b298`;
`approval-conditions.json` tiene SHA-256
`5994a3ae89ce007d39a063ff73b4d89b02e8199c726eaab557b57323bdfbb297`.
La copia archivada de este informe precede únicamente a este cierre de respaldo
y al dictamen final; no se reescribe el archivo histórico para añadirlos.

Se preservaron las 140 fuentes de la línea base: 139 idénticas y el informe
anterior del piloto con un enlace añadido a este documento. Los cinco archivos
nuevos son este informe, el planificador, su suite unitaria y los dos archivos
de integración por lotes. No se modificaron código funcional, package ni lock
respecto al inicio de esta preparación. HEAD sigue en C3, en la rama del piloto.

**Reality Checker: PASS de preparación técnica y respaldo.** Contrastó de forma
independiente los 422 hashes/tamaños y permisos, las 153 fuentes, los siete
vínculos de evidencia y el ID canónico del manifiesto. Confirmó los gates de
reanudación, el guard Production original y las dos decisiones editoriales
pendientes. Dictamen: **GO únicamente para solicitar una autorización global
ligada al paquete sellado**. No acredita publicación consolidada real, Preview
HTTPS ON ni producción. Ninguna operación remota se ejecutó en esta preparación.
