// Main App Controller

const App = {
    // Initialize the application
    async init() {
        // Register service worker
        this.registerServiceWorker();

        // Run one-time migration to fix paused session durations
        await migratePausedSessionDurations();

        // Initialize UI
        UI.init();

        // Initialize Analytics
        Analytics.init();

        // Setup event listeners
        this.setupEventListeners();

        // Register timer update callback
        TimerManager.onUpdate(() => {
            UI.updateTimerDisplays();
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
            if (activity === 'workout') {
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
        await UI.refreshAll();
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
