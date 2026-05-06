import { ChatLogExporter } from '@axe/domain/chat/chat-log-exporter';
import type { ChatMessage } from '@axe/domain/chat/chat-message';
import type { ChatTab } from '@axe/domain/chat/chat-tab';

function createMockMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    name: 'テストユーザー',
    text: 'テストメッセージ',
    messColor: '#000000',
    timestamp: 1000,
    from: 'user-1',
    to: '',
    fixd: false,
    isSecret: false,
    isSendFromSelf: true,
    isDisplayable: true,
    isSentBy: (userId: string) => overrides.from === userId || overrides.originFrom === userId,
    ...overrides,
  } as unknown as ChatMessage;
}

function createMockTab(name: string, messages: ChatMessage[]): ChatTab {
  return {
    name,
    chatMessages: messages,
  } as unknown as ChatTab;
}

describe('ChatLogExporter', () => {
  describe('escapeHtml', () => {
    it('HTMLの特殊文字をエスケープする', () => {
      expect(ChatLogExporter.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('&をエスケープする', () => {
      expect(ChatLogExporter.escapeHtml('A&B')).toBe('A&amp;B');
    });

    it('シングルクォートをエスケープする', () => {
      expect(ChatLogExporter.escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('バッククォートをエスケープする', () => {
      expect(ChatLogExporter.escapeHtml('`code`')).toBe('&#x60;code&#x60;');
    });

    it('ルビ記法を<ruby>タグに変換する', () => {
      const result = ChatLogExporter.escapeHtml('|漢字《かんじ》');
      expect(result).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
    });

    it('全角パイプのルビ記法も変換する', () => {
      const result = ChatLogExporter.escapeHtml('｜熟語《じゅくご》');
      expect(result).toContain('<ruby>熟語<rt>じゅくご</rt></ruby>');
    });

    it('非文字列はStringに変換する', () => {
      expect(ChatLogExporter.escapeHtml(42)).toBe('42');
      expect(ChatLogExporter.escapeHtml(null)).toBe('null');
      expect(ChatLogExporter.escapeHtml(undefined)).toBe('undefined');
    });

    it('改行やタブを半角スペースに正規化する', () => {
      const result = ChatLogExporter.escapeHtml('A\tB\nC');
      expect(result).toBe('A B C');
    });
  });

  describe('formatMessageStandard', () => {
    it('基本的なメッセージをHTML形式に変換する', () => {
      const msg = createMockMessage({ name: '勇者', text: 'こんにちは', messColor: '#ff0000' });
      const result = ChatLogExporter.formatMessageStandard(false, '', msg);

      expect(result).toContain('#ff0000');
      expect(result).toContain('<b>勇者</b>');
      expect(result).toContain('こんにちは');
    });

    it('タブ名がある場合は先頭に付加する', () => {
      const msg = createMockMessage();
      const result = ChatLogExporter.formatMessageStandard(false, 'メインタブ', msg);

      expect(result).toContain('[メインタブ]');
    });

    it('時間表示がtrueの場合はHH:MMを出力する', () => {
      const ts = new Date(2024, 0, 1, 14, 30).getTime();
      const msg = createMockMessage({ timestamp: ts });
      const result = ChatLogExporter.formatMessageStandard(true, '', msg);

      expect(result).toContain('14:30');
    });

    it('シークレットメッセージで送信者本人でない場合は隠す', () => {
      const msg = createMockMessage({
        isSecret: true,
        isSendFromSelf: false,
        text: '秘密のメッセージ',
        from: 'other-user',
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageStandard(false, '', msg);

      expect(result).not.toContain('秘密のメッセージ');
      expect(result).toContain('シークレットダイス');
    });

    it('シークレットメッセージでもuserIdが送信者なら見える', () => {
      const msg = createMockMessage({
        isSecret: true,
        from: 'user-A',
        text: '秘密のメッセージ',
        isSentBy: (id: string) => id === 'user-A',
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageStandard(false, '', msg, 'user-A');

      expect(result).toContain('秘密のメッセージ');
    });

    it('fixdがtrueの場合は「(編集済)」を表示する', () => {
      const msg = createMockMessage({ fixd: true });
      const result = ChatLogExporter.formatMessageStandard(false, '', msg);

      expect(result).toContain('(編集済)');
    });

    it('本文添付画像をHTML画像として出力する', () => {
      const msg = createMockMessage({
        attachmentImages: [
          {
            identifier: 'image-1',
            name: 'stamp.png',
            url: 'blob:stamp-image',
          },
        ],
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageStandard(
        false,
        '',
        msg,
        undefined,
        () => 'data:image/png;base64,AAAA'
      );

      expect(result).toContain('<img');
      expect(result).toContain('src="data:image/png;base64,AAAA"');
      expect(result).toContain('alt="stamp.png"');
    });

    it('本文添付画像のHTML属性ではルビ変換を行わず属性エスケープする', () => {
      const msg = createMockMessage({
        attachmentImages: [
          {
            identifier: 'image-1',
            name: '|画像《がぞう》',
            url: 'https://example.test/stamp.png?x=1&y=2',
          },
        ],
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageStandard(false, '', msg);

      expect(result).toContain('src="https://example.test/stamp.png?x=1&amp;y=2"');
      expect(result).toContain('alt="|画像《がぞう》"');
      expect(result).not.toContain('<ruby>画像');
    });

    it('見えないシークレットメッセージでは本文添付画像を出力しない', () => {
      const msg = createMockMessage({
        isSecret: true,
        isSendFromSelf: false,
        from: 'other-user',
        attachmentImages: [
          {
            identifier: 'secret-image',
            name: 'secret.png',
            url: 'data:image/png;base64,SECRET',
          },
        ],
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageStandard(false, '', msg);

      expect(result).not.toContain('<img');
      expect(result).not.toContain('secret.png');
      expect(result).toContain('シークレットダイス');
    });

    it('nullメッセージでは空文字を返す', () => {
      expect(ChatLogExporter.formatMessageStandard(false, '', null!)).toBe('');
    });
  });

  describe('formatMessageCoc', () => {
    it('CoC形式でメッセージをHTML出力する', () => {
      const msg = createMockMessage({ name: '探索者', text: '目星チェック', messColor: '#0000ff' });
      const result = ChatLogExporter.formatMessageCoc('メインタブ', msg);

      expect(result).toContain('color:#0000ff');
      expect(result).toContain('探索者');
      expect(result).toContain('目星チェック');
      expect(result).toContain('[メインタブ]');
    });

    it('CoC形式でも本文添付画像をHTML画像として出力する', () => {
      const msg = createMockMessage({
        name: '探索者',
        text: '参考画像',
        attachmentImages: [
          {
            identifier: 'image-1',
            name: 'stamp.png',
            url: 'blob:stamp-image',
          },
        ],
      } as Partial<ChatMessage>);
      const result = ChatLogExporter.formatMessageCoc('メインタブ', msg, undefined, () => 'data:image/png;base64,BBBB');

      expect(result).toContain('<img');
      expect(result).toContain('src="data:image/png;base64,BBBB"');
      expect(result).toContain('alt="stamp.png"');
    });

    it('nullメッセージでは空文字を返す', () => {
      expect(ChatLogExporter.formatMessageCoc('', null!)).toBe('');
    });
  });

  describe('isVisibleMessage', () => {
    it('toが空であれば常にtrue', () => {
      const msg = createMockMessage({ to: '' });
      expect(ChatLogExporter.isVisibleMessage(msg)).toBe(true);
    });

    it('toがnullやundefinedであればtrue', () => {
      const msg = createMockMessage({ to: null! });
      expect(ChatLogExporter.isVisibleMessage(msg)).toBe(true);
    });

    it('toがありuserIdが指定されて送り先に含まれる場合はtrue', () => {
      const msg = createMockMessage({ to: 'user-A', from: 'user-B' });
      expect(ChatLogExporter.isVisibleMessage(msg, 'user-A')).toBe(true);
    });

    it('toがありuserIdが送信者の場合はtrue', () => {
      const msg = createMockMessage({ to: 'user-B', from: 'user-A' });
      expect(ChatLogExporter.isVisibleMessage(msg, 'user-A')).toBe(true);
    });
  });

  describe('exportTabHtml', () => {
    it('XHTML形式のログを出力する', () => {
      const msg = createMockMessage({ name: 'GM', text: '開始' });
      const tab = createMockTab('メイン', [msg]);
      const result = ChatLogExporter.exportTabHtml(tab);

      expect(result).toContain("<?xml version='1.0'");
      expect(result).toContain('チャットログ：メイン');
      expect(result).toContain('GM');
      expect(result).toContain('開始');
      expect(result).toContain('</html>');
    });
  });

  describe('exportTabHtmlCoc', () => {
    it('CoC形式のHTMLログを出力する', () => {
      const msg = createMockMessage({ name: '探索者', text: 'SAN値チェック' });
      const tab = createMockTab('セッション', [msg]);
      const result = ChatLogExporter.exportTabHtmlCoc(tab);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Udonalium Axe - logs');
      expect(result).toContain('探索者');
      expect(result).toContain('SAN値チェック');
    });
  });

  describe('exportAllTabsHtml', () => {
    it('複数タブのメッセージをタイムスタンプ順にマージする', () => {
      const tab1 = createMockTab('タブ1', [
        createMockMessage({ name: 'A', text: '1番目', timestamp: 100 }),
        createMockMessage({ name: 'A', text: '3番目', timestamp: 300 }),
      ]);
      const tab2 = createMockTab('タブ2', [createMockMessage({ name: 'B', text: '2番目', timestamp: 200 })]);

      const result = ChatLogExporter.exportAllTabsHtml([tab1, tab2], true);

      const pos1 = result.indexOf('1番目');
      const pos2 = result.indexOf('2番目');
      const pos3 = result.indexOf('3番目');
      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
    });

    it('空のタブ配列では空のbodyを返す', () => {
      const result = ChatLogExporter.exportAllTabsHtml([], false);
      expect(result).toContain('<body>');
      expect(result).toContain('</body>');
    });
  });

  describe('exportAllTabsHtmlCoc', () => {
    it('CoC形式で全タブをマージ出力する', () => {
      const tab = createMockTab('セッション', [createMockMessage({ name: 'KP', text: 'テスト', timestamp: 100 })]);
      const result = ChatLogExporter.exportAllTabsHtmlCoc([tab]);

      expect(result).toContain('Udonalium Axe - logs');
      expect(result).toContain('KP');
    });
  });
});
