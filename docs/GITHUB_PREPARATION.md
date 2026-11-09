# TRUSTPAY AI — GitHub Repository Preparation & Public Access Guide

This guide ensures the repository is securely organized, free of leaked credentials, and prepared for public hackathon evaluation.

---

## 1. Pre-Commit Security Audit (Zero Secrets Check)

Before publishing the repository, run this command to verify that no secret files or databases are tracked:

```powershell
# 1. Verify git status does not track .env or .db files
git status --ignored

# 2. Confirm .gitignore contains:
# .env
# *.db
# *.sqlite3
# venv/
# node_modules/
```

Verify that `.env` is listed under `.gitignore`:
```gitignore
# Environment Variables & Secrets
.env
.env.local
.env.*.local
*.pem
*.key

# Database
*.db
*.sqlite3
*.sqlite
```

---

## 2. Initializing Git and Creating Main Branch

Run the following commands in the project root directory `d:\TrustPayAI`:

```bash
# 1. Initialize Git repository
git init -b main

# 2. Stage all project files (excluding gitignored artifacts)
git add .

# 3. Check staged files to ensure no secrets are staged
git status

# 4. Commit initial release
git commit -m "feat: complete TRUSTPAY AI autonomous financial control layer (v1.0.0)"
```

---

## 3. Linking to GitHub & Pushing to Public Repository

```bash
# 1. Add your public GitHub remote
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/TrustPayAI.git

# 2. Push to GitHub main branch
git push -u origin main
```

---

## 4. Configuring GitHub Actions CI Workflow

Create `.github/workflows/ci.yml` to automatically verify linting and tests on every pull request and push:

```yaml
name: TRUSTPAY AI CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Run Pytest Suite
        run: |
          pytest -v backend/tests

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Build Vite App
        run: |
          cd frontend
          npm run build
```

---

## 5. Public Repository Checklist

- [x] **License:** Verified MIT License present in root `LICENSE`.
- [x] **Zero Secrets:** `.env` and `trustpay.db` excluded by `.gitignore`.
- [x] **Documentation:** Comprehensive `README.md`, `architecture.md`, `API_DOCUMENTATION.md`, and `DEPLOYMENT_GUIDE.md`.
- [x] **Live Screenshots:** 9 actual application screenshots located in `docs/screenshots/`.
- [x] **Automated Tests:** 66 unit, security audit, and end-to-end integration tests passing with 100% pass rate.
- [x] **Interactive Test Scenarios:** Pre-set prompts for clean purchases, over-budget attempts, unauthorized vendors, and prompt injections available in the Procurement Console.
