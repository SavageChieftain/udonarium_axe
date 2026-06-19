import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildPsychoFictionCharacter,
  isPsychoFictionAppspotCharacter,
  PsychoFictionConfig,
} from '@axe/domain/character/import/system-profiles/psychofiction-appspot';

// シノビガミ基本ルールブックの特技表（6分野×11行＝2〜12）。bcdice ShinobiGami の SaiFicSkillTable と同一。
// appspot の skills.row{r}.check{c} / learned[].id="skills.row{r}.name{c}" の (列c, 行r) と一致する。
const SHINOBIGAMI_CONFIG: PsychoFictionConfig = {
  dicebot: 'ShinobiGami',
  categories: ['器術', '体術', '忍術', '謀術', '戦術', '妖術'],
  skillsByCategory: [
    ['絡繰術', '火術', '水術', '針術', '仕込み', '衣装術', '縄術', '登術', '拷問術', '壊器術', '掘削術'],
    ['騎乗術', '砲術', '手裏剣術', '手練', '身体操術', '歩法', '走法', '飛術', '骨法術', '刀術', '怪力'],
    ['生存術', '潜伏術', '遁走術', '盗聴術', '腹話術', '隠形術', '変装術', '香術', '分身の術', '隠蔽術', '第六感'],
    ['医術', '毒術', '罠術', '調査術', '詐術', '対人術', '遊芸', '九ノ一の術', '傀儡の術', '流言の術', '経済力'],
    ['兵糧術', '鳥獣術', '野戦術', '地の利', '意気', '用兵術', '記憶術', '見敵術', '暗号術', '伝達術', '人脈'],
    ['異形化', '召喚術', '死霊術', '結界術', '封術', '言霊術', '幻術', '瞳術', '千里眼の術', '憑依術', '呪術'],
  ],
  abilityKey: 'ninpou',
  abilitySectionLabel: '忍法',
  abilityFields: [
    { key: 'type', label: '種別' },
    { key: 'targetSkill', label: '指定特技' },
    { key: 'range', label: '間合' },
    { key: 'cost', label: 'コスト' },
    { key: 'effect', label: '効果' },
    { key: 'page', label: 'ページ' },
  ],
  profileFields: [
    { key: 'nameKana', label: 'ふりがな' },
    { key: 'cover', label: '表の顔' },
    { key: 'level', label: '階級' },
    { key: 'exp', label: '功績点' },
    { key: 'age', label: '年齢' },
    { key: 'sex', label: '性別' },
  ],
};

export function isShinobigamiAppspotCharacter(parsed: unknown): boolean {
  return isPsychoFictionAppspotCharacter(parsed, 'ninpou');
}

export function buildShinobigamiAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  return buildPsychoFictionCharacter(parsed, SHINOBIGAMI_CONFIG);
}
