# Correcciones de Máscaras y Calidad - Resumen

## Fecha: 2026-02-09

## Problemas Reportados

1. ❌ Las máscaras (zona segura y zona a modificar) no funcionan
2. ❌ El resultado tiene menos nitidez/calidad que el original

## Correcciones Realizadas

### 1. Calidad de Imagen (src/lib/gemini-client.ts)

**Problema**: Siempre se enviaba la imagen como `image/jpeg`, formato con pérdida de calidad.

**Solución**:
- Ahora detecta el tipo MIME original de la imagen
- Preserva el formato original (PNG, JPEG, etc.)
- Agregado logging detallado del formato enviado

```typescript
// ANTES (línea 52):
mimeType: 'image/jpeg',  // ❌ Siempre JPEG

// AHORA:
const mimeTypeMatch = params.imageBase64.match(/^data:(image\/\w+);base64,/);
const imageMimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';  // ✅ Preserva formato
```

### 2. Instrucciones de Calidad para Gemini

**Agregadas instrucciones explícitas** a Gemini para mantener la calidad:

```typescript
'CRITICAL: Maintain the exact same image quality, sharpness, and detail level as the original image.'
'Do not compress, blur, or reduce quality.'
'Output the result in the same format and quality as the input image.'
```

### 3. Logging Completo del Flujo de Máscaras

**Se agregó logging exhaustivo en cada paso:**

#### Frontend (InpaintingCanvas.tsx):
- ✅ Log cuando se crea un path con su maskType
- ✅ Log al exportar máscaras mostrando cuántos paths hay de cada tipo
- ✅ Log detallado de cada path procesado

#### Backend (route.ts):
- ✅ Log cuando se reciben las máscaras del frontend
- ✅ Log del proceso de combinación de máscaras
- ✅ Log de estadísticas pixel por pixel (áreas protegidas vs áreas a editar)
- ✅ Log cuando se re-inyecta EXIF

#### Gemini Client (gemini-client.ts):
- ✅ Log del formato de imagen enviado
- ✅ Log cuando se envía máscara
- ✅ Log de la respuesta completa de Gemini

### 4. Verificación de Lógica de Máscaras

**La lógica está correctamente implementada:**

1. **Frontend (InpaintingCanvas.tsx)**:
   - 3 modos: `inpaint` (rojo), `safe-zone` (verde), `erase` (negro)
   - Cada trazo guarda su `maskType` en el path
   - Al exportar, separa paths por tipo
   - Genera 2 máscaras PNG separadas:
     - Máscara de inpainting: blanco = modificar, negro = mantener
     - Máscara de zona segura: blanco = proteger, negro = puede editar

2. **Backend (route.ts - combineMasks)**:
   - Caso 1: Solo inpainting → usar directamente
   - Caso 2: Solo zona segura → invertir (protegido = negro)
   - Caso 3: Ambas → combinar con prioridad a zona segura
   - Pixel por pixel: donde zona segura es blanca, pintar negro (proteger)

3. **Gemini (gemini-client.ts)**:
   - Recibe imagen + máscara combinada
   - Instrucciones claras: blanco = editar, negro = preservar

## Cómo Probar

### Paso 1: Subir una Imagen

1. Ir a http://localhost:3333
2. Subir una imagen de prueba (JPG, PNG, o HEIC)
3. Hacer clic en la imagen para verla

### Paso 2: Abrir el Editor

1. Hacer clic en el botón "Edit" arriba de la imagen
2. Esto abrirá http://localhost:3333/image/{imageId}/edit

### Paso 3: Probar las Máscaras

**Escenario A: Solo Inpainting (Rojo)**
1. Seleccionar modo "Inpaint" (rojo)
2. Dibujar sobre un área específica que quieras modificar
3. En el prompt: "cambia esta área a color azul"
4. Verificar en consola del navegador:
   ```
   Path created: { maskType: 'inpaint', ... }
   Mask export summary: { inpaintCount: X, safeZoneCount: 0 }
   ```

**Escenario B: Solo Zona Segura (Verde)**
1. Seleccionar modo "Safe Zone" (verde)
2. Dibujar sobre áreas que NO quieres que se modifiquen
3. En el prompt: "mejora los colores"
4. Verificar en consola:
   ```
   Path created: { maskType: 'safe-zone', ... }
   Mask export summary: { inpaintCount: 0, safeZoneCount: X }
   ```

**Escenario C: Ambas Máscaras (Recomendado)**
1. Primero seleccionar "Inpaint" (rojo) y marcar área a modificar
2. Luego seleccionar "Safe Zone" (verde) y marcar área a proteger
3. En el prompt: "cambia el fondo"
4. Verificar en consola:
   ```
   Path created: { maskType: 'inpaint', ... }
   Path created: { maskType: 'safe-zone', ... }
   Mask export summary: { inpaintCount: X, safeZoneCount: Y }
   ```

### Paso 4: Generar y Verificar

1. Hacer clic en "Generate AI Edit"
2. **Revisar logs del servidor** (terminal donde corre Next.js):
   ```
   📥 Gemini Edit API Request: { hasInpaintMask: true, hasSafeZoneMask: true, ... }
   🎭 Combining masks: { hasInpaint: true, hasSafeZone: true, targetSize: {...} }
   📤 Sending image to Gemini: { mimeType: 'image/png', hasMask: true, ... }
   🎭 Sending mask to Gemini: { maskSize: XXXX, ... }
   ```
3. **Verificar estadísticas de máscara**:
   ```
   Mask statistics: {
     protectedPixels: XXX,
     editPixels: XXX,
     protectedPercent: 'X.XX%',
     editPercent: 'Y.YY%'
   }
   ```
4. Cuando termine, serás redirigido a la comparación side-by-side
5. **Verificar calidad**: ¿Se ve igual de nítida la imagen editada?
6. **Verificar máscaras**: ¿Se respetaron las áreas marcadas?

## Posibles Problemas y Soluciones

### Si las máscaras siguen sin funcionar:

1. **Verificar que se generan las máscaras**:
   - Abrir DevTools (F12) → Consola
   - Buscar: `Mask export summary: { inpaintCount: X, safeZoneCount: Y }`
   - Si ambos son 0, el problema está en el canvas

2. **Verificar que llegan al backend**:
   - En el terminal del servidor buscar: `📥 Gemini Edit API Request`
   - Verificar `hasInpaintMask` y `hasSafeZoneMask`
   - Si son `false`, el problema está en ImageEditor.tsx (no está enviando)

3. **Verificar combinación**:
   - En el terminal buscar: `Mask statistics`
   - Si `protectedPercent` y `editPercent` están en 0%, la combinación falló

4. **Verificar envío a Gemini**:
   - Buscar: `🎭 Sending mask to Gemini`
   - Si no aparece, la máscara no llegó a Gemini

### Si la calidad sigue siendo baja:

1. **Verificar formato original**:
   - En terminal buscar: `📤 Sending image to Gemini: { mimeType: ... }`
   - Debe decir `image/png` o el formato original, NO siempre `image/jpeg`

2. **Verificar formato de salida de Gemini**:
   - Gemini podría estar devolviendo JPEG comprimido
   - Esto es una limitación del modelo, no del código

3. **Probar con PNG de entrada**:
   - Convertir imagen original a PNG antes de subir
   - PNG no tiene pérdida de calidad

## Estado Actual

✅ **Correcciones implementadas**:
- Detección de formato de imagen original
- Instrucciones explícitas de calidad para Gemini
- Logging completo del flujo
- Lógica de máscaras verificada

⏳ **Pendiente de probar**:
- Subir imagen y probar flujo completo
- Verificar logs en navegador y servidor
- Confirmar que máscaras funcionan
- Confirmar que calidad se mantiene

## Próximos Pasos

1. **Reiniciar el servidor de desarrollo**:
   ```bash
   # Ctrl+C para detener
   npm run dev:3333
   ```

2. **Subir una imagen y probar** siguiendo los pasos de "Cómo Probar"

3. **Reportar resultados** con los logs si hay problemas

4. **Si las máscaras siguen fallando**, revisar posibles causas:
   - Problema con Fabric.js persistiendo el maskType
   - Problema con la serialización de los paths
   - Problema con la interpretación de Gemini

5. **Si la calidad sigue baja**, considerar:
   - Limitación del modelo Gemini (compresión en salida)
   - Usar modelo diferente
   - Post-procesamiento para mejorar nitidez
