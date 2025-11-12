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
# Clone repository
git clone https://github.com/V-ManishBIT130/BIT-ISE-Time-Table-Generator.git
cd BIT-ISE-Time-Table-Generator

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend_server
npm install
cd ..

# Configure MongoDB connection
# Edit backend_server/db.js with your MongoDB Atlas URI
```

### Running the Application

```bash
# Terminal 1: Start Backend (Port 5000)
cd backend_server
npm start

# Terminal 2: Start Frontend (Port 5173)
npm run dev

# Open browser: http://localhost:5173
# Login: HOD / ise@hod
```

## 📚 Documentation

Comprehensive documentation available in [`Dcumentations/`](./Dcumentations/) folder:

**Start Here:**
- [**README.md**](./Dcumentations/README.md) - Complete documentation index
- [**ALGORITHM_STRATEGY.md**](./Dcumentations/ALGORITHM_STRATEGY.md) - 7-step algorithm explanation

**Recent Updates (Nov 12, 2025):**
- [**FRONTEND_CACHE_AND_STATE_FIX.md**](./Dcumentations/FRONTEND_CACHE_AND_STATE_FIX.md) - Instant update implementation
- [**CHANGELOG.md**](./Dcumentations/CHANGELOG.md) - All fixes and improvements

## 🎨 Key Achievements

### November 12, 2025: UX Transformation
**Before:** 30-second, 5-step process to see room updates  
**After:** <1 second instant visual feedback ⚡

Implemented three-part solution:
1. Bypass cache mechanism (prevents React state batching race conditions)
2. Local state awareness (frontend checks its own state first)
3. Backend exclusion logic (API excludes current section from checks)

### November 11, 2025: Zero Conflicts
- ✅ Fixed multi-segment time slot handling (1h, 1.5h, any duration)
- ✅ Zero classroom conflicts (down from 4)
- ✅ Zero teacher conflicts
- ✅ 100% fixed slot assignment success
- ✅ 90.78% overall assignment success

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

See [TESTING_GUIDE.md](./Dcumentations/TESTING_GUIDE.md) for comprehensive test cases.

## 📝 License

This project is for educational purposes at BIT ISE Department.

## 👨‍💻 Author

V Manish - BIT ISE Department

---

**For detailed technical documentation, see [`Dcumentations/README.md`](./Dcumentations/README.md)**