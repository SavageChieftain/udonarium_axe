import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { BuffManagerPanelComponent } from '@axe/features/buff/buff-manager-panel/buff-manager-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('BuffManagerPanelComponent', () => {
  let fixture: ComponentFixture<BuffManagerPanelComponent>;
  let component: BuffManagerPanelComponent;
  let store: ObjectStore;

  function makeCharacter(name: string): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    character.addExtendData();
    return character;
  }

  function onTable(characters: GameCharacter[]): void {
    vi.spyOn(TestBed.inject(GameObjectInventoryService).tableInventory, 'tabletopObjects', 'get').mockReturnValue(
      characters
    );
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [BuffManagerPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    store = ObjectStore.instance;
    fixture = TestBed.createComponent(BuffManagerPanelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('leaves out the pieces carrying nothing', () => {
    const plain = makeCharacter('素のコマ');
    const buffed = makeCharacter('バフ持ち');
    buffed.buffs.addRound('猛攻撃', '命中+2', 3);
    onTable([plain, buffed]);

    expect(component.rows().map((row) => row.characterName)).toEqual(['バフ持ち']);
    expect(component.rows()[0].bars.map((bar) => bar.name)).toEqual(['猛攻撃']);
  });

  it('runs the chart from the round being played', () => {
    onTable([]);

    expect(component.columns()[0]).toBe(component.round());
  });

  it('holds a bar that outruns the chart to its edge', () => {
    const buffed = makeCharacter('長持ち');
    buffed.buffs.addRound('祝福', '', 30);
    onTable([buffed]);

    const bar = component.rows()[0].bars[0];
    expect(component.barWidth(bar)).toBe(component.span());
    expect(component.isRunningOff(bar)).toBe(true);
  });

  it('opens a bar for editing and closes it again', () => {
    const buffed = makeCharacter('バフ持ち');
    buffed.buffs.addRound('猛攻撃', '命中+2', 3);
    onTable([buffed]);
    const bar = component.rows()[0].bars[0];

    component.select(bar);
    expect(component.selectedElement()?.name).toBe('猛攻撃');

    component.select(bar);
    expect(component.selectedElement()).toBeNull();
  });

  it('writes an edit back onto the buff', () => {
    const buffed = makeCharacter('バフ持ち');
    buffed.buffs.addRound('猛攻撃', '命中+2', 3);
    onTable([buffed]);
    component.select(component.rows()[0].bars[0]);

    component.setRounds(5);
    component.setTiming('turnStart');
    component.setTrigger('術者');

    const bar = component.rows()[0].bars[0];
    expect(bar.rounds).toBe(5);
    expect(bar.timing).toBe('turnStart');
    expect(bar.trigger).toBe('術者');
  });

  it('takes a buff off the piece from the chart', () => {
    const buffed = makeCharacter('バフ持ち');
    buffed.buffs.addRound('猛攻撃', '命中+2', 3);
    onTable([buffed]);
    component.select(component.rows()[0].bars[0]);

    component.removeSelected();

    expect(component.rows()).toEqual([]);
  });

  describe('the command builder', () => {
    it('writes the plain form without a timing nobody asked to change', () => {
      component.builderName.set('猛攻撃');
      component.builderStatus.set('命中');
      component.builderOperator.set('+');
      component.builderAmount.set('2');
      component.builderRounds.set('3');

      expect(component.builderCommand()).toBe('&!猛攻撃/命中/+/2/3');
      expect(component.builderPreview()).toBe('命中+2');
    });

    it('carries the timing and the trigger once either is asked for', () => {
      component.builderName.set('練技');
      component.builderStatus.set('筋力');
      component.builderOperator.set('+');
      component.builderAmount.set('2');
      component.builderRounds.set('3');
      component.builderTiming.set('turnStart');
      component.builderTrigger.set('術者');

      expect(component.builderCommand()).toBe('&!練技/筋力/+/2/3/turnStart/術者');
    });

    it('says nothing about an effect it cannot read', () => {
      component.builderAmount.set('たくさん');

      expect(component.builderPreview()).toBe('');
    });
  });
});
