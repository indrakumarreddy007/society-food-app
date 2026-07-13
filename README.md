# Society Food Market

Hyperlocal home-chef marketplace MVP designed for apartment societies.

## Included workflows

- **Customer**: browse local dishes, add items to cart, checkout from a dedicated cart page, track order statuses, raise issues.
- **Chef**: publish daily dishes, manage incoming orders, update payment status.
- **Admin**: monitor issue queue and marketplace metrics.

## Tech

- Next.js App Router + TypeScript + Tailwind
- JSON-backed store with validation using `zod`
- Vitest unit tests
- Playwright end-to-end test for core ordering flow

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test commands

```bash
npm run test        # unit tests
npm run test:e2e    # playwright e2e
npm run test:all    # unit + e2e
```

## Data reset

The app uses `src/data/store.json` at runtime and `src/data/store.seed.json` as baseline.

```bash
npm run reset:data
```
