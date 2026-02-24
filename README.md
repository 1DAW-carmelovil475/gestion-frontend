# Hola Informática - Frontend React

Frontend migrated from plain HTML/CSS/JS to React.

## Tech Stack
- React 18
- Vite
- React Router DOM
- XLSX (for Excel export)

## Getting Started

1. Install dependencies:
```
bash
npm install
```

2. Run development server:
```
bash
npm run dev
```

3. Build for production:
```
bash
npm run build
```

## Project Structure
```
src/
├── context/        # Auth context
├── pages/          # Page components (Login, Dashboard, Tickets, Estadisticas, Chat)
├── services/       # API services
├── App.jsx         # Main app with routing
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## Configuration
- API URL is configured in `src/services/api.js`
- Update `API_URL` to point to your backend

## Features
- Login with Supabase Auth
- Company management (CRUD)
- IT equipment management
- Tickets system with comments and files
- Statistics dashboard (admin only)
- Internal chat
