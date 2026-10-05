# Contributing to UniEspaços

Thank you for your interest in contributing to UniEspaços! We want to make this project a collaborative effort to solve university space management challenges.

## 🌟 How to Contribute

### 1. Reporting Bugs

Found a bug? Please open an issue on GitHub describing:

- Steps to reproduce.
- Expected behavior vs. actual behavior.
- Screenshots (if applicable).

### 2. Suggesting Features

Have an idea? Open an issue tagged as `enhancement` or discuss it in the existing Roadmap discussions.

### 3. Submitting Code (Pull Requests)

1.  **Create your branch** from `develop` (`git checkout develop && git pull origin develop && git checkout -b feature/amazing-feature`).
2.  **Commit** your changes following our conventional commit format (`feat:`, `fix:`, `perf:`, `chore:`) in Portuguese. Commits must carry only the developer's authorship.
3.  **Run mandatory validations** before pushing:
    - `npx tsc --noEmit` (TypeScript strict check)
    - `npx jest` (Frontend test suite)
    - `docker exec uniespacos-workspace-1 vendor/bin/pint --test` (PHP style check)
    - `docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test` (Backend test suite)
4.  **Push** to your feature branch. Every PR runs the required checks **`🔍 Lint & Static Analysis`** and **`✅ Tests`** (backend + frontend suites, `tests.yml`); both must be green before merge. The test suite also runs daily on `develop`.
5.  **Open a Pull Request** targeting the **`develop`** branch (NEVER target `main`).

## 💻 Development Guidelines

### Code Style

We enforce code standards to keep the codebase clean.

- **PHP (Laravel):** We use [Laravel Pint](https://laravel.com/docs/pint).
    - Run check: `docker exec uniespacos-workspace-1 vendor/bin/pint --test`
    - Fix style: `docker exec uniespacos-workspace-1 vendor/bin/pint`
- **JavaScript / TypeScript / React:** We use ESLint 9 Flat Config (`strict-type-checked`) and Prettier.
    - Run check: `npx tsc --noEmit`
    - Format: `npx prettier --write <file>`
    - **Zero-suppression policy:** `eslint-suppressions.json` holds only legacy debt (check with `npm run lint:debt`). New files or edits must never introduce ESLint suppressions.

### Testing

**All new features and fixes must include tests.**

- **Backend:** PHPUnit via Docker (`docker exec -e APP_ENV=testing uniespacos-workspace-1 php artisan test`). Never use `RefreshDatabase`; always use `DatabaseTransactions`.
- **Frontend:** Jest / React Testing Library (`npx jest`). Jest runs with a fixed timezone (`America/Bahia`, via `jest.global-setup.js`).
- **Clock rule:** never use `now()` / `today()` / `Carbon::now()` (PHP) or `new Date()` / `Date.now()` (Jest) in a test without freezing the clock (`Carbon::setTestNow()` / `jest.useFakeTimers({ now })`, restoring real timers in `afterEach`). Tests that only pass on some days of the month are time bombs.
- **Broadcasting:** `phpunit.xml` forces `BROADCAST_CONNECTION=null`; the suite does not need the Reverb container.

### Commit Messages

Please use clear, descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/) in Portuguese:

- `feat: adiciona nova página de perfil do usuário`
- `fix: corrige fuso horário no calendário`
- `docs: atualiza roadmap`
- `chore: atualiza dependências`

Note: Do not add co-authorship trailers to commits.

## 💬 Community

Join our discussions on GitHub Issues or reach out to the maintainers if you have questions.

Happy Coding! 🚀
