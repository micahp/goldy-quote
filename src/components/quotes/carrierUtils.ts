export const normalizeCarrierId = (rawCarrier: string): string => {
  const normalized = rawCarrier.trim().toLowerCase();
  if (normalized === 'geico') return 'geico';
  if (normalized === 'progressive') return 'progressive';
  if (normalized === 'state farm' || normalized === 'statefarm') return 'statefarm';
  if (normalized === 'liberty mutual' || normalized === 'libertymutual') return 'libertymutual';
  return normalized.replace(/\s+/g, '');
};
