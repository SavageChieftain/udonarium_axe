import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TableWeatherOverlayComponent } from '@axe/features/tabletop/table-weather-overlay/table-weather-overlay.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TableWeatherOverlayComponent', () => {
  let fixture: ComponentFixture<TableWeatherOverlayComponent>;
  let table: GameTable;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableWeatherOverlayComponent],
      providers: [...TEST_PROVIDERS, TabletopService],
    });

    table = new GameTable();
    table.initialize();
    TableSelecter.instance.viewTableIdentifier = table.identifier;

    // 粒の中身は domain 側の spec で確かめる。ここは置き方だけを見るので、
    // 実行環境ごとに出来が違う 2D コンテキストは掴ませない。
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);

    fixture = TestBed.createComponent(TableWeatherOverlayComponent);
  });

  afterEach(() => {
    ObjectStore.instance.remove(table);
    vi.restoreAllMocks();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('天候が無ければ何も描かないこと', () => {
    fixture.detectChanges();

    expect(element().querySelectorAll('div')).toHaveLength(0);
    expect(element().querySelectorAll('effect-canvas')).toHaveLength(0);
  });

  it('天候を選ぶと画面いっぱいの塗りを敷くこと', () => {
    table.weatherKind = 'fog';
    fixture.detectChanges();

    const wash = element().querySelector<HTMLElement>('div');
    expect(wash).not.toBeNull();
    expect(wash!.style.background.length).toBeGreaterThan(0);
  });

  it('大きさが測れるまでは粒を描かないこと', () => {
    // ResizeObserver が動かないうちに描くと、幅 0 の canvas を作ってしまう。
    table.weatherKind = 'rain';
    fixture.detectChanges();

    expect(element().querySelectorAll('effect-canvas')).toHaveLength(0);
  });

  it('大きさが決まれば粒を canvas へ描くこと', () => {
    table.weatherKind = 'rain';
    fixture.componentInstance['size'].set({ width: 1280, height: 720 });
    fixture.detectChanges();

    expect(element().querySelectorAll('effect-canvas')).toHaveLength(1);
  });

  it('描いたあとに天候を選んでも反映されること', async () => {
    fixture.detectChanges();
    expect(element().querySelectorAll('div')).toHaveLength(0);

    table.weatherKind = 'fog';
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(element().querySelector<HTMLElement>('div')?.style.background.length).toBeGreaterThan(0);
  });

  describe('降る範囲', () => {
    it('天候が無ければマスクを掛けないこと', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance.maskImage()).toBe('none');
    });

    it('盤面の位置が分からないうちはマスクを掛けないこと', () => {
      // 盤面がまだ組み上がっていない間に投影すると、原点だけの潰れた形になる。
      table.weatherKind = 'rain';
      fixture.detectChanges();
      expect(fixture.componentInstance.maskImage()).toBe('none');
    });
  });

  it('パネルより前に出ないこと', () => {
    // パネルは重ね順を指定しない。天候が重ね順を持つと、上に被さってしまう。
    const host = fixture.nativeElement as HTMLElement;
    expect(host.className).not.toMatch(/(^|\s)z-/);
    expect(host.style.zIndex).toBe('');
  });

  it('置きっぱなしの描画ループを止めないこと', () => {
    const playback = TestBed.inject(EffectPlaybackService);
    const spy = vi.spyOn(playback, 'setPersistent');

    table.weatherKind = 'snow';
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('ambience', true);
  });
});
