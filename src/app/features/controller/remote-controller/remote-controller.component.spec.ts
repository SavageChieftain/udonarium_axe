import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { UiSignalService } from '@axe/shared/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { RemoteControllerComponent } from './remote-controller.component';

describe('RemoteControllerComponent', () => {
  let component: RemoteControllerComponent;
  let fixture: ComponentFixture<RemoteControllerComponent>;
  const createdChars: GameCharacter[] = [];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RemoteControllerComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RemoteControllerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    for (const char of createdChars) {
      ObjectStore.instance.remove(char);
    }
    createdChars.length = 0;
  });

  function createChar(name: string): GameCharacter {
    const char = GameCharacter.create(name, 1, '');
    createdChars.push(char);
    return char;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('targetBlockClick', () => {
    it('targeted を true から false に切り替えること', () => {
      const char = createChar('test');
      char.targeted = true;
      component.targetBlockClick(char);
      expect(char.targeted).toBe(false);
    });

    it('targeted を false から true に切り替えること', () => {
      const char = createChar('test');
      char.targeted = false;
      component.targetBlockClick(char);
      expect(char.targeted).toBe(true);
    });

    it('uiSignalService.notifyTargetChange が呼ばれること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      const spy = vi.spyOn(uiSignalService, 'notifyTargetChange');
      const char = createChar('test');
      component.targetBlockClick(char);
      expect(spy).toHaveBeenCalledWith(char.identifier, 'character');
    });
  });

  describe('getTargetCharacters', () => {
    it('checkedOnly=true のとき targeted なキャラのみ返すこと', () => {
      const char1 = createChar('a');
      const char2 = createChar('b');
      char1.targeted = true;
      char2.targeted = false;
      vi.spyOn(component, 'getGameObjects').mockReturnValue([char1, char2]);

      const result = component.getTargetCharacters(true);
      expect(result).toEqual([char1]);
    });

    it('checkedOnly=false のとき非表示以外のすべてのキャラを返すこと', () => {
      const char1 = createChar('a');
      const char2 = createChar('b');
      char1.targeted = true;
      char2.targeted = false;
      vi.spyOn(component, 'getGameObjects').mockReturnValue([char1, char2]);

      const result = component.getTargetCharacters(false);
      expect(result).toEqual([char1, char2]);
    });

    it('hideInventory=true のキャラを除外すること', () => {
      const char1 = createChar('a');
      const char2 = createChar('b');
      char1.targeted = true;
      char1.hideInventory = true;
      char2.targeted = true;
      char2.hideInventory = false;
      vi.spyOn(component, 'getGameObjects').mockReturnValue([char1, char2]);

      const result = component.getTargetCharacters(true);
      expect(result).toEqual([char2]);
    });
  });

  describe('allBoxCheck', () => {
    it('check=true で全キャラの targeted を true にすること', () => {
      const char1 = createChar('a');
      const char2 = createChar('b');
      char1.targeted = false;
      char2.targeted = false;
      vi.spyOn(component, 'getGameObjects').mockReturnValue([char1, char2]);

      component.allBoxCheck({ check: true });
      expect(char1.targeted).toBe(true);
      expect(char2.targeted).toBe(true);
    });

    it('check=false で全キャラの targeted を false にすること', () => {
      const char1 = createChar('a');
      const char2 = createChar('b');
      char1.targeted = true;
      char2.targeted = true;
      vi.spyOn(component, 'getGameObjects').mockReturnValue([char1, char2]);

      component.allBoxCheck({ check: false });
      expect(char1.targeted).toBe(false);
      expect(char2.targeted).toBe(false);
    });
  });
});
