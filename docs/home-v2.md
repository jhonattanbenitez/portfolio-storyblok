# Home V2 — candidato de release

Rama: `feat/home-v2`. Base local y remota verificada:
`8a22062faaf86679e0746a90da87db2387f7d4c4` (`main`).
La composición refinada fue aprobada visualmente por el titular.
Este cierre prepara un único commit; no incluye push ni publicación.

## Alcance del commit

| Archivo | Cambio |
| --- | --- |
| `.gitignore` | Excluye las evidencias locales de Home |
| `.vercelignore` | Excluye esas evidencias de futuros uploads CLI |
| `components/HomeV2/HomeV2.tsx` | Compositor servidor de Home publicada EN/ES |
| `components/NavBar.tsx` | Presentación Home, skip link y altura real del encabezado |
| `components/NavBarWrapper.tsx` | Cierre del menú Home al cambiar idioma |
| `lib/home-v2.ts` | Adaptación de datos, copy, fechas, categorías y lectura estimada |
| `src/app/[[...slug]]/page.tsx` | Selección de Home V2 solo en las dos home publicadas |
| `src/app/globals.css` | Estilos limitados a Home, responsive y reduced motion |
| `tests/home-v2.test.mjs` | 33 regresiones de los contratos de Home |
| `tests/integration/home-v2.mjs` | Comprobaciones y capturas Chromium locales |
| `docs/home-v2.md` | Alcance, evidencia, límites y criterios de publicación |

Los 17 archivos históricos del piloto permanecen sin seguimiento, intactos y
fuera del commit. Tampoco entran capturas, trazas, logs, respaldos, certificados,
archivos de entorno, credenciales ni dependencias generadas.

## Comportamiento y contenido

- Hero profesional EN/ES, retrato real y enlaces sociales existentes. Misma
  composición, tipografía Inter y paleta petróleo aprobadas, claro/oscuro.
- Caso logístico, Wasabi y Woodford como destacados; otros cuatro proyectos
  conservados en un desplegable. Problema, solución y resultado del caso se
  extraen del contenido publicado; no se inventa una contribución personal.
- Tres artículos publicados recientes, URLs de la fachada editorial existente,
  categoría en su idioma y lectura explícitamente estimada a 200 palabras/minuto
  sobre título, introducción y cuerpo visible sanitizado, incluido código.
  Categoría o duración sin datos suficientes se omiten.
- About conserva biografía, habilidades, educación y certificaciones en
  desplegables nativos. ContactForm reutilizado sin cambiar validación, envío,
  reCAPTCHA ni controles de privacidad.
- Hebra Viva y Koiren siguen como propuestas: necesitan enlace, captura autorizada
  y datos verificables de contexto, rol y resultado antes de sustituir tarjetas.
  No se añadió contenido ficticio. Los errores editoriales menores de las
  descripciones CMS y los dos puntos al final del extracto Solución no se
  reescribieron durante este cierre.

## Compatibilidad y límites

Home V2 se selecciona únicamente para `/` y `/es-co` publicados. Blog, detalles,
casos, categorías y landing mantienen sus renderers y rutas. Se conservan
metadata, canonical, hreflang, JSON-LD, sitemap y selector de idioma.
Los estilos y ajustes de navegación están limitados a Home.

La fachada `getPostsPage` conserva ambos modelos editoriales; Home consume el
`editorial.href` validado cuando corresponde y mantiene soporte legacy.
No se cambia el guard, los loaders bilingües ni flags persistentes.

El Visual Editor autorizado conserva su renderer anterior. La nueva presentación
Home V2 no está integrada en él; el nuevo skip link de navegación Home apunta a
un ID que ese renderer anterior no emite. Es un límite de esa vista autorizada,
no un fallo de las páginas públicas comprobadas.

## Evidencia reutilizada

Los 141 archivos funcionales coinciden byte a byte con el candidato validado.
Solo se compactó este informe para el release; no se cambiaron fuentes ni se
repitió la matriz de pruebas por artículo.

- Node.js 24.21.0, Next.js 16.4.6.
- TypeScript y ESLint enfocado: PASS, sin diagnósticos.
- Unitarias Home: **33/33 PASS**, cero fallos u omisiones.
- Build local: **PASS**, ID `ZMPe6N2XJT43srv4MVjoM`.
- Chromium: **8/8 PASS** (EN/ES, claro/oscuro, escritorio/móvil).
- Teclado, navegación, desplegables y texto al 200% a 320/390px: PASS.
- Cero errores JS/consola, solicitudes Analytics o envíos de la aplicación.
  Dos cancelaciones de navegación `ERR_ABORTED`, conservadas en los resultados.
- Sitemap: **45 URLs únicas**, 30 entradas de artículos. Se navegaron muestras;
  no se afirma una visita HTTP individual a las 30 páginas.

Evidencias locales excluidas de Git: `artifacts/home-v2/refinements-02/`,
`refinements-checks/` y `refinements-reviews/` dentro del mismo directorio Home.
Los 38 archivos del manifiesto final se verificaron mediante SHA-256:
`b7bc2c76fd726d221985f2d8888d6f121692d80999b4cb04c1c5f42aeb6a118f`.
Los logs primarios acreditan los resultados; la evidencia previa y la versión
extensa de este informe se conservan localmente, fuera del commit.

Build y navegador se ejecutaron con modelo OFF y Analytics OFF exclusivamente
para esos procesos locales. La compatibilidad ON está cubierta por el contrato
existente y las pruebas de adaptación; esta evidencia no acredita un nuevo
ensayo HTTP ON real, validación remota o envío de correo. Tampoco constituye
certificación WCAG completa ni cobertura de otros navegadores.

## Comprobación enfocada reproducible

Con Node 24 y la configuración habitual del servidor local, sin copiar secretos
a Git:

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js components/HomeV2/HomeV2.tsx components/NavBar.tsx components/NavBarWrapper.tsx lib/home-v2.ts 'src/app/[[...slug]]/page.tsx' tests/home-v2.test.mjs tests/integration/home-v2.mjs
node --experimental-strip-types --test tests/home-v2.test.mjs
```

El harness exige origen local y un directorio de evidencia nuevo; no admite
mutaciones y no envía correo. Requiere una instancia local con Analytics OFF.
La creación del commit no autoriza push, cambios de CMS/Vercel ni deployment.
La validación remota del entorno efectivo corresponde a una publicación posterior
expresamente autorizada.
