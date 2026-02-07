# CRM Inmobiliario - Backend API

Backend profesional para el sistema CRM de captación de propiedades inmobiliarias.

## 🚀 Características

- API REST completa con Express.js
- Base de datos SQLite con mejor-sqlite3
- CORS habilitado para acceso desde el frontend
- Endpoints para Properties, Agents e Investors
- Cálculos automáticos de rentabilidad
- Estadísticas y métricas

## 📋 Requisitos

- Node.js >= 18.0.0
- npm o yarn

## 🛠️ Instalación Local

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# O iniciar servidor de producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 🌐 Despliegue en Railway

### Opción 1: Desde GitHub (Recomendado)

1. **Sube el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/crm-backend.git
   git push -u origin main
   ```

2. **Conecta Railway con GitHub:**
   - Ve a [railway.app](https://railway.app)
   - Click en "Start a New Project"
   - Selecciona "Deploy from GitHub repo"
   - Autoriza Railway para acceder a tu GitHub
   - Selecciona el repositorio del backend

3. **Railway detectará automáticamente:**
   - El archivo `package.json`
   - El comando de inicio en `scripts.start`
   - Las dependencias necesarias

4. **Configurar variables de entorno (opcional):**
   - En Railway, ve a tu proyecto → Variables
   - Añade: `PORT=3000` (Railway lo asigna automáticamente, pero por si acaso)

5. **Desplegar:**
   - Railway hará el deploy automáticamente
   - Te dará una URL pública tipo: `https://crm-backend-production.up.railway.app`

### Opción 2: Desde Railway CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Desplegar
railway up
```

## 📡 API Endpoints

### Properties

- `GET /api/properties` - Obtener todas las propiedades (con filtros opcionales)
  - Query params: `?estado=pendiente&inversor_id=123&search=madrid`
- `GET /api/properties/:id` - Obtener una propiedad
- `POST /api/properties` - Crear nueva propiedad
- `PUT /api/properties/:id` - Actualizar propiedad
- `DELETE /api/properties/:id` - Eliminar propiedad

### Agents

- `GET /api/agents` - Obtener todos los agentes
- `GET /api/agents/:id` - Obtener un agente
- `POST /api/agents` - Crear nuevo agente
- `PUT /api/agents/:id` - Actualizar agente
- `DELETE /api/agents/:id` - Eliminar agente

### Investors

- `GET /api/investors` - Obtener todos los inversores
- `GET /api/investors/:id` - Obtener un inversor
- `POST /api/investors` - Crear nuevo inversor
- `PUT /api/investors/:id` - Actualizar inversor
- `DELETE /api/investors/:id` - Eliminar inversor

### Stats

- `GET /api/stats` - Obtener estadísticas generales

### Health

- `GET /health` - Health check del servidor

## 📝 Ejemplo de Request (Crear Propiedad)

```bash
curl -X POST https://tu-url-railway.up.railway.app/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "direccion": "Calle Gran Vía 28",
    "ciudad": "Madrid",
    "tipo": "piso",
    "precio": 250000,
    "metros": 85,
    "portal": "Idealista",
    "enlace": "https://www.idealista.com/inmueble/12345",
    "estado": "nueva",
    "alquiler": 1200,
    "gastos": 150,
    "rentabilidad_objetivo": 7
  }'
```

## 🔒 Persistencia de Datos

Railway proporciona **volúmenes persistentes** gratuitos. Para habilitar:

1. En Railway, ve a tu servicio
2. Click en "Settings" → "Volumes"
3. Click en "Add Volume"
4. Mount path: `/app/data`
5. Actualiza `.env` en Railway: `DB_PATH=/app/data/crm.db`

**Importante:** Sin volumen, la base de datos se reinicia con cada deploy.

## 📊 Base de Datos

SQLite con 3 tablas principales:
- `properties` - Propiedades inmobiliarias
- `agents` - Agentes inmobiliarios
- `investors` - Inversores

Las tablas se crean automáticamente al iniciar el servidor.

## 🔧 Variables de Entorno

```env
PORT=3000                # Puerto del servidor (Railway lo asigna automáticamente)
DB_PATH=crm.db          # Ruta de la base de datos SQLite
NODE_ENV=production     # Entorno de ejecución
```

## 🐛 Troubleshooting

### Error: "Database is locked"
- Railway puede reiniciar el contenedor. Asegúrate de usar volúmenes persistentes.

### Error: "Port already in use"
- Railway asigna el puerto automáticamente via `process.env.PORT`

### La base de datos se borra en cada deploy
- Necesitas configurar un volumen persistente en Railway (ver sección arriba)

## 📞 Soporte

Para issues o preguntas, abre un issue en el repositorio de GitHub.

## 📄 Licencia

MIT
