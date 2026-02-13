# 🎵 SoundVzn - GUÍA DE CONFIGURACIÓN RÁPIDA

## ✅ YOUTUBE API YA CONFIGURADA

Tu API Key de YouTube ya está integrada en el código:
```
AIzaSyDBkGUjFKIcoVhP6LUHymVNEP5t4_qi8vo
```

**✅ Funciones disponibles inmediatamente:**
- Búsqueda de música en YouTube
- Metadata automática (título, artista, álbum)
- Thumbnails HD
- Duración de videos
- Trending music

---

## 🎵 CONFIGURAR SPOTIFY (OPCIONAL)

### **Paso 1: Crear App en Spotify**
1. Ve a: https://developer.spotify.com/dashboard
2. Login con tu cuenta de Spotify
3. Click "Create an App"
4. Nombre: "SoundVzn"
5. Descripción: "Personal music player"
6. Website: http://localhost:5173
7. Redirect URI: http://localhost:5173/callback
8. Acepta términos → **Create**

### **Paso 2: Obtener Credenciales**
1. Copia el **Client ID**
2. Click "Show Client Secret" → Copia el **Client Secret**

### **Paso 3: Configurar en SoundVzn**

**Opción A: Interfaz Gráfica (Recomendado)**
```
1. Abre SoundVzn
2. Ve a ⚙️ Configuración (último ítem del sidebar)
3. Pega Client ID y Client Secret
4. Click "💾 Guardar Configuración"
5. Click "🔍 Probar Conexiones"
```

**Opción B: Código Directo**
Edita `src/utils/apiConfig.ts` líneas 20-24:
```typescript
spotify: {
  clientId: 'TU_CLIENT_ID_AQUI',
  clientSecret: 'TU_CLIENT_SECRET_AQUI',
  enabled: false,
},
```

---

## 🚀 PROBAR LAS APIs

### **1. YouTube (Ya funciona)**
```
1. npm run electron:dev
2. Click en "🔍 Buscar Música"
3. Selecciona "📺 YouTube"
4. Busca cualquier canción
5. Resultados instantáneos!
```

### **2. Spotify + YouTube + Más**
```
1. Configura Spotify (pasos arriba)
2. Click en "🔍 Buscar Música"
3. Selecciona "🌐 Todos"
4. Busca cualquier canción
5. Obtiene resultados de:
   - ✅ YouTube (tu API)
   - ✅ Spotify (si configuraste)
   - ✅ iTunes (gratis, sin config)
   - ✅ Deezer (gratis, sin config)
   - ✅ MusicBrainz (gratis, sin config)
```

### **3. Importar Playlist de Spotify**
```
1. Configura Spotify API
2. Abre Spotify → Click derecho en playlist
3. "Compartir" → "Copiar enlace de playlist"
4. En SoundVzn → "🔍 Buscar Música"
5. Pega el link en "Importar de Spotify"
6. Click "Importar Playlist"
7. Espera... ¡Listo!
```

---

## 📊 ESTADO DE APIs

| API | Estado | Config Requerida |
|-----|--------|-----------------|
| **YouTube** | ✅ ACTIVO | ✅ Ya configurado |
| **iTunes** | ✅ ACTIVO | ❌ Sin config necesaria |
| **Deezer** | ✅ ACTIVO | ❌ Sin config necesaria |
| **MusicBrainz** | ✅ ACTIVO | ❌ Sin config necesaria |
| **Spotify** | ⚠️ Pendiente | ⚙️ Requiere Client ID + Secret |
| **Last.fm** | ⚠️ Opcional | ⚙️ Requiere API Key |

---

## 🎯 FUNCIONES DISPONIBLES AHORA

### **Con Solo YouTube (Sin configurar nada más):**
✅ Buscar cualquier canción  
✅ Metadata automática  
✅ Thumbnails HD  
✅ Información de duración  
✅ Videos trending  
✅ 30+ resultados por búsqueda  

### **Con YouTube + APIs Gratuitas (Sin config):**
✅ Búsqueda en 4 fuentes simultáneas  
✅ Artwork HD de iTunes  
✅ Metadata de Deezer  
✅ Base de datos MusicBrainz  
✅ Matching inteligente  
✅ Resultados únicos combinados  

### **Con YouTube + Spotify + APIs Gratuitas:**
✅ TODO lo anterior +  
✅ Metadata perfecta de Spotify  
✅ ISRC lookup  
✅ Popularidad de tracks  
✅ Previews de 30 segundos  
✅ Importar playlists completas  
✅ Recomendaciones personalizadas  

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### **Error: "YouTube API quota exceeded"**
- Causa: Límite diario alcanzado (10,000 requests/día)
- Solución: Espera 24 horas o crea otra API key

### **Error: "Spotify API error"**
- Verifica que Client ID y Secret sean correctos
- Asegúrate de aceptar los términos en Spotify Dashboard
- Click "🔍 Probar Conexiones" para diagnosticar

### **Error: "No results found"**
- Verifica conexión a internet
- Intenta con otro término de búsqueda
- Prueba seleccionando solo "📺 YouTube"

### **La búsqueda es lenta**
- Normal en primera búsqueda (sin caché)
- Siguientes búsquedas serán más rápidas
- El caché dura 7 días

---

## 💡 TIPS Y TRUCOS

### **Mejor Búsqueda:**
```
❌ Mal: "musica"
✅ Bien: "The Weeknd Blinding Lights"
✅ Bien: "Bohemian Rhapsody Queen"
```

### **Fuentes de Búsqueda:**
- **🌐 Todos**: Máxima cobertura, más resultados
- **📺 YouTube**: Rápido, siempre funciona
- **🎵 Spotify**: Mejor metadata (requiere config)

### **Importar Playlists:**
```
✅ Funciona: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
✅ Funciona: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
❌ No funciona: Links de Apple Music (próximamente)
```

---

## 📈 LÍMITES Y QUOTAS

### **YouTube API:**
- **Quota diario**: 10,000 units
- **Búsqueda**: ~100 units
- **Estimado**: ~100 búsquedas/día
- **Reset**: Medianoche PST

### **Spotify API:**
- **Sin límites** para búsqueda
- Rate limit: ~180 requests/minuto
- Uso normal: Sin problemas

### **APIs Gratuitas:**
- iTunes: Sin límites conocidos
- Deezer: Sin límites conocidos
- MusicBrainz: 1 request/segundo

---

## 🎁 SIGUIENTES PASOS

1. **Configura Spotify** (5 minutos) → Máxima calidad
2. **Prueba la búsqueda** → "🔍 Buscar Música"
3. **Importa una playlist** → Pega el link
4. **Enriquece tu biblioteca** → ⚙️ Configuración → "✨ Enriquecer"

---

## 📞 SOPORTE

**YouTube API Dashboard:**
https://console.cloud.google.com/apis/dashboard

**Spotify Dashboard:**
https://developer.spotify.com/dashboard

**Documentación Completa:**
Ver `API_GUIDE.md` en la carpeta del proyecto

---

**✅ YouTube ya está funcionando! Prueba ahora mismo! 🚀**
