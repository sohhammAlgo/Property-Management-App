# 🏘️ Society Management SaaS — Backend

A production-grade multi-tenant society management backend built with **Node.js + Express** and a **FastAPI AI microservice**.

---

## 📁 Project Structure

```
backend/                        ← Node.js Express API
├── src/
│   ├── config/
│   │   ├── database.js         ← PostgreSQL pool
│   │   ├── redis.js            ← Redis client + cache helpers
│   │   ├── firebase.js         ← Firebase Admin SDK
│   │   ├── cloudinary.js       ← Cloudinary upload
│   │   ├── socket.js           ← Socket.IO rooms + events
│   │   └── migrate.js          ← DB migration script
│   ├── controllers/
│   │   ├── authController.js   ← Firebase login, JWT, profile
│   │   ├── tenantController.js ← Society CRUD + stats
│   │   ├── complaintController.js ← Complaints + AI classification
│   │   ├── bookingController.js   ← Amenities + bookings
│   │   ├── paymentController.js   ← Razorpay + webhooks
│   │   ├── announcementController.js
│   │   ├── notificationController.js
│   │   ├── aiController.js     ← Chatbot + insights endpoints
│   │   └── adminController.js  ← Platform admin dashboard
│   ├── middleware/
│   │   ├── auth.js             ← JWT + Firebase + RBAC middleware
│   │   ├── errorHandler.js     ← Global error handler
│   │   ├── rateLimiter.js      ← Redis-based rate limiting
│   │   └── upload.js           ← Multer config
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tenants.js
│   │   ├── complaints.js
│   │   ├── bookings.js
│   │   ├── payments.js
│   │   ├── ai.js
│   │   ├── admin.js
│   │   └── misc.js             ← Announcements + Notifications
│   ├── services/
│   │   ├── aiService.js        ← Axios client for FastAPI
│   │   └── notificationService.js ← In-app + FCM + Socket.IO
│   ├── utils/
│   │   ├── appError.js
│   │   ├── response.js
│   │   ├── jwt.js
│   │   └── email.js
│   ├── validators/
│   │   └── schemas.js          ← Joi validation schemas
│   ├── app.js                  ← Express app config
│   └── server.js               ← Entry point (HTTP + Socket.IO)
├── .env.example
├── Dockerfile
└── package.json

ai-service/                     ← FastAPI AI Microservice
├── routers/
│   └── ai_router.py            ← /ai/classify-complaint, /ai/chat, /ai/insights
├── services/
│   ├── groq_service.js         ← Groq (fast inference)
│   └── gemini_service.py       ← Gemini (complex reasoning)
├── models/
│   └── schemas.py              ← Pydantic models
├── config.py                   ← Settings from .env
├── main.py                     ← FastAPI app
├── Dockerfile
└── requirements.txt

docker-compose.yml              ← Full stack dev environment
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 1. Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in all values in backend/.env

# AI Service
cp ai-service/.env.example ai-service/.env
# Add GROQ_API_KEY and/or GEMINI_API_KEY
```

### 2. Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Run DB migrations
docker exec society_backend node src/config/migrate.js

# View logs
docker-compose logs -f backend
```

### 3. Manual Setup

```bash
# ── Backend ──
cd backend
npm install
node src/config/migrate.js   # Run migrations
npm run dev                  # Start with nodemon

# ── AI Service ──
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📡 API Reference

### Base URL: `http://localhost:5000/api`

### Authentication

All protected routes require:
```
Authorization: Bearer <jwt_access_token>
```

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/firebase-login` | Firebase Token | Login/Register via Firebase |
| POST | `/auth/refresh` | Refresh Token | Get new access token |
| POST | `/auth/logout` | JWT | Logout + revoke tokens |
| GET | `/auth/me` | JWT | Get current user |
| PATCH | `/auth/me` | JWT | Update profile |
| POST | `/auth/join-society` | JWT | Join a society |

### Tenants (Societies)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/tenants` | Platform Admin | Create society |
| GET | `/tenants` | Platform Admin | List all societies |
| GET | `/tenants/:id` | Any | Get society details |
| PATCH | `/tenants/:id` | Admin | Update society |
| GET | `/tenants/:id/residents` | Admin | List residents |
| GET | `/tenants/:id/stats` | Admin | Society statistics |

### Complaints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/complaints` | Resident | Create complaint (+ image) |
| GET | `/complaints` | Any | List complaints (role-filtered) |
| GET | `/complaints/analytics` | Admin | Complaint analytics |
| GET | `/complaints/:id` | Any | Get complaint + comments |
| PATCH | `/complaints/:id/status` | Admin | Update status/assign |
| POST | `/complaints/:id/comments` | Any | Add comment |
| DELETE | `/complaints/:id` | Any | Close complaint |

### Bookings & Amenities

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/bookings/amenities` | Admin | Create amenity |
| GET | `/bookings/amenities` | Any | List amenities |
| GET | `/bookings/amenities/:id/slots` | Any | Available slots for date |
| POST | `/bookings` | Resident | Create booking |
| GET | `/bookings` | Any | List bookings |
| PATCH | `/bookings/:id/status` | Admin | Approve/Reject booking |
| DELETE | `/bookings/:id` | Any | Cancel booking |

### Payments

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/payments/create-order` | Resident | Create Razorpay order |
| POST | `/payments/verify` | Resident | Verify payment signature |
| POST | `/payments/webhook` | Public | Razorpay webhook |
| GET | `/payments` | Any | Payment history |
| GET | `/payments/stats` | Admin | Revenue analytics |
| GET | `/payments/defaulters` | Admin | Unpaid residents |

### AI

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/ai/chat` | Any | AI chatbot message |
| POST | `/ai/insights` | Admin | Generate dashboard insights |
| GET | `/ai/health` | Any | AI service health check |

### Announcements

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/announcements` | Admin | Create announcement |
| GET | `/announcements` | Any | List announcements |
| PATCH | `/announcements/:id` | Admin | Update announcement |
| DELETE | `/announcements/:id` | Admin | Delete announcement |

### Notifications

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Any | Get notifications |
| GET | `/notifications/unread-count` | Any | Get unread count |
| POST | `/notifications/mark-read` | Any | Mark as read |
| DELETE | `/notifications/:id` | Any | Delete notification |

### Platform Admin

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | Platform Admin | Global analytics |
| GET | `/admin/tenants/growth` | Platform Admin | Tenant growth chart |
| GET | `/admin/revenue` | Platform Admin | Revenue analytics |
| GET | `/admin/users` | Platform Admin | All users |
| PATCH | `/admin/users/:id/status` | Platform Admin | Activate/Deactivate user |
| PATCH | `/admin/users/:id/role` | Platform Admin | Change user role |
| DELETE | `/admin/tenants/:id` | Platform Admin | Delete society |

---

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `complaint:join` | `complaintId` | Join complaint room |
| `complaint:leave` | `complaintId` | Leave complaint room |
| `complaint:typing` | `{ complaintId }` | Typing indicator |
| `notifications:read` | `[notificationIds]` | Mark notifications read |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `notification` | Notification object | New in-app notification |
| `complaint:typing` | `{ userId, name }` | Someone is typing |
| `user:online` | `{ userId, name }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

### Socket Authentication
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_access_token' }
});
```

---

## 🤖 AI Service Endpoints

### Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health + config status |
| POST | `/ai/classify-complaint` | Classify complaint (Groq) |
| POST | `/ai/chat` | Chatbot conversation (Groq/Gemini) |
| POST | `/ai/insights` | Dashboard insights (Gemini/Groq) |

---

## 🔐 Roles & Permissions

| Permission | Resident | Society Admin | Platform Admin |
|------------|----------|---------------|----------------|
| View own complaints | ✅ | ✅ | ✅ |
| View all complaints | ❌ | ✅ (own society) | ✅ |
| Update complaint status | ❌ | ✅ | ✅ |
| Create bookings | ✅ | ✅ | ✅ |
| Approve bookings | ❌ | ✅ | ✅ |
| View payments | Own only | Society only | All |
| Create announcements | ❌ | ✅ | ✅ |
| Manage residents | ❌ | ✅ | ✅ |
| Access AI insights | ❌ | ✅ | ✅ |
| View platform dashboard | ❌ | ❌ | ✅ |
| Manage all societies | ❌ | ❌ | ✅ |

---

## 🗄️ Database Tables

- `tenants` — Societies/properties
- `users` — All users (resident, society_admin, platform_admin)
- `refresh_tokens` — JWT refresh token store
- `complaints` — Resident complaints with AI classification
- `complaint_comments` — Comments on complaints
- `amenities` — Bookable amenities per society
- `bookings` — Amenity bookings with conflict prevention
- `payments` — Payment records (Razorpay)
- `announcements` — Society announcements
- `notifications` — In-app notification store
- `subscriptions` — Platform subscription records

---

## 🛡️ Security Features

- Firebase ID token verification
- JWT access tokens (15min) + refresh tokens (7 days)
- Token blacklisting on logout
- Redis-based distributed rate limiting
- Helmet.js security headers
- CORS protection
- Input validation (Joi)
- Role-based access control (RBAC)
- Tenant isolation (multi-tenancy)
- Razorpay signature verification
- SQL injection prevention (parameterized queries)
