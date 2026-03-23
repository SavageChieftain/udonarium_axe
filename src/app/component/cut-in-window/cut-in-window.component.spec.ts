import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CutInWindowComponent } from './cut-in-window.component';

describe('CutInWindowComponent', () => {
  let component: CutInWindowComponent;
  let fixture: ComponentFixture<CutInWindowComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CutInWindowComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
