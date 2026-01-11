# BIT ISE Timetable Generator

An intelligent, automated timetable generation system for the BIT ISE Department with interactive editing capabilities and real-time conflict detection.

## 🎯 Project Overview

**Tech Stack:** MERN (MongoDB, Express.js, React 18, Node.js) + Vite  
**Status:** Production-Ready (Steps 1-6 Complete)  
**Key Achievement:** Zero classroom/teacher conflicts + Instant visual feedback (<1s updates)

### Core Features
- ✅ **7-Step Greedy Algorithm** with constraint satisfaction
- ✅ **Interactive Drag-Drop Editor** with undo/redo
- ✅ **Real-Time Conflict Detection** across all sections
- ✅ **Instant Room Availability Updates** (Optimistic UI pattern)
- ✅ **Global Teacher Scheduling** prevents double-booking
- ✅ **Automated Classroom Assignment** with priority rules
- ✅ **Lab Batch Rotation** formula for fair distribution

### System Scope
- **18 Sections:** 3A, 3B, 3C for Semesters 3-8 (odd/even generated separately)
- **54 Lab Batches:** 3 batches per section
- **5 Subject Types:** ISE, Other Dept, Projects, OEC, PEC
- **Resources:** Teachers, Theory Classrooms (5), Lab Rooms (3)

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas account
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/V-ManishBIT130/BIT-ISE-Time-Table-Generator.git
cd BIT-ISE-Time-Table-Generator

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend_server
npm install
```

### Database Setup

#### Option A: MongoDB Atlas (Cloud - Recommended)
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (512MB free tier)
3. Create database user with password
4. Whitelist your IP (or use `0.0.0.0/0` for development)
5. Get connection string from "Connect" → "Connect your application"

#### Option B: Local MongoDB
1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/timetable_db`

### Environment Configuration

```bash
# In backend_server folder
cp .env.example .env

# Edit .env file and add your MongoDB connection string:
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname
# For Local: mongodb://localhost:27017/timetable_db
```

### First-Time Setup (Create Admin User)

**Option 1: Run Seed Script (Recommended)**
```bash
cd backend_server
node seed.js
```
This creates the default HOD admin account.

**Option 2: Automatic Creation**  
If you skip the seed script, the admin user will be auto-created when you first start the backend server.

**Default Login Credentials:**
- Username: `HOD`
- Password: `ise@hod`

⚠️ **Important:** These are default test credentials. You can change them later as needed.

### Running the Application

```bash
# Terminal 1: Start Backend (Port 5000)
cd backend_server
npm start

# Terminal 2: Start Frontend (Port 5173)
cd ..
npm run dev
```

Open browser at **http://localhost:5173**

**Login with:**
- Username: `HOD`
- Password: `ise@hod`

## 📚 Documentation

Comprehensive documentation available in [`Documentation/`](./Documentation/) folder:

**Start Here:**
- [**README.md**](./Documentation/README.md) - Complete documentation index
- [**ALGORITHM_STRATEGY.md**](./Documentation/ALGORITHM_STRATEGY.md) - 7-step algorithm explanation

**Recent Updates (Dec 2025):**
- [**FRONTEND_CACHE_AND_STATE_FIX.md**](./Documentation/FRONTEND_CACHE_AND_STATE_FIX.md) - Cache invalidation and break persistence fixes
- [**LESSONS_LEARNED.md**](./Documentation/LESSONS_LEARNED.md) - React async state handling and UX improvements

## 🎨 Key Achievements

### December 2025: Cache & State Management
- ✅ **Full cache clearing** on slot changes (prevents stale room availability)
- ✅ **Break persistence fix** (React async state handling)
- ✅ **Fixed slots classroom editing** (OEC/PEC flexibility)
- ✅ **Academic year dropdown** (prevents input errors)

### November 2025: Zero Conflicts
- ✅ Fixed multi-segment time slot handling (1h, 1.5h, any duration)
- ✅ Zero classroom conflicts
- ✅ Zero teacher conflicts across all sections
- ✅ 100% fixed slot assignment success
- ✅ Instant visual feedback (<1s room availability updates)

## 🏗️ Architecture

### Backend (`backend_server/`)
- **Express API** with 8 MongoDB models
- **7-Step Algorithm** (`algorithms/` folder)
- **Real-time Conflict Detection** endpoints
- **Global Resource Tracking** during generation

### Frontend (`src/`)
- **React 18** with Vite build system
- **@dnd-kit** for drag-drop functionality
- **Axios** for API communication
- **Optimistic UI** pattern for instant updates

### Database (MongoDB Atlas)
- **8 Collections:** Sections, Subjects, Teachers, Labs, Classrooms, Lab Rooms, Assignments, Timetables
- **18 Timetable Documents:** One per section (3A-3C for sems 3,5,7 and 4A-4C for sems 4,6,8)

## 📊 Algorithm Overview

**7-Step Process:**
1. **Load Sections** - Initialize data structures
2. **Block Fixed Slots** - Place OEC/PEC (1.5h sessions)
3. **Schedule Labs** - 2-hour lab sessions with batch rotation
4. **Schedule Theory** - Regular ISE and other dept subjects
5. **Assign Classrooms** - Priority-based room allocation
6. **Assign Lab Teachers** - 2 teachers per lab (fallback to 1)
7. **Validate** - Final conflict and constraint verification

**Constraint Hierarchy:**
1. No teacher double-booking (global)
2. No room double-booking (global)
3. No student schedule conflicts
4. Max 6 teaching hours per day
5. Consecutive lab sessions (no breaks)
6. Balanced daily loads

## 🧪 Testing

See [TESTING_GUIDE.md](Documentation\TESTING_GUIDE.md) for comprehensive test cases.

## 📝 License

This project is for educational purposes at BIT ISE Department.

## 👨‍💻 Author

V Manish - BIT ISE Department

---

**For detailed technical documentation, see [`Documentation\README.md`](./Documentation/README.md)**