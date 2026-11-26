import { isRoadmap, type CAPABILITIES } from '../../config/capabilities';

// A small "Roadmap" tag next to a claim whose capability isn't running for clients yet
// (src/config/capabilities.ts). Renders nothing once the capability moves past ROADMAP.
export function RoadmapTag({ capability }: { capability: keyof typeof CAPABILITIES }) {
  if (!isRoadmap(capability)) return null;
  return <span className="mk-roadmap" title="Defined and in development, not yet running for clients">Roadmap</span>;
}
