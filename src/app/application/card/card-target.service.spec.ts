import { TestBed } from '@angular/core/testing';
import { CardTargetService } from '@axe/application/card/card-target.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardTargetService', () => {
  let service: CardTargetService;
  let selection: SelectionSignalService;
  const created: { destroy(): void }[] = [];

  function makeCard(x: number, y: number): Card {
    const card = Card.create('カード', '', '');
    card.location.name = 'table';
    card.location.x = x;
    card.location.y = y;
    created.push(card);
    return card;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(CardTargetService);
    selection = TestBed.inject(SelectionSignalService);
  });

  afterEach(() => {
    for (const object of created.splice(0)) object.destroy();
  });

  it('指定待ちのあいだに選ばれたオブジェクトがターゲットになること', () => {
    const source = makeCard(0, 0);
    const target = makeCard(300, 0);

    service.beginPicking(source);
    expect(service.isPicking()).toBe(true);

    selection.selectObject(target.identifier, 'Card');
    TestBed.tick();

    expect(source.targetIdentifier).toBe(target.identifier);
    expect(service.isPicking()).toBe(false);
  });

  it('自分自身を選んでも指定待ちのままであること', () => {
    const source = makeCard(0, 0);

    service.beginPicking(source);
    selection.selectObject(source.identifier, 'Card');
    TestBed.tick();

    expect(source.targetIdentifier).toBe('');
    expect(service.isPicking()).toBe(true);
  });

  it('指定待ちを中止できること', () => {
    const source = makeCard(0, 0);

    service.beginPicking(source);
    expect(service.cancelPicking()).toBe(true);
    expect(service.cancelPicking()).toBe(false);

    selection.selectObject('other', 'Card');
    TestBed.tick();
    expect(source.targetIdentifier).toBe('');
  });

  it('ターゲットを指したカードだけ矢印を返すこと', () => {
    const source = makeCard(0, 0);
    const target = makeCard(300, 400);
    makeCard(600, 0);
    source.targetIdentifier = target.identifier;

    const arrows = service.arrows();

    expect(arrows).toHaveLength(1);
    expect(arrows[0].identifier).toBe(source.identifier);
    expect(arrows[0].length).toBeCloseTo(500, 5);
  });

  it('ターゲットが消えていれば矢印を描かないこと', () => {
    const source = makeCard(0, 0);
    const target = makeCard(300, 400);
    source.targetIdentifier = target.identifier;
    ObjectStore.instance.get(target.identifier)!.destroy();

    expect(service.arrows()).toHaveLength(0);
  });

  it('ターゲットを解除できること', () => {
    const source = makeCard(0, 0);
    const target = makeCard(300, 400);
    source.targetIdentifier = target.identifier;

    service.clearTarget(source);

    expect(source.targetIdentifier).toBe('');
    expect(service.arrows()).toHaveLength(0);
  });
});
