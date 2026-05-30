# Conectar la app con el backend

Esta app móvil (Expo/React Native) se conecta **por internet** a un backend
que vive en **su propio repositorio**: [`recetas-backend`](https://github.com/Luis-Chow/recetas-backend).

El despliegue del backend (MongoDB Atlas + Railway) está documentado allí, en
su archivo `DEPLOY-RAILWAY.md`.

## Apuntar la app al backend

1. Despliega el backend siguiendo el `DEPLOY-RAILWAY.md` de su repo y copia su URL
   pública (p. ej. `https://recetas-backend-production.up.railway.app`).
2. En la raíz de este proyecto, crea un archivo **`.env`** (puedes copiar
   `.env.example`) con esa URL **sin `/api` ni `/` final**:

   ```
   EXPO_PUBLIC_API_URL=https://recetas-backend-production.up.railway.app
   ```

3. Reinicia Expo para que tome la variable:

   ```bash
   npx expo start --clear
   ```

Ahora **Registrarte** e **Iniciar sesión** funcionan contra el backend en la nube
desde web, emulador o un celular con Expo Go.

## Desarrollo local (sin desplegar)

Si quieres probar con el backend corriendo en tu propia PC:

1. Clona y arranca `recetas-backend` (`npm install` y `npm run dev`); queda en
   `http://localhost:4000`.
2. **No** definas `EXPO_PUBLIC_API_URL` (o déjalo vacío): la app usa `localhost:4000`
   en web/iOS y `10.0.2.2:4000` en el emulador Android automáticamente.
3. Para un **celular físico**, pon la IP local de tu PC:
   `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000` (misma WiFi) y reinicia con `--clear`.
