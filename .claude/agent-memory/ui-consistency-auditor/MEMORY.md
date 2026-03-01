# UI Consistency Auditor Memory

## Listo Codebase - Established UI Patterns

### Button Labels & Actions
- **Modal Submit Buttons:** Use "Create" for new items, "Update" for edits
- **Cancel Button:** Always labeled "Cancel" with no icon
- **Primary Buttons:** Use "Save", "Create", "Update" depending on context
- **Danger Buttons:** Use "Delete" for destructive actions with icon and danger prop
- **Empty State Buttons:** Can use longer phrases like "Add Your First Account" (friendly variant acceptable)

### Success Message Format
- **Standard Pattern:** `"[Entity] [verb] successfully"` (e.g., "User created successfully")
- **All Actions:** Must include "successfully" suffix for consistency
- **Example Messages:**
  - "User created successfully"
  - "User updated successfully"
  - "User deleted successfully"
  - "Account updated successfully"

### Page Headers & Titles
- **Level:** Use `Title level={2}` for main page headers
- **Capitalization:** Title Case for page names
- **Examples:** "Dashboard", "User Management", "Edit Profile", "Settings"

### Modal Titles
- **Pattern:** Conditional based on mode: `editingItem ? 'Edit [Entity]' : 'Create [Entity]'`
- **Capitalization:** Title Case (e.g., "Edit Account", "Create User")

### Form Labels
- **Capitalization:** Title Case (e.g., "First Name", "Last Name", "Phone Number")
- **No Abbreviations:** Spell out full words ("Phone Number" not "Phone #")
- **Required Fields:** Use `rules={[{ required: true, message: '[Field] is required' }]}`

### Table Column Headers
- **Capitalization:** Title Case
- **Examples:** "Name", "Email", "Status", "Actions"

### Navigation Menu
- **Labels:** Title Case (e.g., "User Management", "List Manager")
- **Icons:** Use appropriate Ant Design icons (BankOutlined for financial, TeamOutlined for users, etc.)
- **Nesting:** Group related features under parent menu items

### Popconfirm Dialogs
- **Title Format:** Sentence case question (e.g., "Delete user?")
- **Description:** Professional phrasing (e.g., "This action cannot be undone.")

### Empty States
- **Components:** Use Ant Design `<Empty />` component with custom description
- **Button:** Can include longer friendly text for context

### Icons
- **Edit Actions:** `<EditOutlined />`
- **Delete Actions:** `<DeleteOutlined />` with danger prop
- **Create/Add:** `<PlusOutlined />`
- **Other:** Use semantically appropriate Ant Design icons

---

## LKSEM Module Audit (2026-03-01)

### Issues Found: 7 (0 Critical, 1 Moderate, 6 Minor)

**Moderate Issues Identified:**
1. Success messages missing "successfully" suffix (5 instances)
   - Accounts.tsx lines: 200, 247, 250, 269, 287

**Minor Issues Identified:**
1. Form labels use abbreviations ("Account #", "Phone #")
   - Accounts.tsx lines: 614, 618
2. Popconfirm titles use dynamic lowercase (minor style issue)
   - ListManager.tsx lines: 165, 185
3. Empty state button uses longer phrase (acceptable variant)

**Consistency Verified:**
- ✓ Modal button labels (Create/Update/Cancel)
- ✓ Modal titles format
- ✓ Table headers capitalization
- ✓ Icon usage patterns
- ✓ Menu structure and labels
- ✓ Form layout patterns

### Recommended Fixes (2 Priority Levels)

**Priority 1 - Must Fix (5 changes):**
- Standardize success messages to include "successfully"

**Priority 2 - Should Fix (2 changes):**
- Expand form label abbreviations to full words

**Full Audit:** See lksem-audit-report.md

---

## General Audit Tips

1. Always compare against multiple reference files (not just one)
2. Look for patterns in message formatting - small variations compound
3. Form labels should never use abbreviations (accessibility + consistency)
4. Success/error messages should follow consistent grammatical structure
5. Empty states are acceptable places for friendly variant wording
6. Modal titles should follow the edit/create pattern consistently
7. All destructive actions should use danger buttons with popconfirm
