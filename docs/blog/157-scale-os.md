# Blog de Scale OS — propuesta de producto (#157)

Propuesta de contenido para el blog de Scale OS, separado del de Scale
Paraguay. Nada de esto está construido: es la propuesta para aprobación del
dueño; la plataforma la define PLT (misma base que el blog de la empresa, tema
e identidad propios) con los requisitos de
[`requisitos-plataforma.md`](requisitos-plataforma.md).

Fuente única de producto: [`../NOVEDADES.md`](../NOVEDADES.md) y la landing
vigente de Scale OS (“Tu agencia crea. Scale OS ordena.”; 30 días gratis, sin
tarjeta; plan único de lanzamiento).

## 1. Objetivo y a quién le habla

**Objetivo**: que una agencia (dueño/a, jefatura de producción, administración)
que busca ordenar su operación encuentre en Scale OS la respuesta y pruebe la
demo o el alta. Métricas: altas que declaran venir del blog, clics a demo/registro,
tráfico orgánico de cola larga y retención (lectura de novedades por clientes).

| Audiencia | Qué necesita | Qué le da el blog |
|---|---|---|
| **Dueño/a de agencia** | Ver el negocio entero, decidir | Guías de operación, previsión, casos |
| **Producción / tráfico** | Menos perseguir información | Guías de kanban, piezas, inventario |
| **Administración / finanzas** | Cobrar y controlar | Presupuestos, cobros, mora, gastos |
| **Equipo de una agencia cliente** | Novedades y cómo usar lo nuevo | Serie “Novedades” + guías de uso |

## 2. Series

| Serie | Slug | Qué es | Frecuencia |
|---|---|---|---|
| **Novedades** | `novedades` | Entrada curada por release con cambios de producto (3–5 destacados + enlace al changelog); un release sin cambios visibles no genera nota | 1–2/mes |
| **Guías de uso** | `guias` | Cómo resolver una tarea real módulo por módulo (con capturas) | 1/mes |
| **Changelog extendido** | `changelog` | Página acumulativa con todas las versiones (fuente: `NOVEDADES.md`); no es un post por release | continua |
| **Casos de uso** | `casos` | Una agencia que ordenó un proceso con Scale OS: antes/después y números de operación | 1/trimestre |
| **Detrás del producto** | `producto` | Decisiones de diseño, privacidad y construcción (confianza, E-E-A-T) | 1/trimestre |
| **Puente** | `agencias` | Temas de negocio de agencia con enlace al blog de Scale Paraguay | 1/trimestre |

Estas series respetan las secciones de PLT (`docs/BLOG-PROPUESTA.md`:
Novedades · Guías de uso · Changelog extendido · Casos de uso); “Detrás del
producto” y “Puente” se publican dentro de ellas cuando corresponde.

### 2.1 Cómo se convierte `NOVEDADES.md` en posts

Regla: **las novedades no se copian; se curan**. PLT propone una entrada por
release; esta propuesta la mantiene **solo cuando el release tiene cambios
visibles para el usuario** (si no, se acumula en el Changelog extendido), para
que la serie no sea un volcado semanal. Por cada release:

1. Tomar del archivo las secciones por dominio (Comercial, Operaciones,
   Finanzas, Plataforma, Diseño) y quedarse con 3–5 cambios que le importan al
   usuario, no con el listado completo.
2. Reescribir en lenguaje de producto con el título de la serie:
   `Novedades vX.Y.Z: [los 2 cambios más fuertes]`.
3. Cada destacado: qué cambió, para quién y cómo se usa (1 párrafo + captura).
4. Cerrar con enlace al diff público del changelog (o a la sección completa si
   el dueño autoriza) y CTA a la demo.
5. El changelog extendido (todas las versiones) puede vivir como página propia
   dentro de la serie `novedades` sin necesidad de un post por versión.

Mapa de ejemplo con los releases recientes:

| Release | Ángulo de la nota | Título de trabajo |
|---|---|---|
| v1.0.168 | Productividad: paleta de comandos, ayuda por módulo, listas por ventana | *Novedades v1.0.168: encontrá cualquier cosa desde el teclado* |
| v1.0.166 | Presupuestos y finanzas: consulta antes de editar, guardado cuidado, previsión sin contradicciones | *Novedades v1.0.166: presupuestos que no se guardan a medias* |
| v1.0.165 | Diseño y operación: tarjetas compactas, calendario de inventario, permisos por módulo | *Novedades v1.0.165: tu operación más liviana de leer* |
| v1.0.164 | Portal del cliente y equipo | *Novedades v1.0.164: el cliente ve lo que tiene que ver* |
| v1.0.162 | Carga con IA y finanzas | *Carga con IA: pasá un pedido a presupuesto en minutos* |

## 3. Títulos propuestos

> Keywords hipótesis a validar (Paraguay, español) con Keyword Planner +
> Search Console; sin volúmenes inventados.

| # | Título propuesto | Serie | Intención | Keyword principal (hipótesis) |
|---|---|---|---|---|
| 1 | Cómo ordenar la producción de una agencia sin planillas | Guías | Informacional | `software para agencias` |
| 2 | Del presupuesto al cobro: que no se te escape una factura | Guías | Informacional/BOFU | `facturación para agencias` |
| 3 | Portal del cliente: menos “¿cómo va?” y más entregas aprobadas | Guías | Informacional | `portal del cliente agencia` |
| 4 | Inventario de agencia: qué tenés, dónde está y quién lo tiene | Guías | Informacional | `inventario para agencias` |
| 5 | Mora y cobranza sin incomodidad: recordatorios en orden | Guías | Comercial | `cobranza para agencias` |
| 6 | Previsión financiera para agencias: sueldos, freelancers y fijos | Guías | Informacional | `previsión financiera agencia` |
| 7 | Permisos por rol: quién ve los salarios y quién no | Guías | Confianza | `permisos por rol software` |
| 8 | Cómo elegir software de gestión para tu agencia (checklist 2027) | Guías | BOFU | `software de gestión para agencias` |
| 9 | Novedades vX: [2 destacados del release] | Novedades | Retención | `novedades scale os` |
| 10 | Tablero de producción: el kanban que tu agencia sí va a usar | Guías | Informacional | `kanban para agencias` |
| 11 | Caso: de cinco planillas a una operación con portal | Casos | BOFU | `caso de éxito software agencia` |
| 12 | Cómo vender un plan de contenidos con precios claros | Puente | Comercial | `cómo cotizar contenido` |

Reservas: “Cómo migrar tus datos a un sistema nuevo sin frenar la operación”,
“Qué mirar en tus números para saber si la agencia gana”, “Plantillas: qué
copia Scale OS y qué no”.

## 4. Calendario de arranque (2 posts/mes)

Jueves 10:00 (hora de Asunción); arranca cuando el dueño apruebe y PLT defina
la plataforma. Se alterna Novedades con Guías/Casos.

| Fecha | Serie | Título de trabajo |
|---|---|---|
| jue 15-oct | Novedades | Novedades v1.0.168 (o el release vigente al publicar) |
| jue 29-oct | Guía | Cómo ordenar la producción de una agencia sin planillas |
| jue 12-nov | Novedades | Novedades del release de quincena |
| jue 26-nov | Guía | Del presupuesto al cobro: que no se te escape una factura |
| jue 10-dic | Caso | De cinco planillas a una operación con portal |
| jue 24-dic | Novedades | Cierre de año en el producto |
| jue 14-ene | Guía | Portal del cliente: entregas aprobadas sin idas y vueltas |
| jue 28-ene | Novedades | Novedades de enero |

## 5. Cross-linking con Scale Paraguay

Reglas comunes de los dos blogs:

- **Contexto, no intercambio**: un enlace cruzado solo cuando el lector lo
  necesita (p. ej. una guía de operación que menciona vender contenido enlaza
  la guía de estrategia de Scale Paraguay; un caso de Scale Paraguay enlaza
  Scale OS solo si el lector es agencia).
- **Máximo 1 enlace cruzado por artículo**, con ancla descriptiva y párrafo de
  contexto. Nunca una malla de enlaces “para SEO”.
- **URLs absolutas** entre dominios y UTM:
  `utm_source=blog-scale-os&utm_medium=cross&utm_campaign=<slug>` (y la
  variante inversa desde Scale Paraguay).
- **Canonical propio** en cada blog: el mismo contenido no se republica
  completo en el otro; si se retoma un tema, se escribe distinto y se enlaza.
- **Pares previstos** (a producir en ese orden):

| Scale OS (producto) | Scale Paraguay (empresa) |
|---|---|
| Cómo vender un plan de contenidos con precios claros | Cómo cotizar contenido sin perder plata |
| Cómo elegir software de gestión para tu agencia (checklist 2027) | Agencia, freelancer o equipo interno: la cuenta real |
| Caso: [agencia] ordenó su operación | Caso: [misma agencia] creció con contenido |
| Novedad del portal del cliente | Caso de entrega y aprobación con cliente real |

## 6. Tono

- **Voz de producto**: clara, profesional, sin jerga técnica innecesaria;
  “vos”; frases cortas; foco en la tarea (“hacé esto y queda así”).
- **Capturas reales** del producto (no recreaciones); datos ficticios de la
  demo cuando corresponda y aviso visible, como en la landing.
- Sin promesas de resultados ni comparaciones agresivas con competidores;
  funciones descritas como existen hoy (nada de “próximamente” sin etiqueta).
- Precios: fuente única `public/scale-os.html`; si cambian, se actualiza el
  artículo y su fecha de modificación.
- Privacidad: los datos de clientes y casos requieren permiso; los números de
  operación se publican solo con autorización.
- La guía de estilo de
  [`156-scale-paraguay.md`](156-scale-paraguay.md) §5 aplica igual (formato,
  imágenes, checklist); cambia la voz, no las reglas.

## 7. Medición

- Altas que declaran el blog (UTM + pregunta en el registro).
- Clics a demo y a registro por serie (Novedades vs. Guías vs. Casos).
- Lecturas de novedades por parte de cuentas activas (retención): publicar la
  nota y avisar dentro del producto/WhatsApp a los clientes.
- Posición media en búsquedas de gestión; revisión trimestral de títulos con
  Search Console.

## 8. Decisiones que necesita el dueño

1. Aprobar las series y la cadencia de 2 posts/mes.
2. Aprobar la plataforma y el host que propone PLT
   (`docs/BLOG-PROPUESTA.md`: MDX + `producto.scaleparaguay.com`, con
   `os.`/`novedades.` como alternativas).
3. **Quién escribe y valida las novedades** (pregunta de PLT en #157):
   propuesta — la fuente sigue siendo `NOVEDADES.md` (integrador); un
   **curador de contenido** arma la nota curada y **valida la exactitud** quien
   conoce el módulo (integrador/DSN/PLT según el cambio); el dueño aprueba las
   primeras ediciones y después delega.
4. Aprobar el primer caso de agencia y el cuestionario de números de operación.
5. Autorizar (o no) el enlace público al changelog extendido y confirmar que la
   serie “Novedades” avisa también dentro de la app.
