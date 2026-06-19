import { PsychoFictionConfig } from '@axe/domain/character/import/system-profiles/psychofiction-appspot';

const NINJA_ABILITY_FIELDS = [
  { key: 'type', label: '種別' },
  { key: 'targetSkill', label: '指定特技' },
  { key: 'range', label: '間合' },
  { key: 'cost', label: 'コスト' },
  { key: 'effect', label: '効果' },
  { key: 'page', label: 'ページ' },
];

const COMMON_ABILITY_FIELDS = [
  { key: 'type', label: '種別' },
  { key: 'targetSkill', label: '指定特技' },
  { key: 'level', label: 'レベル' },
  { key: 'cost', label: 'コスト' },
  { key: 'effect', label: '効果' },
  { key: 'page', label: 'ページ' },
];

/**
 * サイコ・フィクション系（冒険企画局）の倉庫 appspot 取り込み設定レジストリ。slug → config。
 * 特技表は各システムの bcdice SaiFicSkillTable（inline / i18n RTT）を権威として転記する。
 * 追加は基本ここへ 1 エントリ足すだけ（特技表＋ability-key＋profileFields）。
 */
export const PF_APPSPOT_SYSTEMS: Record<string, PsychoFictionConfig> = {
  shinobigami: {
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
    abilityFields: NINJA_ABILITY_FIELDS,
    profileFields: [
      { key: 'nameKana', label: 'ふりがな' },
      { key: 'cover', label: '表の顔' },
      { key: 'level', label: '階級' },
      { key: 'exp', label: '功績点' },
      { key: 'age', label: '年齢' },
      { key: 'sex', label: '性別' },
    ],
  },
  insane: {
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
    abilityFields: COMMON_ABILITY_FIELDS,
    profileFields: [
      { key: 'cover', label: 'カバー' },
      { key: 'age', label: '年齢' },
      { key: 'sex', label: '性別' },
      { key: 'curiosity', label: '好奇心' },
      { key: 'exp', label: '功績点' },
      { key: 'player', label: 'PL' },
    ],
  },
  helltv: {
    dicebot: 'KillDeathBusiness',
    categories: ['職業', '動作', '小道具', '衣装', '情動', '願望'],
    skillsByCategory: [
      ['無職', '芸術家', '研究者', '家事手伝い', '学生', '悪漢', '労働者', '探偵', '大物', '医師', '公務員'],
      ['叫ぶ', '閃く', '斬る', '振る', '投げる', '殴る', '蹴る', '跳ぶ', '撃つ', '掴む', '待つ'],
      ['ピアス', '髪飾り', '銃', 'ネックレス', 'ベルト', '眼鏡', '帽子', '時計', '剣', 'リング', 'タトゥー'],
      [
        'ネイキッド',
        'アウトドア',
        'エスニック',
        'ヒップホップ',
        'ミリタリー',
        'フォーマル',
        'トラッド',
        'ゴシック',
        'パンク',
        'メタル',
        'アイドル',
      ],
      ['愛', '喜び', '期待', '焦り', '自負', '怒り', '悲しみ', '嫉妬', '恐怖', '恥', '嫌悪'],
      ['死', '復讐', '勝利', '支配', '獲得', '繁栄', '強化', '安全', '健康', '長寿', '生'],
    ],
    abilityKey: 'ability',
    abilitySectionLabel: 'アビリティ',
    abilityFields: COMMON_ABILITY_FIELDS,
    profileFields: [
      { key: 'battlestyle', label: 'バトルスタイル' },
      { key: 'attribute', label: '属性' },
      { key: 'wish', label: '願望' },
      { key: 'age', label: '年齢' },
      { key: 'sex', label: '性別' },
      { key: 'player', label: 'PL' },
    ],
  },
};
