<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Shop Grow A Garden</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --primary-color: #4f46e5;
            --secondary-color: #1f2937;
            --light-color: #f9fafb;
            --gray-color: #6b7280;
            --border-color: #e5e7eb;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --font-main: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --border-radius: 12px;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
            font-family: var(--font-main);
            background-color: var(--light-color);
            color: var(--secondary-color);
            display: flex;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* --- Admin Login Screen --- */
        #admin-login-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: var(--light-color);
            position: fixed;
            top: 0;
            left: 0;
            z-index: 200;
        }
        .login-box {
            background: white;
            padding: 3rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            text-align: center;
            width: 100%;
            max-width: 400px;
            animation: zoomIn 0.5s ease-out;
        }
        .login-logo {
            height: 60px;
            margin-bottom: 1rem;
        }
        .login-box h2 {
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
            color: var(--secondary-color);
        }
        .login-box p {
            margin-bottom: 2rem;
            color: var(--gray-color);
        }
        #admin-login-form .input-group {
            position: relative;
            margin-bottom: 1.5rem;
        }
        #admin-login-form .input-group i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray-color);
        }
        #admin-login-form input {
            width: 100%;
            padding: 1rem 1rem 1rem 2.5rem;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
            transition: var(--transition);
        }
        #admin-login-form input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
        .btn-login {
            width: 100%;
            padding: 1rem;
            border: none;
            border-radius: 8px;
            background: var(--primary-color);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }
        .btn-login:hover {
            background-color: #4338ca;
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        .btn-login:disabled {
            background-color: var(--gray-color);
            cursor: not-allowed;
        }
        .error-message {
            color: var(--danger-color);
            margin-top: 1rem;
            font-size: 0.9rem;
            height: 1.2rem; /* Reserve space to prevent layout shift */
        }
        .back-to-shop {
            display: inline-block;
            margin-top: 1.5rem;
            color: var(--gray-color);
            text-decoration: none;
            font-size: 0.9rem;
        }
        .back-to-shop:hover {
            color: var(--primary-color);
            text-decoration: underline;
        }

        /* --- Sidebar --- */
        .admin-sidebar {
            width: 260px;
            background: var(--secondary-color);
            color: #e5e7eb;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            padding: 1.5rem;
            transition: transform var(--transition);
            z-index: 100;
        }
        .sidebar-header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #374151;
        }
        .sidebar-header .logo { height: 50px; margin-bottom: 10px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
        .sidebar-header h3 { color: white; font-weight: 600; }

        .admin-nav .nav-item {
            display: flex;
            align-items: center;
            padding: 0.875rem 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s, color 0.2s, transform 0.2s;
            font-weight: 500;
        }
        .admin-nav .nav-item:hover { background: #374151; color: white; transform: translateX(5px); }
        .admin-nav .nav-item.active { background: var(--primary-color); color: white; font-weight: 600; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); }
        .admin-nav .nav-item i { margin-right: 1rem; width: 20px; text-align: center; font-size: 1.1rem; }

        .sidebar-footer {
            margin-top: auto;
            text-align: center;
            padding-top: 1.5rem;
            border-top: 1px solid #374151;
        }
        .sidebar-footer p { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .sidebar-footer a { color: var(--gray-color); text-decoration: none; transition: color 0.2s; }
        .sidebar-footer a:hover { color: white; text-decoration: underline; }

        /* --- Main Content --- */
        .admin-main {
            margin-left: 260px;
            width: calc(100% - 260px);
            padding: 2rem;
            transition: margin-left var(--transition), width var(--transition);
        }
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        #pageTitle { font-size: 2.25rem; margin: 0; font-weight: 700; }
        #menuToggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--secondary-color);
        }

        .content-section { display: none; }
        .content-section.active { display: block; animation: fadeIn 0.5s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { to { opacity: 1; transform: scale(1); } }

        /* --- Dashboard Specifics --- */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
        .card { background: white; padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); transition: transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .card-header h3 { margin: 0; color: var(--gray-color); font-size: 1rem; font-weight: 600; }
        .card-icon { font-size: 1.5rem; color: var(--primary-color); background: #eef2ff; padding: 0.75rem; border-radius: 50%; }
        .card .value { font-size: 2rem; font-weight: 700; }
        .card .sub-value { font-size: 0.9rem; color: var(--gray-color); margin-top: 5px; }

        .activity-feed, .chart-container, #broadcast-form-container { background: white; padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); }
        .activity-feed h3, .chart-container h3, #broadcast-form-container h3 { margin-bottom: 1rem; }
        .activity-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon { font-size: 1.2rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .activity-icon.user { background: #dcfce7; color: #16a34a; }
        .activity-icon.product { background: #e0e7ff; color: #4338ca; }
        .activity-text { flex-grow: 1; font-size: 0.9rem; }
        .activity-time { font-size: 0.8rem; color: var(--gray-color); white-space: nowrap; }
        
        /* --- Tables --- */
        .table-container { background: white; border-radius: var(--border-radius); box-shadow: var(--shadow-md); overflow-x: auto; }
        .table-header { padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); }
        .table-header input { padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: 8px; width: 300px; transition: var(--transition); }
        .table-header input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); outline: none; }
        
        table { width: 100%; border-collapse: collapse; min-width: 800px; }
        th, td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
        thead { background: #f9fafb; }
        thead th { font-weight: 600; color: var(--gray-color); cursor: pointer; user-select: none; white-space: nowrap; }
        thead th:hover .sort-icon { opacity: 1; }
        thead th .sort-icon { margin-left: 0.5rem; opacity: 0.5; transition: opacity 0.2s; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #f3f4f6; }
        .product-image-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }
        
        .actions button { background: none; border: none; cursor: pointer; padding: 5px; font-size: 1rem; margin: 0 5px; transition: color 0.2s, transform 0.2s; }
        .actions button:hover { transform: scale(1.2); }
        .actions button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-edit { color: var(--primary-color); }
        .btn-delete { color: var(--danger-color); }
        .btn-promote { color: var(--success-color); }
        .btn-ban { color: var(--warning-color); }
        .role-badge { padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .role-badge.admin { background: #fee2e2; color: var(--danger-color); }
        .role-badge.user { background: #e0f2fe; color: #0284c7; }
        
        .table-footer { padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .pagination { display: flex; gap: 0.5rem; align-items: center; }
        .pagination button { padding: 0.5rem 1rem; border: 1px solid var(--border-color); background: white; border-radius: 6px; cursor: pointer; transition: var(--transition); }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination button:hover:not(:disabled) { background: var(--light-color); border-color: var(--primary-color); color: var(--primary-color); }
        
        .loading-state, .empty-state { text-align: center; padding: 3rem; color: var(--gray-color); }
        .spinner { width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* --- Generic Button --- */
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; text-decoration: none; cursor: pointer; font-size: 14px; background-color: var(--primary-color); color: white; transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .btn:hover { background-color: #4338ca; transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .btn i { font-size: 1rem; }

        /* --- Modal --- */
        .modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(4px);
            z-index: 101; justify-content: center; align-items: start; animation: fadeIn 0.3s; padding: 2rem 0;
        }
        .modal-content {
            background: white; padding: 2.5rem; border-radius: var(--border-radius); width: 95%; max-width: 800px;
            max-height: calc(100vh - 4rem); overflow-y: auto; box-shadow: var(--shadow-lg);
            opacity: 0; transform: scale(0.95); animation: zoomIn 0.3s forwards;
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
        .modal-header h2 { margin: 0; font-size: 1.5rem; }
        #close-modal-btn { background: none; border: none; font-size: 1.75rem; cursor: pointer; color: var(--gray-color); transition: color 0.2s, transform 0.2s; }
        #close-modal-btn:hover { color: var(--secondary-color); transform: rotate(90deg); }

        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; }
        .form-group input, .form-group textarea, .form-group select {
            padding: 0.875rem 1rem; border: 1px solid var(--border-color); border-radius: 8px;
            font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; background-color: white; font-family: inherit;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
            outline: none; border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
        .form-group textarea { min-height: 120px; resize: vertical; }

        .image-preview { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; background-color: #f3f4f6; padding: 1rem; border-radius: 8px; min-height: 120px; border: 1px dashed var(--border-color); }
        .image-preview img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid white; box-shadow: var(--shadow-sm); }
        .modal-footer { margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); }
        
        /* --- Responsive --- */
        @media (max-width: 992px) {
            .admin-sidebar { transform: translateX(-100%); box-shadow: var(--shadow-lg); }
            .admin-sidebar.open { transform: translateX(0); }
            .admin-main { margin-left: 0; width: 100%; }
            #menuToggle { display: block; }
        }
        @media (max-width: 768px) {
            .admin-main { padding: 1.5rem; }
            .admin-header h1 { font-size: 1.75rem; }
            .table-header { flex-direction: column; gap: 1rem; align-items: stretch; }
            .table-header input { width: 100%; }
            .dashboard-grid { grid-template-columns: 1fr; }
            .stat-cards { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
            .stat-cards { grid-template-columns: 1fr; }
            .table-footer { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <!-- Login Section -->
    <div id="admin-login-container">
        <div class="login-box">
            <img src="https://i.ibb.co/q3r1hTft/8574d186247eba75669b7d50d42bd650-png.png" alt="Logo" class="login-logo">
            <h2>Admin Panel Login</h2>
            <p>Vui lòng đăng nhập để tiếp tục</p>
            <form id="admin-login-form">
                <div class="input-group">
                    <i class="fas fa-envelope"></i>
                    <input type="email" id="admin-email" placeholder="Email" required>
                </div>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="admin-password" placeholder="Mật khẩu" required>
                </div>
                <button type="submit" class="btn-login">Đăng nhập</button>
                <p id="login-error-message" class="error-message"></p>
            </form>
            <a href="index.html" class="back-to-shop">← Quay lại trang chủ</a>
        </div>
    </div>

    <!-- Main Admin Panel (Initially hidden) -->
    <aside class="admin-sidebar" id="adminSidebar" style="display: none;">
        <div class="sidebar-header">
            <img src="https://i.ibb.co/q3r1hTft/8574d186247eba75669b7d50d42bd650-png.png" alt="Logo" class="logo">
            <h3>Admin Panel</h3>
        </div>
        <nav class="admin-nav">
            <div class="nav-item active" data-tab="dashboard-tab"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></div>
            <div class="nav-item" data-tab="products-tab"><i class="fas fa-box-open"></i><span>Sản phẩm</span></div>
            <div class="nav-item" data-tab="users-tab"><i class="fas fa-users"></i><span>Người dùng</span></div>
            <div class="nav-item" data-tab="broadcast-tab"><i class="fas fa-bullhorn"></i><span>Thông báo</span></div>
        </nav>
        <div class="sidebar-footer">
            <p>Xin chào, <strong id="adminName">Admin</strong></p>
            <a href="#" id="adminLogout">Đăng xuất <i class="fas fa-sign-out-alt"></i></a>
        </div>
    </aside>

    <main class="admin-main" id="adminMain" style="display: none;">
        <header class="admin-header">
            <button class="menu-toggle" id="menuToggle"><i class="fas fa-bars"></i></button>
            <h1 id="pageTitle">Dashboard</h1>
        </header>

        <!-- Dashboard Section -->
        <section id="dashboard-tab" class="content-section active">
            <div class="stat-cards">
                <div class="card">
                    <div class="card-header"><h3>Tổng Sản Phẩm</h3><i class="fas fa-boxes card-icon"></i></div>
                    <div class="value" id="total-products">0</div>
                </div>
                 <div class="card">
                    <div class="card-header"><h3>Doanh Thu</h3><i class="fas fa-dollar-sign card-icon" style="color: var(--success-color); background: #dcfce7;"></i></div>
                    <div class="value" id="total-revenue">0đ</div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Bán Chạy</h3><i class="fas fa-fire card-icon" style="color: var(--danger-color); background: #fee2e2;"></i></div>
                    <div class="value" id="top-seller" style="font-size: 1.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">N/A</div>
                    <div class="sub-value" id="top-seller-sales">0 lượt mua</div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Người Dùng</h3><i class="fas fa-users card-icon" style="color: var(--warning-color); background: #fef9c3;"></i></div>
                    <div class="value" id="total-users">0</div>
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="activity-feed">
                    <h3>Hoạt Động Gần Đây</h3>
                    <div id="activity-feed-content">
                        <div class="empty-state" style="padding: 1rem 0;"><p>Chưa có hoạt động nào.</p></div>
                    </div>
                </div>
                <div class="chart-container">
                    <h3>Biểu Đồ Doanh Thu (Sắp ra mắt)</h3>
                    <div class="empty-state" style="padding: 1rem 0;">
                        <i class="fas fa-chart-line fa-3x" style="opacity: 0.5;"></i>
                        <p>Dữ liệu biểu đồ sẽ sớm được tích hợp.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Products Section -->
        <section id="products-tab" class="content-section">
            <div class="table-container">
                <div class="table-header">
                    <input type="text" id="productSearchInput" placeholder="🔍 Tìm kiếm sản phẩm...">
                    <button class="btn" id="addProductBtn"><i class="fas fa-plus"></i> Thêm Sản Phẩm</button>
                </div>
                <table id="products-table">
                    <thead>
                        <tr>
                            <th>Hình ảnh</th>
                            <th data-sort="title">Tên sản phẩm <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="price">Giá <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="stock">Kho <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="sales">Đã bán <i class="fas fa-sort sort-icon"></i></th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body"></tbody>
                </table>
                <div class="table-footer">
                    <span id="product-page-info"></span>
                    <div class="pagination" id="product-pagination"></div>
                </div>
            </div>
        </section>

        <!-- Users Section -->
        <section id="users-tab" class="content-section">
             <div class="table-container">
                <div class="table-header">
                    <input type="text" id="userSearchInput" placeholder="🔍 Tìm kiếm người dùng theo tên hoặc email...">
                </div>
                <table id="users-table">
                    <thead>
                        <tr>
                            <th data-sort="name">Tên người dùng <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="email">Email <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="role">Vai trò <i class="fas fa-sort sort-icon"></i></th>
                            <th data-sort="createdAt">Ngày đăng ký <i class="fas fa-sort sort-icon"></i></th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body"></tbody>
                </table>
                <div class="table-footer">
                    <span id="user-page-info"></span>
                    <div class="pagination" id="user-pagination"></div>
                </div>
            </div>
        </section>

        <!-- Broadcast Section -->
        <section id="broadcast-tab" class="content-section">
            <div id="broadcast-form-container">
                <h3>Gửi Thông Báo Toàn Web</h3>
                <p class="sub-value" style="margin-bottom: 1.5rem;">Thông báo sẽ được gửi tới tất cả người dùng đang truy cập trang web thông qua WebSocket.</p>
                <form id="broadcastForm">
                    <div class="form-group full-width">
                        <label for="broadcastMessage">Nội dung thông báo</label>
                        <textarea id="broadcastMessage" required placeholder="Nhập thông báo..."></textarea>
                    </div>
                    <button type="submit" class="btn"><i class="fas fa-paper-plane"></i> Gửi Thông Báo</button>
                </form>
            </div>
        </section>
    </main>

    <!-- Product Add/Edit Modal -->
    <div id="product-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">Thêm Sản Phẩm Mới</h2>
                <button id="close-modal-btn" class="close-button">×</button>
            </div>
            <form id="product-form" novalidate>
                <input type="hidden" id="productId">
                <div class="form-grid">
                    <div class="form-group"><label for="title">Tên sản phẩm *</label><input type="text" id="title" required></div>
                    <div class="form-group"><label for="category">Danh mục</label><input type="text" id="category" placeholder="e.g., Thú cưng, Giống cây..."></div>
                    <div class="form-group"><label for="price">Giá bán (VNĐ) *</label><input type="number" id="price" required min="0"></div>
                    <div class="form-group"><label for="oldPrice">Giá cũ (VNĐ)</label><input type="number" id="oldPrice" min="0"></div>
                    <div class="form-group"><label for="stock">Số lượng kho *</label><input type="number" id="stock" required min="0" value="99"></div>
                    <div class="form-group"><label for="badge">Nhãn (Hot, Sale...)</label><input type="text" id="badge" placeholder="e.g., Hot, Sale"></div>
                    <div class="form-group full-width"><label for="description">Mô tả ngắn</label><textarea id="description"></textarea></div>
                    <div class="form-group full-width"><label for="detailedDescription">Mô tả chi tiết</label><textarea id="detailedDescription"></textarea></div>
                    <div class="form-group full-width">
                        <label for="images">Link hình ảnh (cách nhau bằng dấu phẩy hoặc xuống dòng)</label>
                        <textarea id="images" placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"></textarea>
                        <div class="image-preview" id="image-preview"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" id="cancel-btn" style="background-color: var(--gray-color);">Hủy</button>
                    <button type="submit" class="btn" id="save-product-btn">Lưu Sản Phẩm</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Toast Container - Sử dụng từ main.js -->
    <div id="toastContainer"></div>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script src="main.js"></script>
    <script src="admin.js"></script>
</body>
</html>```

#### `admin.js`

```javascript
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
        return {
            fromNow: () => {
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
        }
    }
};

AdminPanel.init();
