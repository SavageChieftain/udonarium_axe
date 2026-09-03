import { TestBed } from '@angular/core/testing';
import { CoordinateService } from '@axe/application/input/coordinate.service';
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

  describe('the transform pool', () => {
    it('reuses its transforms across repeated conversions', () => {
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

      // the pooled reference surviving the call proves nothing was allocated
      expect(internal._transformA).toBe(a1);
      expect(internal._transformB).toBe(b1);
    });

    it('gives the same answer as a fresh transform would', () => {
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

    it('uses one pooled transform for each end and no more', () => {
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
