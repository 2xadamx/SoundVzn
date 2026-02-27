# 🎵 SoundVzn - Sistema de APIs de Música

## 🌟 APIs IMPLEMENTADAS

### ✅ **APIs 100% GRATUITAS (Sin API Key)**

#### 1. **iTunes/Apple Music API**
- **Descripción**: Base de datos masiva de Apple
- **Funciones**:
  - Búsqueda de canciones, álbumes, artistas
  - Metadata completa (título, artista, álbum, año, género)
  - Artwork en alta resolución (hasta 1200x1200px)
  - Previews de 30 segundos
- **Límites**: Sin límites documentados
- **Endpoint**: `https://itunes.apple.com/search`
- **Estado**: ✅ Activo por defecto

#### 2. **Deezer API**
- **Descripción**: API pública de Deezer
- **Funciones**:
  - Búsqueda de canciones
  - Metadata completa
  - Artwork HD
  - Preview URLs
- **Límites**: Sin límites documentados
- **Endpoint**: `https://api.deezer.com`
- **Estado**: ✅ Activo por defecto

#### 3. **MusicBrainz API**
- **Descripción**: Base de datos open source de música
- **Funciones**:
  - Metadata detallada
  - ISRC lookup
  - Relaciones entre artistas/álbumes
  - Cover Art Archive
- **Límites**: 1 request/segundo (respetar rate limit)
- **Endpoint**: `https://musicbrainz.org/ws/2`
- **Estado**: ✅ Activo por defecto

---

### 🔑 **APIs CON REGISTRO GRATUITO**

#### 4. **Spotify Web API** ⭐ RECOMENDADO
- **Descripción**: API oficial de Spotify
- **Funciones**:
  - Búsqueda avanzada
  - Metadata completa y precisa
  - Artwork HD
  - Preview URLs (30 seg)
  - ISRC lookup
  - Popularidad de tracks
  - Análisis de audio
- **Registro**: https://developer.spotify.com/dashboard
- **Límites**: Rate limit generoso para uso normal
- **Autenticación**: Client Credentials Flow (gratis)
- **Pasos**:
  1. Crear cuenta en Spotify Developer
  2. Crear una App
  3. Obtener Client ID y Client Secret
  4. Configurar en SoundVzn
- **Estado**: ⚙️ Requiere configuración

#### 5. **Last.fm API**
- **Descripción**: Base de datos de scrobbling y estadísticas
- **Funciones**:
  - Búsqueda de tracks
  - Metadata
  - Similar tracks/artists
  - Top charts
  - Scrobbling (registrar lo que escuchas)
  - Estadísticas personales
- **Registro**: https://www.last.fm/api/account/create
- **Límites**: Sin límites estrictos
- **API Key**: Gratis
- **Estado**: ⚙️ Requiere configuración

#### 6. **AudD Music Recognition**
- **Descripción**: Reconocimiento de audio tipo Shazam
- **Funciones**:
  - Identificar canciones por audio
  - Reconocimiento en tiempo real
  - Metadata completa
  - Lyrics
- **Registro**: https://audd.io/
- **Límites**: **100 requests/día GRATIS**
- **Plan Premium**: $10/mes para 10,000 requests
- **Estado**: ⚙️ Opcional

---

## 🚀 CONFIGURACIÓN RÁPIDA

### **Opción 1: Sin Configuración (Inmediato)**
Las siguientes APIs funcionan automáticamente sin necesidad de API keys:
- ✅ iTunes/Apple Music
- ✅ Deezer
- ✅ MusicBrainz

**Ya puedes buscar música y obtener metadata inmediatamente!**

### **Opción 2: Con Spotify (Recomendado)**

**1. Crear App en Spotify:**
```
1. Ve a: https://developer.spotify.com/dashboard
2. Click en "Create an App"
3. Nombre: "SoundVzn"
4. Descripción: "Personal music player"
5. Acepta términos → Create
6. Copia Client ID y Client Secret
```

**2. Configurar en SoundVzn (seguridad correcta):**
```
🔒 El Client Secret NUNCA se pone en la app ni en variables VITE_ (se expondría en el navegador).

1. Crea .env en la raíz del proyecto (copia .env.example).
2. En .env pon SOLO en el backend (sin prefijo VITE_):
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
3. Opcional en frontend (solo para indicar "Spotify habilitado"): VITE_SPOTIFY_CLIENT_ID=tu_client_id
4. En la app: Configuración → pega solo el Client ID (público). No hay campo para el Secret.
5. El token de Spotify se obtiene siempre desde el backend; el frontend nunca ve el Secret.
```

---

## 📊 COMPARACIÓN DE APIs

| API | Gratis | Metadata | Artwork | Previews | ISRC | Límites |
|-----|--------|----------|---------|----------|------|---------|
| **iTunes** | ✅ Sí | ✅ | ✅ HD | ✅ 30s | ❌ | Sin límites |
| **Deezer** | ✅ Sí | ✅ | ✅ HD | ✅ | ❌ | Sin límites |
| **MusicBrainz** | ✅ Sí | ✅✅ | ✅ | ❌ | ✅ | 1 req/s |
| **Spotify** | ✅ Registro | ✅✅ | ✅✅ | ✅ 30s | ✅ | Generoso |
| **Last.fm** | ✅ Registro | ✅ | ✅ | ❌ | ❌ | Generoso |
| **AudD** | 100/día | ✅ | ✅ | ❌ | ✅ | 100/día |

---

## 💡 FUNCIONALIDADES IMPLEMENTADAS

### **1. Búsqueda Unificada Multi-Fuente**
```typescript
// Busca en TODAS las APIs simultáneamente
const results = await searchUnifiedMultiSource("Bohemian Rhapsody");
// Devuelve resultados combinados de Spotify, iTunes, Deezer, MusicBrainz
```

### **2. Auto-Enriquecimiento de Biblioteca**
```typescript
// Enriquece automáticamente tus canciones locales
await enrichAllLocalTracks();
// Busca metadata online y descarga artwork HD
```

### **3. Caché Inteligente (IndexedDB)**
- Almacena búsquedas por 7 días
- Reduce requests a APIs
- Artwork en caché local
- Metadata persistente

### **4. Matching Inteligente**
- Algoritmo de similitud de strings (Levenshtein)
- Matching por ISRC (si disponible)
- Comparación de duración
- Score de confianza

### **5. ISRC Lookup**
```typescript
// Busca por ISRC (International Standard Recording Code)
const metadata = await getTrackMetadataByISRC("USRC17607839");
// Retorna metadata exacta de Spotify
```

---

## 🎯 USO PRÁCTICO

### **Caso 1: Usuario Sin API Keys**
```
1. Abre SoundVzn
2. Ve a "🔍 Buscar Música"
3. Busca cualquier canción
4. Obtiene resultados de iTunes + Deezer + MusicBrainz
5. Click en "+" para agregar
```
**Resultado**: Funciona perfectamente sin configuración!

### **Caso 2: Usuario Con Spotify API**
```
1. Configura Spotify API (5 minutos)
2. Busca cualquier canción
3. Obtiene resultados de TODAS las fuentes
4. Metadata más precisa y completa
5. Previews de mejor calidad
6. ISRC lookup disponible
```
**Resultado**: Experiencia premium con metadata perfecta!

### **Caso 3: Enriquecer Biblioteca Existente**
```
1. Importa 1000 canciones locales
2. Ve a ⚙️ Configuración
3. Click "✨ Enriquecer Biblioteca"
4. La app busca metadata online para cada canción
5. Descarga artwork HD automáticamente
6. Actualiza toda la biblioteca
```
**Resultado**: Biblioteca profesional con artwork HD!

---

## 🔒 SEGURIDAD Y PRIVACIDAD

### **API Keys:**
- ✅ Almacenadas en localStorage (solo tu dispositivo)
- ✅ Nunca se envían a servidores de SoundVzn
- ✅ Solo se usan para APIs oficiales
- ✅ Puedes eliminarlas en cualquier momento

### **Datos:**
- ✅ Todo es local (SQLite + IndexedDB)
- ✅ Sin telemetría
- ✅ Sin tracking
- ✅ Sin servidores externos (excepto APIs públicas)

---

## ❓ PREGUNTAS FRECUENTES

**¿Necesito configurar APIs?**
No, iTunes, Deezer y MusicBrainz funcionan sin configuración.

**¿Vale la pena configurar Spotify?**
Sí! Spotify tiene la mejor metadata y artwork del mercado.

**¿Las API keys son gratis?**
Sí, todas son 100% gratis para uso personal.

**¿Hay límites de búsqueda?**
No hay límites prácticos para uso normal. Spotify tiene rate limits generosos.

**¿Funciona offline?**
La búsqueda online requiere internet, pero tu biblioteca local funciona offline.

**¿Puedo usar múltiples APIs simultáneamente?**
Sí! La app combina resultados de todas las APIs automáticamente.

---

## 🎁 BONUS: Funciones Avanzadas

### **Cover Art Archive**
```typescript
// MusicBrainz provee artwork desde Cover Art Archive
const artwork = `https://coverartarchive.org/release/${releaseId}/front-1200`;
```

### **Spotify Audio Analysis**
```typescript
// Análisis de tempo, key, loudness, etc. (próximamente)
const analysis = await getAudioAnalysis(spotifyTrackId);
```

### **Last.fm Scrobbling**
```typescript
// Registra lo que escuchas (próximamente)
await scrobbleTrack(track);
```

---

## 📞 SOPORTE

**Problemas con APIs?**
1. Verifica que las credenciales sean correctas
2. Click en "🔍 Probar Conexiones"
3. Revisa la consola del navegador (F12)
4. Consulta la documentación oficial de cada API

**Enlaces Útiles:**
- Spotify Dev: https://developer.spotify.com/documentation
- iTunes Search: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI
- Deezer API: https://developers.deezer.com/api
- MusicBrainz: https://musicbrainz.org/doc/MusicBrainz_API
- Last.fm: https://www.last.fm/api/intro

---

**🎵 Disfruta de la mejor metadata de música del mundo en SoundVzn!**
