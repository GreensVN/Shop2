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
            // Bind events immediately, including the crucial authChange listener
            this.bindEvents();
            // Perform an initial check. The authChange event will correct the view if needed.
            this.checkAuthAndToggleView();
        });
    },

    /**
     * Checks user's authentication and role, then shows/hides the admin panel accordingly.
     * This function is the single source of truth for UI visibility.
     */
    checkAuthAndToggleView() {
        // Always get the latest user object from the global scope (managed by main.js)
        this.currentUser = window.currentUser;

        const loginContainer = document.getElementById('admin-login-container');
        const sidebar = document.getElementById('adminSidebar');
        const mainContent = document.getElementById('adminMain');
        const errorMessage = document.getElementById('login-error-message');

        if (this.currentUser && this.currentUser.role === 'admin') {
            // User is an admin, show the panel
            if(loginContainer) loginContainer.style.display = 'none';
            if(sidebar) sidebar.style.display = 'flex';
            if(mainContent) mainContent.style.display = 'block';

            // Setup the panel only if it hasn't been initialized before
            if (!this.isInitialized) {
                this.setupPanel();
            }
        } else {
            // User is not an admin or not logged in, show the login form
            if(loginContainer) loginContainer.style.display = 'flex';
            if(sidebar) sidebar.style.display = 'none';
            if(mainContent) mainContent.style.display = 'none';
            
            if (this.currentUser) { // Logged in, but not an admin
                 if(errorMessage) errorMessage.textContent = 'Truy cập bị từ chối. Yêu cầu quyền Admin.';
            } else { // Not logged in
                 if(errorMessage) errorMessage.textContent = '';
            }
            // Reset initialization flag if the user logs out
            this.isInitialized = false;
        }
    },

    /**
     * Sets up the main panel functionality once.
     */
    setupPanel() {
        if (this.isInitialized) return;

        const adminName = document.getElementById('adminName');
        if(adminName) adminName.textContent = this.currentUser.name || 'Admin';

        this.fetchInitialData();
        this.setupWebSocket();
        this.navigateToTab('dashboard-tab');
        this.isInitialized = true;
    },

    /**
     * Binds all event listeners.
     */
    bindEvents() {
        // *** CRITICAL FIX: Listen for authentication state changes from main.js ***
        document.addEventListener('authChange', (event) => {
            this.currentUser = event.detail.user; // Update user from the event
            this.checkAuthAndToggleView(); // Re-evaluate the entire view
        });

        // Login Form
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));

        // Tab navigation
        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.addEventListener('click', (e) => this.navigateToTab(e.currentTarget.dataset.tab));
        });

        // Responsive sidebar
        const menuToggle = document.getElementById('menuToggle');
        if(menuToggle) menuToggle.addEventListener('click', () => this.toggleSidebar());

        const adminMain = document.getElementById('adminMain');
        if(adminMain) adminMain.addEventListener('click', () => {
            if (window.innerWidth <= 992) this.closeSidebar();
        });

        // Modal events
        const addProductBtn = document.getElementById('addProductBtn');
        if(addProductBtn) addProductBtn.addEventListener('click', () => this.openProductModal());

        const closeModalBtn = document.getElementById('close-modal-btn');
        if(closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeProductModal());

        const cancelBtn = document.getElementById('cancel-btn');
        if(cancelBtn) cancelBtn.addEventListener('click', () => this.closeProductModal());

        const productModal = document.getElementById('product-modal');
        if(productModal) productModal.addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') this.closeProductModal();
        });

        // Form submissions
        const productForm = document.getElementById('product-form');
        if(productForm) productForm.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
        
        const broadcastForm = document.getElementById('broadcastForm');
        if(broadcastForm) broadcastForm.addEventListener('submit', (e) => this.handleBroadcastSubmit(e));

        // Image preview
        const imagesInput = document.getElementById('images');
        if(imagesInput) imagesInput.addEventListener('input', (e) => this.updateImagePreview(e.target.value));

        // Table search
        const productSearchInput = document.getElementById('productSearchInput');
        if(productSearchInput) productSearchInput.addEventListener('input', (e) => this.filterAndRenderProducts(e.target.value));
        
        const userSearchInput = document.getElementById('userSearchInput');
        if(userSearchInput) userSearchInput.addEventListener('input', (e) => this.filterAndRenderUsers(e.target.value));

        // Sorting
        document.querySelectorAll('#products-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('product', th.dataset.sort)));
        document.querySelectorAll('#users-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('user', th.dataset.sort)));

        // Event delegation for table actions
        const productsTableBody = document.getElementById('products-table-body');
        if(productsTableBody) productsTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'product'));
        
        const usersTableBody = document.getElementById('users-table-body');
        if(usersTableBody) usersTableBody.addEventListener('click', (e) => this.handleTableActions(e, 'user'));

        // Logout
        const adminLogout = document.getElementById('adminLogout');
        if(adminLogout) adminLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.AuthManager) {
                window.AuthManager.logout();
            }
        });
    },

    /**
     * Handles the login attempt from the admin login form.
     */
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
            // Use AuthManager from main.js. It will update window.currentUser and
            // dispatch the 'authChange' event, which our listener will catch.
            await window.AuthManager.login(email, password);
            // The checkAuthAndToggleView function will be called automatically by the event listener.
        } catch (error) {
            errorMessage.textContent = error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng nhập';
        }
    },

    // --- DATA FETCHING & RENDERING ---
    async fetchInitialData() {
        this.setLoadingState('products-table-body', 6);
        this.setLoadingState('users-table-body', 5);

        try {
            const [productsData, usersData] = await Promise.all([
                ApiManager.call('/products?limit=1000&sort=-createdAt', 'GET', null, false),
                ApiManager.call('/users', 'GET', null, true)
            ]);

            this.products = productsData.data.products || [];
            this.users = usersData.data.users || [];

            this.generateActivityFeed();
            this.renderAll();
        } catch (error) {
            Utils.showToast('Không thể tải dữ liệu quản trị. ' + error.message, 'error');
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

    // --- DASHBOARD ---
    renderDashboard() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-users').textContent = this.users.length;
        const totalRevenue = this.products.reduce((sum, p) => sum + (p.sales || 0) * p.price, 0);
        document.getElementById('total-revenue').textContent = Utils.formatPrice(totalRevenue);

        const topSeller = [...this.products].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0];
        if (topSeller) {
            document.getElementById('top-seller').textContent = topSeller.title;
            document.getElementById('top-seller-sales').textContent = `${topSeller.sales || 0} lượt mua`;
        }
        this.renderActivityFeed();
    },

    generateActivityFeed() {
        const productActivity = this.products.slice(0, 5).map(p => ({ type: 'product', text: `Sản phẩm mới: <strong>${Utils.sanitizeInput(p.title)}</strong>`, time: p.createdAt }));
        const userActivity = this.users.slice(0, 5).map(u => ({ type: 'user', text: `Người dùng mới: <strong>${Utils.sanitizeInput(u.name)}</strong>`, time: u.createdAt }));

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

    // --- TABLE MANAGEMENT (Products & Users) ---
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
        
        // Use the current page from state, or reset if it's invalid for the new data
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
                <td><img src="${Utils.sanitizeInput(p.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Img')}" alt="${Utils.sanitizeInput(p.title)}" class="product-image-thumb"></td>
                <td>${Utils.sanitizeInput(p.title)}</td>
                <td>${Utils.formatPrice(p.price)}</td>
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
                <td>${Utils.sanitizeInput(u.name)}</td>
                <td>${Utils.sanitizeInput(u.email)}</td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${Utils.formatDate(u.createdAt)}</td>
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
        if(!container || !pageInfo) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            pageInfo.textContent = `Tổng: ${totalItems} mục`;
            return;
        }

        container.innerHTML = `
            <button id="${type}-prev-btn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
            <span>Trang ${currentPage} / ${totalPages}</span>
            <button id="${type}-next-btn" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
        `;
        pageInfo.textContent = `Hiển thị ${startIndex + 1} - ${Math.min(endIndex, totalItems)} của ${totalItems} mục`;
        const startIndex = this.itemsPerPage * (currentPage - 1);
        const endIndex = this.itemsPerPage * currentPage;
        pageInfo.textContent = `Hiển thị ${startIndex + 1} - ${Math.min(endIndex, totalItems)} của ${totalItems} mục`;


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

    // --- CRUD & ACTIONS ---
    async handleProductFormSubmit(e) {
        e.preventDefault();
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
            images: document.getElementById('images').value.split(/[, \n]+/).map(url => url.trim()).filter(url => url && Utils.validateURL(url)),
            badge: document.getElementById('badge').value.trim() || undefined,
        };

        if (!productData.title || isNaN(productData.price) || isNaN(productData.stock)) {
            Utils.showToast('Vui lòng điền các trường bắt buộc (*).', 'error');
            return;
        }

        try {
            const endpoint = isEditing ? `/products/${productId}` : '/products';
            const method = isEditing ? 'PATCH' : 'POST';
            await ApiManager.call(endpoint, method, productData, true);
            Utils.showToast(`Sản phẩm đã được ${isEditing ? 'cập nhật' : 'thêm'} thành công!`, 'success');
            this.closeProductModal();
            await this.fetchInitialData();
        } catch (error) {
            Utils.showToast(error.message || 'Có lỗi xảy ra.', 'error');
        }
    },

    handleEditProduct(id) {
        const productToEdit = this.products.find(p => p._id === id);
        if (productToEdit) this.openProductModal(productToEdit);
    },

    async handleDeleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.')) return;
        try {
            await ApiManager.call(`/products/${id}`, 'DELETE', null, true);
            Utils.showToast('Đã xóa sản phẩm thành công.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            Utils.showToast(error.message || 'Xóa sản phẩm thất bại.', 'error');
        }
    },

    async handlePromoteUser(id) {
        if (!confirm('Bạn có chắc chắn muốn thăng cấp người dùng này thành Admin?')) return;
        try {
            await ApiManager.call(`/users/${id}`, 'PATCH', { role: 'admin' }, true);
            Utils.showToast('Đã thăng cấp người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            Utils.showToast(error.message || 'Thao tác thất bại.', 'error');
        }
    },

    async handleBanUser(id) {
        if (!confirm('Bạn có chắc chắn muốn cấm người dùng này?')) return;
        try {
            await ApiManager.call(`/users/${id}`, 'PATCH', { active: false }, true);
            Utils.showToast('Đã cấm người dùng.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            Utils.showToast(error.message || 'Thao tác thất bại.', 'error');
        }
    },

    // --- UI & MODAL ---
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
            if (Utils.validateURL(url)) {
                const img = document.createElement('img');
                img.src = url;
                img.onerror = () => { img.style.display = 'none'; };
                previewContainer.appendChild(img);
            }
        });
    },

    // --- WEBSOCKET ---
    setupWebSocket() {
        try {
            if (typeof io === 'undefined') {
                console.warn("Thư viện Socket.IO không tìm thấy. Tính năng thông báo bị vô hiệu hóa.");
                return;
            }
            this.socket = io(CONFIG.API_BASE_URL.replace('/api/v1', ''), { transports: ['websocket'] });
            this.socket.on('connect', () => {
                Utils.showToast('Hệ thống thông báo sẵn sàng!', 'info');
                document.querySelector('#broadcastForm button').disabled = false;
            });
            this.socket.on('connect_error', (err) => {
                Utils.showToast('Không thể kết nối server thông báo!', 'error');
                console.error('Socket connect_error:', err);
                document.querySelector('#broadcastForm button').disabled = true;
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
            Utils.showToast('Đã gửi thông báo!', 'success');
            messageInput.value = '';
        } else if (!this.socket || !this.socket.connected) {
            Utils.showToast('Chưa kết nối đến server thông báo.', 'error');
        }
    },

    // --- UTILITIES ---
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

AdminPanel.init();
