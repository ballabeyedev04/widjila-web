# Admin - React.js Frontend

## Project Overview
Admin dashboard for the "Suivi Chantier" (Construction Site Tracking) application. Built with React, Vite, and modern React patterns.

## Technology Stack
- **Framework**: React 18+
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context + Hooks (useReducer, useContext)
- **Styling**: CSS Modules / Plain CSS (index.css)
- **HTTP Client**: Axios/Fetch (in `src/service/`)
- **Linting**: ESLint (eslint.config.js)
- **Package Manager**: npm

## Project Structure
```
admin/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root component
│   ├── index.css                # Global styles
│   ├── assets/                  # Static assets (images, fonts)
│   ├── components/              # Reusable UI components
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom React hooks
│   ├── layouts/                 # Page layouts (sidebar, header, etc.)
│   ├── pages/                   # Page components (routes)
│   ├── routes/                  # Route configuration
│   ├── service/                 # API service layer
│   └── utils/                   # Utility functions
├── public/                      # Public assets (favicon, etc.)
├── dist/                        # Production build output
├── node_modules/                # Dependencies
├── .env                         # Environment variables
├── .env.example                 # Example environment variables
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Vite configuration
├── eslint.config.js             # ESLint configuration
└── index.html                   # HTML template
```

## Development Commands

### Install Dependencies
```bash
cd /c/Users/vPro/Desktop/suivie_chantier/admin
npm install
```

### Start Development Server
```bash
npm run dev
# Starts Vite dev server at http://localhost:5173
```

### Build for Production
```bash
npm run build
# Outputs to dist/
```

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

## Environment Variables
Key variables in `.env`:
- `VITE_API_URL` - Backend API base URL (e.g., http://localhost:3000/api)
- `VITE_APP_TITLE` - Application title

## Architecture Patterns

### Component Structure
```
components/
├── ui/                    # Base UI components (Button, Input, Modal, etc.)
├── forms/                 # Form-specific components
├── tables/                # Table/DataGrid components
├── charts/                # Chart components
└── layout/                # Layout components (Sidebar, Header, Footer)
```

### Pages & Routing
- Routes defined in `src/routes/`
- Each page in `src/pages/` corresponds to a route
- Layouts in `src/layouts/` wrap pages (auth layout, dashboard layout)

### State Management
- **Global State**: React Context in `src/context/` (AuthContext, ProjectContext, etc.)
- **Local State**: useState, useReducer in components
- **Server State**: Custom hooks in `src/hooks/` (useFetch, useMutation, etc.)

### API Service Layer
- `src/service/api.js` - Axios instance with interceptors
- `src/service/endpoints.js` - API endpoint definitions
- `src/service/authService.js` - Authentication API calls
- Services export functions for each API operation

### Custom Hooks (in `src/hooks/`)
- `useAuth()` - Authentication state & actions
- `useFetch(url)` - Data fetching with loading/error states
- `useMutation(fn)` - Mutation helper with optimistic updates
- `useDebounce(value, delay)` - Debounced values
- `useLocalStorage(key, initialValue)` - Persisted state

## Available Skills (in `.claude/skills/`)
- **vercel-react-best-practices** - React performance optimization patterns from Vercel
- **web-design-guidelines** - UI/UX compliance checking
- **vercel-react-view-transitions** - Page transitions & animations
- **writing-guidelines** - Documentation standards

## Key Files to Know
- `src/main.jsx` - App entry, provider setup
- `src/App.jsx` - Root component, router setup
- `src/routes/index.js` - Route definitions
- `src/service/api.js` - HTTP client configuration
- `src/context/AuthContext.jsx` - Authentication state
- `vite.config.js` - Build configuration

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/FeatureName/FeatureName.jsx`
2. Add route in `src/routes/index.js`
3. Add navigation link in layout/sidebar
4. Create any needed components in `src/components/`

### Adding a New Component
1. Create in appropriate folder under `src/components/`
2. Export from index.js if needed
3. Follow naming: PascalCase for components, camelCase for hooks/utils

### API Integration
1. Add endpoint to `src/service/endpoints.js`
2. Create service function in `src/service/featureService.js`
3. Create custom hook in `src/hooks/useFeature.js`
4. Use hook in component

### Styling
- Global styles in `src/index.css`
- Component-scoped: CSS Modules (`Component.module.css`) or co-located CSS
- CSS Variables for theming (defined in index.css)

## React Best Practices (enforced by skills)

### Performance
- Use `React.memo()` for pure components
- Use `useCallback`/`useMemo` for expensive computations
- Lazy load pages with `React.lazy()` + `Suspense`
- Virtualize long lists (react-window)

### Component Design
- Prefer composition over inheritance
- Use compound components pattern for complex UI
- Keep components small and focused
- Type props with PropTypes or TypeScript (if migrated)

### State Management
- Colocate state to where it's used
- Lift state up only when necessary
- Use Context sparingly (avoid for high-frequency updates)
- Prefer controlled components

### Data Fetching
- Use custom hooks for data fetching logic
- Implement loading, error, empty states
- Cache with React Query / SWR patterns (or custom solution)
- Handle race conditions with AbortController

## Deployment Checklist
- [ ] `npm run build` succeeds
- [ ] Environment variables set for production
- [ ] API URL points to production backend
- [ ] Static assets served correctly
- [ ] SPA routing configured on server (fallback to index.html)
- [ ] Bundle size analyzed (`npm run build -- --analyze`)

## Vite Configuration Notes
- `vite.config.js` handles:
  - React plugin
  - Path aliases (@/ → src/)
  - Proxy for API calls in dev
  - Build optimization (code splitting, minification)