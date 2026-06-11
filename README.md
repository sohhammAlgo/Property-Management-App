# 🏘️ AI-Powered Property Management SaaS

A production-grade, multi-tenant Property & Society Management Platform built using **Node.js**, **Express.js**, **PostgreSQL**, **Redis**, **Socket.IO**, and a dedicated **FastAPI AI Microservice**.

The platform enables housing societies, residential communities, apartment complexes, and property managers to efficiently manage residents, complaints, amenities, bookings, payments, announcements, and notifications while leveraging AI-powered automation and analytics.

---

# 🌐 Live Deployment

## Backend API

```text
https://triumphant-charisma-production-5363.up.railway.app
```

## AI Service

```text
https://property-management-app-production-3e06.up.railway.app
```

---

# 🚀 Features

## 🔐 Authentication & Security

- Firebase Authentication
- JWT Access Tokens
- Refresh Token Rotation
- Role-Based Access Control (RBAC)
- Multi-Tenant Data Isolation
- Secure Session Management
- Redis Rate Limiting
- Helmet Security Middleware
- SQL Injection Protection

---

## 🏢 Society Management

- Create and manage societies
- Resident onboarding
- Society dashboard
- Resident directory
- Society analytics
- Tenant-based architecture

---

## 📝 Complaint Management

- Raise complaints with images
- Complaint categorization
- Complaint assignment
- Status tracking
- Comment system
- Complaint analytics

### AI Features

- Automatic complaint classification
- Priority detection
- Complaint summarization
- AI-generated recommendations

---

## 🏊 Amenities & Bookings

- Amenity management
- Slot availability tracking
- Booking requests
- Booking approvals
- Conflict prevention
- Booking history

### Supported Amenities

- Club House
- Swimming Pool
- Gym
- Community Hall
- Tennis Court
- Parking Slots

---

## 💳 Payment Management

- Razorpay Integration
- Maintenance collection
- Online payments
- Revenue tracking
- Payment history
- Defaulter analytics

---

## 📢 Announcements

- Society announcements
- Emergency notices
- Event updates
- Community communication

---

## 🔔 Notifications

- Real-time notifications
- Firebase Cloud Messaging (FCM)
- In-app notifications
- Read/unread tracking
- Socket.IO broadcasting

---

## 🤖 AI Capabilities

Powered by:

- Gemini AI
- Groq AI
- FastAPI

### AI Services

- Complaint Classification
- Society Insights
- Resident Support Chatbot
- Dashboard Analytics
- Smart Recommendations

---

# 🏗️ System Architecture

```text
                         ┌─────────────────┐
                         │   Frontend App  │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     Express Backend     │
                    │       Node.js API       │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │ PostgreSQL  │      │    Redis    │      │ Cloudinary  │
   └─────────────┘      └─────────────┘      └─────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │   FastAPI AI Service    │
                    └──────────┬──────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │ Gemini + Groq AI │
                     └──────────────────┘
```

---

# 🛠️ Technology Stack

## Backend

```text
Node.js
Express.js
PostgreSQL
Redis
Socket.IO
Firebase Admin SDK
Cloudinary
JWT
Joi
Multer
```

## AI Microservice

```text
FastAPI
Gemini API
Groq API
Pydantic
```

## DevOps & Deployment

```text
Docker
Docker Compose
Railway
GitHub
```

---

# 📂 Project Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── firebase.js
│   │   ├── cloudinary.js
│   │   ├── socket.js
│   │   └── migrate.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tenantController.js
│   │   ├── complaintController.js
│   │   ├── bookingController.js
│   │   ├── paymentController.js
│   │   ├── announcementController.js
│   │   ├── notificationController.js
│   │   ├── aiController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── Dockerfile
├── package.json
└── .env

ai-service/
├── routers/
├── services/
├── models/
├── config.py
├── main.py
├── requirements.txt
└── Dockerfile

docker-compose.yml
```

---

# ⚙️ Environment Variables

## Backend

```env
PORT=
DATABASE_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

REDIS_URL=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

AI_SERVICE_URL=
```

---

## AI Service

```env
GEMINI_API_KEY=
GROQ_API_KEY=
```

---

# 🚀 Local Development Setup

## Clone Repository

```bash
git clone https://github.com/yourusername/property-management-saas.git

cd property-management-saas
```

---

## Backend Setup

```bash
cd backend

npm install

npm run dev
```

---

## AI Service Setup

```bash
cd ai-service

pip install -r requirements.txt

uvicorn main:app --reload
```

---

# 🐳 Docker Setup

## Build & Run

```bash
docker-compose up -d
```

## View Logs

```bash
docker-compose logs -f
```

## Stop Services

```bash
docker-compose down
```

---

# 🔌 API Reference

## Base Backend URL

```text
https://triumphant-charisma-production-5363.up.railway.app/api
```

---

## Authentication

| Method | Endpoint |
|----------|----------|
| POST | /auth/firebase-login |
| POST | /auth/refresh |
| POST | /auth/logout |
| GET | /auth/me |
| PATCH | /auth/me |

---

## Society Management

| Method | Endpoint |
|----------|----------|
| POST | /tenants |
| GET | /tenants |
| GET | /tenants/:id |
| PATCH | /tenants/:id |
| GET | /tenants/:id/stats |

---

## Complaints

| Method | Endpoint |
|----------|----------|
| POST | /complaints |
| GET | /complaints |
| GET | /complaints/:id |
| PATCH | /complaints/:id/status |
| POST | /complaints/:id/comments |

---

## Bookings

| Method | Endpoint |
|----------|----------|
| POST | /bookings |
| GET | /bookings |
| PATCH | /bookings/:id/status |
| DELETE | /bookings/:id |

---

## Payments

| Method | Endpoint |
|----------|----------|
| POST | /payments/create-order |
| POST | /payments/verify |
| GET | /payments |
| GET | /payments/stats |

---

## AI

| Method | Endpoint |
|----------|----------|
| POST | /ai/chat |
| POST | /ai/insights |
| GET | /ai/health |

---

# 🤖 AI Service Endpoints

## Base URL

```text
https://property-management-app-production-3e06.up.railway.app
```

| Method | Endpoint |
|----------|----------|
| GET | /health |
| POST | /ai/classify-complaint |
| POST | /ai/chat |
| POST | /ai/insights |

---

# ⚡ Real-Time Features

Using Socket.IO:

## Events

### Client → Server

```javascript
complaint:join
complaint:leave
complaint:typing
notifications:read
```

### Server → Client

```javascript
notification
complaint:typing
user:online
user:offline
```

---

# 🗄️ Database Schema

```text
tenants
users
refresh_tokens
complaints
complaint_comments
amenities
bookings
payments
announcements
notifications
subscriptions
```

---

# 🔐 Security Features

- Firebase Token Verification
- JWT Authentication
- Refresh Token Rotation
- Redis-Based Rate Limiting
- Helmet Security Headers
- CORS Protection
- Input Validation
- Multi-Tenant Isolation
- SQL Injection Prevention
- Razorpay Signature Verification

---

# 📈 Future Enhancements

- Visitor Management
- Smart Parking System
- AI Voice Assistant
- IoT Device Integration
- Predictive Maintenance
- Resident Mobile App
- Smart Energy Monitoring
- Advanced Analytics Dashboard

---

# 👨‍💻 Author

## Soham Gurav

Built using:

```text
Node.js
Express.js
PostgreSQL
Redis
Socket.IO
FastAPI
Gemini AI
Groq AI
Docker
Railway
```

---

# ⭐ Support

If you found this project useful, consider giving it a star ⭐ on GitHub.
