export const SYSTEM_STORY_DESIGN = {
  coreprinciple: {
    title: "Core Principle",
    content:
      "A system story should end when the system's purpose is resolved and/or the protagonist achieves an outcome that stabilizes or settles the initial disruption introduced by the system.",
    subcontent: [
      "The system ends, changes, or is fulfilled",
      "Society adapts and reaches a new equilibrium",
      "The protagonist resolves the core conflict introduced at the beginning",
    ],
  },
  archetypes: [
    {
      id: "selection",
      label: "Selection",
      goal: "Identify the strongest / most fit",
      endings: ["Completion (chosen)", "Rejection (refuse system)", "Subversion (criteria is flawed)"],
    },
    {
      id: "training",
      label: "Training",
      goal: "Prepare for a future event",
      endings: ["Payoff (threat arrives)", "Failure (trained for wrong outcome)", "Twist (system caused the threat)"],
    },
    {
      id: "harvesting",
      label: "Resource Harvesting",
      goal: "Extract value (energy, data, emotion)",
      endings: ["Exposure", "Takeover", "Moral choice (benefit vs destruction)"],
    },
    {
      id: "simulation",
      label: "Simulation / Experiment",
      goal: "Test individuals or civilizations",
      endings: ["Escape", "Break experiment validity", "Confront observers"],
    },
    {
      id: "evolution",
      label: "Evolution",
      goal: "Force advancement of species/world",
      endings: ["Completion (evolution achieved)", "Rejection (retain humanity)", "Transformation (become something new)"],
    },
    {
      id: "control",
      label: "Control / Stability",
      goal: "Maintain order or prevent collapse",
      endings: ["Validation (system is necessary)", "Overthrow (too oppressive)", "Balance (partial control retained)"],
    },
    {
      id: "entertainment",
      label: "Entertainment",
      goal: "Provide spectacle to observers",
      endings: ["Audience reveal", "Revolt", "Strategic participation"],
    },
    {
      id: "data",
      label: "Data Accumulation",
      goal: "Gather knowledge",
      endings: ["Completion (data sufficient)", "Interpretation (meaning revealed)", "Misuse (unexpected application)"],
    },
    {
      id: "moral",
      label: "Moral / Ethical",
      goal: "Judge worth or decisions",
      endings: ["Judgment (pass/fail)", "Rejection (system flawed)", "Redefinition (new morality)"],
    },
    {
      id: "selfpres",
      label: "Self-Preservation",
      goal: "Ensure its own survival",
      endings: ["Destruction", "Merge", "Coexistence"],
    },
  ],
  resolutionModes: [
    { label: "Fulfillment", desc: "System achieves its goal" },
    { label: "Exposure", desc: "True purpose revealed and rejected" },
    { label: "Subversion", desc: "Goal redefined by protagonist" },
    { label: "Replacement", desc: "New system or purpose established" },
    { label: "Stabilization", desc: "World adapts and reaches a steady state" },
  ],
  progressionTiers: [
    { tier: 1, label: "Survival" },
    { tier: 2, label: "Understanding" },
    { tier: 3, label: "Exploitation" },
    { tier: 4, label: "Control" },
    { tier: 5, label: "Confrontation" },
    { tier: 6, label: "Resolution / Stabilization" },
  ],
  themes: ["Power vs Humanity", "Control vs Freedom", "Survival vs Morality", "Progress vs Identity", "Knowledge vs Consequence"],
  highValueCombos: [
    { title: "Training + External Threat + Twist", desc: "System prepares → threat arrives → system is flawed or responsible" },
    { title: "Evolution + Control Conflict", desc: "Growth vs humanity dilemma" },
    { title: "Simulation + Data + Self-Preservation", desc: "System learns → protagonist becomes unmodelable variable" },
  ],
  checklist: [
    "What is the system's goal?",
    "What happens when it succeeds?",
    "Who benefits?",
    "Does the protagonist agree?",
    "What does 'stability' look like at the end?",
  ],
  designDecisions: [
    { title: "System Definition", items: ["What is the system optimizing for?", "What is the visible purpose vs hidden purpose?"] },
    { title: "Creator Intent", items: ["Who created the system?", "Do they still agree with its goal?"] },
    { title: "Completion Condition", items: ["What does 'system success' look like?", "Does that end the system or transition it?"] },
  ],
};
