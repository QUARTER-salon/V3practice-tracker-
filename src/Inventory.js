/**
 * 美容師練習管理Webアプリ - 在庫管理機能
 * 
 * ウィッグ在庫管理に関する機能を提供するファイル
 * 
 * @version 1.0.0
 */

/**
 * すべての店舗のウィッグ在庫情報を取得する
 * @return {Array} 店舗ごとの在庫情報の配列
 */
function getAllWigInventory() {
  try {
    // 管理者権限チェック
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('ウィッグ在庫シートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // ヘッダー行をスキップしてデータを整形
    const inventory = [];
    for (let i = 1; i < data.length; i++) {
      inventory.push({
        store: data[i][0] || '',
        count: parseInt(data[i][1] || 0, 10)
      });
    }
    
    return inventory;
  } catch (error) {
    Logger.log('getAllWigInventory error: ' + error.toString());
    throw error;
  }
}

/**
 * 特定の店舗のウィッグ在庫数を取得する
 * @param {string} storeName - 店舗名
 * @return {number} 在庫数
 */
function getStoreWigInventory(storeName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('ウィッグ在庫シートが見つかりません。');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 店舗名に一致する行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === storeName) {
        return parseInt(data[i][1] || 0, 10);
      }
    }
    
    // 該当する店舗がない場合は0を返す
    return 0;
  } catch (error) {
    Logger.log('getStoreWigInventory error: ' + error.toString());
    throw error;
  }
}

/**
 * 店舗のウィッグ在庫数を手動で更新する
 * @param {string} storeName - 店舗名
 * @param {number} newCount - 新しい在庫数
 * @return {Object} 更新結果
 */
function updateWigInventoryManually(storeName, newCount) {
  // LockService取得
  const lock = LockService.getScriptLock();
  try {
    // ロック取得（最大待機時間10秒）
    if (!lock.tryLock(10000)) {
      return { success: false, error: '他のユーザーが在庫を更新中です。しばらく待ってから再試行してください。' };
    }
    
    // 管理者権限チェック
    if (!checkAdminPermission()) {
      return { success: false, error: '管理者権限がありません。' };
    }
    
    // 入力値チェック
    if (!storeName) {
      return { success: false, error: '店舗名を指定してください。' };
    }
    
    if (isNaN(newCount) || newCount < 0) {
      return { success: false, error: '在庫数は0以上の数値を入力してください。' };
    }
    
    const count = parseInt(newCount, 10);
    
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
        
        // 在庫数を更新
        sheet.getRange(rowIndex, 2).setValue(count);
        break;
      }
    }
    
    // 店舗が見つからない場合は新規追加
    if (!found) {
      sheet.appendRow([storeName, count]);
    }
    
    return { 
      success: true, 
      message: `${storeName}の在庫数を${count}個に更新しました。` 
    };
  } catch (error) {
    Logger.log('updateWigInventoryManually error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  } finally {
    // 必ずロックを解放
    lock.releaseLock();
  }
}

/**
 * 在庫管理に必要なデータを取得する
 * @return {Object} 在庫管理データ
 */
function getInventoryManagementData() {
  try {
    // 管理者権限チェック
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    // 在庫データを取得
    const inventory = getAllWigInventory();
    
    // 店舗マスターデータを取得
    const stores = getActiveMasterData(STORE_MASTER_SHEET_NAME);
    
    // 店舗マスターにある全店舗について、在庫データがない場合は0で初期化
    const storeNames = stores.map(store => store['店舗名']);
    const result = [...inventory];
    
    storeNames.forEach(storeName => {
      if (!inventory.some(item => item.store === storeName)) {
        result.push({ store: storeName, count: 0 });
      }
    });
    
    // 店舗名でソート
    result.sort((a, b) => a.store.localeCompare(b.store, 'ja'));
    
    return {
      inventory: result,
      stores: storeNames
    };
  } catch (error) {
    Logger.log('getInventoryManagementData error: ' + error.toString());
    throw error;
  }
}

/**
 * 利用可能なすべての店舗を取得する
 * @return {Array} 店舗名の配列
 */
function getAllStores() {
  try {
    const stores = getActiveMasterData(STORE_MASTER_SHEET_NAME);
    return stores.map(store => store['店舗名']);
  } catch (error) {
    Logger.log('getAllStores error: ' + error.toString());
    throw error;
  }
}

/**
 * 複数店舗のウィッグ在庫を一括更新する
 * @param {Array} inventoryData - 店舗ごとの在庫データの配列 [{store: '店舗名', count: 数量}, ...]
 * @return {Object} 更新結果
 */
function bulkUpdateWigInventory(inventoryData) {
  // LockService取得
  const lock = LockService.getScriptLock();
  try {
    // ロック取得（最大待機時間10秒）
    if (!lock.tryLock(10000)) {
      return { success: false, error: '他のユーザーが在庫を更新中です。しばらく待ってから再試行してください。' };
    }
    
    // 管理者権限チェック
    if (!checkAdminPermission()) {
      return { success: false, error: '管理者権限がありません。' };
    }
    
    if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
      return { success: false, error: '有効な在庫データが提供されていません。' };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    
    if (!sheet) {
      throw new Error('ウィッグ在庫シートが見つかりません。');
    }
    
    // 既存の在庫データを取得
    const existingData = sheet.getDataRange().getValues();
    const existingStores = {};
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0]) {
        existingStores[existingData[i][0]] = i + 1; // 1始まりの行インデックス
      }
    }
    
    // 各店舗の在庫を更新
    let updatedCount = 0;
    let addedCount = 0;
    
    for (const item of inventoryData) {
      const { store, count } = item;
      
      if (!store) continue;
      
      const parsedCount = parseInt(count, 10);
      if (isNaN(parsedCount) || parsedCount < 0) continue;
      
      if (store in existingStores) {
        // 既存の店舗は更新
        sheet.getRange(existingStores[store], 2).setValue(parsedCount);
        updatedCount++;
      } else {
        // 新規店舗は追加
        sheet.appendRow([store, parsedCount]);
        addedCount++;
      }
    }
    
    return { 
      success: true, 
      message: `${updatedCount}店舗の在庫を更新し、${addedCount}店舗の在庫を新規追加しました。` 
    };
  } catch (error) {
    Logger.log('bulkUpdateWigInventory error: ' + error.toString());
    return { success: false, error: formatErrorMessage(error) };
  } finally {
    // 必ずロックを解放
    lock.releaseLock();
  }
}