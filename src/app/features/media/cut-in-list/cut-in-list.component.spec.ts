import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

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
