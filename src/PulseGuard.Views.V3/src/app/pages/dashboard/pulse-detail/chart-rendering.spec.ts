import * as d3 from 'd3';
import { catmullRomBeziers } from './chart-rendering';

// ── D3 oracle ────────────────────────────────────────────────────────────────
//
// We verify our arithmetic against D3's own curveCatmullRom implementation by
// feeding it a minimal path context that records every bezierCurveTo call.
// D3 only calls moveTo / lineTo / bezierCurveTo / closePath, so the stub is safe.

interface BezierCall {
  cp1x: number; cp1y: number;
  cp2x: number; cp2y: number;
  x: number; y: number;
}

type PixelPt = { px: number; py: number; color: string };

function d3CatmullRomCalls(pts: PixelPt[], alpha: number): BezierCall[] {
  const calls: BezierCall[] = [];
  const ctx = {
    moveTo(_x: number, _y: number) {},
    lineTo(_x: number, _y: number) {},
    closePath() {},
    bezierCurveTo(
      cp1x: number, cp1y: number,
      cp2x: number, cp2y: number,
      x: number, y: number,
    ) { calls.push({ cp1x, cp1y, cp2x, cp2y, x, y }); },
  };
  d3.line<PixelPt>()
    .x(p => p.px)
    .y(p => p.py)
    .curve(d3.curveCatmullRom.alpha(alpha))
    .context(ctx as unknown as CanvasRenderingContext2D)(pts);
  return calls;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('catmullRomBeziers', () => {
  const G = 'green';
  const R = 'red';

  it('returns an empty array for zero points', () => {
    expect(catmullRomBeziers([], 0.1)).toEqual([]);
  });

  it('returns an empty array for a single point', () => {
    expect(catmullRomBeziers([{ px: 10, py: 20, color: G }], 0.1)).toEqual([]);
  });

  it('returns N−1 beziers for N points', () => {
    const pts: PixelPt[] = Array.from({ length: 6 }, (_, i) => ({ px: i * 20, py: i * 7, color: G }));
    expect(catmullRomBeziers(pts, 0.1)).toHaveLength(5);
  });

  it('assigns each bezier the colour of its start point', () => {
    const pts: PixelPt[] = [
      { px: 0,   py: 0,  color: G },
      { px: 50,  py: 30, color: R },
      { px: 100, py: 10, color: G },
    ];
    const beziers = catmullRomBeziers(pts, 0.1);
    expect(beziers[0].color).toBe(G); // bezier pts[0]→pts[1], start = G
    expect(beziers[1].color).toBe(R); // bezier pts[1]→pts[2], start = R
  });

  it('colour split sits at the correct knot boundary', () => {
    // pts[0..2] = green, pts[3..4] = red
    const pts: PixelPt[] = [
      { px: 0,   py: 10, color: G },
      { px: 50,  py: 30, color: G },
      { px: 100, py: 20, color: G },
      { px: 150, py: 50, color: R },
      { px: 200, py: 15, color: R },
    ];
    const beziers = catmullRomBeziers(pts, 0.1);
    // bezier[2]: pts[2](G) → pts[3](R) — colour follows the start point
    expect(beziers[2].color).toBe(G);
    // bezier[3]: pts[3](R) → pts[4](R)
    expect(beziers[3].color).toBe(R);
  });

  it('end point of each bezier matches the destination pixel coords', () => {
    const pts: PixelPt[] = [
      { px: 0,   py: 0,  color: G },
      { px: 100, py: 50, color: G },
      { px: 200, py: 20, color: G },
    ];
    const [b0, b1] = catmullRomBeziers(pts, 0.1);
    expect(b0.ex).toBeCloseTo(100);
    expect(b0.ey).toBeCloseTo(50);
    expect(b1.ex).toBeCloseTo(200);
    expect(b1.ey).toBeCloseTo(20);
  });

  it('first bezier cp1 is clamped to the start point (no look-back)', () => {
    // Phantom P[-1] = P[0] → l01 = 0 → cp1 must equal P[0]
    const pts: PixelPt[] = [
      { px: 10, py: 20, color: G },
      { px: 80, py: 60, color: G },
      { px: 150, py: 10, color: G },
    ];
    const [first] = catmullRomBeziers(pts, 0.1);
    expect(first.cp1x).toBeCloseTo(10);
    expect(first.cp1y).toBeCloseTo(20);
  });

  it('matches D3 curveCatmullRom.alpha(0.1) for irregular non-collinear points', () => {
    const pts: PixelPt[] = [
      { px: 0,   py: 100, color: G },
      { px: 80,  py: 20,  color: G },
      { px: 160, py: 80,  color: G },
      { px: 240, py: 40,  color: R },
      { px: 320, py: 90,  color: R },
    ];
    const ours = catmullRomBeziers(pts, 0.1);
    const ref  = d3CatmullRomCalls(pts, 0.1);

    expect(ours).toHaveLength(ref.length);
    for (let i = 0; i < ref.length; i++) {
      expect(ours[i].cp1x).toBeCloseTo(ref[i].cp1x, 10);
      expect(ours[i].cp1y).toBeCloseTo(ref[i].cp1y, 10);
      expect(ours[i].cp2x).toBeCloseTo(ref[i].cp2x, 10);
      expect(ours[i].cp2y).toBeCloseTo(ref[i].cp2y, 10);
      expect(ours[i].ex).toBeCloseTo(ref[i].x, 10);
      expect(ours[i].ey).toBeCloseTo(ref[i].y, 10);
    }
  });

  it('matches D3 curveCatmullRom.alpha(0.5) (centripetal parameterisation)', () => {
    // alpha=0 cannot be tested here: d3.curveCatmullRom.alpha(0) falls back to
    // the Cardinal curve class internally, not CatmullRom. alpha=0.5 (centripetal)
    // stays within CatmullRom and exercises a clearly different alpha code path.
    const pts: PixelPt[] = [
      { px: 0,   py: 50, color: G },
      { px: 100, py: 10, color: G },
      { px: 200, py: 70, color: G },
      { px: 300, py: 30, color: G },
    ];
    const ours = catmullRomBeziers(pts, 0.5);
    const ref  = d3CatmullRomCalls(pts, 0.5);

    expect(ours).toHaveLength(ref.length);
    for (let i = 0; i < ref.length; i++) {
      expect(ours[i].cp1x).toBeCloseTo(ref[i].cp1x, 10);
      expect(ours[i].cp1y).toBeCloseTo(ref[i].cp1y, 10);
      expect(ours[i].cp2x).toBeCloseTo(ref[i].cp2x, 10);
      expect(ours[i].cp2y).toBeCloseTo(ref[i].cp2y, 10);
    }
  });
});
