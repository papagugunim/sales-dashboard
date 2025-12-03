// ============================================
// 판매관리 대시보드 - JavaScript
// ============================================

// API 설정 (@8 버전: 제품코드 로딩 완전 수정)
const API_URL = 'https://script.google.com/macros/s/AKfycbzbeulFxhIwmNhF7cwm0pun4KMEH_8ySJ3QRERTTx9WyGv4Lmhj3b9IK_rHQ29ILlOUAQ/exec';
const API_TOKEN = 'lotte-sales-2024';

// 전역 변수
let salesData = [];
let clientData = [];
let productData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 100;
let sortColumn = 'date';
let sortDirection = 'desc';

// 차트 객체
let monthlyChart = null;
let regionChart = null;
let productChart = null;
let clientChart = null;

// ============================================
// 초기화
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // 다크모드 초기화
    initDarkMode();

    // 로그인 상태 확인
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');

    if (authToken && username) {
        showDashboard(username);
        loadAllData();
    } else {
        showLoginPage();
    }

    // 이벤트 리스너 등록
    setupEventListeners();
});

// ============================================
// 이벤트 리스너 설정
// ============================================
function setupEventListeners() {
    // 로그인
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 다크모드 토글
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggleLogin').addEventListener('click', toggleDarkMode);

    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    // 필터
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('clientCodeFilter').addEventListener('change', applyFilters);
    document.getElementById('clientNameFilter').addEventListener('change', applyFilters);
    document.getElementById('domesticExportFilter').addEventListener('change', applyFilters);
    document.getElementById('countryFilter').addEventListener('change', applyFilters);
    document.getElementById('regionExportFilter').addEventListener('change', applyFilters);
    document.getElementById('dealerChainFilter').addEventListener('change', applyFilters);
    document.getElementById('productCodeFilter').addEventListener('change', applyFilters);
    document.getElementById('cpncpFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('brandFilter').addEventListener('change', applyFilters);
    document.getElementById('tasteFilter').addEventListener('change', applyFilters);
    document.getElementById('packageFilter').addEventListener('change', applyFilters);
    document.getElementById('noteFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

    // 페이지네이션
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    document.getElementById('itemsPerPage').addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        renderTable();
    });

    // 정렬
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            handleSort(this.dataset.column);
        });
    });

    // YoY 보고서
    document.getElementById('updateYoyReportBtn').addEventListener('click', generateYoyReport);
    document.getElementById('exportYoyBtn').addEventListener('click', exportYoyToExcel);

    // 테이블 Excel 내보내기
    document.getElementById('exportTableBtn').addEventListener('click', exportTableToExcel);
}

// ============================================
// 로그인/로그아웃
// ============================================
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        const response = await fetch(`${API_URL}?action=login&token=${API_TOKEN}&username=${username}&password=${password}`);
        const result = await response.json();

        if (result.status === 'success') {
            localStorage.setItem('authToken', API_TOKEN);
            localStorage.setItem('username', result.data.username);

            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }

            showDashboard(result.data.username);
            loadAllData();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('로그인 중 오류가 발생했습니다.');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('rememberMe');
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

function showDashboard(username) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
    document.getElementById('currentUser').textContent = username;
}

function showError(message) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// ============================================
// 데이터 로딩
// ============================================
async function loadAllData() {
    try {
        // 병렬로 모든 데이터 로드
        const [salesResponse, clientResponse, productResponse] = await Promise.all([
            fetch(`${API_URL}?action=getSalesData&token=${API_TOKEN}`),
            fetch(`${API_URL}?action=getClients&token=${API_TOKEN}`),
            fetch(`${API_URL}?action=getProducts&token=${API_TOKEN}`)
        ]);

        const salesResult = await salesResponse.json();
        const clientResult = await clientResponse.json();
        const productResult = await productResponse.json();

        if (salesResult.status === 'success') {
            salesData = salesResult.data.data;
            filteredData = [...salesData];

            // 파일명 표시
            document.getElementById('dataFileName').textContent = salesResult.data.fileName;
        }

        if (clientResult.status === 'success') {
            clientData = clientResult.data;
        }

        if (productResult.status === 'success') {
            productData = productResult.data;
        }

        // 데이터 로딩 완료
        console.log('✓ 데이터 로딩 완료:', {
            판매: salesData.length,
            거래처: clientData.length,
            제품: productData.length
        });

        // UI 업데이트
        populateFilters();
        updateSummaryCards();
        renderTable();
        renderCharts();

    } catch (error) {
        console.error('Data loading error:', error);
        alert('데이터 로딩 중 오류가 발생했습니다.');
    }
}

// ============================================
// 필터 옵션 채우기
// ============================================
function populateFilters() {
    // 월 필터
    const months = [...new Set(salesData.map(item => {
        const date = item['날짜'];
        if (date && date.length >= 7) return date.substring(0, 7);
        return null;
    }).filter(m => m))].sort().reverse();
    populateSelect('monthFilter', months);

    // 거래처 관련 필터
    const clientCodes = [...new Set(clientData.map(c => c['거래처코드']).filter(v => v))];
    populateSelect('clientCodeFilter', clientCodes);

    const clientNames = [...new Set(clientData.map(c => c['거래처명(러시아어)']).filter(v => v))];
    populateSelect('clientNameFilter', clientNames);

    const domesticExport = [...new Set(clientData.map(c => c['내수수출구분']).filter(v => v))];
    populateSelect('domesticExportFilter', domesticExport);

    const countries = [...new Set(clientData.map(c => c['나라']).filter(v => v))];
    populateSelect('countryFilter', countries);

    const regionsExport = [...new Set(clientData.map(c => c['지역']).filter(v => v))];
    populateSelect('regionExportFilter', regionsExport);

    const dealerChain = [...new Set(clientData.map(c => c['대리점연방체인구분']).filter(v => v))];
    populateSelect('dealerChainFilter', dealerChain);

    // 제품 관련 필터
    const productCodes = [...new Set(productData.map(p => p['제품코드']).filter(v => v))];
    populateSelect('productCodeFilter', productCodes);

    const cpncp = [...new Set(productData.map(p => p['CP/NCP']).filter(v => v))];
    populateSelect('cpncpFilter', cpncp);

    const categories = [...new Set(productData.map(p => p['대분류']).filter(v => v))];
    populateSelect('categoryFilter', categories);

    const brands = [...new Set(productData.map(p => p['지역']).filter(v => v))];
    populateSelect('brandFilter', brands);

    const tastes = [...new Set(productData.map(p => p['맛']).filter(v => v))];
    populateSelect('tasteFilter', tastes);

    const packages = [...new Set(productData.map(p => p['패키지']).filter(v => v))];
    populateSelect('packageFilter', packages);

    const notes = [...new Set(productData.map(p => p['비고']).filter(v => v))];
    populateSelect('noteFilter', notes);
}

// 헬퍼 함수: 셀렉트 박스 옵션 채우기
function populateSelect(elementId, values) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="all">전체</option>';
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

// ============================================
// 필터링
// ============================================
function applyFilters() {
    // 모든 필터 값 가져오기
    const filters = {
        month: document.getElementById('monthFilter').value,
        clientCode: document.getElementById('clientCodeFilter').value,
        clientName: document.getElementById('clientNameFilter').value,
        domesticExport: document.getElementById('domesticExportFilter').value,
        country: document.getElementById('countryFilter').value,
        regionExport: document.getElementById('regionExportFilter').value,
        dealerChain: document.getElementById('dealerChainFilter').value,
        productCode: document.getElementById('productCodeFilter').value,
        cpncp: document.getElementById('cpncpFilter').value,
        category: document.getElementById('categoryFilter').value,
        brand: document.getElementById('brandFilter').value,
        taste: document.getElementById('tasteFilter').value,
        package: document.getElementById('packageFilter').value,
        note: document.getElementById('noteFilter').value,
        search: document.getElementById('searchInput').value.toLowerCase()
    };

    filteredData = salesData.filter(item => {
        // 월 필터
        if (filters.month !== 'all') {
            const itemMonth = item['날짜'].substring(0, 7);
            if (itemMonth !== filters.month) return false;
        }

        // 거래처 정보 가져오기 (문자열 비교)
        const client = clientData.find(c => String(c['거래처코드']) === String(item['거래처코드']));

        // 거래처 관련 필터
        if (filters.clientCode !== 'all' && String(item['거래처코드']) !== filters.clientCode) return false;
        if (filters.clientName !== 'all' && (!client || client['거래처명(러시아어)'] !== filters.clientName)) return false;
        if (filters.domesticExport !== 'all' && (!client || client['내수수출구분'] !== filters.domesticExport)) return false;
        if (filters.country !== 'all' && (!client || client['나라'] !== filters.country)) return false;
        if (filters.regionExport !== 'all' && (!client || client['지역'] !== filters.regionExport)) return false;
        if (filters.dealerChain !== 'all' && (!client || client['대리점연방체인구분'] !== filters.dealerChain)) return false;

        // 제품 정보 가져오기 (문자열 비교)
        const product = productData.find(p => String(p['제품코드']) === String(item['제품코드']));

        // 제품 관련 필터
        if (filters.productCode !== 'all' && String(item['제품코드']) !== filters.productCode) return false;
        if (filters.cpncp !== 'all' && (!product || product['CP/NCP'] !== filters.cpncp)) return false;
        if (filters.category !== 'all' && (!product || product['대분류'] !== filters.category)) return false;
        if (filters.brand !== 'all' && (!product || product['지역'] !== filters.brand)) return false;
        if (filters.taste !== 'all' && (!product || product['맛'] !== filters.taste)) return false;
        if (filters.package !== 'all' && (!product || product['패키지'] !== filters.package)) return false;
        if (filters.note !== 'all' && (!product || product['비고'] !== filters.note)) return false;

        // 검색 필터
        if (filters.search) {
            const clientName = item['거래처명'] ? item['거래처명'].toLowerCase() : '';
            const productCode = item['제품코드'] ? item['제품코드'].toLowerCase() : '';
            if (!clientName.includes(filters.search) && !productCode.includes(filters.search)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1;
    updateSummaryCards();
    renderTable();
    renderCharts();
}

function resetFilters() {
    document.getElementById('monthFilter').value = 'all';
    document.getElementById('clientCodeFilter').value = 'all';
    document.getElementById('clientNameFilter').value = 'all';
    document.getElementById('domesticExportFilter').value = 'all';
    document.getElementById('countryFilter').value = 'all';
    document.getElementById('regionExportFilter').value = 'all';
    document.getElementById('dealerChainFilter').value = 'all';
    document.getElementById('productCodeFilter').value = 'all';
    document.getElementById('cpncpFilter').value = 'all';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('brandFilter').value = 'all';
    document.getElementById('tasteFilter').value = 'all';
    document.getElementById('packageFilter').value = 'all';
    document.getElementById('noteFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    applyFilters();
}

// ============================================
// 요약 카드 업데이트
// ============================================
function updateSummaryCards() {
    // 총 판매금액 (루블)
    const totalAmount = filteredData.reduce((sum, item) => sum + (item['금액'] || 0), 0);

    // 백만 루블 단위로 변환
    const totalAmountMillion = totalAmount / 1000000;
    document.getElementById('totalAmount').textContent = formatNumber(totalAmountMillion.toFixed(1));

    // 원화로 환산 (환율 14.74, 억원 단위)
    const exchangeRate = 14.74;
    const totalAmountKRW = (totalAmount * exchangeRate) / 100000000;
    document.getElementById('totalAmountKRW').textContent = `(${formatNumber(totalAmountKRW.toFixed(1))} 억원)`;

    // 총 판매량
    const totalQuantity = filteredData.reduce((sum, item) => sum + (item['수량'] || 0), 0);
    document.getElementById('totalQuantity').textContent = formatNumber(Math.round(totalQuantity));

    // 거래처 수
    const uniqueClients = new Set(filteredData.map(item => item['거래처코드']));
    document.getElementById('clientCount').textContent = uniqueClients.size;

    // 평균 할인율
    const discounts = filteredData.filter(item => item['할인율'] > 0);
    const avgDiscount = discounts.length > 0
        ? discounts.reduce((sum, item) => sum + item['할인율'], 0) / discounts.length
        : 0;
    document.getElementById('avgDiscount').textContent = avgDiscount.toFixed(1);
}

// ============================================
// 테이블 렌더링
// ============================================
function renderTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    // 정렬 적용
    const sorted = [...filteredData].sort((a, b) => {
        let aVal, bVal;

        // 컬럼 타입에 따라 값 가져오기
        const columnType = getColumnType(sortColumn);

        if (columnType === 'sales') {
            // 판매 데이터에서 직접 가져오기
            aVal = a[getColumnKey(sortColumn)];
            bVal = b[getColumnKey(sortColumn)];
        } else if (columnType === 'client') {
            // 거래처 데이터에서 가져오기 (문자열 비교)
            const aClient = clientData.find(c => String(c['거래처코드']) === String(a['거래처코드'])) || {};
            const bClient = clientData.find(c => String(c['거래처코드']) === String(b['거래처코드'])) || {};
            aVal = aClient[getColumnKey(sortColumn)];
            bVal = bClient[getColumnKey(sortColumn)];
        } else if (columnType === 'product') {
            // 제품 데이터에서 가져오기 (문자열 비교)
            const aProduct = productData.find(p => String(p['제품코드']) === String(a['제품코드'])) || {};
            const bProduct = productData.find(p => String(p['제품코드']) === String(b['제품코드'])) || {};
            aVal = aProduct[getColumnKey(sortColumn)];
            bVal = bProduct[getColumnKey(sortColumn)];
        }

        // 숫자 비교
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // 문자열 비교
        aVal = String(aVal || '');
        bVal = String(bVal || '');
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 페이지네이션
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = sorted.slice(start, end);

    // 테이블 행 생성
    pageData.forEach((item, index) => {
        // 거래처 정보 가져오기 (문자열 비교)
        const client = clientData.find(c => String(c['거래처코드']) === String(item['거래처코드'])) || {};

        // 제품 정보 가져오기 (문자열 비교)
        const product = productData.find(p => String(p['제품코드']) === String(item['제품코드'])) || {};

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item['날짜'] || '-'}</td>
            <td>${item['주문번호'] || '-'}</td>
            <td>${formatNumber(item['수량'] || 0)}</td>
            <td>${formatNumber(item['금액'] || 0)}</td>
            <td>${item['할인율'] ? item['할인율'].toFixed(1) : '0.0'}</td>
            <td>${item['거래처코드'] || '-'}</td>
            <td>${client['거래처명(러시아어)'] || '-'}</td>
            <td>${client['거래처명(한국어)'] || '-'}</td>
            <td>${client['내수수출구분'] || '-'}</td>
            <td>${client['나라'] || '-'}</td>
            <td>${client['지역'] || '-'}</td>
            <td>${client['대리점연방체인구분'] || '-'}</td>
            <td>${item['제품코드'] || '-'}</td>
            <td>${product['CP/NCP'] || '-'}</td>
            <td>${product['판매지'] || '-'}</td>
            <td>${product['대분류'] || '-'}</td>
            <td>${product['지역'] || '-'}</td>
            <td>${product['맛'] || '-'}</td>
            <td>${product['패키지'] || '-'}</td>
            <td>${product['비고'] || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    // 페이지네이션 업데이트
    updatePagination(sorted.length);
}

function getColumnKey(column) {
    const columnMap = {
        // 판매 데이터 (5개)
        'date': '날짜',
        'orderNumber': '주문번호',
        'quantity': '수량',
        'amount': '금액',
        'discount': '할인율',

        // 거래처 데이터 (7개)
        'clientCode': '거래처코드',
        'clientNameRu': '거래처명(러시아어)',
        'clientNameKr': '거래처명(한국어)',
        'domesticExport': '내수수출구분',
        'country': '나라',
        'region': '지역',
        'dealerChain': '대리점연방체인구분',

        // 제품 데이터 (8개)
        'productCode': '제품코드',
        'cpncp': 'CP/NCP',
        'salesRegion': '판매지',
        'category': '대분류',
        'brand': '지역',
        'taste': '맛',
        'package': '패키지',
        'note': '비고'
    };
    return columnMap[column] || '날짜';
}

function getColumnType(column) {
    const salesColumns = ['date', 'orderNumber', 'quantity', 'amount', 'discount', 'clientCode', 'productCode'];
    const clientColumns = ['clientNameRu', 'clientNameKr', 'domesticExport', 'country', 'region', 'dealerChain'];
    const productColumns = ['cpncp', 'salesRegion', 'category', 'brand', 'taste', 'package', 'note'];

    if (salesColumns.includes(column)) return 'sales';
    if (clientColumns.includes(column)) return 'client';
    if (productColumns.includes(column)) return 'product';
    return 'sales';
}

// ============================================
// 정렬
// ============================================
function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }
    renderTable();
}

// ============================================
// 페이지네이션
// ============================================
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(delta) {
    currentPage += delta;
    renderTable();
}

// ============================================
// 탭 전환
// ============================================
function switchTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 선택된 탭 활성화
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}View`);

    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');

    // 차트 탭으로 전환 시 차트 리사이즈
    if (tabName === 'chart') {
        setTimeout(() => {
            if (monthlyChart) monthlyChart.resize();
            if (regionChart) regionChart.resize();
            if (productChart) productChart.resize();
            if (clientChart) clientChart.resize();
        }, 300);
    }

    localStorage.setItem('currentTab', tabName);
}

// ============================================
// 차트 렌더링
// ============================================
function renderCharts() {
    renderMonthlyChart();
    renderRegionChart();
    renderProductChart();
    renderClientChart();
}

// 월별 판매 추이
function renderMonthlyChart() {
    const chartDom = document.getElementById('monthlyChart');
    if (!chartDom) return;

    if (monthlyChart) {
        monthlyChart.dispose();
    }

    monthlyChart = echarts.init(chartDom);

    // 월별 집계
    const monthlyData = {};
    filteredData.forEach(item => {
        const month = item['날짜'].substring(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { quantity: 0, amount: 0 };
        }
        monthlyData[month].quantity += item['수량'] || 0;
        monthlyData[month].amount += item['금액'] || 0;
    });

    const months = Object.keys(monthlyData).sort();
    const quantities = months.map(m => Math.round(monthlyData[m].quantity));
    const amounts = months.map(m => Math.round(monthlyData[m].amount));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            data: ['판매량(박스)', '판매금액(루블)']
        },
        xAxis: {
            type: 'category',
            data: months
        },
        yAxis: [
            {
                type: 'value',
                name: '판매량(박스)',
                position: 'left'
            },
            {
                type: 'value',
                name: '판매금액(루블)',
                position: 'right'
            }
        ],
        series: [
            {
                name: '판매량(박스)',
                type: 'bar',
                data: quantities,
                itemStyle: { color: '#5f7d95' }
            },
            {
                name: '판매금액(루블)',
                type: 'line',
                yAxisIndex: 1,
                data: amounts,
                itemStyle: { color: '#52c41a' }
            }
        ]
    };

    monthlyChart.setOption(option);
}

// 지역별 판매 비중
function renderRegionChart() {
    const chartDom = document.getElementById('regionChart');
    if (!chartDom) return;

    if (regionChart) {
        regionChart.dispose();
    }

    regionChart = echarts.init(chartDom);

    // 지역별 집계
    const regionData = {};
    filteredData.forEach(item => {
        const client = clientData.find(c => String(c['거래처코드']) === String(item['거래처코드']));
        const region = client ? client['지역'] : '기타';

        if (!regionData[region]) {
            regionData[region] = 0;
        }
        regionData[region] += item['금액'] || 0;
    });

    const data = Object.keys(regionData).map(region => ({
        name: region,
        value: Math.round(regionData[region])
    }));

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 루블 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left'
        },
        series: [
            {
                type: 'pie',
                radius: '50%',
                data: data,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    regionChart.setOption(option);
}

// 제품별 판매 TOP 10
function renderProductChart() {
    const chartDom = document.getElementById('productChart');
    if (!chartDom) return;

    if (productChart) {
        productChart.dispose();
    }

    productChart = echarts.init(chartDom);

    // 제품별 집계
    const productSales = {};
    filteredData.forEach(item => {
        const code = item['제품코드'];
        if (!productSales[code]) {
            productSales[code] = 0;
        }
        productSales[code] += item['금액'] || 0;
    });

    // TOP 10
    const sorted = Object.keys(productSales)
        .map(code => ({ code, amount: productSales[code] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        xAxis: {
            type: 'value',
            name: '판매금액(루블)'
        },
        yAxis: {
            type: 'category',
            data: sorted.map(p => p.code).reverse()
        },
        series: [
            {
                type: 'bar',
                data: sorted.map(p => Math.round(p.amount)).reverse(),
                itemStyle: { color: '#5f7d95' }
            }
        ]
    };

    productChart.setOption(option);
}

// 거래처별 판매 TOP 10
function renderClientChart() {
    const chartDom = document.getElementById('clientChart');
    if (!chartDom) return;

    if (clientChart) {
        clientChart.dispose();
    }

    clientChart = echarts.init(chartDom);

    // 거래처별 집계
    const clientSales = {};
    filteredData.forEach(item => {
        const code = item['거래처코드'];
        const name = item['거래처명'] || code;
        if (!clientSales[code]) {
            clientSales[code] = { name, amount: 0 };
        }
        clientSales[code].amount += item['금액'] || 0;
    });

    // TOP 10
    const sorted = Object.keys(clientSales)
        .map(code => ({ name: clientSales[code].name, amount: clientSales[code].amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        xAxis: {
            type: 'value',
            name: '판매금액(루블)'
        },
        yAxis: {
            type: 'category',
            data: sorted.map(c => c.name).reverse()
        },
        series: [
            {
                type: 'bar',
                data: sorted.map(c => Math.round(c.amount)).reverse(),
                itemStyle: { color: '#52c41a' }
            }
        ]
    };

    clientChart.setOption(option);
}

// ============================================
// 다크모드
// ============================================
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

function toggleDarkMode() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // 차트 테마 업데이트
    if (monthlyChart || regionChart || productChart || clientChart) {
        renderCharts();
    }
}

// ============================================
// 유틸리티 함수
// ============================================
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================
// YoY 보고서 함수
// ============================================
function generateYoyReport() {
    const periodEnd = parseInt(document.getElementById('yoyPeriodStart').value);

    // 2024년과 2025년 데이터 분리
    const data2024 = salesData.filter(item => {
        const year = item['날짜'] ? item['날짜'].substring(0, 4) : '';
        return year === '2024';
    });

    const data2025 = salesData.filter(item => {
        const year = item['날짜'] ? item['날짜'].substring(0, 4) : '';
        return year === '2025';
    });

    console.log('YoY 데이터 분리:', {
        '2024년': data2024.length,
        '2025년': data2025.length,
        '비교 기간': `1-${periodEnd}월`
    });

    // 국가별/거래처별 데이터 계산
    const yoyData = calculateYoyData(data2024, data2025, periodEnd);

    // 테이블 렌더링
    renderYoyTable(yoyData, periodEnd);
}

function calculateYoyData(data2024, data2025, periodEnd) {
    const result = {};

    // 2024년 데이터 집계
    data2024.forEach(item => {
        const date = item['날짜'] || '';
        const month = date.length >= 7 ? parseInt(date.substring(5, 7)) : 0;
        const clientCode = String(item['거래처코드']);
        const amount = parseFloat(item['금액']) || 0;

        // 거래처 정보 가져오기
        const client = clientData.find(c => String(c['거래처코드']) === clientCode);
        if (!client) return;

        const country = client['나라'] || '기타';
        const clientNameRu = client['거래처명(러시아어)'] || item['거래처명'] || '알 수 없음';
        const clientNameKr = client['거래처명(한국어)'] || '';

        const key = `${country}|||${clientCode}|||${clientNameRu}|||${clientNameKr}`;

        if (!result[key]) {
            result[key] = {
                country,
                clientCode,
                clientNameRu,
                clientNameKr,
                amount2024_cumulative: 0,
                amount2024_dec: 0,
                amount2025_cumulative: 0,
                amount2025_dec: 0,
                target2025: 0,
                orderConfirmed: 0,
                note: ''
            };
        }

        // 1-N월 누적
        if (month >= 1 && month <= periodEnd) {
            result[key].amount2024_cumulative += amount;
        }

        // 12월
        if (month === 12) {
            result[key].amount2024_dec += amount;
        }
    });

    // 2025년 데이터 집계
    data2025.forEach(item => {
        const date = item['날짜'] || '';
        const month = date.length >= 7 ? parseInt(date.substring(5, 7)) : 0;
        const clientCode = String(item['거래처코드']);
        const amount = parseFloat(item['금액']) || 0;

        // 거래처 정보 가져오기
        const client = clientData.find(c => String(c['거래처코드']) === clientCode);
        if (!client) return;

        const country = client['나라'] || '기타';
        const clientNameRu = client['거래처명(러시아어)'] || item['거래처명'] || '알 수 없음';
        const clientNameKr = client['거래처명(한국어)'] || '';

        const key = `${country}|||${clientCode}|||${clientNameRu}|||${clientNameKr}`;

        if (!result[key]) {
            result[key] = {
                country,
                clientCode,
                clientNameRu,
                clientNameKr,
                amount2024_cumulative: 0,
                amount2024_dec: 0,
                amount2025_cumulative: 0,
                amount2025_dec: 0,
                target2025: 0,
                orderConfirmed: 0,
                note: ''
            };
        }

        // 1-N월 누적
        if (month >= 1 && month <= periodEnd) {
            result[key].amount2025_cumulative += amount;
        }

        // 12월
        if (month === 12) {
            result[key].amount2025_dec += amount;
        }
    });

    // 배열로 변환 및 국가별 정렬
    return Object.values(result).sort((a, b) => {
        if (a.country !== b.country) {
            return a.country.localeCompare(b.country);
        }
        return b.amount2025_cumulative - a.amount2025_cumulative;
    });
}

function renderYoyTable(yoyData, periodEnd) {
    const tbody = document.getElementById('yoyTableBody');

    if (yoyData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 40px; color: var(--secondary-color);">
                    해당 기간에 데이터가 없습니다
                </td>
            </tr>
        `;
        return;
    }

    // 테이블 헤더 업데이트 (1-N월 표시)
    const thead = document.querySelector('#yoyTable thead');
    const periodHeader = thead.querySelector('th[colspan="3"]');
    if (periodHeader) {
        periodHeader.textContent = `1-${periodEnd}월 누적 (백만 루블)`;
    }

    let html = '';
    let currentCountry = '';
    let countryTotal2024Cum = 0;
    let countryTotal2025Cum = 0;
    let countryTotal2024Dec = 0;
    let countryTotal2025Dec = 0;

    yoyData.forEach((row, index) => {
        // 국가가 바뀌면 국가 소계 행 추가
        if (row.country !== currentCountry) {
            if (currentCountry) {
                // 이전 국가 소계
                const change = countryTotal2024Cum > 0
                    ? ((countryTotal2025Cum - countryTotal2024Cum) / countryTotal2024Cum * 100)
                    : 0;
                const changeClass = change >= 0 ? 'positive' : 'negative';

                html += `
                    <tr class="country-row">
                        <td colspan="2"><strong>${currentCountry} 소계</strong></td>
                        <td>-</td>
                        <td><strong>${(countryTotal2024Cum / 1000000).toFixed(1)}</strong></td>
                        <td><strong>${(countryTotal2025Cum / 1000000).toFixed(1)}</strong></td>
                        <td class="${changeClass}"><strong>${change >= 0 ? '+' : ''}${change.toFixed(1)}%</strong></td>
                        <td><strong>${(countryTotal2024Dec / 1000000).toFixed(1)}</strong></td>
                        <td><strong>${(countryTotal2025Dec / 1000000).toFixed(1)}</strong></td>
                        <td colspan="4">-</td>
                    </tr>
                `;

                // 리셋
                countryTotal2024Cum = 0;
                countryTotal2025Cum = 0;
                countryTotal2024Dec = 0;
                countryTotal2025Dec = 0;
            }
            currentCountry = row.country;
        }

        // 백만 루블로 변환
        const amount2024Cum = row.amount2024_cumulative / 1000000;
        const amount2025Cum = row.amount2025_cumulative / 1000000;
        const amount2024Dec = row.amount2024_dec / 1000000;
        const amount2025Dec = row.amount2025_dec / 1000000;

        // 증감율 계산
        const change = amount2024Cum > 0
            ? ((amount2025Cum - amount2024Cum) / amount2024Cum * 100)
            : (amount2025Cum > 0 ? 100 : 0);
        const changeClass = change >= 0 ? 'positive' : 'negative';

        // 목표달성률
        const target = row.target2025;
        const achievement = target > 0 ? (amount2025Cum / target * 100) : 0;
        const remaining = target > 0 ? (target - amount2025Cum) : 0;

        // 국가 소계 누적
        countryTotal2024Cum += row.amount2024_cumulative;
        countryTotal2025Cum += row.amount2025_cumulative;
        countryTotal2024Dec += row.amount2024_dec;
        countryTotal2025Dec += row.amount2025_dec;

        html += `
            <tr>
                <td>${row.country}</td>
                <td>${row.clientNameKr || row.clientNameRu}</td>
                <td class="editable" data-field="target" data-key="${index}">${target > 0 ? target.toFixed(1) : '-'}</td>
                <td>${amount2024Cum.toFixed(1)}</td>
                <td>${amount2025Cum.toFixed(1)}</td>
                <td class="${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(1)}%</td>
                <td>${amount2024Dec > 0 ? amount2024Dec.toFixed(1) : '-'}</td>
                <td>${amount2025Dec > 0 ? amount2025Dec.toFixed(1) : '-'}</td>
                <td>${achievement > 0 ? achievement.toFixed(1) + '%' : '-'}</td>
                <td>${remaining > 0 ? remaining.toFixed(1) : '-'}</td>
                <td class="editable" data-field="order" data-key="${index}">${row.orderConfirmed > 0 ? row.orderConfirmed.toFixed(1) : '-'}</td>
                <td class="editable" data-field="note" data-key="${index}">${row.note || ''}</td>
            </tr>
        `;

        // 마지막 행인 경우 국가 소계 추가
        if (index === yoyData.length - 1) {
            const change = countryTotal2024Cum > 0
                ? ((countryTotal2025Cum - countryTotal2024Cum) / countryTotal2024Cum * 100)
                : 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';

            html += `
                <tr class="country-row">
                    <td colspan="2"><strong>${currentCountry} 소계</strong></td>
                    <td>-</td>
                    <td><strong>${(countryTotal2024Cum / 1000000).toFixed(1)}</strong></td>
                    <td><strong>${(countryTotal2025Cum / 1000000).toFixed(1)}</strong></td>
                    <td class="${changeClass}"><strong>${change >= 0 ? '+' : ''}${change.toFixed(1)}%</strong></td>
                    <td><strong>${(countryTotal2024Dec / 1000000).toFixed(1)}</strong></td>
                    <td><strong>${(countryTotal2025Dec / 1000000).toFixed(1)}</strong></td>
                    <td colspan="4">-</td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;

    // 편집 가능한 셀 클릭 이벤트
    tbody.querySelectorAll('td.editable').forEach(td => {
        td.addEventListener('click', function() {
            makeEditable(this);
        });
    });
}

function makeEditable(td) {
    if (td.querySelector('input')) return; // 이미 편집 중이면 무시

    const originalValue = td.textContent.trim();
    const field = td.dataset.field;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = originalValue === '-' ? '' : originalValue;

    input.addEventListener('blur', function() {
        const newValue = this.value.trim();
        td.textContent = newValue || '-';

        // TODO: 데이터 저장 로직 (localStorage 또는 Google Sheets)
        console.log('셀 업데이트:', { field, value: newValue });
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur();
        }
        if (e.key === 'Escape') {
            td.textContent = originalValue;
        }
    });

    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
}

function exportYoyToExcel() {
    // YoY 테이블 데이터 확인
    const tbody = document.getElementById('yoyTableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0 || rows[0].cells.length === 1) {
        alert('먼저 "보고서 갱신" 버튼을 클릭하여 보고서를 생성하세요.');
        return;
    }

    // 비교 기간 가져오기
    const periodEnd = document.getElementById('yoyPeriodStart').value;

    // Excel 데이터 배열 생성
    const data = [];

    // 헤더 추가
    data.push([
        '국가',
        '거래처',
        '25년 목표\n(백만 루블)',
        `1-${periodEnd}월 누적 24년\n(백만 루블)`,
        `1-${periodEnd}월 누적 25년\n(백만 루블)`,
        '증감 (%)',
        '12월 24년\n(백만 루블)',
        '12월 25년\n(백만 루블)',
        '목표달성\n(%)',
        '잔여매출\n(백만 루블)',
        '오더확정액\n(백만 루블)',
        '비고'
    ]);

    // 데이터 행 추가
    rows.forEach(row => {
        if (row.cells.length === 12) {
            const rowData = [];
            for (let i = 0; i < row.cells.length; i++) {
                let cellText = row.cells[i].textContent.trim();

                // "+" 제거 및 숫자 변환
                if (cellText.includes('%')) {
                    cellText = cellText.replace('+', '');
                } else if (cellText !== '-' && i >= 2 && i <= 10) {
                    // 숫자 셀인 경우 "-"가 아니면 숫자로 변환
                    const num = parseFloat(cellText);
                    if (!isNaN(num)) {
                        cellText = num;
                    }
                }

                rowData.push(cellText === '-' ? '' : cellText);
            }
            data.push(rowData);
        }
    });

    // SheetJS 워크북 생성
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 설정
    ws['!cols'] = [
        { wch: 12 },  // 국가
        { wch: 25 },  // 거래처
        { wch: 12 },  // 25년 목표
        { wch: 12 },  // 1-N월 24년
        { wch: 12 },  // 1-N월 25년
        { wch: 12 },  // 증감
        { wch: 12 },  // 12월 24년
        { wch: 12 },  // 12월 25년
        { wch: 12 },  // 목표달성
        { wch: 12 },  // 잔여매출
        { wch: 12 },  // 오더확정액
        { wch: 20 }   // 비고
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'YoY 비교');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = today.getFullYear() +
                    String(today.getMonth() + 1).padStart(2, '0') +
                    String(today.getDate()).padStart(2, '0');
    const filename = `국가별_거래처별_YoY비교보고서_${dateStr}.xlsx`;

    // Excel 파일 다운로드
    XLSX.writeFile(wb, filename);

    console.log(`Excel 파일 내보내기 완료: ${filename}`);
}

// ============================================
// 테이블 Excel 내보내기
// ============================================
function exportTableToExcel() {
    // 현재 필터링된 데이터 확인
    if (filteredData.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    // Excel 데이터 배열 생성
    const data = [];

    // 헤더 추가
    data.push([
        '날짜',
        '주문번호',
        '수량(박스)',
        '금액(루블)',
        '할인율(%)',
        '거래처코드',
        '거래처명(러시아어)',
        '거래처명(한국어)',
        '내수/수출',
        '나라',
        '지역',
        '대리점/연방체인',
        '제품코드',
        'CP/NCP',
        '판매지',
        '카테고리',
        '브랜드',
        '맛',
        '패키지',
        '비고'
    ]);

    // 데이터 행 추가 (필터링된 전체 데이터)
    filteredData.forEach(item => {
        // 거래처 정보 가져오기
        const clientCode = String(item['거래처코드']);
        const client = clientData.find(c => String(c['거래처코드']) === clientCode);

        // 제품 정보 가져오기
        const productCode = String(item['제품코드']);
        const product = productData.find(p => String(p['제품코드']) === productCode);

        const row = [
            item['날짜'] || '',
            item['주문번호'] || '',
            parseFloat(item['수량']) || 0,
            parseFloat(item['금액']) || 0,
            parseFloat(item['할인율']) || 0,
            clientCode,
            client ? client['거래처명(러시아어)'] : '',
            client ? client['거래처명(한국어)'] : '',
            client ? client['내수수출구분'] : '',
            client ? client['나라'] : '',
            client ? client['지역'] : '',
            client ? client['대리점연방체인구분'] : '',
            productCode,
            product ? product['CP/NCP'] : '',
            product ? product['판매지'] : '',
            product ? product['대분류'] : '',
            product ? product['지역'] : '',
            product ? product['맛'] : '',
            product ? product['패키지'] : '',
            product ? product['비고'] : ''
        ];

        data.push(row);
    });

    // SheetJS 워크북 생성
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 설정
    ws['!cols'] = [
        { wch: 12 },  // 날짜
        { wch: 15 },  // 주문번호
        { wch: 12 },  // 수량
        { wch: 12 },  // 금액
        { wch: 10 },  // 할인율
        { wch: 12 },  // 거래처코드
        { wch: 25 },  // 거래처명(러)
        { wch: 20 },  // 거래처명(한)
        { wch: 10 },  // 내수/수출
        { wch: 12 },  // 나라
        { wch: 12 },  // 지역
        { wch: 15 },  // 대리점/연방체인
        { wch: 12 },  // 제품코드
        { wch: 10 },  // CP/NCP
        { wch: 12 },  // 판매지
        { wch: 12 },  // 카테고리
        { wch: 12 },  // 브랜드
        { wch: 12 },  // 맛
        { wch: 12 },  // 패키지
        { wch: 15 }   // 비고
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '판매 데이터');

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date();
    const dateStr = today.getFullYear() +
                    String(today.getMonth() + 1).padStart(2, '0') +
                    String(today.getDate()).padStart(2, '0');
    const filename = `판매데이터_${dateStr}.xlsx`;

    // Excel 파일 다운로드
    XLSX.writeFile(wb, filename);

    console.log(`Excel 파일 내보내기 완료: ${filename} (${filteredData.length}건)`);
}
