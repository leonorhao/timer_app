// Main App Controller

const App = {
    // Initialize the application
    async init() {
        // Register service worker
        this.registerServiceWorker();

        // Run one-time migration to fix paused session durations
        await migratePausedSessionDurations();

        // Load custom activities
        await loadCustomActivities();

        // Initialize UI
        UI.init();

        // Initialize Analytics
        Analytics.init();

        // Setup event listeners
        this.setupEventListeners();

        // Request notification permission
        this.requestNotificationPermission();

        // Register timer update callback
        TimerManager.onUpdate(() => {
            UI.updateTimerDisplays();
            this.checkRunningTimerNotification();
        });

        // Load active timers
        await UI.renderActiveTimers();

        console.log('Time Tracker App initialized');
    },

    // Register service worker for PWA
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registered:', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }
    },

    // Setup all event listeners
    setupEventListeners() {
        // Activity button clicks
        document.getElementById('activity-buttons').addEventListener('click', async (e) => {
            const btn = e.target.closest('.activity-btn');
            if (!btn) return;

            const activity = btn.dataset.activity;
            if (activity === '__add__') {
                document.getElementById('add-activity-modal').classList.add('active');
            } else if (activity === 'workout') {
                UI.showWorkoutModal();
            } else {
                await this.startActivity(activity);
            }
        });

        // Workout option clicks
        document.getElementById('workout-options').addEventListener('click', async (e) => {
            const option = e.target.closest('.workout-option');
            if (!option) return;

            const activity = option.dataset.activity;
            UI.hideWorkoutModal();
            await this.startActivity(activity);
        });

        // Timer control clicks (using event delegation)
        document.getElementById('active-timers').addEventListener('click', async (e) => {
            const btn = e.target.closest('.timer-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const sessionId = parseInt(btn.dataset.sessionId);

            switch (action) {
                case 'pause':
                    await this.pauseTimer(sessionId);
                    break;
                case 'resume':
                    await this.resumeTimer(sessionId);
                    break;
                case 'stop':
                    await this.stopTimer(sessionId);
                    break;
                case 'notes':
                    UI.showNotesModal(sessionId);
                    break;
            }
        });

        // Save notes button
        document.getElementById('save-notes').addEventListener('click', async () => {
            const sessionId = UI.getCurrentNotesSessionId();
            const notes = document.getElementById('notes-input').value;

            if (sessionId) {
                await Storage.updateSession(sessionId, { notes });
                UI.hideNotesModal();
            }
        });

        // Goals button
        document.getElementById('goals-btn').addEventListener('click', () => {
            UI.showGoalsModal();
        });

        // Close goals modal
        document.getElementById('close-goals').addEventListener('click', () => {
            UI.hideGoalsModal();
        });

        // Save goals
        document.getElementById('save-goals').addEventListener('click', async () => {
            const goals = UI.getGoalsFromModal();
            await Storage.saveGoals(goals);
            UI.hideGoalsModal();
            await UI.renderDailySummary();
        });

        // Close goals modal on backdrop click
        document.getElementById('goals-modal').addEventListener('click', (e) => {
            if (e.target.id === 'goals-modal') {
                UI.hideGoalsModal();
            }
        });

        // Add custom activity
        document.getElementById('close-add-activity').addEventListener('click', () => {
            document.getElementById('add-activity-modal').classList.remove('active');
        });

        document.getElementById('add-activity-modal').addEventListener('click', (e) => {
            if (e.target.id === 'add-activity-modal') {
                document.getElementById('add-activity-modal').classList.remove('active');
            }
        });

        document.getElementById('save-new-activity').addEventListener('click', async () => {
            const name = document.getElementById('new-activity-name').value.trim();
            const icon = document.getElementById('new-activity-icon').value.trim();
            const color = document.getElementById('new-activity-color').value;

            if (!name || !icon) return;

            await Storage.addCustomActivity(name, icon, color);
            document.getElementById('add-activity-modal').classList.remove('active');
            document.getElementById('new-activity-name').value = '';
            document.getElementById('new-activity-icon').value = '';
            UI.renderActivityButtons();
        });

        // Calendar view toggle
        document.querySelectorAll('.cal-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                UI.calendarView = btn.dataset.view;
                UI.calendarDate = new Date();
                UI.renderHistory();
            });
        });

        // Calendar navigation
        document.getElementById('cal-prev').addEventListener('click', () => {
            if (UI.calendarView === 'week') {
                UI.calendarDate.setDate(UI.calendarDate.getDate() - 7);
            } else {
                UI.calendarDate.setMonth(UI.calendarDate.getMonth() - 1);
            }
            UI.renderHistory();
        });

        document.getElementById('cal-next').addEventListener('click', () => {
            if (UI.calendarView === 'week') {
                UI.calendarDate.setDate(UI.calendarDate.getDate() + 7);
            } else {
                UI.calendarDate.setMonth(UI.calendarDate.getMonth() + 1);
            }
            UI.renderHistory();
        });

        // Calendar day click
        document.getElementById('cal-grid').addEventListener('click', (e) => {
            const dayEl = e.target.closest('.cal-day');
            if (!dayEl || dayEl.classList.contains('empty')) return;
            const day = parseInt(dayEl.dataset.day);
            const month = parseInt(dayEl.dataset.month);
            const year = parseInt(dayEl.dataset.year);
            UI.selectedDate = new Date(year, month, day);
            UI.renderHistory();
        });

        // Show all history
        document.getElementById('show-all-history').addEventListener('click', () => {
            UI.selectedDate = null;
            UI.renderHistory();
        });

        // History edit button clicks
        document.getElementById('history-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.history-edit-btn');
            if (!btn) return;
            const sessionId = parseInt(btn.dataset.sessionId);
            UI.showEditHistoryModal(sessionId);
        });

        // Close edit history modal
        document.getElementById('close-edit-history').addEventListener('click', () => {
            UI.hideEditHistoryModal();
        });

        document.getElementById('edit-history-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-history-modal') {
                UI.hideEditHistoryModal();
            }
        });

        // Save edit history
        document.getElementById('save-edit-history').addEventListener('click', async () => {
            const sessionId = UI.getEditingSessionId();
            if (!sessionId) return;

            const notes = document.getElementById('edit-history-notes').value;
            const durationMinutes = parseInt(document.getElementById('edit-history-duration').value);

            if (durationMinutes > 0) {
                await Storage.updateSession(sessionId, {
                    notes: notes,
                    duration: durationMinutes * 60000
                });
            }

            UI.hideEditHistoryModal();
            await UI.renderHistory();
            await UI.renderDailySummary();
        });

        // Delete history session
        document.getElementById('delete-history-session').addEventListener('click', async () => {
            const sessionId = UI.getEditingSessionId();
            if (!sessionId) return;

            if (confirm('Delete this session?')) {
                await Storage.deleteSession(sessionId);
                UI.hideEditHistoryModal();
                await UI.renderHistory();
                await UI.renderDailySummary();
            }
        });
    },

    // Start a new activity timer
    async startActivity(activityId) {
        // Prevent duplicate: only one timer per activity at a time
        const activeSessions = await Storage.getActiveSessions();
        if (activeSessions.some(s => s.activityId === activityId)) {
            return;
        }

        const session = await Storage.createSession(activityId);
        TimerManager.startTracking(session.id);
        await UI.refreshAll();
    },

    // Pause a timer
    async pauseTimer(sessionId) {
        TimerManager.stopTracking(sessionId);
        await Storage.pauseSession(sessionId);
        await UI.renderActiveTimers();
    },

    // Resume a timer
    async resumeTimer(sessionId) {
        await Storage.resumeSession(sessionId);
        TimerManager.startTracking(sessionId);
        await UI.renderActiveTimers();
    },

    // Stop a timer
    async stopTimer(sessionId) {
        TimerManager.stopTracking(sessionId);
        await Storage.completeSession(sessionId);
        this.notifiedSessions.delete(sessionId);
        await UI.refreshAll();
    },

    // Notification support
    notifiedSessions: new Set(),

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    async checkRunningTimerNotification() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const sessions = await Storage.getActiveSessions();
        const now = Date.now();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        sessions.forEach(session => {
            if (session.status === 'active' && !this.notifiedSessions.has(session.id)) {
                const elapsed = now - session.startTime - (session.pausedDuration || 0);
                if (elapsed >= TWO_HOURS) {
                    const activity = Storage.getActivity(session.activityId);
                    new Notification('Timer Still Running', {
                        body: `${activity?.name || 'Activity'} has been running for over 2 hours.`,
                        icon: 'icons/icon-192.png'
                    });
                    this.notifiedSessions.add(session.id);
                }
            }
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
