import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Alarm } from '@axe/domain/shared/alarm';
import { AlarmWindowComponent } from '@axe/features/alarm/alarm-window/alarm-window.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('AlarmWindowComponent', () => {
  let component: AlarmWindowComponent;
  let fixture: ComponentFixture<AlarmWindowComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AlarmWindowComponent],
      providers: [...TEST_PROVIDERS],
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
