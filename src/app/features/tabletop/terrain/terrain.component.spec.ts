import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { TerrainComponent } from './terrain.component';

describe('TerrainComponent', () => {
  let component: TerrainComponent;
  let fixture: ComponentFixture<TerrainComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TerrainComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TerrainComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    let ng0203Thrown = false;
    try {
      component.ngOnInit();
    } catch (e: unknown) {
      if (String(e).includes('NG0203')) {
        ng0203Thrown = true;
      }
    }
    expect(ng0203Thrown).toBe(false);
  });
});
