# 🚀 Render Deployment Guide

## Quick Start

### 1. Prepare for Deployment
```bash
# All cleanup done ✅
# Database: Fresh (only superadmin user)
# PDFs: Deleted
# Media files: Cleaned
# Audit logs: Cleared
```

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New" → "Web Service"
4. Connect GitHub repository
5. Render automatically detects `render.yaml`
6. Add environment variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `MAIL_USER`: Gmail address
   - `MAIL_PASS`: Gmail app password
7. Click "Deploy"

#### Option B: Manual Setup
1. Create new Web Service on Render
2. Configure:
   - **Name**: human-right-rmas
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
3. Add environment variables
4. Deploy

### 3. Environment Variables Needed
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-app-password
NODE_ENV=production
```

### 4. Verify Deployment
1. Open deployed URL
2. Try login with superadmin:
   - Email: human2394right@gmail.com
   - Password: (use forgot password to reset)
3. Check all features:
   - Dashboard
   - Media Dashboard
   - Reports & Analytics
   - Audit Logs

### 5. Production Checklist
- ✅ Database cleaned
- ✅ No sensitive data in git
- ✅ `.env` in `.gitignore`
- ✅ `render.yaml` configured
- ✅ MongoDB URI ready
- ✅ Email credentials ready
- ✅ No hardcoded passwords

### 6. Key Features to Test on Render
1. **Login**: Superadmin login flow
2. **Media Dashboard**: Upload feature
3. **Reports**: Analytics dashboard
4. **Audit Logs**: System activity
5. **Email**: OTP sending for password reset

### 7. Common Issues & Solutions

**Issue**: Cannot connect to MongoDB
- **Solution**: Verify `MONGO_URI` is correct and IP whitelist includes Render's servers

**Issue**: Email not sending
- **Solution**: Use Gmail app password (not regular password), enable "Less secure apps" or 2FA app password

**Issue**: Static files not loading
- **Solution**: Ensure `public/` directory exists and nginx is configured

**Issue**: Port 3000 not responding
- **Solution**: Render uses port 3000 by default, ensure `PORT` env variable is set

### 8. Maintenance
- Monitor logs: Render dashboard → Logs tab
- Check database: MongoDB Atlas dashboard
- Scale if needed: Render → Settings → Plan

### 9. Rollback
- If deployment fails, previous version remains active
- Use Render dashboard to redeploy previous version

---

## Database Backup
Before deployment, ensure MongoDB Atlas backup is enabled:
1. MongoDB Atlas → Backup
2. Enable daily snapshots
3. Test restore procedure

---

**Status**: ✅ Ready for Deployment
**Last Updated**: January 18, 2026
