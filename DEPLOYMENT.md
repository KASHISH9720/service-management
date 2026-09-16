# Helper4U deployment (Vercel + Render + MongoDB Atlas)

## Architecture
- `client/` -> Vercel (Vite multi-page static frontend)
- `server/` -> Render (Node.js + Express API)
- MongoDB Atlas -> existing `ecommerce-cluster`, database name `helper4u`

## MongoDB URI
Use this shape in Render, replacing `<DB_PASSWORD>` with the password of the Atlas database user `helper4u`:

`mongodb+srv://helper4u:<DB_PASSWORD>@ecommerce-cluster.6bsye33.mongodb.net/helper4u?appName=ecommerce-cluster`

Do not put `:27017` in an `mongodb+srv://` URI.

## Render
1. Import the GitHub repository as a Web Service.
2. Root Directory: `server`
3. Build Command: `npm ci`
4. Start Command: `npm start`
5. Environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=<the Atlas URI above>`
   - `JWT_SECRET=<long random secret>`
   - `CLIENT_URL=<your Vercel URL>`
6. Deploy.
7. Test: `https://YOUR-RENDER-SERVICE.onrender.com/api/health`

## Vercel
1. Import the same GitHub repository.
2. Root Directory: `client`
3. Framework: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment variable: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
7. Deploy/redeploy after saving the variable.

The Vite config is already set up to build all HTML pages, not only `index.html`.

## Security
- Never commit `.env` or a real MongoDB password.
- If a database password was posted publicly, rotate it in Atlas before deployment.
