import { PulseStates, STATE_COLORS, STATE_CSS_CLASSES, STATE_TEXT_CLASSES } from './pulse-states.enum';

describe('PulseStates', () => {
  it('should have all five states', () => {
    expect(Object.values(PulseStates)).toEqual(['Unknown', 'Healthy', 'Degraded', 'Unhealthy', 'TimedOut']);
  });

  it('should have a color for every state', () => {
    for (const state of Object.values(PulseStates)) {
      expect(STATE_COLORS[state]).toBeTruthy();
    }
  });

  it('should have a CSS class for every state', () => {
    for (const state of Object.values(PulseStates)) {
      expect(STATE_CSS_CLASSES[state]).toBeTruthy();
    }
  });

  it('should have a text class for every state', () => {
    for (const state of Object.values(PulseStates)) {
      expect(STATE_TEXT_CLASSES[state]).toBeTruthy();
    }
  });

  it('should map Healthy to success CSS', () => {
    expect(STATE_CSS_CLASSES[PulseStates.Healthy]).toBe('text-bg-success');
    expect(STATE_TEXT_CLASSES[PulseStates.Healthy]).toBe('text-success');
  });

  it('should map Unhealthy to danger CSS', () => {
    expect(STATE_CSS_CLASSES[PulseStates.Unhealthy]).toBe('text-bg-danger');
    expect(STATE_TEXT_CLASSES[PulseStates.Unhealthy]).toBe('text-danger');
  });
});
