import { TestBed } from '@angular/core/testing';
import { EffectTargetingService } from '@axe/application/effect/effect-targeting.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectTargetingService', () => {
  let service: EffectTargetingService;
  let selection: SelectionSignalService;
  let preset: EffectPreset;
  let characters: GameCharacter[];

  function makeCharacter(name: string, x: number): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    character.location.x = x;
    character.location.y = 0;
    return character;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(EffectTargetingService);
    selection = TestBed.inject(SelectionSignalService);

    preset = new EffectPreset();
    preset.targeting = 'multi';
    preset.maxTargets = 3;
    ObjectStore.instance.add(preset, false);

    characters = [makeCharacter('あ', 0), makeCharacter('い', 200), makeCharacter('う', 400), makeCharacter('え', 600)];
  });

  afterEach(() => {
    ObjectStore.instance.remove(preset);
    for (const character of characters) ObjectStore.instance.remove(character);
  });

  it('選んだ順に対象を積むこと', () => {
    service.begin(preset);
    service.pick(characters[1].identifier);
    service.pick(characters[0].identifier);

    expect(service.picks()).toEqual([characters[1].identifier, characters[0].identifier]);
    expect(service.marks().map((mark) => mark.order)).toEqual([1, 2]);
  });

  it('選んだ対象をコマのターゲット指定へ写すこと', () => {
    service.begin(preset);
    service.pick(characters[1].identifier);

    // 選び終えたあと、チャットの t: がそのまま同じ対象へ効くようにする。
    expect(characters[1].targeted).toBe(true);
    expect(characters[0].targeted).toBe(false);
  });

  it('もう一度選んだら外すこと', () => {
    service.begin(preset);
    service.pick(characters[0].identifier);
    service.pick(characters[1].identifier);
    service.pick(characters[0].identifier);

    expect(service.picks()).toEqual([characters[1].identifier]);
    expect(characters[0].targeted).toBe(false);
  });

  it('上限に届いたら発動すること', () => {
    service.begin(preset);
    expect(service.pick(characters[0].identifier)).toBeNull();
    expect(service.pick(characters[1].identifier)).toBeNull();

    const cast = service.pick(characters[2].identifier);

    expect(cast?.targets.map((target) => target.identifier)).toEqual([
      characters[0].identifier,
      characters[1].identifier,
      characters[2].identifier,
    ]);
    expect(service.isPicking()).toBe(false);
  });

  it('始める前の指定を引き継ぎ、中止で戻すこと', () => {
    characters[3].targeted = true;

    service.begin(preset);
    expect(service.picks()).toEqual([characters[3].identifier]);

    service.pick(characters[0].identifier);
    expect(characters[3].targeted).toBe(true);

    service.cancel();

    expect(service.isPicking()).toBe(false);
    expect(characters[3].targeted).toBe(true);
    expect(characters[0].targeted).toBe(false);
  });

  it('選択中のコマを撃ち手として覚えること', () => {
    selection.selectObject(characters[3].identifier, characters[3].aliasName);
    service.begin(preset);
    // 選び進めると選択は対象側へ移るが、撃ち手は始めた時点のものを保つ。
    service.pick(characters[0].identifier);
    selection.selectObject(characters[0].identifier, characters[0].aliasName);
    const cast = service.confirm();

    expect(cast?.casterIdentifier).toBe(characters[3].identifier);
    expect(cast?.origin).not.toBeNull();
  });

  it('対象が無いまま決定しても発動しないこと', () => {
    service.begin(preset);

    expect(service.confirm()).toBeNull();
  });

  it('選択中でなければ中止が何もしないこと', () => {
    expect(service.cancel()).toBe(false);
  });

  describe('範囲攻撃', () => {
    beforeEach(() => {
      preset.areaRadius = 5;
      preset.maxTargets = 5;
    });

    it('中心の周りを近い順にまとめて選ぶこと', () => {
      // コマは 200px 間隔。既定のマス目は 50px なので、半径 5 マス = 250px で両隣まで届く。
      service.begin(preset);
      service.pick(characters[1].identifier);

      expect(service.picks()).toEqual([characters[1].identifier, characters[0].identifier, characters[2].identifier]);
      expect(service.areaCenter()).not.toBeNull();
    });

    it('まとめて選んだだけでは撃たないこと', () => {
      service.begin(preset);

      // どこまで巻き込んだか確かめてから撃てるようにする。
      expect(service.pick(characters[1].identifier)).toBeNull();
      expect(service.isPicking()).toBe(true);
    });

    it('選び直すと中心が移ること', () => {
      service.begin(preset);
      service.pick(characters[1].identifier);
      service.pick(characters[3].identifier);

      expect(service.picks()[0]).toBe(characters[3].identifier);
      expect(service.picks()).not.toContain(characters[0].identifier);
    });
  });
});
