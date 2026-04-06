import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CarrierStatusCard from '../CarrierStatusCard';

describe('CarrierStatusCard', () => {
  it('renders stalled badge and reason when stalled is true', () => {
    render(
      <CarrierStatusCard
        carrier="GEICO"
        status="processing"
        progress={45}
        stalled
        stalledReason="Expected name_collection, still at date_of_birth"
      />
    );

    expect(screen.getByText('Stalled')).toBeTruthy();
    expect(screen.getByText('Expected name_collection, still at date_of_birth')).toBeTruthy();
  });
});
