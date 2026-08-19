# Histoire Time card Scanner POC

Histoire Time card Phase 1 POCのQR読取専用静的サイトです。

- QR文字列をカメラで読み取り、固定されたApps Script Webアプリへ戻します。
- PIN、端末トークン、HMAC鍵、Spreadsheet認証情報は保持しません。
- challengeはURL fragmentから受け取り、読み込み直後にアドレスバーから除去します。
- 依存ライブラリはバージョンを固定してリポジトリ内に配置しています。

このリポジトリにはApps Script本体、テストデータ、運用秘密情報を配置しません。
