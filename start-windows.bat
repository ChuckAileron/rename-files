@echo off
REM Compila el frontend solo si la carpeta dist no existe y lanza la app Electron en modo producción (Windows)

if not exist dist (
  echo Compilando frontend...
  npm run build
) else (
  echo Carpeta dist ya existe, omitiendo compilación.
)

REM Ejecuta Electron
npm run electron
