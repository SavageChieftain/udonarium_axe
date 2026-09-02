import { TestBed } from '@angular/core/testing';
import { DiceBotCatalogService } from '@axe/application/dice/dice-bot-catalog.service';
import { emitDiceBotCatalogLoaded } from '@axe/core/event/domain-events';
import { DiceBot } from '@axe/domain/dice/dice-bot';

describe('DiceBotCatalogService', () => {
  const known = DiceBot.diceBotInfos;

  afterEach(() => {
    DiceBot.diceBotInfos = known;
  });

  it('offers the systems once the catalogue arrives', () => {
    const service = TestBed.inject(DiceBotCatalogService);
    expect(service.infos()).toEqual(known);

    DiceBot.diceBotInfos = [
      { id: 'Test', name: 'Test', className: 'Test', sortKey: 'test', locale: 'ja', superClassName: 'Base' },
    ];
    emitDiceBotCatalogLoaded();

    expect(service.infos().map((info) => info.id)).toEqual(['Test']);
  });
});
