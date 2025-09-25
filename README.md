# Renombrar Archivos - Desktop App

Aplicación de escritorio multiplataforma (Electron + React + TypeScript) para renombrar archivos en lote de una carpeta, permitiendo:
- Buscar y reemplazar substrings en los nombres
- Agregar prefijo y/o sufijo a los archivos
- Seleccionar archivos a renombrar
- Interfaz moderna y simple

## Requisitos
- Node.js >= 18
- npm >= 9
- (Linux) netcat (`nc`)

## Instalación

1. Clona el repositorio o copia los archivos en tu equipo.
2. Instala las dependencias:
   ```sh
   npm install
   ```

## Uso



## Uso

### Windows
```bat
start-windows.bat
```

### Linux
```sh
chmod +x start-linux.sh
./start-linux.sh
```

Ambos scripts detectan si es necesario compilar el frontend (modo producción) y abren la aplicación de escritorio Electron automáticamente. Si ya existe el build, la app arranca instantáneamente; si no, primero compila y luego abre la app.

## Características
- Selecciona una carpeta y lista todos los archivos.
- Marca/desmarca archivos a renombrar.
- Busca y reemplaza substrings en los nombres.
- Agrega prefijo y/o sufijo a los nombres.
- Renombra todos los archivos seleccionados de una vez.
- Spinner de carga para operaciones con latencia.
- Interfaz moderna y responsiva.

## Configuración avanzada
- El puerto usado por defecto es `39417`. Puedes cambiarlo editando los scripts y `webpack.config.js`.

## Notas
- No requiere servidor backend, todo es local.
- No hay barra de menú, toda la funcionalidad está en la ventana principal.
- Los cambios de nombre son irreversibles, ¡usa con precaución!

## Licencia
MIT
