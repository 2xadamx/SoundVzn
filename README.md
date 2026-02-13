# SoundVzn - Hi-Res Audio Player

Reproductor de audio profesional de alta fidelidad para Windows y macOS.

## 🎵 Características

- **Audio de Máxima Calidad**: Soporte para FLAC, WAV, ALAC, MP3, AAC y más
- **Procesamiento Hi-Res**: 24-bit / 192kHz
- **Interfaz Moderna**: Diseño fluido con animaciones y glassmorphism
- **Motor de Audio Avanzado**: Ecualizador de 10 bandas, efectos DSP
- **Gestión Inteligente**: Biblioteca musical con búsqueda y filtros
- **Multiplataforma**: Windows y macOS nativo

## 🚀 Instalación

### Requisitos Previos

- Node.js 18+ (Descargar desde https://nodejs.org/)
- npm o yarn

### Pasos de Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el modo desarrollo:
```bash
npm run electron:dev
```

3. Compila para producción:
```bash
npm run electron:build
```

## 🛠️ Stack Tecnológico

- **Framework**: Electron + React + TypeScript
- **UI**: Tailwind CSS + Framer Motion
- **Estado**: Zustand
- **Audio**: HTML5 Audio API + Web Audio API
- **Build**: Vite

## 📁 Estructura del Proyecto

```
SoundVzn/
├── electron/           # Proceso principal de Electron
│   ├── main.ts        # Ventana principal
│   └── preload.ts     # Contexto seguro
├── src/
│   ├── components/    # Componentes React
│   ├── store/         # Estado global (Zustand)
│   ├── types/         # Definiciones TypeScript
│   ├── utils/         # Utilidades
│   ├── App.tsx        # Componente principal
│   └── main.tsx       # Punto de entrada
├── resources/         # Iconos y recursos
└── package.json
```

## 🎨 Características Principales

### Motor de Audio
- Soporte para formatos lossless (FLAC, WAV, ALAC)
- Procesamiento de audio de 32-bit interno
- Ecualizador paramétrico de 10 bandas
- ReplayGain y normalización de volumen

### Interfaz de Usuario
- Diseño oscuro/claro adaptable
- Animaciones fluidas (60fps)
- Barra de título personalizada
- Player con visualizaciones en tiempo real
- Biblioteca musical con búsqueda instantánea

### Controles de Reproducción
- Play/Pause/Skip
- Shuffle y Repeat
- Control de volumen
- Barra de progreso interactiva
- Queue de reproducción

## 📦 Próximas Funciones

- [ ] Visualizador de espectro en tiempo real
- [ ] Soporte para playlists
- [ ] Vista de álbumes y artistas
- [ ] Integración con servicios de streaming
- [ ] Modo exclusivo WASAPI (Windows)
- [ ] Core Audio exclusivo (macOS)
- [ ] Letras sincronizadas
- [ ] Recomendaciones por IA

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles

## 👨‍💻 Autor

SoundVzn Team

---

**Nota**: Este es un proyecto en desarrollo activo. Algunas características pueden estar incompletas.
