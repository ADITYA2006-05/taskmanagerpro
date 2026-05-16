/**
 * firestore.js — Client-Side Database Layer
 * Replaces the Python backend with direct Firestore calls.
 */

const Firestore = {
    /** Get the current authenticated user's UID */
    getUid() {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Not authenticated");
        return user.uid;
    },

    /** Fetch all tasks for the current user with optional filtering */
    async getTasks(filters = {}) {
        const uid = this.getUid();
        let query = db.collection('tasks').where('user_id', '==', uid);

        // Basic query
        const snapshot = await query.get();
        let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Apply filters in memory (to avoid needing complex Firestore indexes on first run)
        if (filters.search) {
            const s = filters.search.toLowerCase();
            tasks = tasks.filter(t => t.title?.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s));
        }
        if (filters.priority && filters.priority !== 'all') {
            tasks = tasks.filter(t => t.priority === filters.priority);
        }
        if (filters.status && filters.status !== 'all') {
            tasks = tasks.filter(t => t.status === filters.status);
        }
        if (filters.date_from) {
            tasks = tasks.filter(t => t.due_date && t.due_date >= filters.date_from);
        }
        if (filters.date_to) {
            tasks = tasks.filter(t => t.due_date && t.due_date <= filters.date_to);
        }

        // Sort
        const sort = filters.sort || 'position';
        const desc = sort.startsWith('-');
        const field = sort.replace('-', '');
        
        tasks.sort((a, b) => {
            let vA = a[field] ?? '';
            let vB = b[field] ?? '';
            if (field === 'position') { vA = Number(vA); vB = Number(vB); }
            if (vA < vB) return desc ? 1 : -1;
            if (vA > vB) return desc ? -1 : 1;
            return 0;
        });

        return tasks;
    },

    /** Add a new task */
    async addTask(taskData) {
        const uid = this.getUid();
        
        // Find max position for the user
        const snapshot = await db.collection('tasks').where('user_id', '==', uid).get();
        let maxPos = -1;
        snapshot.forEach(doc => {
            const p = doc.data().position || 0;
            if (p > maxPos) maxPos = p;
        });

        const newTask = {
            user_id: uid,
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            status: 'pending',
            position: maxPos + 1,
            created_at: new Date().toISOString(),
            completed_at: null,
            due_date: taskData.due_date || null,
            due_time: taskData.due_time || null
        };

        const docRef = await db.collection('tasks').add(newTask);
        return { id: docRef.id, ...newTask };
    },

    /** Update a task */
    async updateTask(id, updates) {
        // Handle status completion logic
        if (updates.status === 'completed') {
            updates.completed_at = new Date().toISOString();
        } else if (updates.status === 'pending') {
            updates.completed_at = null;
        }

        await db.collection('tasks').doc(id).update(updates);
    },

    /** Delete a task */
    async deleteTask(id) {
        await db.collection('tasks').doc(id).delete();
    },

    /** Reorder tasks */
    async reorderTasks(orderIds) {
        const batch = db.batch();
        orderIds.forEach((id, index) => {
            const ref = db.collection('tasks').doc(id);
            batch.update(ref, { position: index });
        });
        await batch.commit();
    },

    /** Toggle task status */
    async toggleTask(id, currentStatus) {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const updates = { status: newStatus };
        if (newStatus === 'completed') {
            updates.completed_at = new Date().toISOString();
        } else {
            updates.completed_at = null;
        }
        await db.collection('tasks').doc(id).update(updates);
        return updates;
    },

    /** Get a single task by ID */
    async getTask(id) {
        const doc = await db.collection('tasks').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }
};
