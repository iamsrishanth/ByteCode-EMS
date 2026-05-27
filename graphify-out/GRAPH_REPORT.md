# Graph Report - .  (2026-05-27)

## Corpus Check
- Corpus is ~33,616 words - fits in a single context window. You may not need a graph.

## Summary
- 439 nodes · 931 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Layout & Routing|App Layout & Routing]]
- [[_COMMUNITY_Department Management|Department Management]]
- [[_COMMUNITY_Sidebar & Navigation|Sidebar & Navigation]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Cron & API Endpoints|Cron & API Endpoints]]
- [[_COMMUNITY_Error & Loading States|Error & Loading States]]
- [[_COMMUNITY_Validation Schemas|Validation Schemas]]
- [[_COMMUNITY_Reports & Exports|Reports & Exports]]
- [[_COMMUNITY_Attendance Tracking|Attendance Tracking]]
- [[_COMMUNITY_Component Config|Component Config]]
- [[_COMMUNITY_Auth & Login|Auth & Login]]
- [[_COMMUNITY_Task Management|Task Management]]
- [[_COMMUNITY_Supabase Clients|Supabase Clients]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_User Management|User Management]]
- [[_COMMUNITY_Type Definitions|Type Definitions]]
- [[_COMMUNITY_Middleware|Middleware]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_EOD Reports|EOD Reports]]
- [[_COMMUNITY_Weekly Reports|Weekly Reports]]
- [[_COMMUNITY_Audit Logging|Audit Logging]]
- [[_COMMUNITY_PWA & Metadata|PWA & Metadata]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 88 edges
2. `compilerOptions` - 16 edges
3. `Button()` - 16 edges
4. `createClient()` - 16 edges
5. `requireRole()` - 12 edges
6. `Badge()` - 11 edges
7. `Card()` - 10 edges
8. `CardHeader()` - 10 edges
9. `CardTitle()` - 10 edges
10. `CardContent()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Backend` --provides--> `pg_cron Scheduler`  [INFERRED]
  AGENTS.md → .env.local
- `Employee Management System` --includes--> `Attendance Tracking`  [INFERRED]
  AGENTS.md → .env.local
- `Employee Management System` --includes--> `EOD Reports`  [INFERRED]
  AGENTS.md → .env.local
- `TableFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts
- `TableCaption()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts

## Communities (22 total, 4 thin omitted)

### Community 0 - "App Layout & Routing"
Cohesion: 0.07
Nodes (39): AccessDeniedError, ActionHandler, authenticatedAction(), AuthenticatedActionOptions, requireRole(), EODComplianceRow, getEODCompliance(), getEODHistory() (+31 more)

### Community 1 - "Department Management"
Cohesion: 0.07
Nodes (38): canDeleteDepartment, createDepartment, createDepartmentSchema, DepartmentWithStats, getDepartments, getEligibleHeads, updateDepartment, updateDepartmentSchema (+30 more)

### Community 2 - "Sidebar & Navigation"
Cohesion: 0.08
Nodes (33): getInitials(), navItems, roleBadgeVariant(), roleLabel(), Sidebar(), SidebarProps, cn(), Avatar() (+25 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (36): dependencies, @base-ui/react, class-variance-authority, clsx, date-fns, lucide-react, next, next-themes (+28 more)

### Community 4 - "Cron & API Endpoints"
Cohesion: 0.09
Nodes (27): GET(), getNextMonth(), GET(), POST(), AuditAction, AuditActions, logAuditEvent(), createServiceClient() (+19 more)

### Community 5 - "Error & Loading States"
Cohesion: 0.17
Nodes (15): ErrorProps, setupSchema, createClient(), Database, getSupabase(), Button(), buttonVariants, Card() (+7 more)

### Community 6 - "Validation Schemas"
Cohesion: 0.07
Nodes (27): CheckInInput, checkInSchema, CheckOutInput, checkOutSchema, DailyMetricsInput, dailyMetricsSchema, EODReportInput, eodReportSchema (+19 more)

### Community 7 - "Reports & Exports"
Cohesion: 0.13
Nodes (20): formatDateTime(), EODReportWithUser, submitEOD, EOD_STATUS_BADGE, EOD_STATUS_ICON, ReportsPage(), Table(), TableBody() (+12 more)

### Community 8 - "Attendance Tracking"
Cohesion: 0.19
Nodes (18): checkIn(), checkOut(), getAttendanceHistory(), getProfile(), getTeamAttendance(), getTodayAttendance(), getUsers(), wrapAction() (+10 more)

### Community 9 - "Component Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 10 - "Auth & Login"
Cohesion: 0.13
Nodes (10): DashboardPage(), isSalesDept(), statusBadgeClass(), statusLabel(), formatDate(), isSunday(), TasksPage(), DailyMetrics (+2 more)

### Community 11 - "Task Management"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Supabase Clients"
Cohesion: 0.20
Nodes (10): Attendance Tracking, ByteCode EMS, Employee Management System, EOD Reports, Next.js Framework, pg_cron Scheduler, Row Level Security, Role-Based Access Control (+2 more)

### Community 13 - "Database Schema"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 14 - "User Management"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, metadata, viewport, Toaster()

### Community 15 - "Type Definitions"
Cohesion: 0.40
Nodes (3): AdminNav(), AdminNavProps, tabs

### Community 16 - "Middleware"
Cohesion: 0.33
Nodes (5): crons, env, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, framework

### Community 17 - "UI Components"
Cohesion: 0.60
Nodes (3): config, middleware(), updateSession()

## Knowledge Gaps
- **153 isolated node(s):** `eslintConfig`, `name`, `version`, `private`, `dev` (+148 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Sidebar & Navigation` to `Department Management`, `Cron & API Endpoints`, `Error & Loading States`, `Reports & Exports`, `Attendance Tracking`, `Auth & Login`, `Type Definitions`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `createClient()` connect `App Layout & Routing` to `Department Management`, `Cron & API Endpoints`, `Attendance Tracking`, `Auth & Login`, `Type Definitions`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Button()` connect `Error & Loading States` to `Department Management`, `Sidebar & Navigation`, `Cron & API Endpoints`, `Reports & Exports`, `Attendance Tracking`, `Auth & Login`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `name`, `version` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Layout & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._
- **Should `Department Management` be split into smaller, more focused modules?**
  _Cohesion score 0.07180851063829788 - nodes in this community are weakly interconnected._
- **Should `Sidebar & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.08139534883720931 - nodes in this community are weakly interconnected._