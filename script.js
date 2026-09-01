/**
 * 天然石データ
 *
 * 石を追加するときは、この配列に次の形式で1件追加してください。
 * { name: "石名", kana: "あ", description: "簡潔な特徴説明" }
 *
 * kana は KANA_GROUPS の「label」のいずれかを指定します。
 */
const STONES = [
  {
    name: "イエローサファイア",
    kana: "あ",
    description: "明るい黄色が印象的なサファイア。透明感のある色合いが装いを華やかにします。",
  },
  {
    name: "インカローズ",
    kana: "あ",
    description: "濃淡のあるピンク色と縞模様が魅力。やわらかく温かな存在感を楽しめます。",
  },
  {
    name: "ケープアメジスト",
    kana: "か",
    description: "紫のアメジストと白いクォーツが描く、穏やかな縞模様が特徴です。",
  },
  {
    name: "グリーンアメジスト",
    kana: "か",
    description: "淡く澄んだ緑色が魅力のクォーツ。すっきりと上品な印象を添えます。",
  },
  {
    name: "グリーンガーネット",
    kana: "か",
    description: "みずみずしい緑色をたたえたガーネット。小粒でも鮮やかな輝きを見せます。",
  },
  {
    name: "グリーントルマリン",
    kana: "か",
    description: "深みのある緑から明るい緑まで、豊かな色幅を楽しめるトルマリンです。",
  },
  {
    name: "サンゴ",
    kana: "さ",
    description: "海から生まれた有機質の宝石。赤や桃色など、あたたかな色合いが特徴です。",
  },
  {
    name: "シーブルーカルセドニー",
    kana: "さ",
    description: "海を思わせる爽やかな青色と、カルセドニー特有のやさしい光沢が魅力です。",
  },
  {
    name: "ナチュラルカルセドニー",
    kana: "な",
    description: "半透明のやわらかな色合いと、なめらかな光沢を持つ天然のカルセドニーです。",
  },
  {
    name: "パープルガーネット",
    kana: "は",
    description: "赤紫から紫に寄った深い色合いを持ち、落ち着いた華やかさを楽しめます。",
  },
  {
    name: "ピーターサイト",
    kana: "は",
    description: "青や金褐色が渦を巻くように交ざる、ダイナミックな模様が特徴です。",
  },
  {
    name: "ビアクォーツ",
    kana: "は",
    description: "ビールのような琥珀色を帯びたクォーツ。穏やかな透明感が魅力です。",
  },
  {
    name: "ピンクアメジスト",
    kana: "は",
    description: "淡いピンクからライラック色を見せる、繊細でやさしい表情のクォーツです。",
  },
  {
    name: "ピンクカルセドニー",
    kana: "は",
    description: "やわらかなピンク色と、ふんわり光を含むような質感が特徴です。",
  },
  {
    name: "ピンクサファイア",
    kana: "は",
    description: "可憐な淡色から鮮やかな色まで、幅広いピンクを楽しめるサファイアです。",
  },
  {
    name: "ピンクトルマリン",
    kana: "は",
    description: "淡い桜色から濃い赤紫まで、多彩なピンクの表情を持つトルマリンです。",
  },
  {
    name: "ブラックサファイア",
    kana: "は",
    description: "黒に近い深い色合いと控えめな輝きが、装いを端正に引き締めます。",
  },
  {
    name: "マラヤガーネット",
    kana: "ま",
    description: "桃色、橙色、赤色などが溶け合う、ニュアンス豊かなガーネットです。",
  },
  {
    name: "ローズアメジスト",
    kana: "ら",
    description: "ローズ色を帯びた紫とやわらかな透明感が、落ち着いた華やぎを添えます。",
  },
  {
    name: "ロードライトガーネット",
    kana: "ら",
    description: "赤紫色の深く上品な色合いが特徴。光を受けると鮮やかな赤みを見せます。",
  },
  {
    name: "ネオンブルーアパタイト",
    kana: "な",
    description: "鮮やかな青緑色と透明感が目を引く、発色の美しいアパタイトです。",
  },
  {
    name: "グリーンカイヤナイト",
    kana: "か",
    description: "青みを帯びた緑色と結晶に沿う繊細な表情が魅力のカイヤナイトです。",
  },
  {
    name: "ディープローズクォーツ",
    kana: "た",
    description: "通常のローズクォーツより濃い桃色を楽しめる、しっとりと上品な石です。",
  },
  {
    name: "ホワイトシェル",
    kana: "は",
    description: "白くなめらかな光沢と、角度によって現れるやさしい虹色が特徴です。",
  },
  {
    name: "アバロンシェル",
    kana: "あ",
    description: "青や緑、紫が複雑にきらめく、ひとつずつ異なる模様が魅力の貝素材です。",
  },
  {
    name: "黒蝶貝",
    kana: "か",
    description: "黒や銀灰色を基調に、角度で虹色の輝きを見せる落ち着いた貝素材です。",
  },
  {
    name: "マザーオブパール",
    kana: "ま",
    description: "真珠を育む貝殻から作られ、乳白色のやわらかな光沢を楽しめます。",
  },
  {
    name: "ミスティックトパーズ",
    kana: "ま",
    description: "表面加工によって虹色の輝きをまとい、見る角度で色彩が変化します。",
  },
  {
    name: "ミスティッククォーツ",
    kana: "ま",
    description: "クォーツに施した表面加工が生む、幻想的で多彩なきらめきが特徴です。",
  },
  {
    name: "ガーデンクォーツ",
    kana: "か",
    description: "内包物が庭園や風景のような模様を描く、個体差豊かなクォーツです。",
  },
  {
    name: "モザンビークガーネット",
    kana: "ま",
    description: "モザンビーク産ならではの深く鮮やかな赤色が印象的なガーネットです。",
  },
  {
    name: "ヘソナイト",
    kana: "は",
    description: "蜂蜜やシナモンを思わせる橙褐色と、とろりとした表情が魅力です。",
  },
  {
    name: "ルチルクォーツ",
    kana: "ら",
    description: "透明なクォーツの中に針状のルチルが走る、個性的な内包模様が特徴です。",
  },
  {
    name: "マラカイト",
    kana: "ま",
    description: "濃淡のある鮮やかな緑色が縞や同心円を描く、表情豊かな石です。",
  },
  {
    name: "グァバクォーツ",
    kana: "か",
    description: "グァバの果肉を思わせる、やや落ち着いた桃色がやさしい印象の石です。",
  },
  {
    name: "グランディディエライト",
    kana: "か",
    description: "青緑から緑青色の澄んだ色合いを持つ、希少性の高い宝石です。",
  },
  {
    name: "セラフィナイト",
    kana: "さ",
    description: "深い緑の地に銀白色の羽根を思わせる模様が広がる石です。",
  },
  {
    name: "ストロベリークォーツ",
    kana: "さ",
    description: "赤や桃色の細かな内包物が、苺のようなきらめきを見せるクォーツです。",
  },
  {
    name: "ピンクエピドート",
    kana: "は",
    description: "クォーツの中に桃色から赤色の内包物が広がる、華やかな表情の石です。",
  },
  {
    name: "パイライト",
    kana: "は",
    description: "金属質の金色と強い光沢を持ち、結晶面が端正に輝く鉱物です。",
  },
  {
    name: "プレナイト",
    kana: "は",
    description: "淡い黄緑色と、みずみずしい半透明の質感が魅力の石です。",
  },
  {
    name: "ムーアカイト",
    kana: "ま",
    description: "赤、黄、白、褐色など大地を思わせる多彩な色模様が特徴です。",
  },
];

const KANA_GROUPS = [
  { label: "あ", id: "group-a" },
  { label: "か", id: "group-ka" },
  { label: "さ", id: "group-sa" },
  { label: "た", id: "group-ta" },
  { label: "な", id: "group-na" },
  { label: "は", id: "group-ha" },
  { label: "ま", id: "group-ma" },
  { label: "や", id: "group-ya" },
  { label: "ら", id: "group-ra" },
  { label: "わ", id: "group-wa" },
];

function createStoneCard(stone) {
  const item = document.createElement("li");
  const article = document.createElement("article");
  const title = document.createElement("h3");
  const description = document.createElement("p");

  article.className = "stone-card";
  title.textContent = stone.name;
  description.textContent = stone.description;

  article.append(title, description);
  item.append(article);
  return item;
}

function renderStoneGuide() {
  const listRoot = document.querySelector("#stone-list");
  const count = document.querySelector("#stone-count");

  if (!listRoot || !count) return;

  const fragment = document.createDocumentFragment();

  KANA_GROUPS.forEach((group) => {
    const stonesInGroup = STONES.filter((stone) => stone.kana === group.label).sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
    const section = document.createElement("section");
    const title = document.createElement("h2");
    const groupCount = document.createElement("span");

    section.className = "stone-group";
    section.id = group.id;
    section.setAttribute("aria-labelledby", `${group.id}-title`);

    title.className = "group-title";
    title.id = `${group.id}-title`;
    title.append(document.createTextNode(group.label));

    groupCount.className = "group-count";
    groupCount.textContent = `${stonesInGroup.length} stones`;
    title.append(groupCount);
    section.append(title);

    if (stonesInGroup.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "現在、掲載準備中です。";
      section.append(emptyMessage);
    } else {
      const grid = document.createElement("ul");
      grid.className = "stone-grid";
      stonesInGroup.forEach((stone) => grid.append(createStoneCard(stone)));
      section.append(grid);
    }

    fragment.append(section);
  });

  listRoot.replaceChildren(fragment);
  count.textContent = String(STONES.length);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", renderStoneGuide);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { STONES, KANA_GROUPS };
}
