/**
 * 美容師練習管理Webアプリ - 認証機能
 * 
 * ユーザー認証、ログイン・ログアウト機能を提供するファイル
 * 
 * @version 1.0.0
 */

/**
 * Googleアカウントでログインする
 * @return {Object} ログインユーザー情報またはエラー
 */
function loginWithGoogle() {
  try {
    // Google認証情報からメールアドレスを取得
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      return { success: false, error: 'Googleアカウントの情報が取得できませんでした。' };
    }
    
    // スタッフマスターからユーザー情報を検索
    const staffData = getStaffByEmail(userEmail);
    
    if (!staffData) {
      return { success: false, error: '登録されていないGoogleアカウントです。管理者にお問い合わせください。' };
    }
    
    // セッションにユーザー情報を保存
    saveUserSession(staffData);
    
    return { success: true, user: staffData };
  } catch (error) {
    Logger.log('loginWithGoogle error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * ID/パスワードでログインする
 * @param {string} employeeId - 社員番号
 * @param {string} password - パスワード
 * @return {Object} ログインユーザー情報またはエラー
 */
function loginWithCredentials(employeeId, password) {
  try {
    if (!employeeId || !password) {
      return { success: false, error: '社員番号とパスワードを入力してください。' };
    }
    
    // スタッフマスターからユーザー情報を検索
    const staffData = getStaffByEmployeeId(employeeId);
    
    if (!staffData) {
      return { success: false, error: '社員番号またはパスワードが正しくありません。' };
    }
    
    // パスワード検証（実装は別途検討）
    if (!validatePassword(password, staffData.passwordHash)) {
      return { success: false, error: '社員番号またはパスワードが正しくありません。' };
    }
    
    // セッションにユーザー情報を保存
    saveUserSession(staffData);
    
    return { success: true, user: staffData };
  } catch (error) {
    Logger.log('loginWithCredentials error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * パスワードを検証する（簡易実装）
 * 本番環境では適切なハッシュ化と検証方法を実装すること
 * @param {string} inputPassword - 入力されたパスワード
 * @param {string} storedHash - 保存されているハッシュ
 * @return {boolean} パスワードが一致するかどうか
 */
function validatePassword(inputPassword, storedHash) {
  // 簡易実装（本番環境では適切なハッシュ化と検証を実装）
  return Utilities.base64Encode(inputPassword) === storedHash;
}

/**
 * メールアドレスでスタッフを検索
 * @param {string} email - 検索するメールアドレス
 * @return {Object} スタッフ情報
 */
function getStaffByEmail(email) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('スタッフマスターシートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // メールアドレスのカラムインデックスを特定
    const emailColumnIndex = headers.indexOf('メールアドレス');
    
    if (emailColumnIndex === -1) {
      throw new Error('スタッフマスターシートにメールアドレス列がありません。');
    }
    
    // 該当するスタッフを検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailColumnIndex] === email) {
        // スタッフ情報をオブジェクトに変換
        const staffData = {};
        headers.forEach((header, index) => {
          staffData[header] = data[i][index];
        });
        return staffData;
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('getStaffByEmail error: ' + error.toString());
    throw error;
  }
}

/**
 * 社員番号でスタッフを検索
 * @param {string} employeeId - 検索する社員番号
 * @return {Object} スタッフ情報
 */
function getStaffByEmployeeId(employeeId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('スタッフマスターシートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 社員番号のカラムインデックスを特定
    const employeeIdColumnIndex = headers.indexOf('社員番号');
    
    if (employeeIdColumnIndex === -1) {
      throw new Error('スタッフマスターシートに社員番号列がありません。');
    }
    
    // 該当するスタッフを検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][employeeIdColumnIndex] === employeeId) {
        // スタッフ情報をオブジェクトに変換
        const staffData = {};
        headers.forEach((header, index) => {
          staffData[header] = data[i][index];
        });
        return staffData;
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('getStaffByEmployeeId error: ' + error.toString());
    throw error;
  }
}

/**
 * ユーザーセッションを保存
 * @param {Object} userData - 保存するユーザーデータ
 */
function saveUserSession(userData) {
  try {
    // ユーザー情報をJSON文字列化してキャッシュに保存
    const userJson = JSON.stringify(userData);
    CacheService.getUserCache().put(SESSION_USER_KEY, userJson, 21600); // 6時間有効
    
    // 管理者かどうかを確認して保存
    const isAdmin = userData['管理者フラグ'] === true;
    CacheService.getUserCache().put(SESSION_ADMIN_KEY, isAdmin.toString(), 21600); // 6時間有効
  } catch (error) {
    Logger.log('saveUserSession error: ' + error.toString());
    throw error;
  }
}

/**
 * 現在ログインしているユーザー情報を取得
 * @return {Object} ログインユーザー情報またはnull
 */
function getCurrentUser() {
  try {
    const userJson = CacheService.getUserCache().get(SESSION_USER_KEY);
    
    if (!userJson) {
      return null;
    }
    
    return JSON.parse(userJson);
  } catch (error) {
    Logger.log('getCurrentUser error: ' + error.toString());
    return null;
  }
}

/**
 * ユーザーが管理者かどうかを確認
 * @return {boolean} 管理者の場合はtrue
 */
function isUserAdmin() {
  try {
    const isAdmin = CacheService.getUserCache().get(SESSION_ADMIN_KEY);
    return isAdmin === 'true';
  } catch (error) {
    Logger.log('isUserAdmin error: ' + error.toString());
    return false;
  }
}

/**
 * ログアウト処理
 * @return {boolean} ログアウトが成功したかどうか
 */
function logout() {
  try {
    // セッション情報を削除
    CacheService.getUserCache().remove(SESSION_USER_KEY);
    CacheService.getUserCache().remove(SESSION_ADMIN_KEY);
    return true;
  } catch (error) {
    Logger.log('logout error: ' + error.toString());
    return false;
  }
}