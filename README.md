# ニュース (news-reader-pwa)

RSS / JSON Feed / ニュースAPI(NewsAPI等)から記事をまとめて読めるPWA。ライト/ダーク両対応、オフラインキャッシュ、自動取得(Periodic Background Sync)対応。

## 構成
- 素のHTML/CSS/JS(ビルドツール無し) + Vercel Serverless Function(`api/fetch-source.js`)でRSS/JSON Feed/NewsAPIをサーバー側プロキシしCORSを回避
- `js/` 以下がロジック本体(ルーティング、購読ソース管理、各パーサー、IndexedDBキャッシュ、設定、自動取得)
- `sw.js` がオフラインキャッシュとPeriodic Background Syncを担当

## ローカル起動
Serverless Functionを含むため `vercel dev` が必要です。

```bash
npx vercel dev
```

## アイコン再生成
```bash
python scripts/gen_icons.py
```
