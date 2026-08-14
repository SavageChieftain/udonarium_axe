import { createScene, MapScene } from '@axe/features/map-editor/model/scene';
import { collectSceneImageIds } from '@axe/features/map-editor/model/scene-archive-images';

function sceneWith(layers: MapScene['layers']): MapScene {
  return { ...createScene(), layers };
}

describe('collectSceneImageIds()', () => {
  it('マスの塗りに使った模様を拾うこと', () => {
    const scene = sceneWith([
      {
        id: 'l1',
        kind: 'cell',
        name: '床',
        visible: true,
        locked: false,
        opacity: 1,
        cells: { '0,0': { type: 'texture', textureId: 'image:abc' } },
      } as unknown as MapScene['layers'][number],
    ]);

    expect([...collectSceneImageIds(scene).textureIds]).toEqual(['abc']);
  });

  it('図形の塗りと線の両方から拾うこと', () => {
    const scene = sceneWith([
      {
        id: 'l1',
        kind: 'shape',
        name: '図形',
        visible: true,
        locked: false,
        opacity: 1,
        items: [
          {
            id: 's1',
            fill: { type: 'texture', textureId: 'image:fill' },
            stroke: { fill: { type: 'texture', textureId: 'image:line' } },
          },
        ],
      } as unknown as MapScene['layers'][number],
    ]);

    expect([...collectSceneImageIds(scene).textureIds].sort()).toEqual(['fill', 'line']);
  });

  it('貼った絵は模様と分けて数えること', () => {
    // 模様は置き場で目印を付けて選り分けるので、入れ直すときの扱いが違う。
    const scene = sceneWith([
      {
        id: 'l1',
        kind: 'image',
        name: '絵',
        visible: true,
        locked: false,
        opacity: 1,
        items: [{ id: 'i1', imageIdentifier: 'picture-1' }],
      } as unknown as MapScene['layers'][number],
    ]);

    const ids = collectSceneImageIds(scene);
    expect([...ids.imageIds]).toEqual(['picture-1']);
    expect(ids.textureIds.size).toBe(0);
  });

  it('絵を使っていない塗りは拾わないこと', () => {
    const scene = sceneWith([
      {
        id: 'l1',
        kind: 'cell',
        name: '床',
        visible: true,
        locked: false,
        opacity: 1,
        cells: { '0,0': { type: 'solid', color: '#ff0000' } },
      } as unknown as MapScene['layers'][number],
    ]);

    expect(collectSceneImageIds(scene).textureIds.size).toBe(0);
  });
});
