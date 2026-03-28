import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { PeerCursorComponent } from './peer-cursor.component';

describe('PeerCursorComponent', () => {
  let component: PeerCursorComponent;
  let fixture: ComponentFixture<PeerCursorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerCursorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerCursorComponent);
    component = fixture.componentInstance;
    vi.spyOn(component, 'ngOnDestroy').mockImplementation(() => undefined);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnDestroy を直接呼び出してもエラーにならないこと（タイマー未設定時）', () => {
    // タイマーフィールドが null の状態で ngOnDestroy を呼んでも安全であることを確認
    vi.mocked(component.ngOnDestroy).mockRestore();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
