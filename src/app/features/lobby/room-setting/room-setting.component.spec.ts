import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomSettingComponent } from './room-setting.component';

describe('RoomSettingComponent', () => {
  let component: RoomSettingComponent;
  let fixture: ComponentFixture<RoomSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RoomSettingComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomSettingComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
