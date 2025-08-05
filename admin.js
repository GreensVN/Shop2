 "use strict";

/**
 * AdminPanel - Quản lý giao diện admin (FIXED VERSION)
 * Đã sửa tất cả bug đăng nhập và tương thích hoàn toàn
 */

// Backend Configuration - Tạo CONFIG riêng cho admin
const ADMIN_CONFIG = {
    API_BASE_URL: 'https://shop-4mlk.onrender.com/api/v1',
    SOCKET_URL: 'https://shop-4mlk.onrender.com',
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
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
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

// Sử dụng CONFIG riêng cho admin
const CONFIG = ADMIN_CONFIG;

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
        const storedToken = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        
        if (storedUser && storedToken) {
            try {
                this.currentUser = JSON.parse(storedUser);
                window.currentUser = this.currentUser;
            } catch (e) {
                console.error('Error parsing stored user:', e);
                this.currentUser = null;
                window.currentUser = null;
                // Clear corrupted data
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
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
            CONFIG.AUTHORIZED_EMAILS.includes(this.currentUser.email?.toLowerCase()?.trim())
        );

        console.log('Auth check:', { 
            hasUser: !!this.currentUser, 
            userEmail: this.currentUser?.email, 
            userRole: this.currentUser?.role, 
            isAdmin 
        });

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
            adminName.textContent = this.currentUser.name || this.currentUser.email?.split('@')[0] || 'Admin';
        }

        this.fetchInitialData();
        this.setupWebSocket();
        this.navigateToTab('dashboard-tab');
        this.isInitialized = true;
    },

    bindEvents() {
        // Auth change event listener
        document.addEventListener('authChange', (event) => {
            console.log('Admin received authChange event:', event.detail);
            this.currentUser = event.detail?.user;
            this.checkAuthAndToggleView();
        });

        // Login form - Sửa để tránh form reset
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleAdminLogin(e);
                return false;
            });
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
        e.stopPropagation(); // Ngăn event bubbling
        console.log('handleAdminLogin called');
        
        const emailInput = document.getElementById('admin-email');
        const passwordInput = document.getElementById('admin-password');
        const errorMessage = document.getElementById('login-error-message');
        const submitBtn = document.querySelector('#admin-login-form .btn-login');

        if (!emailInput || !passwordInput || !submitBtn) {
            console.error('Missing form elements');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Basic validation
        if (!email) {
            errorMessage.textContent = 'Vui lòng nhập email.';
            return;
        }

        if (!password) {
            errorMessage.textContent = 'Vui lòng nhập mật khẩu.';
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Email không hợp lệ.';
            return;
        }

        console.log('Attempting login with:', { email });

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            console.log('Calling admin login API...');
            
            // Call login API
            const loginData = await this.apiCall('/users/login', 'POST', { 
                email: email, 
                password: password 
            }, false); // Don't require auth for login
            
            console.log('Login API response:', loginData);

            if (!loginData.token || !loginData.data?.user) {
                throw new Error('Phản hồi đăng nhập không hợp lệ');
            }

            // Store authentication data
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, loginData.token);
            
            // Create user object with proper email fallback
            this.currentUser = {
                ...loginData.data.user,
                email: loginData.data.user.email || email
            };
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            
            // Update global currentUser for compatibility
            window.currentUser = this.currentUser;
            
            console.log('Admin login successful:', this.currentUser);
            
            // Check admin permissions
            const isAdmin = this.currentUser.role === 'admin' || 
                           CONFIG.AUTHORIZED_EMAILS.includes(this.currentUser.email?.toLowerCase()?.trim());
            
            if (!isAdmin) {
                // Clear data if not admin
                localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
                this.currentUser = null;
                window.currentUser = null;
                throw new Error('Bạn không có quyền truy cập Admin.');
            }
            
            // Show success message
            this.showToast('Đăng nhập admin thành công!', 'success');
            
            // Clear form AFTER successful login
            setTimeout(() => {
                emailInput.value = '';
                passwordInput.value = '';
            }, 100);
            
            // Update UI
            this.checkAuthAndToggleView();
            
            // Dispatch auth change event for other components
            document.dispatchEvent(new CustomEvent('authChange', { 
                detail: { user: this.currentUser } 
            }));
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Clear any stored data on error
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
            this.currentUser = null;
            window.currentUser = null;
            
            let errorMsg = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            
            if (error.message) {
                if (error.message.includes('Invalid credentials') || 
                    error.message.includes('Incorrect email or password')) {
                    errorMsg = 'Email hoặc mật khẩu không đúng.';
                } else if (error.message.includes('quyền truy cập')) {
                    errorMsg = error.message;
                } else if (error.message.includes('Network')) {
                    errorMsg = 'Lỗi kết nối mạng. Vui lòng thử lại.';
                } else {
                    errorMsg = error.message;
                }
            }
            
            errorMessage.textContent = errorMsg;
            
            // Focus vào input đầu tiên khi có lỗi
            setTimeout(() => {
                if (emailInput) emailInput.focus();
            }, 100);
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
        
        // Dispatch auth change event
        document.dispatchEvent(new CustomEvent('authChange', { 
            detail: { user: null } 
        }));
    },

    async fetchInitialData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.setLoadingState('products-table-body', 6);
        this.setLoadingState('users-table-body', 5);

        try {
            console.log('Fetching initial data...');
            
            // Fetch products and users in parallel
            const [productsData, usersData] = await Promise.all([
                this.apiCall('/products?limit=1000&sort=-createdAt', 'GET', null, false),
                this.apiCall('/users', 'GET', null, true)
            ]);

            console.log('Fetched data:', { 
                products: productsData?.data?.products?.length || 0,
                users: usersData?.data?.users?.length || 0
            });

            this.products = productsData?.data?.products || [];
            this.users = usersData?.data?.users || [];

            this.generateActivityFeed();
            this.renderAll();
            
        } catch (error) {
            console.error('Error fetching initial data:', error);
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

        console.log(`API Call: ${method} ${url}`, { requireAuth, hasData: !!data });

        try {
            const response = await fetch(url, options);
            
            // Handle different response types
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (response.status === 204) {
                responseData = { success: true };
            } else if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                const text = await response.text();
                responseData = { message: text || 'Unknown response' };
            }

            console.log(`API Response: ${response.status}`, responseData);

            if (!response.ok) {
                const errorMessage = responseData?.message || 
                                   responseData?.error || 
                                   `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return responseData;
            
        } catch (error) {
            console.error(`API Error: ${method} ${url}`, error);
            
            // Network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra internet.');
            }
            
            // Re-throw the error with original message
            throw error;
        }
    },

    showToast(message, type = 'info') {
        // Sử dụng Utils.showToast từ main.js nếu có
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type);
            return;
        }
        
        // Fallback nếu Utils không có
        // Remove existing toasts
        document.querySelectorAll('.admin-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `admin-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10001;
            font-size: 14px;
            max-width: 350px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: inherit;
        `;

        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#10b981';
                break;
            case 'error':
                toast.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f59e0b';
                toast.style.color = '#1f2937';
                break;
            default:
                toast.style.backgroundColor = '#3b82f6';
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
        if (!input) return '';
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
                time: product.createdAt || new Date().toISOString()
            });
        });

        // Add recent users
        this.users.slice(0, 5).forEach(user => {
            this.activity.push({
                type: 'user',
                text: `Người dùng "${user.name || user.email}" đã đăng ký`,
                time: user.createdAt || new Date().toISOString()
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
            <tr data-id="${p._id}">
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
            <tr data-id="${u._id}">
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
                images: this.parseImageUrls(document.getElementById('images').value.trim())
            };

            // Validation
            const validationErrors = this.validateProductData(productData);
            if (validationErrors.length > 0) {
                this.showToast(validationErrors.join('. '), 'error');
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

    parseImageUrls(urlString) {
        if (!urlString) return [];
        return urlString
            .split(/[,\n]+/)
            .map(url => url.trim())
            .filter(url => url && this.validateURL(url));
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
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) {
                    broadcastBtn.disabled = true;
                    broadcastBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Socket.IO không khả dụng';
                }
                return;
            }
            
            this.socket = io(CONFIG.SOCKET_URL, { 
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });

            this.socket.on('connect', () => {
                console.log('Socket connected successfully');
                this.showToast('Hệ thống thông báo sẵn sàng!', 'success');
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) {
                    broadcastBtn.disabled = false;
                    broadcastBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi Thông Báo';
                }
            });

            this.socket.on('connect_error', (err) => {
                console.error('Socket connect_error:', err);
                this.showToast('Không thể kết nối server thông báo!', 'warning');
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) {
                    broadcastBtn.disabled = true;
                    broadcastBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Lỗi kết nối';
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) {
                    broadcastBtn.disabled = true;
                    broadcastBtn.innerHTML = '<i class="fas fa-plug"></i> Mất kết nối';
                }
            });

            this.socket.on('reconnect', () => {
                console.log('Socket reconnected');
                this.showToast('Đã kết nối lại hệ thống thông báo!', 'info');
            });

        } catch (e) {
            console.error("Lỗi khởi tạo WebSocket:", e?.message);
            const broadcastBtn = document.querySelector('#broadcastForm button');
            if (broadcastBtn) {
                broadcastBtn.disabled = true;
                broadcastBtn.innerHTML = '<i class="fas fa-times"></i> Lỗi khởi tạo';
            }
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

        if (message.length > 500) {
            this.showToast('Nội dung thông báo không được quá 500 ký tự.', 'warning');
            return;
        }
        
        if (this.socket && this.socket.connected) {
            try {
                this.socket.emit('admin_broadcast', { 
                    message: message,
                    timestamp: new Date().toISOString(),
                    from: this.currentUser?.email || 'Admin'
                });
                this.showToast('Đã gửi thông báo thành công!', 'success');
                if (messageInput) messageInput.value = '';
            } catch (error) {
                console.error('Broadcast error:', error);
                this.showToast('Lỗi gửi thông báo: ' + error.message, 'error');
            }
        } else {
            this.showToast('Chưa kết nối đến server thông báo. Vui lòng thử lại.', 'error');
        }
    },

    moment(dateString) {
        if (!dateString) return 'không xác định';
        
        try {
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
            if (days < 7) return `${days} ngày trước`;
            
            const weeks = Math.floor(days / 7);
            if (weeks < 2) return "1 tuần trước";
            if (weeks < 4) return `${weeks} tuần trước`;
            
            const months = Math.floor(days / 30);
            if (months < 2) return "1 tháng trước";
            if (months < 12) return `${months} tháng trước`;
            
            const years = Math.floor(days / 365);
            return `${years} năm trước`;
        } catch (error) {
            console.error('Date parsing error:', error);
            return 'không xác định';
        }
    }
};

// Make AdminPanel available globally
window.AdminPanel = AdminPanel;

// Initialize AdminPanel - Chạy ngay khi script load
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing AdminPanel...');
        AdminPanel.init();
        console.log('AdminPanel initialized successfully');
    } catch (error) {
        console.error('Error initializing AdminPanel:', error);
        
        // Fallback initialization
        setTimeout(() => {
            try {
                AdminPanel.init();
            } catch (retryError) {
                console.error('AdminPanel retry initialization failed:', retryError);
            }
        }, 1000);
    }
});
