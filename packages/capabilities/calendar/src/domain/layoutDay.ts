import { extractTimeMinutes } from "./dateRange";
import type {
  CalendarEventItem,
  DayLayoutOptions,
  DayLayoutResult,
  PositionedCalendarEvent,
} from "./types";

interface HeapNode {
  endMinutes: number;
  column: number;
}

interface NormalizedEvent {
  item: CalendarEventItem;
  startMinutes: number;
  endMinutes: number;
}

function pushColumnHeap(heap: HeapNode[], node: HeapNode): void {
  heap.push(node);
  let idx = heap.length - 1;
  while (idx > 0) {
    const parent = (idx - 1) >> 1;
    if (heap[parent].endMinutes <= heap[idx].endMinutes) break;
    [heap[parent], heap[idx]] = [heap[idx], heap[parent]];
    idx = parent;
  }
}

function popColumnHeap(heap: HeapNode[]): HeapNode | undefined {
  if (heap.length === 0) return undefined;
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    siftDown(heap, 0);
  }
  return top;
}

function siftDown(heap: HeapNode[], startIdx: number): void {
  let idx = startIdx;
  while (true) {
    const left = idx * 2 + 1;
    const right = left + 1;
    let smallest = idx;
    if (left < heap.length && heap[left].endMinutes < heap[smallest].endMinutes) smallest = left;
    if (right < heap.length && heap[right].endMinutes < heap[smallest].endMinutes) smallest = right;
    if (smallest === idx) break;
    [heap[idx], heap[smallest]] = [heap[smallest], heap[idx]];
    idx = smallest;
  }
}

function normalizeEvent(
  item: CalendarEventItem,
  dayStart: number,
  dayEnd: number,
  minDuration: number,
): NormalizedEvent | null {
  const rawStart = extractTimeMinutes(item.startIso);
  const rawEnd = extractTimeMinutes(item.endIso);
  const startMinutes = Math.max(dayStart, Math.min(dayEnd - minDuration, rawStart));
  const endMinutes = Math.min(dayEnd, Math.max(startMinutes + minDuration, rawEnd));
  if (endMinutes <= dayStart || startMinutes >= dayEnd) return null;
  return { item, startMinutes, endMinutes };
}

function finalizeComponent(
  positioned: PositionedCalendarEvent[],
  fromIdx: number,
  toIdx: number,
  totalColumns: number,
): void {
  const cols = Math.max(1, totalColumns);
  for (let k = fromIdx; k < toIdx; k += 1) {
    positioned[k].totalColumns = cols;
  }
}

function assignComponentColumns(
  sorted: NormalizedEvent[],
  dayStart: number,
  span: number,
): PositionedCalendarEvent[] {
  const positioned: PositionedCalendarEvent[] = [];
  const heap: HeapNode[] = [];
  let compStart = 0;
  let compMaxEnd = -1;
  let nextCol = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    const ev = sorted[i];
    if (i > compStart && ev.startMinutes >= compMaxEnd) {
      finalizeComponent(positioned, compStart, i, nextCol);
      heap.length = 0;
      nextCol = 0;
      compStart = i;
    }
    const reusable = heap.length > 0 && heap[0].endMinutes <= ev.startMinutes ? popColumnHeap(heap) : undefined;
    const column = reusable ? reusable.column : nextCol++;
    pushColumnHeap(heap, { endMinutes: ev.endMinutes, column });
    compMaxEnd = Math.max(compMaxEnd, ev.endMinutes);
    positioned.push({
      ...ev.item,
      startMinutes: ev.startMinutes,
      endMinutes: ev.endMinutes,
      column,
      totalColumns: 1,
      topPercent: ((ev.startMinutes - dayStart) / span) * 100,
      heightPercent: ((ev.endMinutes - ev.startMinutes) / span) * 100,
    });
  }
  finalizeComponent(positioned, compStart, sorted.length, nextCol);
  return positioned;
}

/**
 * Solves overlapping day events in O(n log n) using greedy interval coloring
 * per connected overlap component.
 */
export function layoutDay(
  events: readonly CalendarEventItem[],
  options: DayLayoutOptions = {},
): DayLayoutResult {
  const dayStartMinutes = options.dayStartMinutes ?? 360;
  const dayEndMinutes = options.dayEndMinutes ?? 1200;
  const minDuration = options.minDurationMinutes ?? 15;
  const span = Math.max(1, dayEndMinutes - dayStartMinutes);

  const normalized = events
    .map((ev) => normalizeEvent(ev, dayStartMinutes, dayEndMinutes, minDuration))
    .filter((ev): ev is NormalizedEvent => ev !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  return {
    events: assignComponentColumns(normalized, dayStartMinutes, span),
    dayStartMinutes,
    dayEndMinutes,
  };
}
