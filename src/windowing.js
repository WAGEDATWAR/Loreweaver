export const VIRTUAL_THRESHOLD = 120;
export const VIRTUAL_ROW_HEIGHT = 56;
export const VIRTUAL_OVERSCAN = 8;

export function shouldVirtualize(total) {
  return Number(total) > VIRTUAL_THRESHOLD;
}

export function computeWindow({
  total = 0,
  scrollTop = 0,
  viewport = 0,
  rowHeight = VIRTUAL_ROW_HEIGHT,
  overscan = VIRTUAL_OVERSCAN
} = {}) {
  const count = Math.max(0, Math.floor(Number(total) || 0));
  const height = Math.max(1, Number(rowHeight) || 0);
  const view = Math.max(0, Number(viewport) || 0);
  const padding = Math.max(0, Math.floor(Number(overscan) || 0));

  if (!count) {
    return { virtual: false, start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
  }

  const virtual = shouldVirtualize(count);
  const totalHeight = count * height;

  if (!virtual) {
    return { virtual: false, start: 0, end: count, offsetTop: 0, totalHeight };
  }

  const maxScroll = Math.max(0, totalHeight - view);
  const top = Math.min(Math.max(0, Number(scrollTop) || 0), maxScroll);
  const first = Math.floor(top / height);
  const span = Math.ceil(view / height) + 1;
  const start = Math.max(0, first - padding);
  const end = Math.min(count, first + span + padding);

  return { virtual: true, start, end, offsetTop: start * height, totalHeight };
}
