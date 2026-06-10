# FreightPulse Frontend Setup Guide

This guide contains everything you need to know to get the FreightPulse frontend running locally on your system. 

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

## Getting Started

1. **Navigate to the frontend directory**
   Open your terminal and make sure you are inside the `frontend` folder:
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   Install all the required packages (React, Vite, Tailwind, PapaParse, Axios):
   ```bash
   npm install
   ```

3. **Run the development server**
   Start the local dev server:
   ```bash
   npm run dev
   ```
   The terminal will show you a local URL (usually `http://localhost:5173/`). Open this URL in your web browser to view the dashboard.

## Important Notes for Developers

### 1. Mock Data vs Real Backend
By default, the frontend is configured to run in **Mock Mode** for the hackathon demo. This means you do not need the backend running to see the dashboard, signals, and alerts.
- To switch to the real backend, open `src/api/client.js`.
- Find the line: `const USE_MOCK = true;`
- Change it to: `const USE_MOCK = false;`
- Make sure the Python backend is running on `http://localhost:8000` (the default base URL).

### 2. File Structure
- `src/App.jsx`: The root layout component that holds the main state and polling logic.
- `src/api/client.js`: All API calls and utility functions (date/currency formatting).
- `src/api/mockData.js`: The hardcoded mock data used for the demo.
- `src/index.css`: The global design system, CSS custom properties (colors/fonts), and animations.
- `src/components/`: Reusable UI components (RiskScoreBadge, AlertBanner, CSVUpload, etc.).

### 3. Production Build
To create an optimized production build, run:
```bash
npm run build
```
This will generate a `dist/` folder containing the compiled static assets.
