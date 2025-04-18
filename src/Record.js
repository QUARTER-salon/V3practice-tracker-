/**
 * 美容師練習管理Webアプリ - 練習記録機能
 * 
 * 練習記録の登録・取得機能を提供するファイル
 * 
 * @version 1.0.0
 */

/**
 * ユーザーの練習記録数を取得する
 * @param {string} employeeId - 社員番号（指定しない場合は現在のユーザー）
 * @return {number} 練習記録の数
 */
function getUserPracticeRecordCount(employeeId) {
  try {
    // 社員番号が指定されていない場合は現在のユーザーの社員番号を使用
    if (!employeeId) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('ログインセッションが無効です。');
      }
      employeeId = currentUser['社員番号'];
    }
    
    const records = getUserPracticeRecords(employeeId, 1000); // 十分大きな数で全件取得
    return records.length;
  } catch (error) {
    Logger.log('getUserPracticeRecordCount error: ' + error.toString());
    return 0; // エラー時は0を返す
  }
}

/**
 * 練習記録を保存する
 * @param {Object} recordData - 練習記録データ
 * @return {Object} 保存結果
 */
function savePracticeRecord(recordData) {
  try {
    // バリデーション
    const validationResult = validatePracticeRecord(recordData);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }
    
    // 現在のユーザー情報を取得
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'ログインセッションが無効です。再ログインしてください。' };
    }
    
    // 記録データの準備
    const now = new Date();
    const row = [
      getCurrentDateTime(),             // 記録日時
      currentUser['店舗'],               // 店舗
      currentUser['Role'],              // 役職
      currentUser['名前'],               // 名前
      currentUser['社員番号'],            // 社員番号
      recordData.trainer,               // トレーナー
      recordData.practiceDate,          // 練習日
      recordData.practiceTime,          // 練習時間
      recordData.techCategory,          // 技術カテゴリー
      recordData.techDetail,            // 詳細技術項目
      recordData.practiceCount,         // 練習回数
      recordData.newWigCount || 0,      // 新品ウィッグ使用数
      recordData.evaluation || '',      // 評価
      recordData.details || '',         // その他詳細
      APP_VERSION                       // アプリバージョン
    ];
    
    // 練習記録シートにデータを追加
    appendDataToSheet(PRACTICE_RECORD_SHEET_NAME, row);
    
    // ウィッグ使用数が設定されている場合は在庫を更新
    if (recordData.newWigCount && recordData.newWigCount > 0) {
      updateWigInventory(currentUser['店舗'], -recordData.newWigCount);
    }
    
    return { success: true };
  } catch (error) {
    Logger.log('savePracticeRecord error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * 練習記録データをバリデーションする
 * @param {Object} recordData - バリデーションする練習記録データ
 * @return {Object} バリデーション結果
 */
function validatePracticeRecord(recordData) {
  // 必須フィールドのチェック
  const requiredFields = ['trainer', 'practiceDate', 'practiceTime', 'techCategory', 'techDetail', 'practiceCount'];
  
  for (const field of requiredFields) {
    if (!recordData[field]) {
      return { valid: false, error: `${getFieldDisplayName(field)}を入力してください。` };
    }
  }
  
  // 日付フォーマットのチェック
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordData.practiceDate)) {
    return { valid: false, error: '練習日の形式が正しくありません。YYYY-MM-DD形式で入力してください。' };
  }
  
  // 練習回数が数値かつ正の整数かチェック
  const practiceCount = parseInt(recordData.practiceCount, 10);
  if (isNaN(practiceCount) || practiceCount <= 0) {
    return { valid: false, error: '練習回数は1以上の数値を入力してください。' };
  }
  
  // 新品ウィッグ使用数が数値かつ0以上かチェック
  if (recordData.newWigCount !== undefined && recordData.newWigCount !== null && recordData.newWigCount !== '') {
    const newWigCount = parseInt(recordData.newWigCount, 10);
    if (isNaN(newWigCount) || newWigCount < 0) {
      return { valid: false, error: '新品ウィッグ使用数は0以上の数値を入力してください。' };
    }
  }
  
  // 評価が数値かつ1-10の範囲内かチェック
  if (recordData.evaluation && recordData.evaluation !== '') {
    const evaluation = parseInt(recordData.evaluation, 10);
    if (isNaN(evaluation) || evaluation < 1 || evaluation > 10) {
      return { valid: false, error: '評価は1から10の範囲で入力してください。' };
    }
  }
  
  return { valid: true };
}

/**
 * フィールド名から表示名を取得する
 * @param {string} fieldName - フィールド名
 * @return {string} 表示名
 */
function getFieldDisplayName(fieldName) {
  const displayNames = {
    trainer: 'トレーナー',
    practiceDate: '練習日',
    practiceTime: '練習時間',
    techCategory: '技術カテゴリー',
    techDetail: '詳細技術項目',
    practiceCount: '練習回数',
    newWigCount: '新品ウィッグ使用数',
    evaluation: '評価',
    details: 'その他詳細'
  };
  
  return displayNames[fieldName] || fieldName;
}

/**
 * ウィッグ在庫を更新する
 * @param {string} storeName - 店舗名
 * @param {number} changeAmount - 変更量（増加:正、減少:負）
 * @return {boolean} 更新が成功したかどうか
 */
function updateWigInventory(storeName, changeAmount) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('ウィッグ在庫シートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    let found = false;
    let rowIndex = -1;
    
    // 該当する店舗の行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === storeName) {
        found = true;
        rowIndex = i + 1; // 1始まりのインデックス
        
        // 現在の在庫数を取得して更新
        let currentStock = data[i][1] || 0;
        currentStock = parseInt(currentStock, 10);
        if (isNaN(currentStock)) currentStock = 0;
        
        const newStock = Math.max(0, currentStock + changeAmount); // 在庫がマイナスにならないようにする
        sheet.getRange(rowIndex, 2).setValue(newStock);
        break;
      }
    }
    
    // 店舗が見つからない場合は新規追加
    if (!found) {
      sheet.appendRow([storeName, Math.max(0, changeAmount)]);
    }
    
    return true;
  } catch (error) {
    Logger.log('updateWigInventory error: ' + error.toString());
    throw error;
  }
}

/**
 * ユーザーの練習記録を取得する
 * @param {string} employeeId - 社員番号（指定しない場合は現在のユーザー）
 * @param {number} limit - 取得する件数の上限（デフォルト10件）
 * @return {Array} 練習記録の配列
 */
function getUserPracticeRecords(employeeId, limit = 10) {
  try {
    // 社員番号が指定されていない場合は現在のユーザーの社員番号を使用
    if (!employeeId) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('ログインセッションが無効です。');
      }
      employeeId = currentUser['社員番号'];
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('練習記録シートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 社員番号のカラムインデックスを特定
    const employeeIdColumnIndex = headers.indexOf('社員番号');
    
    if (employeeIdColumnIndex === -1) {
      throw new Error('練習記録シートに社員番号列がありません。');
    }
    
    // 該当する練習記録を収集
    const records = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][employeeIdColumnIndex] === employeeId) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = data[i][index];
        });
        records.push(record);
        
        // 上限に達したら終了
        if (records.length >= limit) {
          break;
        }
      }
    }
    
    // 記録日時の降順でソート
    records.sort((a, b) => {
      const dateA = new Date(a['記録日時']);
      const dateB = new Date(b['記録日時']);
      return dateB - dateA;
    });
    
    return records;
  } catch (error) {
    Logger.log('getUserPracticeRecords error: ' + error.toString());
    throw error;
  }
}

/**
 * 全トレーナーのリストを取得する
 * @return {Array} トレーナーの配列
 */
function getAllTrainers() {
  try {
    return getActiveMasterData(TRAINER_MASTER_SHEET_NAME);
  } catch (error) {
    Logger.log('getAllTrainers error: ' + error.toString());
    throw error;
  }
}

/**
 * 全技術カテゴリーのリストを取得する
 * @param {string} role - 役職（フィルタリング用）
 * @return {Array} 技術カテゴリーの配列
 */
function getTechCategories(role) {
  try {
    const categories = getActiveMasterData(TECH_CATEGORY_SHEET_NAME);
    
    // 役職に基づいてフィルタリング
    if (role) {
      return categories.filter(category => {
        // カテゴリーの対象役職が空または指定された役職を含む場合
        return !category['対象役職'] || 
               category['対象役職'] === '' || 
               category['対象役職'].includes(role);
      });
    }
    
    return categories;
  } catch (error) {
    Logger.log('getTechCategories error: ' + error.toString());
    throw error;
  }
}

/**
 * 技術カテゴリーに基づいて詳細技術項目を取得する
 * @param {string} categoryId - 技術カテゴリーID
 * @return {Array} 詳細技術項目の配列
 */
function getTechDetailItems(categoryId) {
  try {
    const allItems = getActiveMasterData(TECH_DETAIL_SHEET_NAME);
    
    // カテゴリーに基づいてフィルタリング
    return allItems.filter(item => item['カテゴリーID'] === categoryId);
  } catch (error) {
    Logger.log('getTechDetailItems error: ' + error.toString());
    throw error;
  }
}

/**
 * 練習時間の選択肢を取得する
 * @return {Array} 練習時間の選択肢配列
 */
function getPracticeTimeOptions() {
  // 30分単位で練習時間の選択肢を生成（0.5時間〜8時間）
  const options = [];
  for (let i = 0.5; i <= 8; i += 0.5) {
    options.push({ value: i.toString(), label: `${i}時間` });
  }
  return options;
}

/**
 * 練習回数の選択肢を取得する
 * @return {Array} 練習回数の選択肢配列
 */
function getPracticeCountOptions() {
  // 1〜20回までの選択肢を生成
  const options = [];
  for (let i = 1; i <= 20; i++) {
    options.push({ value: i.toString(), label: `${i}回` });
  }
  return options;
}

/**
 * 評価の選択肢を取得する
 * @return {Array} 評価の選択肢配列
 */
function getEvaluationOptions() {
  // 1〜10までの選択肢を生成
  const options = [];
  for (let i = 1; i <= 10; i++) {
    options.push({ value: i.toString(), label: i.toString() });
  }
  return options;
}

/**
 * 新品ウィッグ使用数の選択肢を取得する
 * @return {Array} 使用数の選択肢配列
 */
function getWigCountOptions() {
  // 0〜5個までの選択肢を生成
  const options = [];
  for (let i = 0; i <= 5; i++) {
    options.push({ value: i.toString(), label: `${i}個` });
  }
  return options;
}

/**
 * 練習記録に必要なすべての選択肢データを取得する
 * @return {Object} 選択肢データ
 */
function getPracticeFormOptions() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('ログインセッションが無効です。');
    }
    
    return {
      trainers: getAllTrainers(),
      techCategories: getTechCategories(currentUser['Role']),
      practiceTimes: getPracticeTimeOptions(),
      practiceCounts: getPracticeCountOptions(),
      evaluations: getEvaluationOptions(),
      wigCounts: getWigCountOptions(),
      currentUser: {
        name: currentUser['名前'],
        store: currentUser['店舗'],
        role: currentUser['Role']
      }
    };
  } catch (error) {
    Logger.log('getPracticeFormOptions error: ' + error.toString());
    throw error;
  }
}