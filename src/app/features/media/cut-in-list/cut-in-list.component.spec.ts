import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CutInListComponent } from './cut-in-list.component';

describe('CutInListComponent', () => {
  let component: CutInListComponent;
  let fixture: ComponentFixture<CutInListComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInListComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CutInListComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
