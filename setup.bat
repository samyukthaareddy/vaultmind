@echo off
echo === VaultMind Quick Start ===

echo.
echo [1/4] Copying backend .env...
if not exist backend\.env copy backend\.env.example backend\.env
echo   Edit backend\.env with your HINDSIGHT_API_KEY and GROQ_API_KEY before continuing.
pause

echo.
echo [2/4] Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

echo.
echo [3/4] Installing frontend dependencies...
cd frontend
npm install
cd ..

echo.
echo [4/4] Loading demo data...
cd backend
python ..\data\demo\load_demo_standalone.py
cd ..

echo.
echo === Setup complete ===
echo Start backend:  cd backend ^&^& python manage.py runserver
echo Start frontend: cd frontend ^&^& npm run dev
echo Open:           http://localhost:3000
echo.
echo Demo login: admin@novapay.com / admin123
