import { Injectable } from '@angular/core';

const STORAGE_KEY = 'ui-widget-layout';

export interface WidgetSpot {
  left: number;
  top: number;
}

export type WidgetLayout = Readonly<Record<string, WidgetSpot>>;

export function parseWidgetLayout(raw: string | null): WidgetLayout {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return {};

    const layout: Record<string, WidgetSpot> = {};
    for (const [name, spot] of Object.entries(parsed)) {
      const record = spot as Record<string, unknown>;
      if (typeof record?.['left'] !== 'number' || typeof record['top'] !== 'number') continue;
      if (!Number.isFinite(record['left']) || !Number.isFinite(record['top'])) continue;
      layout[name] = { left: record['left'], top: record['top'] };
    }
    return layout;
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class WidgetLayoutService {
  private layout: Record<string, WidgetSpot> = { ...parseWidgetLayout(localStorage.getItem(STORAGE_KEY)) };

  spotOf(name: string): WidgetSpot | null {
    return this.layout[name] ?? null;
  }

  remember(name: string, spot: WidgetSpot): void {
    if (!Number.isFinite(spot.left) || !Number.isFinite(spot.top)) return;
    this.layout = { ...this.layout, [name]: { left: Math.round(spot.left), top: Math.round(spot.top) } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layout));
  }

  forget(name: string): void {
    const { [name]: _removed, ...rest } = this.layout;
    this.layout = rest;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layout));
  }

  keepInView(spot: WidgetSpot, width: number, height: number): WidgetSpot {
    const margin = 8;
    return {
      left: Math.max(margin, Math.min(spot.left, Math.max(margin, window.innerWidth - width - margin))),
      top: Math.max(margin, Math.min(spot.top, Math.max(margin, window.innerHeight - height - margin))),
    };
  }
}
