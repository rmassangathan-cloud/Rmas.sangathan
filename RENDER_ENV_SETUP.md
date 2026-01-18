# 🔧 Render Environment Variables Setup

## Problem:
Render deployment failed because environment variables were not set. Server couldn't bind to port.

## Solution: Set Environment Variables on Render Dashboard

### Step 1: Go to Render Dashboard
1. Login to https://dashboard.render.com
2. Select your service: `human-right-rmas`
3. Go to **Settings** → **Environment**

### Step 2: Add These Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `3000` | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |
| `MONGO_URI` | `mongodb+srv://nhraadmin:OV3dg8fkjOA9xQi2@nhracluster.3zxee8e.mongodb.net/nhradb?retryWrites=true&w=majority` | ✅ Yes |
| `SESSION_SECRET` | `nhra_super_secret_key_2025` | ✅ Yes |
| `SUPERADMIN_PASS` | `Masum@2006` | ✅ Yes |
| `EMAIL_USER` | `human2394right@gmail.com` | ✅ Yes |
| `EMAIL_PASS` | `mgyc jnnk fxum gmzs` | ✅ Yes |
| `APP_URL` | `https://human-right-rmas.onrender.com` | ⚠️ Update when URL is known |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium-browser` | ⚠️ For PDF generation |
| `ENABLE_METRICS` | `true` | Optional |

### Step 3: How to Add Variables

**Option A: One by One**
1. Click "Add Environment Variable"
2. Enter Key: `PORT`
3. Enter Value: `3000`
4. Click "Save"
5. Repeat for each variable

**Option B: Bulk Upload**
1. Click "Bulk Edit"
2. Paste all variables:
```
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://nhraadmin:OV3dg8fkjOA9xQi2@nhracluster.3zxee8e.mongodb.net/nhradb?retryWrites=true&w=majority&appName=NHRACluster
SESSION_SECRET=nhra_super_secret_key_2025
SUPERADMIN_PASS=Masum@2006
EMAIL_USER=human2394right@gmail.com
EMAIL_PASS=mgyc jnnk fxum gmzs
APP_URL=https://human-right-rmas.onrender.com
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENABLE_METRICS=true
```
3. Click "Save"

### Step 4: Redeploy

After setting environment variables:

1. Go to **Deployments** tab
2. Find the failed deployment
3. Click "Retry" or
4. Go to **Settings** → **Deploy** → "Deploy latest commit"

Render will automatically restart with new environment variables.

### Step 5: Monitor Logs

1. Go to **Logs** tab
2. Look for these success messages:
   ```
   ✅ Membership model loaded successfully
   info: Server running on port 3000
   info: Connected to MongoDB Atlas
   ```

3. If you see "No open ports detected", it means PORT variable is missing!

### Step 6: Test the Deployment

Once deployed successfully:

1. Open your Render URL: https://human-right-rmas.onrender.com
2. Login page should load
3. Try login with:
   - Email: `human2394right@gmail.com`
   - Password: (use forgot password to reset)

---

## ⚠️ Important Notes

### PORT Variable
- **Must be set to 3000** (Render's default)
- Do NOT use 5000 (that's for local development)

### MongoDB Connection
- Connection string is already in `.env`
- Ensure IP whitelist on MongoDB Atlas includes Render's IPs
  - Or set IP whitelist to `0.0.0.0/0` (less secure but works)

### Email Configuration
- Using Gmail app password (not regular password)
- Enable "Less secure app access" or use 2FA app password

### Secrets Security
- These values are sensitive - don't share them
- Render encrypts them on their servers
- Never commit `.env` to git (already in `.gitignore`)

---

## Troubleshooting

### Issue: "No open ports detected"
**Cause**: `PORT` environment variable not set or wrong value

**Fix**:
1. Ensure `PORT=3000` is set
2. Check spelling (case-sensitive)
3. Redeploy

### Issue: "Cannot connect to MongoDB"
**Cause**: `MONGO_URI` is incorrect or MongoDB Atlas firewall blocking

**Fix**:
1. Verify `MONGO_URI` syntax
2. Check MongoDB Atlas IP whitelist
3. Add Render IP or set to `0.0.0.0/0`

### Issue: "Email not sending"
**Cause**: Gmail app password issue

**Fix**:
1. Regenerate Gmail app password
2. Update `EMAIL_PASS` on Render
3. Ensure 2FA is enabled on Gmail account

### Issue: "Still showing failed deployment"
**Fix**:
1. Delete all environment variables
2. Set them again carefully
3. Check for typos or extra spaces
4. Redeploy

---

## Success Checklist

- [ ] All 10 environment variables set on Render
- [ ] Deployment shows green checkmark ✅
- [ ] Logs show "Server running on port 3000"
- [ ] Logs show "Connected to MongoDB Atlas"
- [ ] Can access https://human-right-rmas.onrender.com
- [ ] Can login with superadmin
- [ ] Media Dashboard works
- [ ] Reports & Analytics load
- [ ] Audit logs accessible

---

**Status**: 🟡 Waiting for Environment Variables to be set on Render

**Next Step**: Go to Render Dashboard and add the environment variables listed above.
