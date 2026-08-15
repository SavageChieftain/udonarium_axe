import { TestBed } from '@angular/core/testing';
import { CharacterDiceService } from '@axe/application/dice/character-dice.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { heldDiceOf, storeHeldDie } from '@axe/domain/character/character-dice';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol, DiceType } from '@axe/domain/dice/dice-symbol';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CharacterDiceService', () => {
  let service: CharacterDiceService;
  const created: { destroy(): void }[] = [];

  function makeCharacter(): GameCharacter {
    const character = GameCharacter.create('ゴブリンA', 1, '');
    character.location.name = 'table';
    character.location.x = 300;
    character.location.y = 200;
    created.push(character);
    return character;
  }

  function makeSymbol(name = 'ダイス', type = DiceType.D6): DiceSymbol {
    const symbol = DiceSymbol.create(name, type, 1);
    symbol.location.name = 'table';
    created.push(symbol);
    return symbol;
  }

  function deployed(): DiceSymbol[] {
    return ObjectStore.instance
      .getObjects<DiceSymbol>(DiceSymbol)
      .filter((symbol) => symbol.location.name === 'table' && symbol.ownerCharacterIdentifier.length > 0);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(CharacterDiceService);
  });

  afterEach(() => {
    for (const symbol of ObjectStore.instance.getObjects<DiceSymbol>(DiceSymbol)) symbol.destroy();
    for (const object of created.splice(0)) object.destroy();
  });

  it('lays nothing out for a character that keeps none', () => {
    expect(service.deploy(makeCharacter())).toEqual([]);
  });

  it('lays out one die for each one kept', () => {
    const character = makeCharacter();
    storeHeldDie(character, { name: '攻撃ダイス', count: 3, faces: [{ label: '1', imageIdentifier: '' }] });

    const laid = service.deploy(character);

    expect(laid).toHaveLength(3);
    expect(deployed()).toHaveLength(3);
  });

  it('gives each one the faces it was kept with', () => {
    const character = makeCharacter();
    storeHeldDie(character, {
      name: '攻撃ダイス',
      count: 1,
      faces: [
        { label: '目', imageIdentifier: 'picture-eye' },
        { label: '骨', imageIdentifier: 'picture-bone' },
      ],
    });

    const [die] = service.deploy(character);

    expect(die.faces).toEqual(['目', '骨']);
    expect(die.imageDataElement?.getFirstElementByName('骨')?.value).toBe('picture-bone');
    expect(die.face).toBe('目');
  });

  it('lays them beside the piece rather than under it', () => {
    const character = makeCharacter();
    storeHeldDie(character, { name: 'ダイス', count: 2, faces: [{ label: '1', imageIdentifier: '' }] });

    const [first, second] = service.deploy(character);

    expect(first.location.x).toBeGreaterThan(character.location.x);
    expect(second.location.x).toBeGreaterThan(first.location.x);
    expect(first.location.y).toBeGreaterThan(character.location.y);
  });

  it('gives each to the piece that laid it out', () => {
    // Which is what a chat roll written against that name reaches.
    const character = makeCharacter();
    storeHeldDie(character, { name: 'ダイス', count: 1, faces: [{ label: '1', imageIdentifier: '' }] });

    const [die] = service.deploy(character);

    expect(die.ownerCharacterIdentifier).toBe(character.identifier);
  });

  it('puts a die on the table onto the sheet', () => {
    const character = makeCharacter();
    const symbol = makeSymbol('攻撃ダイス');

    service.store(character, symbol);

    expect(heldDiceOf(character).map((die) => die.name)).toEqual(['攻撃ダイス']);
  });

  it('takes the die itself off the table when it does', () => {
    // What is kept is the die as data, and leaving the object behind would put it in two places.
    const character = makeCharacter();
    const symbol = makeSymbol();

    service.store(character, symbol);

    expect(ObjectStore.instance.get(symbol.identifier)).toBeNull();
  });

  it('reads back what a character keeps', () => {
    const character = makeCharacter();
    storeHeldDie(character, { name: 'ダイス', count: 2, faces: [{ label: '1', imageIdentifier: '' }] });

    expect(service.held(character)).toEqual([
      { name: 'ダイス', count: 2, faces: [{ label: '1', imageIdentifier: '' }] },
    ]);
  });
});
