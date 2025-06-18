// frontend/backend-integration.js
/**
 * MK Processor 4.2.1 - Backend Integration Module
 * Connects frontend dashboard to FastAPI backend with real-time WebSocket support
 */

class MKProcessorBackendIntegration {
    constructor() {
        this.backendUrl = 'http://localhost:3002';
        this.websocketUrl = 'ws://localhost:3002';
        this.clientId = this.generateClientId();
        this.websocket = null;
        this.reconnectInterval = null;
        this.isConnected = false;
        this.backendConnected = false;
        this.jobsCache = new Map();
        this.progressCallbacks = new Map();
        
        // Initialize connection
        this.initializeBackendConnection();
    }

    // ==================== INITIALIZATION ====================
    
    generateClientId() {
        return 'dashboard_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    async initializeBackendConnection() {
        console.log('🚀 Initializing MK Processor Backend Connection...');
        
        // Test backend connectivity
        await this.testBackendConnection();
        
        // Initialize WebSocket
        this.connectWebSocket();
        
        // Start periodic health checks
        this.startHealthChecks();
        
        // Update initial status
        this.updateConnectionUI();
    }

    // ==================== BACKEND API CALLS ====================

    async testBackendConnection() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                this.backendConnected = true;
                console.log('✅ Backend connected:', data);
                return data;
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            this.backendConnected = false;
        }
        return null;
    }

    async getSystemStatus() {
        try {
            const response = await fetch(`${this.backendUrl}/api/v1/status`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting system status:', error);
        }
        return null;
    }

    async createJob(jobData) {
        try {
            const response = await fetch(`${this.backendUrl}/api/v1/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jobData)
            });
            
            if (response.ok) {
                const job = await response.json();
                console.log('✅ Job created:', job);
                return job;
            }
        } catch (error) {
            console.error('Error creating job:', error);
        }
        return null;
    }

    async getJobs() {
        try {
            const response = await fetch(`${this.backendUrl}/api/v1/jobs`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting jobs:', error);
        }
        return null;
    }

    async getJobDetails(jobId) {
        try {
            const response = await fetch(`${this.backendUrl}/api/v1/jobs/${jobId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting job details:', error);
        }
        return null;
    }

    async triggerTestProgress() {
        try {
            const response = await fetch(`${this.backendUrl}/api/v1/test/progress`);
            if (response.ok) {
                const result = await response.json();
                console.log('🧪 Test progress triggered:', result);
                return result;
            }
        } catch (error) {
            console.error('Error triggering test progress:', error);
        }
        return null;
    }

    // ==================== WEBSOCKET CONNECTION ====================

    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }

        console.log(`🔌 Connecting to WebSocket: ${this.websocketUrl}/ws/${this.clientId}`);
        
        try {
            this.websocket = new WebSocket(`${this.websocketUrl}/ws/${this.clientId}`);
            
            this.websocket.onopen = (event) => {
                console.log('✅ WebSocket connected!');
                this.isConnected = true;
                this.updateConnectionUI();
                this.clearReconnectInterval();
                
                // Send initial ping
                this.sendWebSocketMessage({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
                
                // Subscribe to updates
                this.sendWebSocketMessage({
                    type: 'subscribe_updates',
                    client_id: this.clientId
                });
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.websocket.onclose = (event) => {
                console.log('❌ WebSocket disconnected:', event.code);
                this.isConnected = false;
                this.updateConnectionUI();
                this.scheduleReconnect();
            };

            this.websocket.onerror = (error) => {
                console.error('🚨 WebSocket error:', error);
                this.isConnected = false;
                this.updateConnectionUI();
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    handleWebSocketMessage(data) {
        console.log('📨 WebSocket message received:', data);

        switch (data.type) {
            case 'connection_established':
                console.log('🎉 Connection established:', data.message);
                break;
                
            case 'pong':
                console.log('🏓 Pong received');
                break;
                
            case 'progress_update':
                this.handleProgressUpdate(data);
                break;
                
            case 'job_completed':
                this.handleJobCompleted(data);
                break;
                
            case 'subscription_confirmed':
                console.log('✅ Subscribed to real-time updates');
                break;
                
            default:
                console.log('📧 Unknown message type:', data.type);
        }
    }

    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send message');
        }
    }

    scheduleReconnect() {
        if (this.reconnectInterval) return;
        
        console.log('🔄 Scheduling WebSocket reconnect...');
        this.reconnectInterval = setInterval(() => {
            if (!this.isConnected) {
                console.log('🔄 Attempting WebSocket reconnect...');
                this.connectWebSocket();
            }
        }, 5000); // Reconnect every 5 seconds
    }

    clearReconnectInterval() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    // ==================== PROGRESS HANDLING ====================

    handleProgressUpdate(data) {
        const { task_id, progress, total, percentage, status, timestamp } = data;
        
        console.log(`📊 Progress Update: ${task_id} - ${progress}/${total} (${percentage}%)`);
        
        // Update UI elements
        this.updateProgressUI(task_id, progress, total, percentage, status);
        
        // Cache the progress
        this.jobsCache.set(task_id, data);
        
        // Call registered callbacks
        if (this.progressCallbacks.has(task_id)) {
            this.progressCallbacks.get(task_id)(data);
        }
        
        // Update global progress indicators
        this.updateGlobalProgress(percentage);
    }

    handleJobCompleted(data) {
        const { job_id, message, timestamp } = data;
        
        console.log(`🎉 Job Completed: ${job_id}`);
        
        // Update UI
        this.updateJobCompletedUI(job_id, message);
        
        // Show notification
        if (typeof showNotification === 'function') {
            showNotification(`Job completed: ${job_id}`, 'success');
        }
        
        // Add to chat if available
        if (typeof addChatMessage === 'function') {
            addChatMessage(`🎉 Job ${job_id} completed successfully!`, 'system');
        }
    }

    registerProgressCallback(taskId, callback) {
        this.progressCallbacks.set(taskId, callback);
    }

    unregisterProgressCallback(taskId) {
        this.progressCallbacks.delete(taskId);
    }

    // ==================== UI UPDATES ====================

    updateConnectionUI() {
        // Update backend connection status
        const backendStatus = this.backendConnected ? 'Connected' : 'Disconnected';
        const backendClass = this.backendConnected ? 'status-connected' : 'status-disconnected';
        
        // Update real-time connection status  
        const realtimeStatus = this.isConnected ? 'Connected' : 'Disconnected';
        const realtimeClass = this.isConnected ? 'status-connected' : 'status-disconnected';
        
        // Try to update existing elements in your dashboard
        this.updateElementIfExists('backendStatusText', `Backend: ${backendStatus}`);
        this.updateElementIfExists('backendStatusDot', '', backendClass);
        
        this.updateElementIfExists('realtimeStatusText', `Real-time: ${realtimeStatus}`);
        this.updateElementIfExists('realtimeStatusDot', '', realtimeClass);
        
        // Update live status text
        this.updateElementIfExists('liveStatusText', 
            this.isConnected ? 'Smart AI Dashboard Active - Real-time Connected' : 'Smart AI Dashboard Active - Connecting...'
        );
        
        console.log(`🔗 Connection Status - Backend: ${backendStatus}, Real-time: ${realtimeStatus}`);
    }

    updateElementIfExists(id, text = null, className = null) {
        const element = document.getElementById(id);
        if (element) {
            if (text !== null) element.textContent = text;
            if (className !== null) {
                element.className = className;
            }
        }
    }

    updateProgressUI(taskId, progress, total, percentage, status) {
        // Update progress bars
        const progressBar = document.getElementById(`progress-${taskId}`);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        // Update progress text
        const progressText = document.getElementById(`progressText-${taskId}`);
        if (progressText) {
            progressText.textContent = `${progress}/${total} (${percentage}%)`;
        }
        
        // Update status
        const statusElement = document.getElementById(`status-${taskId}`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-${status}`;
        }
    }

    updateJobCompletedUI(jobId, message) {
        // Update job status to completed
        const statusElement = document.getElementById(`status-${jobId}`);
        if (statusElement) {
            statusElement.textContent = 'completed';
            statusElement.className = 'status-completed';
        }
        
        // Update progress to 100%
        this.updateProgressUI(jobId, 100, 100, 100, 'completed');
    }

    updateGlobalProgress(percentage) {
        // Update any global progress indicators
        const globalProgress = document.getElementById('globalProgress');
        if (globalProgress) {
            globalProgress.style.width = `${percentage}%`;
        }
    }

    // ==================== HEALTH CHECKS ====================

    startHealthChecks() {
        // Check backend health every 30 seconds
        setInterval(async () => {
            const health = await this.testBackendConnection();
            if (health) {
                this.updateConnectionUI();
            }
        }, 30000);
        
        // Send WebSocket ping every 30 seconds
        setInterval(() => {
            if (this.isConnected) {
                this.sendWebSocketMessage({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000);
    }

    // ==================== PUBLIC API ====================

    // Methods that can be called from your existing dashboard code

    async createScrapingJob(jobName, targetUrl, config = {}) {
        const jobData = {
            job_name: jobName,
            target_url: targetUrl,
            config: config
        };
        
        const result = await this.createJob(jobData);
        if (result) {
            // Register for progress updates
            this.registerProgressCallback(result.job_id, (progress) => {
                console.log(`Job ${result.job_id} progress:`, progress);
            });
        }
        
        return result;
    }

    async getDashboardData() {
        const [systemStatus, jobs] = await Promise.all([
            this.getSystemStatus(),
            this.getJobs()
        ]);
        
        return {
            system: systemStatus,
            jobs: jobs,
            connections: {
                backend: this.backendConnected,
                realtime: this.isConnected
            }
        };
    }

    async runTestJob() {
        const result = await this.triggerTestProgress();
        if (result) {
            console.log('🧪 Test job started:', result.task_id);
            
            // Register callback for test job
            this.registerProgressCallback(result.task_id, (progress) => {
                console.log(`Test job progress: ${progress.percentage}%`);
                
                // Update your existing analytics or show in chat
                if (typeof addChatMessage === 'function') {
                    addChatMessage(`📊 Test job progress: ${progress.percentage}%`, 'system');
                }
            });
        }
        
        return result;
    }

    // ==================== UTILITY METHODS ====================

    getConnectionStatus() {
        return {
            backend: this.backendConnected,
            realtime: this.isConnected,
            clientId: this.clientId
        };
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.clearReconnectInterval();
        console.log('🔌 Backend integration disconnected');
    }
}

// ==================== GLOBAL INTEGRATION ====================

// Initialize the backend integration
let mkBackend = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMKBackend);
} else {
    initializeMKBackend();
}

function initializeMKBackend() {
    console.log('🚀 Initializing MK Processor Backend Integration...');
    mkBackend = new MKProcessorBackendIntegration();
    
    // Make it globally available
    window.mkBackend = mkBackend;
    
    // Add integration info to existing chat if available
    setTimeout(() => {
        if (typeof addChatMessage === 'function') {
            addChatMessage('🔗 Backend integration initialized! Real-time progress tracking active.', 'system');
        }
    }, 2000);
}

// ==================== INTEGRATION WITH EXISTING DASHBOARD ====================

// Enhance existing functions with backend integration
if (typeof updateConnectionStatus === 'function') {
    const originalUpdateConnectionStatus = updateConnectionStatus;
    window.updateConnectionStatus = function() {
        // Call original function
        originalUpdateConnectionStatus();
        
        // Add backend status
        if (mkBackend) {
            const status = mkBackend.getConnectionStatus();
            console.log('🔗 Enhanced connection status:', status);
        }
    };
}

// Add backend functions to existing analytics
if (typeof generateAnalyticsReport === 'function') {
    const originalGenerateAnalyticsReport = generateAnalyticsReport;
    window.generateAnalyticsReport = async function() {
        // Call original function
        originalGenerateAnalyticsReport();
        
        // Add backend analytics
        if (mkBackend) {
            const dashboardData = await mkBackend.getDashboardData();
            console.log('📊 Backend analytics data:', dashboardData);
            
            if (typeof addChatMessage === 'function') {
                const backendStatus = dashboardData.connections.backend ? '✅ Connected' : '❌ Disconnected';
                const realtimeStatus = dashboardData.connections.realtime ? '✅ Connected' : '❌ Disconnected';
                
                addChatMessage(`**Backend Integration Status:**
• Backend API: ${backendStatus}
• Real-time WebSocket: ${realtimeStatus}
• Active Jobs: ${dashboardData.jobs?.total || 0}
• System Health: ${dashboardData.system?.status || 'Unknown'}`, 'system');
            }
        }
    };
}

// ==================== DEVELOPER TESTING FUNCTIONS ====================

// Functions you can call from browser console for testing
window.mkBackendTest = {
    testConnection: () => mkBackend?.testBackendConnection(),
    createTestJob: () => mkBackend?.runTestJob(),
    getStatus: () => mkBackend?.getConnectionStatus(),
    getDashboard: () => mkBackend?.getDashboardData(),
    sendPing: () => mkBackend?.sendWebSocketMessage({type: 'ping', timestamp: new Date().toISOString()})
};

console.log('✅ MK Processor Backend Integration Module Loaded');
console.log('🧪 Test functions available at: window.mkBackendTest');