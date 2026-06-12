import * as d3 from 'd3';

export interface CatmullRomBezier {
  cp1x: number; cp1y: number;
  cp2x: number; cp2y: number;
  /** End point in pixel coordinates. */
  ex: number; ey: number;
  /** Color of the start point — used to group segments into color runs. */
  color: string;
}

/**
 * Converts pixel-space points into cubic Bezier segments that exactly replicate
 * d3.curveCatmullRom.alpha(alpha), computed purely in arithmetic (no DOM).
 *
 * Each element covers pts[i] → pts[i+1] and carries pts[i].color. Adjacent
 * segments share a knot, so color runs split cleanly at data boundaries without
 * clip paths or ghost/context points.
 *
 * Phantom endpoints match D3's open-curve boundary behaviour (both ends clamped):
 *   - First bezier: phantom P[-1] = P[0] → dist = 0 → cp1 = P[0].
 *   - Last bezier:  D3's lineEnd passes P[n-1] as its own look-ahead → dist = 0 → cp2 = P[n-1].
 */
export function catmullRomBeziers(
  pts: readonly { px: number; py: number; color: string }[],
  alpha: number,
): CatmullRomBezier[] {
  const n = pts.length;
  if (n < 2) return [];
  const result: CatmullRomBezier[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];

    const dx01 = p1.px - p0.px, dy01 = p1.py - p0.py;
    const dx12 = p2.px - p1.px, dy12 = p2.py - p1.py;
    const dx23 = p3.px - p2.px, dy23 = p3.py - p2.py;

    // l = dist^alpha  (alpha/2 exponent because input is dist², not dist).
    // Guard against dist=0 explicitly: Math.pow(0, 0) = 1 in JS, but l must be 0
    // when two points coincide (matching D3's initialisation of _l01_a/_l23_a to 0).
    const sq01 = dx01 * dx01 + dy01 * dy01;
    const sq12 = dx12 * dx12 + dy12 * dy12;
    const sq23 = dx23 * dx23 + dy23 * dy23;
    const l01a  = sq01 > 0 ? Math.pow(sq01, alpha / 2) : 0;
    const l12a  = sq12 > 0 ? Math.pow(sq12, alpha / 2) : 0;
    const l23a  = sq23 > 0 ? Math.pow(sq23, alpha / 2) : 0;
    const l01_2a = l01a * l01a;
    const l12_2a = l12a * l12a;
    const l23_2a = l23a * l23a;

    // cp1: tangent at p1. Clamped to p1 when there is no look-back (l01a ≈ 0).
    let cp1x = p1.px, cp1y = p1.py;
    if (l01a > 1e-12) {
      const a  = 2 * l01_2a + 3 * l01a * l12a + l12_2a;
      const nn = 3 * l01a * (l01a + l12a);
      cp1x = (p1.px * a - p0.px * l12_2a + p2.px * l01_2a) / nn;
      cp1y = (p1.py * a - p0.py * l12_2a + p2.py * l01_2a) / nn;
    }

    // cp2: tangent at p2. D3 uses the original p1 (that._x1) here — NOT the
    // updated cp1 — matching the catmullRom.js source exactly.
    // Clamped to p2 when there is no look-ahead (l23a ≈ 0).
    let cp2x = p2.px, cp2y = p2.py;
    if (l23a > 1e-12) {
      const b = 2 * l23_2a + 3 * l23a * l12a + l12_2a;
      const m = 3 * l23a * (l23a + l12a);
      cp2x = (p2.px * b + p1.px * l23_2a - p3.px * l12_2a) / m;
      cp2y = (p2.py * b + p1.py * l23_2a - p3.py * l12_2a) / m;
    }

    result.push({ cp1x, cp1y, cp2x, cp2y, ex: p2.px, ey: p2.py, color: p1.color });
  }

  return result;
}

/**
 * Appends one SVG `<path>` per consecutive colour run from a pre-computed set
 * of CatmullRom Bezier segments. Each path carries the correct stroke colour
 * and shares knot points with its neighbours so joints are seamless.
 *
 * @param group       The `<g>` element to append paths into.
 * @param pixelPts    Pixel-space points produced by the same mapping used for `beziers`.
 * @param beziers     Output of `catmullRomBeziers()` for `pixelPts`.
 * @param strokeWidth SVG stroke-width value.
 * @param animate     When true, paths fade in with a 300 ms opacity transition.
 */
export function appendColoredPaths(
  group: d3.Selection<SVGGElement, any, any, any>,
  pixelPts: readonly { px: number; py: number; color: string }[],
  beziers: readonly CatmullRomBezier[],
  strokeWidth: number,
  animate = false,
): void {
  let i = 0;
  while (i < beziers.length) {
    const color = beziers[i].color;
    let d = `M ${pixelPts[i].px} ${pixelPts[i].py}`;
    while (i < beziers.length && beziers[i].color === color) {
      const bz = beziers[i];
      d += ` C ${bz.cp1x} ${bz.cp1y} ${bz.cp2x} ${bz.cp2y} ${bz.ex} ${bz.ey}`;
      i++;
    }
    const path = group.append('path')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth)
      .attr('d', d);
    if (animate) {
      path.style('opacity', 0).transition().duration(300).style('opacity', 1);
    }
  }
}

/**
 * Applies a time-based bottom axis to `axisG`, auto-selecting the tick format
 * based on the visible span. For 1–7 day spans, a second tspan with H:M is
 * appended so dates and times both appear on the axis.
 */
export function applyTimeAxis(
  axisG: d3.Selection<SVGGElement, any, any, any>,
  scale: d3.ScaleTime<number, number>,
  ticks: number,
): void {
  const [d0, d1] = scale.domain() as [Date, Date];
  const spanMs = d1.getTime() - d0.getTime();
  const fmt =
    spanMs > 7 * 86_400_000 ? d3.timeFormat('%b %d') :
    spanMs > 86_400_000     ? d3.timeFormat('%b %d') :
                               d3.timeFormat('%H:%M');
  axisG.call(d3.axisBottom(scale).ticks(ticks).tickFormat(fmt as any));
  if (spanMs > 86_400_000 && spanMs <= 7 * 86_400_000) {
    axisG.selectAll<SVGTextElement, Date>('.tick text').each(function(d) {
      d3.select(this).append('tspan').attr('x', 0).attr('dy', '1.2em')
        .text(d3.timeFormat('%H:%M')(d));
    });
  }
}

/**
 * Appends a hidden dashed vertical crosshair line to `container`.
 * Returns the selection so the caller can update its position and opacity.
 */
export function createCrosshair(
  container: d3.Selection<SVGGElement, any, any, any>,
  height: number,
): d3.Selection<SVGLineElement, unknown, null, undefined> {
  return container.append<SVGLineElement>('line')
    .style('stroke', 'var(--pg-crosshair)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('y1', 0)
    .attr('y2', height)
    .style('opacity', 0);
}

/**
 * Positions and shows the tooltip with boundary-aware placement.
 * CSS uses translateY(-100%) so `top` is the tooltip's bottom edge.
 */
export function positionTooltip(
  tooltip: d3.Selection<HTMLDivElement, any, any, any>,
  tooltipEl: HTMLDivElement,
  event: MouseEvent,
  html: string,
): void {
  const containerW = tooltipEl.parentElement!.clientWidth;
  const containerH = tooltipEl.parentElement!.clientHeight;
  tooltip.html(html).style('opacity', '1');
  const ttW = tooltipEl.offsetWidth;
  const ttH = tooltipEl.offsetHeight;
  const ox = event.offsetX;
  const oy = event.offsetY;
  // Horizontal: default right of cursor, flip left if it would overflow
  let left = ox + 12;
  if (left + ttW > containerW) left = ox - ttW - 12;
  left = Math.max(0, left);
  // Vertical: default above cursor (translateY(-100%) means top = bottom edge)
  // Visual top = oy - 10 - ttH; flip below if that would be negative
  let top = oy - 10;
  if (top - ttH < 0) top = oy + 10 + ttH;
  top = Math.min(top, containerH);
  tooltip.style('left', `${left}px`).style('top', `${top}px`);
}

export interface BrushZoomConfig {
  /** Root SVG element — receives the zoom behavior. */
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  /** Parent group where the brush <g> will be appended. */
  brushParent: d3.Selection<SVGGElement, any, any, any>;
  /** Base x scale used as the zoom-identity reference. */
  xScale: d3.ScaleTime<number, number>;
  width: number;
  height: number;
  /** Called whenever the visible x domain changes (brush release or Ctrl+wheel). */
  onRedraw: (scale: d3.ScaleTime<number, number>) => void;
}

export interface BrushZoomControls {
  /** The brush <g> element — attach `.overlay` mouse listeners here. */
  brushG: d3.Selection<SVGGElement, any, any, any>;
  /** Returns the live x scale, updated by both brush and zoom interactions. */
  getCurrentScale: () => d3.ScaleTime<number, number>;
}

/**
 * Attaches brush-to-zoom (drag) and Ctrl+wheel zoom to the chart.
 * Double-click resets to the full x domain.
 * Returns the brush group and a getter for the current live scale.
 */
export function setupBrushAndZoom(cfg: BrushZoomConfig): BrushZoomControls {
  let currentXScale = cfg.xScale;

  const brushG = cfg.brushParent.append<SVGGElement>('g').attr('class', 'brush');

  const brush = d3.brushX()
    .extent([[0, 0], [cfg.width, cfg.height]])
    .on('end', (event) => {
      if (!event.selection) return;
      const [x0, x1] = event.selection as [number, number];
      if (Math.abs(x1 - x0) < 4) { brushG.call(brush.move, null); return; }
      const newDomain: [Date, Date] = [currentXScale.invert(x0), currentXScale.invert(x1)];
      currentXScale = cfg.xScale.copy().domain(newDomain);
      brushG.call(brush.move, null);
      cfg.onRedraw(currentXScale);
    });

  brushG.call(brush);
  brushG.select('.selection')
    .style('fill', 'var(--pg-brush-fill)')
    .style('stroke', 'var(--pg-brush-stroke)')
    .attr('stroke-width', 1);

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 200])
    .translateExtent([[0, 0], [cfg.width, cfg.height]])
    .extent([[0, 0], [cfg.width, cfg.height]])
    .filter((event) => event.type === 'wheel' && event.ctrlKey)
    .on('zoom', (event) => {
      currentXScale = event.transform.rescaleX(cfg.xScale);
      cfg.onRedraw(currentXScale);
    });

  cfg.svg.call(zoom);
  cfg.svg.on('dblclick.zoom', null);
  cfg.svg.on('dblclick', () => {
    currentXScale = cfg.xScale;
    cfg.onRedraw(currentXScale);
    cfg.svg.call(zoom.transform, d3.zoomIdentity);
  });

  return { brushG, getCurrentScale: () => currentXScale };
}
