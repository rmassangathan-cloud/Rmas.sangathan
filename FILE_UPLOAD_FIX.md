# 🚨 File Upload Issue - Render Deployment

## समस्या:
```
404 (Not Found) - /uploads/photo-1768748862823-821234992.jpg
404 (Not Found) - /uploads/documents-1768748863007-421284461.pdf
```

## कारण:
Render एक **serverless/container platform** है जहाँ:
- Local disk storage **ephemeral** (temporary) है
- हर restart/redeploy पर सभी files delete हो जाते हैं
- `/uploads` और `/pdfs` directories में saved files persist नहीं होती

## अभी का स्थिति (Temporary Fix):
- ✅ Missing files के लिए proper 404 response दिया जाता है
- ✅ Application crash नहीं होगी
- ⚠️ लेकिन uploaded files lost हो जाएंगी जब server restart हो

## स्थायी समाधान (Permanent Solutions):

### Option 1: Cloudinary (सबसे आसान) ⭐
```
1. https://cloudinary.com/ पर जाएं
2. Free account बनाएं
3. Dashboard से ये credentials लें:
   - Cloud Name
   - API Key
   - API Secret

4. .env में add करें:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

5. npm install cloudinary multer-storage-cloudinary

6. middleware/mediaUpload.js update करें (नीचे code है)
```

### Option 2: AWS S3
- ज्यादा control लेकिन complex setup
- Free tier: 5GB per month

### Option 3: MongoDB GridFS
- Database में files store करें
- Performance issues हो सकते हैं

## Cloudinary Integration Code:

### .env:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### middleware/mediaUpload-cloudinary.js:
```javascript
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'RMAS/uploads',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'pdf']
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = upload;
```

### फिर admin.js में:
```javascript
// पहले से:
const mediaUpload = require('../middleware/mediaUpload');

// Change करें:
const mediaUpload = require('../middleware/mediaUpload-cloudinary');
```

## अभी के लिए करने वाली चीज़ें:

✅ Local development में test करें:
```bash
npm install cloudinary multer-storage-cloudinary
```

✅ Cloudinary account बनाएं

✅ `.env` में credentials add करें

✅ mediaUpload.js update करें

✅ Push करें Render को

✅ अब सभी uploads Cloudinary में जाएंगे (persistent)

## Testing:
1. Application join करें
2. Photo upload करें
3. Server restart करें
4. Photo अब भी दिखेगी ✅

---

**क्या इसे करना है अभी?** बताओ, मैं पूरा setup कर दूंगा।
