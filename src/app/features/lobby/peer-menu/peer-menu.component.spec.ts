import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { isReconnectDebugModeByLocation, isReconnectDebugModeByQuery, PeerMenuComponent } from './peer-menu.component';

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

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('myTimeがsignalであること', () => {
    expect(typeof component.myTime).toBe('function');
  });

  it('debugReconnect=1 のときデバッグモードが有効になること', () => {
    expect(isReconnectDebugModeByQuery('?debugReconnect=1')).toBe(true);
  });

  it('debugReconnect=true のときデバッグモードが有効になること', () => {
    expect(isReconnectDebugModeByQuery('?debugReconnect=true')).toBe(true);
  });

  it('debugReconnect が未指定または0のとき無効になること', () => {
    expect(isReconnectDebugModeByQuery('')).toBe(false);
    expect(isReconnectDebugModeByQuery('?debugReconnect=0')).toBe(false);
  });

  it('hash query の debugReconnect=true でも有効になること', () => {
    expect(isReconnectDebugModeByLocation({ search: '', hash: '#/room?debugReconnect=true' })).toBe(true);
  });

  it('search query の debugReconnect=1 でも有効になること', () => {
    expect(isReconnectDebugModeByLocation({ search: '?debugReconnect=1', hash: '' })).toBe(true);
  });
});
