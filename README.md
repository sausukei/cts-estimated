# 新千歳・羽田・小松空港 到着便情報

新千歳（CTS）・羽田（HND）・小松（KMQ）の国内線・国際線到着便を確認できる、Next.js / React製のWebアプリです。

**[公開サイト](https://cts-estimated.ikenosousuke.workers.dev/)**

| 空港 | 国際線 | 国内線 |
| --- | --- | --- |
| 新千歳 | [国際線到着便](https://cts-estimated.ikenosousuke.workers.dev/cts/international/) | [国内線到着便](https://cts-estimated.ikenosousuke.workers.dev/cts/domestic/) |
| 羽田 | [国際線到着便](https://cts-estimated.ikenosousuke.workers.dev/hnd/international/) | [国内線到着便](https://cts-estimated.ikenosousuke.workers.dev/hnd/domestic/) |
| 小松 | [国際線到着便](https://cts-estimated.ikenosousuke.workers.dev/kmq/international/) | [国内線到着便](https://cts-estimated.ikenosousuke.workers.dev/kmq/domestic/) |

ヘッダーの空港タブまたは左の空港アイコンで空港、国内線／国際線のボタンで路線を切り替えられます。空港変更時にも路線モードを維持します。旧URL（例：`/?airport=HND&mode=domestic`）はCloudflare上で新しいURLへ308リダイレクトします。

## 機能

- 便名・航空会社・出発空港・運航状況・機種・登録番号
- 到着予定・到着見込み・実際の到着時刻、遅延便の強調
- 本日の総便数・残り便数（選択した空港・路線の全ページを集計）
- 5分ごとの自動更新、手動更新、時間順の切り替え、現在時刻に近い便への移動
- スマホ1列・広い画面2列のレスポンシブ表示、1ページ20便

予定時刻を過ぎただけでは便を除外しません。予定到着日が当日の便は到着見込みが翌日になっても残します。残り便数からは実到着時刻がある便と到着済み・欠航ステータスの便を除きます。

日付・時刻は日本時間（JST）に統一しています。予定到着日・到着空港・路線で絞り込み、同じフライトIDと予定時刻の重複を除いて集計します。IDがない場合は便名・発着空港・予定時刻を使います。異なるIDのコードシェア便を同一運航便としてまとめる処理はありません。

APIは各100件で最終ページまで取得します。途中の取得失敗・ページの繰り返し・安全上限の100ページ到達はエラーにし、不完全な取得結果で便数を更新しません。表示と集計は取得元に収録された範囲に限られ、空港公式の便数との一致は保証しません。欠航判定などは取得元のステータスに依存します。

## 開発

Node.js 22以降を使用します（`.node-version` に指定）。

```sh
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000) を開きます。ポート使用中は、起動ログに表示されるURLを使用してください。

```sh
npm test          # 集計・遅延・6路線・旧URL転送の回帰テスト
npm run build     # Next.jsの静的出力をout/へ生成
npm run test:seo  # 生成HTMLのメタ情報・リンク・サイトマップを検証
npm run preview  # Cloudflareの配信と旧URL転送をローカルで確認
```

フライトAPIはブラウザーから取得します。回帰テストはAPIモックを使用し、実データの可用性は検証しません。旧URLのサーバー転送はWorkerが担当するため、`next dev`ではなく `npm run preview` で確認してください。

## 構成とSEO

- `app/`：App Router。トップページと空港×路線の6ページを事前生成
- `components/`：空港選択、到着便ボード、便カード、フッター
- `lib/`：空港設定・URL、フライト取得・分類・集計の共通処理
- `worker/index.mjs`：旧クエリ形式URLから正規URLへの転送
- `tests/`：機能と生成HTMLの検証

各路線ページに固有のタイトル・description・canonical・OGP・Twitterメタ情報を設定し、空港名・路線名・説明文を初期HTMLに出力します。`sitemap.xml`、`robots.txt`、WebPage / AirportのJSON-LD、アイコン、404ページも生成します。フライト情報そのものはクライアント取得です。検索エンジンの登録や順位を保証するものではありません。

## Cloudflare Workersへの公開

[wrangler.jsonc](./wrangler.jsonc) に `out/` の配信とビルドコマンドを設定しています。Workers Buildsの既存コマンドでNext.jsのビルドも実行されます。

```sh
npx wrangler versions upload  # プレビューバージョンのアップロード
npx wrangler deploy --dry-run # ビルド・公開設定の検証（公開しない）
```

GitHub Actionsでも、テスト・ビルド・生成HTMLの検証を実行します。CloudflareはNode.js 22以降で実行してください。フライト取得用のAPIキーは不要です。GA4は任意で設定できます。

## 関連リンク

- [GitHub](https://github.com/sausukei/cts-estimated) / [不具合報告](https://github.com/sausukei/cts-estimated/issues)
- [Flightradar24](https://www.flightradar24.com/) — データ取得元
- [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

フライト情報には更新の遅れや取得エラーが発生する場合があります。最新の運航状況は航空会社でもご確認ください。

## GA4による利用状況の確認

本番ビルドでは測定ID `G-CM4ZEE4QCV` を使用します。開発時は既定で無効です。測定IDは公開情報です。

変更する場合はCloudflare Workers Buildsの**ビルド環境変数** `NEXT_PUBLIC_GA_ID` に設定して再デプロイしてください。空文字を明示すると無効になります。静的出力に埋め込むため、Workerの実行時変数だけでは変更できません。ローカルでは `.env.example` を `.env.local` にコピーして設定します。空文字・形式不正の場合、GAスクリプトは読み込まれません。

GA4の拡張計測で「ページビュー」と「ブラウザの履歴イベントに基づくページの変更」を有効にします。ページビューはGoogleタグに任せ、アプリから重複送信しません。ページパスから空港・国内線／国際線ごとの閲覧数を確認できます。

| イベント | 内容 | パラメータ |
| --- | --- | --- |
| `switch_airport` | 空港の切り替え操作 | `airport`, `mode`（切り替え先） |
| `switch_mode` | 国内線／国際線の切り替え操作 | `airport`, `mode`（切り替え先） |
| `flight_load_success` | 初回・手動・5分ごとの取得成功 | `airport`, `mode`, `flight_count`, `remaining_count` |
| `flight_load_error` | データ取得失敗 | `airport`, `mode`, `reason`（`timeout` / `fetch_failed`） |

`airport`・`mode`・`reason` は必要に応じてイベントスコープのカスタムディメンションに登録してください。取得件数は各取得時点の値で、イベントをまたいで合算した数値は当日の総便数ではありません。エラー本文やフライトデータ自体は送信しません。

設定後、GA4のリアルタイム画面でアクセスとイベントを確認してください。広告ブロッカー等で欠測するため、GA4は稼働監視や障害通知を保証するものではありません。

参考：[GoogleのSPA計測ガイド](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications?hl=ja)

## 新千歳の折り返し便の搭乗口

新千歳のみ、到着便表示後に出発便の機体記号と空港公式の搭乗口を追加取得します。同一機体の到着後12時間以内の最初の出発便を候補にし、公式データの便名・予定出発日時・行き先が一意に一致した場合だけ表示します。番号がない便には補足ラベルを表示しません。これは折り返し出発便の搭乗口であり、到着時の駐機位置を保証するものではありません。

公式データはWorkerの `/api/cts-gates` から取得し、120秒キャッシュします。30分以上更新されていないデータは使用しません。追加取得の失敗時も到着便一覧は表示します。機体記号や搭乗口の事前公開状況に依存するため、朝の時点で表示できる保証はありません。実データの照合は取得元の403により未検証です。ローカルの統合確認には `npm run preview` を使用してください。
