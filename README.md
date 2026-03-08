# DMS Issue Tracker

Internal issue tracking and management system for Ali & Sons. Tracks issues across business processes with full lifecycle management — creation, assignment, resolution, reopening, and dependent-process testing.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Issue Lifecycle](#issue-lifecycle)
- [User Permissions](#user-permissions)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment — Windows (IIS)](#deployment--windows-iis)
- [Deployment — Linux (systemd + Nginx)](#deployment--linux-systemd--nginx)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
                         +-----------------------+
                         |     EDP Portal        |
                         |  (edp.ali-sons.com)   |
                         +----------+------------+
                                    |
                              ?auth={token}
                                    |
                                    v
+-------------------+       +-----------------+       +---------------------+
|   React SPA       | <---> |  .NET 10 API    | <---> | SQL Server 2022     |
|   (Vite + TS)     |  REST |  (Minimal API)  | SP    | (ASETIDEV02)        |
|   Static files    |       |  Dapper ORM     |       | DB: IssuesTracker   |
+-------------------+       +--------+--------+       +---------------------+
                                     |
                                     | Inline SQL (read-only)
                                     v
                             +------------------+
                             | Intranet_live DB |
                             | (ASETIDEV02)     |
                             | v_employee_list  |
                             +------------------+
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | .NET Minimal API | 10 |
| **ORM** | Dapper | Latest |
| **Password Hashing** | BCrypt.Net-Next | Latest |
| **Frontend** | React + Vite + TypeScript | 19 |
| **UI Library** | shadcn/ui + Tailwind CSS | v4 |
| **Charts** | Recharts | Latest |
| **Database** | SQL Server | 2022 |
| **Auth** | EDP Portal SSO (token) + BCrypt (admin) | — |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ISSUE TRACKING DOMAIN                               │
│                                                                                  │
│  ┌──────────────────┐          ┌──────────────────────────┐                     │
│  │  MasterProcesses │          │         Issues           │                     │
│  │──────────────────│          │──────────────────────────│                     │
│  │ *Id  NVARCHAR(10)│◄─────┐  │ *Id       INT IDENTITY   │                     │
│  │  Name            │      │  │  ProcessId               │──────┐              │
│  │  Description     │      │  │  TaskId                  │      │              │
│  │  DisplayOrder    │      │  │  IssueDate               │      │              │
│  │  IsActive        │      │  │  IssueRaisedBy           │      │              │
│  └────────┬─────────┘      │  │  IssueTitle              │      │              │
│           │1               │  │  IssueDescription        │      │              │
│           │                │  │  Status                  │      │              │
│           │N               │  │  Severity                │      │              │
│  ┌────────┴─────────┐      │  │  AssignedTo              │      │              │
│  │   MasterTasks    │      │  │  AssigningDate           │      │              │
│  │──────────────────│      │  │  DueDate                 │      │              │
│  │ *Id  NVARCHAR(10)│      │  │  CurrentVersion          │      │              │
│  │  Name            │      │  │  ReopenCount             │      │              │
│  │  ProcessId (FK)  │      │  │  CreatedAt               │      │              │
│  │  DisplayOrder    │      │  │  UpdatedAt               │      │              │
│  │  IsActive        │      │  └──────────┬───────────────┘      │              │
│  └──────────────────┘      │             │1                     │              │
│                            │             │                      │              │
│           ┌────────────────┼─────────┬───┴──────┬───────────────┘              │
│           │                │         │          │                              │
│           │N               │N        │N         │N                             │
│  ┌────────┴─────────┐  ┌──┴──────────────┐  ┌──┴───────────────┐             │
│  │  IssueVersions   │  │ IssueDependentP. │  │  FileAttachments │             │
│  │──────────────────│  │─────────────────│  │──────────────────│             │
│  │ *Id   INT IDENT. │  │ *Id  INT IDENT. │  │ *Id  INT IDENT.  │             │
│  │  IssueId (FK)    │  │  IssueId (FK)   │  │  IssueId (FK)    │             │
│  │  VersionNumber   │  │  ProcessId      │  │  FileName        │             │
│  │  CreatedDate     │  └─────────────────┘  │  FileSize        │             │
│  │  AssignedTo      │                       │  ContentType     │             │
│  │  Status          │                       │  DataUrl         │             │
│  │  ReopenReason    │                       └──────────────────┘             │
│  │  ChangesSummary  │                                                        │
│  │  ModifiedBy      │       ┌──────────────────┐                             │
│  └────────┬─────────┘       │   Resolutions    │                             │
│           │                 │──────────────────│                             │
│           │            ┌───►│ *Id  INT IDENT.  │◄──── Issues.Id (1:N)       │
│           │            │    │  IssueId (FK)    │                             │
│           │            │    │  VersionNumber   │                             │
│           │            │    │  ResolvedDate    │                             │
│           │            │    │  ResolvedBy      │                             │
│           │            │    │  ResolutionNotes │                             │
│           │            │    │  RootCause       │                             │
│           │            │    │  PreventiveMeas. │                             │
│           │            │    │  VerificationDate│                             │
│           │            │    └────────┬─────────┘                             │
│           │            │             │1                                       │
│           │            │             │                                        │
│           │            │             │N                                       │
│           │            │    ┌────────┴──────────────────┐                    │
│           │            │    │  ResolutionTesters        │                    │
│           │            │    │───────────────────────────│                    │
│           │            │    │ *Id  INT IDENT.           │                    │
│           │            │    │  ResolutionId (FK)        │                    │
│           │            │    │  UserId                   │                    │
│           │            │    └──────────────────────────┘                     │
│           │            │                                                     │
│           │N           │1                                                    │
│  ┌────────┴────────────┴────────────────┐                                   │
│  │  DependentProcessTestResults         │                                   │
│  │──────────────────────────────────────│                                   │
│  │ *Id            INT IDENTITY          │                                   │
│  │  ResolutionId  INT (FK, nullable)    │                                   │
│  │  VersionId     INT (FK, nullable)    │                                   │
│  │  ProcessId     NVARCHAR(100)         │                                   │
│  │  Tested        BIT                   │                                   │
│  │  TestDate      DATETIME2             │                                   │
│  └────────────────┬─────────────────────┘                                   │
│                   │1                                                         │
│                   │N                                                         │
│          ┌────────┴─────────────┐                                           │
│          │  TestResultTesters   │                                           │
│          │──────────────────────│                                           │
│          │ *Id  INT IDENT.      │                                           │
│          │  TestResultId (FK)   │                                           │
│          │  UserId              │                                           │
│          └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADMINISTRATION DOMAIN                               │
│                                                                              │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │  MasterStatuses  │   │ MasterSeverities │   │ AdminCredentials │        │
│  │──────────────────│   │──────────────────│   │──────────────────│        │
│  │ *Id  INT IDENT.  │   │ *Id  INT IDENT.  │   │ *Id  INT IDENT.  │        │
│  │  Name (UNIQUE)   │   │  Name (UNIQUE)   │   │  Username (UQ)   │        │
│  │  Label           │   │  Label           │   │  PasswordHash    │        │
│  │  TextColor       │   │  TextColor       │   │  CreatedAt       │        │
│  │  BgColor         │   │  BgColor         │   └──────────────────┘        │
│  │  ChartColor      │   │  DisplayOrder    │                               │
│  │  DisplayOrder    │   │  IsActive        │                               │
│  │  IsActive        │   └──────────────────┘                               │
│  └──────────────────┘                                                       │
│                                                                              │
│  ┌──────────────────┐         ┌──────────────────┐                          │
│  │   MasterUsers    │ 1 ──── 1│ UserPermissions  │                          │
│  │──────────────────│         │──────────────────│                          │
│  │ *Id NVARCHAR(10) │         │ *Id  INT IDENT.  │                          │
│  │  Name            │         │  UserId (UQ, FK) │                          │
│  │  Email           │         │  CanCreateIssue  │                          │
│  │  DisplayOrder    │         │  CanEditIssue    │                          │
│  │  IsActive        │         │  CanResolveIssue │                          │
│  └──────────────────┘         │  CanBulkUpload   │                          │
│                               │  CanAccessAdmin  │                          │
│                               │  IsBlocked       │                          │
│                               └──────────────────┘                          │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │    AuditLog       │                                                       │
│  │──────────────────│                                                       │
│  │ *Id  INT IDENT.  │                                                       │
│  │  Action          │  -- Created, Updated, Deleted, Resolved, Reopened,    │
│  │  EntityType      │  -- Restored                                          │
│  │  EntityId (INT)  │  -- Issue ID or other entity ID                       │
│  │  UserId          │                                                       │
│  │  Details (JSON)  │                                                       │
│  │  IpAddress       │                                                       │
│  │  Timestamp       │                                                       │
│  └──────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL: Intranet_live (read-only)                        │
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │  tbl_token_redirect  │     │  v_employee_list     │                      │
│  │──────────────────────│     │──────────────────────│                      │
│  │  tokenid             │     │  emp_id              │                      │
│  │  userempid           │     │  emp_name            │                      │
│  │  userid              │     │  email               │                      │
│  │  username            │     │  dept                 │                      │
│  │  isexpired           │     │  designation          │                      │
│  │  create_time         │     │  active_status        │                      │
│  └──────────────────────┘     └──────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Table Details

#### Issues (Core)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | INT | PK, IDENTITY | Auto-increment issue ID |
| `ProcessId` | NVARCHAR(100) | NOT NULL | Business process reference |
| `TaskId` | NVARCHAR(100) | NOT NULL | Task within the process |
| `IssueDate` | DATETIME2 | NOT NULL | When the issue occurred |
| `IssueRaisedBy` | NVARCHAR(100) | NOT NULL | Employee who raised it |
| `IssueTitle` | NVARCHAR(500) | NOT NULL | Short title |
| `IssueDescription` | NVARCHAR(MAX) | DEFAULT '' | Detailed description |
| `Status` | NVARCHAR(50) | DEFAULT 'New' | Current status (from MasterStatuses) |
| `Severity` | NVARCHAR(50) | NOT NULL | Severity level (from MasterSeverities) |
| `AssignedTo` | NVARCHAR(100) | NOT NULL | Assigned user ID |
| `AssigningDate` | DATETIME2 | NULL | When assigned |
| `DueDate` | DATETIME2 | NULL | Target resolution date |
| `CurrentVersion` | INT | DEFAULT 1 | Increments on each reopen |
| `ReopenCount` | INT | DEFAULT 0 | Times reopened |
| `CreatedAt` | DATETIME2 | DEFAULT SYSUTCDATETIME() | Record creation |
| `UpdatedAt` | DATETIME2 | DEFAULT SYSUTCDATETIME() | Last modification |
| `IsDeleted` | BIT | DEFAULT 0 | Soft-delete flag |
| `DeletedAt` | DATETIME2 | NULL | When soft-deleted |
| `DeletedBy` | NVARCHAR(100) | NULL | Who deleted it |

#### AuditLog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | INT | PK, IDENTITY | Auto-increment audit ID |
| `Action` | NVARCHAR(50) | NOT NULL | Created, Updated, Deleted, Resolved, Reopened, Restored |
| `EntityType` | NVARCHAR(50) | NOT NULL | Issue, MasterData, etc. |
| `EntityId` | INT | NULL | Reference ID (e.g. Issue ID) |
| `UserId` | NVARCHAR(100) | NOT NULL | Who performed the action |
| `Details` | NVARCHAR(MAX) | NULL | JSON with change details / field diffs |
| `IpAddress` | NVARCHAR(50) | NULL | Client IP address |
| `Timestamp` | DATETIME2 | DEFAULT SYSUTCDATETIME() | When the action occurred |

**Indexes:** `IX_AuditLog_EntityType_EntityId`, `IX_AuditLog_UserId`, `IX_AuditLog_Timestamp`

#### Resolutions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | INT | PK, IDENTITY | Resolution ID |
| `IssueId` | INT | FK → Issues, CASCADE | Parent issue |
| `VersionNumber` | INT | NOT NULL | Issue version at resolution time |
| `ResolvedDate` | DATETIME2 | DEFAULT SYSUTCDATETIME() | When resolved |
| `ResolvedBy` | NVARCHAR(100) | NOT NULL | User who resolved |
| `ResolutionNotes` | NVARCHAR(MAX) | DEFAULT '' | Resolution details |
| `RootCause` | NVARCHAR(MAX) | DEFAULT '' | Root cause analysis |
| `PreventiveMeasures` | NVARCHAR(MAX) | DEFAULT '' | Steps to prevent recurrence |
| `VerificationDate` | DATETIME2 | NULL | When verified by testers |

#### Soft Delete & Cascade Delete

Deleting an issue performs a **soft delete** — the row is kept but marked `IsDeleted = 1` with a timestamp and actor. Soft-deleted issues are excluded from all queries and visible only in the Admin Recycle Bin.

**Admin Restore** undoes a soft delete (sets `IsDeleted = 0`, clears `DeletedAt`/`DeletedBy`).

**Admin Hard Delete** (permanent) cascades through the entire hierarchy:

```
HARD DELETE Issue (admin only, via sp_HardDeleteIssue)
  ├── DELETE IssueDependentProcesses  (ON DELETE CASCADE)
  ├── DELETE FileAttachments          (ON DELETE CASCADE)
  ├── DELETE IssueVersions            (ON DELETE CASCADE)
  ├── DELETE AuditLog entries         (EntityType='Issue', EntityId=@Id)
  └── DELETE Resolutions              (ON DELETE CASCADE)
        ├── DELETE ResolutionTesters   (ON DELETE CASCADE)
        └── DELETE DependentProcessTestResults
              └── DELETE TestResultTesters  (ON DELETE CASCADE)
```

> Hard deletion is wrapped in a transaction within `sp_HardDeleteIssue`.

### Stored Procedures (57)

All database operations go through stored procedures via Dapper with `CommandType.StoredProcedure`. The only exception is `IntranetRepository.cs` which uses inline SQL against the external `Intranet_live` database (no SP creation permissions on that shared DB). Migration 002 added 6 new SPs and updated 4 existing ones for audit trail and soft delete.

<details>
<summary>Click to expand full stored procedure list</summary>

| # | Procedure | Category | Description |
|---|-----------|----------|-------------|
| 1 | `sp_GetAllIssues` | Issues | List all issues (ordered by CreatedAt DESC) |
| 2 | `sp_GetIssueById` | Issues | Get single issue by ID |
| 3 | `sp_CreateIssue` | Issues | Insert new issue, return new ID |
| 4 | `sp_UpdateIssue` | Issues | Update issue fields |
| 5 | `sp_DeleteIssue` | Issues | Delete issue + all cascading data (transactional) |
| 6 | `sp_DeleteDependentProcesses` | Dep. Processes | Remove all dependent processes for an issue |
| 7 | `sp_AddDependentProcess` | Dep. Processes | Add a dependent process to an issue |
| 8 | `sp_GetDependentProcesses` | Dep. Processes | List dependent processes for an issue |
| 9 | `sp_AddAttachment` | Attachments | Add file attachment to an issue |
| 10 | `sp_GetAttachments` | Attachments | List attachments for an issue |
| 11 | `sp_AddVersion` | Versions | Add version record (on edit/reopen) |
| 12 | `sp_GetVersions` | Versions | List versions for an issue |
| 13 | `sp_AddResolution` | Resolutions | Add resolution record |
| 14 | `sp_GetLatestResolution` | Resolutions | Get latest resolution for an issue |
| 15 | `sp_AddResolutionTester` | Resolutions | Add tester to a resolution |
| 16 | `sp_GetResolutionTesters` | Resolutions | List testers for a resolution |
| 17 | `sp_AddDepTestResult` | Test Results | Add dependent process test result |
| 18 | `sp_GetDepTestResults` | Test Results | List test results for a resolution |
| 19 | `sp_AddTestResultTester` | Test Results | Add tester to a test result |
| 20 | `sp_GetTestResultTesters` | Test Results | List testers for a test result |
| 21 | `sp_GetMasterStatuses` | Master (Public) | Active statuses for dropdowns |
| 22 | `sp_GetMasterSeverities` | Master (Public) | Active severities for dropdowns |
| 23 | `sp_GetMasterProcesses` | Master (Public) | Active processes for dropdowns |
| 24 | `sp_GetMasterTasks` | Master (Public) | Active tasks for dropdowns |
| 25 | `sp_GetMasterUsers` | Master (Public) | Active users for dropdowns |
| 26 | `sp_GetAdminByUsername` | Admin Auth | Look up admin credentials |
| 27 | `sp_GetAllMasterStatuses` | Admin CRUD | All statuses (incl. inactive) |
| 28 | `sp_CreateMasterStatus` | Admin CRUD | Create new status |
| 29 | `sp_UpdateMasterStatus` | Admin CRUD | Update status |
| 30 | `sp_ToggleMasterStatusActive` | Admin CRUD | Toggle status active/inactive |
| 31 | `sp_GetAllMasterSeverities` | Admin CRUD | All severities (incl. inactive) |
| 32 | `sp_CreateMasterSeverity` | Admin CRUD | Create new severity |
| 33 | `sp_UpdateMasterSeverity` | Admin CRUD | Update severity |
| 34 | `sp_ToggleMasterSeverityActive` | Admin CRUD | Toggle severity active/inactive |
| 35 | `sp_GetAllMasterProcesses` | Admin CRUD | All processes (incl. inactive) |
| 36 | `sp_CreateMasterProcess` | Admin CRUD | Create new process |
| 37 | `sp_UpdateMasterProcess` | Admin CRUD | Update process |
| 38 | `sp_ToggleMasterProcessActive` | Admin CRUD | Toggle process active/inactive |
| 39 | `sp_GetAllMasterTasks` | Admin CRUD | All tasks (incl. inactive) |
| 40 | `sp_CreateMasterTask` | Admin CRUD | Create new task |
| 41 | `sp_UpdateMasterTask` | Admin CRUD | Update task |
| 42 | `sp_ToggleMasterTaskActive` | Admin CRUD | Toggle task active/inactive |
| 43 | `sp_GetAllMasterUsers` | Admin CRUD | All users (incl. inactive) |
| 44 | `sp_CreateMasterUser` | Admin CRUD | Create new user |
| 45 | `sp_UpdateMasterUser` | Admin CRUD | Update user |
| 46 | `sp_ToggleMasterUserActive` | Admin CRUD | Toggle user active/inactive |
| 47 | `sp_GetAllUserPermissions` | Permissions | All user permissions (joined with name) |
| 48 | `sp_GetUserPermissions` | Permissions | Permissions for a specific user |
| 49 | `sp_UpsertUserPermissions` | Permissions | Create or update user permissions |
| 50 | `sp_GetUserById` | Auth | Look up user + permissions by ID |
| 51 | `sp_EnsureUser` | Auth | Upsert user + default permissions |
| 52 | `sp_InsertAuditLog` | Audit | Insert an audit log entry |
| 53 | `sp_GetAuditLogs` | Audit | Paginated audit logs with optional filters |
| 54 | `sp_GetAuditLogsByIssue` | Audit | All audit logs for a specific issue |
| 55 | `sp_HardDeleteIssue` | Issues | Permanent delete with full cascade (admin only) |
| 56 | `sp_RestoreIssue` | Issues | Undo soft delete (admin only) |
| 57 | `sp_GetDeletedIssues` | Issues | List all soft-deleted issues (admin only) |

</details>

### Database Setup

The backend **auto-creates** all tables and stored procedures on startup via `DbInitializer.cs` (idempotent `IF NOT EXISTS` / `CREATE OR ALTER`). No manual SQL execution is needed for a fresh install.

For manual setup or CI/CD pipelines, a standalone SQL script is available:

```bash
# Run against your SQL Server instance
sqlcmd -S YOUR_SERVER -d master -i setup-database.sql
```

The script creates the `IssuesTracker` database, all 16 tables, and all 57 stored procedures.

---

## Authentication

### User Login (EDP Portal SSO)

```
User clicks DMS link on EDP Portal
         │
         ▼
EDP Portal generates token in Intranet_live.tbl_token_redirect
         │
         ▼
Redirects to: https://your-domain/?auth={token}
         │
         ▼
Frontend extracts token from URL
         │
         ▼
POST /api/auth/verify-token  { token }
         │
         ▼
Backend calls sp_token_redirect on Intranet_live DB
         │                                    │
    Token valid                         Token invalid/expired
         │                                    │
         ▼                                    ▼
Normalize emp ID (strip leading zeros)   Return 401
         │
         ▼
sp_GetUserById on IssuesTracker DB
         │                    │                    │
    User found            Not found            IsBlocked=1
    & active              in MasterUsers
         │                    │                    │
         ▼                    ▼                    ▼
    Return user +        Return 403            Return 403
    session token        "Not Registered"      { blocked: true }
```

**Key points:**
- Users must be **pre-added** by an admin (Admin Panel > Users). No auto-registration.
- Employee IDs are normalized (leading zeros stripped) to match admin-added format.
- Transient 500 errors are retried 3 times with exponential backoff (frontend).
- After successful token verification, the backend issues an **in-memory session token** (8-hour TTL) sent as `X-Session-Token` on subsequent requests.

### Admin Login (Password-based)

```
Admin navigates to /admin/login
         │
         ▼
POST /api/admin/login  { username, password }
         │
         ▼
sp_GetAdminByUsername → BCrypt.Verify(password, hash)
         │                    │
    Match                  No match
         │                    │
         ▼                    ▼
    Return admin token    Return 401
         │
         ▼
    Admin Dashboard
    (all /api/admin/* endpoints require X-Admin-Token header)
```

### Session Token Flow

```
Verify Token / Login As
         │
         ▼
Backend creates session token (GUID) → stores in ConcurrentDictionary (8hr TTL)
         │
         ▼
Frontend stores in sessionStorage["session_token"]
         │
         ▼
All /api/issues/* and /api/master/* requests include:
    Header: X-Session-Token: {token}
         │
         ▼
Endpoint filter validates token → 401 if invalid/expired
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/verify-token` | None | Verify EDP portal token, return user + session token |

### Issues (`/api/issues`) — requires `X-Session-Token`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/issues` | List all issues |
| GET | `/api/issues/{id}` | Get issue detail with versions, resolutions, attachments |
| POST | `/api/issues` | Create new issue |
| PATCH | `/api/issues/{id}` | Update issue fields |
| DELETE | `/api/issues/{id}` | Delete issue and all related data |
| POST | `/api/issues/{id}/resolve` | Resolve an issue |
| POST | `/api/issues/{id}/reopen` | Reopen a resolved issue |
| POST | `/api/issues/bulk` | Bulk upload issues from CSV |
| GET | `/api/issues/{id}/audit-log` | Audit trail for a specific issue |

### Master Data (`/api/master`) — requires `X-Session-Token`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/master` | Get all master data (statuses, severities, processes, tasks, users) |
| GET | `/api/master/statuses` | Get active statuses |
| GET | `/api/master/severities` | Get active severities |
| GET | `/api/master/processes` | Get active processes |
| GET | `/api/master/tasks` | Get active tasks |
| GET | `/api/master/users` | Get active users |

### Admin (`/api/admin`) — requires `X-Admin-Token`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login (username + password) |
| POST | `/api/admin/enter-app` | Login as user (opens main app as specific user) |
| GET/POST/PUT/DELETE | `/api/admin/statuses[/{id}]` | CRUD for statuses |
| GET/POST/PUT/DELETE | `/api/admin/severities[/{id}]` | CRUD for severities |
| GET/POST/PUT/DELETE | `/api/admin/processes[/{id}]` | CRUD for processes |
| GET/POST/PUT/DELETE | `/api/admin/tasks[/{id}]` | CRUD for tasks |
| GET/POST/PUT/DELETE | `/api/admin/users[/{id}]` | CRUD for users |
| GET | `/api/admin/employees/search?q=` | Search Intranet employee directory |
| POST | `/api/admin/employees/add` | Add Intranet employee as DMS user |
| GET | `/api/admin/permissions` | List all user permissions |
| GET/PUT | `/api/admin/permissions/{userId}` | Get/update user permissions |
| GET | `/api/admin/audit-logs` | Paginated audit logs (filterable by entity, user, action) |
| GET | `/api/admin/audit-logs/issue/{issueId}` | Audit logs for a specific issue |
| GET | `/api/admin/deleted-issues` | List soft-deleted issues (recycle bin) |
| POST | `/api/admin/deleted-issues/{id}/restore` | Restore a soft-deleted issue |
| POST | `/api/admin/deleted-issues/{id}/hard-delete` | Permanently delete an issue |

---

## Issue Lifecycle

```
New Issue Created
     │
     ▼
  [New] ──► Assigned ──► [In Progress]
                              │
                      ┌───────┴───────┐
                      │               │
                      ▼               ▼
               [Resolved]        [On Hold]
                   │                  │
                   ▼                  ▼
              (can reopen)     (back to In Progress)
                   │
                   ▼
              [Reopened] ──► new version created ──► (cycle repeats)
```

Each reopen increments the version number. All changes are tracked in `IssueVersions`. Resolutions include root cause analysis, preventive measures, and dependent process test results.

---

## User Permissions

| Permission | Controls |
|-----------|----------|
| `CanCreateIssue` | Create new issues + bulk upload |
| `CanEditIssue` | Edit issue fields |
| `CanResolveIssue` | Resolve and reopen issues |
| `CanBulkUpload` | Access bulk CSV upload |
| `CanAccessAdmin` | Access admin panel |
| `IsBlocked` | Completely blocks login |

---

## Project Structure

```
DMS_WebApp/
├── backend/                          # .NET 10 Minimal API
│   ├── Data/
│   │   ├── DbInitializer.cs          # Schema + all 51 stored procedures (auto-runs on startup)
│   │   ├── IDbConnectionFactory.cs    # Connection factory interface
│   │   ├── SqlServerConnectionFactory.cs
│   │   └── SeedData.cs               # Default master data seed
│   ├── Endpoints/
│   │   ├── IssueEndpoints.cs          # /api/issues/*  (session-protected)
│   │   ├── MasterDataEndpoints.cs     # /api/master/*  (session-protected)
│   │   └── AdminEndpoints.cs          # /api/admin/* + /api/auth/*
│   ├── Models/
│   │   ├── IssueModels.cs             # Issue, IssueVersion, Resolution DTOs
│   │   ├── AdminModels.cs             # Admin DTOs + IntranetEmployee
│   │   ├── AuditLog.cs                # AuditLog entity
│   │   └── ...                        # FileAttachment, MasterData, etc.
│   ├── Repositories/
│   │   ├── IssueRepository.cs         # Issues CRUD (all stored procedures)
│   │   ├── MasterDataRepository.cs    # Master data reads
│   │   ├── AdminRepository.cs         # Admin CRUD + permissions
│   │   ├── AuditRepository.cs         # Audit log + soft-delete operations
│   │   └── IntranetRepository.cs      # Intranet DB (read-only, inline SQL)
│   ├── Services/
│   │   ├── IssueService.cs            # Business logic (parallel query hydration)
│   │   ├── MasterDataService.cs
│   │   ├── AdminService.cs            # Admin auth + token management
│   │   └── SessionStore.cs            # In-memory session token store (8hr TTL)
│   ├── Program.cs                     # App bootstrap, DI, middleware
│   ├── appsettings.json               # Base configuration
│   ├── appsettings.Development.json   # Dev overrides (local DB)
│   ├── appsettings.Production.json    # Prod overrides (server DB)
│   └── DMS.API.csproj
│
├── frontend/                        # React 19 + Vite SPA
│   ├── public/
│   │   ├── config.json                # Runtime config (API_URL, EDP_PORTAL_URL)
│   │   └── sample-issues.csv          # Template for bulk upload
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx           # EDP SSO auth (token verify + retry)
│   │   │   ├── use-admin-auth.tsx     # Admin panel auth
│   │   │   ├── use-issues.tsx         # Issues data context
│   │   │   └── use-master-data.tsx    # Master data context
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx          # Main app (sidebar + auth guard)
│   │   │   └── AdminLayout.tsx        # Admin panel layout
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client (auto X-Session-Token)
│   │   │   ├── admin-api.ts           # Admin API client (X-Admin-Token)
│   │   │   ├── config.ts              # Runtime config loader
│   │   │   ├── safe-class.ts          # CSS class whitelist (injection prevention)
│   │   │   └── types.ts              # TypeScript interfaces
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # Charts + KPIs
│   │   │   ├── IssuesPage.tsx         # All issues table
│   │   │   ├── IssueDetailPage.tsx    # Issue detail + resolve/reopen + audit trail
│   │   │   ├── NewIssuePage.tsx       # Create issue form
│   │   │   └── admin/                 # Admin panel pages
│   │   │       └── AdminAuditPage.tsx # Audit trail + recycle bin (restore/hard-delete)
│   │   └── components/
│   │       ├── ui/                    # shadcn/ui primitives
│   │       ├── issues/                # Issue-specific components
│   │       ├── dashboard/             # Dashboard widgets
│   │       └── layout/                # Sidebar, header
│   ├── package.json
│   └── vite.config.ts
│
├── backend/migration-002-audit-softdelete.sql  # Incremental migration (audit + soft delete)
├── README.md
└── .gitignore
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| .NET SDK | 10+ | [Download](https://dotnet.microsoft.com/download) |
| Node.js | 20+ | [Download](https://nodejs.org/) |
| SQL Server | 2019+ | Local (Docker) or remote instance |

### Quick Start (Local Development)

**1. Clone the repository:**

```bash
git clone https://github.com/vivekatali-sons/Issue-Tracker.git
cd Issue-Tracker
```

**2. Configure the backend:**

Edit `backend/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=IssuesTracker;User Id=sa;Password=YourPassword;TrustServerCertificate=True;",
    "IntranetConnection": "Server=YOUR_INTRANET_SERVER;Database=Intranet_live;Uid=...;Password=...;TrustServerCertificate=True;"
  },
  "AllowedOrigins": "http://localhost:3000,http://localhost:3001,http://localhost:5173"
}
```

> If you don't have an Intranet DB, use the Admin "Login as" feature instead of EDP token auth.

**3. Start the backend:**

```bash
cd backend
dotnet run --environment Development
# API available at http://localhost:4000
# Swagger UI at http://localhost:4000/swagger
```

> On first run, the backend auto-creates the `IssuesTracker` database, all tables, stored procedures, and seeds default master data (statuses, severities, admin user).

**4. Configure the frontend:**

Edit `frontend/public/config.json`:

```json
{
  "API_URL": "http://localhost:4000",
  "EDP_PORTAL_URL": "https://edp.ali-sons.com/"
}
```

**5. Start the frontend:**

```bash
cd frontend-react
npm install
npm run dev
# App available at http://localhost:5173
```

**6. Login:**

For local development, use the Admin "Login as" flow:

1. Go to `http://localhost:5173/admin/login`
2. Login with `admin` / `Admin@123` (seeded in development mode only)
3. Navigate to Users > Click the Login icon on any active user row
4. A new tab opens with that user's dashboard session

---

## Deployment — Windows (IIS)

### Prerequisites

- Windows Server 2016+ with IIS enabled
- .NET 10 Hosting Bundle ([download](https://dotnet.microsoft.com/download/dotnet/10.0))
- SQL Server 2019+ (same machine or network-accessible)

### Step 1: Database Setup

**Option A — Auto-create (recommended):**

The backend creates the database, tables, and stored procedures on first startup. Just ensure the SQL user has `CREATE DATABASE` permission, or pre-create an empty `IssuesTracker` database.

**Option B — Manual script:**

```powershell
# Run the setup script against your SQL Server
sqlcmd -S YOUR_SERVER -d master -i setup-database.sql
```

**Create a dedicated SQL user (recommended for production):**

```sql
CREATE LOGIN usr_IssueT WITH PASSWORD = 'YourStrongPassword';
USE IssuesTracker;
CREATE USER usr_IssueT FOR LOGIN usr_IssueT;
ALTER ROLE db_datareader ADD MEMBER usr_IssueT;
ALTER ROLE db_datawriter ADD MEMBER usr_IssueT;
GRANT EXECUTE TO usr_IssueT;
```

### Step 2: Publish the Backend

```powershell
cd backend
dotnet publish -c Release -o C:\inetpub\dms-api
```

**Configure `appsettings.Production.json`:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SQL_SERVER;Database=IssuesTracker;User Id=usr_IssueT;Password=YourStrongPassword;TrustServerCertificate=True;",
    "IntranetConnection": "Server=YOUR_INTRANET_SERVER;Database=Intranet_live;Uid=...;Password=...;TrustServerCertificate=True;"
  },
  "AllowedOrigins": "https://your-domain.com"
}
```

### Step 3: Create IIS Site for Backend (API)

1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
   - Site name: `DMS-API`
   - Physical path: `C:\inetpub\dms-api`
   - Binding: HTTPS, port 4446 (or your chosen port), with SSL certificate
3. Set **Application Pool**:
   - .NET CLR Version: **No Managed Code**
   - Pipeline Mode: **Integrated**

**Verify:** Browse to `https://your-server:4446/swagger` — you should see the Swagger UI.

### Step 4: Build and Deploy the Frontend

```powershell
cd frontend-react

# Set production API URL before building
# Edit public/config.json:
#   { "API_URL": "https://your-domain:4446", "EDP_PORTAL_URL": "https://edp.ali-sons.com/" }

npm install
npx vite build --outDir C:\inetpub\dms-frontend
```

### Step 5: Create IIS Site for Frontend (SPA)

1. **Add Website** in IIS Manager:
   - Site name: `DMS-Frontend`
   - Physical path: `C:\inetpub\dms-frontend`
   - Binding: HTTPS, port 4446 (same port, different hostname or use URL Rewrite)
2. **Add `web.config`** for SPA routing (create in `C:\inetpub\dms-frontend\`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

> **Important:** The IIS URL Rewrite module must be installed. [Download here](https://www.iis.net/downloads/microsoft/url-rewrite).

### Step 6: Single-Site Deployment (Alternative)

To serve both API and frontend from one IIS site on port 4446:

1. Publish the backend to `C:\inetpub\dms`
2. Copy the frontend build output into `C:\inetpub\dms\wwwroot\`
3. Add `app.UseStaticFiles()` and SPA fallback in `Program.cs` (if not already present)
4. Single IIS site bound to port 4446

---

## Deployment — Linux (systemd + Nginx)

### Prerequisites

- .NET 10 SDK/Runtime
- Node.js 20+ (for building frontend)
- Nginx
- Network access to SQL Server

### Step 1: Publish the Backend

```bash
cd backend
dotnet publish -c Release -o /opt/dms-api
```

**Configure `/opt/dms-api/appsettings.Production.json`:**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SQL_SERVER;Database=IssuesTracker;User Id=usr_IssueT;Password=YourStrongPassword;TrustServerCertificate=True;",
    "IntranetConnection": "Server=YOUR_INTRANET_SERVER;Database=Intranet_live;Uid=...;Password=...;TrustServerCertificate=True;"
  },
  "AllowedOrigins": "https://your-domain.com"
}
```

### Step 2: Create systemd Service

Create `/etc/systemd/system/dms-api.service`:

```ini
[Unit]
Description=DMS Issue Tracker API
After=network.target

[Service]
WorkingDirectory=/opt/dms-api
ExecStart=/usr/bin/dotnet /opt/dms-api/DMS.API.dll --urls "http://localhost:5000"
Restart=always
RestartSec=10
SyslogIdentifier=dms-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable dms-api
sudo systemctl start dms-api

# Verify
curl http://localhost:5000/swagger
```

### Step 3: Build the Frontend

```bash
cd frontend-react

# Edit public/config.json with production API URL first
npm install
npx vite build --outDir /var/www/dms
```

### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/dms`:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # Frontend (SPA)
    root /var/www/dms;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Swagger (optional — remove in production)
    location /swagger {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Configuration Reference

### Backend — `appsettings.json`

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `ConnectionStrings:DefaultConnection` | string | SQL Server connection to `IssuesTracker` DB | `Server=...;Database=IssuesTracker;...` |
| `ConnectionStrings:IntranetConnection` | string | SQL Server connection to `Intranet_live` DB (read-only) | `Server=...;Database=Intranet_live;...` |
| `AllowedOrigins` | string | Comma-separated CORS origins | `https://your-domain.com` |

> Configuration is loaded in order: `appsettings.json` → `appsettings.{Environment}.json`. The environment-specific file overrides values from the base file.

### Frontend — `public/config.json`

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `API_URL` | string | Backend API base URL (no trailing slash) | `https://your-domain.com:4446` |
| `EDP_PORTAL_URL` | string | EDP Portal URL for redirect-on-logout | `https://edp.ali-sons.com/` |

> This file is loaded at **runtime** (not baked into the build). You can change it after deployment without rebuilding.

---

## Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `401 Session expired` on all requests | Backend restarted (clears in-memory sessions) | Re-authenticate (refresh the page or re-login) |
| `CORS error` in browser console | Frontend origin not in `AllowedOrigins` | Add the frontend URL to `AllowedOrigins` in appsettings |
| Backend won't start — `CREATE DATABASE permission denied` | SQL user lacks permission | Pre-create the `IssuesTracker` database manually, or grant permission |
| `Authentication Failed` screen | EDP token is expired or invalid | Use Admin "Login as" flow, or re-activate the token in DB |
| Frontend shows blank page after deploy | SPA routing not configured | Add `web.config` (IIS) or `try_files` (Nginx) — see deployment sections |
| `Connection refused` to SQL Server | Firewall or SQL Browser not running | Enable TCP/IP in SQL Server Config Manager, open port 1433 |
| `DMS.API.exe` locked during build | Old backend process still running | Kill the process: `taskkill /F /IM DMS.API.exe` (Windows) or `pkill DMS.API` (Linux) |
| `405 Method Not Allowed` on DELETE/PUT | IIS WebDAV module blocks these verbs | All destructive operations use POST fallback endpoints (e.g. `POST /{id}/delete`) |

### Health Check

```bash
# Verify backend is running
curl http://localhost:4000/api/master/statuses
# Should return JSON array of statuses (or 401 if session required)

# Verify database connectivity
curl http://localhost:4000/swagger
# Should show Swagger UI
```

### Logs

- **Backend logs**: Console output (or configure file logging via `Serilog`/`NLog`)
- **IIS logs**: `C:\inetpub\logs\LogFiles\`
- **Nginx logs**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **systemd logs**: `journalctl -u dms-api -f`

---

## Security Notes

- **Global exception handler** prevents stack traces and connection strings from leaking to clients
- **CSS class whitelist** (`safe-class.ts`) prevents CSS injection from DB-driven class names
- **Session tokens** are in-memory only — not persisted to disk or database
- **Admin seed** (`admin/Admin@123`) only runs in `Development` environment — disabled in Production
- **BCrypt** password hashing for admin credentials (no plaintext storage)
- All database operations use **parameterized stored procedures** (SQL injection prevention)

---

## License

Internal use only — Ali & Sons Group.
