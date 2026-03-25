// Storage Module - IndexedDB via Dexie.js

const db = new Dexie('TimeTrackerDB');

// Define database schema
db.version(1).stores({
    sessions: '++id, activityId, parentCategory, startTime, endTime, status'
});

// Activity definitions
const ACTIVITIES = {
    study: { id: 'study', name: 'Study', icon: '📚', color: '#4A90D9', parent: null },
    work: { id: 'work', name: 'Work', icon: '💼', color: '#7B68EE', parent: null },
    outdoor_running: { id: 'outdoor_running', name: 'Outdoor Running', icon: '🏃‍♂️', color: '#FF8A65', parent: 'workout' },
    gym_exercise: { id: 'gym_exercise', name: 'Gym Exercise', icon: '🏋️', color: '#E57373', parent: 'workout' },
    swimming: { id: 'swimming', name: 'Swimming', icon: '🏊', color: '#4FC3F7', parent: 'workout' },
    sports: { id: 'sports', name: 'Sports', icon: '⚽', color: '#81C784', parent: 'workout' }
};

const MAIN_ACTIVITIES = ['study', 'work', 'workout'];
const WORKOUT_ACTIVITIES = ['outdoor_running', 'gym_exercise', 'swimming', 'sports'];

// Storage operations
const Storage = {
    // Create a new session
    async createSession(activityId) {
        const activity = ACTIVITIES[activityId];
        const session = {
            activityId: activityId,
            parentCategory: activity.parent || activityId,
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            notes: '',
            status: 'active',
            pausedAt: null,
            pausedDuration: 0
        };
        const id = await db.sessions.add(session);
        return { ...session, id };
    },

    // Update a session
    async updateSession(id, updates) {
        await db.sessions.update(id, updates);
        return await db.sessions.get(id);
    },

    // Get a session by ID
    async getSession(id) {
        return await db.sessions.get(id);
    },

    // Get all active sessions
    async getActiveSessions() {
        return await db.sessions
            .where('status')
            .anyOf(['active', 'paused'])
            .toArray();
    },

    // Get completed sessions
    async getCompletedSessions() {
        return await db.sessions
            .where('status')
            .equals('completed')
            .reverse()
            .sortBy('endTime');
    },

    // Get sessions by date range
    async getSessionsByDateRange(startDate, endDate) {
        return await db.sessions
            .where('endTime')
            .between(startDate.getTime(), endDate.getTime())
            .and(session => session.status === 'completed')
            .toArray();
    },

    // Get sessions for today
    async getTodaySessions() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.getSessionsByDateRange(today, tomorrow);
    },

    // Get sessions for this week
    async getWeekSessions() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return this.getSessionsByDateRange(startOfWeek, endOfWeek);
    },

    // Get sessions for this month
    async getMonthSessions() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return this.getSessionsByDateRange(startOfMonth, endOfMonth);
    },

    // Complete a session
    async completeSession(id, notes = '') {
        const session = await db.sessions.get(id);
        if (!session) return null;

        const endTime = Date.now();
        let duration;

        if (session.status === 'paused') {
            duration = session.pausedDuration;
        } else {
            duration = endTime - session.startTime - session.pausedDuration;
        }

        await db.sessions.update(id, {
            endTime: endTime,
            duration: duration,
            notes: notes || session.notes,
            status: 'completed',
            pausedAt: null
        });

        return await db.sessions.get(id);
    },

    // Pause a session
    async pauseSession(id) {
        const session = await db.sessions.get(id);
        if (!session || session.status !== 'active') return null;

        await db.sessions.update(id, {
            status: 'paused',
            pausedAt: Date.now()
        });

        return await db.sessions.get(id);
    },

    // Resume a session
    async resumeSession(id) {
        const session = await db.sessions.get(id);
        if (!session || session.status !== 'paused') return null;

        const pausedDuration = session.pausedDuration + (Date.now() - session.pausedAt);

        await db.sessions.update(id, {
            status: 'active',
            pausedAt: null,
            pausedDuration: pausedDuration
        });

        return await db.sessions.get(id);
    },

    // Delete a session
    async deleteSession(id) {
        await db.sessions.delete(id);
    },

    // Get activity info
    getActivity(activityId) {
        return ACTIVITIES[activityId];
    },

    // Get all activities
    getAllActivities() {
        return ACTIVITIES;
    },

    // Get main activities
    getMainActivities() {
        return MAIN_ACTIVITIES;
    },

    // Get workout activities
    getWorkoutActivities() {
        return WORKOUT_ACTIVITIES;
    }
};
