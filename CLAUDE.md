# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Listo is a full-stack web application with a .NET 10 backend API and React 19 frontend. The application includes user management with JWT authentication, refresh tokens, and TOTP-based MFA.

## Development Commands

### Backend (listo/listo-api)
```bash
cd listo/listo-api
dotnet run              # Run API on http://localhost:5286
dotnet build            # Build the API
dotnet watch            # Run with hot reload
dotnet ef migrations add <Name>   # Create new migration
dotnet ef database update         # Apply migrations
```

### Frontend (listo/listo-web)
```bash
cd listo/listo-web
npm run dev             # Start dev server on http://localhost:5173
npm run build           # Build for production
npm run lint            # Run ESLint
npm run preview         # Preview production build
```

### Running Both
Start API first, then frontend. The frontend proxies `/api` requests to the API (port 5286).

## Architecture

### Backend Structure (listo/listo-api)
- **Controllers/**: API endpoints (Auth, Users, System)
- **Services/**: Business logic with interface/implementation pattern (IAuthService, IUserService)
- **Models/**: Entity Framework entities with BaseEntity (SysId, timestamps, audit fields)
- **DTOs/**: Request/response objects for API endpoints
- **Data/**: ListoDbContext with MySQL via Pomelo provider
- **Migrations/**: EF Core migrations

### Frontend Structure (listo/listo-web)
- **pages/**: Route components (Login, Dashboard, Profile, Settings, UserManagement)
- **components/**: Reusable components (ProtectedRoute with role-based access)
- **contexts/**: React context providers (AuthContext manages auth state)
- **services/**: API client (axios with interceptors for token refresh)
- **layouts/**: Page layouts (MainLayout with Ant Design ProLayout)
- **theme/**: Ant Design theme configuration

### Authentication Flow
1. Login returns JWT access token (15min) + refresh token (2 days)
2. If MFA enabled, login returns mfaToken requiring verification
3. Axios interceptor auto-refreshes expired access tokens
4. Tokens stored in localStorage (accessToken, refreshToken)

### Database
- MySQL with Pomelo EF Core provider
- `database/init.sql`: Initial schema
- Primary key field: `sys_id` (BIGINT AUTO_INCREMENT)
- Audit fields: create_timestamp, modify_timestamp, create_user, modify_user

## Configuration

### Backend (appsettings.json)
Copy `appsettings.json.example` to `appsettings.json` and configure:
- ConnectionStrings.DefaultConnection: MySQL connection string
- Jwt.Secret: Min 32 character secret key
- InitialAdmin: Credentials for seeded admin user

### Key Dependencies
- **Backend**: BCrypt.Net-Next, Otp.NET (TOTP), QRCoder, Swashbuckle (Swagger)
- **Frontend**: Ant Design + Pro Components, TanStack Query, React Router v7

## API Documentation
Swagger UI available at http://localhost:5286/swagger during development.
