"use strict";

/**
 * AdminPanel - Quản lý giao diện admin
 * Tương thích với admin.html và được tối ưu hóa cho hiệu suất
 */

// Backend Configuration
const CONFIG = {
    API_BASE_URL: 'https://shop-4mlk.onrender.com/api/v1',
    SOCKET_URL: 'https://shop-4mlk.onrender.com/api/v1',
    AUTHORIZED_EMAILS: [
        'chinhan20917976549a@gmail.com',
        'ryantran149@gmail.com',
        'seller@shopgrowgarden.com',
        'greensvn@gmail.com'
    ],
    STORAGE_KEYS: {
        TOKEN: 'gag_token',
        USER: 'gag_user',
        PRODUCTS: 'gag_products'
    },
    TOAST_DURATION: 3000,
    ANIMATION_DELAY: 0.08,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    PRODUCT_VALIDATION: {
        TITLE_MIN: 5,
        TITLE_MAX: 100,
        DESC_MIN: 10,
        DESC_MAX: 500,
        PRICE_MIN: 1000,
        PRICE_MAX: 50000000
    }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;

const AdminPanel = {
    // --- STATE ---
    products: [],
    users: [],
    activity: [],
    currentUser: null,
    socket: null,
    isInitialized: false,
    isLoading: false,

    // Pagination State
    productCurrentPage: 1,
    userCurrentPage: 1,
    itemsPerPage: 7,

    // Sorting State
    productSort: { column: 'createdAt', order: 'desc' },
    userSort: { column: 'createdAt', order: 'desc' },

    // --- INITIALIZATION ---
    init() {
        console.log('AdminPanel.init() called');
        
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializePanel();
            });
        } else {
            this.initializePanel();
        }
    },

    initializePanel() {
        console.log('Initializing AdminPanel...');
        this.bindEvents();
        this.checkAuthAndToggleView();
        console.log('AdminPanel initialized successfully');
    },

    checkAuthAndToggleView() {
        // Get current user from localStorage or global
        const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                window.currentUser = this.currentUser;
            } catch (e) {
                console.error('Error parsing stored user:', e);
                this.currentUser = null;
                window.currentUser = null;
            }
        } else {
            this.currentUser = window.currentUser || null;
        }

        const loginContainer = document.getElementById('admin-login-container');
        const sidebar = document.getElementById('adminSidebar');
        const mainContent = document.getElementById('adminMain');
        const errorMessage = document.getElementById('login-error-message');

        // Check if user is admin
        const isAdmin = this.currentUser && (
            this.currentUser.role === 'admin' || 
            CONFIG.AUTHORIZED_EMAILS.includes(this.currentUser.email)
        );

        if (isAdmin) {
            this.showElement(loginContainer, false);
            this.showElement(sidebar, true);
            this.showElement(mainContent, true);

            if (!this.isInitialized) {
                this.setupPanel();
            }
        } else {
            this.showElement(loginContainer, true);
            this.showElement(sidebar, false);
            this.showElement(mainContent, false);

            if (this.currentUser && errorMessage) {
                errorMessage.textContent = 'Truy cập bị từ chối. Yêu cầu quyền Admin.';
            } else if (errorMessage) {
                errorMessage.textContent = '';
            }
            this.isInitialized = false;
        }
    },

    showElement(element, show) {
        if (!element) return;
        element.style.display = show ? (element.id === 'adminSidebar' ? 'flex' : 'block') : 'none';
    },

    setupPanel() {
        if (this.isInitialized) return;

        const adminName = document.getElementById('adminName');
        if (adminName && this.currentUser) {
            adminName.textContent = this.currentUser.name || this.currentUser.email || 'Admin';
        }

        this.fetchInitialData();
        this.setupWebSocket();
        this.navigateToTab('dashboard-tab');
        this.isInitialized = true;
    },

    bindEvents() {
        // Auth change event
        document.addEventListener('authChange', (event) => {
            this.currentUser = event.detail?.user;
            this.checkAuthAndToggleView();
        });

        // Login form
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Admin logout
        const adminLogout = document.getElementById('adminLogout');
        if (adminLogout) {
            adminLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAdminLogout();
            });
        }

        // Navigation tabs
        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget?.dataset?.tab;
                if (tabId) {
                    this.navigateToTab(tabId);
                }
            });
        });

        // Sidebar toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Close sidebar on main content click (mobile)
        const adminMain = document.getElementById('adminMain');
        if (adminMain) {
            adminMain.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    this.closeSidebar();
                }
            });
        }

        // Product modal events
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openProductModal());
        }

        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeProductModal());
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeProductModal());
        }

        const productModal = document.getElementById('product-modal');
        if (productModal) {
            productModal.addEventListener('click', (e) => {
                if (e.target?.id === 'product-modal') {
                    this.closeProductModal();
                }
            });
        }

        // Product form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
        }

        // Broadcast form
        const broadcastForm = document.getElementById('broadcastForm');
        if (broadcastForm) {
            broadcastForm.addEventListener('submit', (e) => this.handleBroadcastSubmit(e));
        }

        // Image preview
        const imagesInput = document.getElementById('images');
        if (imagesInput) {
            imagesInput.addEventListener('input', (e) => this.updateImagePreview(e.target.value));
        }

        // Search inputs with debounce
        const productSearchInput = document.getElementById('productSearchInput');
        if (productSearchInput) {
            productSearchInput.addEventListener('input', this.debounce((e) => this.filterAndRenderProducts(e.target.value), 300));
        }

        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', this.debounce((e) => this.filterAndRenderUsers(e.target.value), 300));
        }

        // Sorting
        document.querySelectorAll('#products-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort('product', th.dataset.sort));
        });

        document.querySelectorAll('#users-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort('user', th.dataset.sort));
        });

        // Table actions
        const productsTableBody = document.getElementById('products-table-body');
        if (productsTableBody) {
            productsTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'product'));
        }

        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) {
            usersTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'user'));
        }
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    async handleAdminLogin(e) {
        e.preventDefault();
        console.log('handleAdminLogin called');
        
        const emailInput = document.getElementById('admin-email');
        const passwordInput = document.getElementById('admin-password');
        const errorMessage = document.getElementById('login-error-message');
        const submitBtn = e.target.querySelector('.btn-login');

        if (!emailInput || !passwordInput || !submitBtn) {
            console.error('Missing form elements');
            return;
        }

        // Validation
        if (!emailInput.value.trim()) {
            errorMessage.textContent = 'Vui lòng nhập email.';
            return;
        }

        if (!passwordInput.value.trim()) {
            errorMessage.textContent = 'Vui lòng nhập mật khẩu.';
            return;
        }

        console.log('Attempting login with:', { email: emailInput.value });

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            console.log('Calling custom admin login...');
            
            // Custom admin login without triggering UI updates
            const data = await this.apiCall('/users/login', 'POST', { 
                email: emailInput.value, 
                password: passwordInput.value 
            });
            
            // Store user data
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, data.token);
            this.currentUser = { ...data.data.user, email: data.data.user.email || emailInput.value };
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            
            // Update global currentUser for compatibility
            window.currentUser = this.currentUser;
            
            console.log('Admin login successful:', this.currentUser);
            
            // Show success message
            this.showToast('Đăng nhập admin thành công!', 'success');
            
            // Update UI without triggering reload
            this.checkAuthAndToggleView();
            
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng nhập';
        }
    },

    handleAdminLogout() {
        if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
        
        // Clear storage
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        
        // Clear user data
        this.currentUser = null;
        window.currentUser = null;
        
        // Show logout message
        this.showToast('Đăng xuất thành công!', 'success');
        
        // Update UI
        this.checkAuthAndToggleView();
    },

    async fetchInitialData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.setLoadingState('products-table-body', 6);
        this.setLoadingState('users-table-body', 5);

        try {
            const [productsData, usersData] = await Promise.all([
                this.apiCall('/products?limit=1000&sort=-createdAt', 'GET', null, false),
                this.apiCall('/users', 'GET', null, true)
            ]);

            this.products = productsData?.data?.products || [];
            this.users = usersData?.data?.users || [];

            this.generateActivityFeed();
            this.renderAll();
        } catch (error) {
            this.showToast('Không thể tải dữ liệu quản trị. ' + (error?.message || ''), 'error');
            this.setErrorState('products-table-body', 6, 'Lỗi tải sản phẩm');
            this.setErrorState('users-table-body', 5, 'Lỗi tải người dùng');
        } finally {
            this.isLoading = false;
        }
    },

    // API Helper Methods
    async apiCall(endpoint, method = 'GET', data = null, requireAuth = false) {
        const url = CONFIG.API_BASE_URL + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (requireAuth) {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
            if (!token) {
                throw new Error('Không có token xác thực');
            }
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Lỗi kết nối server');
        }

        return responseData;
    },

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#28a745';
                break;
            case 'error':
                toast.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                toast.style.backgroundColor = '#ffc107';
                toast.style.color = '#212529';
                break;
            default:
                toast.style.backgroundColor = '#17a2b8';
        }

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, CONFIG.TOAST_DURATION);
    },

    formatPrice(price) {
        const num = typeof price === 'string' ? parseInt(price, 10) : price;
        if (isNaN(num)) return '0đ';
        return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    },

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch {
            return 'N/A';
        }
    },

    sanitizeInput(input) {
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    },

    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    validateProductData(data) {
        const errors = [];

        if (!data.title || data.title.trim().length < CONFIG.PRODUCT_VALIDATION.TITLE_MIN) {
            errors.push(`Tiêu đề phải có ít nhất ${CONFIG.PRODUCT_VALIDATION.TITLE_MIN} ký tự`);
        }

        if (data.title && data.title.trim().length > CONFIG.PRODUCT_VALIDATION.TITLE_MAX) {
            errors.push(`Tiêu đề không được vượt quá ${CONFIG.PRODUCT_VALIDATION.TITLE_MAX} ký tự`);
        }

        if (!data.price || isNaN(data.price) || data.price < CONFIG.PRODUCT_VALIDATION.PRICE_MIN) {
            errors.push(`Giá phải từ ${this.formatPrice(CONFIG.PRODUCT_VALIDATION.PRICE_MIN)} trở lên`);
        }

        if (data.price && data.price > CONFIG.PRODUCT_VALIDATION.PRICE_MAX) {
            errors.push(`Giá không được vượt quá ${this.formatPrice(CONFIG.PRODUCT_VALIDATION.PRICE_MAX)}`);
        }

        if (!data.stock || isNaN(data.stock) || data.stock < 0) {
            errors.push('Số lượng tồn kho phải là số dương');
        }

        if (data.description && data.description.trim().length < CONFIG.PRODUCT_VALIDATION.DESC_MIN) {
            errors.push(`Mô tả phải có ít nhất ${CONFIG.PRODUCT_VALIDATION.DESC_MIN} ký tự`);
        }

        if (data.oldPrice && (isNaN(data.oldPrice) || data.oldPrice <= data.price)) {
            errors.push('Giá cũ phải lớn hơn giá hiện tại');
        }

        return errors;
    },

    renderAll() {
        this.renderDashboard();
        this.filterAndRenderProducts();
        this.filterAndRenderUsers();
    },

    setLoadingState(tbodyId, colspan) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="loading-state">
                        <div class="spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </td>
                </tr>
            `;
        }
    },

    setErrorState(tbodyId, colspan, message) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                    </td>
                </tr>
            `;
        }
    },

    renderDashboard() {
        // Update stats
        const totalProductsEl = document.getElementById('total-products');
        const totalUsersEl = document.getElementById('total-users');
        const totalRevenueEl = document.getElementById('total-revenue');
        const topSellerEl = document.getElementById('top-seller');
        const topSellerSalesEl = document.getElementById('top-seller-sales');

        if (totalProductsEl) totalProductsEl.textContent = this.products.length;
        if (totalUsersEl) totalUsersEl.textContent = this.users.length;

        // Calculate revenue (placeholder)
        const totalRevenue = this.products.reduce((sum, p) => sum + (p.price * (p.sales || 0)), 0);
        if (totalRevenueEl) totalRevenueEl.textContent = this.formatPrice(totalRevenue);

        // Find top seller
        const topSeller = this.products.reduce((top, p) => 
            (p.sales || 0) > (top.sales || 0) ? p : top, {});
        
        if (topSeller.title) {
            if (topSellerEl) topSellerEl.textContent = topSeller.title;
            if (topSellerSalesEl) topSellerSalesEl.textContent = `${topSeller.sales || 0} lượt mua`;
        } else {
            if (topSellerEl) topSellerEl.textContent = 'Chưa có dữ liệu';
            if (topSellerSalesEl) topSellerSalesEl.textContent = '0 lượt mua';
        }

        // Render activity feed
        this.renderActivityFeed();
    },

    generateActivityFeed() {
        this.activity = [];
        
        // Add recent products
        this.products.slice(0, 5).forEach(product => {
            this.activity.push({
                type: 'product',
                text: `Sản phẩm "${product.title}" được thêm mới`,
                time: product.createdAt
            });
        });

        // Add recent users
        this.users.slice(0, 5).forEach(user => {
            this.activity.push({
                type: 'user',
                text: `Người dùng "${user.name || user.email}" đã đăng ký`,
                time: user.createdAt
            });
        });

        // Sort by time
        this.activity.sort((a, b) => new Date(b.time) - new Date(a.time));
        this.activity = this.activity.slice(0, 10);
    },

    renderActivityFeed() {
        const container = document.getElementById('activity-feed-content');
        if (!container) return;

        if (this.activity.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Chưa có hoạt động nào.</p></div>';
            return;
        }

        container.innerHTML = this.activity.map(item => `
            <div class="activity-item">
                <div class="activity-icon ${item.type}">
                    <i class="fas fa-${item.type === 'product' ? 'box' : 'user'}"></i>
                </div>
                <div class="activity-text">${this.sanitizeInput(item.text)}</div>
                <div class="activity-time">${this.moment(item.time)}</div>
            </div>
        `).join('');
    },

    filterAndRenderProducts(searchTerm = '') {
        let filteredProducts = this.products;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredProducts = this.products.filter(p => 
                p.title?.toLowerCase().includes(term) ||
                p.category?.toLowerCase().includes(term)
            );
        }

        this.renderPaginatedTable('product', filteredProducts);
    },

    filterAndRenderUsers(searchTerm = '') {
        let filteredUsers = this.users;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredUsers = this.users.filter(u => 
                u.name?.toLowerCase().includes(term) ||
                u.email?.toLowerCase().includes(term)
            );
        }

        this.renderPaginatedTable('user', filteredUsers);
    },

    renderPaginatedTable(type, data) {
        const tbodyId = `${type}s-table-body`;
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        // Apply sorting
        const sortConfig = type === 'product' ? this.productSort : this.userSort;
        const sortedData = [...data].sort((a, b) => {
            let aVal = a[sortConfig.column];
            let bVal = b[sortConfig.column];

            if (sortConfig.column === 'createdAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (sortConfig.order === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        // Pagination
        const currentPage = type === 'product' ? this.productCurrentPage : this.userCurrentPage;
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = sortedData.slice(startIndex, endIndex);
        const totalPages = Math.ceil(sortedData.length / this.itemsPerPage);

        // Render rows
        if (paginatedData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${type === 'product' ? 6 : 5}" class="empty-state">
                        <p>Không tìm thấy ${type === 'product' ? 'sản phẩm' : 'người dùng'} nào.</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = paginatedData.map(item => 
                type === 'product' ? this.renderProductRow(item) : this.renderUserRow(item)
            ).join('');
        }

        // Render pagination
        this.renderPagination(type, currentPage, totalPages, sortedData.length);
    },

    renderProductRow(p) {
        return `
            <tr>
                <td>
                    <img src="${this.sanitizeInput((p.images && p.images[0]) || 'https://via.placeholder.com/50x50?text=No+Img')}" 
                         alt="${this.sanitizeInput(p.title)}" 
                         class="product-image-thumb"
                         onerror="this.src='https://via.placeholder.com/50x50?text=Error'">
                </td>
                <td>${this.sanitizeInput(p.title)}</td>
                <td>${this.formatPrice(p.price)}</td>
                <td>${p.stock || 0}</td>
                <td>${p.sales || 0}</td>
                <td class="actions">
                    <button class="btn-edit" onclick="AdminPanel.handleEditProduct('${p._id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="AdminPanel.handleDeleteProduct('${p._id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    renderUserRow(u) {
        const roleClass = u.role === 'admin' ? 'admin' : 'user';
        return `
            <tr>
                <td>${this.sanitizeInput(u.name || 'N/A')}</td>
                <td>${this.sanitizeInput(u.email)}</td>
                <td><span class="role-badge ${roleClass}">${u.role || 'user'}</span></td>
                <td>${this.formatDate(u.createdAt)}</td>
                <td class="actions">
                    ${u.role !== 'admin' ? `
                        <button class="btn-promote" onclick="AdminPanel.handlePromoteUser('${u._id}')" title="Thăng cấp Admin">
                            <i class="fas fa-crown"></i>
                        </button>
                    ` : ''}
                    <button class="btn-ban" onclick="AdminPanel.handleBanUser('${u._id}')" title="Cấm">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    renderPagination(type, currentPage, totalPages, totalItems) {
        const paginationContainer = document.getElementById(`${type}-pagination`);
        const pageInfo = document.getElementById(`${type}-page-info`);
        
        if (pageInfo) {
            pageInfo.textContent = `Hiển thị ${((currentPage - 1) * this.itemsPerPage) + 1}-${Math.min(currentPage * this.itemsPerPage, totalItems)} trong tổng số ${totalItems} ${type === 'product' ? 'sản phẩm' : 'người dùng'}`;
        }

        if (paginationContainer) {
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }

            let paginationHTML = `
                <button onclick="AdminPanel.changePage('${type}', 'prev')" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;

            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    paginationHTML += `
                        <button onclick="AdminPanel.changePage('${type}', ${i})" ${i === currentPage ? 'disabled' : ''}>
                            ${i}
                        </button>
                    `;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    paginationHTML += '<span>...</span>';
                }
            }

            paginationHTML += `
                <button onclick="AdminPanel.changePage('${type}', 'next')" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;

            paginationContainer.innerHTML = paginationHTML;
        }
    },

    changePage(type, direction) {
        if (type === 'product') {
            if (direction === 'prev') this.productCurrentPage = Math.max(1, this.productCurrentPage - 1);
            else if (direction === 'next') this.productCurrentPage = Math.min(Math.ceil(this.products.length / this.itemsPerPage), this.productCurrentPage + 1);
            else this.productCurrentPage = direction;
            this.filterAndRenderProducts();
        } else {
            if (direction === 'prev') this.userCurrentPage = Math.max(1, this.userCurrentPage - 1);
            else if (direction === 'next') this.userCurrentPage = Math.min(Math.ceil(this.users.length / this.itemsPerPage), this.userCurrentPage + 1);
            else this.userCurrentPage = direction;
            this.filterAndRenderUsers();
        }
    },

    handleSort(type, column) {
        const sortConfig = type === 'product' ? this.productSort : this.userSort;
        
        if (sortConfig.column === column) {
            sortConfig.order = sortConfig.order === 'asc' ? 'desc' : 'asc';
        } else {
            sortConfig.column = column;
            sortConfig.order = 'desc';
        }

        if (type === 'product') {
            this.filterAndRenderProducts();
        } else {
            this.filterAndRenderUsers();
        }
    },

    handleTableActions(e, type) {
        const target = e.target.closest('button');
        if (!target) return;

        const row = target.closest('tr');
        if (!row) return;

        const id = row.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-edit')) {
            this.handleEditProduct(id);
        } else if (target.classList.contains('btn-delete')) {
            this.handleDeleteProduct(id);
        } else if (target.classList.contains('btn-promote')) {
            this.handlePromoteUser(id);
        } else if (target.classList.contains('btn-ban')) {
            this.handleBanUser(id);
        }
    },

    async handleProductFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('#save-product-btn');
        const productId = document.getElementById('productId').value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang lưu...';

        try {
            const productData = {
                title: document.getElementById('title').value.trim(),
                category: document.getElementById('category').value.trim(),
                price: parseInt(document.getElementById('price').value),
                oldPrice: parseInt(document.getElementById('oldPrice').value) || undefined,
                stock: parseInt(document.getElementById('stock').value),
                badge: document.getElementById('badge').value.trim(),
                description: document.getElementById('description').value.trim(),
                detailedDescription: document.getElementById('detailedDescription').value.trim(),
                images: document.getElementById('images').value.trim()
            };

            // Validation
            const validationErrors = this.validateProductData(productData);
            if (validationErrors.length > 0) {
                this.showToast(validationErrors.join('. '), 'error');
                submitBtn.disabled = false;
                return;
            }

            if (productId) {
                await this.apiCall(`/products/${productId}`, 'PATCH', productData, true);
                this.showToast('Cập nhật sản phẩm thành công!', 'success');
            } else {
                await this.apiCall('/products', 'POST', productData, true);
                this.showToast('Thêm sản phẩm thành công!', 'success');
            }

            this.closeProductModal();
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error.message || 'Có lỗi xảy ra!', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Lưu Sản Phẩm';
        }
    },

    handleEditProduct(id) {
        const product = this.products.find(p => p._id === id);
        if (!product) {
            this.showToast('Không tìm thấy sản phẩm!', 'error');
            return;
        }

        this.openProductModal(product);
    },

    async handleDeleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

        try {
            await this.apiCall(`/products/${id}`, 'DELETE', null, true);
            this.showToast('Xóa sản phẩm thành công!', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error.message || 'Có lỗi xảy ra!', 'error');
        }
    },

    async handlePromoteUser(id) {
        if (!confirm('Bạn có chắc chắn muốn thăng cấp người dùng này thành Admin?')) return;

        try {
            await this.apiCall(`/users/${id}/promote`, 'PATCH', null, true);
            this.showToast('Thăng cấp thành công!', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error.message || 'Có lỗi xảy ra!', 'error');
        }
    },

    async handleBanUser(id) {
        if (!confirm('Bạn có chắc chắn muốn cấm người dùng này?')) return;

        try {
            await this.apiCall(`/users/${id}/ban`, 'PATCH', null, true);
            this.showToast('Cấm người dùng thành công!', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error.message || 'Có lỗi xảy ra!', 'error');
        }
    },

    navigateToTab(tabId) {
        // Update active tab
        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Show active content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(tabId)?.classList.add('active');

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                'dashboard-tab': 'Dashboard',
                'products-tab': 'Quản lý Sản phẩm',
                'users-tab': 'Quản lý Người dùng',
                'broadcast-tab': 'Gửi Thông báo'
            };
            pageTitle.textContent = titles[tabId] || 'Dashboard';
        }
    },

    toggleSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },

    closeSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    },

    openProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('product-form');

        if (product) {
            modalTitle.textContent = 'Chỉnh sửa Sản phẩm';
            document.getElementById('productId').value = product._id;
            document.getElementById('title').value = product.title || '';
            document.getElementById('category').value = product.category || '';
            document.getElementById('price').value = product.price || '';
            document.getElementById('oldPrice').value = product.oldPrice || '';
            document.getElementById('stock').value = product.stock || '';
            document.getElementById('badge').value = product.badge || '';
            document.getElementById('description').value = product.description || '';
            document.getElementById('detailedDescription').value = product.detailedDescription || '';
            document.getElementById('images').value = product.images ? product.images.join(', ') : '';
            this.updateImagePreview(product.images ? product.images.join(', ') : '');
        } else {
            modalTitle.textContent = 'Thêm Sản phẩm Mới';
            form.reset();
            document.getElementById('productId').value = '';
            document.getElementById('image-preview').innerHTML = '';
        }

        modal.style.display = 'flex';
    },

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    updateImagePreview(urls) {
        const previewContainer = document.getElementById('image-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        if (!urls) return;
        
        const urlArray = urls.split(/[, \n]+/).map(url => url.trim()).filter(Boolean);
        urlArray.forEach(url => {
            if (this.validateURL(url)) {
                const img = document.createElement('img');
                img.src = url;
                img.onerror = () => { img.style.display = 'none'; };
                previewContainer.appendChild(img);
            }
        });
    },

    setupWebSocket() {
        try {
            if (typeof io === 'undefined') {
                console.warn("Thư viện Socket.IO không tìm thấy. Tính năng thông báo bị vô hiệu hóa.");
                return;
            }
            
            this.socket = io(CONFIG.SOCKET_URL, { 
                transports: ['websocket'],
                timeout: 5000
            });

            this.socket.on('connect', () => {
                this.showToast('Hệ thống thông báo sẵn sàng!', 'info');
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) broadcastBtn.disabled = false;
            });

            this.socket.on('connect_error', (err) => {
                this.showToast('Không thể kết nối server thông báo!', 'error');
                console.error('Socket connect_error:', err);
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) broadcastBtn.disabled = true;
            });

            this.socket.on('disconnect', () => {
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) broadcastBtn.disabled = true;
            });
        } catch (e) {
            console.error("Lỗi khởi tạo WebSocket:", e?.message);
        }
    },

    handleBroadcastSubmit(e) {
        e.preventDefault();
        const messageInput = document.getElementById('broadcastMessage');
        const message = messageInput ? messageInput.value.trim() : '';
        
        if (!message) {
            this.showToast('Vui lòng nhập nội dung thông báo.', 'warning');
            return;
        }
        
        if (message && this.socket?.connected) {
            this.socket.emit('admin_broadcast', { message });
            this.showToast('Đã gửi thông báo!', 'success');
            if (messageInput) messageInput.value = '';
        } else if (!this.socket?.connected) {
            this.showToast('Chưa kết nối đến server thông báo.', 'error');
        }
    },

    moment(dateString) {
        if (!dateString) return 'không xác định';
        
        const diff = new Date() - new Date(dateString);
        if (isNaN(diff)) return 'không xác định';
        
        const seconds = Math.floor(diff / 1000);
        if (seconds < 2) return "vài giây trước";
        if (seconds < 60) return `${seconds} giây trước`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 2) return "1 phút trước";
        if (minutes < 60) return `${minutes} phút trước`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 2) return "1 giờ trước";
        if (hours < 24) return `${hours} giờ trước`;
        
        const days = Math.floor(hours / 24);
        if (days < 2) return "1 ngày trước";
        return `${days} ngày trước`;
    }
};

// Initialize AdminPanel
try {
    console.log('Initializing AdminPanel...');
    AdminPanel.init();
    console.log('AdminPanel initialized successfully');
} catch (error) {
    console.error('Error initializing AdminPanel:', error);
} 
