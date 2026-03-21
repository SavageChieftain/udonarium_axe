import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { VoteMenuComponent } from './vote-menu.component';

describe('VoteMenuComponent', () => {
  let component: VoteMenuComponent;
  let fixture: ComponentFixture<VoteMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [VoteMenuComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoteMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
