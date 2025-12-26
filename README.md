# NHRA Human Rights Association Website

A production-ready Node.js + Express + EJS + Puppeteer + MongoDB application for managing human rights association memberships and administrative operations.

## 🚀 Features

- **Hierarchical Admin System**: State → Division → District → Block level administration
- **Team Management**: 5 parallel teams (Core, Mahila, Yuva, Alpsankhyak, SC/ST) at each level
- **PDF Generation**: Automated membership certificates with QR codes
- **Structured Logging**: Winston with daily rotation and JSON formatting
- **Prometheus Metrics**: Request monitoring and performance tracking
- **Security**: Helmet, CORS, rate limiting, input validation
- **Container Ready**: Multi-stage Docker build with Chromium for Puppeteer

## 🐳 Docker Setup

### Prerequisites
- Docker and Docker Compose installed
- Git

### Local Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone https://github.com/human2394right-dotcom/NHRA.git
   cd NHRA
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Website: http://localhost:5000
   - Health check: http://localhost:5000/health
   - Metrics: http://localhost:5000/metrics (if enabled)
   - MongoDB: localhost:27017

### Production Docker Build

```bash
# Build the image
docker build -t nhra-website .

# Run the container
docker run -p 5000:5000 \
  -e MONGO_URI="your-mongodb-uri" \
  -e SESSION_SECRET="your-secret" \
  -e SUPERADMIN_PASS="admin-password" \
  -e EMAIL_USER="your-email@gmail.com" \
  -e EMAIL_PASS="your-app-password" \
  nhra-website
```

## 🔧 Manual Setup (Without Docker)

### Prerequisites
- Node.js 20+
- MongoDB
- Chromium (for PDF generation)

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/human2394right-dotcom/NHRA.git
   cd NHRA
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Install Puppeteer browsers**
   ```bash
   npx puppeteer browsers install chrome
   ```

4. **Start the application**
   ```bash
   # Development
   npm run dev

   # Production with PM2
   npm run pm2:start

   # Production with Node
   npm start
   ```

## 📊 Monitoring & Management

### PM2 Commands
```bash
npm run pm2:start    # Start production cluster
npm run pm2:stop     # Stop application
npm run pm2:restart  # Restart application
npm run pm2:logs     # View logs
npm run pm2:monitor  # Monitor performance
```

### Health Checks
- **Application**: `GET /health` - Returns uptime and status
- **Metrics**: `GET /metrics` - Prometheus metrics (if enabled)

### Logs
- Application logs: `./logs/app-YYYY-MM-DD.log`
- Error logs: `./logs/exceptions-YYYY-MM-DD.log`
- PM2 logs: `./logs/pm2-*.log`

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nhra

# Security
SESSION_SECRET=your-super-secure-session-secret-here
SUPERADMIN_PASS=your-secure-admin-password

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Optional
ENABLE_CORS=false
ENABLE_METRICS=true
RATE_LIMIT_MAX=100
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Render.com (Recommended)
1. Connect your GitHub repository
2. Set build command: `npm install && npx puppeteer browsers install chrome`
3. Set start command: `npm start`
4. Configure environment variables in Render dashboard
5. Deploy!

### Manual Server Deployment
```bash
# Install dependencies
npm ci --only=production

# Install PM2 globally (optional)
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Or start directly
npm start
```

## 🏗️ Architecture

- **Frontend**: EJS templates with Express layouts
- **Backend**: Express.js with middleware stack
- **Database**: MongoDB with Mongoose ODM
- **PDF Generation**: Puppeteer with Chromium
- **Logging**: Winston with daily rotation
- **Metrics**: Prometheus client
- **Process Management**: PM2 for production
- **Containerization**: Docker with multi-stage builds

## 📁 Project Structure

```
├── middleware/          # Express middleware
├── models/             # Mongoose models
├── public/             # Static assets
│   ├── css/
│   ├── images/
│   ├── locations/      # Bihar districts/blocks data
│   └── uploads/        # User uploaded files
├── routes/             # Express routes
├── scripts/            # Utility scripts
├── tests/              # Jest test files
├── utils/              # Utility functions
│   ├── logger.js       # Winston logger
│   └── mailer.js       # Email service
├── views/              # EJS templates
├── .env.example        # Environment template
├── .gitignore         # Git ignore rules
├── .dockerignore      # Docker ignore rules
├── docker-compose.yml # Local development
├── Dockerfile         # Production container
├── ecosystem.config.js # PM2 configuration
├── jest.config.js     # Test configuration
├── package.json       # Dependencies and scripts
└── index.js           # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see package.json for details.

## 📞 Support

For support or questions, please contact the development team.

---

**Made with ❤️ for Human Rights Awareness**