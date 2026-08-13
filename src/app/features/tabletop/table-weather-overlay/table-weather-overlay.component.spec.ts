import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
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
    it('天候が無ければ切り抜かないこと', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance.clipPath()).toBe('none');
    });

    it('盤面の位置が分からないうちは切り抜かないこと', () => {
      // 盤面がまだ組み上がっていない間に四隅を投影すると、原点だけの潰れた形になる。
      table.weatherKind = 'rain';
      fixture.detectChanges();
      expect(fixture.componentInstance.clipPath()).toBe('none');
    });

    it('盤面の四隅を四角形に切り抜くこと', () => {
      const origin = document.createElement('div');
      document.body.appendChild(origin);
      TestBed.inject(CoordinateService).tabletopOriginElement = origin;

      table.weatherKind = 'rain';
      table.width = 10;
      table.height = 8;
      fixture.detectChanges();

      // 盤の外の余白にまで降らせないよう、テーブル 1 枚ぶんの四角形で切る。
      const clip = fixture.componentInstance.clipPath();
      expect(clip).toMatch(/^polygon\(/);
      expect(clip.split(',')).toHaveLength(4);

      origin.remove();
    });
  });

  it('置きっぱなしの描画ループを止めないこと', () => {
    const playback = TestBed.inject(EffectPlaybackService);
    const spy = vi.spyOn(playback, 'setPersistent');

    table.weatherKind = 'snow';
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('ambience', true);
  });
});
