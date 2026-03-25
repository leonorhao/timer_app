// UI Module - Handles rendering and DOM interactions

const UI = {
    elements: {},
    currentScreen: 'timer-screen',
    currentNotesSessionId: null,

    // Initialize UI elements
    init() {
        this.elements = {
            activityButtons: document.getElementById('activity-buttons'),
            activeTimers: document.getElementById('active-timers'),
            noTimers: document.getElementById('no-timers'),
            historyList: document.getElementById('history-list'),
            analyticsSummary: document.getElementById('analytics-summary'),
            analyticsChart: document.getElementById('analytics-chart'),
            notesModal: document.getElementById('notes-modal'),
            notesInput: document.getElementById('notes-input'),
            workoutModal: document.getElementById('workout-modal'),
            workoutOptions: document.getElementById('workout-options'),
            navButtons: document.querySelectorAll('.nav-btn'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            screens: document.querySelectorAll('.screen')
        };

        this.renderActivityButtons();
        this.renderWorkoutOptions();
        this.setupNavigation();
        this.setupModals();
    },

    // Render main activity buttons
    renderActivityButtons() {
        const mainActivities = Storage.getMainActivities();
        const activities = Storage.getAllActivities();

        let html = '';

        mainActivities.forEach(actId => {
            if (actId === 'workout') {
                // Workout button opens submenu
                html += `
                    <button class="activity-btn workout" data-activity="workout">
                        <span class="icon">💪</span>
                        <span class="label">Workout</span>
                    </button>
                `;
            } else {
                const activity = activities[actId];
                html += `
                    <button class="activity-btn ${actId}" data-activity="${actId}">
                        <span class="icon">${activity.icon}</span>
                        <span class="label">${activity.name}</span>
                    </button>
                `;
            }
        });

        this.elements.activityButtons.innerHTML = html;
    },

    // Render workout submenu options
    renderWorkoutOptions() {
        const workoutActivities = Storage.getWorkoutActivities();
        const activities = Storage.getAllActivities();

        let html = '';
        workoutActivities.forEach(actId => {
            const activity = activities[actId];
            html += `
                <button class="workout-option" data-activity="${actId}">
                    <span class="icon">${activity.icon}</span>
                    <span class="label">${activity.name}</span>
                </button>
            `;
        });

        this.elements.workoutOptions.innerHTML = html;
    },

    // Render active timers
    async renderActiveTimers() {
        const sessions = await Storage.getActiveSessions();

        if (sessions.length === 0) {
            this.elements.activeTimers.innerHTML = `
                <div class="empty-state" id="no-timers">
                    No active timers. Tap an activity to start tracking.
                </div>
            `;
            return;
        }

        const activities = Storage.getAllActivities();
        let html = '';

        sessions.forEach(session => {
            const activity = activities[session.activityId];
            const elapsed = session.status === 'paused'
                ? TimerManager.getPausedElapsedTime(session)
                : TimerManager.getElapsedTime(session);
            const formattedTime = TimerManager.formatTime(elapsed);
            const startTime = TimerManager.formatTimeOfDay(session.startTime);
            const isPaused = session.status === 'paused';

            html += `
                <div class="timer-card ${session.activityId} ${isPaused ? 'paused' : ''}" data-session-id="${session.id}">
                    <div class="timer-header">
                        <span class="timer-icon">${activity.icon}</span>
                        <div class="timer-info">
                            <div class="timer-activity">${activity.name}</div>
                            <div class="timer-started">Started at ${startTime}</div>
                        </div>
                    </div>
                    <div class="timer-display">${formattedTime}</div>
                    <div class="timer-controls">
                        ${isPaused
                            ? `<button class="timer-btn resume" data-action="resume" data-session-id="${session.id}">Resume</button>`
                            : `<button class="timer-btn pause" data-action="pause" data-session-id="${session.id}">Pause</button>`
                        }
                        <button class="timer-btn stop" data-action="stop" data-session-id="${session.id}">Stop</button>
                        <button class="timer-btn notes" data-action="notes" data-session-id="${session.id}">Notes</button>
                    </div>
                </div>
            `;

            // Start tracking this timer if active
            if (!isPaused) {
                TimerManager.startTracking(session.id);
            }
        });

        this.elements.activeTimers.innerHTML = html;
    },

    // Update timer displays without re-rendering everything
    async updateTimerDisplays() {
        const sessions = await Storage.getActiveSessions();
        const activities = Storage.getAllActivities();

        sessions.forEach(session => {
            const card = document.querySelector(`.timer-card[data-session-id="${session.id}"]`);
            if (card) {
                const displayEl = card.querySelector('.timer-display');
                if (displayEl && session.status === 'active') {
                    const elapsed = TimerManager.getElapsedTime(session);
                    displayEl.textContent = TimerManager.formatTime(elapsed);
                }
            }
        });
    },

    // Render history screen
    async renderHistory() {
        const sessions = await Storage.getCompletedSessions();
        const activities = Storage.getAllActivities();

        if (sessions.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-state">No sessions recorded yet.</div>
            `;
            return;
        }

        // Group sessions by date
        const grouped = {};
        sessions.forEach(session => {
            const dateKey = TimerManager.formatDate(session.endTime);
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(session);
        });

        let html = '';
        Object.entries(grouped).forEach(([date, dateSessions]) => {
            html += `<div class="history-date">${date}</div>`;

            dateSessions.forEach(session => {
                const activity = activities[session.activityId];
                const duration = TimerManager.formatDuration(session.duration);
                const startTime = TimerManager.formatTimeOfDay(session.startTime);
                const endTime = TimerManager.formatTimeOfDay(session.endTime);

                html += `
                    <div class="history-item">
                        <span class="history-icon">${activity.icon}</span>
                        <div class="history-details">
                            <div class="history-activity">${activity.name}</div>
                            <div class="history-time">${startTime} - ${endTime}</div>
                            ${session.notes ? `<div class="history-notes">${session.notes}</div>` : ''}
                        </div>
                        <div class="history-duration">${duration}</div>
                    </div>
                `;
            });
        });

        this.elements.historyList.innerHTML = html;
    },

    // Setup navigation
    setupNavigation() {
        this.elements.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const screenId = btn.dataset.screen;
                this.switchScreen(screenId);

                // Update active nav button
                this.elements.navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    // Switch screens
    switchScreen(screenId) {
        this.currentScreen = screenId;

        this.elements.screens.forEach(screen => {
            screen.classList.remove('active');
        });

        document.getElementById(screenId).classList.add('active');

        // Refresh content based on screen
        if (screenId === 'history-screen') {
            this.renderHistory();
        } else if (screenId === 'analytics-screen') {
            Analytics.render('today');
        } else if (screenId === 'timer-screen') {
            this.renderActiveTimers();
        }
    },

    // Setup modals
    setupModals() {
        // Close notes modal
        document.getElementById('close-notes').addEventListener('click', () => {
            this.hideNotesModal();
        });

        // Close workout modal
        document.getElementById('close-workout').addEventListener('click', () => {
            this.hideWorkoutModal();
        });

        // Close modals on backdrop click
        this.elements.notesModal.addEventListener('click', (e) => {
            if (e.target === this.elements.notesModal) {
                this.hideNotesModal();
            }
        });

        this.elements.workoutModal.addEventListener('click', (e) => {
            if (e.target === this.elements.workoutModal) {
                this.hideWorkoutModal();
            }
        });
    },

    // Show notes modal
    showNotesModal(sessionId) {
        this.currentNotesSessionId = sessionId;
        Storage.getSession(sessionId).then(session => {
            this.elements.notesInput.value = session?.notes || '';
            this.elements.notesModal.classList.add('active');
            this.elements.notesInput.focus();
        });
    },

    // Hide notes modal
    hideNotesModal() {
        this.elements.notesModal.classList.remove('active');
        this.currentNotesSessionId = null;
    },

    // Show workout modal
    showWorkoutModal() {
        this.elements.workoutModal.classList.add('active');
    },

    // Hide workout modal
    hideWorkoutModal() {
        this.elements.workoutModal.classList.remove('active');
    },

    // Get current notes session ID
    getCurrentNotesSessionId() {
        return this.currentNotesSessionId;
    }
};
