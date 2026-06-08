// initializer.js - Initialize dashboard functionality
import { debounce } from './helpers.js';

export function initializeDashboard() {
    // Menu item click handling
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update page title based on selection
            const pageTitle = document.querySelector('.page-title');
            const menuText = this.querySelector('.menu-text').textContent;
            pageTitle.textContent = `${menuText} Overview`;
            
            // Here you would typically load different content based on the page
            console.log(`Switching to page: ${this.dataset.page}`);
        });
    });
    
    // Search functionality with debounce
    const searchInput = document.querySelector('.search-input');
    const performSearch = debounce(function(query) {
        console.log(`Searching for: ${query}`);
        // Actual search implementation would go here
    }, 300);
    
    searchInput.addEventListener('input', function(e) {
        performSearch(e.target.value);
    });
    
    searchInput.addEventListener('focus', function() {
        this.parentElement.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.2)';
        this.parentElement.style.borderRadius = '20px';
    });
    
    searchInput.addEventListener('blur', function() {
        this.parentElement.style.boxShadow = 'none';
    });
    
    // Notification bell click
    const notificationBell = document.querySelector('.notification-bell');
    notificationBell.addEventListener('click', function() {
        alert('Notifications panel would open here');
    });
    
    // User profile click
    const userProfile = document.querySelector('.user-profile');
    userProfile.addEventListener('click', function() {
        alert('User profile menu would open here');
    });
    
    // Card hover effects
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
        });
    });
}