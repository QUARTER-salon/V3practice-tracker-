/**
 * 美容師練習管理Webアプリ - 管理者機能
 * 
 * 管理者向けのマスターデータ管理機能を提供するファイル
 * 
 * @version 1.0.0
 */

/**
 * 管理者権限をチェックする
 * @return {boolean} 管理者の場合はtrue
 */
function checkAdminPermission() {
  return isUserAdmin();
}

/**
 * 店舗マスターデータを取得する
 * @return {Array} 店舗マスターデータの配列
 */
function getStoresMaster() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return getSheetDataAsJSON(STORE_MASTER_SHEET_NAME);
  } catch (error) {
    Logger.log('getStoresMaster error: ' + error.toString());
    throw error;
  }
}

/**
 * 役職マスターデータを取得する
 * @return {Array} 役職マスターデータの配列
 */
function getRolesMaster() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return getSheetDataAsJSON(ROLE_MASTER_SHEET_NAME);
  } catch (error) {
    Logger.log('getRolesMaster error: ' + error.toString());
    throw error;
  }
}

/**
 * トレーナーマスターデータを取得する
 * @return {Array} トレーナーマスターデータの配列
 */
function getTrainersMaster() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return getSheetDataAsJSON(TRAINER_MASTER_SHEET_NAME);
  } catch (error) {
    Logger.log('getTrainersMaster error: ' + error.toString());
    throw error;
  }
}

/**
 * 技術カテゴリーマスターデータを取得する
 * @return {Array} 技術カテゴリーマスターデータの配列
 */
function getTechCategoriesMaster() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return getSheetDataAsJSON(TECH_CATEGORY_SHEET_NAME);
  } catch (error) {
    Logger.log('getTechCategoriesMaster error: ' + error.toString());
    throw error;
  }
}

/**
 * 詳細技術項目マスターデータを取得する
 * @return {Array} 詳細技術項目マスターデータの配列
 */
function getTechDetailsMaster() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return getSheetDataAsJSON(TECH_DETAIL_SHEET_NAME);
  } catch (error) {
    Logger.log('getTechDetailsMaster error: ' + error.toString());
    throw error;
  }
}

/**
 * マスターデータを追加する
 * @param {string} masterType - マスタータイプ (store, role, trainer, techCategory, techDetail)
 * @param {Object} data - 追加するデータ
 * @return {Object} 追加結果
 */
function addMasterData(masterType, data) {
  try {
    if (!checkAdminPermission()) {
      return { success: false, error: '管理者権限がありません。' };
    }
    
    // マスタータイプに応じたシート名とバリデーション関数を取得
    const { sheetName, validate, format } = getMasterTypeConfig(masterType);
    
    // データのバリデーション
    const validationResult = validate(data);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }
    
    // データを整形
    const formattedData = format(data);
    
    // 既存データとの重複チェック
    const isDuplicate = checkDuplicateMasterData(sheetName, formattedData);
    if (isDuplicate) {
      return { success: false, error: '同じIDまたは名前のデータが既に存在します。' };
    }
    
    // データをシートに追加
    appendDataToSheet(sheetName, Object.values(formattedData));
    
    return { success: true, data: formattedData };
  } catch (error) {
    Logger.log(`addMasterData error for ${masterType}: ${error.toString()}`);
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * マスターデータを更新する
 * @param {string} masterType - マスタータイプ (store, role, trainer, techCategory, techDetail)
 * @param {string} id - 更新対象のID
 * @param {Object} data - 更新するデータ
 * @return {Object} 更新結果
 */
function updateMasterData(masterType, id, data) {
  try {
    if (!checkAdminPermission()) {
      return { success: false, error: '管理者権限がありません。' };
    }
    
    // マスタータイプに応じたシート名とバリデーション関数を取得
    const { sheetName, validate, format, idColumn } = getMasterTypeConfig(masterType);
    
    // データのバリデーション
    const validationResult = validate(data);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }
    
    // データを整形
    const formattedData = format(data);
    
    // 対象行を検索
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    const idColumnIndex = headers.indexOf(idColumn);
    if (idColumnIndex === -1) {
      throw new Error(`シート「${sheetName}」に${idColumn}列がありません。`);
    }
    
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idColumnIndex] === id) {
        rowIndex = i + 1; // 1始まりのインデックス
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: `ID「${id}」のデータが見つかりません。` };
    }
    
    // データを更新
    const rowData = headers.map(header => formattedData[header] || '');
    updateSheetRow(sheetName, rowIndex, rowData);
    
    // 関連するマスターデータも更新（例: 店舗名変更時にトレーナーマスターの店舗名も更新）
    if (masterType === 'store') {
      updateRelatedStoreData(id, data.storeName);
    }
    
    return { success: true, data: formattedData };
  } catch (error) {
    Logger.log(`updateMasterData error for ${masterType}: ${error.toString()}`);
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * マスターデータを削除（論理削除）する
 * @param {string} masterType - マスタータイプ (store, role, trainer, techCategory, techDetail)
 * @param {string} id - 削除対象のID
 * @return {Object} 削除結果
 */
function deleteMasterData(masterType, id) {
  try {
    if (!checkAdminPermission()) {
      return { success: false, error: '管理者権限がありません。' };
    }
    
    // マスタータイプに応じたシート名とID列を取得
    const { sheetName, idColumn } = getMasterTypeConfig(masterType);
    
    // 対象行を検索
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    const idColumnIndex = headers.indexOf(idColumn);
    if (idColumnIndex === -1) {
      throw new Error(`シート「${sheetName}」に${idColumn}列がありません。`);
    }
    
    const validFlagColumnIndex = headers.indexOf('有効フラグ');
    if (validFlagColumnIndex === -1) {
      throw new Error(`シート「${sheetName}」に有効フラグ列がありません。`);
    }
    
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idColumnIndex] === id) {
        rowIndex = i + 1; // 1始まりのインデックス
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: `ID「${id}」のデータが見つかりません。` };
    }
    
    // 有効フラグをfalseに設定（論理削除）
    sheet.getRange(rowIndex, validFlagColumnIndex + 1).setValue(false);
    
    return { success: true };
  } catch (error) {
    Logger.log(`deleteMasterData error for ${masterType}: ${error.toString()}`);
    return { success: false, error: formatErrorMessage(error) };
  }
}

/**
 * マスタータイプに応じた設定を取得する
 * @param {string} masterType - マスタータイプ
 * @return {Object} 設定オブジェクト
 */
function getMasterTypeConfig(masterType) {
  switch (masterType) {
    case 'store':
      return {
        sheetName: STORE_MASTER_SHEET_NAME,
        idColumn: '店舗ID',
        validate: validateStoreData,
        format: formatStoreData
      };
    case 'role':
      return {
        sheetName: ROLE_MASTER_SHEET_NAME,
        idColumn: '役職ID',
        validate: validateRoleData,
        format: formatRoleData
      };
    case 'trainer':
      return {
        sheetName: TRAINER_MASTER_SHEET_NAME,
        idColumn: 'トレーナーID',
        validate: validateTrainerData,
        format: formatTrainerData
      };
    case 'techCategory':
      return {
        sheetName: TECH_CATEGORY_SHEET_NAME,
        idColumn: 'カテゴリーID',
        validate: validateTechCategoryData,
        format: formatTechCategoryData
      };
    case 'techDetail':
      return {
        sheetName: TECH_DETAIL_SHEET_NAME,
        idColumn: '項目ID',
        validate: validateTechDetailData,
        format: formatTechDetailData
      };
    default:
      throw new Error(`不明なマスタータイプ: ${masterType}`);
  }
}

/**
 * 店舗マスターデータのバリデーション
 * @param {Object} data - 店舗データ
 * @return {Object} バリデーション結果
 */
function validateStoreData(data) {
  if (!data.storeId) {
    return { valid: false, error: '店舗IDを入力してください。' };
  }
  if (!data.storeName) {
    return { valid: false, error: '店舗名を入力してください。' };
  }
  return { valid: true };
}

/**
 * 店舗マスターデータの整形
 * @param {Object} data - 店舗データ
 * @return {Object} 整形されたデータ
 */
function formatStoreData(data) {
  return {
    '店舗ID': data.storeId,
    '店舗名': data.storeName,
    '有効フラグ': data.isActive !== false
  };
}

/**
 * 役職マスターデータのバリデーション
 * @param {Object} data - 役職データ
 * @return {Object} バリデーション結果
 */
function validateRoleData(data) {
  if (!data.roleId) {
    return { valid: false, error: '役職IDを入力してください。' };
  }
  if (!data.roleName) {
    return { valid: false, error: '役職名を入力してください。' };
  }
  return { valid: true };
}

/**
 * 役職マスターデータの整形
 * @param {Object} data - 役職データ
 * @return {Object} 整形されたデータ
 */
function formatRoleData(data) {
  return {
    '役職ID': data.roleId,
    '役職名': data.roleName,
    '有効フラグ': data.isActive !== false
  };
}

/**
 * トレーナーマスターデータのバリデーション
 * @param {Object} data - トレーナーデータ
 * @return {Object} バリデーション結果
 */
function validateTrainerData(data) {
  if (!data.trainerId) {
    return { valid: false, error: 'トレーナーIDを入力してください。' };
  }
  if (!data.trainerName) {
    return { valid: false, error: 'トレーナー名を入力してください。' };
  }
  if (!data.store) {
    return { valid: false, error: '店舗を選択してください。' };
  }
  return { valid: true };
}

/**
 * トレーナーマスターデータの整形
 * @param {Object} data - トレーナーデータ
 * @return {Object} 整形されたデータ
 */
function formatTrainerData(data) {
  return {
    'トレーナーID': data.trainerId,
    '名前': data.trainerName,
    '店舗': data.store,
    '有効フラグ': data.isActive !== false
  };
}

/**
 * 技術カテゴリーマスターデータのバリデーション
 * @param {Object} data - 技術カテゴリーデータ
 * @return {Object} バリデーション結果
 */
function validateTechCategoryData(data) {
  if (!data.categoryId) {
    return { valid: false, error: 'カテゴリーIDを入力してください。' };
  }
  if (!data.categoryName) {
    return { valid: false, error: 'カテゴリー名を入力してください。' };
  }
  return { valid: true };
}

/**
 * 技術カテゴリーマスターデータの整形
 * @param {Object} data - 技術カテゴリーデータ
 * @return {Object} 整形されたデータ
 */
function formatTechCategoryData(data) {
  return {
    'カテゴリーID': data.categoryId,
    'カテゴリー名': data.categoryName,
    '対象役職': data.targetRole || '',
    '有効フラグ': data.isActive !== false
  };
}

/**
 * 詳細技術項目マスターデータのバリデーション
 * @param {Object} data - 詳細技術項目データ
 * @return {Object} バリデーション結果
 */
function validateTechDetailData(data) {
  if (!data.itemId) {
    return { valid: false, error: '項目IDを入力してください。' };
  }
  if (!data.itemName) {
    return { valid: false, error: '項目名を入力してください。' };
  }
  if (!data.categoryId) {
    return { valid: false, error: 'カテゴリーIDを選択してください。' };
  }
  return { valid: true };
}

/**
 * 詳細技術項目マスターデータの整形
 * @param {Object} data - 詳細技術項目データ
 * @return {Object} 整形されたデータ
 */
function formatTechDetailData(data) {
  return {
    '項目ID': data.itemId,
    'カテゴリーID': data.categoryId,
    '項目名': data.itemName,
    '有効フラグ': data.isActive !== false
  };
}

/**
 * マスターデータの重複をチェックする
 * @param {string} sheetName - シート名
 * @param {Object} data - チェックするデータ
 * @return {boolean} 重複がある場合はtrue
 */
function checkDuplicateMasterData(sheetName, data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    // 各マスターの主キーとなる列を特定
    let keyColumnIndex = -1;
    let keyValue = '';
    
    if (sheetName === STORE_MASTER_SHEET_NAME) {
      keyColumnIndex = headers.indexOf('店舗ID');
      keyValue = data['店舗ID'];
    } else if (sheetName === ROLE_MASTER_SHEET_NAME) {
      keyColumnIndex = headers.indexOf('役職ID');
      keyValue = data['役職ID'];
    } else if (sheetName === TRAINER_MASTER_SHEET_NAME) {
      keyColumnIndex = headers.indexOf('トレーナーID');
      keyValue = data['トレーナーID'];
    } else if (sheetName === TECH_CATEGORY_SHEET_NAME) {
      keyColumnIndex = headers.indexOf('カテゴリーID');
      keyValue = data['カテゴリーID'];
    } else if (sheetName === TECH_DETAIL_SHEET_NAME) {
      keyColumnIndex = headers.indexOf('項目ID');
      keyValue = data['項目ID'];
    }
    
    if (keyColumnIndex === -1 || !keyValue) {
      throw new Error('主キー列が見つかりません。');
    }
    
    // 重複チェック
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][keyColumnIndex] === keyValue) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('checkDuplicateMasterData error: ' + error.toString());
    throw error;
  }
}

/**
 * 店舗名変更時に関連するマスターデータを更新する
 * @param {string} storeId - 店舗ID
 * @param {string} newStoreName - 新しい店舗名
 */
function updateRelatedStoreData(storeId, newStoreName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 店舗マスターから古い店舗名を取得
    const storeSheet = ss.getSheetByName(STORE_MASTER_SHEET_NAME);
    const storeData = storeSheet.getDataRange().getValues();
    const storeHeaders = storeData[0];
    const storeIdColumnIndex = storeHeaders.indexOf('店舗ID');
    const storeNameColumnIndex = storeHeaders.indexOf('店舗名');
    
    let oldStoreName = '';
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][storeIdColumnIndex] === storeId) {
        oldStoreName = storeData[i][storeNameColumnIndex];
        break;
      }
    }
    
    if (!oldStoreName || oldStoreName === newStoreName) {
      return; // 店舗名が変更されていない場合は何もしない
    }
    
    // トレーナーマスターの店舗名を更新
    const trainerSheet = ss.getSheetByName(TRAINER_MASTER_SHEET_NAME);
    const trainerData = trainerSheet.getDataRange().getValues();
    const trainerHeaders = trainerData[0];
    const trainerStoreColumnIndex = trainerHeaders.indexOf('店舗');
    
    for (let i = 1; i < trainerData.length; i++) {
      if (trainerData[i][trainerStoreColumnIndex] === oldStoreName) {
        trainerSheet.getRange(i + 1, trainerStoreColumnIndex + 1).setValue(newStoreName);
      }
    }
    
    // 在庫シートの店舗名も更新
    const inventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    const inventoryData = inventorySheet.getDataRange().getValues();
    
    for (let i = 1; i < inventoryData.length; i++) {
      if (inventoryData[i][0] === oldStoreName) {
        inventorySheet.getRange(i + 1, 1).setValue(newStoreName);
      }
    }
  } catch (error) {
    Logger.log('updateRelatedStoreData error: ' + error.toString());
    throw error;
  }
}

/**
 * 管理者用のマスター管理ページに必要なすべてのマスターデータを取得する
 * @return {Object} マスターデータ
 */
function getAllMasterData() {
  try {
    if (!checkAdminPermission()) {
      throw new Error('管理者権限がありません。');
    }
    
    return {
      stores: getStoresMaster(),
      roles: getRolesMaster(),
      trainers: getTrainersMaster(),
      techCategories: getTechCategoriesMaster(),
      techDetails: getTechDetailsMaster()
    };
  } catch (error) {
    Logger.log('getAllMasterData error: ' + error.toString());
    throw error;
  }
}