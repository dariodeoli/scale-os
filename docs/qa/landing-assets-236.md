# Capturas de la landing — #236

Las imágenes muestran interfaces reales. No se generaron pantallas ni datos de clientes reales.

- `public/landing/producir-960.webp`: captura de producción ya publicada en la landing, reutilizada también en el hero.
- `public/landing/contratos-demo.webp`: captura nueva del selector de modelos en la demo anónima local de QA, tomada el 17 de octubre de 2026 a 1440 × 1000. Servidor QA `127.0.0.1:3007`, API local 4107, fuente `89df4755`. Se abrió un contexto de navegador independiente, se inició una demo sintética y se consultó la vista previa del modelo. No se creó una plantilla ni se emitió un contrato.
- `public/landing/balance-demo.webp`: captura real del Balance con datos sintéticos de la campaña QA #221, original `/tmp/scale-qa221/pagos-balance-1440.png` (1440 × 1457). El pie de la imagen conserva la versión que estaba bajo prueba cuando se capturó.

Para la nueva captura de contratos se ocultó exclusivamente el portal de herramientas de desarrollo de Next (`nextjs-portal`) en el contexto de captura. La imagen no fue retocada. Se codificó a WebP, calidad 85, conservando sus dimensiones y contenido. La adaptación de Origin para iniciar la demo se limitó al POST de fixture contra localhost, siguiendo el harness de QA; no hubo navegación ni cambios en producción. Los destinos externos se bloquearon.

Original nuevo: `/tmp/scale-access236/contracts-capture-final.png`. Script local de la sesión: `/tmp/capture-contract236-demo.mjs`. Los pies públicos de las dos capturas nuevas identifican los datos de demostración.
