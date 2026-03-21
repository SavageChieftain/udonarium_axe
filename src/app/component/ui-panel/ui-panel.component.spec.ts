import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { UIPanelComponent } from './ui-panel.component';

describe('UIPanelComponent', () => {
  let component: UIPanelComponent;
  let fixture: ComponentFixture<UIPanelComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UIPanelComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UIPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
