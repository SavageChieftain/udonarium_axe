import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { ReConnectComponent } from './re-connect.component';

describe('ReConnectComponent', () => {
  let component: ReConnectComponent;
  let fixture: ComponentFixture<ReConnectComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReConnectComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReConnectComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
