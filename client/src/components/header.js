// header.js - Header component
export function createHeader() {
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
        <div class="search-container">
            <div class="search-icon">🔍</div>
            <input type="text" class="search-input" placeholder="Search...">
        </div>
        <div class="user-controls">
            <div class="notification-bell">
                <div class="menu-icon">🔔</div>
                <div class="notification-count">3</div>
            </div>
            <div class="user-profile">
                <div class="user-avatar">JD</div>
                <div class="user-name">John Doe</div>
                <div class="menu-icon">⌄</div>
            </div>
        </div>
    `;
    return header;
}