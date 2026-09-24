# GymPro Management App

This project consists of a React frontend (wrapped in Capacitor for mobile deployment) and a FastAPI Python backend.

## Features Built:
- **Gym Membership Management**: Add, remove, and view active members.
- **Flexible Subscriptions**: Start subscriptions on any date, manage multiple-month packages.
- **Discounts & Pending Fees**: Apply discounts to subscriptions and track pending fees dynamically.
- **Daily Attendance**: Easily mark daily check-ins for active members.
- **GitHub Actions CI**: Push to the `main` branch to automatically build your Android APK. You can download the zip containing your `.apk` file from the "Actions" tab on GitHub.

## How to Run Locally

### 1. Start the Backend
Open a terminal in the project root and run:
```bash
cd backend
# Create and activate virtual environment (optional)
python -m venv venv
.\venv\Scripts\activate
# Install dependencies if not already installed
pip install fastapi uvicorn sqlalchemy pydantic uvicorn[standard] fastapi-cors

# Start the FastAPI server
uvicorn main:app --reload
```
The backend API will run on `http://localhost:8000`.

### 2. Start the Frontend
Open a new terminal in the project root and run:
```bash
cd frontend
# Install dependencies if not already installed
npm install

# Start the Vite development server
npm run dev
```
The app will open in your browser, likely on `http://localhost:5173`.

## Generating the Mobile App (APK) without Android Studio
1. Push this entire repository to a new repository on GitHub.
2. The GitHub Actions workflow (in `.github/workflows/build-apk.yml`) is already configured.
3. Every time you push to the `main` branch, the workflow will build the APK.
4. Go to the **Actions** tab in your GitHub repository, click on the latest workflow run, and download the `gym-app-apk` artifact from the bottom of the page.
