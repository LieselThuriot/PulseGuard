import * as d3 from 'd3';

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
