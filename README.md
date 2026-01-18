# RMAS (Rashtriya Manav Adhikar Sangathan) - Admin Platform

A hierarchical administrative platform for Rashtriya Manav Adhikar Sangathan (RMAS) in Bihar, India, designed to manage user permissions, membership applications, and human rights advocacy through a strict cascade authorization system.

## 📋 Description

RMAS is a full-stack web application that digitizes human rights advocacy organization operations with emphasis on hierarchical access control and data integrity. The platform enables:

- **Hierarchical User Management**: Strict cascade permissions from Superadmin → State → Division → District → Block levels
- **Role-Based Authorization**: Each administrative level has 3 roles (President, Secretary, Media Incharge) with clear delegation boundaries
- **Membership Application Tracking**: Applications visible to higher administrative levels with cascade filtering
- **Document Generation**: Automated PDF certificate and joining letter generation
- **Secure Administration**: Production-ready with role enforcement, audit logging, and access control

**Problem Solved**: Traditional paper-based NGO operations lack centralized control and organizational transparency. This platform provides hierarchical administrative oversight with strict permission boundaries, ensuring that each level can only manage entities within their scope.

**Core Objectives**:
- ✅ Implement strict hierarchical permission system with cascade validation
- ✅ Enable role-based user management at multiple administrative levels
- ✅ Provide membership application visibility based on organizational hierarchy
- ✅ Automate document generation with secure distribution
- ✅ Maintain audit trail and operational transparency

## 📊 Current Status (~75% Complete)

### ✅ **Completed Features**
- **Core Framework**: Node.js + Express + MongoDB + EJS architecture
- **User Authentication**: Session-based admin authentication with role enforcement
- **Hierarchical User Management**: Complete user creation form with cascade validation
  - Superadmin can create users at all levels (State, Division, District, Block)
  - State level can create Division, District, Block users
  - Division level can create District, Block users
  - District level can create Block users
  - Block level and Media Incharge users cannot create other users
- **Role Structure Implementation**: 
  - 13 role enum (superadmin, state_president, state_secretary, state_media_incharge, division_president, etc.)
  - Strict validation preventing invalid role assignments
  - Role-specific permission boundaries enforced at server level
- **Cascading Location Assignment**: 
  - Dynamic dropdowns for State, Division, District, Block selection
  - Automatic filtering based on user's authorization level
  - Server-side validation of location scope
- **Admin Dashboard**: Responsive dashboard with role-based card visibility
  - User Management section visible to Superadmin, State, Division, District levels
  - Application management with cascade filtering
- **Permission Middleware**: Route protection with role-based access control
- **Membership Applications**: Application tracking with cascade visibility
- **PDF Generation**: Puppeteer integration for certificate creation
- **Responsive Design**: Custom CSS with mobile-friendly layouts
- **Logging System**: Winston with structured JSON logs

### ⏳ **Pending Features (25%)**
- **Media Dashboard**: Media Incharge user interface for content management
- **Password Reset Flow**: Self-service password recovery mechanism
- **Audit Logging**: Complete activity trail for compliance and forensics
- **Block Level Full Support**: Enhanced features for block-level users
- **Content Development**: Human rights educational materials and resources
- **Advanced Reporting**: Custom report generation with export functionality
- **Performance Optimization**: Database indexing and caching strategies
- **API Documentation**: Comprehensive API endpoint documentation

## ✨ Features

### **Hierarchical Permission System**

The platform implements a strict cascade authorization model:

```
Superadmin (Super Level)
├── Can create: State, Division, District, Block users
├── Can assign: All 3 roles at all levels
└── Dashboard access: Full application visibility

State Level (President/Secretary/Media Incharge)
├── Can create: Division, District, Block users
├── Can assign: All 3 roles at Division/District/Block
└── Dashboard access: Subordinate applications only

Division Level (President/Secretary/Media Incharge)
├── Can create: District, Block users
├── Can assign: All 3 roles at District/Block
└── Dashboard access: Subordinate applications only

District Level (President/Secretary/Media Incharge)
├── Can create: Block users
├── Can assign: All 3 roles at Block
└── Dashboard access: Block-level applications only

Block Level & Media Incharge
├── Cannot create: No user creation allowed
├── Cannot assign: No role assignment allowed
└── Dashboard access: View-only mode
```

### **Role Structure**

Each administrative level has exactly 3 roles with no hierarchy between them:
- **President**: Senior administrative authority
- **Secretary**: Administrative support and coordination
- **Media Incharge**: Communication and media management

All roles at the same level have equal authority to create/manage users at lower levels.

### ✅ **Implemented Features**

- **Strict User Creation Workflow**
  - Role-restricted user creation form
  - Dynamic level assignment dropdown (shows only permitted lower levels)
  - Automatic role enum validation (prevents invalid role assignments)
  - Server-side hierarchical permission enforcement
  
- **Cascading Location Dropdowns**
  - Bihar state structure with 9 divisions
  - Dynamic district/block loading based on selections
  - Location assignment scope limited to user's authorization level
  
- **Application Management**
  - Membership applications visible based on user's hierarchy position
  - Higher levels see all subordinate applications
  - Lower levels see only their own submissions
  
- **Dashboard Visibility**
  - User Management section: Superadmin, State, Division, District users
  - Application Management section: All authorized users
  - Add User button: Only for authorized creation levels
  
- **Admin Panel Routes**
  - User list and creation: Role-protected with cascade validation
  - User editing: Authority scope enforced
  - Application tracking: Visibility based on hierarchy
  
- **Security Implementation**
  - Session-based authentication
  - Role enum validation in database models
  - Server-side permission checks on all protected routes
  - Input validation and sanitization
  
- **PDF Generation**: Automated certificate creation using Puppeteer
- **Responsive Design**: Mobile-friendly UI with role-based layouts
- **Logging & Monitoring**: Structured logs with request tracking

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js 20+ with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Express-session with secure cookie management
- **PDF Generation**: Puppeteer with Chromium for headless browsing
- **Validation**: Express-validator with strict input sanitization
- **Process Management**: Nodemon for development hot reload

### **Frontend**
- **Templates**: EJS with hierarchical role-based rendering
- **Styling**: Custom CSS with responsive mobile-first design
- **Forms**: Client-side and server-side validation
- **JavaScript**: Client-side logic for cascading dropdowns

### **Database**
- **Schema**: Mongoose models with strict validation
  - User model: 13-role enum with authorization level tracking
  - Membership model: Application tracking with status management
- **Indexes**: Performance optimization for frequently queried fields
- **Storage**: MongoDB Atlas cloud or local MongoDB instance

## 📁 Project Structure

```
d:\human-right/
├── 📁 middleware/                    # Express middleware for auth and roles
│   ├── auth.js                      # Authentication middleware
│   └── role.js                      # Role-based access control
├── 📁 models/                       # Mongoose database schemas
│   ├── User.js                      # Admin user with 13-role enum
│   ├── Membership.js                # Membership application schema
│   ├── Member.js                    # Member records
│   └── DownloadOtp.js              # OTP management for document access
├── 📁 public/                       # Static assets
│   ├── css/                         # Stylesheets
│   │   └── style.css
│   ├── js/                          # Client-side JavaScript
│   │   ├── admin-form.js
│   │   ├── admin-user-form.js      # Cascading dropdown logic
│   │   ├── bihar-locations.js       # Location data handling
│   │   ├── form.js
│   │   ├── join.js
│   │   └── manage-role.js
│   ├── locations/                   # Bihar administrative divisions
│   │   ├── bihar_blocks.json        # All blocks across divisions
│   │   ├── bihar_complete.json      # Complete geographic hierarchy
│   │   ├── bihar_divisions.json     # State divisions (9 total)
│   │   └── roles_hierarchy.json     # Role authority mapping
│   ├── images/                      # Static images and logos
│   ├── uploads/                     # User-uploaded files (not in git)
│   ├── pdfs/                        # Generated certificates
│   ├── donate.json                  # Donation configuration
│   └── translations.json            # String localization
├── 📁 routes/                       # Express route handlers
│   ├── admin.js                     # Admin panel routes (user creation, management)
│   ├── auth.js                      # Authentication routes (login, logout)
│   ├── documents.js                 # Document download routes
│   ├── pages.js                     # Public page routes
│   └── public.js                    # Public API routes
├── 📁 scripts/                      # Utility and maintenance scripts
│   ├── create_superadmin.js         # Initialize superadmin user
│   ├── clean_except_superadmin.js   # Database cleanup
│   ├── clear_test_data.js           # Test data removal
│   ├── test_render_joining_letter.js
│   ├── send_updated_pdf_email.js
│   ├── find_latest_role_assigned.js
│   ├── migrate_users_to_cascade.js  # Permission system migration
│   └── archive/                     # Deprecated scripts
├── 📁 utils/                        # Utility modules
│   ├── logger.js                    # Winston logging configuration
│   └── mailer.js                    # Email service handler
├── 📁 views/                        # EJS templates
│   ├── admin/                       # Admin panel templates
│   │   ├── dashboard.ejs            # Role-based dashboard
│   │   ├── user_form.ejs            # User creation with cascade permissions
│   │   ├── users.ejs                # User list view
│   │   ├── forms.ejs                # Application list view
│   │   ├── form_view.ejs            # Application detail view
│   │   ├── manage-role.ejs          # Role management
│   │   └── profile_view.ejs
│   ├── documents/                   # Document request templates
│   │   ├── request_download.ejs
│   │   ├── otp_sent.ejs
│   │   └── profile_view.ejs
│   ├── pdf/                         # PDF generation templates
│   │   ├── id-card.ejs
│   │   ├── joining-letter.ejs
│   │   └── letter-template.ejs
│   ├── partials/                    # Reusable components
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── layout.ejs                   # Main page layout
│   ├── index.ejs                    # Homepage
│   ├── join.ejs                     # Membership application form
│   ├── login.ejs                    # Admin login page
│   ├── about.ejs
│   ├── contact.ejs
│   ├── donate.ejs
│   ├── gallery.ejs
│   ├── news.ejs
│   ├── team.ejs
│   ├── terms.ejs
│   └── verify.ejs
├── 📁 logs/                         # Application logs (not in git)
├── 📁 dev-archive/                  # Development artifacts
│   ├── jest.config.js
│   ├── test files and old prototypes
│   └── css-mistakes/ (reference)
├── 📄 .env.example                  # Environment variables template
├── 📄 .gitignore                    # Git exclusions
├── 📄 package.json                  # Dependencies and npm scripts
├── 🔧 vercel.json                   # Vercel deployment configuration
├── ✅ PRODUCTION_CHECKLIST.md       # Development checklist
└── 🚀 index.js                      # Application entry point
```

## ⚙️ Setup & Installation

### **Prerequisites**
- Node.js 20+ and npm 7+
- MongoDB (MongoDB Atlas cloud or local instance)
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

### **Quick Start (Development)**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd human-right
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration:
   # - MONGODB_URI: Your MongoDB connection string
   # - SESSION_SECRET: Secure random string for sessions
   # - PORT: Development port (default: 5000)
   ```

4. **Create superadmin user** (optional, for fresh setup)
   ```bash
   node scripts/create_superadmin.js
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`

### **Production Deployment (Vercel)**

1. **Link to Vercel**
   ```bash
   npx vercel --prod
   ```

2. **Configure environment variables** in Vercel dashboard:
   - `MONGODB_URI`: Production MongoDB URI
   - `SESSION_SECRET`: Secure session secret
   - `NODE_ENV`: Set to "production"

3. **Deploy**
   ```bash
   git push origin main
   ```
   Vercel will automatically deploy on push to main branch

## 🏃‍♂️ How to Run/Test

### **Development Mode**
```bash
npm run dev
```
- Runs with Nodemon for hot reload
- Server listens on port 5000
- Access at http://localhost:5000

### **Production Mode**
```bash
npm start
```
- Standard Node.js execution
- Set NODE_ENV=production in .env

### **Testing**
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (auto-rerun on file changes)
npm run test:watch
```

### **Utility Scripts**
```bash
# Create initial superadmin user
node scripts/create_superadmin.js

# Clean all users except superadmin
node scripts/clean_except_superadmin.js

# Clear test data
node scripts/clear_test_data.js

# Test PDF generation
node scripts/test_render_joining_letter.js
```

## 🔑 Key Functionalities Explained

### **1. Hierarchical Permission System**

The core feature enforces strict cascade authorization:

- **Permission Enforcement Points**:
  - **Database Layer**: User model with 13-role enum validates role validity
  - **Route Layer**: Protected routes check user level before allowing access
  - **Form Layer**: Frontend dropdowns dynamically filter based on user's authority
  - **Server Validation**: Server-side checks prevent unauthorized user creation
  
- **Authority Levels**:
  - Each level can only create users at immediately lower level(s)
  - Cannot skip levels (State cannot create Block directly)
  - Cannot create users at same or higher level
  
- **Examples**:
  - State President creates Division Secretary: ✅ Allowed
  - Division Secretary creates District President: ✅ Allowed
  - District President creates Block Media Incharge: ✅ Allowed
  - Block President creates any user: ❌ Not allowed
  - District President creates State Secretary: ❌ Not allowed

### **2. User Creation Workflow**

The form implements a three-step validation process:

1. **Frontend Validation**:
   - User role dropdown (President/Secretary/Media Incharge)
   - Assigned level dropdown (dynamic based on current user's level)
   - Location selection (State/Division/District/Block)
   - Form submission prevented if unauthorized

2. **Server Validation**:
   - Hierarchical permission check using `levelHierarchy` object
   - Role enum validation against allowed 13 roles
   - Location scope verification
   - Database integrity check

3. **Response**:
   - Success: User created with encrypted password
   - Failure: Detailed error message indicating permission violation

### **3. Cascading Location Dropdowns**

Dynamic selection based on authority scope:

- **Superadmin**: Can select any State → Division → District → Block
- **State Level**: Can select Divisions, Districts, Blocks within state only
- **Division Level**: Can select Districts, Blocks within division only
- **District Level**: Can select Blocks within district only
- **Block Level**: No location selection (view-only)

### **4. Application Visibility Cascade**

Membership applications visible based on hierarchy:

- **Superadmin**: All applications across all levels
- **State User**: State-level applications + subordinate levels
- **Division User**: Division-level applications + subordinate levels
- **District User**: District-level applications + Block level
- **Block User**: Block-level applications only

### **5. Dashboard Role-Based Access**

Admin dashboard adapts to user's authorization level:

- **User Management Card**: 
  - Shows for: Superadmin, State, Division, District
  - Hidden for: Block, Media Incharge
  
- **Application Management Card**: 
  - Shows for: All authorized users
  - Filtered by: User's cascade scope
  
- **Add User Button**: 
  - Enabled for: Users who can create subordinates
  - Disabled for: Block level and Media Incharge

## 🚧 Known Limitations & Challenges

### **Current Challenges**

1. **EJS Template Complexity**
   - Complex JavaScript expressions with nested quotes in EJS require careful syntax
   - Solution: Use simple string concatenation and conditional blocks instead of template literals in EJS tags

2. **Cascade Permission Scope**
   - Ensuring permission boundaries are enforced across all routes
   - Solution: Implemented `levelHierarchy` object for centralized permission logic

3. **Role Enum Strictness**
   - 13 invalid role combinations must be prevented at database level
   - Solution: Mongoose enum validation with clear error messages

### **Resolved Issues**
- ✅ **Form Field Naming**: Fixed duplicate `assignedLevel` submission (renamed visible dropdown to `_assignedLevel_display`)
- ✅ **Active User Checkbox**: Added checkbox to ensure newly created users can immediately login
- ✅ **Server-Side Permission Checks**: Implemented levelHierarchy validation on all user creation routes
- ✅ **Dashboard Visibility**: Updated to show User Management for authorized levels
- ✅ **EJS Syntax Errors**: Simplified template expressions to avoid parser conflicts

### **Known Limitations**
- **Block Level Dashboard**: Limited to view-only mode (no user creation)
- **Media Incharge Limitations**: Cannot create users (by design)
- **Report Generation**: Not yet implemented for organizational analytics
- **Batch Operations**: User creation is single-user process (no bulk import)
- **Location Hierarchy**: Fixed to Bihar structure (hardcoded divisions and districts)

## 🎯 Next Steps / Development Roadmap

### **High Priority (Immediate - v1.1)**
1. **Media Dashboard**: Dedicated interface for Media Incharge users
   - Content creation and management
   - News/updates publication
   - Media kit distribution
   
2. **Password Reset Flow**: Self-service password recovery
   - Email-based reset links
   - Secure token generation and validation
   - Password strength requirements
   
3. **Block Level Full Support**: Enhanced features for block-level users
   - User information management
   - Local activity tracking
   - Member verification workflow

### **Medium Priority (v1.2)**
1. **Audit Logging System**: Complete activity trail
   - User creation/modification timestamps
   - Role assignment history
   - Application status changes
   - Login/logout events
   
2. **Advanced Reporting**: Custom report generation
   - User statistics by level/role
   - Application metrics and trends
   - Organizational growth reports
   - Export to CSV/PDF
   
3. **Performance Optimization**:
   - Database indexing on frequently queried fields
   - MongoDB aggregation pipelines for reports
   - Frontend caching strategies

### **Lower Priority (v1.3+)**
1. **Content Development**: Educational materials and resources
   - Human rights advocacy guides
   - Training materials for team members
   - Case studies and success stories
   
2. **Mobile Optimization**: Enhanced responsive design
   - Mobile-first redesign of forms
   - Touch-optimized navigation
   - Progressive web app capabilities
   
3. **API Documentation**: Comprehensive endpoint documentation
   - Swagger/OpenAPI specifications
   - Code examples and use cases
   - Developer guide for integrations
   
4. **Multi-language Support**: Hindi localization
   - Hindi UI text and labels
   - Form validation messages
   - Email templates

## 📸 Screenshots & Visual Guide

### **Admin Login Page**
- Clean login interface for admin users
- Session-based authentication
- Secure password handling

### **Admin Dashboard**
- Role-based card visibility
- User Management section (Superadmin, State, Division, District only)
- Application Management section (all authorized users)
- Quick access buttons for authorized actions

### **User Creation Form**
- Dynamic role selection (President/Secretary/Media Incharge)
- Hierarchical level assignment dropdown
- Cascading location selectors (State → Division → District → Block)
- Active user checkbox for immediate login access
- Server-side permission validation

### **Application Management**
- Application list with cascade filtering
- Status tracking and updates
- Membership data visibility based on user hierarchy
- PDF certificate generation and distribution

## 👥 Project Team

- **Project Lead**: RMAS Organization Leadership
- **Technical Development**: Full-stack developer team
- **Current Status**: Active development with ~75% completion

## 📄 License

ISC License - Suitable for open-source NGO projects

## 📞 Contact & Support

### **Technical Issues**
- Create an issue on the GitHub repository
- Include error messages and reproduction steps

### **RMAS Organization**
- Official RMAS website: [https://rmas.org](https://rmas.org)
- Contact local chapter representatives
- Email support through admin panel
