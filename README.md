# mis-mods

Mods de Claude Code.

## uso-limites

Una franja fija sobre el cuadro de texto con los tokens consumidos en la sesión y dos barras: el % usado del límite de 5 horas y del límite semanal, con cuánto falta para que se renueven. Funciona en Windows, macOS y Linux, en la terminal y en la app de escritorio. Más detalles en [plugins/uso-limites/README.md](plugins/uso-limites/README.md).

### Instalación

En el prompt de una sesión de Claude Code en la terminal:

```
/plugin install uso-limites --marketplace tasatasaok/mis-mods
```

Respondé `y` para agregar el catálogo y elegí el alcance de usuario (user) para que se cargue en todas las sesiones.

Desde una terminal:

```
claude plugin install uso-limites --marketplace tasatasaok/mis-mods
```

En la app de escritorio: hacé clic en + al lado del cuadro de texto, después en Plugins, agregá el catálogo (Add marketplace) `tasatasaok/mis-mods` y luego el plugin (Add plugin).
