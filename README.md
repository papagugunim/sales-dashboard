# 롯데제과 러시아법인 - 판매 관리 시스템

롯데제과 러시아법인의 판매 데이터를 분석하고 관리하는 웹 기반 대시보드 시스템입니다.

## 주요 기능

### 📊 판매 현황 분석
- **월별 판매 추이**: 시간에 따른 판매량과 판매금액 변화 추적
- **지역별 분석**: 지역별 판매 비중 파악
- **제품별 분석**: TOP 10 제품 판매 현황
- **거래처별 분석**: TOP 10 거래처 판매 현황

### 📋 데이터 관리
- **실시간 데이터**: Google Drive에 업로드된 최신 판매 데이터 자동 로드
- **거래처 DB**: 거래처 정보 통합 관리
- **제품 정보**: Product ref 연동 (재고관리 시스템과 공유)
- **필터링**: 기간, 거래처, 지역, 제품, 카테고리별 필터링

### 📈 시각화
- **ECharts 차트**: 월별 추이, 지역별 파이차트, TOP 10 바차트
- **요약 카드**: 총 판매금액, 총 판매량, 거래처 수, 평균 할인율
- **테이블 뷰**: 상세 판매 데이터 테이블 (정렬, 페이지네이션 지원)

### 🎨 UI/UX
- **다크모드**: 눈의 피로를 줄이는 다크모드 지원
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **탭 메뉴**: 테이블 뷰와 차트 뷰 분리

## 시스템 구조

### 데이터 소스

1. **판매 데이터 (Sales DB)**
   - 위치: Google Drive 폴더
   - 폴더 ID: `1xPPCXFS8KeHTu1oYXsn1u6d4bfRIcZeB`
   - 파일 형식: `YYYYMMDD.xlsx`
   - 컬럼 구조:
     - A열: 판매날짜
     - B열: 거래처코드
     - D열: 거래처명(러시아어)
     - F열: 제품코드
     - I열: 수량(박스)
     - L열: 금액(부가세제외)
     - N열: 주문번호
     - O열: 할인율

2. **거래처 DB (Client DB)**
   - 위치: Google Sheets
   - Spreadsheet ID: `1VqQ8xXFp-ncCIB8LGF2uidyrS9mey5A_XtF0V5_Jvdc`
   - 시트명: `DB`
   - 컬럼 구조:
     - A열: 거래처코드
     - B열: 거래처명(러시아어)
     - C열: 거래처명(한국어)
     - D열: 내수/수출 구분
     - E열: 나라
     - G열: 지역(수출나라별)
     - H열: 대리점/연방체인 구분

3. **Product ref** (재고관리 시스템과 공유)
   - Spreadsheet ID: `1BjLRA823m6ODKcWbgN3UJMQv0CYO77ZmWXmRh1n9CZc`

4. **Admin** (재고관리 시스템과 공유)
   - Spreadsheet ID: `1k2iWG7cZxPxak1bXns4CGCkm2PwS-dLHInd9W4Re-wQ`

### 백엔드

- **Google Apps Script**: `Code.gs`
- **API 토큰**: `lotte-sales-2024`
- **엔드포인트**:
  - `login`: 사용자 인증
  - `getSalesData`: 판매 데이터 조회
  - `getClients`: 거래처 목록 조회
  - `getProducts`: 제품 정보 조회

### 프론트엔드

- **HTML**: `index.html`
- **CSS**: `css/style.css`
- **JavaScript**: `js/app.js`
- **차트 라이브러리**: ECharts 5.4.3

## 설치 및 배포

### 1. Google Apps Script 설정

1. Google Apps Script 편집기를 열고 `Code.gs` 파일 내용을 붙여넣기
2. CONFIG 섹션의 ID들이 올바른지 확인
3. 메뉴: **배포 > 새 배포**
4. 유형: **웹앱**
5. 액세스 권한: **모든 사용자**
6. 배포 후 웹앱 URL 복사

### 2. 프론트엔드 설정

1. `js/app.js` 파일을 열고 `API_URL` 변수에 웹앱 URL 입력:
   ```javascript
   const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```

2. 웹 서버에 파일 업로드 또는 로컬에서 실행:
   ```bash
   # 로컬 서버 실행 (Python)
   python3 -m http.server 8000

   # 브라우저에서 접속
   http://localhost:8000
   ```

### 3. 판매 데이터 업로드

1. Google Drive 폴더 (`1xPPCXFS8KeHTu1oYXsn1u6d4bfRIcZeB`) 열기
2. 판매 데이터 Excel 파일을 `YYYYMMDD.xlsx` 형식으로 업로드
3. 시스템이 자동으로 최신 파일을 로드

## 사용 방법

### 로그인

1. Admin 시트에 등록된 사용자 ID와 비밀번호로 로그인
2. "로그인 상태 유지" 체크 시 자동 로그인

### 데이터 조회

1. **테이블 뷰**: 상세 판매 데이터 목록
   - 컬럼 클릭으로 정렬
   - 페이지당 항목 수 조정 (25/50/100/200)

2. **차트 뷰**: 시각화된 분석 결과
   - 월별 판매 추이
   - 지역별 판매 비중
   - 제품별 TOP 10
   - 거래처별 TOP 10

### 필터링

- **기간(월)**: 특정 월의 데이터만 조회
- **거래처**: 특정 거래처의 판매 데이터
- **지역**: 지역별 필터링
- **제품코드**: 특정 제품의 판매 데이터
- **카테고리**: 제품 카테고리별 필터링
- **검색**: 거래처명 또는 제품코드 검색

### 다크모드

- 우측 상단 "다크모드" 버튼 클릭
- 설정은 자동 저장됨

## 기술 스택

- **Backend**: Google Apps Script
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Apache ECharts 5.4.3
- **Storage**: Google Drive, Google Sheets
- **Authentication**: Admin 시트 기반 인증

## 버전 정보

- **v0.202512** (2025-12-02)
  - 초기 버전 출시
  - 월별/지역별/제품별 판매 분석
  - 거래처 DB 연동
  - ECharts 차트 시각화
  - 다크모드 지원

## 관련 프로젝트

- **재고 관리 시스템**: `/dev/stock-dashboard`
  - Product ref 공유
  - Admin 시트 공유
  - 동일한 디자인 시스템

## 라이선스

롯데제과 러시아법인 내부 사용 전용
