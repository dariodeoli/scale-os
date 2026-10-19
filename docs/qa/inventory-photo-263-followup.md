# Seguimiento privado de fotos de inventario — #263

Comprobación posterior al despliegue 1.0.195, sobre `main`
`fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`.
Fecha: 18/10/2026, 23:35–23:36, America/Asuncion
(19/10/2026, 02:35–02:36 UTC).

## Resultado comprobado

- `node backend/test-inventory-reservations.mjs`: PASS. Matriz HTTP real local y
  236 casos PGlite; conservación de bytes/sello, referencias proxy/core-api,
  recuperación auditada de solo lectura, límites ante borrado/reemplazo, enlaces
  circulares finitos, roles, aislamiento y enlaces HTTPS externos.
- `node --check backend/inventory-reservations.js` y
  `node --check backend/scripts/test-inventory-photo-http.mjs`: PASS.
- GET público sin sesión, con `redirect: 'manual'`, de las fotos 50, 43 y 42:
  **401**, JSON y sin `Location`, en los tres casos. Esto acredita el control de
  acceso; no acredita que sus imágenes privadas estén disponibles.
- La configuración actual del entorno no proporciona capacidades, secretos,
  variables de ejecución ni identidades externas para acceder al inventario de
  producción. No se usaron sesiones locales de prueba contra producción.

No apareció un defecto nuevo que justifique modificar el código o desplegar de
nuevo. No se modificaron registros, fotos ni auditorías de producción. No se
repitió PostgreSQL real: su matriz de concurrencia ya está acreditada en la
entrega 195 y esta revisión no cambia código.

## Verificación mínima que falta

Con una sesión legítima de la empresa afectada, abrir Inventario y mostrar los
tres equipos reportados (IDs 50, 43 y 42), tanto en listado como en cuadrícula.
En Red del navegador, filtrar `/inventory/` y `/photo`, desactivar caché para esa
lectura y recargar una vez. Anotar por cada ID:

| ID | Código HTTP final | ¿Imagen correcta visible? | ¿Bucle de redirecciones? |
| --- | --- | --- | --- |
| 50 | Pendiente | Pendiente | Pendiente |
| 43 | Pendiente | Pendiente | Pendiente |
| 42 | Pendiente | Pendiente | Pendiente |

- **200 + imagen correcta:** caso privado validado.
- **422 sin `Location`:** bucle detenido, pero falta una fuente original válida
  para ese registro. Conservar el seguimiento abierto; revisar evidencia
  auditada o una copia original verificada antes de cualquier recuperación.
- **401/403:** resolver la sesión o pertenencia de la empresa; no interpretar
  como desaparición de la foto.
- **404:** comprobar que el equipo está visible y que tiene una imagen; no
  restaurar contenido borrado o archivado automáticamente.
- **302:** comprobar que apunta a la fuente HTTPS externa esperada; no debe
  volver al propio endpoint ni formar una cadena circular interna.

Para informar el resultado bastan ID, estado y confirmación visual. No compartir
cookies, credenciales, imágenes privadas ni un HAR completo. El issue permanece
abierto hasta acreditar los tres casos o documentar y resolver cada original
faltante con su fuente autorizada.
