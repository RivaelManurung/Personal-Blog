# AshGray — Modern Editorial Blog Monorepo

[![Next.js 16](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Go Fiber](https://img.shields.io/badge/Go%201.26-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://gofiber.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2018-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**AshGray** is a premium, full-stack personal blogging and editorial platform designed with a focus on typography, aesthetic elegance, and high-performance architecture. Built as a clean monorepo combining a **Next.js (App Router)** frontend with a **Go (Fiber)** REST API and **PostgreSQL** database.

---

## ✨ Key Features

### 🎨 Frontend (`/frontend`)
- **Full-Width Editorial Layout**: Edge-to-edge responsive layout with sticky glassmorphism navigation (`backdrop-blur-md`) and refined editorial typography.
- **Dynamic Theme System**: Seamless light/dark mode switching with curated HSL color palettes and smooth micro-interactions.
- **Bento Grid & Interactive UI**: Modern card layouts for featured articles, category pills, reading time estimators, and instant search.
- **Complete Admin Dashboard**: 
  - Rich Text & Markdown editor with syntax highlighting and live preview.
  - Media management (upload cover/OG images with drag-and-drop).
  - Taxonomy manager for categories and tags.
  - Live system status indicators and protected authentication routes.
- **Instant Cache Revalidation (ISR)**: Integrated webhook engine that automatically clears static page caches immediately when an article is published or edited.

### ⚡ Backend (`/backend`)
- **High-Performance Go API**: Built with Fiber, utilizing a modular layer architecture (`handlers`, `service`, `repository`, `models`).
- **Secure Authentication**: JWT-based admin authentication featuring short-lived access tokens and refresh token rotation.
- **Database & Migrations**: Powered by PostgreSQL with automated database migration (`golang-migrate`) and an idempotent admin seeder on boot.
- **Media Storage**: Extensible storage driver supporting local filesystem uploads (`/uploads`) with readiness for S3 integration.
- **Automated Webhook Triggers**: Fires constant-time authenticated revalidation payloads to the Next.js frontend upon content modifications.

---

## 📁 Monorepo Structure

```text
├── frontend/             # Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui
│   ├── src/app/          # (site) public blog pages & (admin) dashboard routes
│   ├── src/components/   # Bento grid, editorial prose, navigation, and UI components
│   └── src/features/     # Post editor, taxonomy manager, and auth modules
├── backend/              # Go 1.26 REST API Server
│   ├── cmd/              # Entry points: server, migrate, and seed
│   ├── internal/         # API layers: config, database, handlers, middleware, service
│   └── migrations/       # SQL up/down migration schemas
├── docs/                 # Architectural audits and engineering notes
├── docker-compose.yml    # Production & local multi-container Docker setup
└── .env.docker.example   # Root environment variables template for Docker
```

---

## 🚀 Getting Started

You can run the entire stack effortlessly using **Docker Compose** or run each service manually for active local development.

### Option A: Docker Compose (Recommended)

1. **Clone & Configure**:
   ```bash
   git clone https://github.com/RivaelManurung/Personal-Blog.git
   cd Personal-Blog
   cp .env.docker.example .env
   ```
2. **Start the Stack**:
   ```bash
   docker compose up --build
   ```
   *This automatically brings up PostgreSQL 18, runs database migrations, seeds the default admin user, starts the Go backend on port `8080`, and serves the Next.js frontend on port `3000`.*

3. **Access the App**:
   - **Public Site**: [http://localhost:3000](http://localhost:3000)
   - **Admin Dashboard**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - **Backend API**: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

---

### Option B: Local Development Setup

#### 1. Database Setup
Ensure PostgreSQL is running locally (or spin up the standalone Docker container):
```bash
docker start blog-pg # if using existing container mapped to port 5434
```

#### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env to match your DB credentials (e.g., port 5434 or 5432)

# Run database migrations and seed default admin
go run ./cmd/migrate up
go run ./cmd/seed

# Start the Go API server
go run ./cmd/server
```
*Server will listen on `http://localhost:8080`.*

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
cp .env.example .env.local
# Ensure BACKEND_URL=http://localhost:8080 and REVALIDATE_SECRET=change-me

# Install dependencies and start development server
npm install
npm run dev
```
*Frontend will be available at `http://localhost:3000`.*

---

## 🔐 Default Credentials

When running the seeder (`go run ./cmd/seed` or Docker initial boot), an admin account is created automatically:

- **Email**: `admin@ashgray.blog` *(or `admin@example.com` depending on `.env`)*
- **Password**: `SuperAdmin123!` *(or `change-me-please` in `.env.example`)*

> [!WARNING]
> Please rotate the admin password immediately after logging into the dashboard for the first time in any production or publicly exposed environment.

---

## 🔄 Webhook & Cache Revalidation Flow

To provide instant updates without sacrificing static page generation (SSG/ISR) speed:

1. When an article is created, updated, or deleted via the **Admin Dashboard**, the frontend calls the Go API (`PUT /api/v1/admin/posts/:id`).
2. The Go backend commits the transaction and triggers an asynchronous `POST` request to the Next.js webhook: `http://localhost:3000/api/revalidate`.
3. The request is signed with `x-revalidate-secret` matching `REVALIDATE_SECRET`.
4. Next.js validates the secret using constant-time comparison and calls `revalidateTag()`, immediately expiring cached pages (`post:slug`, `posts`, `category:slug`).
5. Visitors see the updated content instantly on their next page load!

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
