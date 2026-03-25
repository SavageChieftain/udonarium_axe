import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CutInBgmComponent } from './cut-in-bgm.component';

describe('CutInBgmComponent', () => {
  let component: CutInBgmComponent;
  let fixture: ComponentFixture<CutInBgmComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInBgmComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CutInBgmComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('audiosが配列を返すこと', () => {
    expect(Array.isArray(component.audios)).toBe(true);
  });
});
