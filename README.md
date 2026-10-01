# トレ食（toresyoku）

## ポートフォリオ用のコピー

このリポジトリは、チーム制作したトレ食の `mikuo` ブランチを元にしたポートフォリオ用のコピーです。
元ブランチのコミット: `304c6d69a2dc87697007115c06aed8629235850f`。
元のコミット履歴は含めず、新しい履歴で公開しています。
APIキーやDBパスワードは含めていません。実行時は環境変数またはGit管理外の `secrets.properties` に設定してください。

プロフィールと「今日の状況」を入力すると、AIがその日の運動メニューと食事を提案するWebアプリ。

方針の正は [参考文献/プロジェクト概要.md](参考文献/プロジェクト概要.md)。このREADMEは動かし方だけを書く。

## 構成

```
toresyoku/                 リポジトリ直下がSpring Bootアプリ（MySQLで提案保存。ログインは未実装）
├─ build.gradle
├─ gradlew / gradlew.bat
├─ src/main/java/com/example/toresyoku/
├─ src/main/resources/
├─ 参考文献/               企画・仕様のドキュメント
└─ 発表用スクショ/         デモが失敗したとき用のスライド差し込み画像
```

Gradleのプロジェクト名とパッケージは概要§4の取り決めどおり `toresyoku` / `com.example.toresyoku`。
リポジトリのフォルダ名（`toresyoku`）とは綴りが違うが、揃えるとチームの環境と食い違うのでこのままにする。

## 動かす

### 1. APIキーを置く

`secrets.properties.example` を `secrets.properties` にコピーし、Gemini APIキーを貼る。

```properties
gemini.api-key=（キー）
```

`secrets.properties` は `.gitignore` 済み。**コードやコミットにキーを書かないこと。**
環境変数 `GEMINI_API_KEY` でも読める。

### 2. 起動する

**初回は [MySQLの初期設定](docs/database.md) を先に行う。** MySQL Serverをインストールし、
データベースと専用ユーザーを作成して、`secrets.properties` にDBパスワードを追記する。
起動時に提案保存用のテーブルが作られる。

PowerShell で:

```powershell
.\gradlew.bat bootRun
```

ブラウザで <http://localhost:8080/> を開く。初回は Gradle 本体（約150MB）のダウンロードが走るので数分かかる。

トップページと `/login` はログイン画面。提供されたロゴ画像を10:9で表示する。
現在は画面のみ実装済みで、ログイン・新規登録は準備中の案内を表示する（入力した認証情報は送信・保存しない）。
提案機能を使う場合は <http://localhost:8080/start> を開く。

アプリのビルドと実行には Java 21 を使う。未インストールの場合は Gradle が自動取得するため、初回はインターネット接続が必要。Gradle 自体を起動するための Java は別途インストールしておく。

### 3. 使う

フォームに初期値が入っているので、そのまま「今日の提案をつくる」で結果が出る。
入力画面と結果画面は `mikuo` の赤・グレーのデザインで統一している。結果画面の「条件を変えてもう一度」または「プロフィール」から、身長・体重・年齢・性別・目標・運動環境・アレルギーを変更し、「この条件で提案をつくる」で再提案できる。POSTで作成した提案は従来どおりMySQLに保存する。

「相談に使う条件を更新」は、表示中の食事・運動チャットに条件を反映する。体重・食事・運動の実績は「記録する」で入力し、このブラウザーに保存する。カレンダー・グラフには保存した実績だけを表示し、未記録時は空の状態になる。目標体重・テーマカラーもブラウザーに保存する。

AIの応答には **12秒前後** かかる（2026-09-04 実測、本命 `gemini-3.5-flash`）。ボタンは押した時点で「AIが考えています…」に変わる。

発表でその場入力を見せるなら、この待ち時間に話す繋ぎのセリフを決めておくこと。ここが5分の中で一番沈黙しやすい。

> 以前は 16〜33秒かかっていた。原因は混雑そのものではなく、**本命の `gemini-3.8-flash` で6〜25秒待たされて失敗し、予備の `gemini-3.5-flash` で取り直していた**こと。本命を 3.5 に変えてこの往復を消した。詳細は下の「モデルが失敗する2つの理由」。

### ⚠️ 無料枠は「1日20回・モデルごと」

**発表で一番効く制約。リハで叩きすぎると本番で枠が尽きる。**

- 上限は `GenerateRequestsPerDayPerProjectPerModel-FreeTier` = **20リクエスト／日**。
- **モデルごとに独立した枠**なので、本命(3.5)と予備(3.6)はそれぞれ20回ずつ持っている。逆に言うと、1回の提案で本命が失敗すると**2つの枠から1回ずつ**引かれる。
- 枠が尽きると **429**。503と違って**その日はもう復活しない**（再試行しても無駄）。
- リセットは**米国太平洋時間の深夜0時＝日本時間のおよそ16:00**。

発表は 9/5 13:00〜18:00。**16:00のリセットが発表時間帯の途中に入る**ため、**9/4 16:00以降に使った分は本番と同じ枠から出る**。通しリハは 9/4 の16:00より前に済ませると本番の枠を減らさずに済む。

枠が残っているかは、叩いて429が返るかで分かる（429は枠を消費しない）。

### リハでモデルを変えて試す

**再ビルドせず**起動時に差し替えられる。枠を温存したいときや、本命が枠切れしたときの逃げ道。

```powershell
.\gradlew.bat bootRun --args="--gemini.model=gemini-3.6-flash --gemini.fallback-model=gemini-3.7-flash"
```

## 発表当日の保険

| 起きたこと | 挙動 |
|---|---|
| APIキーが未設定 | 自動でモックに切り替わり、固定の提案を表示（画面に注意書きが出る） |
| モデルが混雑（503） | 予備モデル `gemini.fallback-model` で自動的に1回だけ再試行する |
| **1日20回の枠切れ（429）** | **同じく予備モデルへ。予備も尽きたら固定メニュー。その日は回復しないので枠管理が唯一の対策** |
| API がエラー・タイムアウト（25秒） | 固定メニューへ退避して画面は成立する（`gemini.fallback-on-error=true`） |
| ネットが使えない | `src/main/resources/application.properties` の `gemini.mock=true` にする |
| PCごと駄目 | `発表用スクショ/` の画像をスライドに貼る |

結果画面は GET でも開ける。URLをブックマークしておけば、同じ条件の提案をその場で再現できる。

```
http://localhost:8080/suggest?heightCm=172&weightKg=68&age=19&gender=男性&goal=体を絞りたい&environment=自宅（自重トレのみ）&allergy=牛乳が苦手&situation=バイト明けで疲れている。学食しか使えない。
```

## つまずきやすい点（実際に踏んだもの）

- **Spring Boot 4.1.1 は Jackson 3 を使う。** `import com.fasterxml.jackson.databind.ObjectMapper;` はコンパイルが通らない。正しくは `tools.jackson.databind.ObjectMapper`。ネットの記事や生成AIのコードは大半が旧パッケージなので注意。アノテーション（`@JsonIgnoreProperties` など）だけは従来どおり `com.fasterxml.jackson.annotation`。
- **Spring Boot 4 では `spring-boot-starter-web` が `spring-boot-starter-webmvc` に変わっている。**
- **`gemini-2.5-flash` は新しいAPIキーだと 404**（"no longer available to new users"）。**モデル一覧APIには出てくるのに呼ぶと404**なので紛らわしい。
- モデルは `application.properties` の `gemini.model` / `gemini.fallback-model` を変えるだけで差し替えられる。

### モデルが失敗する2つの理由

**503 と 429 は原因も対処も逆。** 混同すると「混雑だから待てば直る」と誤診する。

| | HTTP 503 `UNAVAILABLE` | HTTP 429 `RESOURCE_EXHAUSTED` |
|---|---|---|
| 本文 | `This model is currently experiencing high demand.` | `Quota exceeded ... limit: 20, model: ...` |
| 正体 | Google側の一時的な容量不足 | 無料枠の1日20回に到達 |
| 対処 | 再試行が有効。別モデルなら通ることが多い | **その日は回復しない。** 別モデル（別枠）へ逃げるしかない |
| 新モデルほど悪化 | する | しない（全モデル一律20回） |

### 実測（2026-09-04）

同じプロンプトで、最小リクエストとアプリと同じリクエスト（`responseMimeType: application/json`）を各3回ずつ比較した。

| モデル | 最小リクエスト | アプリと同じリクエスト | 備考 |
|---|---|---|---|
| **`gemini-3.5-flash`** | 3/3 | **3/3（12.1〜12.9秒）** | **本命。最も安定** |
| `gemini-3.6-flash` | 3/3 | 3/3（13.7〜**77.8**秒） | 予備。まれに極端に遅い（25秒で見切る設定が効く） |
| `gemini-3.7-flash` | 2/3 | 2/3 | |
| `gemini-3.8-flash` | 3/3 | **1/3** | 日本語の質は最も良いが通らない |
| `gemini-flash-latest` | — | — | **`gemini-3.8-flash` の別名。枠も共有**するので予備には使えない |
| `gemini-3.1-flash-lite` | — | 3〜5秒 | 速いが質は落ちる（9/4深夜の計測） |

**軽いリクエストなら3.6〜3.8もほぼ通る**（12回中11回成功）のに、アプリの本番リクエストになると3.8が崩れる。しかも失敗は**6〜25秒経ってから**返る（門前払いではなく、処理を始めてから落とされている）。thinking（推論）が重いリクエストほど容量に弾かれるということ。

### さらに速くしたいとき（未採用）

`generationConfig.thinkingConfig.thinkingLevel` を `low` にすると推論が浅くなり速くなる。3.5-flash での実測:

| | 所要時間 | thinkingトークン |
|---|---|---|
| 既定 | 7.8〜11.9秒 | 966〜1710 |
| `thinkingLevel: "low"` | **5.4〜5.8秒** | 482〜635 |

提案の中身の質は落ちなかったが、**3回中1回、JSONとして読めない応答**が返った。フォールバックが効くので画面は壊れないが、発表では確実性を優先して**採用していない**。

## 主なファイル

| ファイル | 役割 |
|---|---|
| `controller/DemoController.java` | `GET /` と `GET,POST /suggest` |
| `service/GeminiService.java` | プロンプト組み立て、Gemini呼び出し、JSON解釈 |
| `service/FallbackMenu.java` | API不通時の固定メニュー |
| `dto/SuggestionForm.java` | 入力フォームとバリデーション |
| `dto/SuggestionResponse.java` | AIの提案JSONの受け皿 |
| `templates/index.html` / `result.html` | 入力画面 / 結果画面 |
| `templates/fragments/suggestion-fields.html` | 入力画面・プロフィールで共通の提案条件フォーム |
| `static/css/record.css` / `suggestion.css` | 記録画面と提案フォームの見た目 |
| `static/js/suggestion.js` / `profile.js` | 提案送信中の表示、相談条件・目標体重・テーマカラーの反映 |

## この先（本番フェーズ）

MySQL + MyBatis とフォーム送信時の提案保存を導入済み。体重記録・グラフ・食事と運動の記録はブラウザー保存で利用できる。次にログイン、ユーザー別の記録のDB保存、提案履歴画面、そして「過去の体重推移・提案・実施状況をプロンプトに含める」を追加する。DBの設定・保存内容は [MySQLの初期設定](docs/database.md)、工程は [参考文献/プロジェクト概要.md](参考文献/プロジェクト概要.md) §11 を参照。
