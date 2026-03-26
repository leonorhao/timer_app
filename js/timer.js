// Timer Module - Handles timer logic and display updates

const TimerManager = {
    timers: new Map(), // Map of session ID to timer interval
    updateCallbacks: [],

    // Register a callback for timer updates
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    },

    // Notify all callbacks
    notifyUpdate() {
        this.updateCallbacks.forEach(cb => cb());
    },

    // Start tracking a timer display for a session
    startTracking(sessionId) {
        if (this.timers.has(sessionId)) return;

        const intervalId = setInterval(() => {
            this.notifyUpdate();
        }, 1000);

        this.timers.set(sessionId, intervalId);
    },

    // Stop tracking a timer display
    stopTracking(sessionId) {
        const intervalId = this.timers.get(sessionId);
        if (intervalId) {
            clearInterval(intervalId);
            this.timers.delete(sessionId);
        }
    },

    // Stop all timers
    stopAll() {
        this.timers.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        this.timers.clear();
    },

    // Calculate elapsed time for a session
    getElapsedTime(session) {
        if (!session) return 0;

        if (session.status === 'completed') {
            return session.duration;
        }

        if (session.status === 'paused') {
            return (session.pausedAt - session.startTime) - session.pausedDuration;
        }

        // Active session
        const now = Date.now();
        return now - session.startTime - (session.pausedDuration || 0);
    },

    // Format milliseconds to HH:MM:SS
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n) => n.toString().padStart(2, '0');

        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    },

    // Format milliseconds to human readable duration
    formatDuration(ms) {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        }
        return '< 1m';
    },

    // Format time of day
    formatTimeOfDay(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    // Format date
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    },

    // Get elapsed time for a paused session
    getPausedElapsedTime(session) {
        if (!session || session.status !== 'paused') return 0;
        return session.pausedAt - session.startTime - (session.pausedDuration || 0);
    }
};
