# Concurso Intercolegial de Proyectos y Videos 🎥🏆

Aplicación web desarrollada con **Ionic Framework (Angular Standalone Components)** y **Supabase**, diseñada para la inscripción, exhibición, moderación y votación pública de proyectos audiovisuales de estudiantes.

---

## 🌟 Características Principales

1. **Inscripción de Proyectos:**
   - Formulario público para registrar:
     - Institución Educativa (I.E.)
     - Nombre del Proyecto
     - Enlace del video de YouTube (detección y previsualización automática de miniatura)
     - Integrantes del equipo (chips dinámicos)
   - Los proyectos quedan inicialmente en estado **`pending` (Pendiente de Aprobación)** para moderación.

2. **Galería Pública de Videos:**
   - Tarjetas ligeras con miniatura oficial de YouTube en alta resolución.
   - Reproductor responsivo embebido (`youtube-nocookie.com`) en ventana modal.
   - Búsqueda en tiempo real por proyecto, institución o estudiante.
   - Filtro por institución educativa.

3. **Prevención de Votos Duplicados (Sin Login):**
   - Huella digital de navegador (`FingerprintJS`) combinada con UUID persistente en `localStorage`.
   - Restricción única en base de datos: `UNIQUE(device_id, project_id)`.
   - Función atómica PostgreSQL (`toggle_like`) con control transaccional y actualización optimista en el cliente.
   - Voto alternable (el usuario puede dar like o retirar su like en cualquier momento).

4. **Votación a Ciegas y Podio de Resultados:**
   - Durante el concurso, el contador de votos se mantiene oculto al público para garantizar total imparcialidad.
   - Sección de **Resultados** con podio de ganadores (1º Oro, 2º Plata, 3º Bronce), barras de progreso porcentuales y tabla general de posiciones, activable por el administrador.

5. **Panel de Administración con Guard de Seguridad:**
   - Ruta `/admin` protegida con `authGuard` para impedir acceso no autorizado.
   - Autenticación con **Supabase Auth** (Email y Contraseña) en `/admin-login`.
   - Bandeja de moderación: Pendientes, Aprobados y Rechazados.
   - Switches de control maestro:
     - *Votaciones Públicas* (Activar / Pausar)
     - *Publicar Resultados al Público* (Revelar podio y conteo de votos)
     - *Inscripciones de Proyectos* (Habilitar / Cerrar convocatorias)

---

## 🚀 Guía de Configuración Rápida

### 1. Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### 2. Configurar la Base de Datos en Supabase
1. Ingresa a [database.new](https://database.new) y crea un nuevo proyecto en Supabase.
2. Ve a la sección **SQL Editor** en el panel de Supabase.
3. Copia el contenido del archivo [`supabase/schema.sql`](file:///d:/Repos/Proyectos/concurso-videos-app/supabase/schema.sql) y ejecútalo.
   - *Este script creará las tablas `projects`, `likes`, `contest_settings`, las políticas RLS y la función `toggle_like`.*
4. En la sección **Authentication > Users**, haz clic en **Add User** > **Create user** y crea el usuario administrador (ej. `admin@concurso.edu.co` y tu contraseña).

### 3. Configurar Credenciales en el Frontend
Abre el archivo [`src/environments/environment.ts`](file:///d:/Repos/Proyectos/concurso-videos-app/src/environments/environment.ts) (y `environment.prod.ts`) y coloca la URL y Anon Key de tu proyecto Supabase (disponibles en **Project Settings > API**):

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU-ID-DE-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-ANON-PUBLIC-KEY'
};
```

### 4. Ejecutar el Proyecto en Local
Desde el directorio del proyecto:

```powershell
npm start
# o alternativamente con Ionic CLI:
ionic serve
```

La aplicación estará disponible en `http://localhost:8100/` (o `http://localhost:4200/`).

---

## 📁 Estructura del Código

```
concurso-videos-app/
├── supabase/
│   └── schema.sql                # Script de base de datos, RLS y funciones RPC
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth-guard.ts # Angular canActivateFn con sesión Supabase
│   │   │   ├── models/
│   │   │   │   └── contest.models.ts
│   │   │   └── services/
│   │   │       ├── supabase.ts   # Cliente central de Supabase Auth & DB
│   │   │       ├── device.ts     # FingerprintJS + persistencia de dispositivo
│   │   │       ├── youtube.ts    # Extractor de IDs y miniaturas de YouTube
│   │   │       ├── project.ts    # CRUD de proyectos y ajustes
│   │   │       └── vote.ts       # Toggle atómico de likes
│   │   ├── components/
│   │   │   └── video-player-modal/ # Modal de reproducción responsivo
│   │   ├── pages/
│   │   │   ├── register/         # Formulario público de inscripción
│   │   │   ├── results/          # Podio y tabla general de posiciones
│   │   │   ├── admin-login/      # Login del administrador
│   │   │   └── admin/            # Dashboard de moderación y controles
│   │   ├── home/                 # Galería pública de proyectos
│   │   └── app.routes.ts         # Enrutador con guards
│   ├── environments/             # Configuración Supabase
│   └── global.scss               # Estilos institucionales limpios
```
