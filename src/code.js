/**
 * 美容師練習管理Webアプリ - メインコード
 * 
 * アプリケーションのエントリポイントと定数を定義するファイル
 * 
 * @version 1.0.0
 */

// スプレッドシートID（本番環境では実際のIDに置き換え）
const SPREADSHEET_ID = '1zQq8_wyOb1ldcQtNO-y0gLDsV7FQOa31aNpldX43O5Y';

// 各シート名の定数
const STAFF_MASTER_SHEET_NAME = 'スタッフマスター';
const PRACTICE_RECORD_SHEET_NAME = '練習記録';
const INVENTORY_SHEET_NAME = 'ウィッグ在庫';
const STORE_MASTER_SHEET_NAME = '店舗マスター';
const ROLE_MASTER_SHEET_NAME = '役職マスター';
const TRAINER_MASTER_SHEET_NAME = 'トレーナーマスター';
const TECH_CATEGORY_SHEET_NAME = '技術カテゴリーマスター';
const TECH_DETAIL_SHEET_NAME = '詳細技術項目マスター';

// アプリのバージョン
const APP_VERSION = '1.0.0';

// セッションキー
const SESSION_USER_KEY = 'loggedInUser';
const SESSION_ADMIN_KEY = 'isAdmin';

/**
 * Web アプリケーションとして公開した際のエントリポイント
 * @return {HtmlOutput} HTML出力
 */
function doGet() {
  try {
    // セッションからユーザー情報を取得
    const userSession = CacheService.getUserCache().get(SESSION_USER_KEY);
    
    // ログインしていない場合はログイン画面を表示
    if (!userSession) {
      return HtmlService.createTemplateFromFile('html/login')
        .evaluate()
        .setTitle('美容師練習管理 - ログイン')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // ログイン済みの場合はインデックスページを表示
    return HtmlService.createTemplateFromFile('html/index')
      .evaluate()
      .setTitle('美容師練習管理')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('doGet error: ' + error.toString());
    return HtmlService.createHtmlOutput(
      '<h1>エラーが発生しました</h1><p>' + error.toString() + '</p><p><a href="' + ScriptApp.getService().getUrl() + '">再読み込み</a></p>'
    );
  }
}

/**
 * HTML ファイルをインクルードするためのヘルパー関数
 * @param {string} filename - インクルードするHTMLファイル名
 * @return {string} HTMLコンテンツ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * アプリケーションの初期化処理（必要に応じてスプレッドシートの初期化など）
 * @return {boolean} 初期化が成功したかどうか
 */
function initializeApp() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 必要なシートが存在しない場合は作成
    createSheetIfNotExists(ss, PRACTICE_RECORD_SHEET_NAME, [
      '記録日時', '店舗', '役職', '名前', '社員番号', 'トレーナー', '練習日', '練習時間',
      '技術カテゴリー', '詳細技術項目', '練習回数', '新品ウィッグ使用数', '評価', 'その他詳細', 'アプリバージョン'
    ]);
    
    createSheetIfNotExists(ss, INVENTORY_SHEET_NAME, ['店舗名', '在庫数']);
    createSheetIfNotExists(ss, STORE_MASTER_SHEET_NAME, ['店舗ID', '店舗名', '有効フラグ']);
    createSheetIfNotExists(ss, ROLE_MASTER_SHEET_NAME, ['役職ID', '役職名', '有効フラグ']);
    createSheetIfNotExists(ss, TRAINER_MASTER_SHEET_NAME, ['トレーナーID', '名前', '店舗', '有効フラグ']);
    createSheetIfNotExists(ss, TECH_CATEGORY_SHEET_NAME, ['カテゴリーID', 'カテゴリー名', '対象役職', '有効フラグ']);
    createSheetIfNotExists(ss, TECH_DETAIL_SHEET_NAME, ['項目ID', 'カテゴリーID', '項目名', '有効フラグ']);
    
    // スタッフマスターは既に存在している前提
    
    return true;
  } catch (error) {
    Logger.log('initializeApp error: ' + error.toString());
    return false;
  }
}

/**
 * シートが存在しない場合に作成するヘルパー関数
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @param {string} sheetName - シート名
 * @param {Array} headers - ヘッダー行の配列
 */
function createSheetIfNotExists(ss, sheetName, headers) {
  try {
    // シートの存在チェック
    let sheet = ss.getSheetByName(sheetName);
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー行を設定
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }
  } catch (error) {
    Logger.log('createSheetIfNotExists error for ' + sheetName + ': ' + error.toString());
    throw error;
  }
}

/**
 * アプリのバージョンを取得
 * @return {string} アプリのバージョン
 */
function getAppVersion() {
  return APP_VERSION;
}