# Scale1.0.196 — continuidad del plan

Preparación sobre main195 `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`. Pedido del dueño: continuar con varios agentes y terminar lo pendiente. Este registro previo a publicación no afirma merge ni deploy196.

## Cambios

- #212: respuestasIA vacías, JSON inesperado, texto con controles o truncado se rechazan; errores conocidos del proveedor usan mensajes propios. Borrador, contrato y versiones se conservan. La asistencia sigue siendo opcional y de revisión humana, sin envío de datos contractuales reales al proveedor.
- #158: imágenesOG/Twitter/Article absolutas al origen público del blog, alt y BreadcrumbList canónico.
- #253: smoke público exige base lista y comprueba auth/me anónimo401JSON, proveedores y mantenimiento por el proxy de la web. El caller del release ejecuta explícitamente la función y propaga fallos, sin cambiar el modo --prepare ni repetir push/deploy.
- #277: auditoría de dependencias reproducible en los dos lockfiles; parches compatibles sujetos a instalación y gates del árbol consolidado.
- Seguimiento: auditorías de OwnCodingUI19, bancos/localidades, etiquetasCode39 y fotos. Se incorpora la evidencia final195 que se guardó tras su publicación, evitando otro deploy de aquella versión.

## Pruebas y riesgos

Focales de cada agente en sus informes; revisión independiente de contratos apta. Gates locales aprobados:267entradas frontend/49fragmentos, buildNext15.5.27 con64páginas/tipos y BUILD_ID `rZ9xEPgWKlMRW2H_Vs8Ks`,61scripts backend,19grupos browser, assets iniciales, versiones/footer. CI y publicación aún pendientes. No hay nuevas migraciones ni cambios de datos operativos. Conservar tablas, documentos emitidos, fotos e historial al revertir código; no borrar migraciones.

## Dependencias externas

No se cierra un issue con pruebas simuladas cuando exige proveedor o hardware real. La configuración administrada actual no ofrece secretos, Coolify, DB productiva ni scheduler durable. Se guardó borrador de red para los cinco hosts públicos de auditoría y requisitosGroq (incluye api.groq.com); guardar no aplica ni publica cambios. El usuario debe revisar y guardar en ajustes y publicar el entorno para usar esa configuración; los secretos se ingresan allí, nunca por chat.

| Issue | Falta para aceptación completa |
| --- | --- |
| #212 | Configurar IA_API_KEY autorizada y verificar respuesta real sin datos privados. |
| #213 | Habilitación comercial OwnData y configuración privada del proveedor; no usar claves de galería. |
| #214 | Fuente operativa real y responsable que confirme conciliación. |
| #215 | Modelo de impresora, soporte/tamaños y cantidad de papel. |
| #216 | Imprimir y leer etiquetas en equipo físico. |
| #158 | SearchConsole/CrUX y mediciones reales de campo. |
| #246 | Scheduler soportado que despierte agente cinco veces cada45min; no está programado,0/5. |
| #253 | Logs/estado internoCoolify para causa raíz histórica; disponibilidad195 recuperada. |
| #263 | Verificar autenticado las fotos de activos50,43,42; no se afirma recuperación de originales. |

La auditoría de layout240 de195 conserva su excepción403local y resultado original; no se reetiqueta como PASS global ni se atribuye cobertura física/Safari/OAuth real.

## Fuente compilada

Commit de release `dbe3dccca276d2f82ba9bd148d250d443e924542`, árbol `a42f7d0702f10b405a56bd6e576d76b83c2a070b`. El registro posterior sólo añade evidencia documental. Preparación ejecutada una vez, sin push/webhook/smoke; la publicación se realizará por PR/merge protegido.
