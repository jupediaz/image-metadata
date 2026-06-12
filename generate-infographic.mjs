#!/usr/bin/env node
/**
 * Generate Lexiel infographic using Gemini API
 * Uses the same SDK as image-metadata project
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_GEMINI_API_KEY');
  process.exit(1);
}

const MODEL = process.argv[2] || 'gemini-2.0-flash-exp';
const OUTPUT_PREFIX = process.argv[3] || 'lexiel-infographic';

async function generateInfographic(prompt, outputName) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  console.log(`\n🎨 Generating: ${outputName}`);
  console.log(`📡 Model: ${MODEL}`);
  console.log(`⏳ This may take 15-45 seconds...\n`);

  const startTime = Date.now();

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Response received in ${elapsed}s`);

    let imageCount = 0;
    let textContent = '';

    for (const candidate of response.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData) {
          imageCount++;
          const ext = part.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
          const filename = `${outputName}${imageCount > 1 ? `-${imageCount}` : ''}.${ext}`;
          const filepath = join(__dirname, filename);

          const buffer = Buffer.from(part.inlineData.data, 'base64');
          writeFileSync(filepath, buffer);
          console.log(`💾 Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)}KB)`);
        }
        if (part.text) {
          textContent += part.text + '\n';
        }
      }
    }

    if (textContent) {
      console.log(`\n📝 Text response:\n${textContent}`);
    }
    if (imageCount === 0) {
      console.log('⚠️  No images returned. The model may need a different prompt or model version.');
      console.log('Response:', JSON.stringify(response, null, 2).substring(0, 500));
    }

    return imageCount;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Error after ${elapsed}s:`, error.message);
    if (error.message.includes('not found') || error.message.includes('not supported')) {
      console.log('\n💡 Try a different model: gemini-2.0-flash-exp, gemini-2.5-flash-image, gemini-3.1-flash-image-preview');
    }
    return 0;
  }
}

// --- PROMPTS ---

const LEXIEL_PITCH_INFOGRAPHIC = `
Create a professional, visually stunning INFOGRAPHIC for a startup pitch deck.

BRAND: Lexiel.ai
TAGLINE: "Tu copiloto jurídico con IA" (Your AI Legal Copilot)
INDUSTRY: Legal AI / LegalTech
TARGET: Spanish lawyers and law firms

DESIGN REQUIREMENTS:
- Modern, clean, premium tech startup aesthetic
- Color palette: Deep navy blue (#1a1a2e), Electric blue accent (#4361ee), White, Light gray
- The letter "x" in "Lexiel" should be highlighted in the accent color (electric blue)
- Professional typography, no childish elements
- Infographic style with icons, data visualizations, and flow diagrams
- Dimensions: portrait orientation, suitable for presentation slide

CONTENT TO INCLUDE:

HEADER: "Lexiel.ai" logo text with tagline

SECTION 1 - THE PROBLEM:
- 149,000 practicing lawyers in Spain
- 57% of billable hours could be automated
- Lawyers bill only 2.6 hours (33%) of an 8-hour day
- Current AI tools hallucinate legal citations (THE #1 FEAR)

SECTION 2 - THE SOLUTION:
- AI specialized in Spanish law (BOE, CGPJ, jurisprudencia)
- 100% verified citations — zero hallucinations
- GDPR compliant, EU servers only
- 12 features: Chat, Document Analysis, Case Law Search, Writing Generator, Deadline Calculator, Adversarial Analysis, Voice Dictation, Client Comms, Contract Analysis, Time Tracking + more

SECTION 3 - MARKET:
- Spanish legal AI market: $18.1M (2024) → $50.8M (2030)
- 18% CAGR growth
- 46% AI adoption rate among firms (up from 31%)

SECTION 4 - PRICING ADVANTAGE:
- Lexiel Starter: 29€/mo (vs competitors at 100-400€)
- Lexiel Professional: 79€/mo per user
- ROI: Pays for itself saving just 18 min/month

SECTION 5 - COMPETITIVE MOAT:
- ZERO competitors with Spanish deadline calculator
- ZERO competitors with LexNET integration
- ONLY dual pricing 29€ + 79€ with Spanish legal AI
- Partnership: Carlos Rivero (300K+ followers, 11K+ students)

FOOTER: "lexiel.ai" | "Built by Codelabs.studio"

Make it look like a $2B startup pitch deck infographic. High quality, data-driven, visually impressive.
`;

const LEXIEL_TEAM_SLIDE = `
Create a professional INFOGRAPHIC slide for a startup pitch deck.

BRAND: Lexiel.ai — Legal AI for Spanish lawyers
DESIGN: Modern tech startup, navy blue (#1a1a2e) and electric blue (#4361ee) palette

This slide is about the FOUNDER & COMPANY:

HEADER: "The Team Behind Lexiel"

FOUNDER: José Díaz
- Full-stack developer & entrepreneur
- Company: Codelabs Studio (codelabs.studio)
- Expertise: AI/ML, SaaS architecture, legal tech
- Building with: Claude (Anthropic), Gemini (Google), RAG pipelines
- Based in Spain

COMPANY: Codelabs Studio
- Software development studio
- Portfolio of AI-powered products
- Infrastructure: self-hosted servers, Cloudflare, Keycloak
- Tech stack: Next.js, React, TypeScript, Hono.js, PostgreSQL

PARTNERSHIP:
- Carlos Rivero / Derecho Virtual
- 300K+ followers, 11K+ LexiAI Pro students
- Distribution partnership for launch
- 25+ YouTube videos covering legal AI market

DESIGN: Professional, clean layout with icons. Include visual elements like a tech stack diagram or partnership flow. Portrait orientation.
`;

// Run generation
console.log('🚀 Lexiel Infographic Generator');
console.log('================================\n');

const count1 = await generateInfographic(LEXIEL_PITCH_INFOGRAPHIC, `${OUTPUT_PREFIX}-pitch`);
const count2 = await generateInfographic(LEXIEL_TEAM_SLIDE, `${OUTPUT_PREFIX}-team`);

console.log(`\n================================`);
console.log(`📊 Total images generated: ${count1 + count2}`);
console.log(`📁 Output directory: ${__dirname}`);
