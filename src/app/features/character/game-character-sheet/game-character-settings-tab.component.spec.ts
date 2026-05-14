import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
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

  it('インスタンス化できる', () => {
    expect(component).toBeTruthy();
  });

  it('chkKomaSize は範囲内に丸め、ドラッグ状態を解除し、変更通知を出す', () => {
    const objectChange = TestBed.inject(ObjectChangeService);
    const notifySpy = vi.spyOn(objectChange, 'notifyChanged');
    character.komaImageHeight = 120;
    pointerDeviceService.isDragging = true;

    component.chkKomaSize(900);

    expect(character.komaImageHeight).toBe(750);
    expect(pointerDeviceService.isDragging).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(character.identifier);
  });

  it('chkKomaSize に NaN を与えると既存値を維持する', () => {
    character.komaImageHeight = 180;
    component.chkKomaSize(Number.NaN);
    expect(character.komaImageHeight).toBe(180);
  });

  it('setSpecifyKomaImageFlag はフラグを設定し変更通知を出す', () => {
    const objectChange = TestBed.inject(ObjectChangeService);
    const notifySpy = vi.spyOn(objectChange, 'notifyChanged');

    component.setSpecifyKomaImageFlag(true);

    expect(character.specifyKomaImageFlag).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith(character.identifier);
  });

  it('convertLegacyCheckTables() は旧チェック表フィールドを構造化テーブルへ変換する', () => {
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

  it('legacyCheckTableCount は変換候補数を返す', () => {
    expect(component.legacyCheckTableCount()).toBe(0);
  });

  it('onSetLocation は locationChange を emit する (実 set は親側)', () => {
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

  it('resetRotate / resetRoll は角度を 0 に戻す', () => {
    character.rotate = 90;
    character.roll = 180;

    component.resetRotate();
    component.resetRoll();

    expect(character.rotate).toBe(0);
    expect(character.roll).toBe(0);
  });
});
