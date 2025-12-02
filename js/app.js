// ============================================
// 판매관리 대시보드 - JavaScript
// ============================================

// API 설정
const API_URL = 'https://script.google.com/macros/s/AKfycbwdAM6gdq3AudOlioiEMN7sj0F1p7r8H68GucsxKv4_HYudhVbLju0etd4MJgicRe3tlA/exec';
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
    document.getElementById('clientFilter').addEventListener('change', applyFilters);
    document.getElementById('regionFilter').addEventListener('change', applyFilters);
    document.getElementById('productFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
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
    // 월 필터 (판매 데이터에서 추출)
    const months = [...new Set(salesData.map(item => {
        const date = item['날짜'];
        if (date && date.length >= 7) {
            return date.substring(0, 7); // YYYY-MM
        }
        return null;
    }).filter(m => m))].sort().reverse();

    const monthFilter = document.getElementById('monthFilter');
    monthFilter.innerHTML = '<option value="all">전체</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthFilter.appendChild(option);
    });

    // 거래처 필터
    const clientFilter = document.getElementById('clientFilter');
    clientFilter.innerHTML = '<option value="all">전체</option>';
    clientData.forEach(client => {
        const option = document.createElement('option');
        option.value = client['거래처코드'];
        option.textContent = `${client['거래처명(러시아어)']} (${client['거래처코드']})`;
        clientFilter.appendChild(option);
    });

    // 지역 필터
    const regions = [...new Set(clientData.map(c => c['지역']).filter(r => r))];
    const regionFilter = document.getElementById('regionFilter');
    regionFilter.innerHTML = '<option value="all">전체</option>';
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });

    // 제품코드 필터
    const productFilter = document.getElementById('productFilter');
    productFilter.innerHTML = '<option value="all">전체</option>';
    productData.forEach(product => {
        const option = document.createElement('option');
        option.value = product['제품코드'];
        option.textContent = product['제품코드'];
        productFilter.appendChild(option);
    });

    // 카테고리 필터
    const categories = [...new Set(productData.map(p => p['대분류']).filter(c => c))];
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="all">전체</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// ============================================
// 필터링
// ============================================
function applyFilters() {
    const monthValue = document.getElementById('monthFilter').value;
    const clientValue = document.getElementById('clientFilter').value;
    const regionValue = document.getElementById('regionFilter').value;
    const productValue = document.getElementById('productFilter').value;
    const categoryValue = document.getElementById('categoryFilter').value;
    const searchValue = document.getElementById('searchInput').value.toLowerCase();

    filteredData = salesData.filter(item => {
        // 월 필터
        if (monthValue !== 'all') {
            const itemMonth = item['날짜'].substring(0, 7);
            if (itemMonth !== monthValue) return false;
        }

        // 거래처 필터
        if (clientValue !== 'all' && item['거래처코드'] !== clientValue) {
            return false;
        }

        // 지역 필터 (거래처 정보와 매칭)
        if (regionValue !== 'all') {
            const client = clientData.find(c => c['거래처코드'] === item['거래처코드']);
            if (!client || client['지역'] !== regionValue) return false;
        }

        // 제품 필터
        if (productValue !== 'all' && item['제품코드'] !== productValue) {
            return false;
        }

        // 카테고리 필터 (제품 정보와 매칭)
        if (categoryValue !== 'all') {
            const product = productData.find(p => p['제품코드'] === item['제품코드']);
            if (!product || product['대분류'] !== categoryValue) return false;
        }

        // 검색 필터
        if (searchValue) {
            const clientName = item['거래처명'] ? item['거래처명'].toLowerCase() : '';
            const productCode = item['제품코드'] ? item['제품코드'].toLowerCase() : '';
            if (!clientName.includes(searchValue) && !productCode.includes(searchValue)) {
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
    document.getElementById('clientFilter').value = 'all';
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('productFilter').value = 'all';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    applyFilters();
}

// ============================================
// 요약 카드 업데이트
// ============================================
function updateSummaryCards() {
    // 총 판매금액
    const totalAmount = filteredData.reduce((sum, item) => sum + (item['금액'] || 0), 0);
    document.getElementById('totalAmount').textContent = formatNumber(Math.round(totalAmount));

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
        let aVal = a[getColumnKey(sortColumn)];
        let bVal = b[getColumnKey(sortColumn)];

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
    pageData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item['날짜'] || '-'}</td>
            <td>${item['거래처코드'] || '-'}</td>
            <td>${item['거래처명'] || '-'}</td>
            <td>${item['제품코드'] || '-'}</td>
            <td>${formatNumber(item['수량'] || 0)}</td>
            <td>${formatNumber(item['금액'] || 0)}</td>
            <td>${item['주문번호'] || '-'}</td>
            <td>${item['할인율'] ? item['할인율'].toFixed(1) : '0.0'}</td>
        `;
        tbody.appendChild(tr);
    });

    // 페이지네이션 업데이트
    updatePagination(sorted.length);
}

function getColumnKey(column) {
    const columnMap = {
        'date': '날짜',
        'clientCode': '거래처코드',
        'clientName': '거래처명',
        'productCode': '제품코드',
        'quantity': '수량',
        'amount': '금액',
        'orderNumber': '주문번호',
        'discount': '할인율'
    };
    return columnMap[column] || '날짜';
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
        const client = clientData.find(c => c['거래처코드'] === item['거래처코드']);
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
