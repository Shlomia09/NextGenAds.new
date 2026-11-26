// What Rouge can do, and how far along each capability is. The site and the app read this one file, so
// a claim on the site can't run ahead of the product.
//   ROADMAP       — defined, not yet running for a client
//   BUILT         — built and demonstrated on a live client's data
//   PILOT-TESTED  — worked for a pilot client
//   GA            — available to paying clients
// Move a capability forward only with the evidence: Half-Life becomes BUILT after it has run on a live
// client (Docs/founder-decisions.md, item 4).
export type CapabilityStage = 'ROADMAP' | 'BUILT' | 'PILOT-TESTED' | 'GA';

export const CAPABILITIES = {
  half_life:      { label: 'Half-Life and cause of death', stage: 'ROADMAP' },
  benchmarks:     { label: 'Beauty benchmark', stage: 'BUILT' },
  recommendations:{ label: 'Recommendations with reasons', stage: 'BUILT' },
  approved_actions:{ label: 'Executes approved changes', stage: 'BUILT' },
  copy:           { label: 'Copy from your creative', stage: 'BUILT' },
} as const satisfies Record<string, { label: string; stage: CapabilityStage }>;

export const isRoadmap = (key: keyof typeof CAPABILITIES) => CAPABILITIES[key].stage === 'ROADMAP';
