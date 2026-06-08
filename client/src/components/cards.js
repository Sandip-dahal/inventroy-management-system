// cards.js - Dashboard cards component
import { formatCurrency, formatNumber } from '../utils/helpers.js';

export function createCards() {
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    
    cardsContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Total Products</div>
                <div class="card-icon" style="background-color: #3498db;">📦</div>
            </div>
            <div class="card-value">${formatNumber(2548)}</div>
            <div class="card-info">
                <span class="trend-up">↑</span> 12% from last month
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="card-title">Total Sales</div>
                <div class="card-icon" style="background-color: #2ecc71;">💰</div>
            </div>
            <div class="card-value">${formatCurrency(24895)}</div>
            <div class="card-info">
                <span class="trend-up">↑</span> 8% from last month
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="card-title">Active Staff</div>
                <div class="card-icon" style="background-color: #e74c3c;">👥</div>
            </div>
            <div class="card-value">${formatNumber(24)}</div>
            <div class="card-info">
                <span class="trend-down">↓</span> 2 from last month
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="card-title">Low Stock Items</div>
                <div class="card-icon" style="background-color: #f39c12;">⚠️</div>
            </div>
            <div class="card-value">${formatNumber(17)}</div>
            <div class="card-info">
                Needs immediate attention
            </div>
        </div>
    `;
    
    return cardsContainer;
}