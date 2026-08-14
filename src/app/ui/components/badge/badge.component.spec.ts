import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from '@axe/ui/components/badge/badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('counts nothing by default', () => {
    expect(component.count()).toBe(0);
  });

  it('takes its count from an input signal', () => {
    fixture.componentRef.setInput('count', 5);
    expect(component.count()).toBe(5);
  });
});
