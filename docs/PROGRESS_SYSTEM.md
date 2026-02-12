# Sistema de Progreso Global

Sistema de barra de progreso global implementado para todas las operaciones asíncronas de la aplicación.

## Características

- ✅ **Barra delgada en top** - No bloquea la UI, siempre visible
- ✅ **Cola de operaciones** - Maneja múltiples operaciones simultáneas
- ✅ **Auto-hide** - Se oculta automáticamente cuando no hay operaciones activas
- ✅ **5 tipos de operaciones** - Upload, Processing, AI Edit, Export, Convert
- ✅ **Animaciones suaves** - Transiciones fluidas con slideDown animation
- ✅ **Error handling** - Muestra errores con auto-clear después de 5s
- ✅ **Success auto-clear** - Tareas completadas se eliminan después de 2s

## Componentes

### 1. Store de Progreso (`useProgressStore.ts`)

Zustand store que gestiona el estado global de todas las tareas de progreso.

```typescript
interface ProgressTask {
  id: string;
  type: 'upload' | 'processing' | 'ai-edit' | 'export' | 'convert';
  label: string;
  progress: number; // 0-100
  total?: number; // Para operaciones multi-item
  current?: number; // Item actual siendo procesado
  status: 'active' | 'completed' | 'error';
  error?: string;
}
```

### 2. Componente UI (`GlobalProgressBar.tsx`)

Barra de progreso visual que se renderiza en el layout principal.

- Se muestra en `position: fixed` en la parte superior
- Animación `slideDown` al aparecer
- Colores diferentes por tipo de operación:
  - Upload: Azul (↑)
  - Processing: Morado (⚙)
  - AI Edit: Rosa (✨)
  - Export: Verde (↓)
  - Convert: Naranja (🔄)

### 3. Hook Helper (`useProgress.ts`)

Simplifica el uso del store con funciones de alto nivel.

```typescript
const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
```

## Uso

### Ejemplo básico

```typescript
import { useProgress } from '@/hooks/useProgress';

function MyComponent() {
  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();

  const handleOperation = async () => {
    // 1. Iniciar progreso
    const progressId = startProgress('processing', 'Procesando imagen...', 1);

    try {
      // 2. Actualizar progreso (10%)
      updateProgress(progressId, 10, 'Cargando archivo...');

      await someAsyncOperation();

      // 3. Actualizar progreso (50%)
      updateProgress(progressId, 50, 'Analizando metadatos...');

      await anotherAsyncOperation();

      // 4. Actualizar progreso (90%)
      updateProgress(progressId, 90, 'Guardando resultados...');

      await saveResults();

      // 5. Completar
      finishProgress(progressId);
    } catch (error) {
      // 6. Marcar como error
      failProgress(progressId, error.message);
    }
  };

  return <button onClick={handleOperation}>Procesar</button>;
}
```

### Ejemplo con múltiples items

```typescript
const processMultipleImages = async (images: File[]) => {
  const progressId = startProgress('processing', 'Procesando imágenes...', images.length);

  for (let i = 0; i < images.length; i++) {
    const progress = Math.round(((i + 1) / images.length) * 100);
    updateProgress(
      progressId,
      progress,
      `Procesando ${i + 1}/${images.length}...`,
      i + 1 // current
    );

    await processImage(images[i]);
  }

  finishProgress(progressId);
};
```

## Operaciones Implementadas

### ✅ Upload (GlobalDropZone)
- Tracking de progreso real con XMLHttpRequest
- Muestra: "Subiendo N imágenes..."
- Progreso: 0% → 10% (preparación) → 80% (upload) → 100% (metadatos)

### ✅ Export (ExportDialog)
- Exportación de imágenes con/sin metadatos
- Muestra: "Exportando N imágenes"
- Progreso: 0% → 10% → 50% (generación) → 90% (descarga) → 100%

### ✅ AI Edit (ImageEditor)
- Edición con Gemini AI
- Muestra: "Generando edición con IA..."
- Progreso: 0% → 10% → 20% (envío) → 80% (procesamiento) → 95% (guardado) → 100%

### ✅ Convert (ConvertDialog)
- Conversión de formato (JPEG/PNG/WebP)
- Muestra: "Convirtiendo N imágenes a {FORMAT}"
- Progreso: 0% → 10% → 50% (procesamiento) → 90% (metadatos) → 100%

## Mejores Prácticas

### 1. Granularidad del Progreso
- Divide la operación en pasos claros
- Actualiza el progreso en puntos significativos
- No actualices demasiado frecuentemente (< cada 5%)

### 2. Labels Descriptivos
```typescript
// ✅ BUENO - Descriptivo y claro
updateProgress(id, 50, 'Analizando metadatos EXIF...');

// ❌ MALO - Genérico
updateProgress(id, 50, 'Procesando...');
```

### 3. Error Handling
Siempre envuelve en try/catch y llama a `failProgress`:
```typescript
try {
  // operación
  finishProgress(progressId);
} catch (error) {
  failProgress(progressId, error.message);
}
```

### 4. Múltiples Operaciones
El sistema maneja automáticamente múltiples tareas simultáneas:
```typescript
// OK - Se mostrarán ambas barras apiladas
const upload1 = startProgress('upload', 'Imagen 1...');
const upload2 = startProgress('upload', 'Imagen 2...');
```

## Extensión Futura

Para añadir progreso a una nueva operación:

1. **Importa el hook:**
```typescript
import { useProgress } from '@/hooks/useProgress';
```

2. **Usa el hook en tu componente:**
```typescript
const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
```

3. **Implementa el tracking:**
```typescript
const progressId = startProgress('processing', 'Mi operación...');
// ... tu código
finishProgress(progressId);
```

4. **Si necesitas un nuevo tipo, actualiza:**
   - `src/hooks/useProgressStore.ts` - Añadir tipo a `ProgressType`
   - `src/components/ui/GlobalProgressBar.tsx` - Añadir config (color, icono)

## Testing

Para probar el sistema:

1. Sube múltiples imágenes → Ver progreso de upload
2. Selecciona varias y exporta → Ver progreso de export
3. Edita con Gemini AI → Ver progreso de AI edit
4. Convierte formato → Ver progreso de convert
5. Haz múltiples operaciones simultáneas → Ver cola de progreso

## Auto-cleanup

- **Tareas completadas**: Se eliminan automáticamente después de 2 segundos
- **Tareas con error**: Se eliminan automáticamente después de 5 segundos
- **Limpieza manual**: `useProgressStore().clearCompleted()`

## Arquitectura

```
Layout (layout.tsx)
  └─ GlobalProgressBar (always mounted)
       └─ ProgressBarItem[] (for each task)
            └─ Auto-cleanup useEffect

GlobalDropZone
  └─ useProgress() → Upload tracking

ExportDialog
  └─ useProgress() → Export tracking

ImageEditor
  └─ useProgress() → AI Edit tracking

ConvertDialog
  └─ useProgress() → Convert tracking
```

---

**Fecha de implementación**: 2026-02-05
**Versión**: 1.0.0
