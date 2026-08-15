/**
 * The systems each service hosts, which is what the import panel and the manual show.
 * A verified system has a profile of its own here, which reads its abilities, skills and tables properly.
 * The rest come in through the general path, which keeps the name, the main fields and the structure of the data.
 * The list is taken from the public pages of each service. They are proper names, and are not translated.
 */
export interface ImportSystem {
  /** The identifier the service uses for the system. Omitted where a service has none. */
  id?: string;
  name: string;
  /** A system with a profile of its own here. */
  verified?: boolean;
}

/** The better-known services that put out the format of the other tool. They are named by what they produce rather than by system. */
export const CCFOLIA_SOURCE_SERVICES: ImportSystem[] = [
  { name: 'いあきゃら（クトゥルフ）' },
  { name: 'Charaeno（クトゥルフ 6/7版）' },
  { name: 'ゆとシート（各種）' },
  { name: 'TRPGスタジオ（各種）' },
  { name: 'CharaXiv（クトゥルフ・エモクロア）' },
  { name: 'その他「ココフォリア用コピー」対応サービス' },
];

/** The systems supported at the sheet archive. */
export const CHARASHEET_SYSTEMS: ImportSystem[] = [
  { id: 'cthulhu', name: 'クトゥルフ神話TRPG（6版）', verified: true },
  { id: 'coc7', name: '新クトゥルフ神話TRPG（7版）', verified: true },
  { id: 'swordworld2', name: 'ソード・ワールド2.0', verified: true },
  { id: 'swordworld', name: 'ソード・ワールド', verified: true },
  { id: 'dx3', name: 'ダブルクロス３', verified: true },
  { id: 'ara2', name: 'アリアンロッド2e', verified: true },
  { id: 'gracre', name: 'グランクレスト', verified: true },
  { id: 'araguild', name: 'アリアンロッド（ギルド）' },
  { id: 'gracreland', name: 'グランクレスト（国）' },
  { id: 'parabla', name: 'パラサイトブラッド', verified: true },
  { id: 'gobusla', name: 'ゴブスレTRPG' },
  { id: 'pugmire', name: 'パグマイア' },
  { id: 'gorder', name: 'ガーデンオーダー', verified: true },
  { id: 'nw3', name: 'ナイトウィザード３', verified: true },
  { id: 'konosuba', name: 'このすばTRPG' },
  { id: 'oct', name: 'オクトパストラベラーTRPG' },
  { id: 'mk', name: '迷宮キングダム', verified: true },
  { id: 'elysion', name: 'エリュシオン', verified: true },
  { id: 'nechro', name: '永い後日談のネクロニカ', verified: true },
  { id: 'yukoya', name: 'ゆうやけこやけ' },
  { id: 'dnd4', name: 'D&D4' },
  { id: 'aeng', name: 'アサルトエンジン' },
  { id: 'sengen', name: '千幻抄', verified: true },
  { id: 'ryutama', name: 'りゅうたま', verified: true },
  { id: 'ryutamad', name: 'りゅうたま（竜人）' },
  { id: 'horabre', name: 'ホライゾンブレイク' },
  { id: 'horabrevsp', name: 'ホライゾンブレイク（VSP）' },
  { id: 'nheaven', name: 'ナイトメアヘヴン' },
  { id: 'utakaze', name: 'ウタカゼ', verified: true },
  { id: 'utakazecal', name: 'ウタカゼ（キャラバン）' },
  { id: 'parats', name: 'パラノイア トラブルシューターズ' },
  { id: 'kmgkr', name: '神我狩' },
];

/** The systems supported at the sheet warehouse. */
export const APPSPOT_SYSTEMS: ImportSystem[] = [
  { id: 'dx3', name: 'ダブルクロス The 3rd Edition', verified: true },
  { id: 'shinobigami', name: 'シノビガミ', verified: true },
  { id: 'insane', name: 'インセイン', verified: true },
  { id: 'helltv', name: 'キルデスビジネス', verified: true },
  { id: 'hm', name: 'ハンターズ・ムーン', verified: true },
  { id: 'blcr', name: 'ブラッド・クルセイド', verified: true },
  { id: 'bloodmoon', name: 'ブラッドムーン', verified: true },
  { id: 'stratoshout', name: 'ストラトシャウト', verified: true },
  { id: 'cardranker', name: 'カードランカー', verified: true },
  { id: 'ddd', name: 'ダークデイズドライブ', verified: true },
  { id: 'yy', name: 'ヤンキー＆ヨグ＝ソトース', verified: true },
  { id: 'starrydolls', name: 'スタリィドール', verified: true },
  { id: 'stellar', name: '銀剣のステラナイツ', verified: true },
  { id: 'bbt', name: 'ビーストバインド トリニティ', verified: true },
  { id: 'mglg', name: 'マギカロギア' },
  { id: 'kancolle', name: '艦これRPG', verified: true },
  { id: 'pkboo', name: 'ピーカーブー' },
  { id: 'begidol', name: 'ビギニングアイドル' },
  { id: 'smbl', name: 'サムライブレイドTRPG' },
  { id: 'al2', name: 'アルシャードセイヴァー' },
  { id: 'tenka', name: '天下繚乱' },
  { id: 'tgs', name: 'トワイライトガンスモーク' },
  { id: 'mgr', name: 'メタリックガーディアン' },
  { id: 'mnt', name: 'モノトーンミュージアム' },
  { id: 'mar', name: 'マージナルヒーローズ' },
  { id: 'kenzen', name: '拳禅無双' },
  { id: 'lostroyal', name: 'ロストロイヤル' },
  { id: 'owh', name: '片道勇者TRPG' },
  { id: 'satasupe', name: 'サタスペ' },
  { id: 'amadeus', name: 'アマデウス' },
  { id: 'cocorod', name: 'ココロダンジョン' },
  { id: 'krcry', name: 'クラヤミクライン' },
  { id: 'tiw', name: '獸ノ森' },
  { id: '2s', name: 'フタリソウサ' },
  { id: 'lostrecord', name: 'ロストレコード' },
  { id: 'ainecadette', name: 'エネカデット' },
  { id: 'skynauts2', name: '歯車の塔の探空士（2）' },
  { id: 'bakenokawa', name: 'バケノカワ' },
  { id: 'demonspike', name: 'デモンスパイク' },
  { id: 'tensaigunshi', name: '天才軍師になろう' },
  { id: 'neginegi', name: 'ネジクレネジマキ' },
  { id: 'mura', name: 'なにもない村' },
  { id: 'bluebeatdown', name: 'ブルービートダウン' },
  { id: 'boa3', name: 'ブレイド・オブ・アルカナ 3rd' },
  { id: 'boare', name: 'ブレイド・オブ・アルカナ リインカーネーション' },
  { id: 'boa', name: 'ブレイド・オブ・アルカナ' },
  { id: 'tnd', name: 'トーキョーN◎VA The Detonation' },
  { id: 'tnx', name: 'トーキョーN◎VA THE AXLERATION' },
  { id: 'tnm', name: 'トーキョー・ナイトメア' },
  { id: 'animaanimus', name: 'アニマアニムス' },
  { id: 'lrq', name: 'ラストレクイエム' },
  { id: 'dgp', name: 'デスゲームパラダイス' },
  { id: 'gehenna', name: 'ゲヘナ アナスタシス' },
  { id: 'dracurouge', name: 'ドラクルージュ' },
  { id: 'colossalhunter', name: 'コロッサルハンター' },
  { id: 'nuekagami', name: '平安幻想夜話 鵺鏡' },
  { id: 'skynauts', name: '歯車の塔の探空士' },
  { id: 'avandner', name: '黒絢のアヴァンドナー' },
  { id: 'tsb2', name: 'TSB2.0RPG' },
  { id: 'dlh', name: 'デッドラインヒーローズ' },
  { id: 'blmythos', name: 'ブラインド・ミトスRPG' },
  { id: 'divinecharger', name: 'ディヴァインチャージャー' },
  { id: 'nerenai', name: 'ネバー・レイト・ナイターズ' },
  { id: 'bloodpath', name: 'ブラッドパス' },
  { id: 'steampunk', name: 'スチームパンカーズ' },
  { id: 'juin', name: '呪印感染' },
  { id: 'unsung', name: 'アンサング・デュエット' },
  { id: 'yu_myo_kishi', name: '幽冥鬼使' },
  { id: 'shuumatsukikou', name: '終末紀行RPG' },
  { id: 'ac6', name: 'ARMORED CORE VI（TRPG）' },
  { id: 'monobeast', name: 'モノビースト' },
];

/** One service, through a copy in the other tool's format. */
export const CHARAXIV_SYSTEMS: ImportSystem[] = [
  { name: 'クトゥルフ神話TRPG 第6版' },
  { name: '新クトゥルフ神話TRPG 第7版' },
  { name: 'エモクロアTRPG' },
];
