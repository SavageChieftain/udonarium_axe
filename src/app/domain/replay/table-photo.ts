/**
 * 卓の記念写真の割り付け。
 *
 * 立ち絵を並べ、部屋の名前と日付を焼き込む。絵の縦横は卓ごとにばらばらなので、
 * 枠は同じ大きさで置き、絵は枠の中に収める（切らない）。
 *
 * ここは寸法だけを決める。絵を読み、描くのは別の層。
 */

export interface TablePhotoMember {
  readonly identifier: string;
  readonly name: string;
  readonly imageIdentifier: string;
}

export interface TablePhotoSize {
  readonly width: number;
  readonly height: number;
}

export interface TablePhotoCell {
  readonly identifier: string;
  readonly name: string;
  readonly imageIdentifier: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TablePhotoLayout {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly columns: number;
  readonly rows: number;
  readonly cells: readonly TablePhotoCell[];
  readonly title: { readonly x: number; readonly y: number; readonly fontSize: number; readonly maxWidth: number };
  readonly subtitle: { readonly x: number; readonly y: number; readonly fontSize: number };
  readonly name: { readonly fontSize: number; readonly height: number };
  readonly radius: number;
  /** 入りきらずに写らなかった人数。黙って切らず、呼ぶ側が知らせるために持つ。 */
  readonly omitted: number;
}

export const TABLE_PHOTO_WIDE: TablePhotoSize = { width: 1920, height: 1080 };

/** これ以上入れると顔が豆粒になる。溢れた分は写さず、何人溢れたかを返す。 */
const MAX_MEMBERS = 24;

const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;

export function buildTablePhotoLayout(
  members: readonly TablePhotoMember[],
  size: TablePhotoSize = TABLE_PHOTO_WIDE
): TablePhotoLayout {
  const scale = Math.min(size.width / REFERENCE_WIDTH, size.height / REFERENCE_HEIGHT);
  const at = (value: number): number => Math.round(value * scale);

  const shown = members.slice(0, MAX_MEMBERS);
  const margin = at(72);
  const headerHeight = at(150);
  const gap = at(24);
  const nameHeight = at(44);

  const columns = columnsFor(shown.length);
  const rows = columns > 0 ? Math.ceil(shown.length / columns) : 0;

  const fieldWidth = size.width - margin * 2;
  const fieldHeight = size.height - headerHeight - margin;
  const cellWidth = columns > 0 ? (fieldWidth - gap * (columns - 1)) / columns : 0;
  const cellHeight = rows > 0 ? (fieldHeight - gap * (rows - 1)) / rows : 0;

  const cells: TablePhotoCell[] = shown.map((member, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    // 最後の行が欠けたときは、その行だけ中央へ寄せる。端に寄ったままだと写真に見えない。
    const inRow = Math.min(columns, shown.length - row * columns);
    const rowWidth = inRow * cellWidth + (inRow - 1) * gap;
    const left = margin + (fieldWidth - rowWidth) / 2;

    return {
      identifier: member.identifier,
      name: member.name,
      imageIdentifier: member.imageIdentifier,
      x: Math.round(left + column * (cellWidth + gap)),
      y: Math.round(headerHeight + row * (cellHeight + gap)),
      width: Math.round(cellWidth),
      height: Math.round(cellHeight),
    };
  });

  return {
    width: size.width,
    height: size.height,
    scale,
    columns,
    rows,
    cells,
    title: { x: margin, y: at(84), fontSize: at(52), maxWidth: size.width - margin * 2 },
    subtitle: { x: margin, y: at(124), fontSize: at(30) },
    name: { fontSize: at(28), height: nameHeight },
    radius: at(18),
    omitted: members.length - shown.length,
  };
}

/** 横並びの数。正方形に近い並びにしつつ、1 人でも間延びしないように上限を置く。 */
function columnsFor(count: number): number {
  if (count < 1) return 0;
  if (count <= 3) return count;
  if (count <= 8) return Math.ceil(count / 2);
  return Math.ceil(Math.sqrt(count));
}
