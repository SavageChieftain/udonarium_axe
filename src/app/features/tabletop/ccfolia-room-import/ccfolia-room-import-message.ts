import { CcfoliaRoomImportSummary } from '@axe/application/tabletop/ccfolia-room-import.service';

const PREFIX = 'feature.tabletop.ccfoliaImport.';

export interface RoomImportMessage {
  key: string;
  params: Record<string, unknown>;
}

/**
 * 取り込み結果を、チャットへ流すシステムメッセージの並びへ変換する。
 * 取りこぼした要素は種別ごとに 1 行ずつ出し、何が来なかったかを利用者が数で把握できるようにする。
 */
export function buildRoomImportMessages(summary: CcfoliaRoomImportSummary): RoomImportMessage[] {
  const messages: RoomImportMessage[] = [
    {
      key: `${PREFIX}imported`,
      params: {
        table: summary.tableName,
        tables: summary.tableCount,
        panels: summary.panelCount,
        pieces: summary.pieceCount,
      },
    },
  ];

  if (summary.hiddenPanelCount > 0) {
    messages.push({ key: `${PREFIX}hiddenPanels`, params: { count: summary.hiddenPanelCount } });
  }
  if (summary.missingImageCount > 0) {
    messages.push({ key: `${PREFIX}missingImages`, params: { count: summary.missingImageCount } });
  }
  if (summary.skipped.panels > 0) {
    messages.push({ key: `${PREFIX}skippedPanels`, params: { count: summary.skipped.panels } });
  }
  if (summary.skipped.decks > 0) {
    messages.push({ key: `${PREFIX}skippedDecks`, params: { count: summary.skipped.decks } });
  }
  if (summary.skipped.effects > 0) {
    messages.push({ key: `${PREFIX}skippedEffects`, params: { count: summary.skipped.effects } });
  }

  messages.push({ key: `${PREFIX}bgmNotice`, params: {} });
  return messages;
}
