"use strict";

const AdminPanel = {
    // --- STATE ---
    products: [],
    users: [],
    activity: [],
    currentUser: null,
    socket: null,
    isInitialized: false, // Flag để tránh khởi tạo lại
    
    // Pagination State
    productCurrentPage: 1,
    userCurrentPage: 1,
    itemsPerPage: 7,

    // Sorting State
    productSort: { column: 'title', order: 'asc' },
    userSort: { column: 'name', order: 'asc' },

    // --- INITIALIZATION ---
    init() {
        document.addEventListener('DOMContentLoaded', async () => {
            // main.js đã chạy checkAutoLogin, nên window.currentUser đã được cập nhật
            this.currentUser = window.currentUser;
            this.bindEvents(); // Gắn các sự kiện, bao gồm cả form đăng nhập
            this.checkAuthAndToggleView(); // Kiểm tra quyền và hiển thị giao diện phù hợp
        });
    },

    checkAuthAndToggleView() {
        this.currentUser = window.currentUser; // Luôn lấy đối tượng người dùng mới nhất

        if (this.currentUser && this.currentUser.role === 'admin') {
            // Người dùng là admin, hiển thị panel
            document.getElementById('admin-login-container').style.display = 'none';
            document.getElementById('adminSidebar').style.display = 'flex';
            document.getElementById('adminMain').style.display = 'block';
            
            this.setupPanel(); // Hàm mới để khởi tạo dữ liệu cho panel
        } else {
            // Người dùng không phải admin hoặc chưa đăng nhập, hiển thị form đăng nhập
            document.getElementById('admin-login-container').style.display = 'flex';
            document.getElementById('adminSidebar').style.display = 'none';
            document.getElementById('adminMain').style.display = 'none';
            
            if (this.currentUser) { // Đã đăng nhập nhưng không phải admin
                document.getElementById('login-error-message').textContent = 'Truy cập bị từ chối. Yêu cầu quyền Admin.';
            }
        }
    },
    
    setupPanel() {
        if (this.isInitialized) return; // Không khởi tạo lại nếu đã làm rồi

        document.getElementById('adminName').textContent = this.currentUser.name || 'Admin';
        this.fetchInitialData();
        this.setupWebSocket();
        this.navigateToTab('dashboard-tab');
        this.isInitialized = true;
    },

    bindEvents() {
        // Form đăng nhập
        document.getElementById('admin-login-form').addEventListener('submit', (e) => this.handleAdminLogin(e));

        // Tab navigation
        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.addEventListener('click', (e) => this.navigateToTab(e.currentTarget.dataset.tab));
        });

        // Responsive sidebar
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('adminMain').addEventListener('click', () => {
            if (window.innerWidth <= 992) this.closeSidebar();
        });

        // Modal events
        document.getElementById('addProductBtn').addEventListener('click', () => this.openProductModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeProductModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.closeProductModal());
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') this.closeProductModal();
        });

        // Form submissions
        document.getElementById('product-form').addEventListener('submit', (e) => this.handleProductFormSubmit(e));
        document.getElementById('broadcastForm').addEventListener('submit', (e) => this.handleBroadcastSubmit(e));
        
        // Image preview
        document.getElementById('images').addEventListener('input', (e) => this.updateImagePreview(e.target.value));

        // Table search
        document.getElementById('productSearchInput').addEventListener('input', (e) => this.filterAndRenderProducts(e.target.value));
        document.getElementById('userSearchInput').addEventListener('input', (e) => this.filterAndRenderUsers(e.target.value));

        // Sorting
        document.querySelectorAll('#products-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('product', th.dataset.sort)));
        document.querySelectorAll('#users-table th[data-sort]').forEach(th => th.addEventListener('click', () => this.handleSort('user', th.dataset.sort)));

        // Event delegation for table actions
        document.getElementById('products-table-body').addEventListener('click', (e) => this.handleTableActions(e, 'product'));
        document.getElementById('users-table-body').addEventListener('click', (e) => this.handleTableActions(e, 'user'));

        // Logout
        document.getElementById('adminLogout').addEventListener('click', (e) => {
            e.preventDefault();
            if (window.AuthManager) {
                AuthManager.logout();
                this.isInitialized = false; // Reset flag khi đăng xuất
                this.checkAuthAndToggleView(); // Hiển thị lại màn hình đăng nhập
            }
        });
    },

    async handleAdminLogin(e) {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const errorMessage = document.getElementById('login-error-message');
        const submitBtn = document.querySelector('.btn-login');

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        try {
            // Sử dụng AuthManager từ main.js
            await AuthManager.login(email, password);
            
            // Sau khi đăng nhập thành công, kiểm tra lại quyền
            this.checkAuthAndToggleView();

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
                ApiManager.call('/products?limit=1000&sort=-createdAt', 'GET', null, false), // Lấy sản phẩm mới nhất trước
                ApiManager.call('/users', 'GET', null, true) // Yêu cầu quyền admin
            ]);

            this.products = productsData.data.products;
            this.users = usersData.data.users;
            
            this.generateActivityFeed();
            this.renderAll();
        } catch (error) {
            Utils.showToast('Không thể tải dữ liệu. ' + error.message, 'error');
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

        const topSeller = [...this.products].sort((a,b) => (b.sales || 0) - (a.sales || 0))[0];
        if (topSeller) {
            document.getElementById('top-seller').textContent = topSeller.title;
            document.getElementById('top-seller-sales').textContent = `${topSeller.sales || 0} lượt mua`;
        }
        this.renderActivityFeed();
    },

    generateActivityFeed() {
        const productActivity = this.products.slice(0, 5).map(p => ({ type: 'product', text: `Sản phẩm mới: <strong>${p.title}</strong>`, time: p.createdAt }));
        const userActivity = this.users.slice(0, 5).map(u => ({ type: 'user', text: `Người dùng mới: <strong>${u.name}</strong>`, time: u.createdAt }));
            
        this.activity = [...productActivity, ...userActivity].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
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
                <div class="activity-time">${this.moment(item.time).fromNow()}</div>
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
        const currentPage = this[`${type}CurrentPage`];
        
        // Sort data
        const sortedData = [...data].sort((a, b) => {
            const valA = a[sortState.column] || '';
            const valB = b[sortState.column] || '';
            if (typeof valA === 'string') {
                 return sortState.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortState.order === 'asc' ? valA - valB : valB - valA;
        });

        // Paginate data
        const totalItems = sortedData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = sortedData.slice(startIndex, endIndex);

        // Render table body
        const tableBodyId = `${type}s-table-body`;
        const renderFunction = type === 'product' ? this.renderProductRow : this.renderUserRow;
        const tableBody = document.getElementById(tableBodyId);
        if (paginatedData.length === 0) {
            const colspan = type === 'product' ? 6 : 5;
            this.setErrorState(tableBodyId, colspan, 'Không tìm thấy kết quả.');
        } else {
            tableBody.innerHTML = paginatedData.map(renderFunction).join('');
        }

        // Render pagination controls
        this.renderPagination(type, currentPage, totalPages, totalItems);
    },
    
    renderProductRow(p) {
        return `
            <tr>
                <td><img src="${p.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Img'}" alt="${p.title}" class="product-image-thumb"></td>
                <td>${p.title}</td>
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
                <td>${u.name}</td>
                <td>${u.email}</td>
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
        pageInfo.textContent = `Hiển thị ${this.itemsPerPage * (currentPage - 1) + 1} - ${Math.min(this.itemsPerPage * currentPage, totalItems)} của ${totalItems} mục`;

        document.getElementById(`${type}-prev-btn`).addEventListener('click', () => this.changePage(type, -1));
        document.getElementById(`${type}-next-btn`).addEventListener('click', () => this.changePage(type, 1));
    },
    
    changePage(type, direction) {
        const totalPages = Math.ceil(this[type+'s'].length / this.itemsPerPage);
        this[`${type}CurrentPage`] += direction;
        
        if (this[`${type}CurrentPage`] < 1) this[`${type}CurrentPage`] = 1;
        if (this[`${type}CurrentPage`] > totalPages) this[`${type}CurrentPage`] = totalPages;

        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`]();
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
        const activeTh = document.querySelector(`#${tableId} th[data-sort="${column}"] .sort-icon`);
        if (activeTh) activeTh.className = `fas fa-sort-${sortState.order === 'asc' ? 'up' : 'down'} sort-icon`;
        
        this[`filterAndRender${type.charAt(0).toUpperCase() + type.slice(1)}s`]();
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
        
        if (!productData.title || !productData.price || productData.stock === undefined) {
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
            // API endpoint này cần được tạo ở backend
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
            // API endpoint này cần được tạo ở backend
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
                        const imageUrls = product.images.join(',\n');
                        input.value = imageUrls;
                        this.updateImagePreview(imageUrls);
                    } else {
                        input.value = product[key] || '';
                    }
                }
            });
        } else {
            document.getElementById('modal-title').textContent = 'Thêm Sản Phẩm Mới';
        }
        document.getElementById('product-modal').style.display = 'flex';
    },

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
    },
    
    updateImagePreview(urls) {
        const previewContainer = document.getElementById('image-preview');
        previewContainer.innerHTML = '';
        if (!urls) return;
        const urlArray = urls.split(/[, \n]+/).map(url => url.trim()).filter(url => url);
        urlArray.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; };
            previewContainer.appendChild(img);
        });
    },

    // --- WEBSOCKET ---
    setupWebSocket() {
        try {
            if (typeof io === 'undefined') {
                console.warn("Thư viện Socket.IO không tìm thấy. Tính năng thông báo bị vô hiệu hóa.");
                return;
            }
            // Kết nối đến server gốc, không có /api/v1
            this.socket = io(CONFIG.API_BASE_URL.replace('/api/v1',''), { transports: ['websocket'] }); 
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
        // Simple moment.js 'fromNow' alternative
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
