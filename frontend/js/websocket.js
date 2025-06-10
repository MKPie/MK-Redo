// websocket.js - Real-time WebSocket connection handler

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.connectionUrl = 'ws://localhost:8080/ws'; // Update with your WebSocket server URL
        
        this.init();
    }

    init() {
        this.connect();
        this.setupEventHandlers();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.connectionUrl);
            
            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onerror = (error) => this.handleError(error);
            this.ws.onclose = () => this.handleClose();
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    handleOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Update UI connection status
        this.updateConnectionStatus(true);
        
        // Send authentication if needed
        this.authenticate();
        
        // Request initial data
        this.requestInitialData();
        
        // Notify UI
        window.UI?.showToast('Connected to real-time server', 'success');
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle different message types
            switch (data.type) {
                case 'activity':
                    this.handleActivityUpdate(data.payload);
                    break;
                    
                case 'task_update':
                    this.handleTaskUpdate(data.payload);
                    break;
                    
                case 'project_update':
                    this.handleProjectUpdate(data.payload);
                    break;
                    
                case 'stats_update':
                    this.handleStatsUpdate(data.payload);
                    break;
                    
                case 'notification':
                    this.handleNotification(data.payload);
                    break;
                    
                case 'error':
                    this.handleServerError(data.payload);
                    break;
                    
                default:
                    // Check for custom handlers
                    if (this.messageHandlers.has(data.type)) {
                        this.messageHandlers.get(data.type)(data.payload);
                    }
            }
            
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    handleError(error) {
        console.error('WebSocket error:', error);
        window.UI?.showToast('Connection error occurred', 'error');
    }

    handleClose() {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        } else {
            window.UI?.showToast('Unable to connect to server', 'error');
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, this.reconnectInterval);
    }

    authenticate() {
        // Send authentication token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            this.send({
                type: 'auth',
                token: token
            });
        }
    }

    requestInitialData() {
        // Request initial data updates
        this.send({ type: 'request_stats' });
        this.send({ type: 'request_recent_activities' });
        this.send({ type: 'request_active_projects' });
        this.send({ type: 'request_active_tasks' });
    }

    // Message Handlers
    handleActivityUpdate(activity) {
        const activityFeed = document.getElementById('activityFeed');
        if (!activityFeed) return;

        const activityItem = this.createActivityItem(activity);
        
        // Add to top of feed with animation
        activityFeed.insertBefore(activityItem, activityFeed.firstChild);
        
        // Limit feed items to 50
        while (activityFeed.children.length > 50) {
            activityFeed.removeChild(activityFeed.lastChild);
        }
        
        // Animate new item
        requestAnimationFrame(() => {
            activityItem.classList.add('animate-in');
        });
    }

    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const icon = this.getActivityIcon(activity.type);
        const time = new Date(activity.timestamp).toLocaleTimeString();
        
        item.innerHTML = `
            <div class="activity-icon ${activity.type}">
                <i class="${icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-message">${activity.message}</p>
                <span class="activity-time">${time}</span>
            </div>
        `;
        
        return item;
    }

    getActivityIcon(type) {
        const icons = {
            'task_created': 'fas fa-plus-circle',
            'task_completed': 'fas fa-check-circle',
            'task_updated': 'fas fa-edit',
            'project_created': 'fas fa-project-diagram',
            'project_updated': 'fas fa-sync',
            'user_joined': 'fas fa-user-plus',
            'comment_added': 'fas fa-comment',
            'file_uploaded': 'fas fa-file-upload',
            'integration_connected': 'fas fa-plug',
            'backup_completed': 'fas fa-database'
        };
        
        return icons[type] || 'fas fa-info-circle';
    }

    handleTaskUpdate(task) {
        // Update task in UI
        window.UI?.updateTask(task);
        
        // Update stats if needed
        if (task.status_changed) {
            this.send({ type: 'request_stats' });
        }
    }

    handleProjectUpdate(project) {
        // Update project in UI
        window.UI?.updateProject(project);
        
        // Show notification
        window.UI?.showToast(`Project "${project.name}" updated`, 'info');
    }

    handleStatsUpdate(stats) {
        // Update dashboard statistics
        if (stats.totalProjects !== undefined) {
            document.getElementById('totalProjects').textContent = stats.totalProjects;
        }
        if (stats.activeTasks !== undefined) {
            document.getElementById('activeTasks').textContent = stats.activeTasks;
        }
        if (stats.completedTasks !== undefined) {
            document.getElementById('completedTasks').textContent = stats.completedTasks;
        }
        if (stats.totalHours !== undefined) {
            document.getElementById('totalHours').textContent = stats.totalHours;
        }
        
        // Animate stat changes
        document.querySelectorAll('.stat-value').forEach(el => {
            el.classList.add('pulse');
            setTimeout(() => el.classList.remove('pulse'), 600);
        });
    }

    handleNotification(notification) {
        // Show notification toast
        window.UI?.showToast(notification.message, notification.type || 'info');
        
        // Update notification badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const count = parseInt(badge.textContent) + 1;
            badge.textContent = count;
            badge.classList.add('pulse');
        }
    }

    handleServerError(error) {
        console.error('Server error:', error);
        window.UI?.showToast(error.message || 'Server error occurred', 'error');
    }

    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.live-indicator');
        if (indicator) {
            if (connected) {
                indicator.classList.add('connected');
                indicator.innerHTML = '<span class="live-dot"></span> Live';
            } else {
                indicator.classList.remove('connected');
                indicator.innerHTML = '<span class="live-dot offline"></span> Offline';
            }
        }
    }

    // Public Methods
    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket is not connected. Queuing message:', data);
            // Could implement a message queue here
        }
    }

    subscribe(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    unsubscribe(messageType) {
        this.messageHandlers.delete(messageType);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Setup event handlers for UI elements
    setupEventHandlers() {
        // Listen for custom events from the UI
        window.addEventListener('task:create', (e) => {
            this.send({
                type: 'create_task',
                payload: e.detail
            });
        });

        window.addEventListener('task:update', (e) => {
            this.send({
                type: 'update_task',
                payload: e.detail
            });
        });

        window.addEventListener('project:create', (e) => {
            this.send({
                type: 'create_project',
                payload: e.detail
            });
        });

        window.addEventListener('project:update', (e) => {
            this.send({
                type: 'update_project',
                payload: e.detail
            });
        });
    }
}

// Initialize WebSocket manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.wsManager = new WebSocketManager();
});