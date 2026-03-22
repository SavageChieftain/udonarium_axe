import { TestBed } from '@angular/core/testing';

import { ObjectStore } from './core/synchronize-object/object-store';
import { EventSystem } from './core/system';
import { PeerCursor } from './peer-cursor';
import { Vote } from './vote';

describe('Vote', () => {
  let store: ObjectStore;
  let vote: Vote;
  const savedMyCursor = PeerCursor.myCursor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    vote = new Vote();
    vote.initialize();

    PeerCursor.myCursor = { peerId: 'my-peer-id', voteAnswer: -1, voteId: -1 } as unknown as PeerCursor;
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
      expect(vote.initTimeStamp).toBe(0);
    });

    it('voteTitle が空文字', () => {
      expect(vote.voteTitle).toBe('');
    });

    it('targetPeerId が空配列', () => {
      expect(vote.targetPeerId).toEqual([]);
    });

    it('choices が空配列', () => {
      expect(vote.choices).toEqual([]);
    });

    it('chairId が空文字', () => {
      expect(vote.chairId).toBe('');
    });

    it('isRollCall が false', () => {
      expect(vote.isRollCall).toBe(false);
    });

    it('isFinish が false', () => {
      expect(vote.isFinish).toBe(false);
    });

    it('voteId が 0', () => {
      expect(vote.voteId).toBe(0);
    });
  });

  describe('makeVote()', () => {
    it('すべてのプロパティが設定される', () => {
      vote.makeVote('chair-1', '投票テスト', ['peer-1', 'peer-2'], ['賛成', '反対'], false);

      expect(vote.chairId).toBe('chair-1');
      expect(vote.voteTitle).toBe('投票テスト');
      expect(vote.targetPeerId).toEqual(['peer-1', 'peer-2']);
      expect(vote.choices).toEqual(['賛成', '反対']);
      expect(vote.isRollCall).toBe(false);
    });

    it('voteId がインクリメントされる', () => {
      expect(vote.voteId).toBe(0);
      vote.makeVote('c', 'v1', [], [], false);
      expect(vote.voteId).toBe(1);
      vote.makeVote('c', 'v2', [], [], false);
      expect(vote.voteId).toBe(2);
    });

    it('initTimeStamp が現在時刻に設定される', () => {
      const before = Date.now();
      vote.makeVote('c', 'v', [], [], false);
      const after = Date.now();

      expect(vote.initTimeStamp).toBeGreaterThanOrEqual(before);
      expect(vote.initTimeStamp).toBeLessThanOrEqual(after);
    });

    it('isRollCall=true で点呼モードにする', () => {
      vote.makeVote('c', '点呼', ['p1'], [], true);
      expect(vote.isRollCall).toBe(true);
    });
  });

  describe('voteAnswerByPeerId()', () => {
    it('peerが見つからなければ-2(棄権扱い)', () => {
      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue(null!);
      expect(vote.voteAnswerByPeerId('nonexistent')).toBe(-2);
    });

    it('peerのvoteIdが不一致なら-1(未投票)', () => {
      vote.voteId = 5;
      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 3, voteAnswer: 0 } as unknown as PeerCursor);
      expect(vote.voteAnswerByPeerId('peer-1')).toBe(-1);
    });

    it('peerのvoteIdが一致すればvoteAnswerを返す', () => {
      vote.voteId = 5;
      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 5, voteAnswer: 2 } as unknown as PeerCursor);
      expect(vote.voteAnswerByPeerId('peer-1')).toBe(2);
    });

    it('peerの棄権(-2)も正しく返す', () => {
      vote.voteId = 1;
      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 1, voteAnswer: -2 } as unknown as PeerCursor);
      expect(vote.voteAnswerByPeerId('peer-1')).toBe(-2);
    });
  });

  describe('voteAnswer (getter)', () => {
    it('targetPeerIdの各人のvoteAnswerByPeerIdを配列で返す', () => {
      vote.targetPeerId = ['peer-1', 'peer-2'];
      vote.voteId = 1;

      const findSpy = vi.spyOn(PeerCursor, 'findByPeerId');
      findSpy.mockImplementation((peerId: string) => {
        if (peerId === 'peer-1') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        if (peerId === 'peer-2') return { voteId: 1, voteAnswer: 1 } as unknown as PeerCursor;
        return null!;
      });

      expect(vote.voteAnswer).toEqual([0, 1]);
    });

    it('targetPeerIdが空なら空配列', () => {
      vote.targetPeerId = [];
      expect(vote.voteAnswer).toEqual([]);
    });
  });

  describe('chkToMe()', () => {
    it('targetPeerIdに自分が含まれていればtrue', () => {
      vote.targetPeerId = ['other-peer', 'my-peer-id'];
      expect(vote.chkToMe()).toBe(true);
    });

    it('targetPeerIdに自分が含まれていなければfalse', () => {
      vote.targetPeerId = ['other-peer'];
      expect(vote.chkToMe()).toBe(false);
    });

    it('targetPeerIdが空ならfalse', () => {
      vote.targetPeerId = [];
      expect(vote.chkToMe()).toBe(false);
    });
  });

  describe('indexToChoice()', () => {
    beforeEach(() => {
      vote.choices = ['賛成', '反対', '棄権'];
    });

    it('有効なindexで選択肢を返す', () => {
      expect(vote.indexToChoice(0)).toBe('賛成');
      expect(vote.indexToChoice(1)).toBe('反対');
      expect(vote.indexToChoice(2)).toBe('棄権');
    });

    it('負のindexで空文字を返す', () => {
      expect(vote.indexToChoice(-1)).toBe('');
      expect(vote.indexToChoice(-2)).toBe('');
    });

    it('範囲外indexで空文字を返す', () => {
      expect(vote.indexToChoice(3)).toBe('');
      expect(vote.indexToChoice(100)).toBe('');
    });
  });

  describe('votedTotalNum()', () => {
    it('投票済み(index>=0)と棄権(-2)の合計を数える', () => {
      vote.targetPeerId = ['p1', 'p2', 'p3'];
      vote.voteId = 1;

      vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId: string) => {
        if (peerId === 'p1') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        if (peerId === 'p2') return { voteId: 1, voteAnswer: -2 } as unknown as PeerCursor;
        if (peerId === 'p3') return { voteId: 0, voteAnswer: 0 } as unknown as PeerCursor; // voteId不一致→未投票(-1)
        return null!;
      });

      expect(vote.votedTotalNum()).toBe(2); // p1(投票) + p2(棄権)
    });

    it('全員未投票なら0', () => {
      vote.targetPeerId = ['p1', 'p2'];
      vote.voteId = 1;
      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 0, voteAnswer: 0 } as unknown as PeerCursor);

      expect(vote.votedTotalNum()).toBe(0);
    });
  });

  describe('votedNumByIndex()', () => {
    it('指定indexと一致する回答数を数える', () => {
      vote.targetPeerId = ['p1', 'p2', 'p3'];
      vote.voteId = 1;

      vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId: string) => {
        if (peerId === 'p1') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        if (peerId === 'p2') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        if (peerId === 'p3') return { voteId: 1, voteAnswer: 1 } as unknown as PeerCursor;
        return null!;
      });

      expect(vote.votedNumByIndex(0)).toBe(2);
      expect(vote.votedNumByIndex(1)).toBe(1);
      expect(vote.votedNumByIndex(2)).toBe(0);
    });

    it('棄権(-2)の数を数える', () => {
      vote.targetPeerId = ['p1', 'p2'];
      vote.voteId = 1;

      vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId: string) => {
        if (peerId === 'p1') return { voteId: 1, voteAnswer: -2 } as unknown as PeerCursor;
        if (peerId === 'p2') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        return null!;
      });

      expect(vote.votedNumByIndex(-2)).toBe(1);
    });
  });

  describe('votedNumByChoice()', () => {
    it('選択肢名から投票数を取得する', () => {
      vote.choices = ['賛成', '反対'];
      vote.targetPeerId = ['p1', 'p2', 'p3'];
      vote.voteId = 1;

      vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId: string) => {
        if (peerId === 'p1') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        if (peerId === 'p2') return { voteId: 1, voteAnswer: 1 } as unknown as PeerCursor;
        if (peerId === 'p3') return { voteId: 1, voteAnswer: 0 } as unknown as PeerCursor;
        return null!;
      });

      expect(vote.votedNumByChoice('賛成')).toBe(2);
      expect(vote.votedNumByChoice('反対')).toBe(1);
    });
  });

  describe('isVoteEnd()', () => {
    it('投票済みならtrue', () => {
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 3;

      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 3, voteAnswer: 0 } as unknown as PeerCursor);

      expect(vote.isVoteEnd('peer-1')).toBe(true);
    });

    it('未投票ならfalse', () => {
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 3;

      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 2, voteAnswer: 0 } as unknown as PeerCursor);

      expect(vote.isVoteEnd('peer-1')).toBe(false);
    });

    it('対象外のpeerIdならfalse', () => {
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 3;

      expect(vote.isVoteEnd('non-target')).toBe(false);
    });

    it('peerが見つからなければtrue(退出扱い)', () => {
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 3;

      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue(null!);

      expect(vote.isVoteEnd('peer-1')).toBe(true);
    });
  });

  describe('voting()', () => {
    it('選択肢を投票するとmyCursorにvoteAnswerが設定される', () => {
      vote.choices = ['賛成', '反対'];
      vote.voteId = 1;
      vote.chairId = 'other-chair';

      vote.voting('反対', 'my-peer-id');

      expect(PeerCursor.myCursor.voteAnswer).toBe(1);
      expect(PeerCursor.myCursor.voteId).toBe(1);
    });

    it('null を投票すると棄権(-2)が設定される', () => {
      vote.choices = ['賛成', '反対'];
      vote.voteId = 1;
      vote.chairId = 'other-chair';

      vote.voting(null, 'my-peer-id');

      expect(PeerCursor.myCursor.voteAnswer).toBe(-2);
      expect(PeerCursor.myCursor.voteId).toBe(1);
    });
  });

  describe('startVote()', () => {
    it('END_OLD_VOTE と START_VOTE がトリガーされる', () => {
      const triggerSpy = vi.spyOn(EventSystem, 'trigger');

      vote.startVote();

      expect(triggerSpy).toHaveBeenCalledWith('END_OLD_VOTE', {});
      expect(triggerSpy).toHaveBeenCalledWith('START_VOTE', {});
    });
  });

  describe('apply()', () => {
    it('initTimeStampが変更されたらstartVoteが呼ばれる', () => {
      const startVoteSpy = vi.spyOn(vote, 'startVote').mockImplementation(() => {});
      vi.spyOn(vote, 'chkFinishVote').mockImplementation(() => {});
      vote.initTimeStamp = 100;

      const context = vote.toContext();
      context.syncData = { ...context.syncData, initTimeStamp: 200 };

      vote.apply(context);

      expect(startVoteSpy).toHaveBeenCalled();
    });

    it('initTimeStampが変更されなければstartVoteは呼ばれない', () => {
      const startVoteSpy = vi.spyOn(vote, 'startVote').mockImplementation(() => {});
      vi.spyOn(vote, 'chkFinishVote').mockImplementation(() => {});
      vote.initTimeStamp = 100;

      const context = vote.toContext();

      vote.apply(context);

      expect(startVoteSpy).not.toHaveBeenCalled();
    });

    it('apply後にchkFinishVoteが呼ばれる', () => {
      const chkFinishSpy = vi.spyOn(vote, 'chkFinishVote').mockImplementation(() => {});
      vi.spyOn(vote, 'startVote').mockImplementation(() => {});

      const context = vote.toContext();
      vote.apply(context);

      expect(chkFinishSpy).toHaveBeenCalled();
    });
  });

  describe('chkFinishVote()', () => {
    it('議長かつ全員投票済みでFINISH_VOTEがトリガーされる', () => {
      vi.useFakeTimers();
      vote.chairId = 'my-peer-id';
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 1;
      vote.choices = ['賛成', '反対'];
      vote.isRollCall = false;
      vote.voteTitle = 'テスト投票';

      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 1, voteAnswer: 0 } as unknown as PeerCursor);
      const triggerSpy = vi.spyOn(EventSystem, 'trigger');

      vote.chkFinishVote();
      vi.advanceTimersByTime(10);

      expect(triggerSpy).toHaveBeenCalledWith('FINISH_VOTE', expect.objectContaining({ text: expect.any(String) }));
      vi.useRealTimers();
    });

    it('議長でなければFINISH_VOTEはトリガーされない', () => {
      vi.useFakeTimers();
      vote.chairId = 'other-peer-id';
      vote.targetPeerId = ['peer-1'];
      vote.voteId = 1;

      vi.spyOn(PeerCursor, 'findByPeerId').mockReturnValue({ voteId: 1, voteAnswer: 0 } as unknown as PeerCursor);
      const triggerSpy = vi.spyOn(EventSystem, 'trigger');

      vote.chkFinishVote();
      vi.advanceTimersByTime(10);

      expect(triggerSpy).not.toHaveBeenCalledWith('FINISH_VOTE', expect.anything());
      vi.useRealTimers();
    });
  });
});
