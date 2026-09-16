# MongoDB Setup

The backend now stores all data in **MongoDB** (via Mongoose). You must have a
MongoDB connection available before starting the server.

## Option A — Local MongoDB (recommended for development)

1. Install MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Start the MongoDB service so it is running in the background:
   - Windows: MongoDB is usually installed as a Windows Service and starts automatically.
     You can check/start it from `services.msc` (look for "MongoDB Server").
   - Mac: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`
3. No extra config needed — `server/.env.example` already points to:
   ```text
   MONGODB_URI=mongodb://127.0.0.1:27017/helper4u
   ```

## Option B — MongoDB Atlas (free cloud database, no local install)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Under "Database Access", create a database user with a username/password.
3. Under "Network Access", allow your current IP (or `0.0.0.0/0` for development).
4. Copy the connection string and put it in `server/.env`:
   ```env
   PORT=5000
   JWT_SECRET=replace-with-a-long-random-secret
   MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/helper4u
   ```

Never commit a real `.env` file or database password to Git.

## Verifying the connection

When you run `npm run dev` inside `server/`, you should see:

```text
MongoDB connected successfully -> mongodb://127.0.0.1:27017/helper4u
Demo verified helpers are ready.
Helper4U API running at http://localhost:5000 (connected to MongoDB)
```

If MongoDB is not running or the connection string is wrong, the server will
print a clear English error message and stop — it will not silently fail.
