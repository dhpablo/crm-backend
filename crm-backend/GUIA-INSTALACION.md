# 🚀 Guía Completa de Instalación - CRM Inmobiliario con n8n

Esta guía te llevará paso a paso para tener tu CRM completamente funcional con automatización de Idealista.

## 📋 Índice

1. [Despliegue del Backend en Railway](#1-despliegue-del-backend-en-railway)
2. [Configuración del Frontend](#2-configuración-del-frontend)
3. [Configuración de n8n](#3-configuración-de-n8n)
4. [Pruebas y Verificación](#4-pruebas-y-verificación)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Despliegue del Backend en Railway

### Paso 1.1: Preparar el Código

```bash
# Crear repositorio en GitHub
cd crm-backend
git init
git add .
git commit -m "Initial commit: CRM Backend"

# Crear repositorio en GitHub (desde la web de github.com)
# Luego conectar:
git remote add origin https://github.com/TU_USUARIO/crm-backend.git
git branch -M main
git push -u origin main
```

### Paso 1.2: Desplegar en Railway

1. **Ir a Railway:**
   - Visita [railway.app](https://railway.app)
   - Haz click en "Start a New Project"

2. **Conectar GitHub:**
   - Selecciona "Deploy from GitHub repo"
   - Autoriza Railway para acceder a tu GitHub
   - Selecciona el repositorio `crm-backend`

3. **Railway detectará automáticamente:**
   - ✅ Node.js project
   - ✅ Package.json
   - ✅ Start command

4. **Esperar el despliegue:**
   - Railway construirá e instalará dependencias
   - En 2-3 minutos estará listo

5. **Obtener la URL pública:**
   - Ve a Settings → Networking
   - Click en "Generate Domain"
   - Copia la URL (algo como: `https://crm-backend-production.up.railway.app`)
   - **GUARDA ESTA URL** - la necesitarás para el frontend y n8n

### Paso 1.3: Configurar Volumen Persistente (IMPORTANTE)

Para que tu base de datos no se borre en cada deploy:

1. En Railway, ve a tu servicio
2. Click en "Variables" en el menú lateral
3. Añade estas variables:
   ```
   PORT = 3000
   DB_PATH = /app/data/crm.db
   ```

4. Ve a "Volumes" en el menú lateral
5. Click en "+ New Volume"
6. Mount path: `/app/data`
7. Click en "Add"

**¡Listo!** Tu backend ahora tiene persistencia de datos.

### Paso 1.4: Verificar que Funciona

Abre en tu navegador:
```
https://TU-URL-RAILWAY.up.railway.app/health
```

Deberías ver:
```json
{"status":"OK","timestamp":"2024-..."}
```

---

## 2. Configuración del Frontend

### Paso 2.1: Abrir el archivo HTML

1. Abre `crm-frontend.html` en tu navegador
2. Verás un banner amarillo arriba pidiendo la URL del backend

### Paso 2.2: Configurar la URL del Backend

1. En el campo "URL del Backend" pega tu URL de Railway:
   ```
   https://crm-backend-production.up.railway.app
   ```

2. Click en "Guardar"
3. El banner desaparecerá
4. ¡El CRM ya está conectado!

### Paso 2.3: Crear tu Primer Agente e Inversor

Antes de usar n8n, crea al menos:
- 1 Agente inmobiliario
- 1 Inversor

Esto te permitirá asignar propiedades que lleguen automáticamente.

---

## 3. Configuración de n8n

### Opción A: n8n Cloud (Recomendado - Más Fácil)

#### Paso 3.1: Crear Cuenta en n8n Cloud

1. Ve a [n8n.io](https://n8n.io)
2. Click en "Get started for free"
3. Crea tu cuenta
4. Inicia sesión

#### Paso 3.2: Importar el Workflow

1. En n8n, click en "+ Add Workflow"
2. Click en el menú (3 puntos) → "Import from File"
3. Selecciona `n8n-workflow-idealista-crm.json`
4. El workflow se importará

#### Paso 3.3: Configurar Variables de Entorno

1. En n8n Cloud, ve a Settings → Variables
2. Añade estas variables:
   ```
   CRM_API_URL = https://TU-URL-RAILWAY.up.railway.app
   TELEGRAM_CHAT_ID = tu_chat_id (opcional)
   ```

#### Paso 3.4: Conectar Gmail

1. Click en el nodo "Gmail Trigger"
2. Click en "Create New Credential"
3. Sigue el proceso de OAuth con Google
4. Acepta los permisos
5. ¡Conectado!

#### Paso 3.5: (Opcional) Conectar Telegram

Si quieres recibir notificaciones:

1. Abre Telegram
2. Busca `@BotFather`
3. Envía `/newbot`
4. Sigue las instrucciones
5. Guarda el **token** que te da
6. Busca `@userinfobot` para obtener tu **Chat ID**

En n8n:
1. Click en el nodo "Notificar por Telegram"
2. Create New Credential → Telegram
3. Pega tu token
4. Guarda

#### Paso 3.6: Activar el Workflow

1. Click en el botón "Activate" (arriba a la derecha)
2. El workflow ahora está escuchando nuevos emails
3. ¡Listo!

---

### Opción B: n8n Self-Hosted

Si prefieres alojar n8n en tu propio servidor:

```bash
# Con Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n

# Con npm
npm install n8n -g
n8n start
```

Luego sigue los mismos pasos de importación y configuración.

---

## 4. Pruebas y Verificación

### Prueba 1: Verificar Backend

```bash
curl https://TU-URL-RAILWAY.up.railway.app/health
```

Respuesta esperada: `{"status":"OK",...}`

### Prueba 2: Crear Propiedad Manualmente

```bash
curl -X POST https://TU-URL-RAILWAY.up.railway.app/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "direccion": "Calle Prueba 123",
    "ciudad": "Madrid",
    "tipo": "piso",
    "precio": 200000,
    "metros": 80,
    "estado": "nueva"
  }'
```

Luego verifica en el frontend que aparezca.

### Prueba 3: Email de Idealista

1. Espera a recibir un email de Idealista
2. O reenvía uno antiguo a tu email
3. n8n lo procesará en 1 minuto
4. Verifica en el CRM que aparezca la propiedad
5. (Opcional) Recibirás notificación en Telegram

---

## 5. Troubleshooting

### ❌ "Error de conexión" en el Frontend

**Causa:** La URL del backend está mal o el backend está caído.

**Solución:**
1. Verifica la URL en Railway
2. Comprueba que el servicio esté running en Railway
3. Prueba el endpoint `/health` manualmente

### ❌ La base de datos se borra al hacer deploy

**Causa:** No tienes configurado el volumen persistente.

**Solución:**
1. Sigue el Paso 1.3 de arriba
2. Configura el volumen en Railway
3. Actualiza `DB_PATH=/app/data/crm.db`

### ❌ n8n no detecta emails

**Causa:** Filtros de Gmail incorrectos o credenciales.

**Solución:**
1. Verifica que el remitente sea exactamente `alertas@idealista.com`
2. Revisa que el subject contenga las palabras clave
3. Reconecta las credenciales de Gmail

### ❌ El workflow extrae mal los datos

**Causa:** El formato del email de Idealista cambió.

**Solución:**
1. Ve al nodo "Extraer Datos del Email"
2. Ajusta las expresiones regex según el nuevo formato
3. Puedes ver un email de ejemplo y adaptar el código

### ❌ Error 500 al crear propiedad

**Causa:** Campos requeridos faltantes.

**Solución:**
Verifica que el JSON incluya:
- `direccion`
- `ciudad`
- `tipo`
- `precio`
- `metros`
- `estado`

---

## 🎯 Mejoras Futuras

Ideas para expandir el sistema:

1. **Más portales:** Añade Fotocasa, Habitaclia
2. **WhatsApp API:** Recibe notificaciones por WhatsApp
3. **Scrapers:** Captura propiedades directamente de los portales
4. **Machine Learning:** Predice qué propiedades interesan más
5. **Reportes automáticos:** Envía resumen semanal por email
6. **Calendario:** Recordatorios para contactar agentes

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Railway (Deployments → Ver logs)
2. Revisa las ejecuciones en n8n (Executions)
3. Verifica la consola del navegador (F12) en el frontend

---

## 🎉 ¡Felicidades!

Tu CRM está listo y automatizado. Ahora cada vez que Idealista te envíe una alerta:

✅ Se creará automáticamente en tu CRM
✅ Con todos los datos extraídos
✅ Lista para contactar al agente
✅ Asignarla a un inversor
✅ Calcular rentabilidad

**¡A captar propiedades!** 🏠💰
