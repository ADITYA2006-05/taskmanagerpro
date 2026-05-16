/**
 * tasks.js — Task List Page
 * CRUD operations, drag-and-drop, filters, sort, and task modal.
 */

const Tasks = {
    sortable: null,

    async render(container) {
        container.innerHTML = `
            <div class="tasks-header">
                <button class="btn btn-primary" id="add-task-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Task
                </button>
                <div class="tasks-filters">
                    <select id="filter-priority"><option value="">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                    <select id="filter-status"><option value="">All Status</option><option value="pending">Pending</option><option value="completed">Completed</option></select>
                    <select id="filter-sort"><option value="position">Custom Order</option><option value="due_date">Due Date</option><option value="-priority">Priority</option><option value="-created_at">Newest</option><option value="created_at">Oldest</option></select>
                </div>
            </div>
            <div class="task-list" id="task-list"></div>
        `;
        document.getElementById('add-task-btn').addEventListener('click', () => this.showModal());
        document.querySelectorAll('.tasks-filters select').forEach(s => {
            s.addEventListener('change', () => this.loadTasks());
        });
        await this.loadTasks();
    },

    async loadTasks() {
        try {
            const filters = {
                search: document.getElementById('search-input')?.value,
                priority: document.getElementById('filter-priority')?.value,
                status: document.getElementById('filter-status')?.value,
                sort: document.getElementById('filter-sort')?.value
            };
            const tasks = await Firestore.getTasks(filters);
            this.renderTasks(tasks);
        } catch (err) {
            App.toast('Failed to load tasks', 'error');
        }
    },

    renderTasks(tasks) {
        const list = document.getElementById('task-list');
        if (!list) return;
        if (tasks.length === 0) {
            list.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg><h3>No tasks found</h3><p>Click "Add Task" to create your first task</p></div>';
            return;
        }
        list.innerHTML = tasks.map(t => this.taskHTML(t)).join('');
        this.bindTaskEvents();
        this.initDragDrop();
    },

    taskHTML(t) {
        const checked = t.status === 'completed';
        return `
        <div class="task-item ${checked ? 'completed' : ''}" data-id="${t.id}">
            <div class="drag-handle"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></div>
            <div class="task-check ${checked ? 'checked' : ''}" data-id="${t.id}" data-status="${t.status}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="task-body">
                <div class="task-title">${this.esc(t.title)}</div>
                <div class="task-meta">
                    <span class="priority-badge ${t.priority}">${t.priority}</span>
                    ${t.due_date ? `<span>📅 ${t.due_date}</span>` : ''}
                    ${t.due_time ? `<span>🕐 ${t.due_time}</span>` : ''}
                    ${t.description ? `<span>📝 ${this.esc(t.description.substring(0, 40))}${t.description.length > 40 ? '...' : ''}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" data-id="${t.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="delete-btn" data-id="${t.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
            </div>
        </div>`;
    },

    bindTaskEvents() {
        document.querySelectorAll('.task-check').forEach(el => {
            el.addEventListener('click', () => this.toggleTask(el.dataset.id, el.dataset.status));
        });
        document.querySelectorAll('.edit-btn').forEach(el => {
            el.addEventListener('click', () => this.editTask(el.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(el => {
            el.addEventListener('click', () => this.deleteTask(el.dataset.id));
        });
    },

    initDragDrop() {
        const list = document.getElementById('task-list');
        if (this.sortable) this.sortable.destroy();
        this.sortable = new Sortable(list, {
            handle: '.drag-handle',
            animation: 200,
            ghostClass: 'sortable-ghost',
            onEnd: async () => {
                const order = [...list.querySelectorAll('.task-item')].map(el => el.dataset.id);
                try { await Firestore.reorderTasks(order); }
                catch (err) { App.toast('Reorder failed', 'error'); }
            }
        });
    },

    async toggleTask(id, currentStatus) {
        try {
            await Firestore.toggleTask(id, currentStatus);
            this.loadTasks();
        } catch (err) {
            App.toast('Failed to update task', 'error');
        }
    },

    async deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await Firestore.deleteTask(id);
            App.toast('Task deleted', 'info');
            this.loadTasks();
        } catch (err) {
            App.toast('Failed to delete task', 'error');
        }
    },

    async editTask(id) {
        try {
            const task = await Firestore.getTask(id);
            if (task) this.showModal(task);
        } catch (err) { App.toast('Could not fetch task', 'error'); }
    },

    showModal(task = null) {
        const isEdit = !!task;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
        <div class="modal">
            <h2>${isEdit ? 'Edit Task' : 'New Task'}</h2>
            <form id="task-form">
                <div class="form-group"><label>Title</label><input type="text" id="modal-title" value="${isEdit ? this.esc(task.title) : ''}" required></div>
                <div class="form-group"><label>Description</label><textarea id="modal-desc">${isEdit ? this.esc(task.description) : ''}</textarea></div>
                <div class="form-row">
                    <div class="form-group"><label>Due Date</label><input type="date" id="modal-date" value="${task?.due_date || ''}"></div>
                    <div class="form-group"><label>Due Time</label><input type="time" id="modal-time" value="${task?.due_time || ''}"></div>
                </div>
                <div class="form-group"><label>Priority</label>
                    <select id="modal-priority">
                        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${!task || task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Task'}</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('modal-title').value.trim(),
                description: document.getElementById('modal-desc').value.trim(),
                due_date: document.getElementById('modal-date').value || null,
                due_time: document.getElementById('modal-time').value || null,
                priority: document.getElementById('modal-priority').value
            };
            try {
                if (isEdit) {
                    await Firestore.updateTask(task.id, data);
                    App.toast('Task updated', 'success');
                } else {
                    await Firestore.addTask(data);
                    App.toast('Task added successfully', 'success');
                }
                overlay.remove();
                await this.loadTasks();
            } catch (err) { App.toast(err.message, 'error'); }
        });
        document.getElementById('modal-title').focus();
    },

    esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
};
