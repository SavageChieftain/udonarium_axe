import { Network } from '@axe/class/core/system';

import type { ChatMessage } from './chat-message';
import type { ChatTab } from './chat-tab';

type MessageFormatter = (tabName: string, message: ChatMessage) => string;

export class ChatLogExporter {
  static escapeHtml(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    const escaped = value.replace(/[&'`"<>]/g, (match) => {
      return (
        (
          {
            '&': '&amp;',
            "'": '&#x27;',
            '`': '&#x60;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;',
          } as Record<string, string>
        )[match] ?? match
      );
    });
    return escaped.replace(/[|｜]([^|｜\s]+?)《(.+?)》/g, '<ruby>$1<rt>$2</rt></ruby>').replace(/\s/g, ' ');
  }

  static formatMessageStandard(isTime: boolean, tabName: string, message: ChatMessage): string {
    if (!message) return '';
    let str = '';
    if (tabName) str += `[${ChatLogExporter.escapeHtml(tabName)}]`;

    if (isTime) {
      const date = new Date(message.timestamp);
      str += `${('00' + date.getHours()).slice(-2)}:${('00' + date.getMinutes()).slice(-2)}：`;
    }

    str += "<font color='";
    if (message.messColor) str += message.messColor.toLowerCase();
    str += "'>";

    str += '<b>';
    if (message.name) str += ChatLogExporter.escapeHtml(message.name);
    str += '</b>';

    str += '：';
    if (!message.isSecret || message.isSendFromSelf) {
      if (message.text) str += ChatLogExporter.escapeHtml(message.text).replace(/\n/g, '<br>');
    } else {
      str += '（シークレットダイス）';
    }
    if (message.fixd) str += ' (編集済)';
    str += '</font><br>';
    str += '\n';
    return str;
  }

  static formatMessageCoc(tabName: string, message: ChatMessage): string {
    if (!message) return '';
    let str = '';
    str += `    <p style="color:${message.messColor.toLowerCase()};">\n`;
    str += `      <span> [${tabName}]</span>\n`;
    str += `      <span>${ChatLogExporter.escapeHtml(message.name ?? '')
      .replace('<', '')
      .replace('>', '')}</span>\n`;
    str += '      <span>\n';
    str += '        ';

    if (!message.isSecret || message.isSendFromSelf) {
      if (message.text) str += ChatLogExporter.escapeHtml(message.text).replace(/\n/g, '<br>').replace(/→/g, '＞');
    } else {
      str += '（シークレットダイス）';
    }
    if (message.fixd) str += ' (編集済)';
    str += '\n';

    str += '      </span>\n';
    str += '    </p>\n';
    str += '    \n';
    return str;
  }

  static exportTabHtml(tab: ChatTab): string {
    const head = `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml' lang='ja'>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
    <title>チャットログ：${ChatLogExporter.escapeHtml(tab.name)}</title>
  </head>
  <body>
`;
    let main = '';
    for (const mess of tab.chatMessages) {
      if (!ChatLogExporter.isVisibleMessage(mess)) continue;
      main += ChatLogExporter.formatMessageStandard(true, '', mess);
    }
    return head + main + '\n  </body>\n</html>';
  }

  static exportTabHtmlCoc(tab: ChatTab): string {
    const head = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Udonalium Axe - logs</title>
  </head>
  <body>

`;
    let main = '';
    for (const mess of tab.chatMessages) {
      if (!ChatLogExporter.isVisibleMessage(mess)) continue;
      main += ChatLogExporter.formatMessageCoc(ChatLogExporter.escapeHtml(tab.name), mess);
    }
    return head + main + '  </body>\n</html>';
  }

  static exportAllTabsHtml(tabs: ChatTab[], showTime: number | boolean): string {
    const head = `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml' lang='ja'>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
    <title>チャットログ：全タブ</title>
  </head>
  <body>
`;
    const main = ChatLogExporter.mergeTabMessages(tabs, (tabName, message) =>
      ChatLogExporter.formatMessageStandard(!!showTime, tabName, message)
    );
    return head + main + '\n  </body>\n</html>';
  }

  static exportAllTabsHtmlCoc(tabs: ChatTab[]): string {
    const head = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Udonalium Axe - logs</title>
  </head>
  <body>

`;
    const main = ChatLogExporter.mergeTabMessages(tabs, ChatLogExporter.formatMessageCoc);
    return head + main + '  </body>\n</html>';
  }

  private static isVisibleMessage(message: ChatMessage): boolean {
    const to = message.to;
    if (!to) return true;
    const from = message.from;
    const myId = Network.peerContext.userId;
    return to === myId || from === myId;
  }

  private static mergeTabMessages(tabs: ChatTab[], formatter: MessageFormatter): string {
    if (!tabs || tabs.length === 0) return '';
    const tabNum = tabs.length;
    const indexList = new Array<number>(tabNum).fill(0);
    let main = '';

    while (true) {
      let fastTabIndex = -1;
      let earliestTimestamp = -1;

      for (let i = 0; i < tabNum; i++) {
        if (tabs[i].chatMessages.length <= indexList[i]) continue;
        const ts = tabs[i].chatMessages[indexList[i]].timestamp;
        if (earliestTimestamp === -1 || ts < earliestTimestamp) {
          earliestTimestamp = ts;
          fastTabIndex = i;
        }
      }
      if (fastTabIndex === -1) break;

      const message = tabs[fastTabIndex].chatMessages[indexList[fastTabIndex]];
      if (ChatLogExporter.isVisibleMessage(message)) {
        main += formatter(tabs[fastTabIndex].name, message);
      }
      indexList[fastTabIndex]++;
    }
    return main;
  }
}
