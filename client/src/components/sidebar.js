// sidebar.js - Sidebar component
export function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="logo-container">
            <div class="logo">IM</div>
            <div class="logo-text">Inventory Manager</div>
        </div>
        <div class="menu-items">
            <div class="menu-item active" data-page="dashboard">
                <div class="menu-icon">📊</div>
                <div class="menu-text">Dashboard</div>
            </div>
            <div class="menu-item" data-page="inventory">
                <div class="menu-icon">🗂️</div>
                <div class="menu-text">Inventory Mapping</div>
            </div>
            <div class="menu-item" data-page="billing">
                <div class="menu-icon">🧾</div>
                <div class="menu-text">Billing</div>
            </div>
            <div class="menu-item" data-page="scanning">
                <div class="menu-icon">📷</div>
                <div class="menu-text">Barcode Scanning</div>
            </div>
            <div class="menu-item" data-page="generating">
                <div class="menu-icon">🔖</div>
                <div class="menu-text">Barcode Generating</div>
            </div>
            <div class="menu-item" data-page="staff">
                <div class="menu-icon">👥</div>
                <div class="menu-text">Staff Management</div>
            </div>
            <div class="menu-item" data-page="attendance">
                <div class="menu-icon">📅</div>
                <div class="menu-text">Staff Attendance</div>
            </div>
            <div class="menu-item" data-page="suppliers">
                <div class="menu-icon">🚚</div>
                <div class="menu-text">Suppliers</div>
            </div>
            <div class="menu-item" data-page="credits">
                <div class="menu-icon">💳</div>
                <div class="menu-text">Credits</div>
            </div>
            <div class="menu-item" data-page="contact">
                <div class="menu-icon">📞</div>
                <div class="menu-text">Contact Us</div>
            </div>
        </div>
    `;
    return sidebar;
}