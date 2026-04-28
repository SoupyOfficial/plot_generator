// src/lib/seed.js
//
// L1 Seed stage generator — produces 1-paragraph premises from wizard selections
// Returns 3 candidates with different tonal variations (darker/lighter/balanced)

import { pingLlm, detectProvider } from './llmPing.js';

/**
 * Generate seed candidates (premise artifacts) from wizard selections.
 * 
 * @param {Object} selections - Wizard selections (preset, macro, mid, subplots, protagonist)
 * @param {Object} opts - Generation options
 * @param {Object} opts.storage - Storage adapter instance
 * @param {string} opts.projectId - Project ID for fixture lookup
 * @param {string} [opts.toneLean] - Tonal hint: 'darker' | 'lighter' | 'balanced'
 * @param {string} [opts.apiKey] - LLM API key (required if useLive === true)
 * @param {boolean} [opts.useLive=false] - Use live LLM or return fixtures
 * @returns {Promise<Array>} Array of 3 { artifact, generatedAt } objects
 */
export async function generateSeedCandidates(selections, opts = {}) {
  const {
    storage,
    projectId,
    toneLean = 'balanced',
    apiKey,
    useLive = false,
  } = opts;

  // Live mode: call LLM API
  if (useLive) {
    if (!apiKey) {
      throw new Error('API key required for live LLM generation');
    }

    const provider = detectProvider(apiKey);
    if (!provider) {
      throw new Error('Invalid API key format');
    }

    // Build prompt from selections
    const prompt = buildSeedPrompt(selections, toneLean);

    // Generate 3 candidates via LLM
    const candidates = [];
    for (let i = 0; i < 3; i++) {
      const variation = i === 0 ? 'darker' : i === 1 ? 'lighter' : 'balanced';
      const result = await callLlmForSeed(apiKey, provider, prompt, variation);
      
      candidates.push({
        artifact: {
          premise: result.premise,
          genre: result.genre || inferGenre(selections),
          tone: variation,
        },
        generatedAt: new Date(),
      });
    }

    return candidates;
  }

  // Fixture mode: return pre-seeded candidates from storage
  if (!storage || !projectId) {
    throw new Error('storage and projectId required for fixture mode');
  }

  const existingCandidates = await storage.getCandidates(projectId, 'seed');
  
  if (existingCandidates.length >= 3) {
    // Return first 3 candidates
    return existingCandidates.slice(0, 3).map(c => ({
      artifact: c.artifact,
      generatedAt: c.generatedAt,
    }));
  }

  // If no fixtures exist, throw error (tests should seed fixtures first)
  throw new Error('No fixture candidates found. Run seedFixtureCandidates() first.');
}

/**
 * Build structured prompt for seed generation.
 * @private
 */
function buildSeedPrompt(selections, toneLean) {
  const parts = [];

  parts.push('Generate a compelling 1-paragraph premise for a story with these elements:');
  
  if (selections.preset && selections.preset !== 'none') {
    parts.push(`- Preset: ${selections.preset}`);
  }
  
  if (selections.macro) {
    parts.push(`- Macro conflict: ${selections.macro}`);
  }
  
  if (selections.mid) {
    parts.push(`- Midpoint shift: ${selections.mid}`);
  }
  
  if (selections.subplots && selections.subplots.length > 0) {
    parts.push(`- Subplots: ${selections.subplots.join(', ')}`);
  }
  
  if (selections.protagonist) {
    parts.push(`- Protagonist archetype: ${selections.protagonist}`);
  }

  if (toneLean) {
    parts.push(`\nTonal lean: ${toneLean} (adjust darkness/hope accordingly)`);
  }

  parts.push('\nReturn ONLY a JSON object with this structure:');
  parts.push('{ "premise": "one paragraph premise text", "genre": "genre name" }');

  return parts.join('\n');
}

/**
 * Call LLM API to generate a single seed candidate.
 * @private
 */
async function callLlmForSeed(apiKey, provider, prompt, variation) {
  const started = Date.now();

  if (provider === 'anthropic') {
    const model = 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [{ 
          role: 'user', 
          content: `${prompt}\n\nVariation: ${variation}` 
        }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    
    // Parse JSON response
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse LLM response as JSON: ${text}`);
    }
  }

  // OpenAI
  const model = 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ 
        role: 'user', 
        content: `${prompt}\n\nVariation: ${variation}` 
      }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON: ${text}`);
  }
}

/**
 * Infer genre from macro/mid selections if LLM doesn't provide one.
 * @private
 */
function inferGenre(selections) {
  // Simple heuristic mapping
  const macro = selections.macro || '';
  const mid = selections.mid || '';
  
  if (macro.includes('Hunt') || mid.includes('Betrayal')) {
    return 'Dark Fantasy';
  }
  if (macro.includes('Quest') || mid.includes('Discovery')) {
    return 'High Fantasy';
  }
  if (mid.includes('Time') || macro.includes('Paradox')) {
    return 'Time Travel Mystery';
  }
  
  return 'General Fiction';
}
