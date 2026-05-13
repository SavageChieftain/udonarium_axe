import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextViewComponent } from '@axe/ui/components/text-view/text-view.component';

describe('TextViewComponent', () => {
  let component: TextViewComponent;
  let fixture: ComponentFixture<TextViewComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TextViewComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextViewComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
