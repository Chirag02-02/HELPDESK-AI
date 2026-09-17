# AI Helpdesk — Frontend (React + Vite)

React SPA that talks to the Spring Boot backend.

## Tech Stack
- React 18 + React Router v6
- Vite (dev server + build)
- Axios with JWT interceptor
- Lucide React icons
- Pure CSS (no Tailwind — ships lighter)

## Pages
| Route | Page | Role |
|-------|------|------|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Customer dashboard | Customer |
| `/chat` | AI chat assistant | Customer |
| `/tickets` | My tickets | Customer |
| `/admin` | Analytics dashboard | Admin/Agent |
| `/admin/tickets` | All tickets management | Admin/Agent |

## Quick start

```bash
cd frontend
npm install
npm run dev
```

App runs on **http://localhost:3000** and proxies `/api` → `http://localhost:8080`.

Make sure your Spring Boot backend is running first.

## Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`. You can serve it with Nginx or configure Spring Boot to serve the static files.

## Environment / proxy

The proxy is configured in `vite.config.js`:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true }
  }
}
```

For production, set the Spring Boot base URL in your deployment config.
