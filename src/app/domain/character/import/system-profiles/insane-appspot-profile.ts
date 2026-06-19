import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildPsychoFictionCharacter,
  isPsychoFictionAppspotCharacter,
  PsychoFictionConfig,
} from '@axe/domain/character/import/system-profiles/psychofiction-appspot';

// インセインの特技表（6分野×11行）。bcdice Insane の SaiFicSkillTable（i18n Insane.RTT）と同一。
// appspot の skills.row{r}.check{c} / learned[].id="skills.row{r}.name{c}" の (列c, 行r) と一致する。
const INSANE_CONFIG: PsychoFictionConfig = {
  dicebot: 'Insane',
  categories: ['暴力', '情動', '知覚', '技術', '知識', '怪異'],
  skillsByCategory: [
    ['焼却', '拷問', '緊縛', '脅す', '破壊', '殴打', '切断', '刺す', '射撃', '戦争', '埋葬'],
    ['恋', '悦び', '憂い', '恥じらい', '笑い', '我慢', '驚き', '怒り', '恨み', '哀しみ', '愛'],
    ['痛み', '官能', '手触り', 'におい', '味', '物音', '情景', '追跡', '芸術', '第六感', '物陰'],
    ['分解', '電子機器', '整理', '薬品', '効率', 'メディア', 'カメラ', '乗物', '機械', '罠', '兵器'],
    ['物理学', '数学', '化学', '生物学', '医学', '教養', '人類学', '歴史', '民俗学', '考古学', '天文学'],
    ['時間', '混沌', '深海', '死', '霊魂', '魔術', '暗黒', '終末', '夢', '地底', '宇宙'],
  ],
  abilityKey: 'ability',
  abilitySectionLabel: 'アビリティ',
  abilityFields: [
    { key: 'type', label: '種別' },
    { key: 'targetSkill', label: '指定特技' },
    { key: 'effect', label: '効果' },
    { key: 'page', label: 'ページ' },
  ],
  profileFields: [
    { key: 'cover', label: 'カバー' },
    { key: 'age', label: '年齢' },
    { key: 'sex', label: '性別' },
    { key: 'curiosity', label: '好奇心' },
    { key: 'exp', label: '功績点' },
    { key: 'player', label: 'PL' },
  ],
};

export function isInsaneAppspotCharacter(parsed: unknown): boolean {
  return isPsychoFictionAppspotCharacter(parsed, 'ability');
}

export function buildInsaneAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  return buildPsychoFictionCharacter(parsed, INSANE_CONFIG);
}
