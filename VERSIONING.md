# Versionado visible de Scale OS

La versión visible del producto se mantiene en `app/app-version.ts` y se muestra en el footer del panel. La landing pública mantiene el mismo valor en `public/scale-os.html`.

Regla de publicación: cada actualización que llegue a producción incrementa el último número de parche (`1.0.2` → `1.0.3`). No se debe publicar una actualización sin actualizar ambos puntos. Este mismo criterio debe aplicarse a las demás aplicaciones del ecosistema, usando una única fuente de versión por aplicación y un footer visible.
