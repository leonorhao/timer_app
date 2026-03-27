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
        this.renderStreak();
    },

    // Render main activity buttons
    renderActivityButtons() {
        const mainActivities = Storage.getMainActivities();
        const activities = Storage.getAllActivities();
        const customActivities = Storage.getCustomActivities();

        let html = '';

        mainActivities.forEach(actId => {
            if (actId === 'workout') {
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

        // Custom activities
        customActivities.forEach(activity => {
            html += `
                <button class="activity-btn custom" data-activity="${activity.id}" style="border-left: 4px solid ${activity.color};">
                    <span class="icon">${activity.icon}</span>
                    <span class="label">${activity.name}</span>
                </button>
            `;
        });

        // Add button
        html += `
            <button class="activity-btn add-activity" data-activity="__add__">
                <span class="icon">+</span>
                <span class="label">Add</span>
            </button>
        `;

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

    // Calendar state
    calendarDate: null,
    selectedDate: null,

    // Render calendar
    async renderCalendar() {
        if (!this.calendarDate) {
            this.calendarDate = new Date();
        }

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        // Update month label
        document.getElementById('cal-month-label').textContent =
            new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Get sessions for this month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 1);
        const sessions = await Storage.getSessionsByDateRange(startOfMonth, endOfMonth);

        // Build map of day -> activity colors
        const dayActivities = {};
        const activities = Storage.getAllActivities();
        sessions.forEach(s => {
            const day = new Date(s.startTime).getDate();
            if (!dayActivities[day]) dayActivities[day] = new Set();
            const color = activities[s.activityId]?.color ||
                (activities[s.activityId]?.parent === 'workout' ? '#FF8A65' : '#999');
            dayActivities[day].add(color);
        });

        // Build calendar grid
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = '';

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = this.selectedDate &&
                d === this.selectedDate.getDate() &&
                month === this.selectedDate.getMonth() &&
                year === this.selectedDate.getFullYear();

            let dotsHtml = '';
            if (dayActivities[d]) {
                dotsHtml = '<div class="cal-dots">';
                dayActivities[d].forEach(color => {
                    dotsHtml += `<span style="background:${color}"></span>`;
                });
                dotsHtml += '</div>';
            }

            html += `<div class="cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" data-day="${d}">
                ${d}${dotsHtml}
            </div>`;
        }

        document.getElementById('cal-grid').innerHTML = html;
    },

    // Render history screen
    async renderHistory() {
        await this.renderCalendar();

        let sessions;
        const showAllBtn = document.getElementById('show-all-history');
        const titleEl = document.getElementById('history-title');

        if (this.selectedDate) {
            const dayStart = new Date(this.selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            sessions = await Storage.getSessionsByDateRange(dayStart, dayEnd);
            titleEl.textContent = TimerManager.formatDate(this.selectedDate.getTime());
            showAllBtn.style.display = 'block';
        } else {
            sessions = await Storage.getCompletedSessions();
            titleEl.textContent = 'Session History';
            showAllBtn.style.display = 'none';
        }

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
                    <div class="history-item" data-session-id="${session.id}">
                        <span class="history-icon">${activity.icon}</span>
                        <div class="history-details">
                            <div class="history-activity">${activity.name}</div>
                            <div class="history-time">${startTime} - ${endTime}</div>
                            ${session.notes ? `<div class="history-notes">${session.notes}</div>` : ''}
                        </div>
                        <div class="history-right">
                            <div class="history-duration">${duration}</div>
                            <button class="history-edit-btn" data-session-id="${session.id}">Edit</button>
                        </div>
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
            Analytics.render(Analytics.currentPeriod || 'today');
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

    // Render daily summary
    async renderDailySummary() {
        const totals = await Storage.getTodayTotals();
        const goals = await Storage.getGoals();
        const activities = Storage.getAllActivities();

        // Calculate total time
        let totalMs = 0;
        Object.values(totals).forEach(ms => totalMs += ms);
        this.elements.dailyTotal.textContent = TimerManager.formatDuration(totalMs);

        // Aggregate workout sub-activities into a single "workout" total
        const groupedTotals = {};
        Object.entries(totals).forEach(([actId, ms]) => {
            const activity = activities[actId];
            if (activity && activity.parent === 'workout') {
                groupedTotals['workout'] = (groupedTotals['workout'] || 0) + ms;
            } else {
                groupedTotals[actId] = (groupedTotals[actId] || 0) + ms;
            }
        });

        // Build progress bars for main categories
        const mainCategories = [
            { id: 'study', name: 'Study', icon: '📚', color: '#4A90D9' },
            { id: 'work', name: 'Work', icon: '💼', color: '#7B68EE' },
            { id: 'workout', name: 'Workout', icon: '💪', color: '#FF8A65' }
        ];

        let html = '';
        const hasData = mainCategories.some(cat => (groupedTotals[cat.id] || 0) > 0 || goals[cat.id]);

        if (!hasData) {
            html = '<div class="empty-state" style="padding: 10px 0; font-size: 0.85rem;">Start tracking to see your progress!</div>';
        } else {
            mainCategories.forEach(cat => {
                const timeMs = groupedTotals[cat.id] || 0;
                const goalMinutes = goals[cat.id] || 60;
                const timeMinutes = timeMs / 60000;
                const percentage = Math.min((timeMinutes / goalMinutes) * 100, 100);

                if (timeMs > 0 || goals[cat.id]) {
                    html += `
                        <div class="progress-row">
                            <span class="progress-icon">${cat.icon}</span>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${percentage}%; background: ${cat.color};"></div>
                            </div>
                            <span class="progress-time">${TimerManager.formatDuration(timeMs)}</span>
                        </div>
                    `;
                }
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

        // Show goals for main categories only
        const goalActivities = [
            { id: 'study', name: 'Study', icon: '📚' },
            { id: 'work', name: 'Work', icon: '💼' },
            { id: 'workout', name: 'Workout', icon: '💪' }
        ];

        let html = '';
        goalActivities.forEach(activity => {
            const actId = activity.id;
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
        const goalActivities = ['study', 'work', 'workout'];
        const goals = {};

        goalActivities.forEach(actId => {
            const input = document.getElementById(`goal-${actId}`);
            if (input && input.value) {
                goals[actId] = parseInt(input.value) || 0;
            }
        });

        return goals;
    },

    // Show edit history modal
    async showEditHistoryModal(sessionId) {
        this.editingSessionId = sessionId;
        const session = await Storage.getSession(sessionId);
        if (!session) return;

        document.getElementById('edit-history-notes').value = session.notes || '';
        document.getElementById('edit-history-duration').value = Math.round(session.duration / 60000);
        document.getElementById('edit-history-modal').classList.add('active');
    },

    // Hide edit history modal
    hideEditHistoryModal() {
        document.getElementById('edit-history-modal').classList.remove('active');
        this.editingSessionId = null;
    },

    // Get editing session ID
    getEditingSessionId() {
        return this.editingSessionId;
    },

    // Refresh all dynamic content
    async refreshAll() {
        await this.renderActiveTimers();
        await this.renderDailySummary();
        await this.renderStreak();
    }
};
