# Decisiones de esta etapa

Fecha: 17 de septiembre de 2026.

## Alcance autorizado

El usuario pidió corregir y completar el código del prototipo de restaurante, dejando Supabase, autenticación y roles para después. Se conserva Next.js + TypeScript + Tailwind. No se migra de lenguaje ni se crean cuentas o infraestructura.

## Reservas locales

Alternativas: simular sin persistencia, almacenamiento local o backend ahora. Se elige almacenamiento local con validación y Web Locks cuando están disponibles. Permite probar el flujo sin servicios externos. Se sacrifica sincronización entre dispositivos y cualquier garantía de seguridad de servidor. La UI comunica esta limitación.

## Identidad y referencias

Se usa Noir Eclipse de forma consistente. Las imágenes de carta con la marca Terra se aprovechan como fondos recortados mediante CSS, con títulos accesibles de Noir Eclipse. No se altera el archivo original. El salón usa salon-default.png con todas las mesas negras. TablePlan superpone controles sobre las mesas; los colores responden a hover/foco, selección y disponibilidad local.

## Reglas del prototipo

Horarios en America/Costa_Rica, intervalos de 30 minutos, visitas de 1–3 horas, operación 07:00–21:00 y anticipación mínima de 30 minutos. Cancelación hasta 2 horas antes. Mesas con capacidades de demostración explícitas. La lógica de UI no se considera una implementación de servidor del reto.

## D1–D5 del reto

- D1: pendiente definir semana al incorporar identidad y cuota semanal.
- D2: pendiente formalizar el cómputo semanal; las canceladas sí liberan disponibilidad local.
- D3: pendiente la desactivación administrativa de salas/mesas.
- D4: pendiente incorporar rol admin y su cuota.
- D5: en el prototipo se releen las reservas al confirmar y se informa cuando la mesa ya no está disponible; pestañas compatibles usan Web Locks. El backend deberá resolver conflictos transaccionalmente y devolver un error de dominio.

Estos pendientes no se presentan como requisitos completos. La discrepancia entre coworking/restaurante y dev/develop deberá resolverse antes de la entrega del reto.

