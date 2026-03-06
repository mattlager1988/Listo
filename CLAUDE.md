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

### Audit Fields Pattern
All entities extend `BaseEntity` which includes audit fields automatically populated by `ListoDbContext.SaveChangesAsync()`:
- `create_timestamp`: Set to UTC now on insert
- `modify_timestamp`: Set to UTC now on insert and update
- `create_user`: Set to current user's `sys_id` on insert (from JWT claim)
- `modify_user`: Set to current user's `sys_id` on insert and update (from JWT claim)

The user ID is extracted from the JWT token's `sub` claim (mapped to `ClaimTypes.NameIdentifier` by ASP.NET Core). This happens automatically - no manual population needed in services or controllers.

## Configuration

### Settings Architecture
The application uses a two-tier settings system:

**appsettings.json (infrastructure settings)**
- `ConnectionStrings`: Database connection
- `Jwt`: JWT secret, issuer, audience, token expiration
- `InitialAdmin`: Seed admin user credentials
- `Encryption.Key`: AES encryption key for sensitive data
- `AppVersion`: Application version number

**Database settings (configurable via Admin > Listo Settings)**
- `OpenAI:ApiKey`: OpenAI API key (encrypted)
- `OpenAI:Model`: OpenAI model to use
- `DocumentStorage:BasePath`: File upload directory
- `DocumentStorage:MaxFileSizeMB`: Max upload size
- `DocumentStorage:AllowedExtensions`: Allowed file types

Use `ISettingsService` to read database settings:
```csharp
var apiKey = await _settingsService.GetValueAsync("OpenAI:ApiKey");
var maxSize = await _settingsService.GetIntValueAsync("DocumentStorage:MaxFileSizeMB", 250);
var extensions = await _settingsService.GetArrayValueAsync("DocumentStorage:AllowedExtensions");
```

Settings are cached in memory (30-minute TTL) and automatically invalidated when updated.

### Backend (appsettings.json)
Copy `appsettings.json.example` to `appsettings.json` and configure:
- ConnectionStrings.DefaultConnection: MySQL connection string
- Jwt.Secret: Min 32 character secret key
- Encryption.Key: Min 32 character encryption key
- InitialAdmin: Credentials for seeded admin user

### Key Dependencies
- **Backend**: BCrypt.Net-Next, Otp.NET (TOTP), QRCoder, Swashbuckle (Swagger)
- **Frontend**: Ant Design + Pro Components, TanStack Query, React Router v7

## API Documentation
Swagger UI available at http://localhost:5286/swagger during development.

## UI Patterns

### Action Toolbar
Pages with grids use a custom action toolbar above the table instead of ProTable's built-in toolbar:

```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    marginBottom: 16,
    background: '#fafafa',
    border: '1px solid #e8e8e8',
    borderRadius: 6,
    gap: 4,
    flexShrink: 0,
  }}
>
  <Tooltip title="Add Item">
    <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreate} />
  </Tooltip>
  <Tooltip title="Edit">
    <Button type="text" size="small" icon={<EditOutlined />} disabled={selectedRowKeys.length !== 1} />
  </Tooltip>
  {/* Divider between button groups */}
  <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
  {/* More buttons... */}
  <div style={{ flex: 1 }} />
  {selectedRowKeys.length > 0 && (
    <span style={{ color: '#8c8c8c', fontSize: 12 }}>{selectedRowKeys.length} selected</span>
  )}
</div>
```

Key patterns:
- Icon-only buttons with `type="text"` and `size="small"`
- Tooltips on all buttons
- Vertical dividers (`borderLeft`) between logical button groups
- Selection count on the right side

### Modal Forms
All modal forms use a compact, dense layout:

```tsx
<Modal title="Add Item" open={visible} onCancel={onClose} footer={null} width={500}>
  <Form form={form} layout="vertical" onFinish={handleSubmit} size="small" requiredMark={false} autoComplete="off">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Form.Item name="field" label="Label" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
        <Input />
      </Form.Item>
      {/* More fields... */}
      <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
        <Space>
          <Button type="primary" htmlType="submit">Create</Button>
          <Button onClick={onClose}>Cancel</Button>
        </Space>
      </Form.Item>
    </div>
  </Form>
</Modal>
```

Key patterns:
- Form with `size="small"` and `requiredMark={false}`
- Wrapper div with `display: flex; flexDirection: column; gap: 4`
- All Form.Items have `style={{ marginBottom: 0 }}`
- Submit button row has `marginTop: 12`
- Primary action button comes first, then Cancel
- Use `<Space size="middle">` to place multiple fields on same row
