// UI Module - Handles rendering and DOM interactions

const UI = {
    elements: {},
    currentScreen: 'timer-screen',
    currentNotesSessionId: null,
    lastActivityId: null,

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
            goalsModal: document.getElementById('goals-modal'),
            goalsList: document.getElementById('goals-list'),
            quickResumeContainer: document.getElementById('quick-resume-container'),
            quickResumeBtn: document.getElementById('quick-resume-btn'),
            quickResumeActivity: document.getElementById('quick-resume-activity'),
            dailySummary: document.getElementById('daily-summary'),
            summaryBars: document.getElementById('summary-bars'),
            dailyTotal: document.getElementById('daily-total'),
            streakBadge: document.getElementById('streak-badge'),
            streakCount: document.getElementById('streak-count'),
            navButtons: document.querySelectorAll('.nav-btn'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            screens: document.querySelectorAll('.screen')
        };

        this.renderActivityButtons();
        this.renderWorkoutOptions();
        this.setupNavigation();
        this.setupModals();
        this.renderDailySummary();
        this.renderQuickResume();
        this.renderStreak();
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
            const dateKey = TimerManager.formatDate(session.startTime);
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
    },

    // Render quick resume button
    async renderQuickResume() {
        const lastActivityId = await Storage.getLastActivity();
        const activeSessions = await Storage.getActiveSessions();

        // Don't show if no last activity or if that activity is already running
        if (!lastActivityId || activeSessions.some(s => s.activityId === lastActivityId)) {
            this.elements.quickResumeContainer.style.display = 'none';
            return;
        }

        this.lastActivityId = lastActivityId;
        const activity = Storage.getActivity(lastActivityId);

        this.elements.quickResumeActivity.textContent = activity.name;
        this.elements.quickResumeContainer.style.display = 'block';
    },

    // Get last activity ID for quick resume
    getLastActivityId() {
        return this.lastActivityId;
    },

    // Render daily summary
    async renderDailySummary() {
        const totals = await Storage.getTodayTotals();
        const goals = await Storage.getGoals();
        const activities = Storage.getAllActivities();

        // Calculate total time
        let totalMs = 0;
        Object.values(totals).forEach(ms => totalMs += ms);
        this.elements.dailyTotal.textContent = TimerManager.formatDuration(totalMs);

        // Build progress bars
        let html = '';
        const allActivityIds = [...new Set([...Object.keys(totals), ...Object.keys(goals)])];

        if (allActivityIds.length === 0) {
            html = '<div class="empty-state" style="padding: 10px 0; font-size: 0.85rem;">Start tracking to see your progress!</div>';
        } else {
            allActivityIds.forEach(actId => {
                const activity = activities[actId];
                if (!activity) return;

                const timeMs = totals[actId] || 0;
                const goalMinutes = goals[actId] || 60; // Default 1 hour if no goal
                const timeMinutes = timeMs / 60000;
                const percentage = Math.min((timeMinutes / goalMinutes) * 100, 100);

                html += `
                    <div class="progress-row">
                        <span class="progress-icon">${activity.icon}</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${percentage}%; background: ${activity.color};"></div>
                        </div>
                        <span class="progress-time">${TimerManager.formatDuration(timeMs)}</span>
                    </div>
                `;
            });
        }

        this.elements.summaryBars.innerHTML = html;
    },

    // Render streak badge
    async renderStreak() {
        const streak = await Storage.calculateStreak();

        if (streak > 0) {
            this.elements.streakCount.textContent = streak;
            this.elements.streakBadge.style.display = 'block';
        } else {
            this.elements.streakBadge.style.display = 'none';
        }
    },

    // Show goals modal
    async showGoalsModal() {
        const goals = await Storage.getGoals();
        const activities = Storage.getAllActivities();

        // Show goals for main categories (study, work) and workout subcategories
        const goalActivities = ['study', 'work', 'outdoor_running', 'gym_exercise', 'swimming', 'sports'];

        let html = '';
        goalActivities.forEach(actId => {
            const activity = activities[actId];
            const currentGoal = goals[actId] || '';

            html += `
                <div class="goal-item">
                    <span class="goal-icon">${activity.icon}</span>
                    <div class="goal-info">
                        <div class="goal-name">${activity.name}</div>
                        <div class="goal-input-row">
                            <input type="number" class="goal-input" id="goal-${actId}"
                                   value="${currentGoal}" placeholder="0" min="0" max="480">
                            <span class="goal-unit">minutes/day</span>
                        </div>
                    </div>
                </div>
            `;
        });

        this.elements.goalsList.innerHTML = html;
        this.elements.goalsModal.classList.add('active');
    },

    // Hide goals modal
    hideGoalsModal() {
        this.elements.goalsModal.classList.remove('active');
    },

    // Get goals from modal inputs
    getGoalsFromModal() {
        const goalActivities = ['study', 'work', 'outdoor_running', 'gym_exercise', 'swimming', 'sports'];
        const goals = {};

        goalActivities.forEach(actId => {
            const input = document.getElementById(`goal-${actId}`);
            if (input && input.value) {
                goals[actId] = parseInt(input.value) || 0;
            }
        });

        return goals;
    },

    // Refresh all dynamic content
    async refreshAll() {
        await this.renderActiveTimers();
        await this.renderDailySummary();
        await this.renderQuickResume();
        await this.renderStreak();
    }
};
