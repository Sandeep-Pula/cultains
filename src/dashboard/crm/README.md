# Configurable CRM Architecture

This CRM is a tenant-scoped dashboard module mounted at `#dashboard/crm`.

## Module Structure

- `types.ts` defines CRM entities, permissions, custom fields, workflows, notifications, and import jobs.
- `defaults.ts` owns default CRM settings, role permissions, task types, and the starter pipeline.
- `crmService.ts` is the Firestore service/repository layer. All reads and writes are scoped to `users/{workspaceId}/crm*`.
- `crmAnalytics.ts` provides AI-ready CRM query helpers for leads this month, follow-ups due today, stale customers, pipeline value, likely deals, and staff task load.
- `crmCsv.ts` handles CSV parsing, duplicate detection, validation, and CSV export.
- `../pages/CrmPage.tsx` is the CRM workspace UI with dashboard, contacts, companies, leads, deals, Kanban, tasks, reports, settings, workflows, and import/export.
- `functions/src/index.ts` exposes `/api/crm/workflows/run` as the server-side workflow runner foundation.
- `firestore.indexes.json` contains CRM index definitions for larger tenant-scoped filtered queries.

## Firestore Collections

All CRM records live under the authenticated owner workspace:

- `crmSettings/main`
- `crmContacts`
- `crmCompanies`
- `crmLeads`
- `crmDeals`
- `crmPipelines`
- `crmTasks`
- `crmNotes`
- `crmActivities`
- `crmTags`
- `crmCustomFields`
- `crmCommunications`
- `crmWorkflows`
- `crmNotifications`
- `crmImportJobs`

Every CRM record includes `id`, `businessId`, `createdBy`, `createdAt`, `updatedAt`, and optional `deletedAt`.

## Extension Points

- Add module-specific custom field rendering by reading `CrmCustomFieldDefinition` for each module and validating required fields before save.
- Add more workflow triggers by routing them through `/api/crm/workflows/run`; the client service falls back to local execution if the server runner is unavailable.
- Add notification delivery providers behind `crmNotifications` for in-app, email, WhatsApp, and reminder channels.
- Add REST or callable Cloud Functions later by keeping the same DTOs from `types.ts`.
- Add AI copilots by using `buildCrmAnalytics` and tenant-scoped CRM service methods as structured context.

## Security Notes

The frontend never accepts a user-entered business id. `DashboardApp` passes `workspaceUserId`, derived from the authenticated owner/team-member workspace context. Firestore rules already scope nested `users/{workspaceId}/...` documents to the owner, workspace members, or super admin.
