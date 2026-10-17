# Scale1.0.193 — acceso y recursos iniciales

## Cambio

Refs#252. Las secciones y formularios del workspace se cargan al abrirse. Los componentes y helpers comunes usan `owncoding-ui/core`; BancoLogo usa financial y BancoCombobox permanece en root dentro del formulario diferido. Conserva objetos, cálculos, historial, permisos y controles. El shim legado de declaraciones de Scale continúa con sus límites previos; no se agregaron any ni copias de motores para el subpath.

## Paquete publicado

OwnCodingUI0.68.18, PR58 yPR60. CI58candidato39046689212/main39046873667 yCI60candidato39047613600/main39047772035 PASS. Mainfinalcb6ee80bd59b9655dbbe37867bd413f00f194e25; taganotadov0.68.18objeto3941ab45614c1c212f2942a5aaa3e89171864705 verificado enremoto. PackSHA256dfcdf2136ea1758102ba4cc588ce0e8023fd0d7bbdb108a878183e879c03936b.

InstalaciónGitreal fijada altag/mainpublicado:48archivosdistidénticos alpackfinal ylos17archivosJavaScript del candidato medido son idénticos. El subpathcore contiene55exports conidentidadroot compartida yclausura física146.912Braw/42.933gzip sinactivosfinancieros. Galeríawebmanualseparada,sinpublicaciónacreditada.

## Validación local previa a preparar versión

Nextproduction conrewritesexclusivos aAPIlocal4115; fixturePG55450. Tipos/buildPASS;16gruposbrowserobligatoriosPASS. Guards deacciones/arquitectura30PASS, conservando55widgets revisados ytodos sus hashesJSX. Focalesstartup/carga22PASS. Guard deartefactos inicialeslogin/status/registroPASS, yfallo esperado antebuildhistóricoconartebancario. Evidencia[comparativa](performance-initial-load-252/COMPARISON.md) y[artefactos](performance-initial-load-252/INITIAL-ASSETS.md).

Seiscargas con1.6Mbps/150ms/CPU4x:login1440/390 de15.587/14.120ms a3.891/3.947ms; scripts−82,5%. Resumen−62–65%. Balance completo−4–6% porque el catálogofinanciero sigue siendo pesado al abrirse; seguimiento#254. Son mediciones sintéticas del mismo protocolo, no de la conexión del dueño ni de producción.

Smoke32rutas(16×1440/390)ycuentaBanco39assertsUI aprobadas,cero erroresruntime/proveedores. Se conserva el fallo original del últimoassert delharness,cuya whitelist omitía heartbeat. La auditoría posterior reclasifica102writesbloqueadas(67analytics+35presence),sinwriteinesperada ni persistencia; no se presenta como replay exitoso delrunneroriginal. LogoContinental realdecoded einput/cancel comprobados.

## Incidente y publicación

#253: el17/10/2026desde12:40America/Asuncion laAPIpública respondió503texto`no available server`; elregistrodelusuarioconfirmóauth/me,providers ymaintenance503. No se atribuye causa de contenedor/base/memoria sinlogsCoolify. La optimización del frontend y la recuperación de disponibilidad se verifican por separado.

Preparación193 completada en árbol`89bb98c298b1b3e65978d23ce7f5821cf45e2a6a`:263entradas/45fragmentosfrontendPASS,58scriptsbackendPASS,buildNext/tipos/BUILD_IDPASS,16gruposbrowserPASS,guardinicial/release:check/footer:checkPASS. El primer`release:patch --prepare` hizo el único bump193 y falló en una comprobación antigua que exigía la ruta root del import; se actualizaron las comprobaciones a core y se agregó identidad estricta del footer. Se completaron todas las fases restantes y se creó el commit193 sin repetir el bump.

QAfinal delpaquetepublicado yárbol193:[FINAL-193.md](performance-initial-load-252/FINAL-193.md),2cargaslogin1440/3903.917/3.875s,406.885bytesScript;Balance/cuenta12PASSincluyendofocoyteclado;catálogo39PASS,0API/proveedores/errores. ElAPIlocalconservametadata191,backend193validadoaparte58scripts. BuildID`dSZ_lw7OrMdFchCDke00b`,rewritesexclusivos4115. Artefactosiniciales:login1.222.486Braw/366.485Bgzip;status647.631/194.913;registro917.676/278.445,todossinartefinanciero. Lasúltimaspruebasnocambianlafuente;nohubonuevascapturas.

CI/merge/smokepúblico193 pendientes al redactar. No se hizo undeploy adicional delSHA192. La próxima publicación autorizada debe hacerse una vez para el nuevoSHA, con ambos servicios yhealthdatabase ready comprobados. Sinmigracionesnuevas; backend sólo metadata deversión.
