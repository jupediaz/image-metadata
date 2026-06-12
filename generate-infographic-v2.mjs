#!/usr/bin/env node
/**
 * Generate Lexiel infographics v2 - Corrected prompts
 * Landscape, white background, Spanish, no Carlos Rivero, separate slides
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = __dirname;

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_GEMINI_API_KEY');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-image-preview';

async function generateInfographic(prompt, outputName) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  console.log(`\n🎨 Generando: ${outputName}`);
  console.log(`📡 Modelo: ${MODEL} (Nano Banana 2)`);
  console.log(`⏳ Esto puede tardar 15-45 segundos...\n`);

  const startTime = Date.now();

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Respuesta recibida en ${elapsed}s`);

    let imageCount = 0;
    for (const candidate of response.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData) {
          imageCount++;
          const ext = part.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
          const filename = `${outputName}.${ext}`;
          const filepath = join(OUTPUT_DIR, filename);
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          writeFileSync(filepath, buffer);
          console.log(`💾 Guardado: ${filepath} (${(buffer.length / 1024).toFixed(0)}KB)`);
        }
      }
    }

    if (imageCount === 0) {
      console.log('⚠️  Sin imágenes. Revisa el prompt o el modelo.');
    }
    return imageCount;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Error tras ${elapsed}s:`, error.message);
    return 0;
  }
}

// ============================================
// SLIDE 1: EL PROBLEMA
// ============================================
const SLIDE_PROBLEMA = `
Crea una INFOGRAFÍA PROFESIONAL en formato APAISADO (landscape, 16:9).

ESTILO VISUAL OBLIGATORIO:
- FONDO BLANCO puro, como un documento impreso en papel de alta calidad
- Tipografía negra principal, acentos en azul eléctrico (#4361ee)
- Diseño limpio, minimalista, con mucho espacio en blanco
- Iconos lineales modernos (estilo Lucide/Feather icons)
- Gráficos y visualizaciones de datos elegantes
- Sin degradados oscuros, sin fondos de color sólido
- Aspecto de infografía impresa en revista de negocios premium

IDIOMA: Todo en ESPAÑOL. Sin anglicismos.

ENCABEZADO: "El Problema" con subtítulo "La abogacía española necesita IA especializada"

CONTENIDO (con visualizaciones de datos):

BLOQUE IZQUIERDO - "Ineficiencia estructural":
- 149.000 abogados ejercientes en España
- Solo facturan 2,6 horas (33%) de una jornada de 8 horas
- El 57% de las horas facturables podrían automatizarse
- Representar esto con gráfico de barras o circular

BLOQUE CENTRAL - "El miedo #1: Las alucinaciones":
- Las herramientas de IA genérica inventan citas jurídicas
- Los abogados no confían en la IA para trabajo profesional
- Riesgo de sanciones por citar jurisprudencia falsa
- Icono grande de alerta/advertencia

BLOQUE DERECHO - "Herramientas caras y genéricas":
- Las soluciones existentes cuestan entre 100€ y 400€/mes
- Ninguna está especializada en derecho español
- Los abogados usan 3-5 herramientas diferentes (3.600€/mes)
- No conocen el BOE, el CGPJ ni la jurisprudencia española

PIE: "lexiel.ai" en azul eléctrico, discreto

Hazla con calidad de presentación de startup ante inversores. Aspecto profesional, limpio, datos claros.
`;

// ============================================
// SLIDE 2: EL MERCADO
// ============================================
const SLIDE_MERCADO = `
Crea una INFOGRAFÍA PROFESIONAL en formato APAISADO (landscape, 16:9).

ESTILO VISUAL OBLIGATORIO:
- FONDO BLANCO puro, como un documento impreso en papel de alta calidad
- Tipografía negra principal, acentos en azul eléctrico (#4361ee)
- Diseño limpio, minimalista, con mucho espacio en blanco
- Gráficos de datos visualmente impactantes (barras, líneas, áreas)
- Sin degradados oscuros, sin fondos de color sólido
- Aspecto de infografía de consultora de estrategia (McKinsey, BCG)

IDIOMA: Todo en ESPAÑOL. Sin anglicismos.

ENCABEZADO: "Oportunidad de Mercado" con subtítulo "IA jurídica en España: crecimiento acelerado"

CONTENIDO:

GRÁFICO PRINCIPAL (ocupa 40% del slide):
- Gráfico de crecimiento: $18,1M (2024) → $50,8M (2030)
- Tasa de crecimiento anual compuesta: 18%
- Mostrar curva ascendente con años intermedios

DATO DESTACADO:
- 46% de los despachos ya adoptan IA (antes era el 31%)
- Tendencia claramente al alza

TABLA COMPARATIVA DE PRECIOS (formato limpio):
| Competidor        | Precio/mes |
| IA genérica (ChatGPT, Claude) | 20-25€ |
| Lexiel Abogado    | 29€        |
| Prudencia.ai      | 69€        |
| Lexiel Despacho   | 79€/usuario|
| Maite.ai          | 100€       |
| Aranzadi One      | 117€       |
| Lefebvre GenIA-L  | 200-400€   |
| vLex Vincent      | 370€+      |

POSICIONAMIENTO: Destacar que Lexiel es el ÚNICO producto con doble posicionamiento: precio de entrada competitivo (29€) + plan profesional completo (79€)

DATO DE CIERRE: "Harvey AI (valoración >$2.000M) anunció expansión en España en febrero 2026 — validación del mercado"

PIE: "lexiel.ai" en azul eléctrico, discreto

Calidad de presentación ante inversores. Datos claros, visualización impactante.
`;

// ============================================
// SLIDE 3: LA SOLUCIÓN (FUNCIONALIDADES)
// ============================================
const SLIDE_SOLUCION = `
Crea una INFOGRAFÍA PROFESIONAL en formato APAISADO (landscape, 16:9).

ESTILO VISUAL OBLIGATORIO:
- FONDO BLANCO puro, como documento impreso en papel premium
- Tipografía negra principal, acentos en azul eléctrico (#4361ee)
- Diseño limpio con iconos lineales modernos para cada funcionalidad
- Mucho espacio en blanco, distribución equilibrada
- Sin degradados oscuros, sin fondos de color sólido

IDIOMA: Todo en ESPAÑOL. Sin anglicismos.

ENCABEZADO: "Lexiel.ai — Tu copiloto jurídico con IA"
Subtítulo: "La única IA especializada en derecho español con citas verificadas"

CONTENIDO - Mostrar las funcionalidades principales en una cuadrícula visual (3x4 o similar):

1. 💬 Chat jurídico inteligente — Preguntas legales con respuestas citando artículos y jurisprudencia
2. 📄 Análisis de documentos — Contratos, demandas, sentencias: detecta riesgos y cláusulas clave
3. ⚖️ Búsqueda de jurisprudencia — Búsqueda semántica en sentencias del Tribunal Supremo y Audiencias
4. ✍️ Generador de escritos — Borradores de demandas, contestaciones, recursos, contratos
5. 📅 Calculadora de plazos — Plazos procesales españoles con días hábiles, festivos y agosto
6. 🔍 Análisis contradictorio — Encuentra puntos débiles antes que el abogado contrario
7. 🎙️ Dictado por voz — Voz → documento jurídico estructurado
8. 📊 Control de tiempo — Temporizador + IA genera descripciones de facturación
9. 📑 Análisis de contratos — Cláusula por cláusula con contexto del derecho civil español
10. ✅ Verificación anti-alucinación — Cada cita verificada contra BOE, CGPJ y fuentes oficiales

DESTACAR en grande: "100% citas verificadas — Cero alucinaciones"

ELEMENTO VISUAL: Diagrama de flujo mostrando: Pregunta del abogado → IA analiza → Busca en corpus legal → Verifica citas → Respuesta fiable

PIE: "lexiel.ai" | "Servidores en la UE · Cumplimiento RGPD"

Calidad de revista de negocios premium. Profesional, limpio, inspirador de confianza.
`;

// ============================================
// SLIDE 4: QUIÉN SOY (PERFIL FUNDADOR)
// ============================================
const SLIDE_FUNDADOR = `
Crea una INFOGRAFÍA PROFESIONAL en formato APAISADO (landscape, 16:9).

ESTILO VISUAL OBLIGATORIO:
- FONDO BLANCO puro, como documento impreso en papel premium
- Tipografía negra principal, acentos en azul eléctrico (#4361ee)
- Diseño limpio, profesional, equilibrado
- NO dibujar avatar ni cara de persona. Usar solo iconos abstractos si es necesario.
- Sin degradados oscuros, sin fondos de color

IDIOMA: Todo en ESPAÑOL. Sin anglicismos.

ENCABEZADO: "Sobre el fundador" con subtítulo "José Díaz — Fundador y CTO de Codelabs Studio"

CONTENIDO:

BLOQUE IZQUIERDO - "Trayectoria":
- +15 años de experiencia en desarrollo de software
- CTO en Fishfishme (San Diego, EE.UU.) — equipos distribuidos en 5 países
- Desarrollador senior en Atrápalo (Barcelona) — equipo de 65+ desarrolladores
- Finalista en SeedRocket (aceleradora de startups, Barcelona)
- Director de IT en IMCW Europe — gestión de equipos y arquitectura
- Fundador de Codelabs Studio desde 2009
- Ingeniero Técnico en Informática de Gestión — Universidad de Málaga

BLOQUE CENTRAL - "Especialización técnica":
- Arquitectura full-stack: TypeScript, React, Next.js, Node.js, PostgreSQL
- Inteligencia artificial: Claude (Anthropic), Gemini (Google), RAG, embeddings
- Infraestructura: Docker, Kubernetes, AWS, Cloudflare
- Metodologías: DDD, CQRS, arquitectura hexagonal, SOLID
- Productos en producción: plataformas SaaS de IA con miles de usuarios

BLOQUE DERECHO - "Codelabs Studio":
- Estudio de desarrollo de software (Málaga, España)
- Cartera de productos propios de IA
- Clientes internacionales desde 2009
- Infraestructura propia: servidores, email, autenticación

ENLACES (mostrar como iconos con texto):
- jjdiaz.dev (web personal)
- linkedin.com/in/josediazmoreno
- github.com/jupediaz
- codelabs.studio

PIE: "codelabs.studio" en azul eléctrico, discreto

Aspecto profesional de CV ejecutivo. Sin fotos, sin avatares. Solo datos, iconos y diseño limpio.
`;

// Run all generations
console.log('🚀 Lexiel — Generador de Infografías v2');
console.log('=========================================');
console.log('Formato: Apaisado | Fondo: Blanco | Idioma: Español');
console.log('=========================================\n');

let total = 0;
total += await generateInfographic(SLIDE_PROBLEMA, 'lexiel-v2-01-problema');
total += await generateInfographic(SLIDE_MERCADO, 'lexiel-v2-02-mercado');
total += await generateInfographic(SLIDE_SOLUCION, 'lexiel-v2-03-solucion');
total += await generateInfographic(SLIDE_FUNDADOR, 'lexiel-v2-04-fundador');

console.log(`\n=========================================`);
console.log(`📊 Total imágenes generadas: ${total}`);
console.log(`📁 Directorio: ${OUTPUT_DIR}`);
