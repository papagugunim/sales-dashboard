// ============================================
// 판매관리 대시보드 - Google Apps Script
// ============================================

// 설정
const CONFIG = {
  SALES_FOLDER_ID: '1xPPCXFS8KeHTu1oYXsn1u6d4bfRIcZeB', // 판매 데이터 폴더
  CLIENT_DB_SHEET_ID: '1VqQ8xXFp-ncCIB8LGF2uidyrS9mey5A_XtF0V5_Jvdc', // 거래처 DB
  PRODUCT_REF_SHEET_ID: '1BjLRA823m6ODKcWbgN3UJMQv0CYO77ZmWXmRh1n9CZc', // Product ref (재고관리에서 가져옴)
  ADMIN_SHEET_ID: '1k2iWG7cZxPxak1bXns4CGCkm2PwS-dLHInd9W4Re-wQ', // Admin (재고관리에서 가져옴)
  API_TOKEN: 'lotte-sales-2024'
};

// ============================================
// 웹 앱 메인 핸들러
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  // API 토큰 검증
  if (token !== CONFIG.API_TOKEN) {
    return createResponse('error', 'Invalid API token');
  }

  try {
    // 로그인
    if (action === 'login') {
      const username = e.parameter.username;
      const password = e.parameter.password;
      return handleLogin(username, password);
    }

    // 판매 데이터 조회
    if (action === 'getSalesData') {
      const data = getSalesDataFromDrive();
      return createResponse('success', '판매 데이터 로드 성공', data);
    }

    // 거래처 목록 조회
    if (action === 'getClients') {
      const data = getClientList();
      return createResponse('success', '거래처 목록 로드 성공', data);
    }

    // 제품 정보 조회
    if (action === 'getProducts') {
      const data = getProductList();
      return createResponse('success', '제품 정보 로드 성공', data);
    }

    return createResponse('error', 'Invalid action');

  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return createResponse('error', error.toString());
  }
}

// ============================================
// 응답 생성 헬퍼
// ============================================
function createResponse(status, message, data = null) {
  const response = {
    status: status,
    message: message,
    data: data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 로그인 처리
// ============================================
function handleLogin(username, password) {
  if (!CONFIG.ADMIN_SHEET_ID) {
    return createResponse('error', 'Admin sheet not configured');
  }

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.ADMIN_SHEET_ID).getSheetByName('Admin');
    const data = sheet.getDataRange().getValues();

    // 헤더 제외하고 검색
    // Admin 시트 구조: A열(타입), B열(username), C열(password), D열(name)
    for (let i = 1; i < data.length; i++) {
      // 타입이 'USER'인 행만 확인
      if (data[i][0] === 'USER' && data[i][1] === username && data[i][2] === password) {
        return createResponse('success', '로그인 성공', {
          username: data[i][1],
          name: data[i][3] || username
        });
      }
    }

    return createResponse('error', '아이디 또는 비밀번호가 잘못되었습니다.');
  } catch (error) {
    Logger.log('Login error: ' + error);
    return createResponse('error', '로그인 처리 중 오류가 발생했습니다.');
  }
}

// ============================================
// 헬퍼: 앞자리 0 제거
// ============================================
function removeLeadingZeros(value) {
  if (!value && value !== 0) return '';

  // 문자열로 변환 후 공백 제거
  let str = String(value).trim();

  // 빈 문자열이면 반환
  if (str === '') return '';

  // 숫자로만 구성되어 있으면 숫자로 변환 후 다시 문자열로 (앞자리 0 자동 제거)
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return String(num);
  }

  // 숫자가 아니면 원본 반환
  return str;
}

// ============================================
// 판매 데이터 로드 (Google Drive)
// ============================================
function getSalesDataFromDrive() {
  const folder = DriveApp.getFolderById(CONFIG.SALES_FOLDER_ID);
  const files = folder.getFiles();

  let latestFile = null;
  let latestDate = 0;

  // 가장 최신 파일 찾기 (YYYYMMDD.xlsx)
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    // YYYYMMDD.xlsx 형식 확인
    const match = fileName.match(/^(\d{8})\.xlsx$/);
    if (match) {
      const fileDate = parseInt(match[1]);
      if (fileDate > latestDate) {
        latestDate = fileDate;
        latestFile = file;
      }
    }
  }

  if (!latestFile) {
    throw new Error('판매 데이터 파일을 찾을 수 없습니다.');
  }

  // Excel 파일을 임시 스프레드시트로 변환
  const blob = latestFile.getBlob();

  // 파일을 Google Sheets로 변환 (Drive API v3)
  const spreadsheet = Drive.Files.create({
    name: 'temp_sales_data',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  }, blob);

  // 데이터 읽기
  const sheet = SpreadsheetApp.openById(spreadsheet.id).getSheets()[0];
  const data = sheet.getDataRange().getValues();

  // 임시 파일 삭제
  DriveApp.getFileById(spreadsheet.id).setTrashed(true);

  // 데이터 파싱
  const result = [];
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // 빈 행 또는 유효하지 않은 데이터 건너뛰기
    // 날짜, 거래처코드, 제품코드 중 하나라도 없으면 스킵
    if (!row[0] || !row[1] || !row[5]) continue;

    // 날짜가 유효하지 않으면 스킵
    const dateStr = formatDate(row[0]);
    if (!dateStr || dateStr.includes('NaN')) continue;

    // 금액이 비정상적으로 크면 스킵 (100억 이상)
    const amount = parseFloat(row[11]) || 0;
    if (amount > 10000000000) continue;

    const salesData = {
      '날짜': dateStr, // A열: 판매날짜
      '거래처코드': removeLeadingZeros(row[1]), // B열: 거래처코드 (앞자리 0 제거하여 거래처DB와 매칭)
      '거래처명': row[3] || '', // D열: 거래처명(러시아어)
      '제품코드': removeLeadingZeros(row[5]), // F열: 제품코드 (앞자리 0 제거하여 Product ref와 매칭)
      '수량': parseFloat(row[8]) || 0, // I열: 수량(박스)
      '금액': Math.round(amount), // L열: 금액(부가세제외) - 정수로 반올림
      '주문번호': row[13] || '', // N열: 주문번호
      '할인율': parseFloat(row[14]) || 0 // O열: 할인율
    };

    result.push(salesData);
  }

  return {
    data: result,
    fileName: latestFile.getName(),
    fileDate: latestDate.toString(),
    totalRecords: result.length
  };
}

// ============================================
// 날짜 포맷팅
// ============================================
function formatDate(dateValue) {
  if (!dateValue) return '';

  try {
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      // Excel 날짜 형식 (1900-01-01부터의 일수)
      date = new Date((dateValue - 25569) * 86400 * 1000);
    } else {
      date = new Date(dateValue);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    Logger.log('Date format error: ' + error);
    return String(dateValue);
  }
}

// ============================================
// 거래처 목록 조회
// ============================================
function getClientList() {
  if (!CONFIG.CLIENT_DB_SHEET_ID) {
    return [];
  }

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.CLIENT_DB_SHEET_ID).getSheetByName('DB');
    const data = sheet.getDataRange().getValues();

    const result = [];
    for (let i = 1; i < data.length; i++) {
      // 거래처코드 확인 (0도 유효한 값으로 처리)
      const clientCode = String(data[i][0] || '').trim();
      if (!clientCode) continue;  // 빈 문자열만 건너뛰기

      result.push({
        '거래처코드': clientCode,                 // A열: 거래처코드 (문자열, 공백 제거)
        '거래처명(러시아어)': data[i][1] || '',    // B열: 거래처명(러시아어)
        '거래처명(한국어)': data[i][2] || '',      // C열: 거래처명(한국어)
        '내수수출구분': data[i][3] || '',          // D열: 내수/수출 구분
        '나라': data[i][4] || '',                 // E열: 나라
        '지역': data[i][6] || '',                 // G열: 지역(수출나라별)
        '대리점연방체인구분': data[i][7] || ''     // H열: 대리점/연방체인 구분
      });
    }

    return result;
  } catch (error) {
    Logger.log('Client list error: ' + error);
    return [];
  }
}

// ============================================
// 제품 정보 조회
// ============================================
function getProductList() {
  if (!CONFIG.PRODUCT_REF_SHEET_ID) {
    return [];
  }

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.PRODUCT_REF_SHEET_ID).getSheetByName('Product ref');
    const data = sheet.getDataRange().getValues();

    const result = [];
    for (let i = 1; i < data.length; i++) {
      // 제품코드 확인 (0도 유효한 값으로 처리)
      const productCode = String(data[i][0] || '').trim();
      if (!productCode) continue;  // 빈 문자열만 건너뛰기

      result.push({
        '제품코드': productCode,  // A열: 제품코드 (문자열, 공백 제거)
        'CP/NCP': data[i][1] || '',
        '판매지': data[i][2] || '',
        '대분류': data[i][3] || '',
        '지역': data[i][4] || '',
        '맛': data[i][5] || '',
        '패키지': data[i][6] || '',
        '비고': data[i][7] || ''
      });
    }

    return result;
  } catch (error) {
    Logger.log('Product list error: ' + error);
    return [];
  }
}

// ============================================
// 테스트 함수
// ============================================
function testGetSalesData() {
  const result = getSalesDataFromDrive();
  Logger.log('Total records: ' + result.totalRecords);
  Logger.log('File name: ' + result.fileName);
  Logger.log('First 5 records:');
  Logger.log(JSON.stringify(result.data.slice(0, 5), null, 2));
}
