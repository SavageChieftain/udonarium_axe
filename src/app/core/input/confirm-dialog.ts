/**
 * window.confirm の薄いラッパ。domain 層から DOM API を直接呼ばないために挟む。
 * Spec ではこの関数を vi.spyOn でモックする。
 */
export const confirmDialog = (message: string): boolean => window.confirm(message);
