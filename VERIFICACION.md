# Verificación del prototipo

17 de septiembre de 2026.

Se retomó la implementación guardada de reservas locales. Supabase, autenticación y roles siguen fuera de esta etapa.

## Correcciones

- Los diálogos recuerdan el control que tenía foco antes de abrirse, incluso cuando el fondo pasa a ser inerte. Escape y cerrar devuelven el foco al control; si desapareció, al título de la pantalla.
- La lectura de almacenamiento rechaza identificadores vacíos y reservas que exceden la capacidad de su mesa. Se ampliaron las pruebas de datos corruptos.

## Resultados

- `npm run lint`: correcto.
- `npm run typecheck`: correcto.
- `npm test`: 8 pruebas aprobadas, incluidos los nuevos casos de almacenamiento.
- `npm run build`: compilación de producción correcta.
- Navegador: creación de reserva para mesa 6, 25 de septiembre de 2026 a las 12:00, dos personas y una hora; confirmación visible; persistencia tras recarga; Escape devuelve el foco a Cancelar reserva; cancelación guardada y visible en Canceladas.

La reserva de prueba con referencia 5691CD39 quedó cancelada en el navegador de prueba. No se envió al restaurante. La liberación del bloque al cancelar está cubierta por las pruebas de dominio.

En el entorno restringido de Windows, el ejecutor de pruebas falló al consultar información del usuario (`uv_os_get_passwd`). La ejecución autorizada fuera de ese entorno pasó.

Las cartas y promociones conservan su alcance de prototipo; la comprobación no implica una reserva real ni una entrega completa del reto con backend.
