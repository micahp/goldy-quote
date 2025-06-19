import { CarrierAgent } from '../types/index.js';
import { geicoAgent } from './geicoAgent.js';
import { progressiveAgent } from './progressiveAgent.js';
import { stateFarmAgent } from './stateFarmAgent.js';
import { libertyMutualAgent } from './libertyMutualAgent.js';

// Export all carrier agents
export { geicoAgent } from './geicoAgent.js';
export { progressiveAgent } from './progressiveAgent.js';
export { stateFarmAgent } from './stateFarmAgent.js';
export { libertyMutualAgent } from './libertyMutualAgent.js';

// Registry of all available carriers
export const carrierAgents: Record<string, CarrierAgent> = {
  geico: geicoAgent,
  progressive: progressiveAgent,
  statefarm: stateFarmAgent,
  libertymutual: libertyMutualAgent,
};

// Helper function to get a carrier agent by name
export function getCarrierAgent(carrierName: string): CarrierAgent | null {
  return carrierAgents[carrierName.toLowerCase()] || null;
}

// Get list of available carrier names
export function getAvailableCarriers(): string[] {
  return Object.keys(carrierAgents);
}

// Validate if a carrier is supported
export function isCarrierSupported(carrierName: string): boolean {
  return carrierName.toLowerCase() in carrierAgents;
}

// Get multiple carrier agents
export function getMultipleCarrierAgents(carrierNames: string[]): CarrierAgent[] {
  return carrierNames
    .map(name => getCarrierAgent(name))
    .filter((agent): agent is CarrierAgent => agent !== null);
}

// Get carrier agent names mapped to their display names
export function getCarrierDisplayNames(): Record<string, string> {
  return {
    geico: 'GEICO',
    progressive: 'Progressive',
    statefarm: 'State Farm',
    libertymutual: 'Liberty Mutual',
  };
} 