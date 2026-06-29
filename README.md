# 🚀 SHRAM - Worker Hiring Platform Backend

> A scalable backend system for connecting customers, companies, and skilled workers in real-time.

SHRAM is a production-oriented backend application that enables providers to hire nearby workers instantly or post jobs for multiple workers. It supports secure authentication, real-time booking, instant worker requests, email verification, OTP authentication, and role-based access control.

---

# ✨ Features

## 🔐 Authentication & Authorization

- JWT Authentication
- Access Token & Refresh Token
- Secure Logout
- Role Based Access Control (RBAC)
- Email Login
- Phone Login (OTP Ready)
- Forgot Password
- Reset Password
- Email OTP Verification
- Password Change
- Secure Password Hashing (bcrypt)

---

## 👥 User Roles

- ADMIN
- PROVIDER
- WORKER
- AGENT

Each role has its own permissions and APIs.

---

## 💼 Job Management

- Create Job
- Update Job
- Delete Job
- View Jobs
- Apply for Jobs
- Accept Application
- Reject Application
- Nearby Job Listing
- Skill Based Filtering

---

## ⚡ Instant Request System

Uber-style instant worker hiring.

Features:

- Request nearby workers
- Multiple worker support
- Required worker count
- Real-time acceptance
- Auto close when slots are filled
- Duplicate acceptance prevention
- Distributed locking using Redis

---

## 📅 Booking Management

- Create Booking
- Confirm Booking
- Cancel Booking
- Complete Booking
- Booking Status Tracking
- Booking History

---

## ⭐ Review System

- Provider Reviews
- Worker Reviews
- Ratings

---

## 📧 Email Service

Integrated using Resend.

Templates:

- Welcome Email
- Forgot Password
- Password Changed
- OTP Verification

Reusable Email Components:

- Layout
- Header
- Footer
- Button

---

## 🔑 OTP Verification

Supports

- Email OTP
- Phone OTP (SMS Provider Ready)

Features

- Redis Storage
- Expiration
- One Time Usage

---

## 🚀 Performance

Redis is used for

- OTP Storage
- Distributed Locking
- Rate Limiting
- Cache

---

## 🔄 Real Time

Socket.IO integration

Events include

- Worker Accepted
- Booking Updates
- Instant Request Updates
- Notifications

---

# 🛠 Tech Stack

## Backend

- Node.js
- Express.js
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## Cache

- Redis

## Authentication

- JWT
- bcrypt

## Validation

- Zod

## Email

- Resend
- React Email

## Real Time

- Socket.IO

---

# 📂 Project Structure

```
src/

├── modules/
│   ├── auth/
│   ├── users/
│   ├── jobs/
│   ├── booking/
│   ├── reviews/
│   ├── instant-requests/
│   └── ...
│
├── shared/
│   ├── email/
│   ├── verification/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   └── ...
│
├── config/
└── server.ts
```

---

# 🔐 Authentication Flow

```
Signup

↓

Email Verification OTP

↓

Account Created

↓

Login

↓

Access Token + Refresh Token

↓

Authenticated APIs

↓

Refresh Token

↓

Logout
```

---

# ⚡ Instant Request Flow

```
Provider

↓

Create Instant Request

↓

Nearby Workers Receive Request

↓

Worker Accepts

↓

Redis Lock

↓

Booking Created

↓

Socket.IO Update

↓

Request Auto Closes
```

---

# 📧 Email Flow

```
Signup

↓

Welcome Email
```

```
Forgot Password

↓

Reset Email
```

```
Password Changed

↓

Confirmation Email
```

```
OTP Request

↓

OTP Email
```

---

# 🧠 Architecture

The backend follows a modular architecture.

```
Controller

↓

Service

↓

Repository (Prisma)

↓

PostgreSQL
```

Cross-cutting modules

- Email
- Redis
- Middleware
- Validation
- Verification
- Socket.IO

---

# 🔒 Security Features

- JWT Authentication
- Refresh Tokens
- Password Hashing
- HTTP Only Cookies
- Zod Validation
- Redis Based Rate Limiting
- Distributed Locking
- Protected Routes
- Role Based Authorization

---

# 🚀 Future Enhancements

- RabbitMQ Integration
- Firebase Push Notifications
- AWS S3 File Storage
- Razorpay Payments
- SMS Integration
- Chat System
- Worker Live Location
- AI Worker Recommendation
- AI Job Recommendation
- Admin Analytics Dashboard

---

# 📦 Installation

Clone repository

```bash
git clone https://github.com/Scorpion9205/Shram-Book-Workers-instantly
```

Install dependencies

```bash
npm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run migrations

```bash
npx prisma migrate dev
```

Start development server

```bash
npm run dev
```

---

# 🔑 Environment Variables

```env
DATABASE_URL=

JWT_ACCESS_SECRET=

JWT_REFRESH_SECRET=

REDIS_HOST=

REDIS_PORT=

RESEND_API_KEY=

EMAIL_FROM=
```

---

# 📌 API Modules

- Authentication
- Users
- Jobs
- Instant Requests
- Bookings
- Reviews
- Email
- Verification

---

# 📈 Current Status

| Module | Status |
|---------|--------|
| Authentication | ✅ |
| Authorization | ✅ |
| Jobs | ✅ |
| Booking | ✅ |
| Reviews | ✅ |
| Instant Request | ✅ |
| Email | ✅ |
| OTP | ✅ |
| Redis | ✅ |
| Socket.IO | ✅ |
| RabbitMQ | 🚧 |
| Firebase | 🚧 |
| AWS S3 | 🚧 |
| Payments | 🚧 |

---

# 🤝 Contributing

Pull requests are welcome.

Please open an issue first to discuss major changes.
