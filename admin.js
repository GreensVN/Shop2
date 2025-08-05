"use strict";

/**
 * AdminPanel - Quản lý giao diện admin
 * Tương thích với admin.html và được tối ưu hóa cho hiệu suất
 */

// Backend Configuration
const CONFIG = {
    API_BASE_URL: 'https://shop-4mlk.onrender.com/api/v1',
    SOCKET_URL: 'https://shop-4mlk.onrender.com/api/v1',
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

    // Pagination State
    productCurrentPage: 1,
    userCurrentPage: 1,
    itemsPerPage: 7,

    // Sorting State
    productSort: { column: 'createdAt', order: 'desc' },
    userSort: { column: 'createdAt', order: 'desc' },

    // --- INITIALIZATION ---
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
            this.checkAuthAndToggleView();
        });
    },

    checkAuthAndToggleView() {
        this.currentUser = window.currentUser;

        const loginContainer = document.getElementById('admin-login-container');
        const sidebar = document.getElementById('adminSidebar');
        const mainContent = document.getElementById('adminMain');
        const errorMessage = document.getElementById('login-error-message');

        if (this.currentUser && this.currentUser.role === 'admin') {
            if (loginContainer) loginContainer.style.display = 'none';
            if (sidebar) sidebar.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'block';

            if (!this.isInitialized) {
                this.setupPanel();
            }
        } else {
            if (loginContainer) loginContainer.style.display = 'flex';
            if (sidebar) sidebar.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';

            if (this.currentUser && errorMessage) {
                errorMessage.textContent = 'Truy cập bị từ chối. Yêu cầu quyền Admin.';
            } else if (errorMessage) {
                errorMessage.textContent = '';
            }
            this.isInitialized = false;
        }
    },

    setupPanel() {
        if (this.isInitialized) return;

        const adminName = document.getElementById('adminName');
        if (adminName && this.currentUser) {
            adminName.textContent = this.currentUser.name || 'Admin';
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

        // Search inputs
        const productSearchInput = document.getElementById('productSearchInput');
        if (productSearchInput) {
            productSearchInput.addEventListener('input', (e) => this.filterAndRenderProducts(e.target.value));
        }

        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => this.filterAndRenderUsers(e.target.value));
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

        // Logout
        const adminLogout = document.getElementById('adminLogout');
        if (adminLogout) {
            adminLogout.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.AuthManager?.logout) {
                    window.AuthManager.logout();
                }
            });
        }
    },

    async handleAdminLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('admin-email');
        const passwordInput = document.getElementById('admin-password');
        const errorMessage = document.getElementById('login-error-message');
        const submitBtn = e.target.querySelector('.btn-login');

        if (!emailInput || !passwordInput || !submitBtn) return;

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            await window.AuthManager.login(emailInput.value, passwordInput.value);
        } catch (error) {
            errorMessage.textContent = error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng nhập';
        }
    },

    async fetchInitialData() {
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
            const token = localStorage.getItem('authToken');
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
        // Simple toast implementation
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

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },

    // Utility Methods
    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price || 0);
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    },

    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
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
                    <td colspan="${colspan}">
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
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
                    <td colspan="${colspan}">
                        <div class="empty-state">
                            <h3><i class="fas fa-exclamation-triangle"></i> ${message}</h3>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    renderDashboard() {
        const totalProducts = document.getElementById('total-products');
        const totalUsers = document.getElementById('total-users');
        const totalRevenueEl = document.getElementById('total-revenue');
        const topSellerEl = document.getElementById('top-seller');
        const topSellerSalesEl = document.getElementById('top-seller-sales');

        if (totalProducts) totalProducts.textContent = this.products.length;
        if (totalUsers) totalUsers.textContent = this.users.length;

        const totalRevenue = this.products.reduce((sum, p) => sum + ((p.sales || 0) * (p.price || 0)), 0);
        if (totalRevenueEl) totalRevenueEl.textContent = this.formatPrice(totalRevenue);

        const topSeller = [...this.products].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0];
        if (topSeller) {
            if (topSellerEl) topSellerEl.textContent = topSeller.title;
            if (topSellerSalesEl) topSellerSalesEl.textContent = `${topSeller.sales || 0} lượt mua`;
        } else {
            if (topSellerEl) topSellerEl.textContent = '';
            if (topSellerSalesEl) topSellerSalesEl.textContent = '';
        }

        this.renderActivityFeed();
    },

    generateActivityFeed() {
        const productActivity = this.products
            .slice(0, 5)
            .map(p => ({
                type: 'product',
                text: `Sản phẩm mới: <strong>${this.sanitizeInput(p.title)}</strong>`,
                time: p.createdAt
            }));

        const userActivity = this.users
            .slice(0, 5)
            .map(u => ({
                type: 'user',
                text: `Người dùng mới: <strong>${this.sanitizeInput(u.name)}</strong>`,
                time: u.createdAt
            }));

        this.activity = [...productActivity, ...userActivity]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);
    },

    renderActivityFeed() {
        const feedContainer = document.getElementById('activity-feed-content');
        if (!feedContainer) return;

        if (!Array.isArray(this.activity) || this.activity.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state" style="padding: 1rem 0;">
                    <p>Chưa có hoạt động nào.</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = this.activity.map(item => `
            <div class="activity-item">
                <div class="activity-icon ${item.type}">
                    <i class="fas ${item.type === 'user' ? 'fa-user-plus' : 'fa-plus-circle'}"></i>
                </div>
                <div class="activity-text">${item.text}</div>
                <div class="activity-time">${this.moment(item.time)}</div>
            </div>
        `).join('');
    },

    filterAndRenderProducts(searchTerm = '') {
        const lowerCaseSearchTerm = (searchTerm || '').toLowerCase();
        const filtered = searchTerm
            ? this.products.filter(p => (p.title || '').toLowerCase().includes(lowerCaseSearchTerm))
            : [...this.products];
        this.renderPaginatedTable('product', filtered);
    },

    filterAndRenderUsers(searchTerm = '') {
        const lowerCaseSearchTerm = (searchTerm || '').toLowerCase();
        const filtered = searchTerm
            ? this.users.filter(u =>
                (u.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                (u.email || '').toLowerCase().includes(lowerCaseSearchTerm)
            )
            : [...this.users];
        this.renderPaginatedTable('user', filtered);
    },

    renderPaginatedTable(type, data) {
        const sortState = this[`${type}Sort`];
        let currentPage = this[`${type}CurrentPage`];
        const totalPages = Math.ceil(data.length / this.itemsPerPage) || 1;

        if (currentPage > totalPages) {
            currentPage = 1;
            this[`${type}CurrentPage`] = 1;
        }

        const sortedData = [...data].sort((a, b) => {
            let valA = a[sortState.column];
            let valB = b[sortState.column];

            if (sortState.column === 'createdAt') {
                return sortState.order === 'asc'
                    ? new Date(valA) - new Date(valB)
                    : new Date(valB) - new Date(valA);
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortState.order === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }

            return sortState.order === 'asc'
                ? ((valA || 0) - (valB || 0))
                : ((valB || 0) - (valA || 0));
        });

        const totalItems = sortedData.length;
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = sortedData.slice(startIndex, endIndex);

        const tableBodyId = `${type}s-table-body`;
        const renderFunction = type === 'product' ? this.renderProductRow : this.renderUserRow;
        const tableBody = document.getElementById(tableBodyId);

        if (!tableBody) return;

        if (paginatedData.length === 0) {
            const colspan = type === 'product' ? 6 : 5;
            this.setErrorState(tableBodyId, colspan, 'Không tìm thấy kết quả.');
        } else {
            tableBody.innerHTML = paginatedData.map(renderFunction).join('');
        }

        this.renderPagination(type, currentPage, totalPages, totalItems);
    },

    renderProductRow(p) {
        return `
            <tr>
                <td>
                    <img src="${this.sanitizeInput((p.images && p.images[0]) || 'https://via.placeholder.com/50x50?text=No+Img')}" 
                         alt="${this.sanitizeInput(p.title)}" 
                         class="product-image-thumb">
                </td>
                <td>${this.sanitizeInput(p.title)}</td>
                <td>${this.formatPrice(p.price)}</td>
                <td>${p.stock}</td>
                <td>${p.sales || 0}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${p._id}" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${p._id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    renderUserRow(u) {
        return `
            <tr>
                <td>${this.sanitizeInput(u.name)}</td>
                <td>${this.sanitizeInput(u.email)}</td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${this.formatDate(u.createdAt)}</td>
                <td class="actions">
                   <button class="btn-promote" data-id="${u._id}" title="Thăng cấp Admin" 
                           ${u.role === 'admin' ? 'disabled' : ''}>
                       <i class="fas fa-user-shield"></i>
                   </button>
                   <button class="btn-ban" data-id="${u._id}" title="Khóa tài khoản" 
                           ${u.role === 'admin' ? 'disabled' : ''}>
                       <i class="fas fa-user-slash"></i>
                   </button>
                </td>
            </tr>
        `;
    },

    renderPagination(type, currentPage, totalPages, totalItems) {
        const container = document.getElementById(`${type}-pagination`);
        const pageInfo = document.getElementById(`${type}-page-info`);
        
        if (!container || !pageInfo) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            pageInfo.textContent = `Tổng: ${totalItems} mục`;
            return;
        }

        const startIndex = this.itemsPerPage * (currentPage - 1);
        const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);

        container.innerHTML = `
            <button id="${type}-prev-btn" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span>Trang ${currentPage} / ${totalPages}</span>
            <button id="${type}-next-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pageInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} của ${totalItems} mục`;

        const prevBtn = document.getElementById(`${type}-prev-btn`);
        const nextBtn = document.getElementById(`${type}-next-btn`);
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(type, -1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(type, 1));
    },

    changePage(type, direction) {
        this[`${type}CurrentPage`] += direction;
        const searchInput = document.getElementById(`${type}SearchInput`);
        const searchValue = searchInput ? searchInput.value : '';
        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`](searchValue);
    },

    handleSort(type, column) {
        const sortState = this[`${type}Sort`];
        
        if (sortState.column === column) {
            sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = column;
            sortState.order = 'asc';
        }

        this[`${type}CurrentPage`] = 1;
        
        const tableId = `${type}s-table`;
        document.querySelectorAll(`#${tableId} th[data-sort] .sort-icon`).forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });
        
        const activeThIcon = document.querySelector(`#${tableId} th[data-sort="${column}"] .sort-icon`);
        if (activeThIcon) {
            activeThIcon.className = `fas fa-sort-${sortState.order === 'asc' ? 'up' : 'down'} sort-icon`;
        }

        const searchInput = document.getElementById(`${type}SearchInput`);
        const searchValue = searchInput ? searchInput.value : '';
        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`](searchValue);
    },

    handleTableActions(e, type) {
        const button = e.target.closest('button');
        if (!button) return;
        
        const id = button.dataset.id;
        if (!id) return;
        
        if (button.classList.contains('btn-edit')) {
            this.handleEditProduct(id);
        } else if (button.classList.contains('btn-delete')) {
            this.handleDeleteProduct(id);
        } else if (button.classList.contains('btn-promote')) {
            this.handlePromoteUser(id);
        } else if (button.classList.contains('btn-ban')) {
            this.handleBanUser(id);
        }
    },

    async handleProductFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('#save-product-btn');
        if (!submitBtn) return;
        
        submitBtn.disabled = true;

        const productIdInput = document.getElementById('productId');
        const productId = productIdInput ? productIdInput.value : '';
        const isEditing = !!productId;

        const getValue = id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const productData = {
            title: getValue('title').trim(),
            category: getValue('category').trim() || 'Chưa phân loại',
            price: parseInt(getValue('price'), 10),
            oldPrice: getValue('oldPrice') ? parseInt(getValue('oldPrice'), 10) : undefined,
            stock: parseInt(getValue('stock'), 10),
            description: getValue('description').trim(),
            detailedDescription: getValue('detailedDescription').trim(),
            images: getValue('images').split(/[, \n]+/).map(url => url.trim()).filter(url => url && this.validateURL(url)),
            badge: getValue('badge').trim() || undefined,
        };

        if (!productData.title || isNaN(productData.price) || isNaN(productData.stock)) {
            this.showToast('Vui lòng điền các trường bắt buộc (*).', 'error');
            submitBtn.disabled = false;
            return;
        }

        try {
            const endpoint = isEditing ? `/products/${productId}` : '/products';
            const method = isEditing ? 'PATCH' : 'POST';
            await this.apiCall(endpoint, method, productData, true);
            this.showToast(`Sản phẩm đã được ${isEditing ? 'cập nhật' : 'thêm'} thành công!`, 'success');
            this.closeProductModal();
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error?.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    },

    handleEditProduct(id) {
        const productToEdit = this.products.find(p => p._id === id);
        if (productToEdit) {
            this.openProductModal(productToEdit);
        }
    },

    async handleDeleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.')) {
            return;
        }
        
        try {
            await this.apiCall(`/products/${id}`, 'DELETE', null, true);
            this.showToast('Đã xóa sản phẩm thành công.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error?.message || 'Xóa sản phẩm thất bại.', 'error');
        }
    },

    async handlePromoteUser(id) {
        if (!confirm('Bạn có chắc chắn muốn thăng cấp người dùng này thành Admin?')) {
            return;
        }
        
        try {
            await this.apiCall(`/users/${id}`, 'PATCH', { role: 'admin' }, true);
            this.showToast('Đã thăng cấp người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error?.message || 'Thao tác thất bại.', 'error');
        }
    },

    async handleBanUser(id) {
        if (!confirm('Bạn có chắc chắn muốn cấm người dùng này?')) {
            return;
        }
        
        try {
            await this.apiCall(`/users/${id}`, 'PATCH', { active: false }, true);
            this.showToast('Đã cấm người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            this.showToast(error?.message || 'Thao tác thất bại.', 'error');
        }
    },

    navigateToTab(tabId) {
        document.querySelectorAll('.admin-nav .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        const tabSection = document.getElementById(tabId);
        
        if (navItem) navItem.classList.add('active');
        if (tabSection) tabSection.classList.add('active');
        
        const pageTitle = document.getElementById('pageTitle');
        const navTitle = navItem?.querySelector('span');
        if (pageTitle && navTitle) {
            pageTitle.textContent = navTitle.textContent;
        }
        
        if (window.innerWidth <= 992) {
            this.closeSidebar();
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
        const form = document.getElementById('product-form');
        if (!form) return;
        
        form.reset();
        
        const productIdInput = document.getElementById('productId');
        if (productIdInput) productIdInput.value = '';
        
        this.updateImagePreview('');

        if (product) {
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) modalTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
            if (productIdInput) productIdInput.value = product._id;
            
            Object.keys(product).forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    if (key === 'images') {
                        const imageUrls = (product.images || []).join(',\n');
                        input.value = imageUrls;
                        this.updateImagePreview(imageUrls);
                    } else {
                        input.value = product[key] || '';
                    }
                }
            });
            
            const detailedDesc = document.getElementById('detailedDescription');
            if (detailedDesc) detailedDesc.value = product.detailedDescription || '';
            
            const oldPrice = document.getElementById('oldPrice');
            if (oldPrice) oldPrice.value = product.oldPrice || '';
        } else {
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) modalTitle.textContent = 'Thêm Sản Phẩm Mới';
        }
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) modal.style.display = 'none';
        
        const form = document.getElementById('product-form');
        if (form) form.reset();
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
                transports: ['websocket'] 
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
        } catch (e) {
            console.error("Lỗi khởi tạo WebSocket:", e?.message);
        }
    },

    handleBroadcastSubmit(e) {
        e.preventDefault();
        const messageInput = document.getElementById('broadcastMessage');
        const message = messageInput ? messageInput.value.trim() : '';
        
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
AdminPanel.init();
