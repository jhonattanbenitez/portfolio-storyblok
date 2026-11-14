# Preview del piloto A con modelo OFF

Fecha: 13 de noviembre de 2026, America/Bogota.

## Reintento autorizado — READY; QA autenticada pendiente

Se realizó **un único nuevo intento**, autorizado expresamente después del
fallo anterior. CLI terminó con **exit 0** y la API confirmó **READY**. No hubo
reintentos automáticos ni creaciones adicionales. Son dos invocaciones en total
entre ambas ejecuciones; el primer intento no produjo un deployment observado.

- Deployment ID: **`dpl_APdyDndhGaVEcPtyWAMDVfk9vdxn`**.
- URL: **https://portfolio-nextjs-hltr4wboi-jhonattanbenitezs-projects.vercel.app**.
- Proyecto: `portfolio-nextjs`; scope: `jhonattanbenitezs-projects`.
- Entorno explícito: **Preview**. La API devuelve `target:null`; CLI identifica
  `environment:preview`, sin URL de producción asignada.
- Ejecución: **20:48:47–20:49:26 UTC**, 15:48–15:49 America/Bogota.
- Candidato: rama `feat/storyblok-field-translation-pilot-20261113`, base C3
  `4f316fbd61916f6388ed2f179a2f14c8afea87d0`, con cambios locales sin commit.
- Fuente SHA-256: `ce5b8c8adebccc2e84427c6d4a5dc6e0856b3aeb1c544489b8eb3d19af455f04`.

### Diagnóstico previo sin crear deployments

Se revisaron argumentos, cwd, entorno y código de **CLI local 65.15.0**.
`--version`, ayuda de deploy, `whoami` con el mismo entorno y el comando exacto
con `--dry --json` pasaron. Los 103 archivos efectivos del upload siguen
coincidiendo con el snapshot; 132 fuentes y 435 artefactos del manifiesto local
anterior permanecen intactos. Se reutilizó ese candidato y no se repitió la
suite completa local.

La ruta `--dry` termina antes de algunas comprobaciones reales; no reproduce
por sí sola la creación. Se comprobó que el snapshot no contiene configuración
Vercel/now que active el hook de migración experimental. No se añadió `--yes`
a ciegas, se cambió la CLI ni se modificó configuración global. No se encontró
un fallo reproducible de preparación, flags o acceso en estas comprobaciones.

El inventario **sin filtro de hash**, consultado a las **20:48:38 UTC** justo
antes del intento, devolvió los siete deployments anteriores y ninguno tardío
del primer intento. Después se confirmó un único deployment nuevo READY.

**La causa del exit 1 original sigue sin demostrarse:** su diagnóstico textual
se perdió en la captura anterior. El éxito actual no prueba una causa
retrospectiva. La API informa ahora plan Pro, mientras el registro anterior
indicaba Hobby; no se cambió el plan en estas ejecuciones ni se atribuye el
fallo anterior a esa diferencia.

### Captura de stdout y stderr

Se sustituyó el filtro estrecho por captura completa de ambos streams en RAM,
sanitización y guardado separado con permisos `0600`, dentro de directorio
`0700`. Nunca se guardaron streams crudos en disco. AppSec comprobó **12/12
casos sintéticos** de redacción y revisó los logs reales sanitizados después.
Se conservan mensajes, errores y stacks, eliminando credenciales, cookies,
headers privados, URLs autenticadas y valores sensibles conocidos.

Un ledger nuevo y exclusivo se escribió antes de invocar CLI. El runner exige
inventario reciente, proyecto/scope/protección correctos, hashes intactos y
flags OFF, y no contiene bucle de creación. El comando conserva el SHA-256
`e21c5f6ef26818d10117d3e66fa1884fa1a6a0425692e29fb014258e2bd10e48` del
anterior: `--environment preview`, proyecto/scope explícitos, `--force` sin
`--with-cache`, sin `--prod`, promoción o rollback.

### Evidencia remota ejecutada

| Control | Resultado actual |
| --- | --- |
| CLI y deployment | **PASS**, exit 0, ID/URL nuevos, API READY y source CLI |
| Build remoto | **PASS**, logs sanitizados confirman `Build Completed in /vercel/output [28s]`, Turbopack y caché omitida |
| Next.js | **16.4.6**, detectado en el build remoto |
| Node.js | **24.x**, devuelto por la API en `deployment.nodeVersion` y en los settings de ese deployment; no se midió `process.version` ni patch del runtime |
| Ajuste global Node del proyecto | Sigue **20.x**; no se modificó. `engines.node:24.x` del candidato seleccionó 24.x para este deployment |
| Protección configurada | **PASS**, Vercel Authentication continúa activa para todos los previews |
| Comprobación anónima | **PASS**, un GET sin credenciales a las 20:50:16 UTC devuelve **302 a Vercel SSO**, sin seguir redirecciones ni conservar cookies, cuerpos o parámetros de la URL de SSO |
| Modelo y Analytics | `false` en **ambos** `--build-env` y `--env`, según comando y solicitud aceptada. Valores efectivos del entorno no leídos independientemente; comportamiento de navegador pendiente |
| Canonical configurado | `SITE_URL=https://www.jhonattan.dev` solicitado en build y runtime; HTML remoto pendiente de sesión autorizada |
| Producción | **PASS**, WWW/apex conservan `dpl_FFK3nDCcSEEqmCsRxRJZJTpmxwQo`, C3, y la redirección apex → WWW |
| Variables/protección | Metadata de ámbitos y protección conservada; no se modificaron variables persistentes ni configuración remota |

Los logs indican CLI de construcción 65.14.0; la invocación local usó 65.15.0.
No se atribuye el fallo anterior a esa diferencia. Las sugerencias automáticas
`--prod` y `vercel curl` impresas por CLI **no se ejecutaron**. La telemetría de
compilación de Next tampoco equivale a mediciones Google Analytics del sitio.

### Validaciones de aplicación BLOCKED

No hay una sesión de navegador autenticada disponible para los agentes.
**SSO no acredita la autorización interna del borrador ni la aplicación detrás
de esa barrera.** No se extrajeron cookies/perfiles, crearon bypass ni ejecutaron
peticiones anónimas repetidas a los artículos.

Quedan pendientes en este Preview, mediante sesión autorizada del titular:

1. Las 30 URLs reales: HTTP 200, contenido correspondiente y canonical WWW.
2. Sitemap: 45 URLs únicas, conjunto esperado y ensayo ausente; robots y
   hreflang EN/ES recíprocos.
3. Navegación, categorías y redirecciones de idioma conservando query.
4. Ensayo ficticio: 404 o streaming noindex sin artículo/textos/UUID; endpoints
   privados deniegan acceso sin autorización de Storyblok y mantienen cabeceras.
5. Analytics: ausencia de scripts y solicitudes GA tras consentimiento,
   navegación y recarga; consola y solicitudes fallidas revisadas.

Las 371 unitarias, 19 grupos de integración y 30/45 URLs acreditadas son
**evidencia local anterior**, no resultados de estas verificaciones HTTPS.
El borrador real no fue publicado ni aprobado por esta ejecución.

Una lectura propuesta para comprobar los flags en `deployment.env/build.env`
fue **rechazada por la revisión automática de aprobación**, por el riesgo de
recuperar listas con valores privados. **No se ejecutó** ni se intentó un
workaround. Por ello los overrides OFF se acreditan mediante el comando y la
solicitud, sin afirmar lectura independiente del entorno efectivo. No se
solicitan secretos ni acceso al entorno completo para completar esa evidencia.

### Evidencia y dictamen

Evidencia privada nueva:
`/home/jhonattanb/Backups/portfolio-storyblok/preview-off-retry-20261113T204612Z`.
Incluye ledger, diagnóstico, stdout/stderr sanitizados, manifiestos, preflight,
inventarios, metadata del deployment, comprobación anónima y revisiones AppSec.
Su origen de trabajo es `/tmp/preview-off-retry-20261113-fdnbgfzz/`. El respaldo
sellado del primer intento permanece intacto.

DevOps Automator, Application Security Engineer y Reality Checker leyeron sus
definiciones originales y participaron mediante delegación real. Dictamen:
**PASS de creación del Preview protegido, build, Node/Next según evidencia
remota y producción preservada; BLOCKED de QA funcional autenticada y de la
lectura independiente de flags. No GO para producción ni activación del modelo.**

No hubo commits, pushes, cambios funcionales, modificación de Storyblok,
variables persistentes, configuración global, dominios, promociones ni rollback.
Solo se actualiza documentación. El modelo permanece deshabilitado por defecto;
los overrides del Preview mantienen la selección OFF solicitada.

## Registro histórico — primer intento detenido

El contenido siguiente conserva el informe de aquella ejecución. Sus estados
BLOCKED describen ese intento; el resultado del nuevo intento está arriba.

**Resultado: BLOCKED.** Hubo una única invocación de creación, sin reintentos.
Vercel CLI terminó con exit 1 y no devolvió deployment ID ni URL. El listado
posterior del proyecto, sin filtrar por metadata del candidato, no encontró
deployments nuevos en la ventana del intento. No se reutilizó un Preview anterior.
No se declara GO para producción.

### Identidad del candidato y preflight

- Proyecto existente: `portfolio-nextjs`, equipo `jhonattanbenitezs-projects`.
- Project ID: `prj_oTzF5oyiz1t7JjcT0mLrqFjz0iXq`.
- Team ID: `team_s8DYJSdttArwRoJRGLFbGzPV`.
- Rama: `feat/storyblok-field-translation-pilot-20261113`.
- HEAD base C3: `4f316fbd61916f6388ed2f179a2f14c8afea87d0`.
- El candidato incluye cambios locales sin commit; no se presentó C3 como un
  commit que contuviera esas correcciones. Se identificó el snapshot por hash.
- Build local previamente validado: `s23lKs1GA3SZilz7Zx9sJ`.
- Fuente SHA-256: `ce5b8c8adebccc2e84427c6d4a5dc6e0856b3aeb1c544489b8eb3d19af455f04`.
- Artefactos locales SHA-256: `ca2056d38c053b12c95149ab56bcb6aa660a19d6f006650f3c26914f67456db4`.

| Control | Resultado efectivo |
| --- | --- |
| `vercel whoami` | PASS, sesión `jhonattanbenitez`; también pasó con el mismo entorno del comando fallido. No se solicitó login |
| Manifiesto local `--verify` y fuentes actuales | PASS, 132/132 fuentes y 435 artefactos sin diferencias; package y lock coinciden |
| Proyecto, equipo y permisos | PASS, proyecto existente, propietario del equipo, repositorio `jhonattanbenitez/portfolio-storyblok`, Production `main` |
| Protección configurada | PASS, `prod_deployment_urls_and_all_previews`, protección de forks activa; reconfirmada después del fallo |
| Variables Preview | PASS de metadata: tres secretos privados requeridos y token publicado presentes, sin overrides por rama; no se recuperaron valores |
| Staging | PASS, 104 archivos permitidos, incluyendo las tres bibliotecas funcionales sin seguimiento; hashes coinciden |
| Upload real simulado con CLI `--dry` | PASS, 103/103 archivos y SHA-1 coinciden; `.gitignore` omitido automáticamente por CLI; cero credenciales, certificados, cachés, docs, tests o scripts de pilotos |
| Flags del comando | PASS: modelo y Analytics `false` tanto en `--build-env` como en `--env`; `SITE_URL=https://www.jhonattan.dev` en ambos |
| Entorno de destino | PASS, `--environment preview`, proyecto/scope explícitos; sin `--prod`, promoción o rollback |
| Node del candidato | `engines.node:24.x`, Next.js 16.4.6; Node efectivo remoto NO VERIFICADO |

El ajuste remoto del proyecto continúa en Node `20.x`. `engines.node:24.x`
sobrescribe ese ajuste según el [contrato oficial de Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions#version-overrides-in-packagejson).
No se modificó la configuración remota. El fallo impide acreditar Node 24 o
Next.js 16.4.6 en un build/runtime remoto de este candidato.

### Único intento y límite del diagnóstico

Intento: **20:20:52–20:20:54 UTC**, 15:20 America/Bogota. CLI instalada:
**65.15.0**. Se utilizó el procedimiento histórico revisado y una copia aislada
del snapshot actual; no se ejecutaron `vercel pull`, linking, commits o pushes.
El archivo histórico de release permanece en el respaldo de consolidación;
no se restituyó como si fuera documentación actual de producción.

El comando incorporó `--force` sin `--with-cache`, para evitar restaurar cachés
en el único build solicitado, conforme a [CLI deploy](https://vercel.com/docs/cli/deploy#force).
Los overrides son exclusivos del deployment solicitado; no son cambios de
variables persistentes. Su efecto remoto no se pudo comprobar al no obtenerse
un deployment. Un ledger exclusivo se escribió antes de invocar CLI y bloquea
reintentos automáticos.

**La causa detallada del exit 1 no pudo recuperarse.** El filtro de logs fue
demasiado restrictivo: conservó estado y campos permitidos, pero descartó el
texto diagnóstico en memoria. No se atribuye el fallo a autenticación, Node,
Storyblok o compilación sin evidencia. No se guardaron logs crudos, secretos
ni URLs autenticadas. La sesión CLI volvió a pasar después del fallo.

### Build y QA del Preview

| Entregable | Estado |
| --- | --- |
| Deployment ID / URL nuevos | No disponibles; cero deployments observados desde el intento en la consulta posterior |
| Build remoto / runtime Node 24 | BLOCKED, no observados |
| Rechazo anónimo por Vercel Authentication | NOT RUN, sin URL nueva |
| HTTP y navegador: 30 artículos, EN/ES, categorías y redirecciones | BLOCKED, no ejecutados |
| Canonical, hreflang, sitemap y robots del Preview | BLOCKED, no ejecutados |
| Autorización del borrador y cabeceras privadas en Preview | BLOCKED, no ejecutadas |
| Analytics deshabilitado en navegador | BLOCKED, no ejecutado; únicamente se comprobaron los flags solicitados y el control estático |

Las 371 unitarias, 19 grupos de integración, 30 rutas y 45 URLs de sitemap
acreditadas anteriormente son **línea base local**, no resultados del nuevo
Preview. No se repitieron ni se utilizaron fixtures para simular QA remota.
Tampoco existe una sesión de navegador autenticada accesible a los agentes:
incluso con URL futura, la validación de aplicación requiere acceso autorizado
del titular. No se extrajeron cookies ni se creó bypass.

### Producción y revisión independiente

Reconsulta posterior: **20:22:15 UTC**. El listado devolvió siete deployments
existentes, todos anteriores al intento. `www.jhonattan.dev` y `jhonattan.dev`
siguen en **`dpl_FFK3nDCcSEEqmCsRxRJZJTpmxwQo`**, commit C3. Se conserva la
redirección apex → WWW. Protección y metadata de variables permanecen iguales.

Participaron DevOps Automator, Application Security Engineer, Test Automation
Engineer y Reality Checker, leyendo sus definiciones instaladas. AppSec aprobó
el preflight y los archivos exactos de upload. QA declara BLOCKED las pruebas
remotas no ejecutadas. Reality Checker contrastó candidato, upload, intento,
listado posterior, producción y evidencia: PASS del preflight/preservación,
FAIL de la invocación CLI y BLOCKED de creación/build/QA del Preview.

Evidencia sanitizada y ledger persistentes:
`/home/jhonattanb/Backups/portfolio-storyblok/preview-off-pilot-20261113T202013Z`.
`SHA256SUMS`: nueve objetivos comprobados; SHA-256 del archivo de sumas:
`69e44410e24353bd6bd3c5862a91aad3a5f6583c7d98f671b924859ecaa3171b`.
Detalle de staging y comprobación local adicional:
`/tmp/preview-off-pilot-20261113-devops-q_snthph/`.

Se preservaron código, lock y cambios locales anteriores. Solo se añadió este
informe y una referencia en el informe del piloto. No se modificaron Storyblok,
variables persistentes, dominios, Vercel Production o configuración remota;
no hubo promoción, rollback ni envíos de correo.

**Siguiente paso pendiente:** diagnosticar la ejecución CLI con una captura de
errores sanitizada que conserve su causa. Cualquier nuevo intento de deployment
queda fuera de esta ejecución detenida y requiere una nueva instrucción del
titular. No se ejecutó otro deployment para investigar el fallo.
