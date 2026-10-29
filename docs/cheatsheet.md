# GEDCOM 7.0 チートシート

GEDCOM 7.0 で使われる主なタグ(属性)と意味の一覧。

- 「対応」列の ✓ は本アプリ(v1.0.0)で扱うタグ。対象は `docs/design/v1.0.0.md` の「実装要件 > 初期で許可する要素」
- 未対応のタグもインポート時に `extras` として保持され、エクスポートで出力される
- 正式な定義は [FamilySearch GEDCOM 7.0 仕様](https://gedcom.io/specifications/FamilySearchGEDCOMv7.html) を参照

## 1. 構文の基本

| 要素 | 例 | 意味 |
| --- | --- | --- |
| レベル | `0` / `1` / `2` | 行の階層。親より1大きい数字の行が子になる |
| 相互参照 ID (xref) | `@I1@` | レコードの識別子。レベル0の行でタグの前に置く |
| ポインタ | `1 FAMS @F1@` | 他のレコードへの参照。値に xref を書く |
| `@VOID@` | `1 HUSB @VOID@` | 参照先が存在しないことを表す空ポインタ |
| `@@` | `1 NOTE @@user` | 値の先頭の `@` のエスケープ |
| 拡張タグ | `_MYTAG` | `_` で始まるユーザー定義タグ。`HEAD.SCHMA.TAG` で URI と対応付ける |

## 2. レコード(レベル0)

| タグ | 名称 | 意味 | 対応 |
| --- | --- | --- | --- |
| `HEAD` | Header | ファイルの先頭。バージョン・作成元などのメタ情報 | ✓ |
| `TRLR` | Trailer | ファイルの終端 | ✓ |
| `INDI` | Individual | 個人 | ✓ |
| `FAM` | Family | 家族(夫婦とその子の組) | ✓ |
| `SUBM` | Submitter | データの提出者・作成者 | ✓ |
| `SOUR` | Source | 出典(文献・記録など) | |
| `REPO` | Repository | 出典の所蔵先(図書館・役所など) | |
| `OBJE` | Multimedia | 画像・音声などのマルチメディア | |
| `SNOTE` | Shared Note | 複数箇所から参照される共有メモ | |

## 3. ヘッダー(`HEAD` 配下)

| タグ | 名称 | 意味 | 対応 |
| --- | --- | --- | --- |
| `GEDC` | GEDCOM | GEDCOM 形式の情報 | ✓ |
| `GEDC.VERS` | Version | GEDCOM のバージョン(例: `7.0`) | ✓ |
| `SOUR` | Source | 作成したソフトウェアの識別子(`VERS` / `NAME` / `CORP` / `DATA` を子に持つ) | |
| `DEST` | Destination | 受け取り先のシステム | |
| `DATE` | Date | ファイルの作成日(`TIME` で時刻) | |
| `SUBM` | Submitter | 提出者レコードへのポインタ | ✓ |
| `COPR` | Copyright | 著作権表示 | |
| `LANG` | Language | 既定の言語(BCP 47 形式。例: `ja`) | |
| `PLAC.FORM` | Place Format | 地名の既定の階層構成(例: `市, 県, 国`) | |
| `NOTE` | Note | ファイル全体に関するメモ | |
| `SCHMA` | Schema | 拡張タグの定義。`TAG` で `_タグ名 URI` を宣言 | |

7.0 では文字コードは UTF-8 固定のため `CHAR` は使わない。

## 4. 個人(`INDI` 配下)

### 4-1. 基本情報

| タグ | 名称 | 意味 | 対応 |
| --- | --- | --- | --- |
| `NAME` | Name | 氏名。値は `名 /姓/` の形式(姓をスラッシュで囲む) | ✓ |
| `NAME.GIVN` | Given Name | 名 | ✓ |
| `NAME.SURN` | Surname | 姓 | ✓ |
| `NAME.NPFX` | Name Prefix | 名前の前置き敬称(例: Dr.) | |
| `NAME.NSFX` | Name Suffix | 名前の後置き(例: Jr.) | |
| `NAME.SPFX` | Surname Prefix | 姓の前置詞(例: van, de) | |
| `NAME.NICK` | Nickname | 愛称 | |
| `NAME.TYPE` | Name Type | 名前の種類(`BIRTH` 出生名 / `IMMIGRANT` 移民後 / `MAIDEN` 旧姓 / `MARRIED` 婚姻後 / `PROFESSIONAL` 芸名・筆名 / `AKA` 別名 / `OTHER`) | |
| `NAME.TRAN` | Translation | 別表記(読み仮名・ローマ字など。`LANG` で言語を指定) | |
| `SEX` | Sex | 性別(`M` 男性 / `F` 女性 / `X` その他 / `U` 不明) | ✓ |
| `FAMS` | Family as Spouse | 配偶者として属する家族へのポインタ | ✓ |
| `FAMC` | Family as Child | 子として属する家族へのポインタ | ✓ |
| `FAMC.PEDI` | Pedigree | 親子関係の種類(`BIRTH` 実子 / `ADOPTED` 養子 / `FOSTER` 里子 / `SEALING` LDS 結び固め / `OTHER`) | |
| `ALIA` | Alias | 同一人物と思われる別の `INDI` へのポインタ | |
| `ASSO` | Association | 関係者へのポインタ(`ROLE` で役割。例: `GODP` 代父母、`WITN` 証人) | |
| `ANCI` / `DESI` | Ancestor / Descendant Interest | 祖先・子孫の調査に関心のある提出者 | |

### 4-2. 個人イベント

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `BIRT` | Birth | 出生 |
| `DEAT` | Death | 死亡 |
| `BURI` | Burial | 埋葬 |
| `CREM` | Cremation | 火葬 |
| `ADOP` | Adoption | 養子縁組(`FAMC` で養親の家族、`ADOP` で `HUSB` / `WIFE` / `BOTH`) |
| `CHR` | Christening | 幼児洗礼・命名式 |
| `CHRA` | Adult Christening | 成人洗礼 |
| `BAPM` | Baptism | 洗礼 |
| `BARM` / `BASM` | Bar / Bas Mitzvah | ユダヤ教の成人式(男子 / 女子) |
| `BLES` | Blessing | 祝福 |
| `CONF` | Confirmation | 堅信 |
| `FCOM` | First Communion | 初聖体 |
| `ORDN` | Ordination | 聖職叙任 |
| `GRAD` | Graduation | 卒業 |
| `RETI` | Retirement | 退職 |
| `EMIG` | Emigration | 国外への移住 |
| `IMMI` | Immigration | 国内への移住 |
| `NATU` | Naturalization | 帰化 |
| `CENS` | Census | 国勢調査への記載 |
| `PROB` | Probate | 遺言の検認 |
| `WILL` | Will | 遺言の作成 |
| `EVEN` | Event | 上記以外のイベント(`TYPE` で内容を記述) |

### 4-3. 個人属性

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `OCCU` | Occupation | 職業 |
| `EDUC` | Education | 学歴 |
| `RESI` | Residence | 居住(`ADDR` / `PLAC` で居住地) |
| `RELI` | Religion | 宗教 |
| `NATI` | Nationality | 国籍・民族 |
| `TITL` | Title | 称号・爵位 |
| `CAST` | Caste | 身分・階級 |
| `DSCR` | Description | 身体的特徴 |
| `PROP` | Property | 所有財産 |
| `IDNO` | ID Number | 識別番号(`TYPE` で種類を指定) |
| `SSN` | Social Security Number | 米国の社会保障番号 |
| `NCHI` | Number of Children | 子の数 |
| `NMR` | Number of Marriages | 婚姻回数 |
| `FACT` | Fact | 上記以外の属性(`TYPE` で内容を記述) |

## 5. 家族(`FAM` 配下)

### 5-1. 構成員

| タグ | 名称 | 意味 | 対応 |
| --- | --- | --- | --- |
| `HUSB` | Husband | 夫(父)にあたる `INDI` へのポインタ | ✓ |
| `WIFE` | Wife | 妻(母)にあたる `INDI` へのポインタ | ✓ |
| `CHIL` | Child | 子の `INDI` へのポインタ(出生順に並べる) | ✓ |
| `NCHI` | Number of Children | 子の数 | |

`HUSB` / `WIFE` は役割名であり、性別や婚姻関係を必須とするものではない。

### 5-2. 家族イベント

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `MARR` | Marriage | 婚姻 |
| `ENGA` | Engagement | 婚約 |
| `MARB` | Marriage Bann | 婚姻の公示 |
| `MARC` | Marriage Contract | 婚姻契約 |
| `MARL` | Marriage License | 婚姻許可証の取得 |
| `MARS` | Marriage Settlement | 婚前の財産取り決め |
| `DIV` | Divorce | 離婚 |
| `DIVF` | Divorce Filed | 離婚の申し立て |
| `ANUL` | Annulment | 婚姻の無効 |
| `CENS` | Census | 国勢調査への記載 |
| `RESI` | Residence | 居住 |
| `EVEN` | Event | 上記以外のイベント |
| `FACT` | Fact | 上記以外の属性 |

家族イベントでは `HUSB.AGE` / `WIFE.AGE` でイベント時の各人の年齢を記録できる。

## 6. イベント・属性の詳細(イベント配下に置く)

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `TYPE` | Type | イベント・属性の分類の補足 |
| `DATE` | Date | 日付(書式は 9 章)。`TIME` で時刻、`PHRASE` で原文の表現 |
| `SDATE` | Sort Date | 並べ替え用の日付 |
| `PLAC` | Place | 場所。値は小さい単位から順にカンマ区切り(例: `千代田区, 東京都, 日本`) |
| `PLAC.FORM` | Place Format | 地名の階層構成 |
| `PLAC.MAP` | Map | 座標(`LATI` 緯度 `N35.68` / `LONG` 経度 `E139.76`) |
| `ADDR` | Address | 住所(`ADR1`〜`ADR3` / `CITY` / `STAE` / `POST` / `CTRY`) |
| `PHON` / `EMAIL` / `FAX` / `WWW` | - | 電話番号 / メール / FAX / Web サイト |
| `AGE` | Age | イベント時の年齢(例: `25y 3m`、`> 60y`) |
| `AGNC` | Agency | 担当した機関 |
| `CAUS` | Cause | 原因(死因など) |
| `RELI` | Religion | 関連する宗教 |
| `NO` | Non-event | そのイベントが起きなかったことの記録(例: `1 NO MARR`) |

## 7. 出典・メモ・マルチメディア

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `SOUR @S1@` | Source Citation | 出典レコードの引用 |
| `SOUR.PAGE` | Page | 出典内の位置(ページ・項番など) |
| `SOUR.DATA` | Data | 出典から抜き出した内容(`TEXT` / `DATE`) |
| `SOUR.EVEN` | Event | 出典が記録しているイベントの種類(`ROLE` で人物の役割) |
| `SOUR.QUAY` | Quality | 証拠の確度(`0` 信頼性なし / `1` 疑わしい / `2` 二次資料 / `3` 一次資料) |
| `AUTH` | Author | 著者(`SOUR` レコード) |
| `TITL` | Title | 題名(`SOUR` / `OBJE`) |
| `ABBR` | Abbreviation | 略称(`SOUR` レコード) |
| `PUBL` | Publication | 出版情報(`SOUR` レコード) |
| `TEXT` | Text | 本文の書き起こし |
| `REPO` | Repository | 所蔵先への参照(`CALN` 請求記号、`CALN.MEDI` 媒体) |
| `NOTE` | Note | メモ(その場に書く) |
| `SNOTE` | Shared Note | 共有メモ `SNOTE` レコードへのポインタ |
| `MIME` | Media Type | メモの形式(`text/plain` / `text/html`) |
| `OBJE` | Multimedia Link | マルチメディアレコードへのポインタ(`CROP` で切り抜き範囲) |
| `FILE` | File | ファイルの参照(URL またはパス) |
| `FILE.FORM` | Format | ファイルの media type(例: `image/jpeg`。`MEDI` で媒体の種類) |

## 8. 共通・管理用

| タグ | 名称 | 意味 |
| --- | --- | --- |
| `CONT` | Continued | 前行の値の改行後の続き(構文層で結合する) |
| `LANG` | Language | 言語(BCP 47 形式) |
| `TRAN` | Translation | 別言語・別表記での値 |
| `UID` | Unique Identifier | 全世界で一意な ID(UUID) |
| `EXID` | External Identifier | 外部システムでの ID(`TYPE` で発行元 URI) |
| `REFN` | Reference Number | ユーザー定義の参照番号(`TYPE` で種類) |
| `RESN` | Restriction | 公開制限(`CONFIDENTIAL` 機密 / `LOCKED` 変更不可 / `PRIVACY` 非公開) |
| `CHAN` | Change | 最終更新日時(`DATE` / `TIME`) |
| `CREA` | Creation | 作成日時(`DATE` / `TIME`) |
| `PHRASE` | Phrase | 構造化された値を補う自由記述 |

LDS(末日聖徒イエス・キリスト教会)の儀式用に `BAPL` / `CONL` / `ENDL` / `INIL` / `SLGC` / `SLGS`(`TEMP` 神殿、`STAT` 状態)もある。

## 9. 日付の書式(`DATE` の値)

| 書式 | 意味 | 例 |
| --- | --- | --- |
| `日 月 年` | 正確な日付(月は英語3文字) | `29 OCT 2026` / `OCT 2026` / `2026` |
| `ABT 日付` | 頃(About) | `ABT 1900` |
| `CAL 日付` | 計算で求めた日付(Calculated) | `CAL 1850` |
| `EST 日付` | 推定(Estimated) | `EST 1800` |
| `BEF 日付` | より前(Before) | `BEF 1900` |
| `AFT 日付` | より後(After) | `AFT 1900` |
| `BET 日付 AND 日付` | 期間内のどこか(Between) | `BET 1900 AND 1910` |
| `FROM 日付 TO 日付` | 期間の継続(`FROM` / `TO` 片方のみも可) | `FROM 1900 TO 1910` |
| 暦の指定 | 先頭に暦名を付ける(`GREGORIAN` 既定 / `JULIAN` / `FRENCH_R` / `HEBREW`) | `JULIAN 1 JAN 1700` |
| `BCE` | 紀元前 | `500 BCE` |

月の表記: `JAN` `FEB` `MAR` `APR` `MAY` `JUN` `JUL` `AUG` `SEP` `OCT` `NOV` `DEC`

## 10. 記述例

```
0 HEAD
1 GEDC
2 VERS 7.0
1 SUBM @U1@
0 @U1@ SUBM
1 NAME 山田太郎
0 @I1@ INDI
1 NAME 太郎 /山田/
2 GIVN 太郎
2 SURN 山田
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME 花子 /山田/
2 GIVN 花子
2 SURN 山田
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME 一郎 /山田/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR
```
