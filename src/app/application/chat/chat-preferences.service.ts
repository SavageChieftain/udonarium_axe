import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

const AUTO_FOLLOW_KEY = 'chat-auto-follow-scroll';
const STORAGE_KEY = 'chat-preferences';

export const CHAT_FONT_SIZE_DEFAULT = 13;
export const CHAT_FONT_SIZE_MIN = 10;
export const CHAT_FONT_SIZE_MAX = 24;

const TAB_PREFERENCE_LIMIT = 64;

export interface ChatDisplayPreferences {
  portraitHeight: number;
  isPortraitInWindow: boolean;
  isKeepPortraitOutWindow: boolean;
  simpleDispFlagTime: number;
  simpleDispFlagUserId: number;
}

export interface ChatTabPreferences {
  portraitDisplayFlag: number;
  chatSimpleDispFlag: number;
}

/** Whether a display setting is one answer for the room or an answer per tab. */
export type ChatSettingScope = 'all' | 'perTab';

export interface ChatScopedSetting {
  scope: ChatSettingScope;
  /** The answer used everywhere while the scope is 'all'. */
  all: number;
}

const DEFAULT_PORTRAIT: ChatScopedSetting = { scope: 'all', all: 1 };
const DEFAULT_SIMPLE: ChatScopedSetting = { scope: 'all', all: 0 };

interface StoredChatPreferences {
  fontSize?: number;
  colors?: string[];
  display?: ChatDisplayPreferences;
  portrait?: ChatScopedSetting;
  simple?: ChatScopedSetting;
  /**
   * What each tab was set to, under the tab's name.
   *
   * A room loaded from a file makes its tabs afresh under new identifiers, and a reader's own
   * settings should not be lost with them. Two tabs of one name share an answer, which is a
   * fair trade for settings that survive the room being passed around.
   */
  tabs?: Record<string, ChatTabPreferences>;
}

@Injectable({ providedIn: 'root' })
export class ChatPreferencesService {
  private readonly document = inject(DOCUMENT);

  readonly autoFollowScroll = signal<boolean>(readAutoFollow());

  private readonly stored = signal<StoredChatPreferences>(readStored());

  readonly fontSize = computed(() => clampFontSize(this.stored().fontSize ?? CHAT_FONT_SIZE_DEFAULT));
  readonly colors = computed<readonly string[] | null>(() => this.stored().colors ?? null);
  readonly display = computed<ChatDisplayPreferences | null>(() => this.stored().display ?? null);
  readonly portrait = computed<ChatScopedSetting>(() => this.stored().portrait ?? DEFAULT_PORTRAIT);
  readonly simple = computed<ChatScopedSetting>(() => this.stored().simple ?? DEFAULT_SIMPLE);

  constructor() {
    effect(() => {
      const v = this.autoFollowScroll();
      write(AUTO_FOLLOW_KEY, v ? '1' : '0');
    });

    effect(() => {
      write(STORAGE_KEY, JSON.stringify(this.stored()));
    });

    effect(() => {
      this.document.documentElement.style.setProperty('--chat-font-size', `${this.fontSize()}px`);
    });
  }

  setAutoFollowScroll(v: boolean): void {
    this.autoFollowScroll.set(v);
  }

  setFontSize(v: number): void {
    this.patch({ fontSize: clampFontSize(v) });
  }

  setColors(colors: readonly string[]): void {
    this.patch({ colors: colors.map((c) => String(c)) });
  }

  setDisplay(display: ChatDisplayPreferences): void {
    this.patch({ display: { ...display } });
  }

  setPortrait(setting: ChatScopedSetting): void {
    this.patch({ portrait: { ...setting } });
  }

  setSimple(setting: ChatScopedSetting): void {
    this.patch({ simple: { ...setting } });
  }

  /** Tabs are remembered by name; see the note on the stored shape. */
  tabPreferencesOf(name: string): ChatTabPreferences | null {
    return this.stored().tabs?.[name] ?? null;
  }

  setTabPreferences(name: string, preferences: ChatTabPreferences): void {
    this.stored.update((current) => {
      const tabs: Record<string, ChatTabPreferences> = { ...current.tabs };
      delete tabs[name];
      tabs[name] = { ...preferences };
      const keys = Object.keys(tabs);
      for (const stale of keys.slice(0, Math.max(0, keys.length - TAB_PREFERENCE_LIMIT))) delete tabs[stale];
      return { ...current, tabs };
    });
  }

  private patch(part: StoredChatPreferences): void {
    this.stored.update((current) => ({ ...current, ...part }));
  }
}

function clampFontSize(v: number): number {
  if (!Number.isFinite(v)) return CHAT_FONT_SIZE_DEFAULT;
  return Math.min(CHAT_FONT_SIZE_MAX, Math.max(CHAT_FONT_SIZE_MIN, Math.round(v)));
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable (private mode, SSR etc) — silently ignore */
  }
}

function readAutoFollow(): boolean {
  try {
    const v = localStorage.getItem(AUTO_FOLLOW_KEY);
    return v == null ? true : v === '1';
  } catch {
    return true;
  }
}

function readStored(): StoredChatPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const source = parsed as Record<string, unknown>;
    const stored: StoredChatPreferences = {};
    if (typeof source['fontSize'] === 'number') stored.fontSize = clampFontSize(source['fontSize']);
    const colors = readColors(source['colors']);
    if (colors) stored.colors = colors;
    const display = readDisplay(source['display']);
    if (display) stored.display = display;
    const tabs = readTabs(source['tabs']);
    if (tabs) stored.tabs = tabs;
    const portrait = readScoped(source['portrait']);
    if (portrait) stored.portrait = portrait;
    const simple = readScoped(source['simple']);
    if (simple) stored.simple = simple;
    return stored;
  } catch {
    /* corrupt or unavailable storage — start from the defaults */
    return {};
  }
}

function readColors(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const colors = value.filter((c): c is string => typeof c === 'string');
  return colors.length > 0 ? colors : null;
}

function readDisplay(value: unknown): ChatDisplayPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const portraitHeight = source['portraitHeight'];
  const simpleDispFlagTime = source['simpleDispFlagTime'];
  const simpleDispFlagUserId = source['simpleDispFlagUserId'];
  if (typeof portraitHeight !== 'number') return null;
  return {
    portraitHeight,
    isPortraitInWindow: source['isPortraitInWindow'] === true,
    isKeepPortraitOutWindow: source['isKeepPortraitOutWindow'] === true,
    simpleDispFlagTime: typeof simpleDispFlagTime === 'number' ? simpleDispFlagTime : 0,
    simpleDispFlagUserId: typeof simpleDispFlagUserId === 'number' ? simpleDispFlagUserId : 0,
  };
}

function readScoped(value: unknown): ChatScopedSetting | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const scope = source['scope'] === 'perTab' ? 'perTab' : 'all';
  const all = Number(source['all']);
  return { scope, all: Number.isFinite(all) && all !== 0 ? 1 : 0 };
}

function readTabs(value: unknown): Record<string, ChatTabPreferences> | null {
  if (!value || typeof value !== 'object') return null;
  const tabs: Record<string, ChatTabPreferences> = {};
  for (const [identifier, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    const portraitDisplayFlag = source['portraitDisplayFlag'];
    const chatSimpleDispFlag = source['chatSimpleDispFlag'];
    if (typeof portraitDisplayFlag !== 'number' || typeof chatSimpleDispFlag !== 'number') continue;
    tabs[identifier] = { portraitDisplayFlag, chatSimpleDispFlag };
  }
  return Object.keys(tabs).length > 0 ? tabs : null;
}
