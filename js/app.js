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

        // Quick resume button
        document.getElementById('quick-resume-btn').addEventListener('click', async () => {
            const activityId = UI.getLastActivityId();
            if (activityId) {
                await this.startActivity(activityId);
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
    },

    // Start a new activity timer
    async startActivity(activityId) {
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
        const session = await Storage.getSession(sessionId);

        // If no notes yet, show notes modal before completing
        if (!session.notes) {
            UI.showNotesModal(sessionId);
            // Override save notes to complete the session
            const saveBtn = document.getElementById('save-notes');
            const originalHandler = saveBtn.onclick;

            saveBtn.onclick = async () => {
                const notes = document.getElementById('notes-input').value;
                await Storage.completeSession(sessionId, notes);
                UI.hideNotesModal();
                await UI.refreshAll();
                saveBtn.onclick = originalHandler;
            };
        } else {
            await Storage.completeSession(sessionId);
            await UI.refreshAll();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
