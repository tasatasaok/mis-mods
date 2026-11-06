# uso-limites

Mod de Claude Code que muestra, en una franja fija sobre el cuadro de texto:

- **Tokens de la sesión**: el total consumido (hilo principal y subagentes), con el detalle de entrada, salida y caché.
- **Barra del límite de 5 horas**: % usado, % libre y cuánto falta para que se renueve.
- **Barra del límite semanal**: lo mismo para la ventana de 7 días.

Las barras cambian de color: verde por debajo del 60 %, amarillo hasta el 85 % y rojo desde ahí. Los límites solo aparecen con una suscripción (Pro/Max); en una sesión nueva se muestra el último dato conocido, marcado como "dato anterior", hasta la primera respuesta.

Funciona en Windows, macOS y Linux, en la terminal y en la app de escritorio.
