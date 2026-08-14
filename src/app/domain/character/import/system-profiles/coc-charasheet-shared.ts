import { Column } from '@axe/domain/character/import/system-profiles/charasheet-shared';

export const WEAPON_COLUMNS: Column[] = [
  { key: 'arms_hit', label: '成功率' },
  { key: 'arms_damage', label: 'ダメージ' },
  { key: 'arms_range', label: '射程' },
  { key: 'arms_attack_count', label: '攻撃回数' },
  { key: 'arms_last_shot', label: '装弾数' },
  { key: 'arms_vitality', label: '耐久力' },
  { key: 'arms_sonota', label: 'その他' },
];

export const ITEM_COLUMNS: Column[] = [
  { key: 'item_tanka', label: '単価' },
  { key: 'item_num', label: '個数' },
  { key: 'item_price', label: '価格' },
  { key: 'item_memo', label: 'メモ' },
];
