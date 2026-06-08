// activity.js - Recent activity component
export function createActivity() {
    const activity = document.createElement('div');
    activity.className = 'recent-activity';
    
    activity.innerHTML = `
        <div class="chart-header">
            <div class="chart-title">Recent Activity</div>
            <div class="chart-actions">
                <button class="chart-action-btn">View All</button>
            </div>
        </div>
        
        <ul class="activity-list">
            <li class="activity-item">
                <div class="activity-icon" style="background-color: rgba(52, 152, 219, 0.2); color: #3498db;">📦</div>
                <div class="activity-content">
                    <div class="activity-title">New inventory items added</div>
                    <div class="activity-time">10 minutes ago</div>
                </div>
            </li>
            
            <li class="activity-item">
                <div class="activity-icon" style="background-color: rgba(46, 204, 113, 0.2); color: #2ecc71;">💰</div>
                <div class="activity-content">
                    <div class="activity-title">New sale recorded #INV-0045</div>
                    <div class="activity-time">45 minutes ago</div>
                </div>
            </li>
            
            <li class="activity-item">
                <div class="activity-icon" style="background-color: rgba(231, 76, 60, 0.2); color: #e74c3c;">⚠️</div>
                <div class="activity-content">
                    <div class="activity-title">Low stock alert for Product A</div>
                    <div class="activity-time">2 hours ago</div>
                </div>
            </li>
            
            <li class="activity-item">
                <div class="activity-icon" style="background-color: rgba(155, 89, 182, 0.2); color: #9b59b6;">👥</div>
                <div class="activity-content">
                    <div class="activity-title">Staff attendance recorded</div>
                    <div class="activity-time">5 hours ago</div>
                </div>
            </li>
        </ul>
    `;
    
    return activity;
}