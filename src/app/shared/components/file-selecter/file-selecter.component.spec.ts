import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('FileSelecterComponent', () => {
  let component: FileSelecterComponent;
  let fixture: ComponentFixture<FileSelecterComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FileSelecterComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileSelecterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
