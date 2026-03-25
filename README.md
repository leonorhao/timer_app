# Activity Time Tracker

A Progressive Web App (PWA) for tracking personal activities like studying, working out, and more. Works offline and can be installed on your iPhone home screen.

## Features

- **Multiple Activity Categories**: Study, Work, and Workout (Running, Gym, Swimming, Sports)
- **Simultaneous Timers**: Track multiple activities at once
- **Pause/Resume/Stop**: Full timer controls
- **Session Notes**: Add notes to any session
- **Full Analytics**: Daily, weekly, and monthly statistics with charts
- **Offline Support**: Works without internet after first load
- **Installable**: Add to iPhone home screen for app-like experience

## Getting Started

### Run Locally

1. Install a local server (if you don't have one):
   ```bash
   npm install -g serve
   ```

2. Navigate to the project folder and start the server:
   ```bash
   cd timer_app
   npx serve . -p 3000
   ```

3. Open http://localhost:3000 in your browser

### Generate App Icons

1. Open `icons/generate-icons.html` in a browser
2. Click the download buttons for each icon size
3. Save `icon-192.png` and `icon-512.png` in the `icons/` folder

## Deploy Online

To use the app anywhere (not just local network), deploy to a free hosting service:

### GitHub Pages

1. Create a GitHub repository
2. Push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/timer-app.git
   git push -u origin main
   ```
3. Go to repository Settings > Pages
4. Set source to "main" branch
5. Your app will be live at `https://YOUR_USERNAME.github.io/timer-app/`

### Netlify (Drag & Drop)

1. Go to [netlify.com](https://netlify.com)
2. Sign up/login
3. Drag the `timer_app` folder onto the deploy zone
4. Get your live URL instantly

## Install on iPhone

1. Open the app URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will work offline after installation

## Project Structure

```
timer_app/
├── index.html          # Main app shell
├── manifest.json       # PWA configuration
├── sw.js               # Service worker for offline support
├── css/
│   └── styles.css      # Styling
├── js/
│   ├── app.js          # Main controller
│   ├── storage.js      # IndexedDB data layer
│   ├── timer.js        # Timer logic
│   ├── ui.js           # UI rendering
│   └── analytics.js    # Charts & statistics
└── icons/
    ├── generate-icons.html
    ├── icon-192.png
    └── icon-512.png
```

## Technologies

- Vanilla HTML/CSS/JavaScript
- IndexedDB via [Dexie.js](https://dexie.org/)
- [Chart.js](https://www.chartjs.org/) for analytics
- Service Workers for offline capability

## License

MIT
