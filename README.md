# National Human Rights Association (NHRA) Initiative

A comprehensive digital platform for the National Human Rights Association (NHRA) in Bihar, India, designed to streamline membership management, administrative operations, and human rights advocacy through a hierarchical organizational structure.

## 📋 Description

The NHRA Initiative is a full-stack web application that digitizes and modernizes the operations of a human rights association. The platform enables:

- **Membership Management**: Streamlined application process with document verification
- **Hierarchical Administration**: Multi-level admin system (State → Division → District → Block)
- **Team Organization**: 5 specialized teams (Core, Mahila/Women, Yuva/Youth, Alpsankhyak/Minority, SC/ST)
- **Document Automation**: PDF certificate generation with QR code verification
- **Secure Operations**: Production-ready with monitoring, logging, and containerization

**Problem Solved**: Traditional paper-based NGO operations are inefficient, prone to errors, and lack scalability. This platform provides a digital solution for membership tracking, administrative oversight, and operational transparency.

**Main Goals**:
- ✅ Digitize membership application and verification process
- ✅ Implement hierarchical administrative control
- ✅ Enable automated document generation and distribution
- ✅ Provide real-time monitoring and reporting capabilities
- ✅ Ensure data security and operational transparency

## 📊 Current Status (~85% Complete)

### ✅ **Completed Features**
- **Core Application Framework**: Node.js + Express + EJS architecture
- **Database Integration**: MongoDB with Mongoose ODM
- **User Authentication**: Session-based admin authentication system
- **Membership System**: Complete application form with file uploads
- **Hierarchical Admin Panel**: Multi-level user management with cascade permissions
- **Team Management**: 5-team structure with role assignments
- **PDF Generation**: Automated certificates with QR codes using Puppeteer
- **Responsive SVG Headers**: Diagonal background SVGs for website, joining letters, and ID cards
- **Security Implementation**: Helmet, CORS, rate limiting, input validation
- **Logging System**: Winston with daily rotation and structured JSON logs
- **Metrics & Monitoring**: Prometheus integration with request tracking
- **Serverless Deployment**: Vercel-compatible with Puppeteer support
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Testing Framework**: Jest + Supertest with basic test coverage
- **Local Development**: Docker Compose setup with MongoDB

### ⏳ **Pending Features (15%)**
- **Content Development**: Human rights educational content and resources
- **Legal Compliance**: GDPR/data protection compliance implementation
- **Advanced Security**: Multi-factor authentication, audit trails
- **Performance Optimization**: Database indexing, caching strategies
- **Production Monitoring**: External logging aggregation (Datadog/Papertrail)
- **Backup Systems**: Automated database backups and restore procedures
- **API Documentation**: Swagger/OpenAPI specifications
- **Mobile Responsiveness**: Enhanced mobile UI/UX
- **Multi-language Support**: Complete Hindi/English localization
- **Analytics Dashboard**: Advanced reporting and insights

## ✨ Features

### ✅ **Implemented Features**
- **Hierarchical Administration**: State → Division → District → Block level access control
- **Team Structure**: Core, Mahila, Yuva, Alpsankhyak, SC/ST teams at each level
- **Membership Application**: Multi-step form with document upload and validation
- **PDF Certificate Generation**: Automated joining letters with QR verification
- **Admin Dashboard**: Comprehensive user and application management
- **Role-based Permissions**: Cascade authority with granular access control
- **File Upload System**: Secure document storage with size/type validation
- **Email Notifications**: Automated communication for application status
- **Health Monitoring**: Application health checks and uptime tracking
- **Prometheus Metrics**: Request duration, error rates, and performance monitoring
- **Structured Logging**: JSON-formatted logs with daily rotation
- **Serverless Deployment**: Vercel-compatible with Puppeteer for PDF generation
- **Automated Testing**: Unit and integration tests with coverage reporting
- **CI/CD Pipeline**: GitHub Actions with automated deployment

### ⏳ **Planned Features**
- **Content Management System**: Dynamic human rights content and resources
- **Advanced Analytics**: Membership trends and organizational insights
- **Mobile Application**: React Native companion app
- **Offline Capabilities**: Progressive Web App features
- **Integration APIs**: Third-party service integrations
- **Advanced Reporting**: Custom report generation and export
- **Notification System**: Push notifications and alerts
- **Audit System**: Complete activity logging and compliance tracking

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js 20+ with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Express-session with secure cookie management
- **PDF Generation**: Puppeteer with Chromium for headless browsing
- **Email Service**: Nodemailer with Gmail SMTP
- **Process Management**: PM2 for production clustering

### **Frontend**
- **Templates**: EJS with Express Layouts
- **Styling**: Custom CSS with responsive design
- **Forms**: Client-side validation with server-side processing
- **File Uploads**: Multer middleware for secure file handling

### **DevOps & Infrastructure**
- **Serverless**: Vercel for deployment
- **CI/CD**: GitHub Actions with automated workflows
- **Monitoring**: Prometheus metrics and Winston logging
- **Deployment**: Vercel with auto-scaling

### **Security & Quality**
- **Security Headers**: Helmet.js for HTTP security
- **Rate Limiting**: Express rate limit middleware
- **Input Validation**: Express-validator for data sanitization
- **CORS**: Configurable cross-origin resource sharing
- **Testing**: Jest with Supertest for API testing
- **Code Quality**: ESLint configuration

### **Development Tools**
- **Version Control**: Git with GitHub
- **Package Management**: npm with package-lock.json
- **Environment Management**: dotenv for configuration
- **Development Server**: Nodemon for hot reloading
- **API Testing**: Postman/Insomnia for endpoint testing

## 📁 Project Structure

```
nhra-website/
├── 📁 middleware/           # Express middleware (auth, role validation)
│   ├── auth.js             # Authentication middleware
│   └── role.js             # Role-based access control
├── 📁 models/              # Mongoose database models
│   ├── User.js             # Admin user model
│   ├── Membership.js       # Membership application model
│   └── Member.js           # Legacy member model
├── 📁 public/              # Static assets
│   ├── css/                # Stylesheets
│   ├── images/             # Static images and logos
│   ├── locations/          # Bihar administrative data (JSON)
│   │   ├── bihar_blocks.json
│   │   └── bihar_divisions.json
│   └── uploads/            # User-uploaded files (ignored in git)
├── 📁 routes/              # Express route handlers
│   ├── admin.js            # Admin panel routes
│   ├── auth.js             # Authentication routes
│   ├── pages.js            # Public page routes
│   └── public.js           # Public API routes
├── 📁 scripts/             # Utility scripts
│   ├── create_superadmin.js
│   ├── clean_except_superadmin.js
│   └── migrate_users_to_cascade.js
├── 📁 tests/               # Test files
│   ├── setup.js            # Test configuration
│   └── app.test.js         # Application tests
├── 📁 utils/               # Utility functions
│   ├── logger.js           # Winston logging configuration
│   └── mailer.js           # Email service (placeholder)
├── 📁 views/               # EJS templates
│   ├── admin/              # Admin panel templates
│   ├── partials/           # Reusable template components
│   ├── pdf/                # PDF templates
│   ├── about.ejs
│   ├── contact.ejs
│   ├── donate.ejs
│   ├── gallery.ejs
│   ├── index.ejs           # Homepage
│   ├── join.ejs            # Membership application
│   ├── layout.ejs          # Main layout
│   ├── login.ejs           # Admin login
│   ├── news.ejs
│   ├── team.ejs            # Team display page
│   └── verify.ejs          # Membership verification
├── 📄 .env.example         # Environment variables template
├── 📄 .gitignore           # Git exclusions
├── ⚙️ vercel.json          # Vercel deployment configuration
├── 🧪 jest.config.js       # Testing configuration
├── 📦 package.json         # Dependencies and scripts
├── 🔧 prepare_puppeteer_env.sh  # Puppeteer setup script
├── ✅ PRODUCTION_CHECKLIST.md   # Development checklist
└── 🚀 index.js             # Application entry point
```

## ⚙️ Setup & Installation

### **Prerequisites**
- Node.js 20+ and npm 7+
- MongoDB (cloud instance like MongoDB Atlas)
- Git
- Vercel account for deployment

### **Quick Start with Vercel (Recommended)**

1. **Clone the repository**
    ```bash
    git clone https://github.com/human2394right-dotcom/NHRA.git
    cd NHRA
    ```

2. **Configure environment**
    ```bash
    cp .env.example .env
    # Edit .env with your MongoDB URI and other settings
    ```

3. **Install dependencies**
    ```bash
    npm install
    ```

4. **Deploy to Vercel**
    ```bash
    npx vercel --prod
    ```
    Follow the prompts to link your GitHub repo and set environment variables.

5. **Access the application**
    - Vercel will provide the deployment URL
    - **Health Check**: /health
    - **Metrics**: /metrics (if enabled)

### **Manual Installation (Development)**

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Configure your .env file
   ```

3. **Install Puppeteer browsers**
   ```bash
   npx puppeteer browsers install chrome
   ```

4. **Start development server**
   ```bash
   npm run dev  # With hot reload
   ```

## 🏃‍♂️ How to Run/Test

### **Development Mode**
```bash
npm run dev  # Nodemon with hot reload
```

### **Production Mode**
The app is configured for Vercel serverless deployment. Push to main branch to deploy automatically.

### **Testing**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### **Local Development**
```bash
# Start development server
npm run dev

# Direct start
npm start
```

## 🔑 Key Functionalities Explained

### **1. Hierarchical Administration System**
- **Structure**: State → Division → District → Block levels
- **Permissions**: Cascade authority where higher levels control lower levels
- **Teams**: 5 specialized teams at each administrative level
- **Access Control**: Role-based permissions with granular control

### **2. Membership Application Process**
- **Multi-step Form**: Comprehensive application with validation
- **Document Upload**: Secure file handling with type/size validation
- **Auto-assignment**: Automatic division assignment based on district
- **Email Notifications**: Automated status updates to applicants

### **3. PDF Certificate Generation**
- **Puppeteer Integration**: Headless Chrome for PDF creation
- **QR Code Generation**: Unique verification codes for each certificate
- **Template System**: EJS-based PDF templates with dynamic content
- **Secure Storage**: Generated PDFs stored in dedicated directories

### **4. Admin Dashboard**
- **Application Management**: Review, approve, reject applications
- **User Management**: Create/edit admin users with role assignments
- **Team Organization**: Assign members to specific teams and roles
- **Audit Trail**: Complete activity logging for compliance

### **5. Monitoring & Observability**
- **Health Checks**: Application uptime and dependency monitoring
- **Prometheus Metrics**: Request tracking, error rates, performance data
- **Structured Logging**: JSON-formatted logs with daily rotation
- **Error Handling**: Comprehensive error tracking and reporting

## 🚧 Challenges Faced

### **Current Issues**
- **Serverless Puppeteer**: Ensuring PDF generation works in Vercel environment
- **Environment Configuration**: Complex cascade permission system
- **File Upload Security**: Balancing usability with security requirements

### **Resolved Challenges**
- ✅ **Hierarchical Permissions**: Complex cascade authority implementation
- ✅ **PDF Generation**: Puppeteer configuration for serverless environments
- ✅ **Session Management**: Secure authentication with role-based access
- ✅ **Vercel Deployment**: Converted from Docker/PM2 to serverless

### **Known Limitations**
- **Content Management**: Static content requires manual updates
- **Mobile Experience**: Limited responsive design optimization
- **Performance**: No caching layer implemented yet
- **Backup Strategy**: Manual backup procedures only

## 🎯 Next Steps / Help Needed

### **High Priority (Immediate)**
1. **Content Development**: Create comprehensive human rights educational content
2. **Legal Compliance**: Implement data protection and privacy compliance features
3. **Performance Optimization**: Add Redis caching and database indexing
4. **Mobile Optimization**: Enhance responsive design for mobile devices

### **Medium Priority**
1. **Advanced Analytics**: Implement user behavior tracking and reporting
2. **API Documentation**: Create comprehensive API documentation with Swagger
3. **Integration APIs**: Develop third-party service integrations
4. **Automated Backups**: Implement scheduled database backups

### **Low Priority**
1. **Multi-language Support**: Complete Hindi localization
2. **Progressive Web App**: Add offline capabilities
3. **Advanced Security**: Implement multi-factor authentication
4. **Mobile Application**: Develop React Native companion app

### **Specific Help Needed**
- **Content Creation**: Human rights subject matter experts for educational content
- **Legal Consultation**: Data protection and NGO compliance expertise
- **UI/UX Design**: Professional design for improved user experience
- **DevOps Support**: Production deployment and monitoring setup
- **Testing Assistance**: Comprehensive test coverage and QA processes

## 📸 Screenshots

*Screenshots will be added once the application reaches production deployment*

## 👥 Contributors

- **Primary Developer**: Main developer focused on technical implementation
- **Project Sponsor**: NHRA organization leadership
- **Future Contributors**: Open for community contributions

## 📄 License

ISC License - A permissive license suitable for open-source NGO projects.

## 📞 Contact

**For technical support or questions:**
- Create an issue on the GitHub repository
- Contact the development team through the admin panel

**For NHRA organization inquiries:**
- Visit the official NHRA website
- Contact local NHRA representatives

---

## 🚀 Deployment Status

**Current Status**: Development Complete (85%) - Ready for Content Development and Production Deployment

**Recommended Next Actions:**
1. Complete content development (educational materials, human rights resources)
2. Implement legal compliance features (data protection, audit trails)
3. Set up production monitoring and alerting
4. Deploy to production environment with proper backup strategies

**Made with ❤️ for Human Rights Awareness and Social Justice**

*This project represents a commitment to digitizing and modernizing human rights advocacy organizations, making them more efficient, transparent, and impactful in their mission to protect and promote human rights.*
