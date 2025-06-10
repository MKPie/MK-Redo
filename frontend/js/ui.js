// ui.js - User Interface Handler

class UIManager {
    constructor() {
        this.modals = new Map();
        this.toasts = [];
        this.projects = new Map();
        this.tasks = new Map();
        this.currentView = 'dashboard';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeModals();
        this.loadInitialData();
        this.setupSidebar();
        this.setupAnimations();
    }

    setupEventListeners() {
        // Hamburger menu
        document.getElementById('hamburgerMenu')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Close sidebar
        document.getElementById('closeSidebar')?.addEventListener('click', () => {
            this.closeSidebar();
        });

        // Notification button
        document.getElementById('notificationBtn')?.addEventListener('click', () => {
            this.showNotificationPanel();
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Create buttons
        document.getElementById('createProjectBtn')?.addEventListener('click', () => {
            this.openModal('createProjectModal');
        });

        document.getElementById('createTaskBtn')?.addEventListener('click', () => {
            this.openModal('createTaskModal');
        });

        // Install feature button
        document.getElementById('installFeatureBtn')?.addEventListener('click', () => {
            this.openModal('installFeatureModal');
        });

        // Backup button
        document.getElementById('backupBtn')?.addEventListener('click', () => {
            this.triggerBackup();
        });

        // Form submissions
        document.getElementById('createProjectForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateProject();
        });

        document.getElementById('createTaskForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateTask();
        });

        document.getElementById('installFeatureForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInstallFeature();
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal, .btn-secondary[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modal || e.currentTarget.closest('.modal').id;
                this.closeModal(modalId);
            });
        });

        // Sidebar navigation
        document.querySelectorAll('.sidebar-menu .menu-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    this.navigateTo(link.getAttribute('href').substring(1));
                }
            });
        });

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for quick search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openQuickSearch();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupSidebar() {
        // Auto-hide sidebar on mobile
        if (window.innerWidth < 768) {
            this.closeSidebar();
        }

        // Handle resize
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                this.closeSidebar();
            }
        });
    }

    setupAnimations() {
        // Intersection Observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe elements
        document.querySelectorAll('.stat-card, .phase-card, .glass-morphism').forEach(el => {
            observer.observe(el);
        });
    }

    // Sidebar Methods
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
        document.body.classList.toggle('sidebar-open');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }

    // Modal Methods
    initializeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.modals.set(modal.id, modal);
        });
    }

    openModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input, textarea, select');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }

    closeAllModals() {
        this.modals.forEach((modal) => {
            modal.classList.remove('open');
        });
        document.body.style.overflow = '';
    }

    // Toast Notifications
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        this.toasts.push(toast);
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    // Project Methods
    async handleCreateProject() {
        const formData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            status: document.getElementById('projectStatus').value,
            deadline: document.getElementById('projectDeadline').value
        };
        
        try {
            // Show loading state
            this.setFormLoading('createProjectForm', true);
            
            // Send to API
            const response = await window.API.createProject(formData);
            
            if (response.success) {
                this.showToast('Project created successfully!', 'success');
                this.closeModal('createProjectModal');
                
                // Add to UI
                this.addProjectToUI(response.data);
                
                // Emit event for WebSocket
                window.dispatchEvent(new CustomEvent('project:create', {
                    detail: response.data
                }));
            } else {
                throw new Error(response.message || 'Failed to create project');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setFormLoading('createProjectForm', false);
        }
    }

    addProjectToUI(project) {
        const projectsList = document.getElementById('projectsList');
        const projectCard = this.createProjectCard(project);
        projectsList.insertBefore(projectCard, projectsList.firstChild);
        
        // Store in memory
        this.projects.set(project.id, project);
        
        // Update stats
        this.updateProjectStats();
        
        // Animate
        requestAnimationFrame(() => {
            projectCard.classList.add('animate-in');
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = project.id;
        
        const progress = project.progress || 0;
        const statusClass = {
            'active': 'status-active',
            'planning': 'status-planning',
            'on-hold': 'status-hold',
            'completed': 'status-completed'
        }[project.status] || 'status-planning';
        
        card.innerHTML = `
            <div class="project-header">
                <h3>${project.name}</h3>
                <span class="project-status ${statusClass}">${project.status}</span>
            </div>
            <p class="project-description">${project.description || 'No description'}</p>
            <div class="project-progress">
                <div class="progress-ring">
                    <svg viewBox="0 0 36 36">
                        <path class="progress-ring-bg" d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="progress-ring-fill" stroke-dasharray="${progress}, 100" d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20.35" class="progress-text">${progress}%</text>
                    </svg>
                </div>
                <div class="project-meta">
                    <span><i class="fas fa-tasks"></i> ${project.task_count || 0} tasks</span>
                    <span><i class="fas fa-calendar"></i> ${this.formatDate(project.deadline)}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn-icon" onclick="UI.viewProject('${project.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="UI.editProject('${project.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="UI.deleteProject('${project.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    updateProject(project) {
        const card = document.querySelector(`[data-project-id="${project.id}"]`);
        if (card) {
            // Update existing card
            const newCard = this.createProjectCard(project);
            card.replaceWith(newCard);
            
            // Animate update
            newCard.classList.add('updated');
            setTimeout(() => newCard.classList.remove('updated'), 1000);
        } else {
            // Add new project
            this.addProjectToUI(project);
        }
        
        // Update in memory
        this.projects.set(project.id, project);
    }

    // Task Methods
    async handleCreateTask() {
        const formData = {
            title: document.getElementById('taskTitle').value,
            project_id: document.getElementById('taskProject').value,
            priority: document.getElementById('taskPriority').value,
            assignee: document.getElementById('taskAssignee').value,
            due_date: document.getElementById('taskDueDate').value
        };
        
        try {
            this.setFormLoading('createTaskForm', true);
            
            const response = await window.API.createTask(formData);
            
            if (response.success) {
                this.showToast('Task created successfully!', 'success');
                this.closeModal('createTaskModal');
                
                // Add to UI
                this.addTaskToUI(response.data);
                
                // Emit event
                window.dispatchEvent(new CustomEvent('task:create', {
                    detail: response.data
                }));
            } else {
                throw new Error(response.message || 'Failed to create task');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setFormLoading('createTaskForm', false);
        }
    }

    addTaskToUI(task) {
        const tasksList = document.getElementById('tasksList');
        const taskItem = this.createTaskItem(task);
        tasksList.insertBefore(taskItem, tasksList.firstChild);
        
        // Store in memory
        this.tasks.set(task.id, task);
        
        // Update stats
        this.updateTaskStats();
        
        // Animate
        requestAnimationFrame(() => {
            taskItem.classList.add('animate-in');
        });
    }

    createTaskItem(task) {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.dataset.taskId = task.id;
        
        const priorityClass = {
            'high': 'priority-high',
            'medium': 'priority-medium',
            'low': 'priority-low'
        }[task.priority] || 'priority-medium';
        
        const statusIcon = task.status === 'completed' ? 'fa-check-circle' : 'fa-circle';
        
        item.innerHTML = `
            <div class="task-check">
                <button class="task-status-btn" onclick="UI.toggleTaskStatus('${task.id}')">
                    <i class="fas ${statusIcon}"></i>
                </button>
            </div>
            <div class="task-content">
                <h4 class="task-title">${task.title}</h4>
                <div class="task-meta">
                    <span class="task-priority ${priorityClass}">${task.priority}</span>
                    <span class="task-assignee">
                        <i class="fas fa-user"></i> ${task.assignee || 'Unassigned'}
                    </span>
                    <span class="task-due">
                        <i class="fas fa-clock"></i> ${this.formatDateTime(task.due_date)}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="UI.editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="UI.deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return item;
    }

    updateTask(task) {
        const item = document.querySelector(`[data-task-id="${task.id}"]`);
        if (item) {
            const newItem = this.createTaskItem(task);
            item.replaceWith(newItem);
            
            // Animate update
            newItem.classList.add('updated');
            setTimeout(() => newItem.classList.remove('updated'), 1000);
        } else {
            this.addTaskToUI(task);
        }
        
        // Update in memory
        this.tasks.set(task.id, task);
    }

    async toggleTaskStatus(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;
        
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        try {
            const response = await window.API.updateTask(taskId, { status: newStatus });
            
            if (response.success) {
                this.updateTask(response.data);
                this.showToast(`Task ${newStatus}!`, 'success');
                
                // Emit event
                window.dispatchEvent(new CustomEvent('task:update', {
                    detail: { ...task, status: newStatus, status_changed: true }
                }));
            }
        } catch (error) {
            this.showToast('Failed to update task', 'error');
        }
    }

    // Install Feature Handler
    async handleInstallFeature() {
        const featureName = document.getElementById('featureName').value;
        const featureCode = document.getElementById('featureCode').value;
        const featureType = document.getElementById('featureType').value;
        
        if (!featureCode.trim()) {
            this.showToast('Please paste the feature code', 'warning');
            return;
        }
        
        try {
            this.setFormLoading('installFeatureForm', true);
            
            // Parse and validate the code
            const validation = this.validateFeatureCode(featureCode, featureType);
            
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            // Install the feature
            const result = await this.installFeature({
                name: featureName,
                code: featureCode,
                type: featureType
            });
            
            if (result.success) {
                this.showToast(`Feature "${featureName}" installed successfully!`, 'success');
                this.closeModal('installFeatureModal');
                
                // Reload or update UI based on feature type
                if (featureType === 'component' || featureType === 'widget') {
                    setTimeout(() => {
                        this.refreshDashboard();
                    }, 1000);
                }
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setFormLoading('installFeatureForm', false);
        }
    }

    validateFeatureCode(code, type) {
        // Basic validation
        if (code.length < 10) {
            return { valid: false, message: 'Code is too short' };
        }
        
        // Type-specific validation
        switch (type) {
            case 'component':
                if (!code.includes('class') && !code.includes('function')) {
                    return { valid: false, message: 'Component code must contain a class or function' };
                }
                break;
                
            case 'integration':
                if (!code.includes('API') && !code.includes('fetch') && !code.includes('axios')) {
                    return { valid: false, message: 'Integration code must contain API calls' };
                }
                break;
        }
        
        // Check for malicious patterns
        const dangerousPatterns = ['eval(', 'Function(', 'innerHTML =', 'document.write'];
        for (const pattern of dangerousPatterns) {
            if (code.includes(pattern)) {
                return { valid: false, message: 'Code contains potentially dangerous patterns' };
            }
        }
        
        return { valid: true };
    }

    async installFeature(feature) {
        // This would normally save to backend
        // For now, we'll store in localStorage and execute
        
        try {
            // Store feature
            const features = JSON.parse(localStorage.getItem('installedFeatures') || '[]');
            features.push({
                ...feature,
                installedAt: new Date().toISOString(),
                id: Date.now().toString()
            });
            localStorage.setItem('installedFeatures', JSON.stringify(features));
            
            // Execute based on type
            if (feature.type === 'utility') {
                // Create a script element and append
                const script = document.createElement('script');
                script.textContent = feature.code;
                script.dataset.featureId = feature.id;
                document.body.appendChild(script);
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Navigation
    navigateTo(view) {
        this.currentView = view;
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`.menu-item a[href="#${view}"]`)?.parentElement;
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Handle view change (you can expand this)
        this.showToast(`Navigated to ${view}`, 'info');
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            this.closeSidebar();
        }
    }

    // Data Loading
    async loadInitialData() {
        try {
            // Load projects
            const projectsResponse = await window.API.getProjects();
            if (projectsResponse.success) {
                projectsResponse.data.forEach(project => {
                    this.addProjectToUI(project);
                });
            }
            
            // Load tasks
            const tasksResponse = await window.API.getTasks();
            if (tasksResponse.success) {
                tasksResponse.data.forEach(task => {
                    this.addTaskToUI(task);
                });
            }
            
            // Populate project dropdown
            this.updateProjectDropdown();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    updateProjectDropdown() {
        const dropdown = document.getElementById('taskProject');
        if (!dropdown) return;
        
        // Clear existing options
        dropdown.innerHTML = '<option value="">Select Project</option>';
        
        // Add project options
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            dropdown.appendChild(option);
        });
    }

    // Utility Methods
    formatDate(dateString) {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    setFormLoading(formId, loading) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea, select');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
            inputs.forEach(input => input.disabled = false);
        }
    }

    updateProjectStats() {
        const totalProjects = this.projects.size;
        document.getElementById('totalProjects').textContent = totalProjects;
    }

    updateTaskStats() {
        const activeTasks = Array.from(this.tasks.values()).filter(t => t.status !== 'completed').length;
        const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
        
        document.getElementById('activeTasks').textContent = activeTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
    }

    async refreshDashboard() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.add('spinning');
        
        try {
            // Clear existing data
            this.projects.clear();
            this.tasks.clear();
            document.getElementById('projectsList').innerHTML = '';
            document.getElementById('tasksList').innerHTML = '';
            
            // Reload data
            await this.loadInitialData();
            
            this.showToast('Dashboard refreshed!', 'success');
        } catch (error) {
            this.showToast('Failed to refresh dashboard', 'error');
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    }

    async triggerBackup() {
        const backupBtn = document.getElementById('backupBtn');
        backupBtn.disabled = true;
        backupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Backing up...';
        
        try {
            const response = await window.API.createBackup();
            
            if (response.success) {
                this.showToast('Database backup completed successfully!', 'success');
                
                // Add to activity feed
                window.wsManager?.send({
                    type: 'activity',
                    payload: {
                        type: 'backup_completed',
                        message: 'Database backup completed',
                        timestamp: new Date().toISOString()
                    }
                });
            } else {
                throw new Error(response.message || 'Backup failed');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            backupBtn.disabled = false;
            backupBtn.innerHTML = '<i class="fas fa-database"></i> Backup Database';
        }
    }

    showNotificationPanel() {
        // Implementation for notification panel
        this.showToast('Notification panel coming soon!', 'info');
    }

    openQuickSearch() {
        // Implementation for quick search
        this.showToast('Quick search coming soon! (Ctrl+K)', 'info');
    }

    // Public methods for external access
    viewProject(projectId) {
        const project = this.projects.get(projectId);
        if (project) {
            this.showToast(`Viewing project: ${project.name}`, 'info');
            // Implement project detail view
        }
    }

    editProject(projectId) {
        const project = this.projects.get(projectId);
        if (project) {
            // Populate edit form and open modal
            this.showToast(`Editing project: ${project.name}`, 'info');
        }
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;
        
        try {
            const response = await window.API.deleteProject(projectId);
            
            if (response.success) {
                // Remove from UI
                const card = document.querySelector(`[data-project-id="${projectId}"]`);
                if (card) {
                    card.classList.add('fade-out');
                    setTimeout(() => card.remove(), 300);
                }
                
                // Remove from memory
                this.projects.delete(projectId);
                this.updateProjectStats();
                
                this.showToast('Project deleted successfully', 'success');
            }
        } catch (error) {
            this.showToast('Failed to delete project', 'error');
        }
    }

    editTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            this.showToast(`Editing task: ${task.title}`, 'info');
            // Implement task edit
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            const response = await window.API.deleteTask(taskId);
            
            if (response.success) {
                // Remove from UI
                const item = document.querySelector(`[data-task-id="${taskId}"]`);
                if (item) {
                    item.classList.add('fade-out');
                    setTimeout(() => item.remove(), 300);
                }
                
                // Remove from memory
                this.tasks.delete(taskId);
                this.updateTaskStats();
                
                this.showToast('Task deleted successfully', 'success');
            }
        } catch (error) {
            this.showToast('Failed to delete task', 'error');
        }
    }
}

// Initialize UI Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.UI = new UIManager();
});