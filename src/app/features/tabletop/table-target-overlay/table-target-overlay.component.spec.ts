import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
import { TableTargetOverlayComponent } from '@axe/features/tabletop/table-target-overlay/table-target-overlay.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TableTargetOverlayComponent', () => {
  let fixture: ComponentFixture<TableTargetOverlayComponent>;
  const created: Card[] = [];

  function makeCard(x: number, y: number): Card {
    const card = Card.create('カード', '', '');
    card.location.name = 'table';
    card.location.x = x;
    card.location.y = y;
    created.push(card);
    return card;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableTargetOverlayComponent],
      providers: [...TEST_PROVIDERS],
    });
    fixture = TestBed.createComponent(TableTargetOverlayComponent);
  });

  afterEach(() => {
    for (const card of created.splice(0)) card.destroy();
  });

  it('draws nothing without a target', () => {
    makeCard(0, 0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('div')).toHaveLength(0);
  });

  it('draws a shaft and a head for each arrow', () => {
    const source = makeCard(0, 0);
    const target = makeCard(300, 0);
    source.targetIdentifier = target.identifier;
    fixture.detectChanges();

    const elements = fixture.nativeElement.querySelectorAll('div') as NodeListOf<HTMLElement>;
    expect(elements).toHaveLength(2);
    for (const element of elements) {
      expect(element.style.transform).toContain('rotateZ(0deg)');
      expect(element.style.pointerEvents).toBe('none');
    }
  });
});
