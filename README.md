# 📸 Image Metadata Analyzer & AI Editor

Una aplicación web moderna para analizar, visualizar y editar metadatos de imágenes con soporte completo para archivos HEIC del iPhone y edición impulsada por IA.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Características Principales

### 📊 Análisis Completo de Metadatos
- **EXIF**: Información de cámara, lente, configuración de disparo
- **GPS**: Ubicación geográfica con visualización en mapa interactivo
- **IPTC**: Descripciones, palabras clave, copyright
- **Fechas**: Timestamps originales, digitalizados y modificados
- **Datos RAW**: Acceso a todos los metadatos sin procesar

### 🎨 Edición con IA (Google Gemini)
- **In-painting inteligente**: Dibuja una máscara para editar áreas específicas
- **Edición por texto**: Describe los cambios que deseas realizar
- **Historial de versiones**: Revierte a versiones anteriores en cualquier momento
- **Preservación de metadatos**: Mantiene todos los metadatos EXIF durante las ediciones

### 📱 Soporte HEIC Nativo
- **Compatible con iPhone**: Soporta archivos HEIC directamente del iPhone 16 Pro Max
- **Sin conversión**: Los archivos se mantienen en formato HEIC original
- **Visualización en navegador**: Conversión automática para display (solo en memoria)
- **Preservación de calidad**: No hay pérdida de datos o metadatos

### 🎯 Características Adicionales
- **Drag & Drop global**: Arrastra imágenes desde cualquier parte de la pantalla
- **Gestión de biblioteca**: Organiza, elimina y selecciona múltiples imágenes
- **Interfaz responsive**: Optimizada para móvil, tablet y desktop
- **Modo oscuro**: Tema oscuro automático según preferencias del sistema
- **Thumbnails automáticos**: Generación de miniaturas para carga rápida

## 🛠️ Tecnologías

### Frontend
- **Next.js 15.5** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS 4.0** - Estilos utility-first
- **Zustand** - Gestión de estado
- **Fabric.js 6** - Canvas para in-painting
- **Leaflet** - Mapas interactivos para GPS
- **heic2any** - Conversión HEIC en navegador

### Backend
- **Next.js API Routes** - Endpoints RESTful
- **Sharp** - Procesamiento de imágenes
- **ExifTool** - Preservación completa de metadatos
- **exifr** - Lectura de metadatos EXIF/IPTC/XMP
- **Google Gemini 2.0 Flash** - Modelo de IA para edición de imágenes

### Testing
- **Playwright** - Tests end-to-end

## 📋 Requisitos Previos

- **Node.js** 18.0 o superior
- **npm** o **pnpm**
- **ExifTool** (instalado automáticamente en el primer uso)
- **Google Gemini API Key** (para funciones de edición IA)

## 🚀 Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/image-metadata.git
cd image-metadata
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura las variables de entorno**
```bash
cp .env.example .env.local
```

Edita `.env.local` y añade tu API key de Google Gemini:
```env
GOOGLE_GEMINI_API_KEY=tu_api_key_aqui
```

4. **Instala ExifTool** (macOS)
```bash
brew install exiftool
```

Para otros sistemas operativos, consulta la [documentación de ExifTool](https://exiftool.org/).

## 🎮 Uso

### Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Producción

Construye y ejecuta la versión de producción:

```bash
npm run build
npm start
```

### Tests

Ejecuta los tests end-to-end con Playwright:

```bash
npx playwright test
npx playwright test --ui  # Modo interactivo
```

## 📁 Estructura del Proyecto

```
image-metadata/
├── src/
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── api/               # API Routes
│   │   │   ├── upload/        # Subida de imágenes
│   │   │   ├── image/         # Servir imágenes
│   │   │   ├── thumbnail/     # Servir thumbnails
│   │   │   ├── delete/        # Eliminar imágenes
│   │   │   ├── metadata/      # Actualizar metadatos
│   │   │   └── gemini/        # Edición con IA
│   │   ├── page.tsx           # Página principal
│   │   └── layout.tsx         # Layout principal
│   ├── components/            # Componentes React
│   │   ├── editor/            # Editor de IA e in-painting
│   │   ├── metadata/          # Visualización de metadatos
│   │   ├── ui/                # Componentes UI reutilizables
│   │   ├── upload/            # Zona de subida
│   │   └── workspace/         # Galería y vista de detalle
│   ├── hooks/                 # Custom React hooks
│   │   └── useImageStore.ts   # Zustand store
│   ├── lib/                   # Utilidades y librerías
│   │   ├── constants.ts       # Constantes y helpers
│   │   ├── file-manager.ts    # Gestión de archivos
│   │   ├── image-processing.ts # Sharp para imágenes
│   │   ├── metadata-reader.ts  # Lectura de metadatos
│   │   ├── gemini-client.ts    # Cliente Gemini API
│   │   └── exif-preservation.ts # Preservación EXIF
│   └── types/                 # Tipos TypeScript
│       ├── image.ts           # Tipos de imágenes
│       └── gemini.ts          # Tipos de Gemini
├── public/                    # Archivos estáticos
├── tests/                     # Tests Playwright
├── .env.example              # Ejemplo de variables de entorno
├── .env.local                # Variables de entorno (git-ignored)
├── next.config.mjs           # Configuración Next.js
├── tailwind.config.ts        # Configuración Tailwind
└── tsconfig.json             # Configuración TypeScript
```

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Google Gemini API Key (requerido para edición IA)
GOOGLE_GEMINI_API_KEY=tu_api_key_de_google_gemini

# Next.js (opcional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Obtener API Keys

**Google Gemini API:**
1. Visita [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea un nuevo proyecto o selecciona uno existente
3. Genera una nueva API key
4. Copia la key a tu `.env.local`

## 🌐 Deploy

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. **Conecta tu repositorio** a Railway
2. **Configura las variables de entorno**:
   - `GOOGLE_GEMINI_API_KEY`
3. **Deploy automático** en cada push a main

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. **Importa tu repositorio** en Vercel
2. **Configura las variables de entorno**
3. **Deploy automático**

**Nota importante:** ExifTool debe estar disponible en el entorno de producción. Railway lo instala automáticamente. Para Vercel, necesitarás un buildpack personalizado.

## 🎯 Funcionalidades Detalladas

### Subida de Imágenes

- **Formatos soportados**: JPEG, PNG, HEIC, HEIF, WebP, TIFF
- **Métodos**: Drag & Drop, selector de archivos, drag global
- **Procesamiento**: Extracción automática de metadatos, generación de thumbnails
- **Almacenamiento temporal**: Sesiones únicas por usuario

### Visualización de Metadatos

```typescript
interface ImageMetadata {
  exif: ExifData;      // Cámara, lente, configuración
  gps: GpsData;        // Coordenadas, altitud, dirección
  dates: DateData;     // Timestamps y zonas horarias
  iptc: IptcData;      // Descripciones, keywords, copyright
  raw: RawData;        // Todos los metadatos sin procesar
}
```

### Edición con IA

1. **Selecciona una imagen** de tu galería
2. **Haz clic en "✨ Edit with AI"**
3. **(Opcional) Dibuja una máscara** sobre las áreas a editar
4. **Describe los cambios** que deseas realizar
5. **Genera** y revisa el resultado
6. **Acepta** o **refina** la edición

El historial de versiones se guarda automáticamente.

### Mapas GPS

Cuando una imagen contiene coordenadas GPS:
- **Mapa interactivo** con marcador de ubicación
- **Coordenadas** en formato DMS y decimal
- **Enlace a Google Maps** para navegación
- **Altitud**, **velocidad** y **dirección** (si disponible)

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo
npm run build            # Construye para producción
npm start                # Inicia servidor de producción
npm run lint             # Ejecuta ESLint
npm run type-check       # Verifica tipos TypeScript

# Testing
npx playwright test              # Ejecuta tests
npx playwright test --ui         # Modo interactivo
npx playwright test --debug      # Debug mode
npx playwright codegen           # Genera tests grabando

# Utilidades
npm run clean            # Limpia .next y node_modules
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. **Fork** el proyecto
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

### Guías de Estilo

- **TypeScript**: Tipado estricto, sin `any`
- **Componentes**: Functional components con hooks
- **Naming**: camelCase para variables, PascalCase para componentes
- **Commits**: Conventional Commits (feat:, fix:, docs:, etc.)

## 🐛 Problemas Conocidos

### HEIC en navegadores antiguos

Los navegadores muy antiguos pueden no soportar la conversión HEIC. Solución:
- Usa navegadores modernos (Chrome 90+, Firefox 88+, Safari 14+)
- O descarga las imágenes HEIC originales

### Límite de tamaño

El tamaño máximo por imagen es **10MB** por defecto. Para cambiar:

```typescript
// src/app/api/upload/route.ts
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
```

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**José Díaz**

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu@email.com

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - El framework React para producción
- [Sharp](https://sharp.pixelplumbing.com/) - Procesamiento de imágenes de alto rendimiento
- [ExifTool](https://exiftool.org/) - El estándar de oro para metadatos
- [Google Gemini](https://deepmind.google/technologies/gemini/) - IA generativa de última generación
- [Fabric.js](http://fabricjs.com/) - Librería de canvas HTML5
- [Leaflet](https://leafletjs.com/) - Mapas interactivos open source

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Guía de EXIF](https://en.wikipedia.org/wiki/Exif)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)

---

**⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub!**
