# Scale 1.0.194 — pendientes de operación y rendimiento

Entrega en preparación sobre main193 `2ecdc7f38f466f29a37194783726b985583a5b0e`.

## Cambios previstos

#250 jerarquía de Contratos; #249 agendaHoy móvil Estudio; #206 tareas compactas y lista/cuadrícula; #184 contactos secundarios; #186 preferencias persistentes; #254 logos bancarios diferidos. Se conserva la evidencia pública de193 y la auditoría de aceptación individual en docs/audits/194-backlog-status.md.

OwnCoding UI0.68.19: PR upstream62 integrado en `7cf63ad530384b2887551ddb50c9261270762202`; CI candidato39070853594 y main39071017582 aprobados. Tag anotado19 publicado una sola vez: objeto4646afaed33f4416f1c83cdfbb2018b1001489ab, destino7cf63ad. APIs legacy conservadas;89dataURI y108SSR idénticos. Caps anteriores intactos. Galería web no desplegada/acreditada.

## Evidencia previa e integración

Los agentes entregaron focales, tipos y navegadores con componentes reales y transporte sintético para249/206/184. APIcontactos fue probada además con PostgreSQL real y conflictos200+409/supresión-create409. Preferencias cubre migración condicional, carreras, aislamiento y cleanup. Las dos nuevas migraciones combinadas y su reinicio aprobaron116entradas. Estas pruebas no equivalen aún al candidato Next194 ni a producción.

## Gates y publicación

Pendientes al redactar: adopción final del paquete Git publicado, política de localidades208 si su instalación queda verificada, refresh exhaustivo del inventario de acciones, QA integrada194/207, release --prepare con un solo bump, PR/CI, merge y smoke público. No se inició un deploy194.

## Límites externos

No se acreditan OAuth real, proveedores comerciales Groq/OwnData, conciliación operativa, Search Console, impresión/escaneo físico, causa de la caída Coolify ni planificador persistente de agentes. El acceso público193 fue comprobado nuevamente200 ydatabase ready el17/10/2026 21:16UTC (18:16America/Asuncion). No atribuir versión al SHA de contenedor que el proveedor no expone.
