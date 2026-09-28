# UniEspaços

**UniEspaços** is a centralized space management system designed to solve the challenge of decentralized resource allocation in universities.

## 🎓 Project Origin & Context

Born from a Software Engineering course project at UESB, UniEspaços addresses a real-world problem: university spaces are often managed in a decentralized manner, where each sector controls its own rooms, leading to inefficiencies and lack of visibility.

**The Goal:** Create a unified platform where:

- **Sectors** maintain autonomy over their specific spaces and agendas.
- **University Management** gains a centralized, macro view of all resources.
- **Efficiency** is maximized through better allocation, collision prevention, and real-time data visibility.

Currently, the project is in the **MVP (Minimum Viable Product)** phase, being prepared for a pilot test on campus.

## 🚀 Key Features (Current & Planned)

- **Centralized Dashboard:** View and manage spaces across different sectors and buildings.
- **Sector Autonomy:** Granular permissions and agenda management for sector managers.
- **Reservation System:** Conflict detection, periodic and single-date recurrent rules, and multi-step approval workflows.
- **Real-time Updates:** Instant notification and status broadcasts via WebSockets (Laravel Reverb).
- **Future Vision:**
    - Advanced Analytics for space usage optimization.
    - RESTful API for integration with academic ERPs and systems.
    - External Calendar Synchronization (Google/Outlook).
    - Intelligent space allocation recommendations based on demand patterns.

## 🛠️ Tech Stack

- **Backend:** Laravel 12.x (PHP 8.4 / 8.2+) with layered architecture (Controller → Service → Repository)
- **Frontend:** React 19 with Inertia.js 2.0 and TypeScript 5.8 (Atomic Design)
- **Styling & UI:** Tailwind CSS v4 with LightningCSS engine, Catppuccin theming (Latte/Frappé), and Radix UI / Vaul (Drawer)
- **Realtime:** Laravel Reverb (native WebSockets)
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker & Docker Compose
- **CI/CD:** GitHub Actions (Release-please for automated semantic versioning)

## 🏁 Getting Started

The development environment runs PHP, PostgreSQL, Redis, and Reverb inside Docker containers, while frontend tooling and Vite dev server run directly on the host machine for optimal performance.

### Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/) (v20+) & npm
- [Git](https://git-scm.com/)

### Step-by-Step Installation

1. **Clone the repository:**

    ```bash
    git clone git@github.com:uniespacos/uniespacos.git
    cd uniespacos
    ```

2. **Configure environment variables:**

    ```bash
    cp .env.example .env
    ```

3. **Start backend Docker containers:**

    ```bash
    docker compose -f compose.dev.yml up -d
    ```

4. **Initialize backend dependencies and database:**

    Run inside the workspace container:

    ```bash
    # Generate Reverb keys
    docker exec uniespacos-workspace-1 php docker/production/scripts/generate_reverb_keys.php

    # Install PHP dependencies
    docker exec uniespacos-workspace-1 composer install

    # Generate app key and create storage symlink
    docker exec uniespacos-workspace-1 php artisan key:generate
    docker exec uniespacos-workspace-1 php artisan storage:link

    # Run database migrations and seeders
    docker exec uniespacos-workspace-1 php artisan migrate --seed
    ```

5. **Install frontend dependencies and start Vite dev server (on host):**

    ```bash
    npm install
    npm run dev
    ```

6. **Access the application:**
    - **Web App:** [https://localhost/](https://localhost/)
    - **Mailpit (Email inbox):** [http://localhost:8025](http://localhost:8025)
    - **Database Management (Adminer):** [http://localhost:8080](http://localhost:8080)

---

## 🧪 Validations & Testing

Before opening Pull Requests, run the mandatory validation suite:

```bash
# Frontend (run on host)
npx tsc --noEmit                                                         # TypeScript strict check
npx jest                                                                 # Jest unit test suite

# Backend (run via Docker)
docker exec uniespacos-workspace-1 vendor/bin/pint --test                # PHP style check
docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test   # Backend test suite
```

---

## 📚 Documentation & Architecture

Comprehensive technical documentation is available in the [`docs/`](docs/) directory:

- **[Core Workflow & Lifecycle](docs/core-workflow-report.md):** Reservation workflows and system architecture.
- **[Authorization Policies](docs/authorization-policies.md):** Spatie permissions and route protection.
- **[Models & Business Rules](docs/models-business-rules.md):** Eloquent models, accessors, and lifecycle scopes.
- **[Realtime & WebSockets](docs/realtime-websocket-channels.md):** Laravel Reverb channels and Echo event bindings.
- **[Roadmap](docs/ROADMAP.md):** Strategic milestones and planned capabilities.

---

## 🤝 Contributing

We welcome contributions! Please review our [Contributing Guide](CONTRIBUTING.md) for branch policies, commit standards, and submission guidelines. Note that all PRs must target the **`develop`** branch.

---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.

You are free to use, adapt, and share this software for **non-commercial purposes only**, provided you give appropriate credit and distribute your contributions under the same license. See the [LICENSE](LICENSE) file for details.
