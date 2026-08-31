import { playsEffectOnChange, playsSoundOnChange, soundSetOnChange } from '@axe/domain/character/resource-feedback';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

describe('what a resource does when it moves', () => {
  const created: DataElement[] = [];

  function resource(attributes: Record<string, string> = {}): DataElement {
    const element = DataElement.create('HP', 200, { type: DataElementType.NUMBER_RESOURCE, currentValue: 200 });
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    created.push(element);
    return element;
  }

  afterEach(() => {
    for (const element of created.splice(0)) element.destroy();
  });

  it('stays still unless the field asks to be seen', () => {
    expect(playsEffectOnChange(resource())).toBe(false);
    expect(playsEffectOnChange(resource({ [DataElementAttribute.CHANGE_EFFECT]: 'false' }))).toBe(false);
    expect(playsEffectOnChange(resource({ [DataElementAttribute.CHANGE_EFFECT]: 'true' }))).toBe(true);
  });

  it('stays quiet unless the field asks to be heard', () => {
    expect(playsSoundOnChange(resource())).toBe(false);
    expect(playsSoundOnChange(resource({ [DataElementAttribute.CHANGE_SOUND]: 'false' }))).toBe(false);
    expect(playsSoundOnChange(resource({ [DataElementAttribute.CHANGE_SOUND]: 'true' }))).toBe(true);
  });

  it('sounds like flesh unless the field says it is a machine', () => {
    expect(soundSetOnChange(resource())).toBe('flesh');
    expect(soundSetOnChange(resource({ [DataElementAttribute.CHANGE_SOUND_SET]: 'flesh' }))).toBe('flesh');
    expect(soundSetOnChange(resource({ [DataElementAttribute.CHANGE_SOUND_SET]: 'mech' }))).toBe('mech');
    expect(soundSetOnChange(resource({ [DataElementAttribute.CHANGE_SOUND_SET]: 'ロボット' }))).toBe('flesh');
  });
});
