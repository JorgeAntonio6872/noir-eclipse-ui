# Noir Eclipse

Prototipo web de reservas de restaurante con Next.js App Router, TypeScript y Tailwind. Esta etapa funciona en el navegador: Supabase, cuentas, roles, RLS y servidor de reservas se incorporarán después, por decisión del usuario.

## Ejecutar

Abre una terminal en la carpeta que contiene este archivo y `package.json` (hay una carpeta exterior con el mismo nombre).

Requisitos: Node.js 22 o posterior y npm. Se probó con Node.js 26.9.0.

```sh
npm ci
npm run dev
```

Abre http://localhost:3000. No requiere cuentas ni variables de entorno.

Para producción local:

```sh
npm run build
npm start
```

## Funciona en esta etapa

- Inicio, carta por categorías, promociones y panel de usuario adaptable a móvil.
- Borrador de reserva conservado al navegar por la aplicación.
- Personas (1–8), fecha, hora y duración (1–3 horas).
- Disponibilidad local por mesa, capacidad y solapes de horarios.
- Confirmación, almacenamiento, listado de próximas/pasadas/canceladas y cancelación.
- Perfil local con nombre; reglas, ayuda e información de datos.
- Historial del navegador mediante fragmentos de URL, teclado, Escape y diálogos con foco contenido.
- Datos persistidos en `localStorage`, clave `noir-eclipse.v1`. Borrar datos del sitio los elimina.

## Comprobaciones

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Los tests verifican fechas de Costa Rica, anticipación, cierre, solapes parciales y adyacentes, cancelaciones, capacidad y almacenamiento corrupto.

Prueba manual: crea una reserva futura, recarga, verifica su presencia en Mis reservas, intenta elegir la misma mesa en un horario superpuesto y cancela la primera reserva para liberar el horario. El borrador se conserva al cambiar pantallas, pero se reinicia al recargar o confirmar.

## Estructura

- `app/page.tsx`: entrada de servidor.
- `app/ui/noir-app.tsx`: interfaz interactiva y coordinación del prototipo.
- `app/ui/dialog.tsx`: diálogo y panel lateral accesibles.
- `lib/reservations.ts`: tipos, validaciones y reglas de disponibilidad.
- `tests/reservations.test.ts`: reglas de dominio.
- `public/design/`: referencias visuales originales.

Modelo local: un objeto versionado contiene el nombre y las reservas. Cada reserva tiene identificador, mesa, personas, inicio ISO, duración, estado y fecha de creación. Las capacidades están centralizadas en `TABLES` y son datos de demostración.

## Límites deliberados

No envía reservas al restaurante. No sincroniza dispositivos, autentica usuarios, procesa pagos ni aplica autorización de servidor. Web Locks serializa escrituras entre pestañas del mismo origen en navegadores compatibles; esto no reemplaza una transacción de base de datos. En navegadores sin Web Locks se vuelve a comprobar disponibilidad antes de guardar, sin garantía de exclusión simultánea entre pestañas.

No se implementa todavía el límite semanal por usuario, administración, notificaciones, backend o despliegue. Las cartas aún no tienen productos/precios: muestran estados de preparación en lugar de inventar un catálogo. El plano del salón es interactivo: cada mesa de la imagen es un botón. Negro indica disponible, verde indica hover o foco, naranja indica selección en configuración, rojo indica reserva solapada y gris indica capacidad insuficiente.

El informe exterior `AUDITORIA.md` describe la versión anterior a estos cambios. Esta versión sigue sin representar la entrega completa del reto de coworking.


## Flujo actualizado: fecha, mesa y usuario local

Selecciona fecha y hora encima del plano (desde hoy hasta el 31 de diciembre del año actual, según Costa Rica). La consulta usa la duración del borrador, inicialmente una hora. Selecciona una mesa y completa personas, duración y ocasión opcional. La capacidad está temporalmente desactivada. La duración y los solapes se vuelven a comprobar antes de guardar.

El botón de confirmación brilla cuando los datos son válidos y la mesa está disponible. Sin sesión, abre acceso/registro y conserva el borrador; al autenticar localmente, confirma la reserva pendiente. Con sesión, confirma directamente. El naranja se limita a la pantalla de configuración y se limpia al salir. Las reservas se consultan en el plano según fecha, hora y duración.

Las cuentas de demostración se guardan en `noir-eclipse.accounts.v1`, con sal y hash PBKDF2; la sesión está en sessionStorage. Esto no es autenticación de servidor, no verifica correos ni sincroniza dispositivos y no ofrece recuperación de contraseña. Cada cuenta muestra sus propias reservas nuevas. Las reservas anteriores sin usuario se conservan y siguen bloqueando sus horarios, pero no se asignan automáticamente a una cuenta.

Verificación: diez pruebas de reglas y usuarios, lint, TypeScript y compilación. Prueba de navegador: registro durante confirmación, reserva guardada, disponibilidad ocupada y limpieza de selección al volver al plano. Las secciones anteriores describen también etapas previas; este flujo reemplaza el orden anterior y la ausencia de cuentas locales.
