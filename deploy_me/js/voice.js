/**
 * voice.js — Voice Commands via Web Speech API
 * Commands: "add task [title]", "delete task [title]", "complete task [title]"
 */

const Voice = {
    recognition: null,
    isListening: false,

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            document.getElementById('voice-btn')?.setAttribute('title', 'Voice not supported in this browser');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
            document.getElementById('voice-transcript').textContent = `"${transcript}"`;
            if (event.results[0].isFinal) this.processCommand(transcript);
        };

        this.recognition.onend = () => this.stopListening();
        this.recognition.onerror = (e) => {
            App.toast('Voice error: ' + e.error, 'error');
            this.stopListening();
        };

        // Bind button
        document.getElementById('voice-btn')?.addEventListener('click', () => this.toggle());
        document.getElementById('voice-cancel')?.addEventListener('click', () => this.stopListening());
    },

    toggle() {
        if (this.isListening) this.stopListening();
        else this.startListening();
    },

    startListening() {
        if (!this.recognition) { App.toast('Voice not supported', 'warning'); return; }
        this.isListening = true;
        document.getElementById('voice-overlay').classList.remove('hidden');
        document.getElementById('voice-btn').classList.add('listening');
        document.getElementById('voice-status').textContent = 'Listening...';
        document.getElementById('voice-transcript').textContent = '';
        this.recognition.start();
    },

    stopListening() {
        this.isListening = false;
        document.getElementById('voice-overlay')?.classList.add('hidden');
        document.getElementById('voice-btn')?.classList.remove('listening');
        try { this.recognition?.stop(); } catch {}
    },

    async processCommand(text) {
        const lower = text.toLowerCase().trim();
        document.getElementById('voice-status').textContent = 'Processing...';

        try {
            if (lower.startsWith('add task') || lower.startsWith('create task') || lower.startsWith('new task')) {
                const title = text.replace(/^(add|create|new)\s+task\s*/i, '').trim();
                if (!title) { App.toast('Please say a task title', 'warning'); return; }
                await App.api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, priority: 'medium' }) });
                App.toast(`Task "${title}" created!`, 'success');
            } else if (lower.startsWith('delete task') || lower.startsWith('remove task')) {
                const title = text.replace(/^(delete|remove)\s+task\s*/i, '').trim();
                await this.findAndAct(title, 'delete');
            } else if (lower.startsWith('complete task') || lower.startsWith('finish task') || lower.startsWith('done task')) {
                const title = text.replace(/^(complete|finish|done)\s+task\s*/i, '').trim();
                await this.findAndAct(title, 'complete');
            } else {
                // Default: create task from whatever was said
                await App.api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: text.trim(), priority: 'medium' }) });
                App.toast(`Task "${text.trim()}" created!`, 'success');
            }

            // Refresh if on tasks page
            if (App.currentPage === 'tasks') Tasks.loadTasks();
            else if (App.currentPage === 'dashboard') Dashboard.render(document.getElementById('page-content'));
        } catch (err) {
            App.toast(err.message, 'error');
        }

        setTimeout(() => this.stopListening(), 500);
    },

    async findAndAct(title, action) {
        const data = await App.api('/api/tasks?search=' + encodeURIComponent(title));
        if (data.tasks.length === 0) {
            App.toast(`No task found matching "${title}"`, 'warning');
            return;
        }
        const task = data.tasks[0]; // best match
        if (action === 'delete') {
            await App.api(`/api/tasks/${task.id}`, { method: 'DELETE' });
            App.toast(`Deleted "${task.title}"`, 'success');
        } else if (action === 'complete') {
            if (task.status !== 'completed') {
                await App.api(`/api/tasks/${task.id}/toggle`, { method: 'PATCH' });
                App.toast(`Completed "${task.title}"`, 'success');
            } else {
                App.toast(`"${task.title}" is already completed`, 'info');
            }
        }
    }
};

// Initialize voice after DOM ready
document.addEventListener('DOMContentLoaded', () => Voice.init());
