/**
 * Blob を「ファイルとして保存」ダイアログ経由でダウンロードさせる。
 * <a download> を瞬間的に生成・click して即解放する定型処理を 1 箇所に集約する。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
