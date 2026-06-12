/**
 * Computes viewport-relative tooltip coordinates with boundary clamping.
 *
 * Used by components that position tooltips using clientX/Y against window
 * bounds (as opposed to SVG-relative tooltips which use positionTooltip in
 * chart-rendering.ts).
 *
 * @param event    The mouse event that triggered the tooltip.
 * @param el       The tooltip element — used to read its last-rendered size.
 * @param fallbackW Width fallback when the element is not yet in the DOM.
 * @param fallbackH Height fallback when the element is not yet in the DOM.
 * @param margin   Minimum distance from each viewport edge in pixels.
 */
export function computeViewportTooltipPosition(
  event: MouseEvent,
  el: HTMLElement | null | undefined,
  fallbackW = 160,
  fallbackH = 90,
  margin = 8,
): { x: number; y: number } {
  const w = el?.offsetWidth  ?? fallbackW;
  const h = el?.offsetHeight ?? fallbackH;
  let x = event.clientX + 14;
  let y = event.clientY - 10;
  if (x + w + margin > window.innerWidth)  x = event.clientX - w - 14;
  if (y + h + margin > window.innerHeight) y = event.clientY - h - 10;
  return { x: Math.max(margin, x), y: Math.max(margin, y) };
}
