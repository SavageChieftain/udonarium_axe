import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatSpeakerService } from '@axe/application/chat/chat-speaker.service';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { HotbarStoreService } from '@axe/application/hotbar/hotbar-store.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { getRangeMenuItems } from '@axe/application/tabletop/tabletop-action-helpers';
import { PanelService } from '@axe/application/ui/panel.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { BUFF_COLORS } from '@axe/domain/character/buff-appearance';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PaletteCommandGroup, paletteCommandGroups } from '@axe/domain/chat/palette-rows';
import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { hotbarSlotLabel } from '@axe/domain/hotbar/hotbar-appearance';
import { emptyHotbarSlotDraft, HotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import {
  EFFECT_MODES,
  encodeHotbarPayload,
  HotbarPayload,
  HotbarStep,
  parseHotbarPayload,
  TURN_ACTIONS,
} from '@axe/domain/hotbar/hotbar-payload';
import { HotbarCell } from '@axe/domain/hotbar/hotbar-size';
import { HotbarSlot } from '@axe/domain/hotbar/hotbar-slot';
import {
  HOTBAR_SLOT_KINDS,
  HotbarSlotKind,
  hotbarSlotNeedsCharacter,
  toHotbarSlotKind,
} from '@axe/domain/hotbar/hotbar-slot-kind';
import { CutIn } from '@axe/domain/media/cut-in';
import { presetSoundLabelKey, soundFileName } from '@axe/domain/media/preset-sound-labels';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { RANGE_DEFAULT_BORDER_COLOR, RANGE_DEFAULT_FILL_COLOR } from '@axe/domain/tabletop/range';
import { CHARACTER_PANELS, DEFAULT_CHARACTER_PANEL, panelLabelKey } from '@axe/domain/ui/room-panel';
import { findSlotActor } from '@axe/features/hotbar/hotbar-actor';
import { HotbarRunnerService } from '@axe/features/hotbar/hotbar-runner.service';
import { selectControllableCharacters } from '@axe/features/pl-tools/owned-character-list/owned-characters';
import { TranslocoModule } from '@jsverse/transloco';

/** A trial belongs to no cell of the bar, so what it lays out is its own to take down again. */
const REHEARSAL_CELL: HotbarCell = { page: -1, slotIndex: -1 };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hotbar-slot-editor',
  templateUrl: './hotbar-slot-editor.component.html',
  imports: [FormsModule, TranslocoModule],
})
export class HotbarSlotEditorComponent {
  private readonly panelService = inject(PanelService);
  private readonly runner = inject(HotbarRunnerService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly effectLibrary = inject(EffectLibraryService);
  private readonly tabletopAction = inject(TabletopActionService);
  private readonly hotbarStore = inject(HotbarStoreService);
  private readonly chatSpeaker = inject(ChatSpeakerService);
  private readonly t = inject(TRANSLATE_FN);

  readonly cell = signal<HotbarCell>({ page: 0, slotIndex: 0 });
  readonly draft = signal<HotbarSlotDraft>(emptyHotbarSlotDraft());

  readonly kinds = HOTBAR_SLOT_KINDS;
  protected readonly effectModes = EFFECT_MODES;
  protected readonly panelNames = CHARACTER_PANELS;
  protected readonly turnActions = TURN_ACTIONS;

  protected readonly colors = BUFF_COLORS;
  protected readonly icons = [
    'chat_bubble',
    'casino',
    'auto_awesome',
    'radar',
    'add_circle',
    'favorite',
    'bolt',
    'shield',
    'local_fire_department',
    'healing',
    'volume_up',
    'slideshow',
    'person',
    'article',
    'my_location',
    'skip_next',
    'star',
    'flag',
  ];

  /** What a slot of this kind can point at, so nothing has to be typed from memory. */
  protected readonly choices = computed<{ value: string; name: string }[]>(() => {
    switch (this.kind()) {
      case 'effect':
        return this.effectLibrary.presets().map((preset) => ({ value: preset.name, name: preset.name }));
      case 'sound':
        this.objectChange.fileVersion();
        return [...this.audioStorage.audios]
          .map((audio) => {
            const labelKey = presetSoundLabelKey(audio.identifier);
            return { value: audio.identifier, name: labelKey ? this.t(labelKey) : soundFileName(audio.name) };
          })
          .sort((left, right) => left.name.localeCompare(right.name, 'ja'));
      case 'cutIn':
        this.objectChange.collectionOf('cut-in')();
        return this.objectStore
          .getObjects<CutIn>(CutIn)
          .map((cutIn) => ({ value: cutIn.identifier, name: cutIn.name }));
      case 'range':
        return getRangeMenuItems().map((item) => ({ value: item.typeName, name: this.t(item.menuName) }));
      default:
        return [];
    }
  });

  protected readonly picksFromList = computed(() => this.choices().length > 0);

  /** Who the slot speaks as while it is being written, so its palette is the one on offer. */
  private readonly actingCharacter = computed<GameCharacter | null>(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const draft = this.draft();
    if (!draft.characterIdentifier.trim() && !draft.characterName.trim()) return this.chatSpeaker.current();

    const found = findSlotActor(
      draft,
      this.objectStore.getObjects<GameCharacter>(GameCharacter),
      PeerCursor.myCursor?.userId ?? ''
    );
    return found?.character ?? null;
  });

  /** The lines already written in that character's palette, for a slot that says something. */
  protected readonly palettePicks = computed<PaletteCommandGroup[]>(() => {
    const kind = this.kind();
    if (kind !== 'chat' && kind !== 'prefill') return [];

    const palette = this.actingCharacter()?.chatPalette ?? null;
    if (!palette) return [];
    this.objectChange.versionOf(palette.identifier)();
    return paletteCommandGroups(palette.getPalette());
  });

  /** Only a slot that acts on a character has to say which one. */
  protected readonly needsActor = computed(() => hotbarSlotNeedsCharacter(this.kind()));

  protected readonly kind = computed<HotbarSlotKind>(() => this.draft().kind);
  protected readonly options = computed<HotbarPayload>(() => this.draft().payload);

  protected readonly effectMode = computed(() => {
    const options = this.options();
    return options.kind === 'effect' ? options.mode : 'cast';
  });
  protected readonly panelName = computed(() => {
    const options = this.options();
    return options.kind === 'panel' ? options.panel : DEFAULT_CHARACTER_PANEL;
  });
  protected readonly turnAction = computed(() => {
    const options = this.options();
    return options.kind === 'turn' ? options.action : 'next';
  });
  protected readonly playsLocally = computed(() => {
    const options = this.options();
    return options.kind === 'sound' && options.local;
  });
  protected readonly playsSoundOnly = computed(() => {
    const options = this.options();
    return options.kind === 'cutIn' && options.soundOnly;
  });
  /** Every filled slot of the reader's own bar, for a group to pick its steps from. */
  protected readonly stepChoices = computed<{ step: HotbarStep; label: string; key: string; chosen: boolean }[]>(() => {
    if (this.kind() !== 'group') return [];

    this.objectChange.collectionOf(Hotbar.aliasName)();
    const hotbar = this.hotbarStore.own();
    if (!hotbar) return [];
    this.objectChange.versionOf(hotbar.identifier)();

    const taken = this.groupSteps();
    const here = this.cell();
    return hotbar.slots
      .filter((slot) => slot.slotKind !== 'group')
      .filter((slot) => slot.pageNo !== here.page || slot.slotNo !== here.slotIndex)
      .sort((left, right) => left.pageNo - right.pageNo || left.slotNo - right.slotNo)
      .map((slot) => ({
        step: { page: slot.pageNo, slotIndex: slot.slotNo, slotIdentifier: slot.identifier },
        label: hotbarSlotLabel(slot.argument, slot.label),
        key: `${slot.pageNo + 1}-${(slot.slotNo + 1) % 10}`,
        chosen: taken.some((step) => step.slotIdentifier === slot.identifier),
      }));
  });

  protected readonly groupSteps = computed<HotbarStep[]>(() => {
    const options = this.options();
    return options.kind === 'group' ? options.steps : [];
  });

  protected readonly groupDelay = computed(() => {
    const options = this.options();
    return options.kind === 'group' ? options.delayMs : 0;
  });

  /** A step joins the end of the list, so the order is the order they were chosen in. */
  protected toggleStep(step: HotbarStep, chosen: boolean): void {
    const steps = this.groupSteps().filter((held) => held.slotIdentifier !== step.slotIdentifier);
    this.patchOptions({ steps: chosen ? [...steps, step] : steps });
  }

  protected readonly docksToPiece = computed(() => {
    const options = this.options();
    return options.kind === 'range' ? options.dock : true;
  });
  protected readonly rangeName = computed(() => {
    const options = this.options();
    return options.kind === 'range' ? options.name : '';
  });
  protected readonly rangeLength = computed(() => {
    const options = this.options();
    return options.kind === 'range' && options.length > 0 ? options.length : null;
  });
  protected readonly rangeWidth = computed(() => {
    const options = this.options();
    return options.kind === 'range' && options.width > 0 ? options.width : null;
  });
  protected readonly rangeBorderColor = computed(() => {
    const options = this.options();
    return (options.kind === 'range' && options.borderColor) || RANGE_DEFAULT_BORDER_COLOR;
  });
  protected readonly rangeFillColor = computed(() => {
    const options = this.options();
    return (options.kind === 'range' && options.fillColor) || RANGE_DEFAULT_FILL_COLOR;
  });
  protected readonly rangeOpacity = computed(() => {
    const options = this.options();
    return options.kind === 'range' ? options.opacity : 100;
  });
  protected readonly rangeFillsOutline = computed(() => {
    const options = this.options();
    return options.kind === 'range' && options.fillOutline;
  });
  protected readonly rangeSnapsOnRotate = computed(() => {
    const options = this.options();
    return options.kind !== 'range' || options.rotateSnap;
  });
  protected readonly rangeShiftsX = computed(() => {
    const options = this.options();
    return options.kind === 'range' && options.shiftX;
  });
  protected readonly rangeShiftsY = computed(() => {
    const options = this.options();
    return options.kind === 'range' && options.shiftY;
  });

  setFrom(cell: HotbarCell, draft: HotbarSlotDraft): void {
    this.cell.set(cell);
    this.draft.set({ ...draft, payload: { ...draft.payload } });
  }

  protected setActor(identifier: string): void {
    const named = this.actors().find((actor) => actor.value === identifier);
    this.draft.update((draft) => ({ ...draft, characterIdentifier: identifier, characterName: named?.name ?? '' }));
  }

  /** The pieces a slot may be told to act as, with an entry for leaving it to the moment. */
  protected readonly actors = computed<{ value: string; name: string }[]>(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    return selectControllableCharacters(
      this.objectStore.getObjects<GameCharacter>(GameCharacter),
      PeerCursor.myCursor?.userId ?? ''
    ).map((character) => ({ value: character.identifier, name: character.name }));
  });

  protected readonly panelLabelKey = panelLabelKey;

  protected setKind(kind: string): void {
    const held = toHotbarSlotKind(kind);
    this.draft.update((draft) => ({ ...draft, kind: held, payload: parseHotbarPayload(held, null) }));
  }

  /** A line taken from the palette lands in the box, where it can still be worked on. */
  protected takeFromPalette(line: string): void {
    if (!line) return;
    this.setValue(line);
  }

  /** A value chosen from a list keeps the name it was shown under; a typed one has none. */
  protected setChoice(value: string): void {
    const chosen = this.choices().find((choice) => choice.value === value);
    this.draft.update((draft) => ({ ...draft, value, valueName: chosen?.name ?? '' }));
  }

  protected setValue(value: string): void {
    this.draft.update((draft) => ({ ...draft, value }));
  }

  protected setLabel(label: string): void {
    this.draft.update((draft) => ({ ...draft, label }));
  }

  protected setIcon(icon: string): void {
    this.draft.update((draft) => ({ ...draft, icon }));
  }

  protected setColor(color: string): void {
    this.draft.update((draft) => ({ ...draft, color }));
  }

  /** An empty box means "as the shape comes", which is what a size of none stands for. */
  protected patchSize(field: 'length' | 'width', value: number): void {
    this.patchOptions({ [field]: Number.isFinite(value) && value > 0 ? Math.floor(value) : 0 });
  }

  protected patchOptions(patch: Record<string, unknown>): void {
    this.draft.update((draft) => ({ ...draft, payload: { ...draft.payload, ...patch } as HotbarPayload }));
  }

  protected save(): void {
    const hotbar = this.hotbarStore.ensureOwn();
    if (!hotbar) return;

    const cell = this.cell();
    hotbar.put(cell.page, cell.slotIndex, this.draft());
    this.panelService.close();
  }

  protected clear(): void {
    const cell = this.cell();
    this.hotbarStore.own()?.clear(cell.page, cell.slotIndex);
    this.panelService.close();
  }

  /** Runs a slot that belongs to nobody, so trying a draft cannot disturb what is saved. */
  protected tryIt(): void {
    const draft = this.draft();
    const character = this.actingCharacter();

    const rehearsal = new HotbarSlot();
    rehearsal.kind = draft.kind;
    rehearsal.value = draft.value;
    rehearsal.label = draft.label;
    rehearsal.icon = draft.icon;
    rehearsal.color = draft.color;
    rehearsal.payload = encodeHotbarPayload(draft.payload);
    rehearsal.characterIdentifier = draft.characterIdentifier;
    rehearsal.characterName = draft.characterName;
    rehearsal.valueName = draft.valueName;
    rehearsal.initialize();
    try {
      this.runner.run(rehearsal, character, REHEARSAL_CELL);
    } finally {
      rehearsal.destroy();
    }
  }

  protected close(): void {
    this.panelService.close();
  }
}
