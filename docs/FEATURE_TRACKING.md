# Feature Tracking

Last Updated: 2026-02-12

## Legend
- 🔵 Planned - Designed but not started
- 🟡 In Progress - Currently being implemented
- 🟢 Implemented - Code complete, needs testing
- ✅ Complete - Tested and deployed
- ⏸️ Paused - On hold
- ❌ Cancelled - Will not implement

---

## 🔧 Bug Fixes & Optimizations

### IndexedDB Persistence Fix
**Status**: ✅ Complete
**Priority**: Critical
**Completed**: 2026-02-12

**Problem**:
Images were being lost on page reload. The `useAutoPersist` hook was using `useRef` to prevent re-subscriptions, but this caused the subscription to fail in React StrictMode (development):
- First execution: subscribes → unmounts
- Second execution: `initialized.current = true` → returns early → NEVER subscribes

**Solution**:
Removed the `useRef` pattern and let React handle the lifecycle correctly with proper cleanup.

**Files Modified**:
- `src/hooks/useAutoPersist.ts`

**Impact**:
- ✅ Images now save automatically to IndexedDB
- ✅ Images persist on page reload
- ✅ Works across browser sessions

**Testing**:
- [x] Upload 3 images
- [x] Reload page - images remain
- [x] Close browser and reopen - images remain

**Next Steps**: None - fully functional

---

### ImageMagick Command Deprecation Fix
**Status**: ✅ Complete
**Priority**: Critical
**Completed**: 2026-02-12

**Problem**:
Code was using deprecated `convert` command (ImageMagick v6) which:
- Shows warnings in logs
- May not work in future versions
- Using `magick` (v7) is the correct approach

**Solution**:
Replaced all instances of `convert` with `magick`:

**Files Modified**:
- `src/lib/image-processing.ts` (3 occurrences)
  - Line 23: `generateThumbnail()` for HEIC
  - Line 133: `convertToHeicWithQuality()` main command
  - Line 156: `convertToHeicWithQuality()` adjusted quality command
- `src/app/api/export-version/route.ts` (1 occurrence)
  - Line 106: JPG conversion
- `src/app/api/image/route.ts` (1 occurrence)
  - Line 19: HEIC to JPEG conversion

**Impact**:
- ✅ No more deprecation warnings
- ✅ Image export works correctly
- ✅ Future-proof for ImageMagick v7+

**Technical Details**:
```bash
# Before (deprecated)
convert "input.png" -quality 85 "output.heic"

# After (correct)
magick "input.png" -quality 85 "output.heic"
```

---

### HEIC Encoder Parameters Fix
**Status**: ✅ Complete
**Priority**: High
**Completed**: 2026-02-12

**Problem**:
Export to HEIC was failing with error:
```
magick: Unsupported encoder parameter (5.2005)
@ error/heic.c/IsHEIFSuccess/202
```

The parameter `-define heic:speed=4` is not compatible with libheif 1.21.2.

**Solution**:
Removed the incompatible `-define heic:speed=4` parameter. Only use `-quality` parameter which is properly supported.

**Files Modified**:
- `src/lib/image-processing.ts`
  - Line 129-137: Main conversion command
  - Line 155-161: Adjusted quality command

**Technical Details**:
```bash
# Before (fails)
magick "input.png" -quality 85 -define heic:speed=4 "output.heic"

# After (works)
magick "input.png" -quality 85 "output.heic"
```

**Verified**:
- libheif version: 1.21.2
- ImageMagick delegates: includes `heic` support
- Available parameters via `heif-enc --help`: `-q/--quality` only

**Impact**:
- ✅ HEIC export now works correctly
- ✅ No more encoder parameter errors

---

## 🎨 UI/UX Improvements

### Model Selection UI
**Status**: ✅ Complete
**Priority**: Medium
**Completed**: 2026-02-12

**Changes**:
1. **Default Model**: Pro Image (`gemini-3-pro-image-preview`) selected by default
2. **Model Order**: Pro Image listed first, Flash Image second
3. **Simplified Labels**:
   - "Pro Image" (instead of "Gemini 3 Pro Image Preview")
   - "Flash Image" (instead of "Gemini 2.5 Flash Image")

**Files Modified**:
- `src/components/editor/ImageEditor.tsx`
  - Line 34: Default model state
  - Lines 37-50: Model options array

**Rationale**:
Pro Image provides highest quality for professional editing work, making it the better default despite being slower.

---

### Comparison View Metadata Enhancement
**Status**: ✅ Complete
**Priority**: High
**Completed**: 2026-02-12

**Problem**:
Comparison view only showed:
- Model name
- Processing time

Users needed more detailed information to make informed decisions about which version to use.

**Solution**:
Enhanced overlay to show comprehensive metadata:

**New Information Displayed**:
- ✅ Dimensions (width × height)
- ✅ Format (HEIC, JPG, PNG, etc.)
- ✅ File size (formatted: KB/MB)
- ✅ Color space (if available)
- ✅ Bit depth (if available)
- ✅ Model used (for edited versions)
- ✅ Processing time (for edited versions)

**Files Modified**:
- `src/components/comparison/ModelComparisonView.tsx`
  - Added `formatFileSize()` helper function
  - Updated all 4 info overlays (left/right × synced/normal mode)

**Design**:
```
┌─────────────────────────────────────────┐
│      Gemini 2.5 Flash                   │
│         ⏱️ 15.3s                         │
│  ─────────────────────────────────────  │
│  Dimensiones:    4032 × 3024            │
│  Formato:        HEIC                   │
│  Tamaño:         2.5 MB                 │
│  Color:          sRGB                   │
│  Profundidad:    8 bits                 │
└─────────────────────────────────────────┘
```

**Impact**:
- ✅ Users can make informed decisions
- ✅ Easy to compare original vs edited
- ✅ Professional metadata display

---

## 🎯 Features Already Implemented

### Auto-Redirect to Comparison After AI Generation
**Status**: ✅ Complete (Already Existed)
**Priority**: Medium
**Verified**: 2026-02-12

**Feature**:
After generating an AI edit, automatically redirects to side-by-side comparison view showing:
- Left: Original image
- Right: AI-edited version
- With "fromEditor" flag for special actions

**Implementation**:
- `src/components/editor/ImageEditor.tsx` (Line 156)
- Route: `/image/{id}/compare?left=original&right=model-{model}&fromEditor=true`

**Status**: Working correctly, no changes needed.

---

### Simplified Drawing Tools
**Status**: ✅ Complete (Already Existed)
**Priority**: High
**Verified**: 2026-02-12

**Feature**:
Simple, intuitive drawing tools for AI image editing:

**Tools Available**:
1. 🔴 **Pincel Rojo - Modificar**
   - Marks areas for AI to modify
   - Red color (rgba(255, 0, 0, 0.6))
   - Creates inpainting mask

2. 🟢 **Pincel Verde - Proteger**
   - Marks protected areas (AI won't touch)
   - Green color (rgba(0, 255, 0, 0.6))
   - Creates safe zone mask

3. 🧹 **Borrador**
   - Removes red or green strokes
   - Blue highlight when active

4. 🤚 **Modo Mover**
   - Pan/drag to reposition image
   - Yellow highlight when active

**Additional Controls**:
- Brush size slider (5-100px)
- Clear all button
- Undo button
- Zoom controls

**Implementation**:
- `src/components/editor/InpaintingCanvas.tsx`
- Uses Fabric.js for canvas manipulation
- Exports separate masks for inpainting and safe zones

**Status**: Working correctly, no changes needed.

**Note**: If user sees old UI with icons (Select, Pan, Brush, Eraser, Lasso), it's browser cache issue. Hard refresh required.

---

## 📊 System Health

### Current Status
- ✅ Server running without errors
- ✅ All API endpoints responding (200 OK)
- ✅ Image upload working
- ✅ AI editing working (19.6s avg processing time)
- ✅ Export working (HEIC, JPG)
- ✅ Persistence working (IndexedDB)

### Known Issues
- ⚠️ Browser cache may show old UI - requires hard refresh
- ⚠️ EMFILE warnings on macOS (not critical, use `ulimit -n 10240`)

---

## 🚀 Next Steps

### Recommended Improvements
1. 🔵 Add keyboard shortcuts for drawing tools (1-4 keys)
2. 🔵 Show file size difference in comparison view (e.g., "+5% larger")
3. 🔵 Add batch export feature for multiple versions
4. 🔵 Implement version history with visual timeline
5. 🔵 Add undo/redo for edit history

### Future Features
- 🔵 Support for batch processing (multiple images at once)
- 🔵 Advanced masking tools (polygon selection, magic wand)
- 🔵 Export presets (web optimized, print quality, etc.)
- 🔵 Metadata editing (EXIF, IPTC, XMP)
- 🔵 Cloud sync for cross-device access

---

## 📝 Notes

### Browser Cache Issue
**Critical**: After code changes, users MUST hard refresh to see updates:
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`
- Or: DevTools → Right-click Reload → "Empty Cache and Hard Reload"

### ImageMagick Configuration
- Version: 7.1.2-13
- libheif: 1.21.2
- HEIC support: ✅ Enabled
- Recommended parameters: `-quality` only (0-100)

### IndexedDB Structure
```
image-metadata-db/
├── images/      (metadata)
├── blobs/       (image data)
├── actions/     (edit history)
└── session/     (current state)
```

---

**End of Feature Tracking**
