import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { TableAmbienceComponent } from '@axe/features/tabletop/table-ambience/table-ambience.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { MovableDirective } from '@axe/ui/directives/movable.directive';

describe('TableAmbienceComponent', () => {
  let fixture: ComponentFixture<TableAmbienceComponent>;
  let ambience: TableAmbience;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableAmbienceComponent],
      providers: [...TEST_PROVIDERS],
    });

    // 粒の中身は domain 側の spec で確かめる。ここは置き方だけを見るので、
    // 実行環境ごとに出来が違う 2D コンテキストは掴ませない。
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);

    ambience = TableAmbience.create('毒沼', 'swamp', 4, 4);
    fixture = TestBed.createComponent(TableAmbienceComponent);
    fixture.componentRef.setInput('ambience', ambience);
  });

  afterEach(() => {
    ObjectStore.instance.remove(ambience);
    vi.restoreAllMocks();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('マス数ぶんの大きさで置くこと', () => {
    const gridSize = TestBed.inject(TabletopService).gridSize();
    fixture.detectChanges();

    const root = element().querySelector<HTMLElement>('div')!;
    expect(root.style.width).toBe(`${4 * gridSize}px`);
    expect(root.style.height).toBe(`${4 * gridSize}px`);
  });

  it('面の塗りを敷くこと', () => {
    fixture.detectChanges();

    const surface = element().querySelectorAll<HTMLElement>('div')[1];
    expect(surface.style.background.length).toBeGreaterThan(0);
  });

  it('寝かせた面と正対する立ち上りを別々の canvas へ描くこと', () => {
    fixture.detectChanges();

    const canvases = Array.from(element().querySelectorAll<HTMLElement>('effect-canvas'));
    expect(canvases.length).toBeGreaterThanOrEqual(2);

    const [surface, ...vapors] = canvases;
    // 面は盤面に寝かせたまま、立ち上りだけカメラへ向き直す。
    expect(surface.style.transform).toBe('');
    expect(vapors.length).toBeGreaterThan(0);
    for (const vapor of vapors) expect(vapor.style.transform).toContain('rotateX(');
  });

  it('広い範囲ほど立ち上りを奥行き方向へ重ねること', async () => {
    // 1 枚だけだと、奥のものも手前のものも同じ深さに並んで帯にしか見えない。
    fixture.detectChanges();
    const narrow = fixture.componentInstance.vaporSlices().length;

    ambience.width = 16;
    ambience.height = 16;
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(fixture.componentInstance.vaporSlices().length).toBeGreaterThan(narrow);
  });

  it('奥の板ほど手前より上に立てること', async () => {
    ambience.height = 16;
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    const grounds = fixture.componentInstance.vaporSlices().map((slice) => slice.groundY);
    expect(grounds.length).toBeGreaterThan(1);
    for (let index = 1; index < grounds.length; index++) {
      expect(grounds[index]).toBeGreaterThan(grounds[index - 1]);
    }
  });

  it('ロック中は盤面の操作を通すこと', () => {
    ambience.isLock = true;
    fixture.detectChanges();

    const surface = element().querySelectorAll<HTMLElement>('div')[1];
    expect(surface.hasAttribute('data-table-passthrough')).toBe(true);
  });

  describe('置いたあとの書き換え', () => {
    /**
     * 「版を読んでからオブジェクトを返す」computed を挟むと、返り値の参照が変わらないので
     * signals は下流へ変化を伝えない。ロックも大きさも効かなくなる。
     */
    async function applyChange(change: () => void): Promise<void> {
      fixture.detectChanges();
      change();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();
    }

    it('ロックすると動かせなくなること', async () => {
      const movable = fixture.debugElement.query(By.directive(MovableDirective)).injector.get(MovableDirective);
      expect(movable.isDisable()).toBe(false);

      await applyChange(() => (ambience.isLock = true));

      expect(movable.isDisable()).toBe(true);
    });

    it('広さの変更がその場で反映されること', async () => {
      const gridSize = TestBed.inject(TabletopService).gridSize();

      await applyChange(() => {
        ambience.width = 12;
        ambience.height = 20;
      });

      expect(fixture.componentInstance.pixelWidth()).toBe(12 * gridSize);
      expect(fixture.componentInstance.pixelHeight()).toBe(20 * gridSize);
    });

    it('種類の変更がその場で反映されること', async () => {
      const before = fixture.componentInstance.surfaceWash();

      await applyChange(() => (ambience.ambienceKind = 'lava'));

      expect(fixture.componentInstance.surfaceWash()).not.toBe(before);
    });
  });
});
