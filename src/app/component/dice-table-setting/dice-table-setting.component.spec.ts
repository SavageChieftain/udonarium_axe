import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from 'testing/test-providers';

import { DiceTableSettingComponent } from './dice-table-setting.component';

describe('DiceTableSettingComponent', () => {
  let component: DiceTableSettingComponent;
  let fixture: ComponentFixture<DiceTableSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiceTableSettingComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceTableSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
