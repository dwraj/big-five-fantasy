# Big Five Fantasy — Deployment Guide

## Hosting Options

### **Option 1: Vercel + Railway (Recommended for this project)**

**Frontend: Vercel (Free)**
- Deploy `index.html` to Vercel
- Auto-deploys from git on push
- Zero config needed

**Backend: Railway (Free tier available)**
- Deploy Node.js server
- Built-in environment variables
- $5/month starter tier

**Setup:**
```bash
# 1. Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/big-five-fantasy.git
git branch -M main
git push -u origin main

# 2. Deploy frontend to Vercel
# Go to vercel.com → Import project from GitHub
# Points to: index.html
# No build step needed

# 3. Deploy backend to Railway
# Go to railway.app → New Project → GitHub repo
# Root directory: server/
# Start command: npm start
# Add .env variables from .env.local
```

---

### **Option 2: Netlify + Heroku**

**Frontend: Netlify (Free)**
```bash
npm install -g netlify-cli
netlify deploy
```

**Backend: Heroku (Paid, ~$7/month)**
```bash
heroku create big-five-fantasy
git push heroku main
```

---

### **Option 3: All-in-One: Fly.io**

Single platform for both frontend + backend.

```bash
# Install Fly CLI
curl https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

---

### **Option 4: AWS (More complex, pay-as-you-go)**

- **Frontend:** S3 + CloudFront
- **Backend:** Lambda + API Gateway
- **Database:** Already on Supabase

---

## Recommended: Vercel + Railway Setup (5 minutes)

### **Step 1: Push to GitHub**
```bash
git add .
git commit -m "Initial commit: Big Five Fantasy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/big-five-fantasy.git
git push -u origin main
```

### **Step 2: Deploy Frontend to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repo
4. Leave settings as default
5. Click "Deploy"
6. Frontend is live at `https://big-five-fantasy.vercel.app`

### **Step 3: Deploy Backend to Railway**
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo
4. Configure:
   - **Root Directory:** `server/`
   - **Start Command:** `npm start`
   - **Node Version:** 18
5. Add environment variables:
   - Copy all from `.env.local`
   - Add in Railway dashboard
6. Deploy
7. Backend is live at `https://big-five-fantasy.railway.app`

### **Step 4: Connect Frontend to Backend**
Update `index.html`:
```javascript
const API_URL = 'https://big-five-fantasy.railway.app/api';

// Update fetch calls:
fetch(`${API_URL}/leagues/...`)
```

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Frontend) | $0 | Free tier is generous |
| Railway (Backend) | $0-5 | Free tier, $5/month includes all services |
| Supabase (Database) | $0-50 | Free tier + usage-based |
| API-Football | $10-15 | Required for live data |
| **Total** | **$10-20/mo** | Minimal for small friend group |

---

## Database Setup (One-time)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Run the SQL from `server/scripts/setupDb.js`
5. Tables created ✅

---

## Environment Variables for Production

Add to Railway/Vercel:
```
VITE_SUPABASE_URL=https://erkwiyftgyclqctykiad.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_FOOTBALL_KEY=a4c24a07221cb0cd395292f18e96ce50
PORT=3001
NODE_ENV=production
```

---

## Continuous Deployment

Once set up, just push to GitHub and both Vercel + Railway auto-deploy:
```bash
git add .
git commit -m "Update UI"
git push origin main
# Both services deploy automatically ✅
```

---

## Local Development

```bash
# Terminal 1: Backend
npm install
npm run dev

# Terminal 2: Frontend (if using build tool)
# Or just open http://localhost:8000/index.html
python3 -m http.server 8000

# Terminal 3: Sync data
npm run sync:players
```

---

## Monitoring & Debugging

**Railway:**
- Logs: Dashboard → Deployments → Logs
- Metrics: CPU, Memory, Network

**Vercel:**
- Logs: Dashboard → Deployments → Logs
- Analytics: Page speed, errors

**Supabase:**
- Logs: Dashboard → Logs
- Query Performance: Editor → Explain

---

## Next Steps

1. ✅ Push to GitHub
2. ✅ Deploy frontend to Vercel
3. ✅ Deploy backend to Railway
4. ✅ Set up Supabase schema
5. ✅ Test `/api/health` endpoint
6. ✅ Populate with real data
