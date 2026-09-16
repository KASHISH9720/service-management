# Helper4U deployment note

The frontend uses a classic `<script src="app.js">` on its multi-page HTML site.
The production API URL is injected through Vite's `%VITE_API_URL%` HTML replacement
into `window.HELPER4U_API`, so the existing JavaScript navbar is preserved.

Vercel:
- Root Directory: `client`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

Render:
- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
