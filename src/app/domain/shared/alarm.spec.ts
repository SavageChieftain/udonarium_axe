import { TestBed } from '@angular/core/testing';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import * as domainEvents from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Subscription } from 'rxjs';

import { Alarm } from './alarm';

describe('Alarm', () => {
  let store: ObjectStore;
  let alarm: Alarm;
  const savedMyCursor = PeerCursor.myCursor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    alarm = new Alarm();
    alarm.initialize();

    // Mock PeerCursor.myCursor
    PeerCursor.myCursor = { peerId: 'my-peer-id' } as PeerCursor;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = savedMyCursor;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('初期状態', () => {
    it('initTimeStamp が 0', () => {
      expect(alarm.initTimeStamp).toBe(0);
    });

    it('alarmTitle が空文字', () => {
      expect(alarm.alarmTitle).toBe('');
    });

    it('targetPeerId が空配列', () => {
      expect(alarm.targetPeerId).toEqual([]);
    });

    it('alarmTime が 0', () => {
      expect(alarm.alarmTime).toBe(0);
    });

    it('alarmId が 0', () => {
      expect(alarm.alarmId).toBe(0);
    });

    it('alarmPeerId が空文字', () => {
      expect(alarm.alarmPeerId).toBe('');
    });

    it('targetText が空文字', () => {
      expect(alarm.targetText).toBe('');
    });

    it('isSound が false', () => {
      expect(alarm.isSound).toBe(false);
    });

    it('isPopUp が false', () => {
      expect(alarm.isPopUp).toBe(false);
    });
  });

  describe('myPeer', () => {
    it('PeerCursor.myCursor を返す', () => {
      expect(alarm.myPeer).toBe(PeerCursor.myCursor);
    });
  });

  describe('makeAlarm()', () => {
    it('すべてのプロパティが設定される', () => {
      alarm.makeAlarm(30, 'テストアラーム', ['peer-1', 'peer-2'], 'alarm-peer', '対象テキスト', true, true);

      expect(alarm.alarmTime).toBe(30);
      expect(alarm.alarmTitle).toBe('テストアラーム');
      expect(alarm.targetPeerId).toEqual(['peer-1', 'peer-2']);
      expect(alarm.alarmPeerId).toBe('alarm-peer');
      expect(alarm.targetText).toBe('対象テキスト');
      expect(alarm.isSound).toBe(true);
      expect(alarm.isPopUp).toBe(true);
    });

    it('alarmId がインクリメントされる', () => {
      expect(alarm.alarmId).toBe(0);
      alarm.makeAlarm(10, 'a', [], '', '', false, false);
      expect(alarm.alarmId).toBe(1);
      alarm.makeAlarm(10, 'b', [], '', '', false, false);
      expect(alarm.alarmId).toBe(2);
    });

    it('initTimeStamp が現在時刻に設定される', () => {
      const before = Date.now();
      alarm.makeAlarm(10, 'title', [], '', '', false, false);
      const after = Date.now();

      expect(alarm.initTimeStamp).toBeGreaterThanOrEqual(before);
      expect(alarm.initTimeStamp).toBeLessThanOrEqual(after);
    });

    it('isSound=false, isPopUp=false で設定できる', () => {
      alarm.makeAlarm(5, 'quiet', ['peer-1'], 'ap', '', false, false);

      expect(alarm.isSound).toBe(false);
      expect(alarm.isPopUp).toBe(false);
    });
  });

  describe('chkToMe()', () => {
    it('targetPeerIdに自分のpeerIdが含まれていればtrue', () => {
      alarm.targetPeerId = ['other-peer', 'my-peer-id'];
      expect(alarm.chkToMe()).toBe(true);
    });

    it('targetPeerIdに自分のpeerIdが含まれていなければfalse', () => {
      alarm.targetPeerId = ['other-peer', 'another-peer'];
      expect(alarm.chkToMe()).toBe(false);
    });

    it('targetPeerIdが空配列ならfalse', () => {
      alarm.targetPeerId = [];
      expect(alarm.chkToMe()).toBe(false);
    });

    it('自分のpeerIdだけがtargetならtrue', () => {
      alarm.targetPeerId = ['my-peer-id'];
      expect(alarm.chkToMe()).toBe(true);
    });
  });

  describe('startAlarm()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('自分が対象外ならsetTimeoutが呼ばれない', () => {
      alarm.targetPeerId = ['other-peer'];
      alarm.isSound = true;
      alarm.isPopUp = true;
      const timeUpEvents: domainEvents.AlarmTimeUpEvent[] = [];
      const popEvents: domainEvents.AlarmPopEvent[] = [];
      const sub = new Subscription();
      sub.add(domainEvents.alarmTimeUp$.subscribe((e) => timeUpEvents.push(e)));
      sub.add(domainEvents.alarmPop$.subscribe((e) => popEvents.push(e)));

      alarm.startAlarm();
      vi.advanceTimersByTime(100000);

      expect(timeUpEvents).toHaveLength(0);
      expect(popEvents).toHaveLength(0);
      sub.unsubscribe();
    });

    it('isSound=true ならタイムアップ時にALARM_TIMEUP_ORIGINがトリガーされる', () => {
      alarm.targetPeerId = ['my-peer-id'];
      alarm.alarmTime = 5;
      alarm.alarmTitle = 'テスト';
      alarm.targetText = '対象';
      alarm.isSound = true;
      alarm.isPopUp = false;

      const timeUpEvents: domainEvents.AlarmTimeUpEvent[] = [];
      const sub = domainEvents.alarmTimeUp$.subscribe((e) => timeUpEvents.push(e));
      vi.spyOn(AudioPlayer, 'play').mockImplementation(() => {});
      vi.spyOn(AudioStorage, 'instance', 'get').mockReturnValue({ get: () => null } as unknown as AudioStorage);

      alarm.startAlarm();
      vi.advanceTimersByTime(5000);

      expect(timeUpEvents).toHaveLength(1);
      expect(timeUpEvents[0]).toEqual(expect.objectContaining({ text: expect.any(String) }));
      sub.unsubscribe();
    });

    it('isPopUp=true ならタイムアップ時にALARM_POPがトリガーされる', () => {
      alarm.targetPeerId = ['my-peer-id'];
      alarm.alarmTime = 3;
      alarm.alarmTitle = 'ポップアップテスト';
      alarm.isSound = false;
      alarm.isPopUp = true;

      const popEvents: domainEvents.AlarmPopEvent[] = [];
      const sub = domainEvents.alarmPop$.subscribe((e) => popEvents.push(e));

      alarm.startAlarm();
      vi.advanceTimersByTime(3000);

      expect(popEvents).toHaveLength(1);
      expect(popEvents[0]).toEqual({ title: 'ポップアップテスト', time: 3 });
      sub.unsubscribe();
    });

    it('alarmTime秒後にコールバックが実行される', () => {
      alarm.targetPeerId = ['my-peer-id'];
      alarm.alarmTime = 10;
      alarm.isSound = false;
      alarm.isPopUp = true;
      alarm.alarmTitle = 'タイミングテスト';

      const popEvents: domainEvents.AlarmPopEvent[] = [];
      const sub = domainEvents.alarmPop$.subscribe((e) => popEvents.push(e));

      alarm.startAlarm();

      // 9秒ではまだ実行されない
      vi.advanceTimersByTime(9999);
      expect(popEvents).toHaveLength(0);

      // 10秒で実行される
      vi.advanceTimersByTime(1);
      expect(popEvents).toHaveLength(1);
      sub.unsubscribe();
    });
  });

  describe('apply()', () => {
    it('initTimeStampが変更されたらstartAlarmが呼ばれる', () => {
      const startAlarmSpy = vi.spyOn(alarm, 'startAlarm').mockImplementation(() => {});
      alarm.initTimeStamp = 100;

      const context = alarm.toContext();
      context.syncData = { ...context.syncData, initTimeStamp: 200 };

      alarm.apply(context);

      expect(startAlarmSpy).toHaveBeenCalled();
    });

    it('initTimeStampが変更されなければstartAlarmは呼ばれない', () => {
      const startAlarmSpy = vi.spyOn(alarm, 'startAlarm').mockImplementation(() => {});
      alarm.initTimeStamp = 100;

      const context = alarm.toContext();
      // syncDataのinitTimeStampは100のまま

      alarm.apply(context);

      expect(startAlarmSpy).not.toHaveBeenCalled();
    });
  });
});
