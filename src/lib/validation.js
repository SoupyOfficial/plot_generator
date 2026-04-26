// src/lib/validation.js
//
// Phase 3: hybrid validation layer.
//   - data-driven: runs through `forbids` on every selected option
//   - cross-cutting: rules that span 2+ fields or involve arrays / counts,
//     kept as explicit functions.
//
// All warnings are returned as plain strings (back-compat with existing UI)
// but include a `{severity, message}` object for richer UIs if needed.

import { buildFieldIndex, collectForbidConflicts } from "./options.js";

const has = (s, id, frag) =>
  (s[id] || "").toString().toLowerCase().includes(frag.toLowerCase());

/**
 * Cross-cutting rules — these don't map cleanly to a single option's `forbids`
 * because they depend on counts, array contents, or multi-field combinations.
 */
export function crossCuttingRules(selections) {
  const warnings = [];
  const s = selections;
  const subplots = s.subplots || [];

  // Returner archetype → foreknowledge must compound
  if ((s.archetype || "").startsWith("The Returner")) {
    if (
      !has(s, "knowledgeAdvantage", "Future knowledge") &&
      !has(s, "knowledgeAdvantage", "Meta knowledge")
    ) {
      warnings.push(
        "The Returner archetype requires foreknowledge. Select 'Future knowledge' or 'Meta knowledge' under Knowledge Advantage."
      );
    }
    const hasCompounding =
      subplots.some(
        (x) =>
          x.toLowerCase().includes("mystery") ||
          x.toLowerCase().includes("rival") ||
          x.toLowerCase().includes("competitor")
      ) ||
      has(s, "antagonistType", "rival") ||
      has(s, "truthRevealPacing", "red herrings");
    if (!hasCompounding) {
      warnings.push(
        "Returner premise: foreknowledge MUST create compounding problems (rivals, mystery reveals, herrings). Add a Mystery subplot, a Rival antagonist, or Red Herrings reveal pacing."
      );
    }
  }

  // Neutral system + no cost of power = inert system
  if (has(s, "systemAlignment", "Neutral") && has(s, "costOfPower", "None")) {
    warnings.push(
      "Neutral system + No cost of power = inert system. Neutral ≠ inert. Add a cost of power or change alignment."
    );
  }

  // Theme Knowledge vs Consequence → mystery must be engine
  if (s.primaryTheme === "Knowledge vs Consequence") {
    const mysteryActive =
      subplots.some(
        (x) =>
          x.toLowerCase().includes("mystery") ||
          x.toLowerCase().includes("investigation") ||
          x.toLowerCase().includes("conspiracy")
      ) || has(s, "resolutionMode", "Exposure");
    if (!mysteryActive) {
      warnings.push(
        "Theme 'Knowledge vs Consequence' requires the system-origin mystery to be the engine. Add a Mystery/Investigation subplot or set Resolution Mode to Exposure."
      );
    }
  }

  // Open-ended series → need at least 2 anti-drift mechanisms
  if (
    has(s, "arcType", "Continuous narrative") ||
    has(s, "seriesCeiling", "Open-ended") ||
    has(s, "seriesCeiling", "No planned ending")
  ) {
    const ad = s.antiDrift || [];
    if (ad.length < 2) {
      warnings.push(
        "Open-ended / continuous series needs at least 2 anti-drift mechanisms locked. Add more structural locks in Layer 7.3."
      );
    }
  }
  if (has(s, "seriesCeiling", "No planned ending") && s.primaryTheme) {
    if (!has(s, "seriesCeiling", "thematic")) {
      warnings.push(
        "'No planned ending' is the highest drift risk. Strongly consider 'Open-ended with thematic endpoint' instead."
      );
    }
  }

  // Cost of Power = None → need human-cost subplot
  if (has(s, "costOfPower", "None")) {
    const humanCost = subplots.some((x) =>
      ["romance", "family", "identity", "secret", "obsession"].some((k) =>
        x.toLowerCase().includes(k)
      )
    );
    if (!humanCost) {
      warnings.push(
        "Costless power needs human cost instead. Add a Romance, Family, Identity Crisis, Secret, or Obsession subplot."
      );
    }
  }

  // Exposure ending + Single late reveal = twist, not resolution
  if (has(s, "resolutionMode", "Exposure") && has(s, "truthRevealPacing", "Single late reveal")) {
    warnings.push(
      "Exposure ending + Single late reveal = twist, not resolution. Use Drip or Two-stage pacing so the first breadcrumb lands on page one."
    );
  }

  // Subplot count 2–4
  if (subplots.length && (subplots.length < 2 || subplots.length > 4)) {
    warnings.push(`Subplot count is ${subplots.length}. Pick 2–4 for a single book.`);
  }

  // Life-stage × coming-of-age axis sanity
  const stage = (s.protagonistLifeStage || "").toLowerCase();
  const axis = (s.comingOfAgeAxis || "").toLowerCase();
  if (stage && axis) {
    if (stage.startsWith("adolescent") && axis.startsWith("parenthood")) {
      warnings.push(
        "Adolescent life stage + Parenthood transformation is a hard mismatch. Pick a different identity-transition axis (First competence, First moral compromise, First love/loss) or age the protagonist up."
      );
    }
    if (stage.startsWith("adolescent") && axis.startsWith("mortality acceptance")) {
      warnings.push(
        "Adolescent + Mortality-acceptance axis is rare and easy to mishandle. Either age up the protagonist or anchor mortality to a specific loss (mentor, sibling) rather than the protagonist's own."
      );
    }
    if (stage.startsWith("elder") && axis.startsWith("first competence")) {
      warnings.push(
        "Elder / Twilight + First-competence axis fights itself. Elders typically know they're capable. Use 'Reckoning with prior self', 'Authority transfer', or 'Mortality acceptance' instead — or pick a younger life stage."
      );
    }
    if (stage.startsWith("elder") && axis.startsWith("first love")) {
      warnings.push(
        "Elder + First-love axis can work, but it's an unusual pairing. Make sure the romance carries thematic weight specific to late-life (regret, second chance, succession) rather than reading as a coming-of-age beat."
      );
    }
  }

  // Regression / Returner consistency between origin and archetype
  const origin = (s.protagonistOrigin || "").toLowerCase();
  if (origin.startsWith("regression") || origin.startsWith("reborn into a novel")) {
    if (
      !has(s, "archetype", "Returner") &&
      !has(s, "knowledgeAdvantage", "Future knowledge") &&
      !has(s, "knowledgeAdvantage", "Meta knowledge")
    ) {
      warnings.push(
        "Regression / reborn-in-novel origin needs foreknowledge to matter. Set Knowledge Advantage to 'Future knowledge' or 'Meta knowledge', or change the archetype to The Returner."
      );
    }
  }

  // Story-engine ↔ subgenre coherence (gentle nudges)
  const engine = (s.storyEngine || "").toLowerCase();
  const subgenre = (s.subgenre || "").toLowerCase();
  if (engine.startsWith("regression") && !subgenre.includes("regression") && subgenre) {
    warnings.push(
      "Story engine 'Regression / time loop' usually wants the Regression subgenre. Either change subgenre or weaken the engine to 'Investigation / mystery'."
    );
  }
  if (engine.startsWith("slice-of-life") && has(s, "systemAlignment", "Openly adversarial")) {
    warnings.push(
      "Slice-of-life engine + openly adversarial system pull in opposite directions. Soften alignment, or change engine to Wave-defense / Investigation."
    );
  }
  if (engine.startsWith("tournament") && has(s, "factionLandscape", "No factions")) {
    warnings.push(
      "Tournament engine needs factions / brackets / rankings. Pick a faction landscape with structure (Multi-faction, Hierarchy of powers)."
    );
  }
  if (engine.startsWith("base") && has(s, "factionRole", "Lone wolf")) {
    warnings.push(
      "Base / settlement-building engine + Lone wolf faction role tends to stall. Use 'Leader / builder' or 'Creates own faction' instead."
    );
  }

  // Class ↔ relational coherence
  const klass = (s.protagonistClass || "").toLowerCase();
  const anchor = (s.relationalAnchor || "").toLowerCase();
  if (klass.startsWith("healer") && anchor.startsWith("none")) {
    warnings.push(
      "Healer / Support class + 'None — fundamentally alone' anchor fights itself. Healers express power through other people; pick a relational anchor."
    );
  }
  if (klass.startsWith("summoner") && anchor.startsWith("none")) {
    warnings.push(
      "Summoner / Tamer class + no relational anchor leaves the bonded entities unmoored. Consider 'Found family', 'Duo', or 'Community'."
    );
  }
  if (klass.startsWith("merchant") && has(s, "politicalTexture", "Minimal")) {
    warnings.push(
      "Merchant / Information-broker class with Minimal political texture wastes the class's leverage. Consider Moderate or Heavy."
    );
  }
  if (klass.startsWith("monster") && has(s, "primaryConflict", "Protagonist vs self")) {
    // Not an error, just a nudge — keep as warning
    // (Monster POV's strongest conflict is usually identity / vs society / vs system.)
  }

  // Body / mortality ↔ life stage coherence
  const body = (s.bodyAndMortality || "").toLowerCase();
  if (body.startsWith("aging") && stage.startsWith("adolescent")) {
    warnings.push(
      "Aging body + Adolescent life stage is contradictory. Pick 'Youthful invulnerability' or change the life stage."
    );
  }
  if (body.startsWith("youthful") && stage.startsWith("elder")) {
    warnings.push(
      "Youthful invulnerability + Elder life stage erases the most interesting tension of the elder stage. Consider 'Aging body' or 'Augmented'."
    );
  }
  if (
    body.startsWith("body-dysphoric") &&
    !origin.includes("transmigration") &&
    !origin.includes("reincarnation") &&
    !origin.includes("constructed")
  ) {
    warnings.push(
      "Body-dysphoric framing usually wants Transmigration, Reincarnation, or Constructed origin to ground it. Otherwise the dysphoria has no in-world cause."
    );
  }

  return warnings;
}

/**
 * Full validation: data-driven `forbids` + cross-cutting rules.
 * Returns string[] for compatibility with current UI rendering.
 */
export function validateSelections(selections, layers) {
  const idx = buildFieldIndex(layers || []);
  const forbidWarnings = collectForbidConflicts(idx, selections).map((w) => w.message);
  const crossWarnings = crossCuttingRules(selections);
  // de-dup
  const seen = new Set();
  const out = [];
  for (const w of [...forbidWarnings, ...crossWarnings]) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}
