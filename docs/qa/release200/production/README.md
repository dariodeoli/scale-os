# Producción 1.0.200

PR #321 integrado en main ea11844b19dcf05834f6705bc19871d44195921b.
CI candidato 911ea143: frontend completo y backend aprobados. Publicación web/API verificada por versión, seis probes públicos de smoke y seis probes MCP aprobados. No se hicieron escrituras ni grants OAuth reales en producción. La ruta de consentimiento dio un 404 transitorio durante el rolling deploy y luego respondió 200; se conserva evidencia de la comprobación final.

El CI posterior de main pasó backend, pero falló en el último harness visual de ingresos: selector del botón antes de terminar la lectura inicial. Se continúa en #323 con control de respuesta demorada y corrección de espera; no se presenta este CI de main como aprobado. #312 conserva pendiente la conexión desde cuentas reales de Claude y ChatGPT; #322 conserva el defecto REST de plan automático. El SHA del proveedor no es expuesto por health/footer; sólo se verificó la versión pública y se registra el SHA de integración por separado.
