import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ReConnectComponent } from './re-connect.component';

describe('ReConnectComponent', () => {
  let component: ReConnectComponent;
  let fixture: ComponentFixture<ReConnectComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReConnectComponent],
      providers: [...TEST_PROVIDERS],
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
