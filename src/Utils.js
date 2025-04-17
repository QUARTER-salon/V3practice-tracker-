/**
 * 美容師練習管理Webアプリ - ユーティリティ関数
 * 
 * 共通で使用するユーティリティ関数を提供するファイル
 * 
 * @version 1.0.0
 */

/**
 * 現在の日時を取得する
 * @return {string} フォーマットされた日時文字列 (YYYY-MM-DD HH:MM:SS)
 */
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 日付をフォーマットする
 * @param {Date} date - フォーマットする日付
 * @return {string} YYYY-MM-DD 形式の文字列
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 現在の日付を取得する
 * @return {string} YYYY-MM-DD 形式の文字列
 */
function getCurrentDate() {
  return formatDate(new Date());
}

/**
 * データの二次元配列からオブジェクトの配列に変換する
 * @param {Array} data - スプレッドシートから取得した二次元配列
 * @param {Array} headers - ヘッダー行（列名）の配列
 * @return {Array} オブジェクトの配列
 */
function convertToObjectArray(data, headers) {
  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * 指定したシートのすべてのデータを取得する
 * @param {string} sheetName - シート名
 * @return {Array} データの二次元配列（ヘッダー行を含まない）
 */
function getAllDataFromSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    // データがない場合は空配列を返す
    if (lastRow <= 1) {
      return [];
    }
    
    // ヘッダー行を除いたデータを取得
    return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  } catch (error) {
    Logger.log('getAllDataFromSheet error: ' + error.toString());
    throw error;
  }
}

/**
 * 指定したシートのヘッダー行を取得する
 * @param {string} sheetName - シート名
 * @return {Array} ヘッダー行の配列
 */
function getSheetHeaders(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    
    const lastColumn = sheet.getLastColumn();
    
    // ヘッダー行がない場合は空配列を返す
    if (lastColumn === 0) {
      return [];
    }
    
    // ヘッダー行を取得
    return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  } catch (error) {
    Logger.log('getSheetHeaders error: ' + error.toString());
    throw error;
  }
}

/**
 * 指定したシートにデータを追加する
 * @param {string} sheetName - シート名
 * @param {Array} rowData - 追加する行データの配列
 * @return {boolean} 追加が成功したかどうか
 */
function appendDataToSheet(sheetName, rowData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    
    // 最終行の次の行にデータを追加
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    return true;
  } catch (error) {
    Logger.log('appendDataToSheet error: ' + error.toString());
    throw error;
  }
}

/**
 * 指定したシートの特定の行を更新する
 * @param {string} sheetName - シート名
 * @param {number} rowIndex - 更新する行のインデックス（1始まり、ヘッダー行を含む）
 * @param {Array} rowData - 更新するデータの配列
 * @return {boolean} 更新が成功したかどうか
 */
function updateSheetRow(sheetName, rowIndex, rowData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    
    // 指定された行にデータを設定
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    
    return true;
  } catch (error) {
    Logger.log('updateSheetRow error: ' + error.toString());
    throw error;
  }
}

/**
 * 指定条件に一致する行をシートから検索する
 * @param {string} sheetName - シート名
 * @param {number} columnIndex - 検索対象の列インデックス（0始まり）
 * @param {*} searchValue - 検索値
 * @return {Array} 一致した行のインデックス配列（1始まり、ヘッダー行を含む）
 */
function findRowsByValue(sheetName, columnIndex, searchValue) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    
    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(1, columnIndex + 1, lastRow, 1).getValues();
    
    // 検索条件に一致する行のインデックスを収集
    const matchedRows = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === searchValue) {
        matchedRows.push(i + 1); // 1始まりのインデックスに変換
      }
    }
    
    return matchedRows;
  } catch (error) {
    Logger.log('findRowsByValue error: ' + error.toString());
    throw error;
  }
}

/**
 * スプレッドシートの特定のシートからデータを取得してJSONオブジェクトの配列に変換する
 * @param {string} sheetName - データを取得するシート名
 * @return {Array} JSONオブジェクトの配列
 */
function getSheetDataAsJSON(sheetName) {
  try {
    const headers = getSheetHeaders(sheetName);
    const data = getAllDataFromSheet(sheetName);
    return convertToObjectArray(data, headers);
  } catch (error) {
    Logger.log('getSheetDataAsJSON error: ' + error.toString());
    throw error;
  }
}

/**
 * マスターシートから有効なデータのみを取得する
 * @param {string} masterSheetName - マスターシート名
 * @return {Array} 有効なデータのJSONオブジェクト配列
 */
function getActiveMasterData(masterSheetName) {
  try {
    const allData = getSheetDataAsJSON(masterSheetName);
    // 有効フラグがある場合はフィルタリング
    if (allData.length > 0 && '有効フラグ' in allData[0]) {
      return allData.filter(item => item['有効フラグ'] !== false);
    }
    return allData;
  } catch (error) {
    Logger.log('getActiveMasterData error: ' + error.toString());
    throw error;
  }
}

/**
 * 値が空かどうかチェックする
 * @param {*} value - チェックする値
 * @return {boolean} 値が空の場合はtrue
 */
function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

/**
 * エラーメッセージを標準化する
 * @param {Error} error - エラーオブジェクト
 * @return {string} ユーザー向けエラーメッセージ
 */
function formatErrorMessage(error) {
  Logger.log('Error: ' + error.toString());
  return 'エラーが発生しました: ' + error.message || error.toString();
}

/**
 * JWTトークンを生成する
 * @param {Object} payload - トークンに含める情報
 * @param {string} secret - 署名用の秘密鍵
 * @param {number} expiresIn - 有効期限（秒）
 * @return {string} 生成されたJWTトークン
 */
function generateJWT(payload, secret, expiresIn) {
  // ヘッダー
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // ペイロード（expiresAtを追加）
  const now = Math.floor(Date.now() / 1000);
  payload.iat = now;
  payload.exp = now + expiresIn;
  
  // Base64URLエンコード
  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '');
  const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  
  // 署名
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const signature = Utilities.computeHmacSha256Signature(signatureInput, secret);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  
  // JWTトークン
  return encodedHeader + '.' + encodedPayload + '.' + encodedSignature;
}

/**
 * JWTトークンを検証する
 * @param {string} token - 検証するJWTトークン
 * @param {string} secret - 署名検証用の秘密鍵
 * @return {Object} 検証結果（success, payload）
 */
function verifyJWT(token, secret) {
  try {
    // トークンの分解
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { success: false, error: '不正なトークン形式です。' };
    }
    
    const encodedHeader = parts[0];
    const encodedPayload = parts[1];
    const providedSignature = parts[2];
    
    // 署名の検証
    const signatureInput = encodedHeader + '.' + encodedPayload;
    const signature = Utilities.computeHmacSha256Signature(signatureInput, secret);
    const encodedSignature = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
    
    if (providedSignature !== encodedSignature) {
      return { success: false, error: '署名が不正です。' };
    }
    
    // ペイロードのデコード
    const payloadJson = Utilities.newBlob(
      Utilities.base64DecodeWebSafe(encodedPayload + '==')
    ).getDataAsString();
    const payload = JSON.parse(payloadJson);
    
    // 有効期限の検証
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { success: false, error: 'トークンの有効期限が切れています。' };
    }
    
    return { success: true, payload: payload };
  } catch (error) {
    return { success: false, error: 'トークン検証中にエラーが発生しました。' };
  }
}