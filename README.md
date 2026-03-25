# ETL Failure Prediction Frontend

Frontend for an ETL failure prediction and root-cause analysis assistant.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Axios
- Lucide icons

## Run Locally

Prerequisite: Node.js 18+

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env.local`
   - Set `VITE_API_BASE_URL` to your backend URL
3. Start development server:
   - `npm run dev`

## Build

- `npm run build`

## API Contract (current)

- `POST /predict`
- `GET /runs?limit=50`
