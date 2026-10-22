export function homeScreen(): string {
  return `<section class="home screen" aria-labelledby="screen-title">
    <p class="eyebrow">四文字に、力を宿せ。</p>
    <h1 id="screen-title" tabindex="-1">漢字バトル<span class="subtitle">仮称</span></h1>
    <div class="title-seal" aria-hidden="true">風林火山</div>
    <p class="intro">引いて、選んで、四文字を書く。<br>あなただけの言葉を組み上げよう。</p>
    <div class="home-actions"><button data-action="start">書き始める</button><button class="secondary" data-action="catalog">漢字一覧</button></div>
    <p class="note">最大10回の抽選から4文字を採用。自由な造語で遊べます。</p>
    <p class="development">開発版：現在は4文字の確定まで。試合は次の区切りで追加します。</p>
  </section>`;
}
