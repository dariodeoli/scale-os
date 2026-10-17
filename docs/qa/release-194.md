# Scale 1.0.194 — pendientes de operación y rendimiento

Entrega en preparación sobre main193 `2ecdc7f38f466f29a37194783726b985583a5b0e`.

## Cambios previstos

#250 jerarquía de Contratos; #249 agendaHoy móvil Estudio; #206 tareas compactas y lista/cuadrícula; #184 contactos secundarios; #186 preferencias persistentes; #254 logos bancarios diferidos; #208 relación opt-in de localidad con procedencia y carga manual preservada. Se conserva la evidencia pública de193 y la auditoría de aceptación individual en docs/audits/194-backlog-status.md.

OwnCoding UI0.68.19: PR upstream62 integrado en `7cf63ad530384b2887551ddb50c9261270762202`; CI candidato39070853594 y main39071017582 aprobados. Tag anotado19 publicado una sola vez: objeto4646afaed33f4416f1c83cdfbb2018b1001489ab, destino7cf63ad. APIs legacy conservadas;89dataURI y108SSR idénticos. Caps anteriores intactos. Galería web no desplegada/acreditada.

## Evidencia previa e integración

Los agentes entregaron focales, tipos y navegadores con componentes reales y transporte sintético para249/206/184. APIcontactos fue probada además con PostgreSQL real y conflictos200+409/supresión-create409. Preferencias cubre migración condicional, carreras, aislamiento y cleanup. Las dos nuevas migraciones combinadas y su reinicio aprobaron116entradas. Estas pruebas no equivalen aún al candidato Next194 ni a producción.

## Gates y publicación

SDK19 instalado desde el tag Git publicado en frontend y backend, resolución fija7cf. El lockfile inicial frontend reutilizaba18 pese a pedir19; se regeneró con instalación explícita y se comprobó versión+SHA reales antes del build. Ver integration-194/published-package19.json:89 recursos instalados verificados por SHA256 contra baseline. No se afirma identidad binaria de273 archivos: los53 grupos diferidos reciben hashes de chunk distintos según rutas virtuales absolutas de source maps; sus módulos de runtime y89 claves/activos coinciden exactamente. No se modificó el tag.

208 valida selección ID/pareja/versión del catálogo heredado y permite carga manual con procedencia, sin atribuir autoridad oficial. Su candidato193+208 pasó59 scripts backend y DockerNode24Alpine completo congit/SDK19; runtime sin red importó módulos reales. CA pública temporal vía secreto deBuildKit, sin desactivar TLS/checksums. El candidato194 agrega además contactos y preferencias y ejecutará61 scripts backend.

Pendientes al redactar: QA integrada194/207, release --prepare con un solo bump, PR/CI, merge y smoke público. No se inició un deploy194.

## Límites externos

No se acreditan OAuth real, proveedores comerciales Groq/OwnData, conciliación operativa, Search Console, impresión/escaneo físico, causa de la caída Coolify ni planificador persistente de agentes. El acceso público193 fue comprobado nuevamente200 ydatabase ready el17/10/2026 21:16UTC (18:16America/Asuncion). No atribuir versión al SHA de contenedor que el proveedor no expone.
