# Legacy Sim UI

Web interface for the Legacy combat simulator.

## Setup

```bash
cd ui
npm install
```

## Development

Run the API server and Vite dev server together:

```bash
# Terminal 1: API server
npm run server

# Terminal 2: Vite dev server (proxies /api to port 3000)
npm run dev
```

Then open http://localhost:5173

## Production

Build and serve from a single process:

```bash
npm start
```

Then open http://localhost:3000

## Usage

1. Select or customize your attacker build using the equipment slots
2. Click a crystal from the palette, then click equipment crystal slots to assign it
3. Choose which defenders to simulate against
4. Set trial count and attack type
5. Click **Run Simulation**
6. Results appear sorted by win% with per-defender breakdown
