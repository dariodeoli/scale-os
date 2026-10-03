# Blog de Scale Paraguay — propuesta editorial (#156)

Propuesta de contenido y estructura para el blog de la empresa
(`scaleparaguay.com`). Nada de esto está construido: es la fase 1 de #156
(contenido) para aprobación del dueño; la plataforma la propone PLT con los
requisitos de [`requisitos-plataforma.md`](requisitos-plataforma.md).

Base real usada: la web vigente de Scale (consultora digital: estrategia,
producción, edición, publicación, crecimiento, podcast, streaming y coberturas;
planes Silver/Gold/Diamond; “No es suerte, es estrategia”; análisis gratuito vía
WhatsApp) y la landing de Scale OS (producto para agencias).

## 1. Objetivo y a quién le habla

**Objetivo del blog**: que una marca paraguaya que hoy publica sin dirección
encuentre a Scale buscando cómo hacerlo mejor, entienda el método y pida el
**análisis gratuito**. Métrica primaria: consultas calificadas (WhatsApp o
formulario); secundarias: tráfico orgánico, suscriptores y clics segmentados a
Scale OS.

Audiencias (espejo de las tres de la web):

| Perfil | Qué busca | Qué le sirve del blog |
|---|---|---|
| **Profesionales** (salud, estudio, consultoría) | Autoridad y confianza | Contenido educativo, marca personal, casos de su rubro |
| **Marca personal** (creadores, líderes) | Narrativa propia y crecimiento | Formatos (podcast, video), línea editorial, constancia |
| **Empresas** (pymes y marcas en crecimiento) | Volumen y resultados medibles | Estrategia, producción, métricas, cobertura de eventos |

Audiencia secundaria: **agencias y equipos internos** que buscan cómo se hace
el trabajo (se atienden con el puente a Scale OS, sin mezclar el mensaje).

## 2. Estructura editorial

### 2.1 Categorías (4, alineadas con `docs/BLOG-PROPUESTA.md` de PLT)

Se adopta la estructura de secciones de la propuesta de plataforma
(Casos de éxito · Cultura · Noticias · Servicios) y se detalla su uso editorial:

| Categoría (sección) | Slug | Qué publica | Frecuencia |
|---|---|---|---|
| **Servicios** | `servicios` | Estrategia, producción, edición, publicación, podcast, streaming, coberturas y marca personal: guías prácticas, opinión y decisión de inversión | 2/mes |
| **Casos de éxito** | `casos` | Casos de clientes con números y aprendizajes; antes/después | 1/mes |
| **Cultura** | `cultura` | Equipo, proceso, detrás de escena, jornadas y aprendizajes del año | 1 cada 6 semanas |
| **Noticias** | `noticias` | Novedades de la consultora, equipo, alianzas y anuncios | 1 cada 6 semanas |

Etiquetas transversales de audiencia (la sección no cambia): `profesionales`,
`marca-personal`, `empresas`. Etiquetas de tema: `estrategia`, `produccion`,
`podcast`, `eventos`, `metricas`.

Reglas de categoría: 1 sola categoría principal por artículo (mapea a
`categories` del frontmatter) + hasta 3 etiquetas libres; las URLs son
`/{categoria}/{slug}`; una sección sin al menos 5 artículos no se publica como
portada propia (queda listada sin menú hasta completarla).

### 2.2 Autores

Política: **todo artículo lleva persona real con nombre, rol y bio** (nada de
“Admin”). Cada pieza suma un revisor interno cuando toca datos del cliente o
temas legales.

| Autor | Rol y bio (plantilla) | Escribe sobre |
|---|---|---|
| **Dario De Oliveira** | Fundador de Scale. Estrategia de contenido y crecimiento de marcas. | Estrategia, negocio, casos, opinión |
| **Responsable de contenido** (a designar) | Edita y escribe el blog; coordina calendario y estilo. | Guías prácticas, producción |
| **Equipo de producción** (autoría compartida del equipo) | Quien produce, graba y edita. | Técnica audiovisual, detrás de escena |
| **Equipo de estrategia** (autoría compartida) | Quien planifica cuentas. | Métricas, formatos, canales |

Cada perfil necesita en la plataforma: nombre, rol, bio ≤ 400 caracteres, foto
cuadrada, Instagram/LinkedIn opcional. Los artículos “Detrás de Scale” y los
casos pueden ir firmados por el equipo con un responsable humano de respaldo.

### 2.3 Plantillas

Todas las plantillas comparten los **elementos obligatorios** del punto 2.4.

**A. Guía práctica** (900–1.400 palabras) — el formato principal.
1. Título con beneficio concreto (≤ 60 caracteres).
2. Intro: el problema en la voz del lector (2–3 párrafos), sin rodeos.
3. “En esta guía vas a encontrar” (3–4 bullets).
4. Pasos numerados: qué hacer, cómo, con ejemplo local.
5. Errores comunes (3) y cómo evitarlos.
6. Checklist o plantilla descargable (con captura de contacto si aplica).
7. Cierre + CTA (análisis gratuito).

**B. Opinión / punto de vista** (700–1.000 palabras): una idea fuerte por
artículo, contexto del mercado paraguayo, qué haría Scale, qué no haría, cierre
con invitación a conversar. Firma personal.

**C. Lista / recursos** (800–1.200): “N herramientas/formatos/ejemplos…” con
criterio de selección explícito (por qué esos y no otros) y mini-resumen por
ítem; sirve para enlazar a guías propias.

**D. Caso de éxito** (1.500–2.000 palabras). Estructura fija:
`Cliente y rubro → Contexto (de dónde partía) → Reto → Qué hicimos (estrategia,
producción y publicación) → Resultados con métricas y fecha de corte →
Aprendizajes → Testimonio → CTA`. Reglas: permiso escrito del cliente;
números verificables y con periodo (“+X% de alcance entre mar y ago 2026”);
si no hay permiso de nombre, se publica como “caso [rubro]” sin logo ni captura
identificable.

**E. Detrás de Scale** (600–900): una jornada, un proceso o una decisión; foto
real del equipo; sin datos de clientes; cierra con link a “Trabajá con
nosotros” o al servicio involucrado.

### 2.4 Elementos obligatorios por artículo

- **Frontmatter acordado con PLT** (`docs/BLOG-PROPUESTA.md`): `title`,
  `description`, `date`, `author`, `categories`, `tags`, `cover`, `draft`,
  `canonical?`. Ampliación que pide el contenido: `seoTitle`, `coverAlt`,
  `updated`, `crossPost` y bloque `case` (cliente, rubro, permiso, resultados)
  para los casos de éxito. Ver
  [`requisitos-plataforma.md`](requisitos-plataforma.md) §1.
- Portada 16:9 (≥ 1.600×900) + variante OG 1200×630; `alt` descriptivo y pie.
- Extracto ≤ 160 caracteres y título SEO ≤ 60 (puede diferir del título visible).
- Categoría + etiquetas; autor con bio; fecha de publicación y de actualización.
- 2–3 enlaces internos contextuales + 1 externo de fuente cuando se cita un dato.
- Un solo CTA principal (análisis gratuito) y, si aplica, CTA segmentado a
  Scale OS (ver §6).
- Texto alternativo en imágenes, subtítulos en videos, negritas solo para lo
  esencial. Sin promesas garantizadas ni cifras sin fuente.
- Revisión de estilo y datos antes de programar (checklist en §5.4).

## 3. Calendario de publicación

**Cadencia sostenible**: 1 artículo por semana, martes 10:00 (hora de Asunción);
1 caso por mes. El arranque es el **martes 20-oct-2026** para dar lugar a la
aprobación y a la producción fotográfica. Después de 12 semanas se revisa la
cadencia con datos reales (si no hay capacidad de producción, baja a 2/mes:
guía + caso).

| # | Fecha | Formato | Título de trabajo | Categoría |
|---|---|---|---|---|
| 1 | mar 20-oct | Guía | Qué publicar en Instagram cuando tu negocio no vende solo | Servicios |
| 2 | mar 27-oct | Caso | De publicar sin rumbo a vender con estrategia: caso [cliente] | Casos |
| 3 | mar 03-nov | Guía | Calendario de contenidos: planificá un mes en dos horas | Servicios |
| 4 | mar 10-nov | Opinión | Agencia, freelancer o equipo interno: la cuenta real | Servicios |
| 5 | mar 17-nov | Guía | Reels que venden: estructura, guion y llamado a la acción | Servicios |
| 6 | mar 24-nov | Detrás | Así grabamos 12 contenidos en una jornada | Cultura |
| 7 | mar 01-dic | Guía de decisión | Podcast de marca: cuándo conviene y qué cuesta en Paraguay | Servicios |
| 8 | mar 08-dic | Caso | Cobertura de lanzamiento: del evento a 30 piezas | Casos |
| 9 | mar 15-dic | Guía | Cobertura de eventos: qué pedirle a tu proveedor antes de firmar | Servicios |
| 10 | mar 22-dic | Guía + plantilla | Tu marca en 2027: el calendario de 12 meses | Servicios |
| 11 | mar 29-dic | Detrás | Lo que aprendimos en 2026 (y qué cambia en 2027) | Cultura |
| 12 | mar 05-ene | Guía | Métricas de redes que importan (y las que solo dan likes) | Servicios |

Distribución de cada pieza: Instagram (carrusel o reel resumen), WhatsApp a
clientes/contactos cuando aporta, newsletter quincenal (cuando exista), y
reutilización de fragmentos en stories. El caso mensual se anuncia con el
cliente etiquetado con su permiso.

## 4. Títulos propuestos (intención y keyword)

> Las keywords son **hipótesis editoriales** a validar con Google Keyword
> Planner + Search Console (Paraguay, español) antes de escribir cada pieza;
> no se publican volúmenes inventados. Revisión a los 90 días.

| # | Título propuesto | Intención | Keyword principal (hipótesis) | Formato | CTA |
|---|---|---|---|---|---|
| 1 | Qué publicar en Instagram cuando tu negocio no vende solo | Informacional (TOFU) | `qué publicar en instagram` | Guía | Análisis gratuito |
| 2 | De publicar sin rumbo a vender con estrategia: caso [cliente] | Comercial (BOFU) | `casos de éxito marketing paraguay` | Caso | Análisis + testimonio |
| 3 | Calendario de contenidos: planificá un mes en dos horas | Informacional | `calendario de contenidos` | Guía + plantilla | Plantilla por WhatsApp |
| 4 | Agencia, freelancer o equipo interno: la cuenta real | Comparativa (MOFU) | `contratar agencia de marketing paraguay` | Opinión | Análisis gratuito |
| 5 | Reels que venden: estructura, guion y llamado a la acción | Informacional | `reels que venden` / `guion para reels` | Guía | Plan mensual |
| 6 | Así grabamos 12 contenidos en una jornada | Marca (TOFU) | `producción de contenido` | Detrás | Servicio de producción |
| 7 | Podcast de marca: cuándo conviene y qué cuesta en Paraguay | Comercial | `podcast para empresas paraguay` | Guía de decisión | Cotizar podcast |
| 8 | Cobertura de eventos: qué pedirle a tu proveedor antes de firmar | Comercial | `cobertura de eventos paraguay` | Checklist | Cotizar cobertura |
| 9 | Marca personal para profesionales: el contenido que trae consultas | Informacional/BOFU | `marca personal profesional` | Guía | Análisis gratuito |
| 10 | El mínimo de 3 meses: por qué el contenido necesita 90 días | Comercial (objeciones) | `cuánto tarda el marketing de contenidos` | Opinión | Plan mensual |

Candidatas de reserva: “¿Cuánto cuesta el marketing digital en Paraguay?”
(comparativa de inversión, con rangos reales y sin prometer resultados),
“Cómo elegir fotos para tu marca”, “Errores que alejan clientes de tu
Instagram”, “Pauta o contenido orgánico: por dónde empezar”.

## 5. Tono y guía de estilo

### 5.1 Voz

- **Directa, profesional y cercana**: habla de “vos” (voseo paraguayo: *tenés,
  querés, podés*), nunca de “usted”; frases cortas; cero relleno.
- **Con criterio, no con humo**: “No es suerte, es estrategia”. Cada afirmación
  tiene un por qué o un ejemplo; nada de “tips mágicos”.
- **Local de verdad**: Asunción y ciudades de Paraguay, rubros reales, moneda
  en guaraníes con IVA cuando corresponde, WhatsApp como canal natural.
- **Sin jerga vacía**: prohibido “sinergia”, “disrupción”, “growth hacking” sin
  explicar; si se usa un término técnico, se traduce en la misma frase.

### 5.2 Reglas de escritura

| Regla | Criterio |
|---|---|
| Títulos | 45–60 caracteres, beneficio concreto, sin clickbait |
| Párrafos | 2–4 líneas, una idea por párrafo |
| Subtítulos | Se entienden solos (se leen fuera de contexto) |
| Negritas | Solo para la idea que hay que retener (máx. 1 por sección) |
| Listas | Para pasos y checklists, no para acumular adjetivos |
| Datos | Fuente y fecha; si es un rango, “desde” y condiciones |
| Precios | “Desde Gs. X + IVA/mes”; nunca sin el plazo mínimo (3 meses) |
| Emojis | En piezas sociales; en el cuerpo solo si aporta (máx. 2) |
| Fechas | `dd MMM aaaa` en hora de Asunción (`20 oct 2026`) |
| Enlaces | Ancla descriptiva (“guía de calendario”), nunca “clic acá” |

### 5.3 Imágenes y contenido de terceros

- Prioridad a **material propio** (fotos de jornadas, equipo, clientes con
  permiso). Stock solo si no hay alternativa y sin caras genéricas de banco.
- Logo, rostro o número de un cliente: **permiso escrito**, siempre. Sin
  permiso, se anonimiza el caso.
- No publicar datos personales de terceros (Ley N° 7593/2025); los formularios
  del blog incluyen el Aviso de privacidad y consentimiento explícito.
- Portadas con tratamiento consistente (misma paleta y tipografía de la marca);
  texto legible en miniatura.

### 5.4 Checklist antes de publicar

1. ¿El título dice el beneficio y tiene ≤ 60 caracteres?
2. ¿La intro plantea el problema del lector en 3 párrafos o menos?
3. ¿Cada dato tiene fuente/fecha y cada precio, condiciones?
4. ¿Hay 2–3 enlaces internos, portada con alt y CTA único?
5. ¿Se revisó el estilo contra esta guía y la ortografía (es-PY)?
6. ¿El cliente autorizó logos, fotos y números (si es caso)?
7. ¿Quedó cargada la fecha de actualización y el autor con bio?

## 6. CTAs hacia Scale OS

El CTA principal del blog sigue siendo el **análisis gratuito** (WhatsApp o
formulario). Scale OS aparece **segmentado y escaso**:

- **Dónde**: al final de artículos cuyo lector puede ser agencia o equipo
  interno (comparativa agencia/freelancer, crecimiento de equipo, gestión de
  clientes) y en la barra lateral de casos de agencia.
- **Copy propuesto** (bloque único):
  > **¿Manejás una agencia o un equipo de producción?** Scale OS ordena
  > clientes, presupuestos, producción y finanzas en un solo lugar. 30 días
  > gratis, sin tarjeta. [Conocer Scale OS ↗]
- **Reglas**: máximo 1 bloque Scale OS por artículo; nunca reemplaza al CTA del
  análisis; no aparece en artículos de profesionales o marca personal (no es su
  producto); el enlace lleva a la landing de Scale OS con
  `utm_source=blog-scale&utm_medium=cta-segmentado`.
- **Cross-linking**: ver reglas comunes en
  [`157-scale-os.md`](157-scale-os.md) §5.

## 7. Distribución y medición

- **Canales**: blog (SEO), Instagram (pieza nativa por artículo), WhatsApp
  (solo a contactos con interés real, sin listas masivas), newsletter quincenal
  una vez emitida la decisión de plataforma.
- **Analítica mínima**: visitas orgánicas, posición media y consultas por
  Search Console; clics a WhatsApp/formulario y a Scale OS (UTM) por artículo;
  suscriptores; artículos que asisten a una consulta (preguntar “¿cómo nos
  encontraste?” al primer contacto).
- **Ritual mensual**: revisar los 5 artículos con más consultas y los 5 con más
  tráfico sin consultas; ajustar títulos, CTA y el calendario del mes siguiente.

## 8. Decisiones que necesita el dueño

1. Aprobar las 4 secciones (`Servicios · Casos de éxito · Cultura · Noticias`) y
   la cadencia semanal (o bajarla a 2/mes: 1 guía + 1 caso).
2. Aprobar la plataforma y el host que propone PLT
   (`docs/BLOG-PROPUESTA.md`: MDX en el monorepo + `blog.scaleparaguay.com`) y
   quién publica por PR además de Dario.
3. Definir quién firma como responsable de contenido y qué equipo aporta fotos.
4. Aprobar el primer caso (cliente y permiso) y el cuestionario de resultados.
5. Confirmar los CTAs hacia Scale OS (copy y frecuencia).
