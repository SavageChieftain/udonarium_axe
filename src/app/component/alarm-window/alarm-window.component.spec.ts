import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlarmWindowComponent } from './alarm-window.component';
import { Alarm } from '@axe/alarm';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';

describe('AlarmWindowComponent', () => {
  let component: AlarmWindowComponent;
  let fixture: ComponentFixture<AlarmWindowComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AlarmWindowComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    // Create and register Alarm singleton
    const alarm = new Alarm('Alarm');
    alarm.initTimeStamp = Date.now();
    ObjectStore.instance.add(alarm);

    fixture = TestBed.createComponent(AlarmWindowComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up ObjectStore after each test
    ObjectStore.instance.delete('Alarm');
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
