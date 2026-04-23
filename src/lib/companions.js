// src/lib/companions.js
//
// Companion / party builder: a rotating roster of 2-4 companions the user
// can recruit. Each companion has tags so we can score them against the
// current selection context (light Draft Kings style).

/**
 * Canonical companion roster. Each entry ties loosely to a subplot archetype
 * so we can suggest party members that match the user's chosen subplots.
 */
export const COMPANION_ROSTER = [
  {
    id: "sage",
    name: "The Reticent Sage",
    role: "Mentor",
    blurb: "Knows more than they say. Will eventually say it.",
    tags: ["mentor", "mystery", "cerebral"],
  },
  {
    id: "rival",
    name: "The Mirror Rival",
    role: "Rival-Ally",
    blurb: "Same goal, different method. Sharpens the protagonist by friction.",
    tags: ["rival", "autonomous", "compounding-required"],
  },
  {
    id: "foundfamily",
    name: "The Kid with the Knife",
    role: "Found Family",
    blurb: "Small. Loyal. Unbearably earnest. First to the point.",
    tags: ["family", "reluctant", "constructive"],
  },
  {
    id: "fixer",
    name: "The Information Broker",
    role: "Fixer",
    blurb: "Trades favors, knows the back-alleys of the system.",
    tags: ["pragmatic", "tool-user", "mystery-friendly"],
  },
  {
    id: "zealot",
    name: "The Believer",
    role: "Zealot",
    blurb: "Faith in the system is their entire architecture. For now.",
    tags: ["faith-break", "audience-pressure", "visible-constraint"],
  },
  {
    id: "smith",
    name: "The Crafter",
    role: "Smith",
    blurb: "Turns system resources into actual economic power.",
    tags: ["constructive", "tool-user", "pragmatic"],
  },
  {
    id: "shadow",
    name: "The Shadow",
    role: "Spy",
    blurb: "Already infiltrated the enemy. Loyalty renewed each chapter.",
    tags: ["mystery", "twist", "anti-system"],
  },
  {
    id: "oracle",
    name: "The Broken Oracle",
    role: "Seer",
    blurb: "Sees fragments of what's coming. Hates every one of them.",
    tags: ["foreknowledge", "mystery", "compounding-required"],
  },
  {
    id: "warrior",
    name: "The Deathsworn",
    role: "Frontliner",
    blurb: "Will die for the protagonist. Quite specifically.",
    tags: ["autonomous", "reluctant", "twist"],
  },
  {
    id: "beast",
    name: "The Bonded Beast",
    role: "Familiar",
    blurb: "Animal companion with a system link. Growing smarter daily.",
    tags: ["constructive", "tool-user", "mystery-friendly"],
  },
  {
    id: "heretic",
    name: "The Heretic Mage",
    role: "Wildcard",
    blurb: "Refuses to follow system tech trees. Sometimes brilliant. Often fire.",
    tags: ["anti-system", "autonomous", "compounding-required"],
  },
  {
    id: "noble",
    name: "The Fallen Noble",
    role: "Politick",
    blurb: "Knows every faction, owes every faction, owns none.",
    tags: ["pragmatic", "audience-pressure", "visible-constraint"],
  },
];

/**
 * Score a companion against the user's currently active tags + picked subplots.
 */
function scoreCompanion(companion, activeTags, subplotStrings) {
  let score = 0;
  for (const t of companion.tags || []) {
    if (activeTags.has(t)) score += 2;
  }
  // Bonus: companion.role fragments appearing in subplot labels.
  const role = (companion.role || "").toLowerCase();
  for (const s of subplotStrings) {
    if (s.includes(role)) score += 3;
    // tags also; subplot labels often contain "Mentor", "Rival", "Romance"
    for (const t of companion.tags || []) {
      if (s.includes(t)) score += 1;
    }
  }
  return score;
}

/**
 * Suggest a prioritized roster to surface in the party picker.
 * @param {object} args
 * @param {Set<string>} args.activeTags - tags currently implied by selections
 * @param {string[]}    args.subplots   - user's selected subplot labels
 * @param {number}      [args.limit=8]
 */
export function suggestRoster({ activeTags, subplots = [], limit = 8 } = {}) {
  const subplotLc = (subplots || []).map((s) => (s || "").toLowerCase());
  const tags = activeTags instanceof Set ? activeTags : new Set(activeTags || []);
  const scored = COMPANION_ROSTER.map((c) => ({
    ...c,
    score: scoreCompanion(c, tags, subplotLc),
  }));
  // Sort by score desc, then alphabetical for stability.
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

/**
 * Serialize recruited companions for the structured prompt.
 */
export function renderCompanionsSection(companions) {
  if (!Array.isArray(companions) || companions.length === 0) return "";
  const lines = companions.map((id) => {
    const c = COMPANION_ROSTER.find((x) => x.id === id);
    if (!c) return `- ${id}`;
    return `- **${c.name}** (${c.role}) — ${c.blurb}`;
  });
  return lines.join("\n");
}

/**
 * Return the raw entry for an id; safe for undefined ids.
 */
export function findCompanion(id) {
  return COMPANION_ROSTER.find((c) => c.id === id) || null;
}
