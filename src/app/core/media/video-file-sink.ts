import { Logger } from '@axe/core/logging/logger';

/**
 * 書き出し先のファイル。
 *
 * メモリに全部を貯めると、長い動画がそのまま上限になる。書き込み先を先に開いて
 * そこへ流し込めば、長さを決めるのは空き容量だけになる。
 */

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

type SaveFilePicker = (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;

function picker(): SaveFilePicker | null {
  const candidate = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  return typeof candidate === 'function' ? candidate : null;
}

export function isVideoFileSinkSupported(): boolean {
  return picker() != null;
}

/**
 * 保存先を尋ねる。**押した流れの中で呼ぶこと** — ブラウザは操作の直後しか
 * ダイアログを開かせない。断られたら null を返し、呼び出し側はメモリ経由で書き出す。
 */
export async function askVideoFile(fileName: string): Promise<FileSystemFileHandle | null> {
  const open = picker();
  if (!open) return null;

  try {
    return await open({
      suggestedName: fileName,
      types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }],
    });
  } catch (reason) {
    // 取り消しは失敗ではない。
    if (reason instanceof DOMException && reason.name === 'AbortError') return null;
    Logger.warn('[VideoFileSink] 保存先を開けませんでした', reason);
    return null;
  }
}
