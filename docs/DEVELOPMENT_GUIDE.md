# Development Guide — Intern Performance Management System (PMS)

This guide walks developers through local environment setup, database provisioning, running automated tests, seeding sample data, and development workflows.

---

## 1. System Prerequisites

Ensure the following tools are installed on your host system:
- **Operating System:** macOS (Apple Silicon / Intel) or Linux (Ubuntu 22.04+)
- **Python:** 3.11 or 3.12 (`python3 --version`)
- **PostgreSQL:** 16.x (`psql --version`)
- **Node.js:** 18.x or 20.x (`node --version`)
- **Git:** 2.40+

---

## 2. PostgreSQL 16 Provisioning

### macOS (Homebrew)
```bash
# Install and start PostgreSQL 16 service
brew install postgresql@16
brew services start postgresql@16

# Create database user and database
psql postgres -c "CREATE USER intern_pms_user WITH PASSWORD 'intern_pms_password';"
psql postgres -c "ALTER USER intern_pms_user CREATEDB;"
psql postgres -c "CREATE DATABASE intern_pms_db OWNER intern_pms_user;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE intern_pms_db TO intern_pms_user;"
```

---

## 3. Backend Setup (Django & DRF)

### 3.1 Environment & Virtual Environment
```bash
cd backend

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install production and development dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Environment Configuration (`backend/.env`)
Create `backend/.env` (copy from `backend/.env.example` if available):
```ini
DEBUG=True
SECRET_KEY=dev-django-insecure-pms-intern-master-secret-key-2025!
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

DB_NAME=intern_pms_db
DB_USER=intern_pms_user
DB_PASSWORD=intern_pms_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

### 3.3 Database Migrations & Seeding
```bash
# Apply migrations
python manage.py migrate

# Seed realistic demo organization and accounts
python seed_intern_pms.py
```

### 3.4 Start Django Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```
- API Base: `http://localhost:8000/api/`
- Interactive Swagger UI: `http://localhost:8000/api/docs/`
- Django Admin: `http://localhost:8000/admin/`

---

## 4. Frontend Setup (React 19, Vite, TypeScript)

```bash
cd epms_frontend

# Install npm dependencies
npm install

# Verify environment configuration (.env)
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

# Start Vite dev server
npm run dev
```
- Frontend application runs at: `http://localhost:5173/`

---

## 5. Running Automated Tests

Run the complete test suite across all 11 Django apps:
```bash
cd backend
source venv/bin/activate

# Run all application tests
python manage.py test apps --verbosity=2

# Run specific app tests
python manage.py test apps.accounts
python manage.py test apps.performance
python manage.py test apps.reports
```

---

## 6. Code Style & Pre-Commit Checks

- **PEP 8 Compliance:** All code conforms to PEP 8 standards with 4-space indentation and explicit type annotations.
- **Model Cleanliness:**
  - Foreign keys always specify `db_index=True` or use explicit unique indexes.
  - Dates use `timezone.localdate` instead of `timezone.now` for `DateField` defaults.
  - Decimals use `from decimal import Decimal` with `Decimal('0.00')` for validators and default values.
