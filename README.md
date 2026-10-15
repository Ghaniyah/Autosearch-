# Autosearch

An interactive autocomplete search demo built with React, TypeScript, Tailwind CSS, and Vite. It includes debounced search, keyboard navigation, recent searches, simulated network latency and failures, and cancellation of obsolete requests.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production build

```sh
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Using the component

The main interactive demo is implemented in [`src/components/AutocompleteSearch.tsx`](./src/components/AutocompleteSearch.tsx) and mounted by [`src/main.tsx`](./src/main.tsx). The demo uses an in-memory sample dataset and simulated requests; it does not require a backend or API key.

The demo provides:

- Debounced suggestions with configurable delay
- Arrow-key navigation, Enter selection, and Escape dismissal
- Recent-search history
- Adjustable simulated latency and error rate
- Code and architecture documentation views
