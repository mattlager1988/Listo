# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Listo is a full-stack web application with a .NET 10 backend API and React 19 frontend. It serves as a personal management tool covering finance/bills, aviation training, and document storage. The application includes user management with JWT authentication, refresh tokens, and TOTP-based MFA.

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
- **Controllers/**: API endpoints organized by domain (Auth, Users, System, Finance: Accounts/Payments/CyclePlans/BankAccounts, Aviation: TrainingLogs/Notes/Documents, Admin: Settings/ListManager)
- **Services/**: Business logic with interface+implementation in same file (e.g., `IAccountService` + `AccountService` in `AccountService.cs`)
- **Models/**: Entity Framework entities extending `BaseEntity` (SysId, timestamps, audit fields)
- **DTOs/**: Request/response records grouped by domain (LksemDtos.cs, AviationDtos.cs, AuthDtos.cs, etc.)
- **Data/**: `ListoDbContext` with MySQL via Pomelo provider, fluent configuration with snake_case column mapping
- **Migrations/**: EF Core migrations

### Frontend Structure (listo/listo-web)
- **pages/**: Route components organized by domain
  - `Login.tsx`, `Dashboard.tsx`, `Profile.tsx`, `Settings.tsx`, `UserManagement.tsx`
  - `finance/`: `Accounts.tsx`, `CyclePlans.tsx`, `CyclePlanWork.tsx`, `Documents.tsx`
  - `aviation/`: `TrainingTracker.tsx`, `Documents.tsx`, `Notes.tsx`
  - `admin/`: `ListManager.tsx`, `ListoSettings.tsx`
  - Domain index files (`finance/index.tsx`, etc.) are simple `<Outlet />` layout wrappers
- **components/**: Reusable components
  - `ProtectedRoute.tsx` - Route guard with role-based access (`requiredRole` prop)
  - `PageHeader.tsx` - Consistent page title bar
  - `DocumentList.tsx` - Reusable document grid with upload/view/edit/delete
  - `DocumentUpload.tsx` - File upload modal with drag-and-drop
  - `CardViewModal.tsx` - Credit card management (tile + detail panel layout)
  - `AiAnalysisModal.tsx` - AI analysis with markdown rendering
  - `RichTextEditor.tsx` - TipTap-based WYSIWYG editor
  - `PhoneInput.tsx` - Auto-formatting phone number input
- **contexts/**: `AuthContext` manages auth state, user info, login/logout
- **services/**: `api.ts` - Axios instance with JWT interceptors and auto-refresh
- **layouts/**: `MainLayout.tsx` - Sidebar + header layout with Ant Design
- **theme/**: `theme.ts` - Ant Design theme configuration

### Routing Structure
```
/ (ProtectedRoute + MainLayout)
├── / (Dashboard)
├── /profile
├── /settings
├── /finance (FinanceLayout - Outlet wrapper)
│   ├── /finance/accounts
│   ├── /finance/cycleplans
│   ├── /finance/cycleplans/:id (CyclePlanWork)
│   └── /finance/documents
├── /aviation (AviationLayout - Outlet wrapper)
│   ├── /aviation/training
│   ├── /aviation/documents
│   └── /aviation/notes
└── /admin (ProtectedRoute requiredRole="admin" + AdminLayout)
    ├── /admin/users
    ├── /admin/lists
    └── /admin/settings
```

### Authentication Flow
1. Login returns JWT access token (15min) + refresh token (2 days)
2. If MFA enabled, login returns mfaToken requiring verification
3. Axios interceptor auto-refreshes expired access tokens via `/api/auth/refresh`
4. Tokens stored in localStorage (`accessToken`, `refreshToken`)
5. On 401 after refresh failure, redirects to `/login`

### Database
- MySQL with Pomelo EF Core provider
- `database/init.sql`: Initial schema
- Primary key field: `sys_id` (BIGINT AUTO_INCREMENT)
- Column naming: `snake_case` in DB, `PascalCase` in C# (mapped via fluent API)
- Audit fields: `create_timestamp`, `modify_timestamp`, `create_user`, `modify_user`

### Audit Fields Pattern
All entities extend `BaseEntity` which includes audit fields automatically populated by `ListoDbContext.SaveChangesAsync()`:
- `create_timestamp`: Set to UTC now on insert
- `modify_timestamp`: Set to UTC now on insert and update
- `create_user`: Set to current user's `sys_id` on insert (from JWT `sub` claim)
- `modify_user`: Set to current user's `sys_id` on insert and update

No manual population needed in services or controllers.

## Configuration

### Settings Architecture
The application uses a two-tier settings system:

**appsettings.json (infrastructure settings)**
- `ConnectionStrings`: Database connection
- `Jwt`: JWT secret, issuer, audience, token expiration
- `InitialAdmin`: Seed admin user credentials
- `Encryption.Key`: AES encryption key for sensitive data

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
- **Frontend**: Ant Design + Pro Components, TanStack Query, React Router v7, @ant-design/charts, @dnd-kit (drag-and-drop), TipTap (rich text), dayjs, jsPDF, react-markdown

## API Documentation
Swagger UI available at http://localhost:5286/swagger during development.

---

## UI Patterns

### Page Layout Pattern
Every page follows this structure:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
  <PageHeader title="Page Title" />
  {/* Action Toolbar (if grid page) */}
  <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
    {/* ProTable or Table content */}
  </div>
</div>
```

The `PageHeader` component provides a consistent title bar:
```tsx
<PageHeader title="Page Title" actions={<Button>Optional Action</Button>} />
```
Style: `Title level={2}`, gradient background (#f8fafc → #f1f5f9), 1px solid #e2e8f0 border, 4px radius.

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
  {/* Discontinue/Delete buttons */}
  <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
  {/* Utility buttons (Refresh, etc.) */}
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
- Destructive actions (discontinue/delete) use `danger` prop and `Popconfirm`

### Grid/Table Pattern
All data grids follow these conventions:

```tsx
<div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
  <ProTable
    columns={columns}
    dataSource={data}
    rowKey={(record) => record.sysId.toString()}
    loading={loading}
    search={false}
    options={false}
    tableAlertRender={false}
    pagination={false}
    toolBarRender={false}
    rowSelection={{
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      getCheckboxProps: (record) => ({
        disabled: 'isGroupHeader' in record,
        style: 'isGroupHeader' in record ? { display: 'none' } : undefined,
      }),
    }}
    onRow={(record) => ({
      onClick: () => {
        if ('isGroupHeader' in record) return;
        const key = record.sysId.toString();
        setSelectedRowKeys(prev =>
          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
      },
      onDoubleClick: () => handleEdit(record),
      style: { cursor: 'pointer' },
    })}
  />
</div>
```

Key patterns:
- `condensed-table` CSS class for compact 11px font, tight padding (2px 6px)
- ProTable with `search={false}`, `options={false}`, `toolBarRender={false}`, `tableAlertRender={false}` (toolbar is custom)
- Row click toggles selection, double-click opens edit
- `pagination={false}` - no pagination, all data loaded
- Group headers supported via `isGroupHeader` discriminator pattern

### Row Grouping Pattern
Used in CyclePlans, DocumentList, etc. for grouping rows by category:

```tsx
interface GroupHeader {
  sysId: string;        // e.g., 'group-active'
  isGroupHeader: true;  // Discriminator
  groupLabel: string;
  children: DataItem[];
  // Aggregate fields (totals, counts)
}

// In expandable config:
expandable={{
  expandedRowKeys: expandedGroups,
  onExpandedRowsChange: (keys) => setExpandedGroups(keys),
  childrenColumnName: 'children',
}}

// Column renders check for group headers:
render: (_, record) => {
  if ('isGroupHeader' in record) {
    return <span style={{ fontWeight: 600 }}>{record.groupLabel}</span>;
  }
  return record.fieldValue;
}

// Group header row styling:
style: {
  cursor: 'isGroupHeader' in record ? 'default' : 'pointer',
  background: 'isGroupHeader' in record ? '#f5f5f5' : undefined,
  fontWeight: 'isGroupHeader' in record ? 600 : undefined,
}
```

### Inline Editing Pattern
Used in CyclePlans for quick field edits without opening a modal:

```tsx
const [editingCell, setEditingCell] = useState<{ sysId: number; field: string } | null>(null);

// In column render:
const isEditing = editingCell?.sysId === record.sysId && editingCell?.field === 'fieldName';
if (isEditing) {
  return (
    <InputNumber
      autoFocus
      size="small"
      defaultValue={record.fieldValue}
      onBlur={(e) => handleInlineUpdate(record, 'fieldName', parseFloat(e.target.value))}
      onPressEnter={(e) => handleInlineUpdate(record, 'fieldName', parseFloat(e.target.value))}
      onKeyDown={(e) => e.key === 'Escape' && setEditingCell(null)}
    />
  );
}
return (
  <Tag style={{ cursor: 'pointer' }} onClick={(e) => {
    e.stopPropagation();
    setEditingCell({ sysId: record.sysId, field: 'fieldName' });
  }}>
    {record.fieldValue}
  </Tag>
);
```

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

### Document Pages Pattern
Document pages are thin wrappers around the reusable `DocumentList` component:

```tsx
const Documents: React.FC = () => (
  <div>
    <PageHeader title="Aviation Documents" />
    <DocumentList
      module="aviation"           // Module identifier
      entityType="general"        // Entity type
      showUpload={true}
      showDocumentType={true}     // Enable grouping by document type
      documentTypeEndpoint="/aviation/documenttypes"  // Custom endpoint for types
    />
  </div>
);
```

The `DocumentList` component handles:
- File upload via `DocumentUpload` component (modal with drag-and-drop)
- Inline viewing of PDFs and images in a modal
- Download with progress tracking
- Edit document metadata (description, type, replace file)
- Bulk delete with selection
- Search and type filtering
- Document type grouping with expand/collapse

### Dashboard Pattern
The dashboard uses a widget-based layout with drag-and-drop reordering:
- Widgets are defined as a `WidgetConfig[]` array with `id` and `width` ('full' | 'half')
- Layout is persisted to the API via `GET/PUT /dashboard/layout`
- Uses `@dnd-kit` for drag-and-drop (`SortableContext`, `useSortable`)
- Lock/unlock button toggles editability
- Each widget renders a `Card` with `size="small"`

### Saved Views Pattern
The Accounts page supports saved column configurations:
- Users can save/load/delete views with custom column visibility, order, and sort
- Backend: `SavedView` entity with `ViewType`, `Configuration` (JSON), `IsDefault`
- Configuration stored as JSON string containing column settings, sort, and filter state

---

## Backend Patterns

### Controller Pattern
```csharp
[ApiController]
[Route("api/finance/[controller]")]  // Route prefix by domain
[Authorize]                           // All endpoints require auth by default
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountResponse>>> GetAll() { ... }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountResponse>> GetById(long id) { ... }

    [HttpPost]
    public async Task<ActionResult<AccountResponse>> Create([FromBody] CreateAccountRequest request) { ... }

    [HttpPut("{id}")]
    public async Task<ActionResult<AccountResponse>> Update(long id, [FromBody] UpdateAccountRequest request) { ... }
}
```

Route prefix conventions:
- Finance: `api/finance/[controller]` (accounts, payments, bankaccounts, cycleplans, etc.)
- Aviation: `api/aviation/[controller]` (traininglogs, notes, aircraft, etc.)
- Admin: `api/[controller]` (users, settings, system)
- Documents: `api/[controller]` (shared across modules)

### Service Pattern
Interface and implementation in the same file:
```csharp
public interface IAccountService
{
    Task<IEnumerable<AccountResponse>> GetAllAccountsAsync();
    Task<AccountResponse?> GetAccountByIdAsync(long id);
    Task<AccountResponse> CreateAccountAsync(CreateAccountRequest request);
    Task<AccountResponse?> UpdateAccountAsync(long id, UpdateAccountRequest request);
}

public class AccountService : IAccountService
{
    private readonly ListoDbContext _context;
    // Constructor injection...
    // MapToResponse helper method for entity → DTO mapping
}
```

Registered in `Program.cs` as scoped: `builder.Services.AddScoped<IAccountService, AccountService>();`

### DTO Pattern
DTOs use C# records grouped by domain in dedicated files:
```csharp
// Response records (read)
public record AccountResponse(long SysId, string Name, ...);

// Create request records (all required fields)
public record CreateAccountRequest(string Name, long AccountTypeSysId, ...);

// Update request records (all nullable for partial updates)
public record UpdateAccountRequest(string? Name, long? AccountTypeSysId, ...);
```

DTO file organization:
- `LksemDtos.cs` - Finance domain (Accounts, Payments, BankAccounts, CyclePlans, etc.)
- `AviationDtos.cs` - Aviation domain (TrainingLogs, Notes)
- `AuthDtos.cs` - Authentication
- `UserDtos.cs` - User management
- `DocumentDtos.cs` - Documents
- `SettingDtos.cs` - Settings
- `DashboardDtos.cs` - Dashboard
- `AiPromptDtos.cs` - AI prompts
- `AccountCardDtos.cs` - Account cards

### Error Handling Pattern
```csharp
// In service: throw ArgumentException for validation errors
if (!Enum.TryParse<AccountFlag>(request.AccountFlag, out var flag))
    throw new ArgumentException("Invalid account flag");

// In controller: catch and return BadRequest with message
try {
    var result = await _service.CreateAsync(request);
    return CreatedAtAction(nameof(GetById), new { id = result.SysId }, result);
} catch (ArgumentException ex) {
    return BadRequest(new { message = ex.Message });
}
```

Frontend error handling:
```tsx
catch (err: unknown) {
  const error = err as { response?: { data?: { message?: string } } };
  message.error(error.response?.data?.message || 'Operation failed');
}
```

### Soft Delete Pattern (Discontinue/Reactivate)
Used for entities where historical data or recovery is valuable.

Backend:
- Entity fields: `IsDiscontinued` (bool), `DiscontinuedDate` (DateTime?)
- Default list filters discontinued: `Where(x => !x.IsDiscontinued)`
- `GET /discontinued` returns only discontinued items
- `POST /{id}/discontinue` sets `IsDiscontinued=true`, `DiscontinuedDate=UTC now`
- `POST /{id}/reactivate` sets `IsDiscontinued=false`, `DiscontinuedDate=null`

Frontend:
- "Discontinue" button (`StopOutlined`, `danger`) with `Popconfirm`
- "View Discontinued" button (`InboxOutlined`) opens modal with reactivate option
- Bulk discontinue supported via selection

Entities using soft delete: Accounts, CyclePlans, BankAccounts, Users (Deactivate/Reactivate), ListManager items (+ Purge for unused)

### Hard Delete Pattern
Used for transactional/log data where recovery is not needed:
- `DELETE /{id}` endpoint
- `Popconfirm` in frontend before delete
- Bulk delete via selection: `Promise.all(selectedIds.map(id => api.delete(...)))`

Entities using hard delete: Notes, TrainingLogs, Documents (also deletes file from disk), CycleTransactions

### Encryption Pattern
Sensitive fields (passwords, account numbers) are encrypted at rest:
```csharp
// Encrypt on save
account.Password = _encryptionService.Encrypt(request.Password);

// Decrypt on read (in MapToResponse)
Password: a.Password != null ? _encryptionService.Decrypt(a.Password) : null
```

### List Manager Pattern (Admin)
Lookup tables (AccountTypes, PaymentMethods, Aircraft, etc.) are managed through the admin ListManager page. Each list type follows the same backend pattern:
- CRUD endpoints for the list items
- `IsDeleted` soft delete with usage count to prevent deletion of in-use items
- Purge endpoint to hard-delete unused items

---

## Mobile / Responsive Considerations

The application does not currently have dedicated mobile breakpoints or responsive hooks. It relies on:
- Ant Design's built-in responsive grid (`Col xs={24} sm={12} lg={6}`) for dashboard widgets
- Standard CSS box model that naturally adapts
- Fixed sidebar layout (collapses to 80px width)

When implementing mobile-specific features:
- There are no existing `useBreakpoint`, `isMobile`, or media query patterns to follow
- No `@media` queries exist in the CSS
- The `MainLayout` uses a fixed sidebar - consider mobile-friendly alternatives for new features
- Document viewer modals use `width="80%"` and `height: calc(100vh - 150px)` - test on small viewports
- Content area has `margin: 24px; padding: 24px` which may need reduction on mobile
- Tables use `calc(100vh - Npx)` for scroll heights - values vary by page (112px container, 280-580px table scroll)

---

## CSS Classes

### condensed-table
Applied to table wrapper divs for compact display:
- Font size: 11px
- Cell padding: 2px 6px
- Compact tags: 11px font, 16px line-height, 0 4px padding

### rich-text-content
Viewer styles matching the TipTap editor output.

### markdown-content
Styles for AI analysis markdown rendering (headings, lists, code blocks, tables, blockquotes).

### tiptap
Editor styles for the TipTap rich text editor.
