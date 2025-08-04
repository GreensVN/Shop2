"use strict";

const AdminPanel = {
    // --- CONFIG ---
    apiUrl: 'https://shop-4mlk.onrender.com/api/v1',
    socketUrl: 'https://shop-4mlk.onrender.com/api/v1', // Thay đổi nếu có
    products: [],
    users: [],
    currentUser: null,
    socket: null,

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.currentUser = window.currentUser;
            if (!this.checkAuth()) return;

            this.bindEvents();
            this.fetchInitialData();
            this.setupWebSocket();
            document.querySelector('.nav-item[data-tab="dashboard-tab"]').click();
        });
    },

    checkAuth() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            alert('Truy cập bị từ chối! Yêu cầu quyền Admin.');
            window.location.href = 'index.html';
            return false;
        }
        document.getElementById('adminName').textContent = this.currentUser.name;
        return true;
    },

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.admin-nav .nav-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                document.querySelectorAll('.admin-nav .nav-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
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
        document.getElementById('productSearchInput').addEventListener('input', (e) => this.filterTable(e.target.value, 'products-table'));
        document.getElementById('userSearchInput').addEventListener('input', (e) => this.filterTable(e.target.value, 'users-table'));


        // Event delegation for table actions
        document.getElementById('products-table-body').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            if (editBtn) this.handleEditProduct(editBtn.dataset.id);
            if (deleteBtn) this.handleDeleteProduct(deleteBtn.dataset.id);
        });
        document.getElementById('users-table-body').addEventListener('click', (e) => {
            // Placeholder for user actions
        });

        // Logout
        document.getElementById('adminLogout').addEventListener('click', (e) => {
            e.preventDefault();
            if (window.logout) window.logout();
        });
    },
    
    async fetchInitialData() {
        this.setLoadingState('products-table-body', 6);
        this.setLoadingState('users-table-body', 5);
        
        try {
            const [productsData, usersData] = await Promise.all([
                window.callApi('/products?limit=1000', 'GET', null, false),
                window.callApi('/users', 'GET', null, true) // requires admin auth
            ]);

            this.products = productsData.data.products;
            this.users = usersData.data.users;
            
            this.renderProductList();
            this.renderUserList();
            this.renderDashboard();

        } catch (error) {
            window.Utils.showToast('Không thể tải dữ liệu ban đầu. ' + error.message, 'error');
            this.setErrorState('products-table-body', 6, 'Lỗi tải sản phẩm');
            this.setErrorState('users-table-body', 5, 'Lỗi tải người dùng');
        }
    },
    
    setLoadingState(tbodyId, colspan) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="loading-state"><div class="spinner"></div></div></td></tr>`;
        }
    },

    setErrorState(tbodyId, colspan, message) {
        const tbody = document.getElementById(tbodyId);
         if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div></td></tr>`;
        }
    },

    renderDashboard() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-users').textContent = this.users.length;
        
        const totalRevenue = this.products.reduce((sum, p) => sum + (p.sales || 0) * p.price, 0);
        document.getElementById('total-revenue').textContent = window.Utils.formatPrice(totalRevenue) + 'đ';

        const topSeller = this.products.reduce((top, p) => (!top || (p.sales || 0) > (top.sales || 0) ? p : top), null);
        if (topSeller) {
            document.getElementById('top-seller').textContent = topSeller.title;
            document.getElementById('top-seller-sales').textContent = `${topSeller.sales || 0} lượt mua`;
        }
    },

    renderProductList() {
        const tableBody = document.getElementById('products-table-body');
        if (this.products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Chưa có sản phẩm nào.</p></div></td></tr>`;
            return;
        }

        tableBody.innerHTML = this.products.map(p => `
            <tr data-search-term="${p.title.toLowerCase()}">
                <td><img src="${p.images[0] || 'https://via.placeholder.com/50'}" alt="${p.title}" class="product-image-thumb"></td>
                <td>${p.title}</td>
                <td>${window.Utils.formatPrice(p.price)}đ</td>
                <td>${p.stock}</td>
                <td>${p.sales || 0}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${p._id}" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" data-id="${p._id}" title="Xóa"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    renderUserList() {
        const tableBody = document.getElementById('users-table-body');
         if (this.users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Chưa có người dùng nào.</p></div></td></tr>`;
            return;
        }
        
        tableBody.innerHTML = this.users.map(u => `
            <tr data-search-term="${u.name.toLowerCase()} ${u.email.toLowerCase()}">
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                <td class="actions">
                   <button class="btn-promote" data-id="${u._id}" title="Thăng cấp Admin"><i class="fas fa-user-shield"></i></button>
                   <button class="btn-ban" data-id="${u._id}" title="Khóa tài khoản"><i class="fas fa-user-slash"></i></button>
                </td>
            </tr>
        `).join('');
    },
    
    openProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        const title = document.getElementById('modal-title');
        
        form.reset();
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('productId').value = '';

        if (product) {
            // Edit mode
            title.textContent = 'Chỉnh Sửa Sản Phẩm';
            document.getElementById('productId').value = product._id;
            document.getElementById('title').value = product.title;
            document.getElementById('category').value = product.category;
            document.getElementById('price').value = product.price;
            document.getElementById('oldPrice').value = product.oldPrice || '';
            document.getElementById('stock').value = product.stock;
            document.getElementById('badge').value = product.badge || '';
            document.getElementById('description').value = product.description;
            document.getElementById('detailedDescription').value = product.detailedDescription || '';
            const imageUrls = product.images.join(',\n');
            document.getElementById('images').value = imageUrls;
            this.updateImagePreview(imageUrls);
        } else {
            // Add mode
            title.textContent = 'Thêm Sản Phẩm Mới';
        }

        modal.style.display = 'flex';
    },

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
    },
    
    updateImagePreview(urls) {
        const previewContainer = document.getElementById('image-preview');
        previewContainer.innerHTML = '';
        const urlArray = urls.split(/[, \n]+/).map(url => url.trim()).filter(url => url);
        urlArray.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; };
            previewContainer.appendChild(img);
        });
    },

    async handleProductFormSubmit(e) {
        e.preventDefault();
        const productId = document.getElementById('productId').value;
        const isEditing = !!productId;

        const productData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            price: parseInt(document.getElementById('price').value, 10),
            oldPrice: document.getElementById('oldPrice').value ? parseInt(document.getElementById('oldPrice').value, 10) : undefined,
            stock: parseInt(document.getElementById('stock').value, 10),
            description: document.getElementById('description').value,
            detailedDescription: document.getElementById('detailedDescription').value,
            images: document.getElementById('images').value.split(/[, \n]+/).map(url => url.trim()).filter(url => url),
            badge: document.getElementById('badge').value || undefined,
        };
        
        // Simple validation
        if (!productData.title || !productData.price || !productData.stock) {
            window.Utils.showToast('Vui lòng điền các trường bắt buộc (Tên, Giá, Kho).', 'error');
            return;
        }

        try {
            const endpoint = isEditing ? `/products/${productId}` : '/products';
            const method = isEditing ? 'PATCH' : 'POST';
            
            await window.callApi(endpoint, method, productData);
            
            window.Utils.showToast(`Sản phẩm đã được ${isEditing ? 'cập nhật' : 'thêm'} thành công!`, 'success');
            this.closeProductModal();
            await this.fetchInitialData(); // Reload all data to reflect changes
        } catch (error) {
            window.Utils.showToast(error.message || 'Có lỗi xảy ra.', 'error');
        }
    },

    handleEditProduct(id) {
        const productToEdit = this.products.find(p => p._id === id);
        if (productToEdit) {
            this.openProductModal(productToEdit);
        }
    },

    async handleDeleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.')) {
            return;
        }
        try {
            await window.callApi(`/products/${id}`, 'DELETE');
            window.Utils.showToast('Đã xóa sản phẩm thành công.', 'success');
            await this.fetchInitialData();
        } catch (error) {
            window.Utils.showToast(error.message || 'Xóa sản phẩm thất bại.', 'error');
        }
    },

    filterTable(searchTerm, tableId) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const table = document.getElementById(tableId);
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const rowSearchTerm = row.dataset.searchTerm || '';
            if (rowSearchTerm.includes(lowerCaseSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    setupWebSocket() {
        try {
            this.socket = io(this.socketUrl, { autoConnect: false }); // Do not connect automatically
            if (this.socket) {
                this.socket.connect();
                this.socket.on('connect', () => {
                    console.log('Admin connected to WebSocket Server.');
                    window.Utils.showToast('Hệ thống thông báo sẵn sàng!', 'info');
                });
                this.socket.on('connect_error', () => {
                     window.Utils.showToast('Không thể kết nối server thông báo!', 'error');
                });
            }
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
    }
};

// Start the admin panel initialization process
AdminPanel.init();