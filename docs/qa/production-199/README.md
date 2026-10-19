# Vigencias anteriores — 1.0.199 publicada

19/10/2026 · America/Asuncion. Issue [#303](https://github.com/dariodeoli/scale-os/issues/303), PR [#304](https://github.com/dariodeoli/scale-os/pull/304).

Se puede cargar una vigencia anterior al primer acuerdo. Ejemplo comprobado:01/10/2026 se registra hasta12/10, conservando íntegro el acuerdo del13/10. Cada mes proyecta un solo importe por cliente. Una fecha dentro de un período ya registrado no sobrescribe su snapshot; los meses financieros cerrados siguen protegidos.

- Código `e5bff2ad`; release preparado `e1e8748d`; candidato `9afb405132c33f8f9468a5cb03a8f91dd5e2544b`.
- Main `d3ed097efb096d288581028572c04683f1f85288`, merge13:47:07 America/Asuncion. Árbol idéntico al candidato.
- [CI candidato39287216455](https://github.com/dariodeoli/scale-os/actions/runs/39287216455): frontend/backend aprobados. [JSON](candidate-ci.json).
- [CI main39288397251](https://github.com/dariodeoli/scale-os/actions/runs/39288397251): frontend/backend aprobados. [JSON](main-ci.json).
- Gate local:275 entradas frontend/55 fragmentos, build64 páginas y61 scripts backend aprobados. [Evidencia focal y release](../client-backdating-303/local-validation.json).
- [Smoke público](smoke.txt): seis controles PASS, web/registro199, API199 con base ready, anónimo401JSON y endpoints públicos200JSON.
- [Tres observaciones consecutivas](observations.json): web/API199, base ready y marcas de tiempo.

Un único merge activó la publicación; no se repitieron webhooks ni deploy. El proveedor no expone su SHA interno ni BUILD_ID: no se acredita esa identidad por inferencia. Las pruebas funcionales usaron datos sintéticos/PGlite; no se modificaron clientes reales en producción para probar el cambio.

La revisión independiente confirmó corregida una lectura concurrente: condiciones y revisión se obtienen en la misma sentencia SQL. Reintentos, revisiones obsoletas, límites diarios, balance mensual, snapshot posterior íntegro y cierre financiero comprobados. La prueba negativa reprodujo el error exacto del dueño antes del fix. Un primer script adicional de lecturas públicas falló por su regex de comentarios HTML sobre el footer SSR; corregido el script, las tres lecturas se aprobaron sin cambios del producto ni otro deploy.

Sin migraciones, cambios visuales ni cambios de permisos. Reversión por PR conservando acuerdos históricos, cobros y datos; no borrar la base.
