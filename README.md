# SmartPayroll-AI

SmartPayroll-AI is a lightweight payroll system for micro-business teams (up to 10 employees), built with a Vite + Vanilla JS frontend and FastAPI + MongoDB backend.

## Features

- One-click payroll processing
- Employee and attendance management
- AI-powered payroll assistant and insights
- Reports export/import
- Settings for payroll policy and compliance parameters

## Tech Stack

- Frontend: Vite + Vanilla JS
- Backend: FastAPI + Motor (MongoDB)
- AI: Google Gemini API

## Local Setup

1. Copy environment template:

   - Copy .env.example to .env
   - Set `VITE_GEMINI_API_KEY` with your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Install frontend dependencies:

   npm install

3. Install backend dependencies:

   - Use the workspace virtual environment, then install:
   - pip install -r backend/requirements.txt

4. Run backend:

   cd backend
   python main.py

5. Run frontend:

   npm run dev

## GitHub Pages Deployment

This repo includes a Pages workflow at .github/workflows/deploy-pages.yml.

### Required repository secrets

Set these in GitHub repository settings -> Secrets and variables -> Actions:

- VITE_API_URL: Public URL for your deployed backend API
- VITE_GEMINI_API_KEY: Gemini API key used at deployment time

Important: any VITE_* value is embedded into static frontend assets and can be viewed in the browser.

### Deployment behavior

- Push to main triggers build and deploy to GitHub Pages
- Base path is configured as /SmartPayroll-AI/ for this repository

## Backend Notes

Backend reads environment values from root .env via backend/config.py.
Keep backend-only secrets outside client-exposed VITE_* variables when possible.
