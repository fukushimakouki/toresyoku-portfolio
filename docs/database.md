# MySQLの初期設定（Windows）

このプロジェクトは MySQL + MyBatis で入力と提案を保存します。
MyBatis Starter は Spring Boot 4.1 系対応の 4.1.0 を使用しています。
[MyBatis公式リリース](https://github.com/mybatis/spring-boot-starter/releases)

## 1. MySQL Serverをインストール

### XAMPPを使う場合

別途MySQL Serverをインストールする必要はありません。
XAMPP Control Panelで **MySQL → Start** を押します。
XAMPPの「MySQL」の実体はMariaDBです。[XAMPP公式FAQ](https://www.apachefriends.org/faq_windows)
この手順では両方で使える `utf8mb4_unicode_ci` を使用します。

手順2の接続コマンドは次に読み替えてください（標準のインストール先の場合）。

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' -u root -p
```

rootのパスワードが未設定なら、パスワード入力でEnterを押します。
その後は手順2のSQLで専用ユーザーを作成し、手順3・4へ進んでください。
phpMyAdminを使いたい場合だけApacheも起動し、 http://localhost/phpmyadmin/ を開きます。
トレ食自体はGradleで起動して http://localhost:8080/ にアクセスします。
Apacheが8080番を使っている場合はトレ食を `bootRun --args="--server.port=8081"` で起動し、8081番を開いてください。

### MySQL Serverを単独で使う場合

[MySQL Community Server](https://dev.mysql.com/downloads/mysql/) から
MySQL 8.4 LTS の Windows 用 MSI を選び、インストールします。
続いて MySQL Configurator でポート `3306`、Windowsサービスの自動起動を設定し、
管理者 `root` のパスワードを決めます。ローカル開発では外部からの接続用にファイアウォールを開く必要はありません。
Workbench は任意です。Server 本体が必要です。
[公式Windowsインストール手順](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html)

## 2. データベースとアプリ専用ユーザーを作る（初回のみ）

PowerShellで接続します。インストール先を変えた場合はパスを合わせてください。

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -u root -p
```

求められたら root のパスワードを入力します。次のSQLのパスワード部分を自分で決めたものに置き換え、`mysql>` の画面で実行します。
パスワードはチャットやGitに貼らないでください。

```sql
CREATE DATABASE IF NOT EXISTS toresyoku CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'toresyoku_app'@'localhost' IDENTIFIED BY 'ここを自分のDB用パスワードに変更';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON toresyoku.* TO 'toresyoku_app'@'localhost';
EXIT;
```

既に同名ユーザーがある場合は作り直さず、そのユーザーのパスワードを使います。

## 3. 接続情報を設定

リポジトリ直下の **既存の** `secrets.properties` に次の1行を追記します。
Gemini APIキーの行はそのまま残してください。

```properties
spring.datasource.password=手順2で決めたDB用パスワード
```

ユーザー名の既定値は `toresyoku_app`、接続先は `localhost:3306/toresyoku` です。
変更する場合は `spring.datasource.username` / `spring.datasource.url` も同じファイルに追記できます。
環境変数 `DB_PASSWORD` / `DB_USERNAME` / `DB_URL` でも設定できます。
Java properties 形式では `\` は `\\` と書きます。

## 4. 起動して保存を確認

```powershell
.\gradlew.bat bootRun
```

起動時に `src/main/resources/schema.sql` が `suggestion` テーブルを作成します。
DB本体・ユーザーは自動作成されないため、手順2を先に行ってください。
ブラウザで http://localhost:8080/start を開き「今日の提案をつくる」を押すと、保存結果が表示されます。
APIを呼ばず確認する場合は `bootRun --args="--gemini.mock=true"` で起動します。

MySQLに接続し、次のSQLで保存を確認できます。

```sql
USE toresyoku;
SELECT id, created_at, source FROM suggestion ORDER BY created_at DESC LIMIT 10;
```

保存内容は入力プロフィール・今日の状況のJSON、提案のJSON、作成日時、
生成元（`AI` / `SAMPLE` / `FALLBACK`）です。再起動後もMySQLに残ります。
POST送信のみ保存し、GETのデモURLや入力エラー時は保存しません。
ログイン、ユーザー別の紐付け、履歴一覧画面はまだ未実装です。
現在はローカル開発用です。複数ユーザーへの公開前に認証とデータの所有者管理を追加してください。

`schema.sql` は既存データを削除しません。今後カラムを変更しても既存テーブルは自動変更されないため、
その段階でバージョン管理したマイグレーションを追加します。

## テストとエラー対応

`.\gradlew.bat test` はテスト専用のインメモリH2（MySQLモード）を使い、
秘密情報・実際のMySQL・Gemini APIには接続しません。
実際のMySQLとの接続確認は手順4で行ってください。

- `Communications link failure`：MySQLサービスが起動しているか、ポートが3306か確認。
- `Unknown database 'toresyoku'`：手順2のデータベース作成を実行。
- `Access denied`：ユーザー名・パスワード・権限を確認。
- 起動にDB接続が必要です。MySQLの初期設定が完了するまではアプリは起動しません。
