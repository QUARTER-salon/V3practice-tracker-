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
    const sessionInfo = saveUserSession(staffData);
    
    return { success: true, user: staffData, ...sessionInfo };
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
    
    // パスワード検証
    const salt = staffData.salt || '';
    if (!validatePassword(password, staffData.passwordHash, salt)) {
      return { success: false, error: '社員番号またはパスワードが正しくありません。' };
    }
    
    // 初回ログイン時にsaltがない場合は生成して保存
    if (!salt) {
      const newSalt = generateSalt();
      const newHash = hashPassword(password, newSalt);
      updateStaffPassword(employeeId, newHash, newSalt);
    }
    
    // セッションにユーザー情報を保存
    const sessionInfo = saveUserSession(staffData);
    
    return { success: true, user: staffData, ...sessionInfo };
  } catch (error) {
    Logger.log('loginWithCredentials error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * 全スタッフのパスワードハッシュを安全な形式に移行する
 * @return {Object} 移行結果
 */
function migrateAllPasswordsToSecureHash() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('スタッフマスターシートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // カラムインデックスを特定
    const employeeIdIdx = headers.indexOf('社員番号');
    const passwordHashIdx = headers.indexOf('passwordHash');
    const saltIdx = headers.indexOf('salt');
    
    if (employeeIdIdx === -1 || passwordHashIdx === -1 || saltIdx === -1) {
      throw new Error('必要なカラムが見つかりません。');
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // 各スタッフのパスワード処理
    for (let i = 1; i < data.length; i++) {
      const currentHash = data[i][passwordHashIdx];
      const currentSalt = data[i][saltIdx];
      const employeeId = data[i][employeeIdIdx];
      
      // ソルトがない、またはパスワードが平文と思われる場合
      if (!currentSalt || currentHash.length < 20) {
        // 平文パスワードと仮定して安全なハッシュに変換
        const newSalt = generateSalt();
        const newHash = hashPassword(currentHash, newSalt);
        
        // 更新
        sheet.getRange(i + 1, passwordHashIdx + 1).setValue(newHash);
        sheet.getRange(i + 1, saltIdx + 1).setValue(newSalt);
        
        migratedCount++;
        Logger.log(`移行完了: ${employeeId}`);
      } else {
        skippedCount++;
      }
    }
    
    return { 
      success: true, 
      message: `${migratedCount}件のパスワードを安全なハッシュ形式に移行しました。${skippedCount}件はすでに安全な形式です。` 
    };
  } catch (error) {
    Logger.log('migrateAllPasswordsToSecureHash error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * ソルトを生成する
 * @return {string} 生成されたソルト
 */
function generateSalt() {
  return Utilities.getUuid();  // ランダムなUUID生成
}

/**
 * パスワードをハッシュ化する
 * @param {string} password - ハッシュ化するパスワード
 * @param {string} salt - ソルト
 * @return {string} ハッシュ化されたパスワード（Base64エンコード）
 */
function hashPassword(password, salt) {
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt
  );
  return Utilities.base64Encode(hash);
}

/**
 * パスワードを検証する
 * @param {string} inputPassword - 入力されたパスワード
 * @param {string} storedHash - 保存されているハッシュ
 * @param {string} salt - ソルト（存在する場合）
 * @return {boolean} パスワードが一致するかどうか
 */
function validatePassword(inputPassword, storedHash, salt) {
  if (!salt) {
    // 古い認証方式（基本的にはマイグレーション用）
    return Utilities.base64Encode(inputPassword) === storedHash;
  }
  
  // 新しい認証方式（SHA-256 + salt）
  const hashedInput = hashPassword(inputPassword, salt);
  return hashedInput === storedHash;
}

/**
 * スタッフのパスワードを更新する
 * @param {string} employeeId - 社員番号
 * @param {string} passwordHash - 新しいパスワードハッシュ
 * @param {string} salt - 新しいソルト
 * @return {boolean} 更新が成功したかどうか
 */
function updateStaffPassword(employeeId, passwordHash, salt) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('スタッフマスターシートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 各カラムのインデックスを特定
    const employeeIdColumnIndex = headers.indexOf('社員番号');
    const passwordHashColumnIndex = headers.indexOf('passwordHash');
    const saltColumnIndex = headers.indexOf('salt');
    
    if (employeeIdColumnIndex === -1) {
      throw new Error('スタッフマスターシートに社員番号列がありません。');
    }
    
    if (passwordHashColumnIndex === -1 || saltColumnIndex === -1) {
      // saltまたはpasswordHash列がない場合は追加
      // この処理は管理者が事前に行うことを推奨
      throw new Error('スタッフマスターシートの列構成が不適切です。管理者に連絡してください。');
    }
    
    // 該当するスタッフを検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][employeeIdColumnIndex] === employeeId) {
        // パスワードハッシュとソルトを更新
        sheet.getRange(i + 1, passwordHashColumnIndex + 1).setValue(passwordHash);
        sheet.getRange(i + 1, saltColumnIndex + 1).setValue(salt);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('updateStaffPassword error: ' + error.toString());
    throw error;
  }
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
 * @return {Object} JWT情報
 */
function saveUserSession(userData) {
  try {
    // リフレッシュトークン生成（UUID）
    const refreshToken = Utilities.getUuid();
    
    // JWTペイロード
    const payload = {
      sub: userData['社員番号'],
      name: userData['名前'],
      store: userData['店舗'],
      role: userData['Role'],
      isAdmin: userData['管理者フラグ'] === true
    };
    
    // JWTトークン生成
    const token = generateJWT(payload, JWT_SECRET, TOKEN_EXPIRY);
    
    // リフレッシュトークンをキャッシュに保存
    CacheService.getUserCache().put(
      'refresh_' + userData['社員番号'], 
      refreshToken, 
      REFRESH_TOKEN_EXPIRY
    );
    
    // 管理者フラグもキャッシュに保存（下位互換性のため）
    const isAdmin = userData['管理者フラグ'] === true;
    CacheService.getUserCache().put(SESSION_ADMIN_KEY, isAdmin.toString(), REFRESH_TOKEN_EXPIRY);
    
    // ユーザー情報もJSON文字列化してキャッシュに保存（下位互換性のため）
    const userJson = JSON.stringify(userData);
    CacheService.getUserCache().put(SESSION_USER_KEY, userJson, REFRESH_TOKEN_EXPIRY);
    
    return { 
      token: token, 
      refreshToken: refreshToken,
      expiresIn: TOKEN_EXPIRY
    };
  } catch (error) {
    Logger.log('saveUserSession error: ' + error.toString());
    throw error;
  }
}

/**
 * トークンからユーザー情報を取得
 * @param {string} token - JWTトークン
 * @return {Object} ユーザー情報またはnull
 */
function getUserFromToken(token) {
  const result = verifyJWT(token, JWT_SECRET);
  if (!result.success) {
    return null;
  }
  
  return {
    '社員番号': result.payload.sub,
    '名前': result.payload.name,
    '店舗': result.payload.store,
    'Role': result.payload.role,
    '管理者フラグ': result.payload.isAdmin
  };
}

/**
 * リフレッシュトークンでJWTトークンを更新
 * @param {string} refreshToken - リフレッシュトークン
 * @param {string} employeeId - 社員番号
 * @return {Object} 新しいトークン情報またはエラー
 */
function refreshUserToken(refreshToken, employeeId) {
  try {
    // キャッシュからリフレッシュトークンを取得して検証
    const cachedToken = CacheService.getUserCache().get('refresh_' + employeeId);
    
    if (!cachedToken || cachedToken !== refreshToken) {
      return { success: false, error: '無効なリフレッシュトークンです。再ログインしてください。' };
    }
    
    // スタッフ情報を取得
    const staffData = getStaffByEmployeeId(employeeId);
    if (!staffData) {
      return { success: false, error: 'ユーザー情報が見つかりません。' };
    }
    
    // 新しいセッションを保存
    const sessionInfo = saveUserSession(staffData);
    
    return { success: true, ...sessionInfo };
  } catch (error) {
    Logger.log('refreshUserToken error: ' + error.toString());
    return { success: false, error: 'トークン更新中にエラーが発生しました。' };
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
 * ユーザーが管理者かどうかを確認（2重チェック）
 * @param {string} employeeId - 確認するユーザーID（省略時は現在のユーザー）
 * @return {boolean} 管理者の場合はtrue
 */
function isUserAdmin(employeeId) {
  try {
    // 1. まずキャッシュをチェック（高速）
    const isAdminCache = CacheService.getUserCache().get(SESSION_ADMIN_KEY);
    
    // キャッシュに情報がない場合はスタッフマスターを確認
    if (isAdminCache === null) {
      // 現在のユーザーIDを取得
      if (!employeeId) {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          return false;
        }
        employeeId = currentUser['社員番号'];
      }
      
      // 2. スタッフマスターから管理者フラグを直接確認（確実）
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(STAFF_MASTER_SHEET_NAME);
      
      if (!sheet) {
        Logger.log('スタッフマスターシートが見つかりません。');
        return false;
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      const employeeIdIdx = headers.indexOf('社員番号');
      const adminFlagIdx = headers.indexOf('管理者フラグ');
      
      if (employeeIdIdx === -1 || adminFlagIdx === -1) {
        Logger.log('必要なカラムが見つかりません。');
        return false;
      }
      
      // 該当ユーザーを検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][employeeIdIdx] === employeeId) {
          const isAdmin = Boolean(data[i][adminFlagIdx]);
          
          // キャッシュに保存（5分間）
          CacheService.getUserCache().put(SESSION_ADMIN_KEY, isAdmin.toString(), 300);
          
          return isAdmin;
        }
      }
      
      return false;
    }
    
    return isAdminCache === 'true';
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
    // 現在のユーザー情報を取得
    const currentUser = getCurrentUser();
    
    // セッション情報を削除
    CacheService.getUserCache().remove(SESSION_USER_KEY);
    CacheService.getUserCache().remove(SESSION_ADMIN_KEY);
    
    // リフレッシュトークンも削除
    if (currentUser && currentUser['社員番号']) {
      CacheService.getUserCache().remove('refresh_' + currentUser['社員番号']);
    }
    
    return true;
  } catch (error) {
    Logger.log('logout error: ' + error.toString());
    return false;
  }
}