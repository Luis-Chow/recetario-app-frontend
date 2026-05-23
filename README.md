# Recetario App — Frontend

Aplicación móvil de recetario desarrollada con React Native y Expo.

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Git](https://git-scm.com/)

## Instalación

```bash
git clone https://github.com/Luis-Chow/recetario-app-frontend.git
cd recetario-app-frontend
npm install --legacy-peer-deps
```

## Cómo probar

### En el navegador (web)
```bash
npx expo start --web
```
Se abre automáticamente en `http://localhost:8081`

### En celular (Android / iOS)
1. Instala **Expo Go** desde Play Store o App Store
2. Corre `npx expo start --tunnel`
3. Escanea el código QR con Expo Go

### En emulador Android
1. Instala [Android Studio](https://developer.android.com/studio)
2. Crea un dispositivo virtual (API 33+)
3. Inicia el emulador
4. Corre `npx expo start` y presiona `a`

## Funcionalidades implementadas (Avance 1)

- Registro e inicio de sesión de usuarios
- Validación de email duplicado en registro
- Edición de perfil y eliminación de cuenta
- CRUD completo de recetas (ingredientes, pasos, tiempo, porciones)
- Recetas ordenadas alfabéticamente con buscador
- Vista de todas las recetas y vista de mis recetas personales
