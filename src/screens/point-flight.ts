import type { Side } from '../game/types.ts';

export async function flyPoints(root: HTMLElement, side: Side, label: string, index: number | undefined, source: { x: number; y: number } | undefined, duration: number, reduced: boolean, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false;
  const target = root.querySelector<HTMLElement>(`#${side}-score`)!;
  const fallback = root.querySelector<HTMLElement>(`.fighter.${side} .fighter-word ${index === undefined ? '' : `span:nth-child(${index + 1})`}`.trim())!;
  const fromRect = fallback.getBoundingClientRect(), toRect = target.getBoundingClientRect();
  const from = source ?? { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 };
  const to = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 };
  const particle = document.createElement('span');
  particle.className = `flying-points ${side}`; particle.textContent = label; particle.setAttribute('aria-hidden', 'true');
  particle.style.left = `${from.x}px`; particle.style.top = `${from.y}px`;
  root.append(particle);
  const animation = particle.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [
    { transform: 'translate(-50%, -50%) scale(.7)', opacity: 0, offset: 0 },
    { transform: 'translate(-50%, -90%) scale(1.1)', opacity: 1, offset: .22 },
    { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(.6)`, opacity: .2, offset: 1 },
  ], { duration: reduced ? 100 : duration, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'forwards' });
  const abort = (): void => animation.cancel();
  signal.addEventListener('abort', abort, { once: true });
  try { await animation.finished; return !signal.aborted; }
  catch { return false; }
  finally { signal.removeEventListener('abort', abort); particle.remove(); animation.cancel(); }
}
