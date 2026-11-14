# Release bilingüe Production — recuperación OFF verificada; activación bloqueada

## Última ejecución autorizada: recuperación PASS, activación NO-GO

| Resultado ejecutivo | Estado observado |
| --- | --- |
| Main local | Integrado por fast-forward en `8a22062faaf86679e0746a90da87db2387f7d4c4`; código e índice limpios, 17 archivos sin seguimiento preservados |
| Origin/main | Permanece en C3 `4f316fbd61916f6388ed2f179a2f14c8afea87d0`; el único push falló antes de actualizar GitHub |
| Deployment nuevo | Ninguno; no se creó Preview, deployment CLI, promoción ni segundo intento de push |
| Production conservada | `dpl_FFK3nDCcSEEqmCsRxRJZJTpmxwQo`, READY, C3, Node 24.x |
| Modelo actual | Legacy/OFF: el único flag nuevo de Production se creó en true y se revirtió a false; otras nueve variables intactas |
| Recuperación pública | 30/30 URLs HTTP 200, contenido nativo ES correcto, idiomas, categorías, imágenes y redirecciones PASS |
| Sitemap/SEO | 45 URLs únicas, 30 artículos, canonical y hreflang correctos; sin ensayo indexable ni duplicados |
| CMS | 15 historias EN bilingües publicadas con hash válido; 15 ES legacy intactas; cero escrituras CMS en esta ejecución |
| Reality Checker | RECOVERY PASS / ROLLOUT NO-GO; no se acredita adopción de 15 identidades por la aplicación actual OFF |

El flag se configuró exclusivamente para Production, sin branch override; su
lectura posterior confirmó true y ausencia de deployments inesperados antes
del push. El único `git push origin main` terminó con exit 128:
`could not read Username for 'https://github.com': No such device or address`.
Este entorno carece de credential helper y Askpass, no tiene gh instalado ni
terminal interactivo para esa autenticación. La lectura pública de main en el
preflight no había acreditado autenticación de escritura. No se abrieron
credenciales ni se modificó su configuración, y no se reintentó el push.

Se ejecutó el rollback autorizado **solo de configuración, true a false**,
conservando el mismo flag y las otras nueve variables. C3 nunca fue sustituido;
no hacía falta promoverlo o reconstruirlo. La QA pública posterior confirmó las
30 rutas legacy, 45 entradas de sitemap, selector de idiomas, dos categorías,
imágenes reales, cuatro negativas del ensayo, Analytics OFF tras consentimiento
y recarga, y cero errores críticos HTTP/JavaScript/consola. Se conservaron 39
abortos de navegación/prefetch; 11 EN mantienen metadata anterior por caché,
sin cambiar fechas editoriales visibles ni URLs.

### Dos bloqueos reales antes de activar ON

1. Autenticación GitHub HTTPS disponible para el entorno de ejecución.
2. Decisión editorial sobre **19 valores en siete ES**. C3 consulta las historias
   ES legacy con language=es-co y muestra sus campos nativos; el manifiesto
   consolidado utiliza sus campos base. Las 15 respuestas CDA nativas actuales
   coinciden con las preimágenes originales, pero siete tienen 19 valores
   distintos del contenido consolidado aprobado. Son diferencias previas,
   adicionales a los 20 reemplazos nativos EN ya autorizados. ON cambiaría esos
   valores visibles: debe aceptarse expresamente ese cambio o revisarse el
   contenido consolidado antes de activarlo. No se cambió el manifiesto ni se
   reescribieron traducciones. La QA ON anterior validaba la base aprobada;
   no había acreditado equivalencia con estos textos nativos visibles de C3.

La recuperación se validó contra las representaciones CDA nativas reales de
las ES legacy, contrastadas con sus claves archivadas; se mantuvo intacto el
harness ON. Cinco enlaces de categoría solo añaden el prefijo es-co y prep=true
propios del transporte CDA, con identidad y demás campos conservados.

Resumen de recuperación QA SHA-256:
`965cb26a90458cf9d616d401b3bfeb869a549fccc646b2c34b1daaa4b5cc7f1a`.
Dictamen independiente final SHA-256:
`3c274fa479ac25031c68c29db164cc2ff235a609ed64c208133c4ccc5f9ae976`.
Comparación de los 19 campos entre ambas respuestas publicadas reales SHA-256:
`524c2f520fcb363a7e8002acd8c22e4f2665917bdf2a3f7b43bd8b8347001a85`.

El flag de Production **ya existe con valor false** tras el rollback; no debe
intentarse crearlo otra vez en una eventual reanudación.
Respaldo privado persistente de la ejecución y recuperación:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-production-off-recovered-20261114T011558Z`.
61 archivos verificados por SHA-256, directorios `0700` y archivos `0600`, sin
credenciales. Manifiesto SHA-256
`bfdafbb9269c003ed31467dfeced8c381d3087062660118cbea34e8928489507`.
Incluye recibos de flag/push/rollback, ambas representaciones publicadas,
comparación editorial, QA real y dictamen independiente. El informe archivado
precede a esta referencia final del respaldo. Los respaldos previos se conservan.

## Historial de la validación del commit manual

## Estado vigente tras el commit manual

**GO técnico para integrar `8a22062faaf86679e0746a90da87db2387f7d4c4`.**
Su padre es C3 `4f316fbd61916f6388ed2f179a2f14c8afea87d0`; árbol Git
`6131b5c3166da1c5be2fb9037965a0257f6fe1dc`. Los 18 archivos y sus 248.290 bytes
coinciden exactamente con la selección aprobada. Main local y remoto siguen
en C3, por lo que el candidato admite integración fast-forward si esas
referencias permanecen vigentes en la próxima ejecución.

El patch sellado `devops/activation-ready.patch`, SHA-256
`88b467349874db7c509e06fca5b233ffb120b725919ce7fcf3ade1f403ec18ff`, **ya está
incluido íntegramente en ese commit**, junto con estas pruebas asociadas:

- `lib/editorial-catalog.ts`.
- `tests/editorial-catalog.test.mjs`.
- `tests/blackbox-migration.test.mjs`.
- `tests/integration/editorial.mjs`.

Se verificaron las cuatro preimágenes/resultados contra el patch sellado y su
aplicación inversa en seco. El catálogo pasa de la preimagen `1ce2427d…` al
resultado `94adad31…`. No se reaplicó el patch ni se inventaron cambios para
crear un segundo commit: **archivos del segundo commit = ninguno; índice
vacío**. El default OFF, servidor exclusivo y opt-in privado con valor exacto
`STORYBLOK_FIELD_TRANSLATION_ENABLED=true` pasan 10/10 casos, incluido Production.

| Validación nueva del commit | Resultado |
| --- | --- |
| Fuente limpia | 137 archivos de git archive HEAD exactos; sin untracked, env o cachés previos |
| TypeScript | PASS |
| ESLint | 0 errores, 3 advertencias preexistentes |
| Unitarias | 219/219 PASS, sin skips; las 18 regresiones de migración incluidas |
| Build real ON | PASS, `50VhCJpV3BZmBBCJXRtL4`, Node 24.21.0, Next 16.4.6 |
| Entorno del build | Production y modelo ON solo en proceso hijo; Analytics OFF; CDA publicada real, sin mocks ni archivos privados copiados |
| Seguridad del commit | 18 hashes idénticos al candidato revisado por AppSec; sin credenciales, respaldos, snapshots o ledgers privados |
| Reality Checker | GO técnico de integración; no certifica un deployment nuevo |

Los tres archivos fixtures JS del commit son harnesses sintéticos de pruebas;
no contienen snapshots editoriales privados. `tests/` permanece excluido del
deployment. Los 17 archivos históricos sin seguimiento se preservaron y no
entran en el commit. Las 30 rutas HTTP no se repitieron: su QA real anterior
corresponde exactamente a los mismos 18 blobs ahora versionados.

Resumen QA nuevo SHA-256:
`74ec86de56d832221dab99adbeeb52b952a1d483b6a45a259f02c4e55e2a43b9`.
Dictamen independiente nuevo SHA-256:
`be5c8f48c7416d609c2e1c476f3eb0f399857ebc188fc64c76ceffababc13ea2`.

Respaldo privado persistente de esta validación:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-manual-commit-validated-20261114T004648Z`.
22 archivos verificados por SHA-256, con directorios `0700` y archivos `0600`;
sin builds, dependencias o credenciales. Manifiesto SHA-256
`2e13f3dc798fe2e727df536e99ada377237d698853d100acc82a0d883540f2e9`.
El informe archivado precede a este cierre documental.

**No se repitió ninguna operación CMS, creó commit, integró main, hizo push,
creó Preview/deployment ni modificó variable persistente.** El antiguo bloqueo
de crear el commit queda superado por el commit manual; no se intentó otro.
La siguiente fase requiere preflight remoto vigente, flag ON coherente en
build/runtime, integración/push y validación pública completa después de READY.
Estas operaciones quedaron expresamente fuera del alcance de esta ejecución.

## Historial anterior al commit manual

## Estado vigente de la reanudación

**Resultado: CMS y QA local PASS; release BLOCKED por revisión automática de
`git commit`.** La autenticación MAPI ya funciona. No hubo rollback.

| Cierre efectivo | Resultado |
| --- | --- |
| CMS | 14 guardados EN, 15 publicaciones EN, 15 ES legacy intactas; Black-Box canario sin resave |
| CDA publicada real | PASS: 30 URLs, 15 identidades, textos/hashes/categorías exactos |
| QA real local | 219/219 unitarias, TypeScript, ESLint sin errores; build limpio ON y navegador 30 rutas / sitemap 45 |
| Git | 18 archivos en staging exactos al candidato probado; commit no creado, HEAD/main en C3 |
| Production observado | `dpl_FFK3nDCcSEEqmCsRxRJZJTpmxwQo`, READY, C3, Node 24.x; lectura final `2026-11-14T00:35:01Z` |
| Activación | Modelo de Production sigue legacy/OFF; sin cambios de flag, pushes o deployments |
| Reality Checker | CMS, QA e índice PASS; activación/QA pública del candidato todavía no certificadas |

La revisión automática rechazó el commit dos veces. Primero citó la prohibición
de fases anteriores; se verificó de nuevo el adjunto autorizado, su SHA y los
permisos expresos de commit/push, y se presentó un comando directo acotado. El
segundo rechazo indicó que no reconoce el adjunto como autorización directa
inequívoca en el contexto confiable. Se detuvo Git sin un tercer intento ni
procedimientos alternativos. El staging previamente aprobado se conservó.
Evidencia: `devops/commit-blocked.json` del directorio privado de ejecución.

Para desbloquear la herramienta se necesita confirmación textual directa del
titular en la conversación para commit, integración/push único a main, flag ON
y despliegue Production con rollback OFF condicional. No falta autorización
editorial y no deben repetirse los guardados o publicaciones completados.

La reanudación utilizará el ledger final de 29 operaciones y sus estados MAPI
posteriores, comprobará su vigencia en lectura, los 18 hashes del índice y main
remoto antes del commit/push. No comparar los drafts publicados actuales con
las preimágenes anteriores para intentar ejecutar el lote otra vez. Tras READY
se ejecutarán las 30 comprobaciones públicas completas desde cero, sin usar
resultados locales como sustitutos ni crear un Preview.

La conexión oficial MAPI volvió a responder. Las 30 historias actuales coinciden
exactamente con las preimágenes selladas. DevOps reconfirmó proyecto, equipo,
main C3, Production C3 READY, variables privadas por metadatos y rollback READY.
Reality Checker contrastó el preflight y la autorización de Production directo.

**CMS completo: 14/14 guardados EN y 15/15 publicaciones verificados,
0 escrituras ES.** Black-Box no se volvió a guardar y pasó como canario.
El gate publicado global confirma 38 historias, 15 representaciones españolas,
30 URLs, 15 identidades principales y cero diagnósticos. El coordinador repitió
`verify-published` sobre los recibos reales: PASS. Su nombre histórico
`PREVIEW_CANDIDATE_ONLY` se conserva; la autorización posterior del titular
permite continuar directamente a Production tras QA, sin nuevo Preview.
Cada guardado tiene precheck inmediato, recibo MAPI, CDA draft EN/ES y
comprobación de publicaciones anteriores intactas. El patch revisado ya está
aplicado; los 18 archivos quedaron en staging. No se creó commit ni se cambió
el flag remoto, hizo push o deployment.
Evidencia de esta ejecución: `/tmp/bilingual-release-cms-retry-wihraefb`;
último ledger verificado `actions/29-publish-26846271/ledger-verified.json`,
SHA-256 `7e2780e796ef48451d222019d903711a7361f6d686eff427e4061f8050ee3a52`.
CDA publicada real `final/published-batch.json`, SHA-256
`156a4af6d3619cddb6ca39f4fb5c19faf61b67bf31894842c6c458c680463ef1`.

Recibos CMS archivados de forma persistente fuera de Git:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-batch-executed-20261114T002513Z`.
342 archivos cotejados; `archive-manifest.json` SHA-256
`0ff50e011d8c73706d3bf96f7000105f012455c17b54035c82079eac3b60d61e`.
Incluye la autorización, las 29 operaciones y sus recibos, los estados finales
y el ledger; no contiene credenciales. Se conservan los respaldos anteriores.

### QA del candidato real: PASS

TypeScript PASS; ESLint sin errores y tres advertencias preexistentes;
219/219 unitarias, sin skips. Build limpio único `Gi0xQAq-3Pt4auNIyqx_D`,
Node `24.21.0`, Next `16.4.6`, modelo ON en build/runtime y Analytics OFF.
Se compiló C3 más los 18 archivos seleccionados, sin archivos de entorno,
credenciales copiadas, fixtures de transporte, mocks de fuentes o imágenes.

HTTP/Chromium contra ese servidor real: 30 artículos, 15 identidades/hashes,
Markdown e imágenes exactos, canonical/hreflang y timestamps EN, sitemap de
45 URLs, 15 cambios de idioma, categorías, redirecciones y escritorio/móvil.
Analytics permaneció OFF tras consentimiento concedido, recarga y navegación.
Sin errores críticos JS/HTTP ni operaciones mutantes desde el navegador.

Las primeras capturas vacías del sandbox no se contaron como PASS; se repitieron
los comandos afectados con prueba observable de ejecución. Se corrigió el
parser del reporter Node 24 sin repetir las unitarias acreditadas. Dos fallos
del harness privado se diagnosticaron y corrigieron sin cambiar la aplicación:
404 tras streaming puede responder 200 con noindex y marcador de error —guía
local Next `not-found.md:15`—; el selector H1 debía distinguir el título exacto
de los encabezados del Markdown. Se conservaron las 30 verificaciones ya
acreditadas y se reanudaron únicamente las fases pendientes, sin otro build.

Resumen QA privado `qa-summary.json`, SHA-256
`265204ef7df3569b75412cf5f8c5be2467ff1b5a6ece64e336e26170ffc874c4`.
AppSec verificó 18/18 fuentes y 30 archivos cliente compilados sin secretos
privados ni URLs autenticadas; reporte SHA-256
`45a4f4e416ed2979daead99e2d9787c0300b84166ac8ee910b8b62ab012fdd56`.
Estos resultados aún no certifican el deployment de Production. Reality
Checker contrastó el índice y el deployment anterior mediante la evidencia
final de DevOps; informe de cierre SHA-256
`d6134d1e608f8ea874d968f57104dc1613f0993da620e3b7186ab6f0c6940e89`.

Respaldo privado persistente de QA, fuentes staged y bloqueo Git:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-release-candidate-blocked-20261114T003732Z`.
85 archivos verificados, incluidos los 18 fuentes idénticos al índice; sin
node_modules, build servido ni archivos de entorno. SHA-256 de
`archive-manifest.json`:
`0a91dbc36ba5c3e0189d1dc756e1b5992eed86cbb819a048a98d605aa1a75e24`.
El informe archivado precede únicamente a esta referencia del respaldo.

## Intento anterior conservado — bloqueo de autenticación

13 de noviembre de 2026, America/Bogota. **BLOCKED: autenticación MAPI HTTP 401.**
No se guardó ni publicó ninguna historia, no se aplicó el patch de activación,
ni se crearon commits, pushes o deployments.

## Autorización y verificaciones efectivas

La autorización del titular acepta las 14 actualizaciones EN, 15 publicaciones,
las 20 sustituciones de campos, los timestamps EN para las 15 páginas ES,
integración a main, Production ON y rollback OFF condicional. Expresamente
reemplaza el gate de nuevo Preview por despliegue directo. Se conserva el
manifiesto sellado sin alterarlo; la excepción queda registrada por separado.
SHA-256 de la autorización:
`c425a14bfc549507dd818c8b404f01f5c42d24bde011a9a5ba7de0ee2706a0c1`.

| Control | Resultado actual |
| --- | --- |
| Respaldo sellado | PASS: 422/422 archivos, hashes/tamaños/permisos y siete vínculos de evidencia |
| Manifiesto y aprobación | PASS: ID `58bf6e75ccb8d9e271dbdc0c0b2e07785224ad69caf4019c96035ae0832b881b`; 15/15 hashes editoriales recalculados |
| Fuentes y patch | PASS: ninguna modificación funcional frente al paquete; solo el cierre documental conocido. Patch revisado sin aplicar |
| Git | HEAD y `origin/main` en C3 `4f316fbd61916f6388ed2f179a2f14c8afea87d0`; rama del piloto conservada |
| Sesión Vercel | `whoami` PASS; Node local `v24.21.0`, CLI disponible `65.15.0` |
| Concurrencia CMS actual | BLOCKED: primer GET MAPI directo devolvió 401; las 30 historias no se pudieron releer |
| Configuración/deployment Production y rollback disponible | No reconfirmados: consultas dependientes detenidas tras el 401 |
| Guardados / publicaciones / deployments | 0 / 0 / 0 |
| CDA publicada consolidada, 30 URLs y sitemap de producción | No verificados en esta ejecución; no sustituirlos por QA anterior |

## Bloqueo exacto y reanudación

CMS Developer, único operador de escritura designado, ejecutó `search` y
`describe`, y una sola llamada oficial `getStoryById` para el espacio `1023389`,
historia `23972038`, primera del lote. Solicitó 35 campos editoriales y de
concurrencia, excluyendo credenciales. Respuesta: **HTTP 401 Unauthorized** a
las `2026-11-14T00:09:35.615Z`. No inició acciones del ledger ni reintentó.

Evidencia sanitizada `cms-preflight-auth-blocked.json`, SHA-256:
`d2fdb985cc675c629fb6d6362291819f55b67944479fd4f41b8f6e5e12b8925d`.
El código 401 no permite atribuir por sí solo la causa a expiración, refresh
OAuth o sesión MCP obsoleta. No se abrieron credenciales ni se ejecutó login.

Es necesario restablecer la autorización del conector oficial **Storyblok MCP
en el runtime de Codex que ejecuta esta conversación**. Después se retomará la
autorización ya concedida, comenzando por lecturas actuales de las 30 historias
y comprobaciones de concurrencia; no basta con los respaldos históricos.
No se requiere otra autorización del lote si su contenido y alcance no cambian.

Los seis especialistas instalados participaron. AppSec y Frontend confirmaron
la integridad y preservación. Test Automation confirmó que la matriz local
anterior sigue siendo evidencia histórica con fixtures; no se repitieron
suites ni builds, ni se certificó el camino publicado real.

El guard de Production del código local sigue intacto: el nuevo modelo continúa
OFF por defecto y no se cambió ningún flag persistente. No fue necesario
rollback porque no hubo activación. Las historias y publicaciones no fueron
modificadas por esta ejecución.

**Reality Checker: PASS de integridad; BLOCKED de release.** Contrastó los 422
archivos, el manifiesto, la evidencia del 401 y la preservación de Git. No
certifica CDA consolidada ni Production; las etapas dependientes permanecen
detenidas.

Evidencia persistente privada:
`/home/jhonattanb/Backups/portfolio-storyblok/bilingual-release-blocked-20261114T000935Z`.
Se verificaron los seis archivos archivados; directorios `0700`, archivos
`0600`. SHA-256 de `archive-manifest.json`:
`d35b5c030a86eeaae880ab18ad19877078611921571925aa77533de170bcff03`.
El respaldo sellado de preparación se conservó intacto.
