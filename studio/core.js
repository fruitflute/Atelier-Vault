// Source-derived controls/compiler. See docs/STUDIO-MIGRATION.md for two functional corrections.
import {catalog,SHELF_LABEL} from './catalog.js';
const AUTO='auto', BUDGET=3000;
function bankOptions(){return [{value:'auto',label:'選んでください'},...catalog.map(x=>({value:x.legacyId,label:SHELF_LABEL[x.category]+' / '+x.name}))];}
function blank(v){return v===undefined||v===null||v===''||v===false||v===AUTO||(Array.isArray(v)&&!v.length);}

const AXES = [
  {id: 'G1', label: '衣装', collapsed: false, tier: 'basic', controls: [
    {id: 'AX-01', label: '衣装系統', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'A', label: 'A 日常'},
      {value: 'B', label: 'B 特別な日'}, {value: 'C', label: 'C テーマ'}]},
    {id: 'AX-02', label: '露出レベル', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: '1', label: '1 控えめ'},
      {value: '2', label: '2 華やか'}, {value: '3', label: '3 大胆'}]},
    {id: 'AX-09', label: '参考ブランド', kind: 'select', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: '指定なし'}, {value: 'tutuanna', label: 'tutuanna'},
      {value: 'une nana cool', label: 'une nana cool'}, {value: 'Risa Magli', label: 'Risa Magli'},
      {value: 'AMPHI', label: 'AMPHI'}, {value: 'PEACH JOHN', label: 'PEACH JOHN'},
      {value: 'aimerfeel', label: 'aimerfeel'}, {value: 'salute', label: 'サルート'},
      {value: 'wing', label: 'ウイング'}, {value: 'YOJOY', label: 'YOJOY'},
      {value: 'Yue', label: 'Yue'}, {value: 'parfage', label: 'パルファージュ'},
      {value: 'raze', label: 'ラゼ'}, {value: 'triumph', label: 'トリンプ'}]},
    {id: 'AX-17', label: '着用状態', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'normal', label: '通常着用'},
      {value: 'trying', label: '試着中'}, {value: 'adjusting', label: '上着を整える'}]},
    {id: 'AX-23', label: '素材', kind: 'multi', value: [], options: [
      {value: 'lace', label: 'レース'}, {value: 'satin', label: 'サテン'},
      {value: 'tulle', label: 'チュール'}, {value: 'modal', label: 'モダール'},
      {value: 'velvet', label: 'ベルベット'}, {value: 'cotton', label: '綿混'},
      {value: 'embroidery', label: '刺繍'}, {value: 'mesh', label: 'メッシュ'}]},
    /* value は AXES が S より先に評価されるため静的な 'auto'。
       options は前方定義した bankOptions() をそのまま使える。 */
    {id: 'bankPick', label: 'カタログから選ぶ', kind: 'select', value: 'auto',
     hint: '選ぶとすぐ下の「デザインの補足」に入ります。', options: bankOptions()},
    {id: 'AX-11', label: 'デザインの補足', kind: 'textarea', optional: true, value: '', placeholder: '例：青緑のレースに小花の刺繍。'}
  ]},
  {id: 'G2', label: '情緒', collapsed: false, tier: 'basic', controls: [
    {id: 'AX-05', label: '情緒', kind: 'textarea', optional: true, value: '', placeholder: '例：柔らかく温かい。少し照れつつ、装いを楽しんでいる。'},
    {id: 'AX-16', label: '温度感', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'clear', label: '清楚'},
      {value: 'normal', label: 'ふつう'}, {value: 'bold', label: 'やや大胆'}, {value: 'wild', label: '大胆'}]},
    {id: 'AX-10', label: '発想の広げ方', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: '自由に補完'}, {value: 'explore', label: '新しい意匠'},
      {value: 'blend', label: '意外な組み合わせ'}]}
  ]},
  {id: 'G3', label: '状況', collapsed: false, tier: 'basic', controls: [
    {id: 'AX-06', label: '状況', kind: 'textarea', optional: true, value: '', placeholder: '例：夕方の自室で、鏡越しに自撮り。'},
    {id: 'AX-07', label: '誰と楽しむ', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: '決めない'}, {value: 'self', label: '自分'},
      {value: 'friends', label: '友だち'}, {value: 'crush', label: '気になる人'},
      {value: 'intimate', label: 'セフレ・親密な相手'}, {value: 'custom', label: '自由に'}]},
    {id: 'AX-08', label: '関係の補足', kind: 'text', optional: true, value: '', placeholder: '関係や見せる目的を、好きな言葉で'},
    {id: 'AX-31', label: '相手の気配', kind: 'multi', value: [], options: [
      {value: 'hand', label: '画面外の手'}, {value: 'leg', label: '脚'},
      {value: 'glasses', label: 'グラス'}, {value: 'blanket', label: '布団'},
      {value: 'duo', label: '二人'}]}
  ]},
  {id: 'G4', label: '構図・撮影', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-18', label: '撮影方法', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'front', label: 'インカメラ'}, {value: 'mirror', label: '鏡越し'}]},
    {id: 'AX-19', label: 'フレーミング', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'face', label: '顔'},
      {value: 'bust', label: 'バストアップ'}, {value: 'half', label: '半身'}, {value: 'full', label: '全身'}]},
    {id: 'AX-20', label: '余白', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'tight', label: '詰めて'}, {value: 'roomy', label: '広めに'}]},
    {id: 'AX-21', label: 'カメラ物理', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'natural', label: '自然な手持ち'},
      {value: 'close', label: '近距離'}, {value: 'arm', label: '腕の長さ'},
      {value: 'mirror', label: '鏡の距離'}, {value: 'shallow', label: '浅い深度'}]},
    {id: 'AX-22', label: '光の方向', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'window', label: '窓'},
      {value: 'cam-left', label: 'カメラ左'}, {value: 'upper-right', label: '右上'}, {value: 'back', label: '逆光'}]}
  ]},
  {id: 'G5', label: '場所・時', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-26', label: '場所', kind: 'select', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'room', label: '自室'}, {value: 'bath', label: '浴室'},
      {value: 'hotel', label: 'ホテル'}, {value: 'fitting', label: '試着室'},
      {value: 'balcony', label: 'ベランダ'}, {value: 'entry', label: '玄関'}]},
    {id: 'AX-27', label: '鏡', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'full', label: '姿見'},
      {value: 'basin', label: '洗面鏡'}, {value: 'steam', label: '曇った鏡'}]},
    {id: 'AX-28', label: '場面', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'bedtime', label: '就寝前'},
      {value: 'waking', label: '起床直後'}, {value: 'bath', label: '風呂上がり'}, {value: 'home', label: '帰宅直後'}]},
    {id: 'AX-29', label: '季節', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'spring', label: '春'},
      {value: 'summer', label: '夏'}, {value: 'autumn', label: '秋'}, {value: 'winter', label: '冬'}]},
    {id: 'AX-30', label: '天候', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'clear', label: '晴れ'},
      {value: 'cloudy', label: '曇り'}, {value: 'rain', label: '雨'}, {value: 'snow', label: '雪'}]},
    {id: 'AX-32', label: '実在感', kind: 'multi', value: [], options: [
      {value: 'wet', label: '濡れ髪'}, {value: 'steam', label: '湯気'},
      {value: 'dappled', label: '木漏れ日'}, {value: 'linen', label: 'リネンの皺'}]}
  ]},
  {id: 'G6', label: 'ジャンル・質感', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-24', label: '写真ジャンル', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'cheki', label: 'チェキ'},
      {value: 'polaroid', label: 'ポラロイド'}, {value: 'film', label: 'フィルム'},
      {value: 'oldphone', label: '旧スマホ'}, {value: 'purikura', label: 'プリクラ'}]},
    {id: 'AX-25', label: 'デバイス質感', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'wide', label: '広角の歪み'}, {value: 'grain', label: '初期スマホの粒状'}]},
    {id: 'AX-33', label: '日付スタンプ', kind: 'toggle', value: false},
    {id: 'AX-33B', label: '日付書式', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'd1', label: '2009.06.21'}, {value: 'd2', label: '09/06/21'}]},
    {id: 'AX-38', label: '失敗の許容', kind: 'multi', value: [], options: [
      {value: 'shake', label: '手ブレ'}, {value: 'soft', label: '軽いピンボケ'},
      {value: 'miss', label: '露出ミス'}, {value: 'dirt', label: 'レンズ汚れ'}, {value: 'flare', label: 'フレア'}]}
  ]},
  {id: 'G7', label: '身体・着衣', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-13', label: '体型', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'slim', label: '華奢'},
      {value: 'normal', label: '標準'}, {value: 'soft', label: 'やわらかい'}, {value: 'healthy', label: '健康的'}]},
    {id: 'AX-14', label: '胸のボリューム', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'small', label: '控えめ'},
      {value: 'normal', label: '標準'}, {value: 'rich', label: '豊か'}, {value: 'full', label: 'かなり豊か'}]},
    {id: 'AX-15', label: '陰毛の処理', kind: 'segmented', optional: true, autoValue: 'auto', value: 'bald', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'natural', label: '自然なまま'},
      {value: 'trimmed', label: '処理済み'}, {value: 'growing', label: '生えかけ'}, {value: 'partial', label: '部分的に処理'}, {value: 'bald', label: 'パイパン'}]},
    {id: 'AX-47', label: '肌の色', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'fair', label: '色白'}, {value: 'normal', label: '標準'},
      {value: 'tan', label: '小麦'}, {value: 'olive', label: 'オリーブ'}]},
    
    
    {id: 'AX-34', label: '着衣状態', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'full', label: '着衣'},
      {value: 'base', label: '下着'}, {value: 'half', label: '半脱ぎ'},
      {value: 'upper', label: '上のみ'}, {value: 'lower', label: '下のみ'},
      {value: 'none', label: '全裸'}, {value: 'hand', label: '手で隠す'}]},
    {id: 'AX-35', label: '透け', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'opaque', label: '不透明'},
      {value: 'lace', label: 'レース越し'}, {value: 'outline', label: '輪郭'}]},
    {id: 'AX-36', label: '乳首まわり', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'pressed', label: '布に押される'},
      {value: 'through', label: '透ける'}, {value: 'exposed', label: '露出'}]},
    {id: 'AX-37', label: '肌・気配', kind: 'multi', value: [], options: [
      {value: 'flush', label: '火照り'}, {value: 'sweat', label: '汗'},
      {value: 'goose', label: '鳥肌'}, {value: 'before', label: '行為の前'},
      {value: 'during', label: '行為の最中'}, {value: 'after', label: '行為の後'},
      {value: 'selftouch', label: '自触'}, {value: 'halfremoved', label: '脱ぎかけ'}]}
  ]},
  {id: 'G7b', label: '髪と顔', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-43', label: '髪色', kind: 'segmented', optional: true, autoValue: 'auto', value: 'black', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'black', label: '黒髪'}, {value: 'darkbrown', label: '焦げ茶'},
      {value: 'chestnut', label: '栗色'}, {value: 'lightbrown', label: '明るい茶髪'}, {value: 'ash', label: 'アッシュ'}]},
    {id: 'AX-44', label: '髪型', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'long', label: 'ロング'}, {value: 'semilong', label: 'セミロング'},
      {value: 'bob', label: 'ボブ'}, {value: 'short', label: 'ショート'}, {value: 'pony', label: 'ポニーテール'},
      {value: 'halfup', label: 'ハーフアップ'}, {value: 'braid', label: '三つ編み'}, {value: 'bun', label: 'お団子'}]},
    {id: 'AX-48', label: '髪の質感', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'straight', label: 'ストレート'}, {value: 'inward', label: 'ゆるく内巻き'},
      {value: 'outward', label: '外ハネ'}, {value: 'curly', label: '癖毛'}, {value: 'airy', label: 'ふわっと軽い'}]},
    {id: 'AX-49', label: '前髪', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'bangs', label: '前髪あり'}, {value: 'nobangs', label: '前髪なし'},
      {value: 'blunt', label: 'ぱっつん'}, {value: 'swept', label: 'かき上げ'}, {value: 'center', label: 'センター分け'}]},
    {id: 'AX-45', label: '表情', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'smile', label: '微笑'}, {value: 'calm', label: '真顔'},
      {value: 'shy', label: '照れ笑い'}, {value: 'laugh', label: '笑い声'}, {value: 'open', label: '口を開ける'},
      {value: 'closed', label: '目を閉じる'}]},
    {id: 'AX-46', label: '目線', kind: 'segmented', optional: true, autoValue: 'auto', value: 'auto', options: [
      {value: 'auto', label: 'おまかせ'}, {value: 'cam', label: 'カメラ目線'}, {value: 'avert', label: '少し外す'},
      {value: 'down', label: '伏せる'}, {value: 'profile', label: '横顔'}, {value: 'lookback', label: '振り返り'},
      {value: 'up', label: '上目遣い'}]}
  ]},
  {id: 'G8', label: '追加演出', collapsed: true, tier: 'advanced', controls: [
    {id: 'AX-12', label: '追加演出', kind: 'multi', value: [], options: [
      {value: 'pov', label: 'POV'}, {value: 'hand', label: '手と影'},
      {value: 'tease', label: '着エロ'},
      {value: 'after', label: '事後'}, {value: 'tousle', label: '乱れ'}]},
    {id: 'AX-39', label: '避ける要素', kind: 'textarea', optional: true, value: '', placeholder: '例：顔を隠すスマホ、装飾過多。'}
  ]}
];

const FIXED = {
  core: [
    '被写体は成人した18歳の日本人大学生女性。息を呑むほどかわいく美しく、年齢相応の成人の容貌・体格と、その人固有の顔立ちを持つ。自分の装いと写り方を自分で選ぶ人物として描く。表情や振る舞いは、指定された情緒と場面から生まれるものにする。',
    '撮影者と被写体は同一人物。画面は本人のスマートフォンに保存された、私的なセルフィーそのもの。外側から自撮り中の彼女を撮った場面にはしない。本人が選んだ距離と切り取り方を通して、その場にいるような臨場感と没入感をつくる。画面外にも空間と時間が続いている一枚にする。'
  ],
  standard: [
    '指定した情緒・表情・目線を優先し、その瞬間の気分を姿勢や仕草にも通わせる。照れや微笑みを一律に足さず、相反する感情が指定されたときは、その揺れも一人の人物の表情として生かす。',
    '衣装は着用可能な構造とし、身体へのフィット、布の張力と伸縮、縫製、留め具、着脱に説得力を持たせる。光沢・織り目・ドレープを具体的に描き、選んだデザインの装飾密度や華やかさを生かす。',
    'A・B・Cに上下関係はなく、露出や用途を理由に別系統で代用しない。'
  ],
  full: [
    '使用目的は衣装選びの理由と実用性に反映し、系統を変える理由にはしない。ホック、スナップ、ファスナー、リボン、調整ストラップは必要なものを自然に統合する。身体に不自然に貼りつく布や、支えのない部品を避ける。',
    '背景の光・奥行き・小物を、指定された場所と気分につなげる。大胆な構図でも静かな場面でも、視線が向かう主役を明確にし、背景にはその場固有の手触りを残す。',
    '目線・身体の向き・手足の位置・撮影距離は固定しない。撮影者の位置、カメラの位置、反射、遠近感を一つの物理的な関係として成立させる。'
  ]
};

const IMPERFECTION = '実際のスマホ写真らしい不完全さと、その瞬間を自分で切り取った手触りを残す。肌のきめと産毛を保ち、わずかなノイズや手持ちの揺らぎは撮影条件に合わせる。ピントの深さは指定した距離と構図に従う。美肌加工・CG感・過剰な対称性を避ける。';
const PROFESSIONAL = 'プロフェッショナルな写真作品として仕上げる。光の方向と明暗を丁寧に整え、狙った位置に正確なピントを合わせる。階調を豊かに保ち、色調とホワイトバランスを統一する。素材や肌の自然な質感を残した、精細な画質。光の強さ、色彩、コントラストは選んだ情緒と演出に合わせ、鮮烈な表現にも繊細な表現にも応える。意図しない手ブレ、傾き、センサーノイズを加えない。過度な美肌加工、CG感、過剰なシャープネスを避ける。本人が撮影するセルフィーの視点は維持する。別途指定したフィルム質感や意図的な不完全さは、その指定を優先する。';
const HAND_PHYSICS = '見える手は誰の手かが明確で、腕・手首・指先が自然につながる。手指の本数と関節は自然な人体に沿い、物を持つ指は接触と握り方に合わせる。同じ手に同時に無理な役割を持たせない。隠れた部分を無理に見せず、ポーズや指の形は場面に合わせて自由にする。鏡に映る手は同じ手の反射として整合させる。';
const PRINCIPLE = '人物の基本像・本人セルフィー・写実性を保ち、可変項目は具体的な指定を自動選択より優先する。未指定の部分だけを創造的に補い、複雑な物語を無理に足さず、一つの現実的な場面に統一する。';

const V = {
  'AX-01': {A: 'A：日常に実在する、自然な着用感のブラジャーとショーツ。特別な日ではないが、本人が今日選んだ、ちょっと色っぽい普段着の下着。',
            B: 'B：特別な日の、いわゆる勝負下着。セット、ブラレット、ビスチェ、テディ、スリップ、コルセット、ガーターベルトなどから指定に合う形式。',
            C: 'C：統一したテーマをシルエット・パーツ構成・素材・配色に反映した成人向けコスチューム。脱いだときに下着ではなく衣装として成立させる。'},
  'AX-02': {'1': '露出レベル1：カバー範囲を広めにし、上品さと自然な色気を引き出す。清楚なのに、ふと肌が見える。',
            '2': '露出レベル2：開放感のあるシルエット、レースやストラップを使い、華やかさと大胆さを両立。',
            '3': '露出レベル3：ストラップ、装飾的な透け感やカットアウトを用い、身体の線を大胆に見せる。それでも下品にならない。'},
  'AX-13': {slim: 'ほっそりとした華奢な体つき。', normal: '自然な標準体型。', soft: 'やわらかく丸みのある体つき。', healthy: '健康的で引き締まった体つき。'},
  'AX-14': {small: '胸は控えめで可憐。', normal: '胸は標準的でバランスが良い。', rich: '胸は豊かで、布地が自然に張る。', full: '胸はかなり豊かで、自然な重さを感じさせる。'},
  'AX-15': {natural: '陰毛は自然なまま、整えていない生え方。', trimmed: '陰毛は丁寧に処理され、すっきりしている。', growing: '陰毛は生えかけで、まばら。', partial: '陰毛は部分的に整えられ、形を残している。', bald: 'パイパンで、永久脱毛済み。肌はなめらか、陰部の輪郭まできれい。'},
    'AX-43': {black: '黒髪で、艶がある。', darkbrown: '焦げ茶。', chestnut: '栗色。',
    lightbrown: '明るい茶髪。', ash: 'アッシュブラウン。'},
    'AX-44': {long: 'ロングで、肩下まで。', semilong: 'セミロングで、肩につく程度。', bob: '顎下のボブ。',
    short: 'ショート。', pony: 'ポニーテールにまとめている。', halfup: 'ハーフアップにまとめている。',
    braid: '三つ編みにしている。', bun: 'お団子にまとめている。'},
  'AX-45': {smile: '口元に柔らかな微笑み。', calm: '表情は静かで、真顔。', shy: '少し照れた笑い。',
    laugh: '声を上げて笑っている。', open: '口を軽く開けている。', closed: '目を閉じている。'},
  'AX-46': {cam: 'カメラをまっすぐ見ている。', avert: '目線を少し外している。', down: '伏し目がち。',
    profile: '横顔。', lookback: '肩越しに振り返る。', up: '上目遣い。'},
  'AX-47': {fair: '肌は色白で、透けるよう。', normal: '肌は自然な標準色。', tan: '肌は小麦色に焼けている。',
    olive: '肌はオリーブがかった色。'},
  'AX-48': {straight: '髪はストレートで、艶がある。', inward: '毛先はゆるく内巻き。', outward: '毛先は外へはねている。',
    curly: '髪は自然な癖毛。', airy: '髪はふわっと軽い質感。'},
  'AX-49': {bangs: '前髪あり。', nobangs: '前髪は分けて額を出している。', blunt: 'ぱっつんの前髪。',
    swept: '前髪をかき上げている。', center: '前髪はセンターで分けている。'},
  'AX-16': {clear: '清楚さを残した初々しい温度感。', normal: '清楚さと色気が半々。', bold: '少し背徳的な、危険な温度感。', wild: '開き直った、淫靡で大胆な温度感。'},
  'AX-17': {normal: '通常着用。', trying: '試着してサイズとフィットを確かめている。', adjusting: '着用したまま、上着や小物を整えている。'},
  'AX-18': {front: 'インカメラで本人が撮影。スマホ本体は画面内に描かない。腕の届く距離と自然な画角。',
            mirror: '鏡越しに本人が撮影。スマホ・手・身体・鏡像の位置関係を正しくし、スマホを不必要に大きくしない。'},
  'AX-19': {face: '顔を中心に', bust: 'バストアップ', half: '半身', full: '全身'},
  'AX-20': {tight: '余白は詰めて', roomy: '余白は広めに'},
  'AX-21': {natural: '自然な手持ちの傾き', close: '近距離', arm: '腕の届く距離', mirror: '鏡との自然な距離', shallow: '浅い被写界深度'},
  'AX-22': {window: '窓からの自然光', 'cam-left': 'カメラ左からの光', 'upper-right': '右上からの光', back: '逆光'},
  'AX-23': {lace: 'レース', satin: 'サテン', tulle: 'チュール', modal: 'モダール', velvet: 'ベルベット', cotton: '綿混', embroidery: '刺繍', mesh: 'メッシュ'},
  'AX-24': {cheki: 'チェキ', polaroid: 'ポラロイド', film: 'フィルム粒子', oldphone: '旧型スマホの画質', purikura: 'プリクラ風'},
  'AX-25': {wide: 'インカメラの広角歪み', grain: '初期スマホの粒状感'},
  'AX-26': {room: '生活感のある自室', bath: '浴室', hotel: 'ホテルの部屋', fitting: '試着室', balcony: 'ベランダ', entry: '玄関'},
  'AX-27': {full: '姿見', basin: '洗面鏡', steam: '湯気で曇った鏡'},
  'AX-28': {bedtime: '就寝前', waking: '起床直後', bath: '風呂上がり', home: '帰宅直後'},
  'AX-29': {spring: '春', summer: '夏', autumn: '秋', winter: '冬'},
  'AX-30': {clear: '晴れ', cloudy: '曇り', rain: '雨', snow: '雪'},
  'AX-31': {hand: '画面外に相手の手の気配', leg: '相手の脚がフレームイン', glasses: '二つ並んだグラス', blanket: '掛け布団の盛り上がり', duo: '相手と一緒の二人セルフィー'},
  'AX-32': {wet: '濡れた髪', steam: '湯気', dappled: '木漏れ日', linen: 'リネンの皺'},
  'AX-34': {full: '衣装を着用した状態。', base: '下着姿。', half: '半脱ぎ。', upper: '上だけ脱いだ状態。', lower: '下だけ脱いだ状態。', none: '全裸。', hand: '手で胸を隠している。'},
  'AX-35': {opaque: '布は不透明で、乳首・性器は布に覆われている。', lace: 'レース越しに肌が透け、乳首の輪郭がうっすら分かる。', outline: '薄い布越しに乳首の輪郭が浮かぶ。'},
  'AX-36': {pressed: '布が乳首に軽く押される。', through: '布越しに乳首が透ける。', exposed: '乳首が露出している。'},
  'AX-37': {flush: '頬と胸元が火照っている。', sweat: 'うっすら汗ばんだ肌。', goose: '肌に鳥肌が立っている。', before: 'これから始まる前の落ち着かない期待。', during: '行為の最中で、呼吸が浅い。', after: '終わったあとの脱力と静けさ。', selftouch: '自分で身体に触れている。', halfremoved: '下着をずらし、脱ぎかけている。'},
  'AX-38': {shake: '手ブレ', soft: '軽いピンボケ', miss: '露出ミス', dirt: 'レンズの汚れ', flare: 'フレア'},
  'AX-12': {pov: 'こちらをまっすぐ見つめる距離感。', hand: '画面の端に、こちらの手や指先が入り込む。', sweat: '蒸れた空気。', tease: '脱がないのに色っぽい、ずらし・はだけ・食い込みの間。', after: '乱れたシーツと満たされた静けさ。', tousle: '少し乱れた髪と、よれた下着のライン。'},
  'AX-07': {self: '自分で見返すための記録。', friends: '成人の友だちと見せ合うため。', crush: '気になる相手に、自分らしい装いと色気を見せるため。', intimate: '信頼する親密な相手に送る、私的な一枚。'},
  'AX-10': {explore: '未指定の意図は、候補例にない新しいモチーフ・色・素材・シルエットも考案する。エロティックさを削って無難にまとめない。',
            blend: '指定を核に、未指定の服飾文化・素材・造形から意外な組み合わせを考案し、一つのコンセプトへまとめる。清楚と大胆、甘さと背徳感を同居させる。'}
};

function vtext(id, value) { const m = V[id]; return (m && m[value] !== undefined) ? m[value] : String(value); }
function vlist(id, values) { return values.map(function (x) { return vtext(id, x); }).join('、'); }

function compile(state) {
  const maxTier = state.verbosity === 'light' ? 1 : (state.verbosity === 'full' ? 3 : 2);
  const add = function (tier, text) { if (text && tier <= maxTier) BLOCKS.push({tier: tier, text: text}); };
  BLOCKS.length = 0;

  const framing = state['AX-19'];
  const ratio = (framing === 'full' || state['AX-18'] === 'mirror') ? '9:16' : '3:4';
  add(1, '一枚の写実的なプライベート・セルフィー。縦位置 ' + ratio + '。');

  add(1, '【被写体】\n' + FIXED.core[0] + '\n' + FIXED.core[1]);
  add(2, FIXED.standard[0]);

  const body = [];
  if (state['AX-13'] !== AUTO) body.push('体型：' + vtext('AX-13', state['AX-13']));
  if (state['AX-14'] !== AUTO) body.push('胸：' + vtext('AX-14', state['AX-14']));
  if (state['AX-15'] !== AUTO && state['AX-34'] !== 'full') body.push('陰毛：' + vtext('AX-15', state['AX-15']));
  if (state['AX-47'] !== AUTO) body.push('肌：' + vtext('AX-47', state['AX-47']));
  if (state['AX-43'] !== AUTO) body.push('髪色：' + vtext('AX-43', state['AX-43']));
  if (state['AX-44'] !== AUTO) body.push('髪型：' + vtext('AX-44', state['AX-44']));
  if (state['AX-48'] !== AUTO) body.push('髪質：' + vtext('AX-48', state['AX-48']));
  if (state['AX-49'] !== AUTO) body.push('前髪：' + vtext('AX-49', state['AX-49']));
  if (state['AX-45'] !== AUTO) body.push('表情：' + vtext('AX-45', state['AX-45']));
  if (state['AX-46'] !== AUTO) body.push('目線：' + vtext('AX-46', state['AX-46']));
  if (state['AX-16'] !== AUTO) body.push('温度感：' + vtext('AX-16', state['AX-16']));
  if (state['AX-36'] !== AUTO) body.push('ディテール：' + vtext('AX-36', state['AX-36']));
  if (state['AX-37'].length) body.push('肌・気配：' + vlist('AX-37', state['AX-37']));
  if (body.length) add(0, '【身体】\n' + body.join('\n'));

  const ward = [];
  if (state['AX-01'] !== AUTO) ward.push(vtext('AX-01', state['AX-01']));
  if (state['AX-02'] !== AUTO) ward.push(vtext('AX-02', state['AX-02']));
  if (state['AX-34'] !== AUTO) ward.push('着衣状態：' + vtext('AX-34', state['AX-34']));
  if (state['AX-35'] !== AUTO) ward.push('透け：' + vtext('AX-35', state['AX-35']));
  if (state['AX-23'].length) ward.push('素材：' + vlist('AX-23', state['AX-23']) + '。');
  if (state['AX-17'] !== AUTO) ward.push('着用状態：' + vtext('AX-17', state['AX-17']));
  if (state['AX-09'] !== AUTO) ward.push('参考ブランド：' + state['AX-09'] + ' の服飾デザインを参考にする。実在商品の完全な複製は不要。ロゴは描かない。');
  if (state['AX-11']) ward.push('デザイン：' + state['AX-11']);
  if (ward.length) add(1, '【衣装】\n' + ward.join('\n'));
  add(2, FIXED.standard[1]);

  const scene = [];
  if (state['AX-05']) scene.push('情緒：' + state['AX-05']);
  if (state['AX-06']) scene.push('状況：' + state['AX-06']);
  if (state['AX-07'] !== AUTO) scene.push('相手・用途：' + vtext('AX-07', state['AX-07']));
  if (state['AX-08']) scene.push('関係の補足：' + state['AX-08']);
  if (state['AX-26'] !== AUTO) scene.push('場所：' + vtext('AX-26', state['AX-26']));
  if (state['AX-28'] !== AUTO) scene.push('場面：' + vtext('AX-28', state['AX-28']));
  if (state['AX-29'] !== AUTO) scene.push('季節：' + vtext('AX-29', state['AX-29']));
  if (state['AX-30'] !== AUTO) scene.push('天候：' + vtext('AX-30', state['AX-30']));
  if (state['AX-27'] !== AUTO) scene.push('鏡：' + vtext('AX-27', state['AX-27']));
  if (state['AX-31'].length) scene.push('相手の気配：' + vlist('AX-31', state['AX-31']));
  if (state['AX-32'].length) scene.push('実在感：' + vlist('AX-32', state['AX-32']));
  if (scene.length) add(1, '【場面】\n' + scene.join('\n'));
  add(3, FIXED.full[1]);

  const comp = [];
  if (state['AX-18'] !== AUTO) comp.push('撮影方法：' + vtext('AX-18', state['AX-18']));
  if (state['AX-19'] !== AUTO) comp.push('フレーミング：' + vtext('AX-19', state['AX-19']));
  if (state['AX-20'] !== AUTO) comp.push('余白：' + vtext('AX-20', state['AX-20']));
  if (state['AX-21'] !== AUTO) comp.push('カメラ：' + vtext('AX-21', state['AX-21']));
  if (comp.length) add(1, '【構図と撮影】\n' + comp.join('\n'));
  add(3, FIXED.full[2]);
  add(1, '【手と接触】\n' + HAND_PHYSICS);

  const light = [];
  if (state['AX-22'] !== AUTO) light.push('光の方向：' + vtext('AX-22', state['AX-22']));
  if (light.length) add(1, '【光】\n' + light.join('\n'));

  const tex = [];
  if (state['AX-24'] !== AUTO) tex.push('写真ジャンル：' + vtext('AX-24', state['AX-24']));
  if (state['AX-25'] !== AUTO) tex.push('質感：' + vtext('AX-25', state['AX-25']));
  if (state['AX-12'].length) tex.push('演出：' + vlist('AX-12', state['AX-12']));
  if (state['AX-38'].length) tex.push('許容する不完全さ：' + vlist('AX-38', state['AX-38']));
  add(1, '【質感と写実】\n' + (state.finish === 'professional' ? PROFESSIONAL : IMPERFECTION) + (tex.length ? '\n' + tex.join('\n') : ''));
  add(2, FIXED.standard[2]);

  if (state['AX-33'] === true) {
    const fmt = state['AX-33B'] === 'd2' ? '09/06/21' : '2009.06.21';
    add(1, '【画像内テキスト】\n画面右下に、細い数字で「' + fmt + '」と控えめに焼き込む。');
  }

  if (state['AX-10'] !== AUTO) add(2, '【発想】\n' + vtext('AX-10', state['AX-10']));

  const avoid = ['過剰な美肌加工とCG感', '指定と無関係なポーズや表情の固定', '不要な文字やロゴ'];
  if (state['AX-18'] === 'front') avoid.push('スマホ本体の映り込み');
  if (state['AX-39']) avoid.push(state['AX-39']);
  add(1, '【避ける要素】\n' + avoid.join('、') + '。');

  add(1, '【補完の原則】\n' + PRINCIPLE);

  let text = joinBlocks();
  if (Array.from(text).length > BUDGET) {
    for (const tier of [3, 2]) {
      if (Array.from(text).length <= BUDGET) break;
      BLOCKS = BLOCKS.filter(function (b) { return b.tier !== tier; });
      text = joinBlocks();
    }
  }
  return text;
}

let BLOCKS = [];
function joinBlocks() {
  return BLOCKS.filter(function (b) { return b.text; }).map(function (b) { return b.text; }).join('\n\n');
}

const RE_NEG = /(避け|しない|なし|不要|禁止|ではなく|以外|不可)/;

function lint(state, text) {
  const out = [];
  const push = function (level, code, message) { out.push({level: level, code: code, message: message}); };
  const count = Array.from(text).length;

  if (count > BUDGET) {
    push('warn', 'BUDGET_OVER', '出力 ' + count + ' 字。上限3,000字を超えています。固定の説明段落は自動で削っています。');
  } else if (count >= BUDGET * 0.9) {
    push('info', 'BUDGET_WARN', '出力 ' + count + ' 字。上限まで残りわずかです。');
  }

  const pos = function (t) {
    return String(t || '').split(/[。\n、;；]/).filter(function (s) { return !RE_NEG.test(s); }).join('。');
  };
  const design = pos([state['AX-11'], state['AX-06'], state['AX-05']].join('。'));

  const sysFound = [];
  (design.match(/([ABC])\s*系統/g) || []).forEach(function (s) {
    const c = s.charAt(0);
    if (sysFound.indexOf(c) < 0) sysFound.push(c);
  });
  if (state['AX-01'] !== AUTO && sysFound.some(function (c) { return c !== state['AX-01']; })) {
    push('warn', 'CONFLICT_SYSTEM', '衣装系統の選択と本文の記述が食い違う可能性があります（本文：' + sysFound.join('・') + '系統）。');
  }

  const lvFound = [];
  const reLv = /露出(?:レベル)?\s*([123])|レベル\s*([123])/g;
  let m;
  while ((m = reLv.exec(design))) {
    const n = m[1] || m[2];
    if (lvFound.indexOf(n) < 0) lvFound.push(n);
  }
  if (state['AX-02'] !== AUTO && lvFound.some(function (n) { return n !== state['AX-02']; })) {
    push('warn', 'CONFLICT_INTENSITY', '露出レベルの選択と本文の記述が食い違う可能性があります（本文：' + lvFound.join('・') + '）。');
  }

  const cam = pos([state['AX-06'], state['AX-11']].join('。'));
  const isFront = /インカメ|前面カメラ/.test(cam);
  const isMirror = /鏡越し|ミラー|鏡の前/.test(cam);
  if (state['AX-18'] === 'front' && isMirror) {
    push('warn', 'CONFLICT_CAMERA', '撮影方法はインカメラですが、本文に鏡越しの記述があります。');
  }
  if (state['AX-18'] === 'mirror' && isFront) {
    push('warn', 'CONFLICT_CAMERA', '撮影方法は鏡越しですが、本文にインカメラの記述があります。');
  }
  if (state['AX-18'] === AUTO && isFront && isMirror) {
    push('info', 'CONFLICT_CAMERA', '本文にインカメラと鏡越しが両方あります。どちらかに決めると安定します。');
  }

  if (state['AX-18'] === 'front' && state['AX-19'] === 'full') {
    push('warn', 'FRAMING_RATIO', 'インカメラの手持ちで全身は距離が不自然になりがちです。鏡越しか半身を検討してください。');
  }

  const avoidItems = String(state['AX-39'] || '').split(/[、,，;；\n]/).filter(function (s) { return s.trim(); });
  if (avoidItems.length > 4) {
    push('info', 'EXCLUSION_COUNT', '避ける要素が ' + avoidItems.length + ' 件。固定分と合わせて多く、効きが薄まるかもしれません。');
  }

  if (state['AX-33'] === true && /文字|ロゴ|テキスト/.test(state['AX-39'] || '')) {
    push('warn', 'TEXT_CONFLICT', '日付スタンプを入れる一方で、避ける要素に文字・ロゴがあります。文字だけを除外したいのか確認してください。');
  }

  if (state['AX-34'] === 'none' && state['AX-35'] !== AUTO) {
    push('info', 'COVER_MISMATCH', '全裸のとき「透け」は布の話なので効きが弱くなります。');
  }
  if (state['AX-34'] === 'none' && state['AX-36'] !== AUTO) {
    push('info', 'COVER_MISMATCH', '全裸のとき「身体ディテール」は布の状態に依存しません。');
  }

  if (state['AX-31'].indexOf('duo') >= 0 && state['AX-18'] === 'mirror') {
    push('info', 'DUO_MIRROR', '二人セルフィーと鏡越しは、鏡像の人数が増えて破綻しやすい組み合わせです。');
  }

  let any = false;
  AXES.forEach(function (g) {
    g.controls.forEach(function (c) { if (!blank(state[c.id])) any = true; });
  });
  if (!any) {
    push('info', 'EMPTY', '空欄はAIに任せる余白です。どれか一つ入れると意図が伝わります。');
  }

  out.sort(function (a, b) { return a.level === b.level ? 0 : (a.level === 'warn' ? -1 : 1); });
  return out.slice(0, 5);
}

export {AXES,compile,lint};
export function defaults(){return {...Object.fromEntries(AXES.flatMap(g=>g.controls.map(c=>[c.id,structuredClone(c.value)]))),mode:'basic',verbosity:'standard',finish:'selfie'};}
