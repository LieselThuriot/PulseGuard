import { computeViewportTooltipPosition } from './tooltip.util';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(clientX: number, clientY: number): MouseEvent {
  return { clientX, clientY } as MouseEvent;
}

function makeEl(offsetWidth: number, offsetHeight: number): HTMLElement {
  return { offsetWidth, offsetHeight } as unknown as HTMLElement;
}

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth',  { value: width,  configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeViewportTooltipPosition', () => {
  afterEach(() => setViewport(1024, 768));

  it('places tooltip right of and above cursor when no edge is close', () => {
    setViewport(1000, 768);
    // x = 300+14 = 314;  314+150+8 = 472 < 1000  → no flip
    // y = 300-10 = 290;  290+100+8 = 398 < 768   → no flip
    const { x, y } = computeViewportTooltipPosition(makeEvent(300, 300), makeEl(150, 100));
    expect(x).toBe(314);
    expect(y).toBe(290);
  });

  it('flips horizontally when tooltip would overflow the right edge', () => {
    setViewport(600, 768);
    // x = 560+14 = 574;  574+150+8 = 732 > 600  → flip: 560-150-14 = 396
    const { x } = computeViewportTooltipPosition(makeEvent(560, 300), makeEl(150, 100));
    expect(x).toBe(396);
  });

  it('flips vertically when tooltip would overflow the bottom edge', () => {
    setViewport(1000, 500);
    // y = 470-10 = 460;  460+100+8 = 568 > 500  → flip: 470-100-10 = 360
    const { y } = computeViewportTooltipPosition(makeEvent(300, 470), makeEl(150, 100));
    expect(y).toBe(360);
  });

  it('clamps x to margin when a left flip would go off-screen', () => {
    setViewport(200, 768);
    // x = 5+14 = 19;  19+200+8 = 227 > 200  → flip: 5-200-14 = -209  → clamped to 8
    const { x } = computeViewportTooltipPosition(makeEvent(5, 300), makeEl(200, 100));
    expect(x).toBe(8);
  });

  it('clamps y to margin when a top flip would go off-screen', () => {
    setViewport(1000, 100);
    // y = 5-10 = -5;  -5+100+8 = 103 > 100  → flip: 5-100-10 = -105  → clamped to 8
    const { y } = computeViewportTooltipPosition(makeEvent(300, 5), makeEl(150, 100));
    expect(y).toBe(8);
  });

  it('uses fallback sizes when el is null', () => {
    setViewport(400, 768);
    // fallbackW=200: x = 300+14 = 314;  314+200+8 = 522 > 400  → flip: 300-200-14 = 86
    const { x } = computeViewportTooltipPosition(makeEvent(300, 300), null, 200, 120);
    expect(x).toBe(86);
  });

  it('uses fallback sizes when el is undefined', () => {
    setViewport(400, 768);
    const { x } = computeViewportTooltipPosition(makeEvent(300, 300), undefined, 200, 120);
    expect(x).toBe(86);
  });

  it('reads offsetWidth and offsetHeight from the provided element', () => {
    setViewport(400, 768);
    // el.offsetWidth=250 (not fallback 100): 300+14=314; 314+250+8=572 > 400 → flip: 300-250-14=36
    const { x } = computeViewportTooltipPosition(makeEvent(300, 300), makeEl(250, 150), 100, 50);
    expect(x).toBe(36);
  });

  it('uses the custom margin for both overflow checks and edge clamping', () => {
    setViewport(600, 768);
    // margin=20: 420+14=434;  434+150+20=604 > 600  → flip: 420-150-14=256;  max(20,256)=256
    // (with default margin=8: 434+150+8=592 < 600 → no flip → x=434, showing margin matters)
    const { x } = computeViewportTooltipPosition(makeEvent(420, 300), makeEl(150, 100), 160, 90, 20);
    expect(x).toBe(256);
  });
});
