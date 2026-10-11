# 新千歳・羽田・小松空港 国際線到着便情報

新千歳空港（CTS）・羽田空港（HND）・小松空港（KMQ）の当日の国際線到着便を確認できる、HTML・CSS・JavaScript製のWebページです。

**[公開サイトを開く](https://cts-estimated.ikenosousuke.workers.dev/)**

ヘッダー左の空港コードのアイコンをタップすると、空港を切り替えられます。各空港のURLをブックマークして直接開くこともできます。

- [新千歳空港（CTS）](https://cts-estimated.ikenosousuke.workers.dev/?airport=CTS)
- [羽田空港（HND）](https://cts-estimated.ikenosousuke.workers.dev/?airport=HND)
- [小松空港（KMQ）](https://cts-estimated.ikenosousuke.workers.dev/?airport=KMQ)

空港を指定しない場合や未対応のコードを指定した場合は、新千歳空港を表示します。いずれも国際線到着便が対象です。

## 表示できる情報

- 便名・航空会社・出発空港・運航状況
- 到着予定時刻・推定到着時刻・実際の到着時刻
- 機種・機体登録番号
- 本日の総便数と残り便数（全ページの国際線到着便を集計）

5分ごとに自動更新します。「更新」で手動更新、「現在時刻」でデータを更新して現在時刻に最も近い便へ移動できます。1ページに20便ずつ表示します。

### 便数と遅延便の扱い

総便数は取得できた当日の国際線到着便の件数です。残り便数は未到着便の件数で、実際の到着時刻がある便、到着済み・欠航ステータスの便を除きます。予定時刻や推定時刻を過ぎただけでは残り便数から除外しません。

取得開始時刻は当日0時です。予定到着日が当日の便は、推定到着時刻が翌日にずれても当日の一覧に残します。予定到着時刻のほか、実際の到着時刻（未到着なら推定時刻）が当日の便も表示対象です。

日付・時刻は閲覧端末のタイムゾーンを使用します。取得は最大5ページ・各100件で、表示と集計は取得できたデータの範囲に限られます。

## ローカルで動かす

ビルドや依存パッケージのインストールは不要です。Python 3がある環境では、リポジトリのルートで次を実行します。

```sh
python3 -m http.server 8000
```

[http://localhost:8000](http://localhost:8000) をブラウザーで開いてください。フライトデータの取得にはインターネット接続が必要です。

## テスト

Node.js 20以降で実行できます。追加パッケージは不要です。

```sh
node --test tests/arrivals.test.cjs
node --check script.js
```

テストではAPIをモックし、遅延便の保持、日付による抽出、総便数・残り便数と更新時の再集計を確認します。実APIとの接続確認は含みません。

## Cloudflare Workersへの公開

[wrangler.jsonc](./wrangler.jsonc) にWorker名 `cts-estimated` と静的ファイルのディレクトリを設定しています。[.assetsignore](./.assetsignore) で公開対象を `index.html`・`script.js`・`style.css` に限定しています。

Cloudflare Workers Buildsのプレビューバージョンのアップロードコマンドは次のとおりです。

```sh
npx wrangler versions upload
```

手元で公開設定を検証する場合は、次を実行します。実際のデプロイは行いません。

```sh
npx wrangler deploy --dry-run
```

## ファイル構成

| ファイル | 内容 |
| --- | --- |
| [index.html](./index.html) | 画面の構成 |
| [style.css](./style.css) | レイアウト・装飾 |
| [script.js](./script.js) | データ取得・国際線の抽出・集計・表示 |
| [tests/arrivals.test.cjs](./tests/arrivals.test.cjs) | 回帰テスト |
| [japan_airports.txt](./japan_airports.txt) | 国内空港の参考資料（実際の判定は `script.js` のリストを使用） |

## 関連リンク

- [公開サイト](https://cts-estimated.ikenosousuke.workers.dev/)
- [GitHubリポジトリ](https://github.com/sausukei/cts-estimated)
- [不具合報告・機能リクエスト](https://github.com/sausukei/cts-estimated/issues)
- [Flightradar24](https://www.flightradar24.com/) — フライトデータの取得元
- [Cloudflare Workers 静的アセットの設定](https://developers.cloudflare.com/workers/static-assets/binding/)

フライト情報はFlightradar24の空港スケジュールAPIから取得します。データの更新状況やAPIの利用可否により、表示が遅れたり取得に失敗したりする場合があります。
