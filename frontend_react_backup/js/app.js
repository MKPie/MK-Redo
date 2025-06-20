// Main Application Logic
class MKProcessorApp {
    constructor() {
        this.state = {
            currentPage: 'dashboard',
            user: null,
            projects: [],
            tasks: [],
            integrations: {
                github: { connected: false },
                hubspot: { connected: false }
            },
            theme: 'dark',
            websocketConnected: false,
            stats: {
                overallProgress: 0,
                completedTasks: 0,
                totalTasks: 0,
                activeProjects: 0,
                pipelineValue: 0
            }
        };
        
        this.api = new API();
        this.websocket = new WebSocketManager();
        this.ui = new UIManager();
        
        this.init();
    }
    
    async init() {
        // Initialize application
        await this.loadInitialData();
        this.setupEventListeners();
        this.websocket.connect();
        this.ui.updateStats(this.state.stats);
        this.checkSavedIntegrations();
        
        // Show dashboard
        this.navigateTo('dashboard');
        
        // Log initial activity
        this.ui.addActivityLog('info', 'Dashboard initialized', 'System ready');
    }
    
    async loadInitialData() {
        try {
            // Load projects
            const projectsResponse = await this.api.getProjects();
            this.state.projects = projectsResponse.data || [];
            
            // Load tasks
            const tasksResponse = await this.api.getTasks();
            this.state.tasks = tasksResponse.data || [];
            
            // Calculate stats
            this.calculateStats();
            
            // Render roadmap
            this.renderRoadmap();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.ui.showToast('Error loading data', 'error');
        }
    }
    
    calculateStats() {
        const completedTasks = this.state.tasks.filter(t => t.status === 'completed').length;
        const totalTasks = this.state.tasks.length;
        const activeProjects = this.state.projects.filter(p => p.status === 'active').length;
        const pipelineValue = this.state.projects.reduce((sum, p) => sum + (p.value || 0), 0);
        
        this.state.stats = {
            overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            completedTasks,
            totalTasks,
            activeProjects,
            pipelineValue
        };
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) this.navigateTo(page);
            });
        });
        
        // Hamburger menu
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        hamburgerMenu.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
            document.getElementById('sidebar').classList.toggle('collapsed');
            document.getElementById('mainContent').classList.toggle('expanded');
        });
        
        // Integration forms
        document.getElementById('githubForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connectGitHub();
        });
        
        document.getElementById('hubspotForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connectHubSpot();
        });
        
        // Modal buttons
        document.getElementById('createProjectBtn').addEventListener('click', () => {
            this.ui.openModal('createProjectModal');
        });
        
        document.getElementById('newProjectBtn').addEventListener('click', () => {
            this.ui.openModal('createProjectModal');
        });
        
        document.getElementById('newTaskBtn').addEventListener('click', () => {
            this.loadProjectsForTaskModal();
            this.ui.openModal('createTaskModal');
        });
        
        // Form submissions
        document.getElementById('createProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });
        
        document.getElementById('createTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });
        
        // Tools
        document.getElementById('syncAllBtn').addEventListener('click', () => {
            this.syncAll();
        });
        
        document.getElementById('backupBtn').addEventListener('click', () => {
            this.backupDatabase();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportReport();
        });
        
        // Settings
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.getElementById('installFeatureBtn').addEventListener('click', () => {
            this.ui.openModal('installFeatureModal');
        });
        
        document.getElementById('installCodeBtn').addEventListener('click', () => {
            this.installFeature();
        });
        
        // Activity feed
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.ui.clearActivityLog();
        });
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modal || e.currentTarget.closest('.modal').id;
                if (modalId) this.ui.closeModal(modalId);
            });
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.ui.closeModal(modal.id);
                }
            });
        });
    }
    
    navigateTo(page) {
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
        
        // Update active page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `${page}Page`);
        });
        
        this.state.currentPage = page;
        
        // Load page-specific data
        switch (page) {
            case 'projects':
                this.loadProjects();
                break;
            case 'tasks':
                this.loadTasks();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }
    
    async connectGitHub() {
        const repoUrl = document.getElementById('repoUrl').value;
        const token = document.getElementById('githubToken').value;
        
        if (!repoUrl || !token) {
            this.ui.showToast('Please fill in all fields', 'error');
            return;
        }
        
        try {
            this.ui.showLoading(document.querySelector('#githubForm button'));
            
            const response = await this.api.connectGitHub({ repoUrl, token });
            
            if (response.success) {
                this.state.integrations.github = { connected: true, repoUrl };
                this.updateIntegrationStatus('github', true);
                this.ui.showToast('GitHub connected successfully', 'success');
                this.ui.addActivityLog('success', 'GitHub Integration', `Connected to ${repoUrl}`);
                
                // Save to localStorage
                localStorage.setItem('github_integration', JSON.stringify({ repoUrl, connected: true }));
            }
        } catch (error) {
            this.ui.showToast('Failed to connect GitHub', 'error');
        } finally {
            this.ui.hideLoading(document.querySelector('#githubForm button'));
        }
    }
    
    async connectHubSpot() {
        const apiKey = document.getElementById('hubspotApiKey').value;
        const portalId = document.getElementById('hubspotPortal').value;
        
        if (!apiKey || !portalId) {
            this.ui.showToast('Please fill in all fields', 'error');
            return;
        }
        
        try {
            this.ui.showLoading(document.querySelector('#hubspotForm button'));
            
            const response = await this.api.connectHubSpot({ apiKey, portalId });
            
            if (response.success) {
                this.state.integrations.hubspot = { connected: true, portalId };
                this.updateIntegrationStatus('hubspot', true);
                this.ui.showToast('HubSpot connected successfully', 'success');
                this.ui.addActivityLog('success', 'HubSpot Integration', `Connected to portal ${portalId}`);
                
                // Save to localStorage
                localStorage.setItem('hubspot_integration', JSON.stringify({ portalId, connected: true }));
            }
        } catch (error) {
            this.ui.showToast('Failed to connect HubSpot', 'error');
        } finally {
            this.ui.hideLoading(document.querySelector('#hubspotForm button'));
        }
    }
    
    updateIntegrationStatus(service, connected) {
        const statusEl = document.getElementById(`${service}Status`);
        const indicator = statusEl.querySelector('.status-indicator');
        
        indicator.classList.toggle('connected', connected);
        indicator.classList.toggle('disconnected', !connected);
        statusEl.innerHTML = `<span class="status-indicator ${connected ? 'connected' : 'disconnected'}"></span> ${connected ? 'Connected' : 'Disconnected'}`;
    }
    
    checkSavedIntegrations() {
        // Check GitHub
        const githubData = localStorage.getItem('github_integration');
        if (githubData) {
            const data = JSON.parse(githubData);
            if (data.connected) {
                this.state.integrations.github = data;
                this.updateIntegrationStatus('github', true);
                document.getElementById('repoUrl').value = data.repoUrl;
            }
        }
        
        // Check HubSpot
        const hubspotData = localStorage.getItem('hubspot_integration');
        if (hubspotData) {
            const data = JSON.parse(hubspotData);
            if (data.connected) {
                this.state.integrations.hubspot = data;
                this.updateIntegrationStatus('hubspot', true);
                document.getElementById('hubspotPortal').value = data.portalId;
            }
        }
    }
    
    async createProject() {
        const formData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            phase: parseInt(document.getElementById('projectPhase').value),
            priority: document.getElementById('projectPriority').value,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        try {
            const response = await this.api.createProject(formData);
            
            if (response.success) {
                this.state.projects.push(response.data);
                this.ui.showToast('Project created successfully', 'success');
                this.ui.closeModal('createProjectModal');
                this.ui.addActivityLog('success', 'Project Created', formData.name);
                
                // Reset form
                document.getElementById('createProjectForm').reset();
                
                // Recalculate stats
                this.calculateStats();
                this.ui.updateStats(this.state.stats);
                
                // Refresh projects page if active
                if (this.state.currentPage === 'projects') {
                    this.loadProjects();
                }
            }
        } catch (error) {
            this.ui.showToast('Failed to create project', 'error');
        }
    }
    
    async createTask() {
        const formData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            projectId: document.getElementById('taskProject').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: 'todo',
            createdAt: new Date().toISOString()
        };
        
        try {
            const response = await this.api.createTask(formData);
            
            if (response.success) {
                this.state.tasks.push(response.data);
                this.ui.showToast('Task created successfully', 'success');
                this.ui.closeModal('createTaskModal');
                this.ui.addActivityLog('success', 'Task Created', formData.title);
                
                // Reset form
                document.getElementById('createTaskForm').reset();
                
                // Recalculate stats
                this.calculateStats();
                this.ui.updateStats(this.state.stats);
                
                // Refresh tasks page if active
                if (this.state.currentPage === 'tasks') {
                    this.loadTasks();
                }
            }
        } catch (error) {
            this.ui.showToast('Failed to create task', 'error');
        }
    }
    
    loadProjectsForTaskModal() {
        const select = document.getElementById('taskProject');
        select.innerHTML = '<option value="">Select a project</option>';
        
        this.state.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    }
    
    async syncAll() {
        this.ui.addActivityLog('info', 'Sync Started', 'Syncing all integrations...');
        
        try {
            const response = await this.api.syncAll();
            
            if (response.success) {
                this.ui.showToast('Sync completed successfully', 'success');
                this.ui.addActivityLog('success', 'Sync Complete', 'All data synchronized');
                
                // Reload data
                await this.loadInitialData();
                this.ui.updateStats(this.state.stats);
            }
        } catch (error) {
            this.ui.showToast('Sync failed', 'error');
            this.ui.addActivityLog('error', 'Sync Failed', error.message);
        }
    }
    
    async backupDatabase() {
        this.ui.addActivityLog('info', 'Backup Started', 'Creating database backup...');
        
        try {
            const response = await this.api.backupDatabase();
            
            if (response.success) {
                this.ui.showToast('Backup created successfully', 'success');
                this.ui.addActivityLog('success', 'Backup Complete', 'Database backed up successfully');
            }
        } catch (error) {
            this.ui.showToast('Backup failed', 'error');
            this.ui.addActivityLog('error', 'Backup Failed', error.message);
        }
    }
    
    async exportReport() {
        try {
            const reportData = {
                exportDate: new Date().toISOString(),
                stats: this.state.stats,
                projects: this.state.projects,
                tasks: this.state.tasks,
                integrations: this.state.integrations
            };
            
            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mk-processor-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.ui.showToast('Report exported successfully', 'success');
            this.ui.addActivityLog('success', 'Report Exported', 'Full report downloaded');
        } catch (error) {
            this.ui.showToast('Export failed', 'error');
        }
    }
    
    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('light-theme');
        
        const themeBtn = document.getElementById('themeBtn');
        const icon = themeBtn.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
        
        localStorage.setItem('theme', this.state.theme);
    }
    
    async installFeature() {
        const code = document.getElementById('featureCode').value;
        
        if (!code.trim()) {
            this.ui.showToast('Please paste feature code', 'error');
            return;
        }
        
        try {
            // Evaluate and install feature
            eval(code);
            
            this.ui.showToast('Feature installed successfully', 'success');
            this.ui.closeModal('installFeatureModal');
            this.ui.addActivityLog('success', 'Feature Installed', 'New feature added to dashboard');
            
            // Clear the textarea
            document.getElementById('featureCode').value = '';
        } catch (error) {
            this.ui.showToast('Failed to install feature', 'error');
            console.error('Feature installation error:', error);
        }
    }
    
    renderRoadmap() {
        const roadmapGrid = document.getElementById('roadmapGrid');
        roadmapGrid.innerHTML = '';
        
        const phases = [
            {
                number: 1,
                title: 'Foundation',
                timeline: 'Months 1-4',
                projects: this.state.projects.filter(p => p.phase === 1)
            },
            {
                number: 2,
                title: 'Market Traction',
                timeline: 'Months 4-8',
                projects: this.state.projects.filter(p => p.phase === 2)
            },
            {
                number: 3,
                title: 'Dual Platform',
                timeline: 'Months 8-12',
                projects: this.state.projects.filter(p => p.phase === 3)
            },
            {
                number: 4,
                title: 'Market Dominance',
                timeline: 'Months 12-36',
                projects: this.state.projects.filter(p => p.phase === 4)
            }
        ];
        
        phases.forEach(phase => {
            const phaseCard = this.ui.createPhaseCard(phase);
            roadmapGrid.appendChild(phaseCard);
        });
    }
    
    async loadProjects() {
        const grid = document.getElementById('projectsGrid');
        grid.innerHTML = '';
        
        if (this.state.projects.length === 0) {
            grid.innerHTML = '<p class="text-center">No projects yet. Create your first project!</p>';
            return;
        }
        
        this.state.projects.forEach(project => {
            const projectCard = this.ui.createProjectCard(project);
            grid.appendChild(projectCard);
        });
    }
    
    async loadTasks() {
        const board = document.getElementById('tasksBoard');
        board.innerHTML = '';
        
        const columns = [
            { id: 'todo', title: 'To Do', tasks: [] },
            { id: 'in-progress', title: 'In Progress', tasks: [] },
            { id: 'completed', title: 'Completed', tasks: [] }
        ];
        
        // Group tasks by status
        this.state.tasks.forEach(task => {
            const column = columns.find(c => c.id === task.status);
            if (column) column.tasks.push(task);
        });
        
        // Render columns
        columns.forEach(column => {
            const columnEl = this.ui.createTaskColumn(column);
            board.appendChild(columnEl);
        });
    }
    
    async loadAnalytics() {
        // Placeholder for analytics implementation
        const analyticsPage = document.getElementById('analyticsPage');
        const grid = analyticsPage.querySelector('.analytics-grid');
        
        if (!grid) {
            const newGrid = document.createElement('div');
            newGrid.className = 'analytics-grid';
            newGrid.innerHTML = `
                <div class="analytics-card glass-morphism">
                    <h3>Task Completion Rate</h3>
                    <div class="chart-placeholder">Chart coming soon...</div>
                </div>
                <div class="analytics-card glass-morphism">
                    <h3>Project Progress</h3>
                    <div class="chart-placeholder">Chart coming soon...</div>
                </div>
                <div class="analytics-card glass-morphism">
                    <h3>Activity Timeline</h3>
                    <div class="chart-placeholder">Chart coming soon...</div>
                </div>
                <div class="analytics-card glass-morphism">
                    <h3>Resource Utilization</h3>
                    <div class="chart-placeholder">Chart coming soon...</div>
                </div>
            `;
            analyticsPage.appendChild(newGrid);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MKProcessorApp();
});