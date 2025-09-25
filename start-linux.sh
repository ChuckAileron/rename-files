#!/bin/bash
# Compila el frontend solo si la carpeta dist no existe y lanza la app Electron en modo producción (Linux)

if [ ! -d "dist" ]; then
  echo "Compilando frontend..."
  npm run build
else
  echo "La carpeta dist ya existe, omitiendo compilación."
fi

# Ejecuta Electron
npm run electron
