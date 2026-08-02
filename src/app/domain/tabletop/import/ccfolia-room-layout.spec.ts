import {
  pieceUnitToTablePosition,
  resolveFieldSize,
  roomCellToTablePosition,
} from '@axe/domain/tabletop/import/ccfolia-room-layout';

const geometry = { fieldWidth: 20, fieldHeight: 10, gridSize: 50 };

describe('roomCellToTablePosition', () => {
  it('盤面中央の原点をテーブル左上の原点へ移す', () => {
    expect(roomCellToTablePosition(0, 0, geometry)).toEqual({ x: 500, y: 250 });
  });

  it('負のマス座標をテーブル左上寄りへ写す', () => {
    expect(roomCellToTablePosition(-10, -5, geometry)).toEqual({ x: 0, y: 0 });
  });

  it('正のマス座標をテーブル右下寄りへ写す', () => {
    expect(roomCellToTablePosition(4, 2, geometry)).toEqual({ x: 700, y: 350 });
  });

  it('盤外の座標はテーブルの外側のまま写す', () => {
    expect(roomCellToTablePosition(-14, -9, geometry)).toEqual({ x: -200, y: -200 });
  });
});

describe('pieceUnitToTablePosition', () => {
  it('25 単位を 1 マスとして換算する', () => {
    expect(pieceUnitToTablePosition(100, 50, geometry)).toEqual({ x: 700, y: 350 });
  });

  it('原点はマス座標と同じく盤面中央', () => {
    expect(pieceUnitToTablePosition(0, 0, geometry)).toEqual({ x: 500, y: 250 });
  });

  it('マスに乗らない位置も丸めずに写す', () => {
    expect(pieceUnitToTablePosition(-291, 70, geometry)).toEqual({ x: -82, y: 390 });
  });
});

describe('resolveFieldSize', () => {
  it('盤面サイズをそのまま返す', () => {
    expect(resolveFieldSize(67, 37)).toEqual({ width: 67, height: 37 });
  });

  it('欠けている盤面サイズを既定値で補う', () => {
    expect(resolveFieldSize(0, 0)).toEqual({ width: 20, height: 20 });
  });
});
