// Quick test to understand wizard steps structure
import { buildSteps } from "./src/lib/wizard.js";
import { LAYERS } from "./src/data/layers.js";

const steps = buildSteps(LAYERS);

console.log("Total steps:", steps.length);
console.log("\nStep breakdown:");
steps.forEach((step, i) => {
  console.log(`${i}. ${step.label} (${step.kind}) - layerIds: ${step.layerIds.join(", ")}, required: ${step.requiredFields.length}`);
});
