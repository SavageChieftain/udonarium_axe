import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CutInBgmComponent } from './cut-in-bgm.component';

describe('CutInBgmComponent', () => {
  let component: CutInBgmComponent;
  let fixture: ComponentFixture<CutInBgmComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInBgmComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CutInBgmComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
