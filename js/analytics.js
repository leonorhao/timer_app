// Analytics Module - Statistics and charts

const Analytics = {
    chart: null,
    currentPeriod: 'today',

    // Initialize analytics
    init() {
        this.setupTabs();
    },

    // Setup tab listeners
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render(btn.dataset.period);
            });
        });
    },

    // Main render function
    async render(period) {
        this.currentPeriod = period;
        const sessions = await this.getSessionsForPeriod(period);
        this.renderSummary(sessions, period);
        this.renderChart(sessions, period);
    },

    // Get sessions for the selected period
    async getSessionsForPeriod(period) {
        switch (period) {
            case 'today':
                return await Storage.getTodaySessions();
            case 'week':
                return await Storage.getWeekSessions();
            case 'month':
                return await Storage.getMonthSessions();
            default:
                return await Storage.getTodaySessions();
        }
    },

    // Render summary cards
    renderSummary(sessions, period) {
        const summaryEl = document.getElementById('analytics-summary');
        const activities = Storage.getAllActivities();

        // Calculate total time
        const totalMs = sessions.reduce((sum, s) => sum + s.duration, 0);
        const totalFormatted = TimerManager.formatDuration(totalMs);

        // Calculate sessions count
        const sessionCount = sessions.length;

        summaryEl.innerHTML = `
            <div class="summary-card">
                <div class="summary-label">Total Time</div>
                <div class="summary-value">${totalFormatted}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Sessions</div>
                <div class="summary-value">${sessionCount}</div>
            </div>
        `;
    },

    // Render chart
    renderChart(sessions, period) {
        const ctx = document.getElementById('analytics-chart');
        const activities = Storage.getAllActivities();

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        if (period === 'today') {
            this.renderTodayChart(ctx, sessions, activities);
        } else if (period === 'week') {
            this.renderWeekChart(ctx, sessions, activities);
        } else {
            this.renderMonthChart(ctx, sessions, activities);
        }
    },

    // Render today's bar chart (time per activity)
    renderTodayChart(ctx, sessions, activities) {
        const activityTotals = {};

        sessions.forEach(session => {
            const actId = session.activityId;
            activityTotals[actId] = (activityTotals[actId] || 0) + session.duration;
        });

        const labels = [];
        const data = [];
        const colors = [];

        Object.entries(activityTotals).forEach(([actId, duration]) => {
            const activity = activities[actId];
            if (activity) {
                labels.push(activity.name);
                data.push(Math.round(duration / 60000)); // Convert to minutes
                colors.push(activity.color);
            }
        });

        if (labels.length === 0) {
            labels.push('No data');
            data.push(0);
            colors.push('#E8ECF0');
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    },

    // Render week stacked bar chart
    renderWeekChart(ctx, sessions, activities) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const dayOfWeek = today.getDay();

        // Initialize data structure
        const dayData = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - dayOfWeek + i);
            const dayKey = date.toDateString();
            dayData[dayKey] = {};
        }

        // Populate data
        sessions.forEach(session => {
            const date = new Date(session.startTime);
            const dayKey = date.toDateString();
            if (dayData[dayKey]) {
                dayData[dayKey][session.activityId] =
                    (dayData[dayKey][session.activityId] || 0) + session.duration;
            }
        });

        // Get unique activities
        const uniqueActivities = [...new Set(sessions.map(s => s.activityId))];

        // Build datasets
        const datasets = uniqueActivities.map(actId => {
            const activity = activities[actId];
            const data = Object.keys(dayData).map(dayKey =>
                Math.round((dayData[dayKey][actId] || 0) / 60000)
            );
            return {
                label: activity?.name || actId,
                data: data,
                backgroundColor: activity?.color || '#999',
                borderRadius: 4
            };
        });

        // Get day labels
        const labels = Object.keys(dayData).map(dayKey => {
            const date = new Date(dayKey);
            return days[date.getDay()];
        });

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets.length > 0 ? datasets : [{
                    label: 'No data',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#E8ECF0'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: datasets.length > 0,
                        position: 'bottom'
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    },

    // Render month line chart
    renderMonthChart(ctx, sessions, activities) {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        // Initialize daily totals
        const dailyTotals = {};
        for (let i = 1; i <= daysInMonth; i++) {
            dailyTotals[i] = 0;
        }

        // Sum up daily totals
        sessions.forEach(session => {
            const date = new Date(session.startTime);
            const day = date.getDate();
            dailyTotals[day] = (dailyTotals[day] || 0) + session.duration;
        });

        const labels = Object.keys(dailyTotals);
        const data = Object.values(dailyTotals).map(ms => Math.round(ms / 60000));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Minutes',
                    data: data,
                    borderColor: '#4A90D9',
                    backgroundColor: 'rgba(74, 144, 217, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month'
                        }
                    }
                }
            }
        });
    }
};
