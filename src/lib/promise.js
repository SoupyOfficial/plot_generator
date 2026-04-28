// src/lib/promise.js
//
// L2 Promise stage generator — produces story promises (protagonist/want/obstacle/stakes)
// from locked seed artifact + wizard selections. Returns 3 candidates with different stakes variations.

import { detectProvider } from './llmPing.js';

/**
 * Generate promise candidates (story contract artifacts) from seed + selections.
 * 
 * @param {Object} seed - Locked seed artifact from L1 { premise, genre, tone }
 * @param {Object} selections - L2 wizard selections (beats, micro, series, theme)
 * @param {Object} opts - Generation options
 * @param {Object} opts.storage - Storage adapter instance
 * @param {string} opts.projectId - Project ID for fixture lookup
 * @param {string} [opts.stakesMagnitude] - Stakes hint: 'low' | 'medium' | 'high'
 * @param {string} [opts.endingShape] - Ending hint: 'hopeful' | 'bittersweet' | 'tragic'
 * @param {string} [opts.apiKey] - LLM API key (required if useLive === true)
 * @param {boolean} [opts.useLive=false] - Use live LLM or return fixtures
 * @returns {Promise<Array>} Array of 3 { artifact, generatedAt } objects
 */
export async function generatePromiseCandidates(seed, selections, opts = {}) {
  const {
    storage,
    projectId,
    stakesMagnitude = 'medium',
    endingShape = 'bittersweet',
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

    // Build prompt from seed + selections
    const prompt = buildPromisePrompt(seed, selections, stakesMagnitude, endingShape);

    // Generate 3 candidates via LLM
    const candidates = [];
    for (let i = 0; i < 3; i++) {
      const variation = i === 0 ? 'tragic' : i === 1 ? 'hopeful' : 'bittersweet';
      const result = await callLlmForPromise(apiKey, provider, prompt, variation);
      
      candidates.push({
        artifact: {
          protagonist: result.protagonist,
          want: result.want,
          obstacle: result.obstacle,
          stakes: result.stakes,
          irony: result.irony || '',
          endingShape: variation,
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

  const existingCandidates = await storage.getCandidates(projectId, 'promise');
  
  if (existingCandidates.length >= 3) {
    // Return first 3 candidates
    return existingCandidates.slice(0, 3).map(c => ({
      artifact: c.artifact,
      generatedAt: c.generatedAt,
    }));
  }

  // If no fixtures exist, throw error
  throw new Error('No fixture candidates found. Run seedFixtureCandidates() first.');
}

/**
 * Build structured prompt for promise generation.
 * @private
 */
function buildPromisePrompt(seed, selections, stakesMagnitude, endingShape) {
  const parts = [];

  parts.push('Generate a story promise (protagonist, want, obstacle, stakes, irony) based on this seed:');
  parts.push(`\nSeed Premise: ${seed.premise}`);
  parts.push(`Genre: ${seed.genre}`);
  parts.push(`Tone: ${seed.tone}`);
  
  parts.push('\nAdditional constraints:');
  
  if (selections.beats && selections.beats.length > 0) {
    parts.push(`- Story beats: ${selections.beats.join(', ')}`);
  }
  
  if (selections.micro) {
    parts.push(`- Micro conflict: ${selections.micro}`);
  }
  
  if (selections.theme) {
    parts.push(`- Central theme: ${selections.theme}`);
  }

  if (selections.series) {
    parts.push(`- Series context: ${selections.series}`);
  }

  parts.push(`\nStakes magnitude: ${stakesMagnitude}`);
  parts.push(`Ending shape: ${endingShape}`);

  parts.push('\nReturn ONLY a JSON object with this structure:');
  parts.push('{ "protagonist": "...", "want": "...", "obstacle": "...", "stakes": "...", "irony": "..." }');

  return parts.join('\n');
}

/**
 * Call LLM API to generate a single promise candidate.
 * @private
 */
async function callLlmForPromise(apiKey, provider, prompt, variation) {
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
        max_tokens: 300,
        messages: [{ 
          role: 'user', 
          content: `${prompt}\n\nEnding variation: ${variation}` 
        }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    
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
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ 
        role: 'user', 
        content: `${prompt}\n\nEnding variation: ${variation}` 
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
