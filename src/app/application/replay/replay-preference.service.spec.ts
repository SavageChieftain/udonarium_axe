import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_REPLAY_PREFERENCE,
  parseReplayPreference,
  ReplayPreferenceService,
} from '@axe/application/replay/replay-preference.service';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';

const STORAGE_KEY = 'axe-replay-preference';

describe('parseReplayPreference()', () => {
  it('保存が無ければ標準にすること', () => {
    expect(parseReplayPreference(null)).toEqual(DEFAULT_REPLAY_PREFERENCE);
    expect(DEFAULT_REPLAY_PREFERENCE).toEqual({ detailLevel: ReplayDetailLevel.Notable });
  });

  it('保存された選択を読むこと', () => {
    expect(parseReplayPreference('{"detailLevel":"full"}')).toEqual({ detailLevel: ReplayDetailLevel.Full });
  });

  it('壊れた保存値は既定に倒すこと', () => {
    expect(parseReplayPreference('{')).toEqual(DEFAULT_REPLAY_PREFERENCE);
    expect(parseReplayPreference('null')).toEqual(DEFAULT_REPLAY_PREFERENCE);
  });

  it('知らない値は既定に倒すこと', () => {
    expect(parseReplayPreference('{"detailLevel":"everything"}')).toEqual(DEFAULT_REPLAY_PREFERENCE);
  });

  it('欠けている項目だけ既定で埋めること', () => {
    expect(parseReplayPreference('{}')).toEqual(DEFAULT_REPLAY_PREFERENCE);
  });
});

describe('ReplayPreferenceService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('既定は標準であること', () => {
    expect(TestBed.inject(ReplayPreferenceService).detailLevel()).toBe(ReplayDetailLevel.Notable);
  });

  it('選んだ細かさを次の卓へ持ち越すこと', () => {
    TestBed.inject(ReplayPreferenceService).setDetailLevel(ReplayDetailLevel.Full);

    TestBed.resetTestingModule();
    expect(TestBed.inject(ReplayPreferenceService).detailLevel()).toBe(ReplayDetailLevel.Full);
  });
});
