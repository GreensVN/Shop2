"use strict";

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
            
            if (this.currentUser) {
                 if (errorMessage) errorMessage.textContent = 'Truy cập bị từ chối. Yêu cầu quyền Admin.';
            } else {
                 if (errorMessage) errorMessage.textContent = '';
            }
            this.isInitialized = false;
        }
    },

    setupPanel() {
        if (this.isInitialized) return;

        const adminName = document.getElementById('adminName');
        if (adminName) adminName.textContent = this.currentUser.name || 'Admin';

        this.fetchInitialData();
        this.setupWebSocket();
        this.navigateToTab('dashboard-tab');
        this.isInitialized = true;
    },

    bindEvents() {
        document.addEventListener('authChange', (event) => {
            this.currentUser = event.detail.user;
            this.checkAuthAndToggleView();
        });

        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));

        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.addEventListener('click', (e) => this.navigateToTab(e.currentTarget.dataset.tab));
        });

        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) menuToggle.addEventListener('click', () => this.toggleSidebar());

        const adminMain = document.getElementById('adminMain');
        if (adminMain) adminMain.addEventListener('click', () => {
            if (window.innerWidth <= 992) this.closeSidebar();
        });

        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) addProductBtn.addEventListener('click', () => this.openProductModal());

        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeProductModal());

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeProductModal());

        const productModal = document.getElementById('product-modal');
        if (productModal) productModal.addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') this.closeProductModal();
        });

        const productForm = document.getElementById('product-form');
        if (productForm) productForm.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
        
        const broadcastForm = document.getElementById('broadcastForm');
        if (broadcastForm) broadcastForm.addEventListener('submit', (e) => this.handleBroadcastSubmit(e));

        const imagesInput = document.getElementById('images');
        if (imagesInput) imagesInput.addEventListener('input', (e) => this.updateImagePreview(e.target.value));

        const productSearchInput = document.getElementById('productSearchInput');
        if (productSearchInput) productSearchInput.addEventListener('input', (e) => this.filterAndRenderProducts(e.target.value));
        
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) userSearchInput.addEventListener('input', (e) => this.filterAndRenderUsers(e.target.value));

        document.querySelectorAll('#products-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('product', th.dataset.sort)));
        document.querySelectorAll('#users-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('user', th.dataset.sort)));

        const productsTableBody = document.getElementById('products-table-body');
        if (productsTableBody) productsTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'product'));
        
        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) usersTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'user'));

        const adminLogout = document.getElementById('adminLogout');
        if (adminLogout) adminLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.AuthManager) {
                window.AuthManager.logout();
            }
        });
    },

    async handleAdminLogin(e) {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const errorMessage = document.getElementById('login-error-message');
        const submitBtn = e.target.querySelector('.btn-login');

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            await window.AuthManager.login(email, password);
        } catch (error) {
            errorMessage.textContent = error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
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
                window.ApiManager.call('/products?limit=1000&sort=-createdAt', 'GET', null, false),
                window.ApiManager.call('/users', 'GET', null, true)
            ]);

            this.products = productsData.data.products || [];
            this.users = usersData.data.users || [];

            this.generateActivityFeed();
            this.renderAll();
        } catch (error) {
            window.Utils.showToast('Không thể tải dữ liệu quản trị. ' + error.message, 'error');
            this.setErrorState('products-table-body', 6, 'Lỗi tải sản phẩm');
            this.setErrorState('users-table-body', 5, 'Lỗi tải người dùng');
        }
    },

    renderAll() {
        this.renderDashboard();
        this.filterAndRenderProducts();
        this.filterAndRenderUsers();
    },

    setLoadingState(tbodyId, colspan) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="loading-state"><div class="spinner"></div><p>Đang tải dữ liệu...</p></div></td></tr>`;
    },

    setErrorState(tbodyId, colspan, message) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state"><h3><i class="fas fa-exclamation-triangle"></i> ${message}</h3></div></td></tr>`;
    },

    renderDashboard() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-users').textContent = this.users.length;
        const totalRevenue = this.products.reduce((sum, p) => sum + (p.sales || 0) * p.price, 0);
        document.getElementById('total-revenue').textContent = window.Utils.formatPrice(totalRevenue);

        const topSeller = [...this.products].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0];
        if (topSeller) {
            document.getElementById('top-seller').textContent = topSeller.title;
            document.getElementById('top-seller-sales').textContent = `${topSeller.sales || 0} lượt mua`;
        }
        this.renderActivityFeed();
    },

    generateActivityFeed() {
        const productActivity = this.products.slice(0, 5).map(p => ({ type: 'product', text: `Sản phẩm mới: <strong>${window.Utils.sanitizeInput(p.title)}</strong>`, time: p.createdAt }));
        const userActivity = this.users.slice(0, 5).map(u => ({ type: 'user', text: `Người dùng mới: <strong>${window.Utils.sanitizeInput(u.name)}</strong>`, time: u.createdAt }));

        this.activity = [...productActivity, ...userActivity]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);
    },

    renderActivityFeed() {
        const feedContainer = document.getElementById('activity-feed-content');
        if (!feedContainer) return;
        if (this.activity.length === 0) {
            feedContainer.innerHTML = `<div class="empty-state" style="padding: 1rem 0;"><p>Chưa có hoạt động nào.</p></div>`;
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
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = searchTerm
            ? this.products.filter(p => p.title.toLowerCase().includes(lowerCaseSearchTerm))
            : [...this.products];
        this.renderPaginatedTable('product', filtered);
    },

    filterAndRenderUsers(searchTerm = '') {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = searchTerm
            ? this.users.filter(u => u.name.toLowerCase().includes(lowerCaseSearchTerm) || u.email.toLowerCase().includes(lowerCaseSearchTerm))
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
            if (typeof valA === 'string') {
                 return sortState.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortState.order === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
        });

        const totalItems = sortedData.length;
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = sortedData.slice(startIndex, endIndex);

        const tableBodyId = `${type}s-table-body`;
        const renderFunction = type === 'product' ? this.renderProductRow : this.renderUserRow;
        const tableBody = document.getElementById(tableBodyId);
        
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
                <td><img src="${window.Utils.sanitizeInput(p.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Img')}" alt="${window.Utils.sanitizeInput(p.title)}" class="product-image-thumb"></td>
                <td>${window.Utils.sanitizeInput(p.title)}</td>
                <td>${window.Utils.formatPrice(p.price)}</td>
                <td>${p.stock}</td>
                <td>${p.sales || 0}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${p._id}" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" data-id="${p._id}" title="Xóa"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    },

    renderUserRow(u) {
        return `
            <tr>
                <td>${window.Utils.sanitizeInput(u.name)}</td>
                <td>${window.Utils.sanitizeInput(u.email)}</td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${window.Utils.formatDate(u.createdAt)}</td>
                <td class="actions">
                   <button class="btn-promote" data-id="${u._id}" title="Thăng cấp Admin" ${u.role === 'admin' ? 'disabled' : ''}><i class="fas fa-user-shield"></i></button>
                   <button class="btn-ban" data-id="${u._id}" title="Khóa tài khoản" ${u.role === 'admin' ? 'disabled' : ''}><i class="fas fa-user-slash"></i></button>
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
            <button id="${type}-prev-btn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
            <span>Trang ${currentPage} / ${totalPages}</span>
            <button id="${type}-next-btn" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
        `;
        pageInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} của ${totalItems} mục`;

        document.getElementById(`${type}-prev-btn`).addEventListener('click', () => this.changePage(type, -1));
        document.getElementById(`${type}-next-btn`).addEventListener('click', () => this.changePage(type, 1));
    },

    changePage(type, direction) {
        this[`${type}CurrentPage`] += direction;
        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`](document.getElementById(`${type}SearchInput`).value);
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
        document.querySelectorAll(`#${tableId} th[data-sort] .sort-icon`).forEach(icon => icon.className = 'fas fa-sort sort-icon');
        const activeThIcon = document.querySelector(`#${tableId} th[data-sort="${column}"] .sort-icon`);
        if (activeThIcon) activeThIcon.className = `fas fa-sort-${sortState.order === 'asc' ? 'up' : 'down'} sort-icon`;

        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`](document.getElementById(`${type}SearchInput`).value);
    },

    handleTableActions(e, type) {
        const button = e.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        if (!id) return;
        if (button.classList.contains('btn-edit')) this.handleEditProduct(id);
        if (button.classList.contains('btn-delete')) this.handleDeleteProduct(id);
        if (button.classList.contains('btn-promote')) this.handlePromoteUser(id);
        if (button.classList.contains('btn-ban')) this.handleBanUser(id);
    },

    async handleProductFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('#save-product-btn');
        submitBtn.disabled = true;

        const productId = document.getElementById('productId').value;
        const isEditing = !!productId;

        const productData = {
            title: document.getElementById('title').value.trim(),
            category: document.getElementById('category').value.trim() || 'Chưa phân loại',
            price: parseInt(document.getElementById('price').value, 10),
            oldPrice: document.getElementById('oldPrice').value ? parseInt(document.getElementById('oldPrice').value, 10) : undefined,
            stock: parseInt(document.getElementById('stock').value, 10),
            description: document.getElementById('description').value.trim(),
            detailedDescription: document.getElementById('detailedDescription').value.trim(),
            images: document.getElementById('images').value.split(/[, \n]+/).map(url => url.trim()).filter(url => url && window.Utils.validateURL(url)),
            badge: document.getElementById('badge').value.trim() || undefined,
        };

        if (!productData.title || isNaN(productData.price) || isNaN(productData.stock)) {
            window.Utils.showToast('Vui lòng điền các trường bắt buộc (*).', 'error');
            submitBtn.disabled = false;
            return;
        }

        try {
            const endpoint = isEditing ? `/products/${productId}` : '/products';
            const method = isEditing ? 'PATCH' : 'POST';
            await window.ApiManager.call(endpoint, method, productData, true);
            window.Utils.showToast(`Sản phẩm đã được ${isEditing ? 'cập nhật' : 'thêm'} thành công!`, 'success');
            this.closeProductModal();
            await this.fetchInitialData();
        } catch (error) {
            window.Utils.showToast(error.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    },

    handleEditProduct(id) {
        const productToEdit = this.products.find(p => p._id === id);
        if (productToEdit) this.openProductModal(productToEdit);
    },

    async handleDeleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.')) return;
        try {
            await window.ApiManager.call(`/products/${id}`, 'DELETE', null, true);
            window.Utils.showToast('Đã xóa sản phẩm thành công.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            window.Utils.showToast(error.message || 'Xóa sản phẩm thất bại.', 'error');
        }
    },

    async handlePromoteUser(id) {
        if (!confirm('Bạn có chắc chắn muốn thăng cấp người dùng này thành Admin?')) return;
        try {
            await window.ApiManager.call(`/users/${id}`, 'PATCH', { role: 'admin' }, true);
            window.Utils.showToast('Đã thăng cấp người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            window.Utils.showToast(error.message || 'Thao tác thất bại.', 'error');
        }
    },

    async handleBanUser(id) {
        if (!confirm('Bạn có chắc chắn muốn cấm người dùng này?')) return;
        try {
            await window.ApiManager.call(`/users/${id}`, 'PATCH', { active: false }, true);
            window.Utils.showToast('Đã cấm người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            window.Utils.showToast(error.message || 'Thao tác thất bại.', 'error');
        }
    },

    navigateToTab(tabId) {
        document.querySelectorAll('.admin-nav .nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
        document.getElementById('pageTitle').textContent = document.querySelector(`.nav-item[data-tab="${tabId}"] span`).textContent;
        if (window.innerWidth <= 992) this.closeSidebar();
    },

    toggleSidebar() {
        document.getElementById('adminSidebar').classList.toggle('open');
    },

    closeSidebar() {
        document.getElementById('adminSidebar').classList.remove('open');
    },

    openProductModal(product = null) {
        const form = document.getElementById('product-form');
        form.reset();
        document.getElementById('productId').value = '';
        this.updateImagePreview('');

        if (product) {
            document.getElementById('modal-title').textContent = 'Chỉnh Sửa Sản Phẩm';
            document.getElementById('productId').value = product._id;
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
            document.getElementById('detailedDescription').value = product.detailedDescription || '';
            document.getElementById('oldPrice').value = product.oldPrice || '';
        } else {
            document.getElementById('modal-title').textContent = 'Thêm Sản Phẩm Mới';
        }
        document.getElementById('product-modal').style.display = 'flex';
    },

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
        document.getElementById('product-form').reset();
    },

    updateImagePreview(urls) {
        const previewContainer = document.getElementById('image-preview');
        previewContainer.innerHTML = '';
        if (!urls) return;
        const urlArray = urls.split(/[, \n]+/).map(url => url.trim()).filter(Boolean);
        urlArray.forEach(url => {
            if (window.Utils.validateURL(url)) {
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
            this.socket = io(CONFIG.API_BASE_URL.replace('/api/v1', ''), { transports: ['websocket'] });
            
            this.socket.on('connect', () => {
                window.Utils.showToast('Hệ thống thông báo sẵn sàng!', 'info');
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) broadcastBtn.disabled = false;
            });
            
            this.socket.on('connect_error', (err) => {
                window.Utils.showToast('Không thể kết nối server thông báo!', 'error');
                console.error('Socket connect_error:', err);
                const broadcastBtn = document.querySelector('#broadcastForm button');
                if (broadcastBtn) broadcastBtn.disabled = true;
            });
        } catch (e) {
            console.error("Lỗi khởi tạo WebSocket:", e.message);
        }
    },

    handleBroadcastSubmit(e) {
        e.preventDefault();
        const messageInput = document.getElementById('broadcastMessage');
        const message = messageInput.value.trim();
        if (message && this.socket && this.socket.connected) {
            this.socket.emit('admin_broadcast', { message });
            window.Utils.showToast('Đã gửi thông báo!', 'success');
            messageInput.value = '';
        } else if (!this.socket || !this.socket.connected) {
            window.Utils.showToast('Chưa kết nối đến server thông báo.', 'error');
        }
    },

    moment(dateString) {
        if (!dateString) return 'không xác định';
        const diff = new Date() - new Date(dateString);
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

AdminPanel.init();```

### `main.js` (Đã sửa lỗi)
Phiên bản này tập trung vào việc quản lý trạng thái và xác thực một cách tập trung, đồng thời cung cấp các API nội bộ ổn định cho các tệp khác sử dụng.

```javascript
// main.js - Final Production Version (Combined & Refined)
"use strict";

// =================================================================
// CONFIGURATION & GLOBAL VARIABLES
// =================================================================

const CONFIG = {
    API_BASE_URL: 'https://shop-4mlk.onrender.com/api/v1',
    AUTHORIZED_EMAILS: [
        'chinhan20917976549a@gmail.com',
        'ryantran149@gmail.com',
        'seller@shopgrowgarden.com',
        'greensvn@gmail.com'
    ],
    STORAGE_KEYS: {
        TOKEN: 'token',
        USER: 'currentUser',
        PRODUCTS: 'localProducts'
    },
    TOAST_DURATION: 3000,
    ANIMATION_DELAY: 0.08
};

let currentUser = null;
let allProducts = [];

// =================================================================
// UTILITY CLASS
// =================================================================

class Utils {
    static formatPrice(price) {
        const num = typeof price === 'string' ? parseInt(price, 10) : price;
        if (isNaN(num)) return '0đ';
        return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    }

    static formatDate(date) {
        try {
            return new Date(date).toLocaleDateString('vi-VN');
        } catch {
            return 'N/A';
        }
    }

    static generateId() {
        return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    static showToast(message, type = 'success', duration = CONFIG.TOAST_DURATION) {
        const container = this.getToastContainer();
        const toast = this.createToastElement(message, type);

        container.appendChild(toast);
        this.animateToast(toast, duration);
    }

    static getToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            Object.assign(container.style, {
                position: 'fixed', top: '20px', right: '20px', zIndex: '10003', display: 'flex', flexDirection: 'column', gap: '10px'
            });
            document.body.appendChild(container);
        }
        return container;
    }

    static createToastElement(message, type) {
        const toast = document.createElement('div');
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
        toast.innerHTML = `<div style="display: flex; align-items: center;"><i class="fas ${icons[type] || icons.info}" style="margin-right: 8px;"></i><span>${message}</span></div><button class="toast-close" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; margin-left: 10px; padding: 0;">×</button>`;
        Object.assign(toast.style, { background: colors[type] || colors.info, color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transform: 'translateX(120%)', opacity: '0', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '300px', zIndex: '9999' });
        return toast;
    }

    static animateToast(toast, duration) {
        requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; toast.style.opacity = '1'; });
        const closeToast = () => { toast.style.transform = 'translateX(120%)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); };
        const timer = setTimeout(closeToast, duration);
        toast.querySelector('.toast-close').addEventListener('click', () => { clearTimeout(timer); closeToast(); });
    }

    static showLoading(element, message = 'Đang tải...') {
        if (element) element.innerHTML = `<div class="loading-placeholder" style="text-align: center; padding: 50px; color: #888; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 10px;">${message}</p></div>`;
    }

    static showError(element, message = 'Có lỗi xảy ra.') {
        if (element) element.innerHTML = `<div class="error-state" style="text-align: center; padding: 50px; color: #ef4444; grid-column: 1 / -1;"><i class="fas fa-exclamation-triangle fa-2x"></i><p style="margin-top: 10px;">${message}</p></div>`;
    }

    static sanitizeInput(input) {
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    }
    static validateURL(url) { try { new URL(url); return true; } catch { return false; } }
}

// =================================================================
// STORAGE MANAGER
// =================================================================

class StorageManager {
    static saveProducts(products) { try { localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); return true; } catch (error) { return false; } }
    static loadProducts() { try { const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTS); return stored ? JSON.parse(stored) : []; } catch { return []; } }
    static addProduct(product) { const products = this.loadProducts(); products.unshift(product); return this.saveProducts(products); }
    static deleteProduct(productId) { const products = this.loadProducts(); const filtered = products.filter(p => p._id !== productId); return this.saveProducts(filtered); }
    static updateProduct(productId, updates) {
        const products = this.loadProducts(); const index = products.findIndex(p => p._id === productId);
        if (index !== -1) { products[index] = { ...products[index], ...updates }; return this.saveProducts(products); }
        return false;
    }
}

// =================================================================
// PERMISSION MANAGER
// =================================================================

class PermissionManager {
    static checkPostPermission() { if (!currentUser?.email) return false; const userEmail = currentUser.email.toLowerCase().trim(); return CONFIG.AUTHORIZED_EMAILS.map(email => email.toLowerCase()).includes(userEmail) || currentUser.role === 'admin'; }
    static checkDeletePermission(product) { if (!currentUser) return false; if (this.checkPostPermission() || currentUser.role === 'admin') return true; return product.createdBy === currentUser._id; }
}

// =================================================================
// API MANAGER
// =================================================================

class ApiManager {
    static async call(endpoint, method = 'GET', body = null, requireAuth = true) {
        const headers = { 'Content-Type': 'application/json' }; 
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        if (token && requireAuth) { 
            headers['Authorization'] = `Bearer ${token}`; 
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { 
                method, 
                headers, 
                body: body ? JSON.stringify(body) : null 
            });

            if (response.status === 204) return { success: true };

            const data = await response.json();

            if (!response.ok) {
                // Throw an error with the message from the server's JSON response
                throw new Error(data.message || `Lỗi máy chủ: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            // Rethrow the customized error or a generic network error
            throw error; 
        }
    }
    static async createProduct(productData) { return await this.call('/products', 'POST', productData); }
    static async updateProduct(productId, productData) { return await this.call(`/products/${productId}`, 'PATCH', productData); }
    static async deleteProduct(productId) { return await this.call(`/products/${productId}`, 'DELETE'); }
    static async getProducts() { const hasToken = !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN); return await this.call('/products', 'GET', null, hasToken); }
}

// =================================================================
// FLOATING BUTTONS MANAGER
// =================================================================

class FloatingButtonsManager {
    static init() { this.addStyles(); this.create(); }
    static addStyles() {
        if (document.getElementById('floatingButtonStyles')) return;
        const styles = document.createElement('style'); styles.id = 'floatingButtonStyles';
        styles.textContent = `.floating-btn{display:flex!important;align-items:center;gap:.5rem;padding:1rem 1.5rem;border-radius:50px;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 8px 25px rgba(0,0,0,.15);font-family:inherit;font-size:14px;backdrop-filter:blur(10px);position:relative;overflow:hidden;white-space:nowrap}.floating-btn:hover{transform:translateY(-3px) scale(1.05)}.messenger-btn{background:linear-gradient(135deg,#0084ff 0%,#0066cc 100%)!important;color:#fff!important}.post-btn{background:linear-gradient(135deg,#10b981 0%,#059669 100%)!important;color:#fff!important}#floatingButtonsContainer{position:fixed!important;bottom:2rem!important;right:2rem!important;z-index:1000!important;display:flex!important;flex-direction:column!important;gap:1rem!important}@media (max-width:768px){#floatingButtonsContainer{bottom:1rem!important;right:1rem!important}}`;
        document.head.appendChild(styles);
    }
    static create() {
        const existingContainer = document.getElementById('floatingButtonsContainer'); if (existingContainer) existingContainer.remove();
        const container = document.createElement('div'); container.id = 'floatingButtonsContainer';
        container.appendChild(this.createMessengerButton());
        if (PermissionManager.checkPostPermission()) { container.appendChild(this.createPostButton()); }
        document.body.appendChild(container);
    }
    static createMessengerButton() { const btn = document.createElement('a'); btn.href = 'https://m.me/100063758577070'; btn.target = '_blank'; btn.rel = 'noopener noreferrer'; btn.className = 'floating-btn messenger-btn'; btn.innerHTML = `<i class="fab fa-facebook-messenger"></i><span>Liên hệ</span>`; btn.title = 'Liên hệ qua Facebook Messenger'; return btn; }
    static createPostButton() {
        const btn = document.createElement('button'); btn.className = 'floating-btn post-btn'; btn.innerHTML = `<i class="fas fa-plus"></i><span>Đăng tin</span>`; btn.title = 'Đăng sản phẩm mới';
        btn.addEventListener('click', () => { if (window.ProductModal?.show) { window.ProductModal.show(); } else { Utils.showToast('Chức năng chưa sẵn sàng!', 'error'); } });
        return btn;
    }
    static update() { setTimeout(() => this.create(), 100); }
}

// =================================================================
// CART & FAVORITES MANAGERS
// =================================================================

const CartManager = {
    async get() { if (!currentUser) return []; try { const result = await ApiManager.call('/cart'); return result.data.cart || []; } catch { return []; } },
    async add(productId, quantity = 1) { if (!currentUser) throw new Error('Vui lòng đăng nhập!'); await ApiManager.call('/cart', 'POST', { productId, quantity }); await this.updateCount(); },
    async updateCount() { if (!currentUser) return; try { const cart = await this.get(); const count = cart.reduce((sum, item) => sum + (item.quantity || 0), 0); document.querySelectorAll('.cart-count, #cartCount').forEach(el => { el.textContent = count; el.style.display = count > 0 ? 'inline-flex' : 'none'; }); } catch { /* fail silently */ } }
};
const FavoriteManager = {
    async get() { if (!currentUser) return []; try { const result = await ApiManager.call('/favorites'); return result.data.favorites || []; } catch { return []; } },
    async add(productId) { if (!currentUser) throw new Error('Vui lòng đăng nhập!'); await ApiManager.call('/favorites', 'POST', { productId }); await this.updateStatus(productId, true); },
    async remove(productId) { if (!currentUser) return; await ApiManager.call(`/favorites/${productId}`, 'DELETE'); await this.updateStatus(productId, false); },
    async updateStatus(productId, isFavorite) { document.querySelectorAll(`.btn-favorite[data-id="${productId}"], .favorite-btn[data-id="${productId}"]`).forEach(btn => { btn.classList.toggle('active', isFavorite); const icon = btn.querySelector('i'); if (icon) icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart'; }); }
};

// =================================================================
// AUTHENTICATION MANAGER
// =================================================================

class AuthManager {
    static async login(email, password) {
        const data = await ApiManager.call('/users/login', 'POST', { email, password }, false);
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, data.token);
        currentUser = { ...data.data.user, email: data.data.user.email || email };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(currentUser));
        await this.updateUIAfterLogin();
        return currentUser;
    }

    static async register(name, email, password, passwordConfirm) {
        const data = await ApiManager.call('/users/signup', 'POST', { name, email, password, passwordConfirm }, false);
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, data.token);
        currentUser = { ...data.data.user, name: data.data.user.name || name, email: data.data.user.email || email };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(currentUser));
        await this.updateUIAfterLogin();
        return currentUser;
    }

    static logout() {
        if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        currentUser = null;
        this.updateUIAfterLogout();
        Utils.showToast('Đăng xuất thành công!', 'success');
        const protectedPages = ['account.html', 'cart.html', 'favorite.html', 'admin.html'];
        if (protectedPages.some(page => window.location.pathname.includes(page))) {
            setTimeout(() => window.location.href = 'index.html', 1000);
        }
    }

    static async checkAutoLogin() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            try {
                const data = await ApiManager.call('/users/me', 'GET', null, true);
                currentUser = data.data.user;
                if (!currentUser?.email) throw new Error('Invalid user data');
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(currentUser));
                await this.updateUIAfterLogin();
            } catch (error) {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
                currentUser = null;
                this.updateUIAfterLogout();
            }
        } else {
            this.updateUIAfterLogout();
        }
    }

    static getDisplayName(user) {
        if (!user) return 'User';
        if (user.name?.trim()) return user.name.trim();
        if (user.email?.includes('@')) return user.email.split('@')[0];
        return 'User';
    }
    
    static async updateUIAfterLogin() {
        if (!currentUser) return;
        const loginButton = document.getElementById('loginButton');
        const userDropdown = document.getElementById('userDropdown');
        if (loginButton) loginButton.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'flex';
        
        const displayName = this.getDisplayName(currentUser);
        const firstLetter = displayName.charAt(0).toUpperCase();
        document.querySelectorAll('.user-name, #userName').forEach(el => { if (el) el.textContent = displayName; });
        document.querySelectorAll('.user-avatar, #userAvatar').forEach(el => { if (el) el.textContent = firstLetter; });
        
        await CartManager.updateCount();
        FloatingButtonsManager.update();
        
        document.dispatchEvent(new CustomEvent('authChange', { detail: { user: currentUser } }));
    }

    static updateUIAfterLogout() {
        const loginButton = document.getElementById('loginButton');
        const userDropdown = document.getElementById('userDropdown');
        if (loginButton) loginButton.style.display = 'flex';
        if (userDropdown) userDropdown.style.display = 'none';
        
        document.querySelectorAll('.cart-count, #cartCount').forEach(el => { el.textContent = '0'; el.style.display = 'none'; });
        FloatingButtonsManager.update();
        
        document.dispatchEvent(new CustomEvent('authChange', { detail: { user: null } }));
    }
}

// =================================================================
// PRODUCT MANAGER
// =================================================================

class ProductManager {
    static async loadProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        Utils.showLoading(productsGrid, 'Đang tải sản phẩm...');
        
        try {
            const data = await ApiManager.getProducts();
            let products = data.data?.products || [];
            const localProducts = StorageManager.loadProducts();
            const combinedProducts = [...localProducts, ...products];
            allProducts = Array.from(new Map(combinedProducts.map(p => [p._id, p])).values());
            
            if (window.renderApiProducts) {
                window.renderApiProducts(allProducts);
            }
            if (currentUser && window.updateAllFavoriteButtons) {
                await window.updateAllFavoriteButtons();
            }
        } catch (error) {
            const localProducts = StorageManager.loadProducts();
            if (localProducts.length > 0) {
                allProducts = localProducts;
                if (window.renderApiProducts) {
                    window.renderApiProducts(localProducts);
                }
                Utils.showToast('Hiển thị sản phẩm offline.', 'warning');
            } else {
                Utils.showError(productsGrid, 'Không thể tải sản phẩm. Vui lòng thử lại.');
            }
        }
    }

    static async createProduct(productData) {
        const product = { _id: Utils.generateId(), createdBy: currentUser?._id, ...productData };
        try {
            await ApiManager.createProduct(product);
            Utils.showToast('Đăng sản phẩm thành công!', 'success');
            await this.loadProducts();
            return true;
        } catch (error) {
            if (StorageManager.addProduct(product)) {
                allProducts.unshift(product);
                if (window.renderApiProducts) window.renderApiProducts(allProducts);
                Utils.showToast('Đăng sản phẩm thành công! (Lưu cục bộ)', 'info');
                return true;
            }
        }
        throw new Error('Không thể lưu sản phẩm');
    }

    static async deleteProduct(productId) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
        try {
            if (productId.startsWith('local_')) {
                StorageManager.deleteProduct(productId);
            } else {
                await ApiManager.deleteProduct(productId);
            }
            allProducts = allProducts.filter(p => p._id !== productId);
            if (window.renderApiProducts) window.renderApiProducts(allProducts);
            Utils.showToast('Xóa sản phẩm thành công!', 'success');
        } catch (error) {
            Utils.showToast(error.message || 'Không thể xóa sản phẩm!', 'error');
        }
    }
}

// =================================================================
// MODAL MANAGER
// =================================================================

class ModalManager {
    static initAuthModal() {
        const authModal = document.getElementById('authModal');
        const loginButton = document.getElementById('loginButton');
        if (!authModal || !loginButton) return;
        
        const showModal = () => { authModal.style.display = 'flex'; setTimeout(() => authModal.classList.add('show'), 10); document.body.style.overflow = 'hidden'; };
        const hideModal = () => { authModal.classList.remove('show'); setTimeout(() => { authModal.style.display = 'none'; document.body.style.overflow = ''; }, 300); };
        
        loginButton.addEventListener('click', showModal);
        authModal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', hideModal));
        authModal.addEventListener('click', (e) => { if (e.target === authModal) hideModal(); });
        
        this.setupAuthTabs(authModal);
        this.setupAuthForms(authModal, hideModal);
    }

    static setupAuthTabs(authModal) {
        const tabs = authModal.querySelectorAll('.modal-tab');
        const forms = authModal.querySelectorAll('.modal-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                forms.forEach(f => f.classList.toggle('active', f.id === `${tab.dataset.tab}Form`));
            });
        });
        
        authModal.querySelectorAll('.switch-to-register, .switch-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = e.target.classList.contains('switch-to-register') ? 'register' : 'login';
                authModal.querySelector(`.modal-tab[data-tab="${targetTab}"]`)?.click();
            });
        });
    }

    static setupAuthForms(authModal, hideModal) {
        this.setupLoginForm(authModal.querySelector('#loginForm'), hideModal);
        this.setupRegisterForm(authModal.querySelector('#registerForm'), hideModal);
    }

    static setupLoginForm(form, onSuccess) {
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.btn-submit');
            this.setLoadingState(submitBtn, true);
            try {
                const email = form.email.value.trim();
                const password = form.password.value;
                if (!email || !password) throw new Error('Vui lòng nhập đủ thông tin!');
                const user = await AuthManager.login(email, password);
                Utils.showToast(`Chào mừng ${AuthManager.getDisplayName(user)}!`, 'success');
                onSuccess();
                form.reset();
            } catch (error) {
                Utils.showToast(error.message || 'Đăng nhập thất bại!', 'error');
            } finally {
                this.setLoadingState(submitBtn, false);
            }
        });
    }

    static setupRegisterForm(form, onSuccess) {
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.btn-submit');
            this.setLoadingState(submitBtn, true);
            try {
                const name = form.name.value.trim();
                const email = form.email.value.trim();
                const password = form.password.value;
                const confirmPassword = form.confirmPassword.value;
                if (!name || !email || !password || !confirmPassword) throw new Error('Vui lòng nhập đủ thông tin!');
                if (password.length < 6) throw new Error('Mật khẩu ít nhất 6 ký tự!');
                if (password !== confirmPassword) throw new Error('Mật khẩu không khớp!');
                const user = await AuthManager.register(name, email, password, confirmPassword);
                Utils.showToast(`Chào mừng ${AuthManager.getDisplayName(user)}!`, 'success');
                onSuccess();
                form.reset();
            } catch (error) {
                Utils.showToast(error.message || 'Đăng ký thất bại!', 'error');
            } finally {
                this.setLoadingState(submitBtn, false);
            }
        });
    }

    static setLoadingState(submitBtn, isLoading) {
        if (!submitBtn) return;
        const spinner = submitBtn.querySelector('.spinner');
        if (isLoading) {
            submitBtn.classList.add('loading');
            if (spinner) spinner.style.display = 'inline-block';
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('loading');
            if (spinner) spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }
}


// =================================================================
// INITIALIZATION
// =================================================================

class App {
    static async init() {
        Utils.getToastContainer();
        ModalManager.initAuthModal();
        document.querySelectorAll('#logoutButton, #sidebarLogoutBtn').forEach(btn => { if (btn) btn.addEventListener('click', () => AuthManager.logout()); });
        await AuthManager.checkAutoLogin();
        await App.initCurrentPage();
        setTimeout(() => FloatingButtonsManager.init(), 500);
    }
    static async initCurrentPage() {
        const path = window.location.pathname.split("/").pop() || 'index.html';
        switch (path) {
            case 'index.html': case '': await App.initIndexPage(); break;
        }
    }
    static async initIndexPage() {
        await ProductManager.loadProducts();
        const filterButton = document.getElementById('filterButton'); const resetButton = document.getElementById('resetButton');
        if (filterButton) filterButton.addEventListener('click', () => window.filterProducts?.());
        if (resetButton) resetButton.addEventListener('click', () => window.resetFilters?.());
    }
}

// =================================================================
// GLOBAL EXPORTS
// =================================================================

window.Utils = Utils; window.CartManager = CartManager; window.FavoriteManager = FavoriteManager;
window.PermissionManager = PermissionManager; window.ProductManager = ProductManager; window.StorageManager = StorageManager;
window.ApiManager = ApiManager;
window.AuthManager = AuthManager;
window.currentUser = currentUser;

window.updateAllFavoriteButtons = async () => {
    if (!currentUser) return; try { const favorites = await FavoriteManager.get(); favorites.forEach(fav => FavoriteManager.updateStatus(fav.product?._id || fav.productId, true)); } catch {}
};

// =================================================================
// APPLICATION START
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
