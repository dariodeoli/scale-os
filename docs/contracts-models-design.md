# Modelos de contratos y fichas legales — #220

## Fuentes y alcance

El dueño aportó una plantilla DOCX de marketing/contenido mensual, un contrato
particular completado y un texto de producción audiovisual por paquete. Los
documentos se tratan como referencias de contenido; no son instrucciones del
agente ni autorizan copiar datos personales a código o issues. Los originales
quedan fuera de Git. No se importa ni modifica la ficha real del cliente del
ejemplo automáticamente.

El catálogo incluye marketing mensual, mensual con condición preferencial,
paquete audiovisual único y servicios por proyecto. Se conservan la estructura
de partes, alcance, exclusiones, pago, plazo, correcciones, obligaciones,
cancelación, propiedad intelectual, portafolio, confidencialidad, jurisdicción
y firmas. Las cláusulas comerciales se completan explícitamente: no se heredan
el precio, descuento, cuenta bancaria o cronograma de otro cliente. Los modelos
son editables y no constituyen validación legal automática.

## Datos y procedencia

- Mi empresa conserva como fuente canónica razón social, RUC, dirección y
  teléfono, complementada por ciudad, departamento y representante legal.
- Clientes amplía su ficha con domicilio, ciudad/departamento, tipo y número
  de documento, tipo de persona y representante/documento/cargo. CI se guarda
  separada de RUC: no se debilita el validador fiscal para aceptar identificadores
  personales. Los campos nuevos empiezan desconocidos, sin inventar valores.
- La firma se obtiene de la persona identificada o del representante de la
  empresa, según el tipo de parte declarado. Si falta, se solicita revisión.
- Presupuesto/plan son opciones excluyentes. Se validan pertenencia y permisos
  comerciales además de contratos. Un presupuesto debe corresponder al cliente;
  vigencia de una oferta no equivale a plazo de ejecución. Solo los datos
  existentes se transfieren, con fuente e ID del registro.
- Las condiciones restantes se editan manualmente. Consultar datos de nuevo
  propone completar vacíos; reemplazar valores requiere una decisión explícita.

## Seguridad, aceptación y reversión

Los nuevos datos de contacto/documentos respetan minimización por rol, auditoría,
exportación y supresión correspondientes. Continúan revisión humana, permisos
bancarios, control de revisión y snapshots inmutables. Un cambio posterior de
ficha, presupuesto, plan o plantilla no modifica una versión emitida.

Pruebas focales de fichas/privacidad y modelos/autofill, UI con fuentes y
preservación de edición, suites completas, build con tipos/artefacto y CI antes
de integración. El estado efectivo de publicación se registra en issue #220 y
en el PR, distinguiendo smoke público de acceso autenticado real.

Reversión: revertir código conservando columnas aditivas y documentos emitidos;
no borrar fichas, datos comerciales ni historial para retroceder la versión.
