import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
  DataElementViewMode,
} from '@axe/domain/data/data-element';
import { GameCharacterSettingsTabComponent } from '@axe/features/character/game-character-sheet/game-character-settings-tab.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameCharacterSettingsTabComponent', () => {
  let component: GameCharacterSettingsTabComponent;
  let fixture: ComponentFixture<GameCharacterSettingsTabComponent>;
  let componentRef: ComponentRef<GameCharacterSettingsTabComponent>;
  let pointerDeviceService: PointerDeviceService;
  let character: GameCharacter;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterSettingsTabComponent],
      providers: [...TEST_PROVIDERS],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(GameCharacterSettingsTabComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    pointerDeviceService = TestBed.inject(PointerDeviceService);
    character = GameCharacter.create('settings-test', 1, '');
    componentRef.setInput('character', character);
  });

  afterEach(() => {
    character.destroy();
  });

  it('can be created', () => {
    expect(component).toBeTruthy();
  });

  it('clamps the piece size, ends the drag and says it changed', () => {
    const objectChange = TestBed.inject(ObjectChangeService);
    const notifySpy = vi.spyOn(objectChange, 'notifyChanged');
    character.komaImageHeight = 120;
    pointerDeviceService.isDragging = true;

    component.chkKomaSize(900);

    expect(character.komaImageHeight).toBe(750);
    expect(pointerDeviceService.isDragging).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(character.identifier);
  });

  it('keeps the size it had for a value it cannot read', () => {
    character.komaImageHeight = 180;
    component.chkKomaSize(Number.NaN);
    expect(character.komaImageHeight).toBe(180);
  });

  it('sets the flag and says it changed', () => {
    const objectChange = TestBed.inject(ObjectChangeService);
    const notifySpy = vi.spyOn(objectChange, 'notifyChanged');

    component.setSpecifyKomaImageFlag(true);

    expect(character.specifyKomaImageFlag).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith(character.identifier);
  });

  it('turns the old check fields into proper tables', () => {
    const section = DataElement.create('旧情報', '', { [DataElementAttribute.ROLE]: DataElementRole.SECTION });
    const group = DataElement.create('基本', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
    const legacy = DataElement.create('旧表', '|項目|済み|\n|灯火|[]|', {
      [DataElementAttribute.ROLE]: DataElementRole.FIELD,
      [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK_TABLE,
      type: DataElementType.CHECK_TABLE,
    });
    section.appendChild(group);
    group.appendChild(legacy);
    character.detailDataElement!.appendChild(section);

    component.convertLegacyCheckTables();

    const migrated = character.detailDataElement!.children.find((child) => child.name === '旧表');
    const checkCell = migrated?.children[0].getFirstElementByName('済み');
    expect(migrated?.fieldRole).toBe(DataElementRole.SECTION);
    expect(migrated?.viewMode).toBe(DataElementViewMode.TABLE);
    expect(checkCell?.fieldType).toBe(DataElementFieldType.CHECK);
    expect(checkCell?.value).toBe(0);
    expect(group.getFirstElementByName('旧表')).toBeNull();
  });

  it('counts what there is to convert', () => {
    expect(component.legacyCheckTableCount()).toBe(0);
  });

  it('emits the change of place and leaves the setting to its parent', () => {
    const emitted: string[] = [];
    component.locationChange.subscribe((v) => emitted.push(v));

    const select = document.createElement('select');
    select.innerHTML = '<option value="table"></option><option value="common"></option>';
    select.value = 'common';
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: select });

    component.onSetLocation(event);
    expect(emitted).toEqual(['common']);
  });

  it('puts both angles back to nothing', () => {
    character.rotate = 90;
    character.roll = 180;

    component.resetRotate();
    component.resetRoll();

    expect(character.rotate).toBe(0);
    expect(character.roll).toBe(0);
  });
});
