import {
  buildMaskCss,
  buildScratchingGridInfos,
  type ScratchGridInfo,
} from '@axe/features/tabletop/game-table-mask/game-table-mask-helpers';
import { describe, expect, it } from 'vitest';

describe('game-table-mask-helpers', () => {
  describe('buildMaskCss', () => {
    it('preview では scratched と scratching の差分だけを非表示にすること', () => {
      const css = buildMaskCss({
        currentScratchingSet: new Set(['1:0']),
        gridSize: 50,
        height: 1,
        isNonScratched: false,
        isPreviewMode: true,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat');
    });

    it('通常モードでは scratched 済みグリッドを除外すること', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        height: 1,
        isNonScratched: false,
        isPreviewMode: false,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('radial-gradient(#000, #000) 49px -1px / 52px 52px no-repeat');
    });

    it('preview で scratched と scratching が一致する場合はそのグリッドを表示すること', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        height: 1,
        isNonScratched: false,
        isPreviewMode: true,
        scratchedGrids: '0:0',
        scratchingGrids: '0:0',
        width: 1,
      });

      expect(css).toBe('radial-gradient(#000, #000) -1px -1px / 52px 52px no-repeat');
    });

    it('通常モードかつ未スクラッチ時は空文字を返すこと', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        height: 2,
        isNonScratched: true,
        isPreviewMode: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('');
    });
  });

  describe('buildScratchingGridInfos', () => {
    it('scratched のみなら scrached 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: null,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: false,
        isNonScratching: true,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ state: 'scrached', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('scratching のみなら scraching 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: new Set(['0:0']),
        hasGameTableMask: true,
        height: 1,
        isNonScratched: true,
        isNonScratching: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ state: 'scraching', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('scratched と scratching の重複は restore 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: new Set(['0:0']),
        hasGameTableMask: true,
        height: 1,
        isNonScratched: false,
        isNonScratching: false,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ state: 'restore', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('mask が無いか変化が無い場合は空配列を返すこと', () => {
      expect(
        buildScratchingGridInfos({
          currentScratchingSet: null,
          hasGameTableMask: false,
          height: 1,
          isNonScratched: true,
          isNonScratching: true,
          scratchedGrids: '',
          scratchingGrids: '',
          width: 1,
        })
      ).toEqual([]);
    });
  });
});
