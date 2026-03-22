import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from 'testing/test-providers';

import { PeerMenuComponent } from './peer-menu.component';

describe('PeerMenuComponent', () => {
  let component: PeerMenuComponent;
  let fixture: ComponentFixture<PeerMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerMenuComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
