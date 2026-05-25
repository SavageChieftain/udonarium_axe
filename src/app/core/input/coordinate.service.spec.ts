import { TestBed } from '@angular/core/testing';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { Transform } from '@axe/core/transform/transform';

describe('CoordinateService', () => {
  let service: CoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoordinateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Transform プール', () => {
    it('convertToLocal を連続して呼んでも内部 Transform インスタンスは使い回される', () => {
      const internal = service as unknown as { _transformA: Transform; _transformB: Transform };
      const a1 = internal._transformA;
      const b1 = internal._transformB;

      const el = document.createElement('div');
      document.body.appendChild(el);
      service.convertToLocal({ x: 10, y: 10, z: 0 }, el);
      service.convertToLocal({ x: 20, y: 20, z: 0 }, el);
      service.convertToGlobal({ x: 30, y: 30, z: 0 }, el);
      service.convertLocalToLocal({ x: 40, y: 40, z: 0 }, el, document.body);
      document.body.removeChild(el);

      // プールされたインスタンス参照が apply 後も同じ object であれば、内部で new されていない
      expect(internal._transformA).toBe(a1);
      expect(internal._transformB).toBe(b1);
    });

    it('convertToLocal の結果は new Transform を毎回作った場合と一致する', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const pooled = service.convertToLocal({ x: 50, y: 60, z: 0 }, el);

      const transformer = new Transform(el);
      const expected = transformer.globalToLocal(50, 60, 0);
      transformer.clear();

      expect(pooled.x).toBeCloseTo(expected.x);
      expect(pooled.y).toBeCloseTo(expected.y);
      expect(pooled.z).toBeCloseTo(expected.z);

      document.body.removeChild(el);
    });

    it('convertLocalToLocal は from / to で別インスタンスを使い 2 個のプールで完結する', () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      document.body.appendChild(a);
      document.body.appendChild(b);

      const result = service.convertLocalToLocal({ x: 10, y: 10, z: 0 }, a, b);
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.z).toBe('number');

      document.body.removeChild(a);
      document.body.removeChild(b);
    });
  });
});
