# Consumidores UI de Scale — #241

Snapshot: `17fb189e`, app v1.0.190. Este anexo es inventario estático, no una migración ni validación visual.

Se analizaron los 291 archivos JS/TS locales de app (190 TSX). Las tablas cuentan aperturas JSX reales: un sitio dentro de un map cuenta 1 aunque renderice muchas filas. Se resuelven imports relativos, aliases y reexports; Dialog importado vía operations se atribuye a dialog.tsx. Un archivo puede consumir más de un modelo. Los consumidores internos del propio módulo también cuentan. No se incluyen tests ni fixtures en los conteos de app.

Hay 366 símbolos locales con uso JSX resuelto (1652 sitios). Los 13 nombres dinámicos/contextos están separados al final. Estas cifras no significan 366 primitivas de diseño: incluyen componentes de negocio y composición. No debe eliminarse un componente porque no tenga consumidor JSX directo: Next monta rutas/layouts y hay registros dinámicos.

## Todos los modelos locales con uso JSX

| Símbolo / definición | Sitios JSX | Archivos directos | Consumidores (ruta y sitios) |
| --- | ---: | ---: | --- |
| `AccessLayout` · `app/access-layout.tsx:14` | 9 | 9 | `app/acceso-pendiente/page.tsx`; `app/demo/page.tsx`; `app/invitacion/page.tsx`; `app/privacidad/page.tsx`; `app/recuperar-cuenta/page.tsx`; `app/registro/page.tsx`; `app/scale-workspace.tsx`; `app/status/page.tsx`; `app/verificar-correo/page.tsx` |
| `AccountCreateDialog` · `app/account-create-dialog.tsx:9` | 2 | 2 | `app/finance-receipt-editor.tsx`; `app/scale-workspace.tsx` |
| `AccountSecurity` · `app/account-security.tsx:14` | 1 | 1 | `app/my-profile.tsx` |
| `ActorAvatar` · `app/actor-identity.tsx:44` | 8 | 5 | `app/actor-identity.tsx`; `app/assigned-people.tsx`; `app/inventory-workspace.tsx` ×4; `app/sections/finanzas.tsx`; `app/work-checklist.tsx` |
| `ActorIdentity` · `app/actor-identity.tsx:35` | 20 | 14 | `app/assigned-people.tsx`; `app/comment-composer.tsx`; `app/daily-controls.tsx` ×2; `app/finance-history.tsx`; `app/inventory-workspace.tsx` ×2; `app/invite-links.tsx` ×2; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/presence.tsx` ×2; `app/productivity-ui.tsx` ×3; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/weekly-automatic.tsx`; `app/work-history.tsx` |
| `AnnouncementBanner` · `app/announcement-banner.tsx:71` | 1 | 1 | `app/scale-workspace.tsx` |
| `AnnouncementBannerView` · `app/announcement-banner.tsx:53` | 2 | 2 | `app/announcement-banner.tsx`; `app/superadmin/announcements.tsx` |
| `RemoveRecord` · `app/archive-controls.tsx:48` | 8 | 7 | `app/production-board.tsx`; `app/sections/finanzas.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/presupuestos.tsx` ×2; `app/suite.tsx`; `app/team-person-sheet.tsx` |
| `RemoveRecordDialog` · `app/archive-controls.tsx:28` | 4 | 3 | `app/archive-controls.tsx`; `app/suite.tsx`; `app/team-workspace.tsx` ×2 |
| `TrashWorkspace` · `app/archive-controls.tsx:66` | 1 | 1 | `app/sections/papelera.tsx` |
| `AssignedPeople` · `app/assigned-people.tsx:32` | 4 | 3 | `app/production-board.tsx`; `app/project-card.tsx` ×2; `app/scale-workspace.tsx` |
| `CompactPeople` · `app/assigned-people.tsx:19` | 1 | 1 | `app/assigned-people.tsx` |
| `AssigneePicker` · `app/assignee-picker.tsx:33` | 1 | 1 | `app/record-assignees.tsx` |
| `AuthBrandPanel` · `app/auth-brand-panel.tsx:14` | 1 | 1 | `app/access-layout.tsx` |
| `BlogListTemplate` · `app/blog-templates.tsx:68` | 1 | 1 | `app/blog/[section]/page.tsx` |
| `CardCover` · `app/blog-templates.tsx:62` | 2 | 1 | `app/blog-templates.tsx` ×2 |
| `CardTags` · `app/blog-templates.tsx:56` | 2 | 1 | `app/blog-templates.tsx` ×2 |
| `Cover` · `app/blog-templates.tsx:51` | 2 | 1 | `app/blog-templates.tsx` ×2 |
| `Meta` · `app/blog-templates.tsx:40` | 3 | 1 | `app/blog-templates.tsx` ×3 |
| `AssignPlanDialog` · `app/client-assign-plan.tsx:12` | 1 | 1 | `app/sections/clientes.tsx` |
| `ClientCommercialLifecycle` · `app/client-commercial-lifecycle.tsx:17` | 1 | 1 | `app/productivity-ui.tsx` |
| `CommercialLifecycleEditor` · `app/client-commercial-lifecycle.tsx:23` | 1 | 1 | `app/client-commercial-lifecycle.tsx` |
| `ClientCommercialSummary` · `app/client-commercial-summary.tsx:30` | 1 | 1 | `app/productivity-ui.tsx` |
| `ClientDirectoryToolbar` · `app/client-directory-toolbar.tsx:42` | 1 | 1 | `app/scale-workspace.tsx` |
| `ClientEditor` · `app/client-editor.tsx:22` | 1 | 1 | `app/client-editor.tsx` |
| `ClientEditorDialog` · `app/client-editor.tsx:92` | 4 | 4 | `app/finance-clients.tsx`; `app/productivity-ui.tsx`; `app/scale-workspace.tsx`; `app/suite.tsx` |
| `ClientErrorReporter` · `app/client-error-reporter.tsx:74` | 1 | 1 | `app/layout.tsx` |
| `ClientAppearance` · `app/client-identity.tsx:46` | 1 | 1 | `app/client-editor.tsx` |
| `ClientIdentity` · `app/client-identity.tsx:24` | 7 | 5 | `app/production-board.tsx`; `app/productivity-ui.tsx`; `app/project-card.tsx` ×2; `app/sections/clientes.tsx` ×2; `app/suite.tsx` |
| `ClientLegalIdentity` · `app/client-identity.tsx:34` | 2 | 2 | `app/client-identity.tsx`; `app/productivity-ui.tsx` |
| `ClientLogo` · `app/client-identity.tsx:20` | 6 | 3 | `app/client-identity.tsx` ×2; `app/ia-carga.tsx` ×3; `app/scale-workspace.tsx` |
| `ClientLinks` · `app/client-links.tsx:20` | 1 | 1 | `app/productivity-ui.tsx` |
| `ClientReporting` · `app/client-reporting.tsx:19` | 1 | 1 | `app/productivity-ui.tsx` |
| `ReportingEditor` · `app/client-reporting.tsx:25` | 1 | 1 | `app/client-reporting.tsx` |
| `RucConfirmCard` · `app/client-ruc.tsx:28` | 1 | 1 | `app/client-editor.tsx` |
| `CommentBody` · `app/commenting.tsx:22` | 2 | 2 | `app/operations.tsx`; `app/productivity-ui.tsx` |
| `CommentComposer` · `app/commenting.tsx:34` | 2 | 2 | `app/operations.tsx`; `app/productivity-ui.tsx` |
| `CompanyLegalProfile` · `app/company-legal-profile.tsx:9` | 1 | 1 | `app/sections/configuracion.tsx` |
| `LegalProfileSession` · `app/company-legal-profile.tsx:10` | 1 | 1 | `app/company-legal-profile.tsx` |
| `CompanySettings` · `app/company-settings.tsx:16` | 1 | 1 | `app/workspace-guide.tsx` |
| `ContractDetail` · `app/contracts-workspace.tsx:44` | 1 | 1 | `app/contracts-workspace.tsx` |
| `ContractsSession` · `app/contracts-workspace.tsx:12` | 1 | 1 | `app/contracts-workspace.tsx` |
| `ContractsWorkspace` · `app/contracts-workspace.tsx:11` | 1 | 1 | `app/scale-workspace.tsx` |
| `CreateContract` · `app/contracts-workspace.tsx:34` | 1 | 1 | `app/contracts-workspace.tsx` |
| `ControlCenter` · `app/control-center.tsx:35` | 1 | 1 | `app/sections/resumen.tsx` |
| `KpiHint` · `app/control-center.tsx:25` | 5 | 1 | `app/control-center.tsx` ×5 |
| `CompanyCurrencyProvider` · `app/currency-provider.tsx:16` | 1 | 1 | `app/scale-workspace.tsx` |
| `TenantCurrency` · `app/currency-provider.tsx:8` | 1 | 1 | `app/currency-provider.tsx` |
| `ClientPortalAccess` · `app/daily-controls.tsx:105` | 1 | 1 | `app/productivity-ui.tsx` |
| `ClientPortalDeliveryControl` · `app/daily-controls.tsx:99` | 1 | 1 | `app/productivity-ui.tsx` |
| `ClientReviewControl` · `app/daily-controls.tsx:76` | 2 | 2 | `app/productivity-ui.tsx`; `app/suite.tsx` |
| `ClientReviewPreview` · `app/daily-controls.tsx:82` | 1 | 1 | `app/productivity-ui.tsx` |
| `FXTransferForm` · `app/daily-controls.tsx:26` | 1 | 1 | `app/scale-workspace.tsx` |
| `ReceiptReversal` · `app/daily-controls.tsx:61` | 1 | 1 | `app/sections/finanzas.tsx` |
| `ReconciliationWorkspace` · `app/daily-controls.tsx:123` | 1 | 1 | `app/sections/finanzas.tsx` |
| `AccountConsequences` · `app/deletion-danger-zone.tsx:111` | 1 | 1 | `app/deletion-danger-zone.tsx` |
| `DeletionDangerZone` · `app/deletion-danger-zone.tsx:306` | 1 | 1 | `app/sections/configuracion.tsx` |
| `DeletionFlow` · `app/deletion-danger-zone.tsx:147` | 2 | 1 | `app/deletion-danger-zone.tsx` ×2 |
| `DemoExitSimulation` · `app/deletion-danger-zone.tsx:299` | 1 | 1 | `app/deletion-danger-zone.tsx` |
| `OrganizationConsequences` · `app/deletion-danger-zone.tsx:133` | 1 | 1 | `app/deletion-danger-zone.tsx` |
| `DemoToolbar` · `app/demo-toolbar.tsx:16` | 1 | 1 | `app/scale-workspace.tsx` |
| `DemoWelcome` · `app/demo-toolbar.tsx:54` | 1 | 1 | `app/scale-workspace.tsx` |
| `DesktopSidebar` · `app/desktop-sidebar.tsx:28` | 1 | 1 | `app/scale-workspace.tsx` |
| `ConfirmDialog` · `app/dialog.tsx:190` | 32 | 23 | `app/archive-controls.tsx`; `app/daily-controls.tsx` ×4; `app/dialog.tsx`; `app/financial-forecast.tsx` ×2; `app/inventory-workspace.tsx` ×2; `app/my-data.tsx`; `app/report-problem.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx` ×2; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/studio-workspace.tsx` ×2; `app/suite.tsx` ×3; `app/superadmin/announcements.tsx`; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/confirm.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/maintenance.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/subscription-dialog.tsx`; `app/team-workspace.tsx`; `app/ui-v2.tsx`; `app/work-checklist.tsx` |
| `Dialog` · `app/dialog.tsx:117` | 93 | 38 | `app/account-create-dialog.tsx`; `app/client-assign-plan.tsx`; `app/client-editor.tsx`; `app/contracts-workspace.tsx` ×4; `app/daily-controls.tsx` ×6; `app/demo-toolbar.tsx` ×4; `app/dialog.tsx`; `app/employee-tasks.tsx` ×2; `app/finance-balance.tsx` ×4; `app/finance-collections.tsx` ×6; `app/finance-history.tsx`; `app/finance-personnel.tsx` ×2; `app/finance-receipt-editor.tsx` ×2; `app/ia-carga.tsx`; `app/inventory-workspace.tsx` ×10; `app/my-data.tsx` ×2; `app/notification-inbox.tsx`; `app/notifications-ui.tsx` ×2; `app/operations.tsx` ×2; `app/password-panel.tsx`; `app/permissions-matrix.tsx`; `app/person-sheet.tsx`; `app/photo-cropper.tsx`; `app/presence.tsx`; `app/privacy-panel.tsx` ×3; `app/productivity-ui.tsx` ×4; `app/project-card.tsx`; `app/scale-workspace.tsx` ×8; `app/sections/comisiones.tsx` ×3; `app/sections/pipeline.tsx` ×5; `app/sections/planes.tsx`; `app/studio-workspace.tsx` ×2; `app/suite.tsx` ×2; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/subscription-dialog.tsx`; `app/team-access.tsx`; `app/workspace-guide.tsx` ×2 |
| `FormActions` · `app/dialog.tsx:144` | 13 | 6 | `app/client-assign-plan.tsx`; `app/dialog.tsx`; `app/ia-carga.tsx` ×8; `app/operations.tsx`; `app/photo-cropper.tsx`; `app/save-actions.tsx` |
| `DriveLinkNote` · `app/drive-link.tsx:1` | 1 | 1 | `app/operations.tsx` |
| `DriveLinks` · `app/drive-links.tsx:23` | 4 | 2 | `app/productivity-ui.tsx` ×2; `app/project-card.tsx` ×2 |
| `DriveLinksInput` · `app/drive-links.tsx:17` | 1 | 1 | `app/operations.tsx` |
| `DueDate` · `app/due-date.tsx:7` | 2 | 2 | `app/production-board.tsx`; `app/productivity-ui.tsx` |
| `EmailField` · `app/email-field.tsx:16` | 11 | 10 | `app/cliente/ingresar/page.tsx`; `app/cliente/recuperar/page.tsx` ×2; `app/daily-controls.tsx`; `app/ia-carga.tsx`; `app/invitacion/page.tsx`; `app/operations.tsx`; `app/recuperar-cuenta/page.tsx`; `app/registro/page.tsx`; `app/scale-workspace.tsx`; `app/verificar-correo/page.tsx` |
| `EmployeeTasks` · `app/employee-tasks.tsx:15` | 2 | 2 | `app/project-card.tsx`; `app/work-history.tsx` |
| `TaskDashboard` · `app/employee-tasks.tsx:19` | 1 | 1 | `app/employee-tasks.tsx` |
| `TaskDetail` · `app/employee-tasks.tsx:69` | 1 | 1 | `app/employee-tasks.tsx` |
| `TaskEditor` · `app/employee-tasks.tsx:53` | 1 | 1 | `app/employee-tasks.tsx` |
| `EntityPicker` · `app/entity-picker.tsx:48` | 4 | 1 | `app/workspace-forms.tsx` ×4 |
| `CategoryIcon` · `app/equipment-photo.tsx:19` | 3 | 2 | `app/equipment-photo.tsx`; `app/inventory-workspace.tsx` ×2 |
| `EquipmentPhoto` · `app/equipment-photo.tsx:27` | 5 | 2 | `app/ia-carga.tsx` ×2; `app/inventory-workspace.tsx` ×3 |
| `OptionalMark` · `app/field-label.tsx:7` | 17 | 10 | `app/client-commercial-lifecycle.tsx` ×3; `app/client-reporting.tsx` ×2; `app/operations.tsx`; `app/quote-composer.tsx` ×3; `app/sections/pipeline.tsx`; `app/superadmin/announcements.tsx` ×2; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/catalog.tsx` ×2; `app/superadmin/maintenance.tsx`; `app/superadmin/subscription-dialog.tsx` |
| `BalancePanel` · `app/finance-balance.tsx:28` | 1 | 1 | `app/finance-balance.tsx` |
| `BalanceSection` · `app/finance-balance.tsx:24` | 1 | 1 | `app/scale-workspace.tsx` |
| `FinanceClientsSection` · `app/finance-clients.tsx:13` | 1 | 1 | `app/finance-balance.tsx` |
| `CollectionsPanel` · `app/finance-collections.tsx:26` | 1 | 1 | `app/finance-collections.tsx` |
| `FinanceCollections` · `app/finance-collections.tsx:25` | 1 | 1 | `app/sections/mora.tsx` |
| `FinanceHistoryDialog` · `app/finance-history.tsx:31` | 3 | 3 | `app/client-editor.tsx`; `app/finance-clients.tsx`; `app/finance-personnel.tsx` |
| `FinanceHistoryPanel` · `app/finance-history.tsx:19` | 2 | 2 | `app/finance-history.tsx`; `app/finance-personnel.tsx` |
| `FinancePersonnelSection` · `app/finance-personnel.tsx:15` | 1 | 1 | `app/finance-balance.tsx` |
| `SalaryAdjustmentDialog` · `app/finance-personnel.tsx:52` | 1 | 1 | `app/finance-personnel.tsx` |
| `SalaryChangeDialog` · `app/finance-personnel.tsx:42` | 1 | 1 | `app/finance-personnel.tsx` |
| `ReceiptPaymentDialog` · `app/finance-receipt-editor.tsx:10` | 1 | 1 | `app/finance-collections.tsx` |
| `FinancialForecast` · `app/financial-forecast.tsx:64` | 1 | 1 | `app/sections/prevision.tsx` |
| `ForecastPanel` · `app/financial-forecast.tsx:65` | 1 | 1 | `app/financial-forecast.tsx` |
| `FotoPerfil` · `app/foto-perfil.tsx:38` | 10 | 10 | `app/actor-identity.tsx`; `app/client-identity.tsx`; `app/entity-picker.tsx`; `app/my-profile.tsx`; `app/operations.tsx`; `app/person-container.tsx`; `app/person-photo.tsx`; `app/photo-viewer.tsx`; `app/presence.tsx`; `app/profile-photo.tsx` |
| `GoogleSignIn` · `app/google-sign-in.tsx:34` | 3 | 3 | `app/cliente/ingresar/page.tsx`; `app/cliente/invitacion/page.tsx`; `app/registro/page.tsx` |
| `ProviderSignIn` · `app/google-sign-in.tsx:25` | 4 | 2 | `app/google-sign-in.tsx`; `app/scale-workspace.tsx` ×3 |
| `GrowthDashboard` · `app/growth-dashboard.tsx:13` | 1 | 1 | `app/sections/metricas.tsx` |
| `IaCargaButton` · `app/ia-carga-button.tsx:12` | 1 | 1 | `app/scale-workspace.tsx` |
| `AccionEstado` · `app/ia-carga.tsx:653` | 1 | 1 | `app/ia-carga.tsx` |
| `AvisosIa` · `app/ia-carga.tsx:594` | 2 | 1 | `app/ia-carga.tsx` ×2 |
| `CardHead` · `app/ia-carga.tsx:568` | 2 | 1 | `app/ia-carga.tsx` ×2 |
| `ClienteDeAccion` · `app/ia-carga.tsx:636` | 1 | 1 | `app/ia-carga.tsx` |
| `CuentaDeAccion` · `app/ia-carga.tsx:709` | 1 | 1 | `app/ia-carga.tsx` |
| `FalloIa` · `app/ia-carga.tsx:760` | 1 | 1 | `app/ia-carga.tsx` |
| `IaCargaDialog` · `app/ia-carga.tsx:134` | 1 | 1 | `app/scale-workspace.tsx` |
| `MatchBlock` · `app/ia-carga.tsx:605` | 2 | 1 | `app/ia-carga.tsx` ×2 |
| `MontoInterpretado` · `app/ia-carga.tsx:687` | 1 | 1 | `app/ia-carga.tsx` |
| `PartesDivision` · `app/ia-carga.tsx:728` | 1 | 1 | `app/ia-carga.tsx` |
| `InventoryBarcode` · `app/inventory-label.tsx:29` | 1 | 1 | `app/inventory-workspace.tsx` |
| `CategoryForm` · `app/inventory-workspace.tsx:655` | 1 | 1 | `app/inventory-workspace.tsx` |
| `EquipmentCard` · `app/inventory-workspace.tsx:157` | 1 | 1 | `app/inventory-workspace.tsx` |
| `EquipmentRow` · `app/inventory-workspace.tsx:191` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryCalendar` · `app/inventory-workspace.tsx:754` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryDetail` · `app/inventory-workspace.tsx:666` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryItemActions` · `app/inventory-workspace.tsx:140` | 2 | 1 | `app/inventory-workspace.tsx` ×2 |
| `InventoryItemForm` · `app/inventory-workspace.tsx:546` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryItemMeta` · `app/inventory-workspace.tsx:97` | 2 | 1 | `app/inventory-workspace.tsx` ×2 |
| `InventoryMaintenanceForm` · `app/inventory-workspace.tsx:703` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryPanel` · `app/inventory-workspace.tsx:336` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryPipeline` · `app/inventory-workspace.tsx:209` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryReservationForm` · `app/inventory-workspace.tsx:720` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventorySummary` · `app/inventory-workspace.tsx:320` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryTransitionForm` · `app/inventory-workspace.tsx:743` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryVerificationForm` · `app/inventory-workspace.tsx:713` | 1 | 1 | `app/inventory-workspace.tsx` |
| `InventoryWorkspace` · `app/inventory-workspace.tsx:332` | 1 | 1 | `app/sections/inventario.tsx` |
| `PipelineCard` · `app/inventory-workspace.tsx:293` | 1 | 1 | `app/inventory-workspace.tsx` |
| `PipelineColumn` · `app/inventory-workspace.tsx:263` | 1 | 1 | `app/inventory-workspace.tsx` |
| `StorageTemplateForm` · `app/inventory-workspace.tsx:649` | 1 | 1 | `app/inventory-workspace.tsx` |
| `VerificationStamp` · `app/inventory-workspace.tsx:81` | 3 | 1 | `app/inventory-workspace.tsx` ×3 |
| `InviteLinks` · `app/invite-links.tsx:29` | 1 | 1 | `app/sections/invitaciones.tsx` |
| `PiiTexto` · `app/list-format.tsx:95` | 8 | 2 | `app/productivity-ui.tsx` ×2; `app/sections/clientes.tsx` ×6 |
| `LiveVisitorPanel` · `app/live-visitors.tsx:16` | 1 | 1 | `app/live-visitors.tsx` |
| `LiveVisitors` · `app/live-visitors.tsx:10` | 1 | 1 | `app/sections/pipeline.tsx` |
| `LoadingScreen` · `app/loading-screen.tsx:16` | 1 | 1 | `app/scale-workspace.tsx` |
| `MaintenanceGate` · `app/maintenance-gate.tsx:47` | 1 | 1 | `app/workspace-frame.tsx` |
| `MaintenanceScreen` · `app/maintenance-gate.tsx:30` | 1 | 1 | `app/maintenance-gate.tsx` |
| `ManualWorkspace` · `app/manual.tsx:34` | 1 | 1 | `app/workspace-guide.tsx` |
| `PortalPreview` · `app/manual.tsx:23` | 2 | 2 | `app/demo-toolbar.tsx`; `app/manual.tsx` |
| `MobileDrawer` · `app/mobile-navigation.tsx:8` | 1 | 1 | `app/mobile-navigation.tsx` |
| `MobileNavigation` · `app/mobile-navigation.tsx:26` | 1 | 1 | `app/scale-workspace.tsx` |
| `ConsentState` · `app/my-data.tsx:50` | 1 | 1 | `app/my-data.tsx` |
| `MyDataPanel` · `app/my-data.tsx:56` | 1 | 1 | `app/my-profile.tsx` |
| `RequestDialog` · `app/my-data.tsx:140` | 1 | 1 | `app/my-data.tsx` |
| `RightsLinks` · `app/my-data.tsx:131` | 4 | 1 | `app/my-data.tsx` ×4 |
| `MyProfile` · `app/my-profile.tsx:25` | 1 | 1 | `app/scale-workspace.tsx` |
| `NotificationCenter` · `app/notification-center.tsx:14` | 1 | 1 | `app/layout.tsx` |
| `Toast` · `app/notification-center.tsx:9` | 1 | 1 | `app/notification-center.tsx` |
| `NotificationInbox` · `app/notification-inbox.tsx:52` | 1 | 1 | `app/notifications-ui.tsx` |
| `MonthlySchedules` · `app/notifications-ui.tsx:35` | 1 | 1 | `app/productivity-ui.tsx` |
| `NotificationBell` · `app/notifications-ui.tsx:14` | 1 | 1 | `app/scale-workspace.tsx` |
| `Preferences` · `app/notifications-ui.tsx:18` | 1 | 1 | `app/notifications-ui.tsx` |
| `CompanyMark` · `app/operations.tsx:366` | 2 | 1 | `app/operations.tsx` ×2 |
| `CompanySelector` · `app/operations.tsx:369` | 2 | 1 | `app/scale-workspace.tsx` ×2 |
| `Editor` · `app/operations.tsx:96` | 52 | 24 | `app/client-editor.tsx`; `app/company-legal-profile.tsx`; `app/contracts-workspace.tsx` ×3; `app/daily-controls.tsx` ×3; `app/employee-tasks.tsx`; `app/finance-balance.tsx` ×4; `app/finance-collections.tsx` ×5; `app/finance-personnel.tsx` ×3; `app/finance-receipt-editor.tsx`; `app/inventory-workspace.tsx` ×3; `app/invite-links.tsx`; `app/my-data.tsx`; `app/my-profile.tsx`; `app/notifications-ui.tsx` ×2; `app/password-panel.tsx`; `app/privacy-panel.tsx` ×3; `app/productivity-ui.tsx` ×4; `app/sections/comisiones.tsx` ×3; `app/sections/pipeline.tsx`; `app/studio-workspace.tsx` ×2; `app/suite.tsx` ×4; `app/team-access.tsx`; `app/team-person-sheet.tsx` ×2; `app/workspace-guide.tsx` |
| `OperationsWorkspace` · `app/operations.tsx:266` | 1 | 1 | `app/sections/equipo.tsx` |
| `ProjectComments` · `app/operations.tsx:297` | 1 | 1 | `app/scale-workspace.tsx` |
| `TeamDirectoryView` · `app/operations.tsx:281` | 1 | 1 | `app/operations.tsx` |
| `PasswordField` · `app/password-field.tsx:9` | 12 | 8 | `app/cliente/ingresar/page.tsx`; `app/cliente/invitacion/page.tsx`; `app/cliente/recuperar/page.tsx` ×2; `app/invitacion/page.tsx` ×2; `app/operations.tsx`; `app/recuperar-cuenta/page.tsx`; `app/registro/page.tsx` ×3; `app/scale-workspace.tsx` |
| `PasswordPanel` · `app/password-panel.tsx:5` | 2 | 2 | `app/registro/page.tsx`; `app/scale-workspace.tsx` |
| `MatrixView` · `app/permissions-matrix.tsx:113` | 2 | 1 | `app/permissions-matrix.tsx` ×2 |
| `ModulePermissions` · `app/permissions-matrix.tsx:84` | 1 | 1 | `app/permissions-matrix.tsx` |
| `PermissionsMatrix` · `app/permissions-matrix.tsx:151` | 1 | 1 | `app/team-workspace.tsx` |
| `PermissionsMatrixPanel` · `app/permissions-matrix.tsx:155` | 1 | 1 | `app/sections/permisos.tsx` |
| `RoleExplorer` · `app/permissions-matrix.tsx:46` | 1 | 1 | `app/permissions-matrix.tsx` |
| `PersonContainer` · `app/person-container.tsx:20` | 22 | 17 | `app/assignee-picker.tsx` ×2; `app/commenting.tsx`; `app/employee-tasks.tsx`; `app/entity-picker.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-personnel.tsx`; `app/inventory-workspace.tsx`; `app/loading-screen.tsx`; `app/operations.tsx`; `app/record-assignees.tsx`; `app/scale-workspace.tsx`; `app/sections/finanzas.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx` ×2; `app/superadmin/usage.tsx` ×3; `app/team-workspace.tsx` ×2 |
| `PersonPhotoField` · `app/person-photo.tsx:11` | 2 | 2 | `app/my-profile.tsx`; `app/team-person-sheet.tsx` |
| `PersonSheet` · `app/person-sheet.tsx:28` | 2 | 2 | `app/my-profile.tsx`; `app/team-person-sheet.tsx` |
| `PhoneField` · `app/phone-field.tsx:17` | 2 | 2 | `app/ia-carga.tsx`; `app/operations.tsx` |
| `PhotoCropper` · `app/photo-cropper.tsx:33` | 2 | 2 | `app/person-photo.tsx`; `app/profile-photo.tsx` |
| `EnlargedPhoto` · `app/photo-viewer.tsx:8` | 1 | 1 | `app/photo-viewer.tsx` |
| `Deliverables` · `app/plan-comparison.tsx:17` | 1 | 1 | `app/plan-comparison.tsx` |
| `PlanComparison` · `app/plan-comparison.tsx:23` | 1 | 1 | `app/sections/planes.tsx` |
| `BoardPresence` · `app/presence.tsx:59` | 1 | 1 | `app/sections/produccion.tsx` |
| `PersonPhoto` · `app/presence.tsx:65` | 1 | 1 | `app/presence.tsx` |
| `PresenceAvatars` · `app/presence.tsx:66` | 4 | 1 | `app/presence.tsx` ×4 |
| `PresenceTracker` · `app/presence.tsx:104` | 1 | 1 | `app/scale-workspace.tsx` |
| `ProjectCardPresence` · `app/presence.tsx:76` | 1 | 1 | `app/production-board.tsx` |
| `ProjectPresence` · `app/presence.tsx:116` | 3 | 3 | `app/operations.tsx`; `app/productivity-ui.tsx`; `app/suite.tsx` |
| `UsagePanel` · `app/presence.tsx:128` | 1 | 1 | `app/sections/actividad.tsx` |
| `WorkspacePresence` · `app/presence.tsx:79` | 1 | 1 | `app/scale-workspace.tsx` |
| `RightsChannel` · `app/privacidad/page.tsx:50` | 1 | 1 | `app/privacidad/page.tsx` |
| `PrivacyPanel` · `app/privacy-panel.tsx:85` | 1 | 1 | `app/sections/configuracion.tsx` |
| `Section` · `app/privacy-panel.tsx:75` | 3 | 1 | `app/privacy-panel.tsx` ×3 |
| `DraggableOrder` · `app/production-board.tsx:68` | 1 | 1 | `app/production-board.tsx` |
| `KanbanColumn` · `app/production-board.tsx:115` | 1 | 1 | `app/sections/produccion.tsx` |
| `BatchEditor` · `app/productivity-ui.tsx:230` | 1 | 1 | `app/productivity-ui.tsx` |
| `ClientDetail` · `app/productivity-ui.tsx:126` | 1 | 1 | `app/scale-workspace.tsx` |
| `MonthlyTemplates` · `app/productivity-ui.tsx:234` | 1 | 1 | `app/productivity-ui.tsx` |
| `PeopleNotice` · `app/productivity-ui.tsx:72` | 2 | 1 | `app/productivity-ui.tsx` ×2 |
| `WorkDetail` · `app/productivity-ui.tsx:77` | 1 | 1 | `app/scale-workspace.tsx` |
| `WorkPlanner` · `app/productivity-ui.tsx:179` | 2 | 2 | `app/sections/produccion.tsx`; `app/sections/resumen.tsx` |
| `AmountInput` · `app/profile-controls.tsx:20` | 10 | 5 | `app/daily-controls.tsx` ×2; `app/financial-forecast.tsx` ×2; `app/ia-carga.tsx` ×3; `app/operations.tsx`; `app/workspace-forms.tsx` ×2 |
| `PersonSelect` · `app/profile-controls.tsx:43` | 2 | 2 | `app/entity-picker.tsx`; `app/profile-controls.tsx` |
| `PlainSelect` · `app/profile-controls.tsx:56` | 1 | 1 | `app/profile-controls.tsx` |
| `SelectCustom` · `app/profile-controls.tsx:37` | 73 | 29 | `app/archive-controls.tsx`; `app/client-assign-plan.tsx`; `app/contracts-workspace.tsx` ×6; `app/daily-controls.tsx` ×3; `app/employee-tasks.tsx` ×3; `app/financial-forecast.tsx` ×6; `app/ia-carga.tsx` ×3; `app/inventory-workspace.tsx` ×18; `app/operations.tsx`; `app/productivity-ui.tsx`; `app/registro/page.tsx`; `app/report-problem.tsx`; `app/reports-workspace.tsx`; `app/scale-workspace.tsx` ×2; `app/sections/metricas.tsx`; `app/sections/pipeline.tsx`; `app/sections/preferencias.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx` ×2; `app/superadmin/announcements.tsx` ×3; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/catalog.tsx` ×3; `app/superadmin/reports.tsx`; `app/superadmin/subscription-dialog.tsx` ×2; `app/team-person-sheet.tsx` ×2; `app/urgency.tsx`; `app/work-history.tsx` ×2; `app/workspace-forms.tsx` ×3 |
| `ProfilePhoto` · `app/profile-photo.tsx:76` | 2 | 2 | `app/client-identity.tsx`; `app/suite.tsx` |
| `ProjectCard` · `app/project-card.tsx:121` | 1 | 1 | `app/scale-workspace.tsx` |
| `ProjectDetail` · `app/project-card.tsx:58` | 1 | 1 | `app/project-card.tsx` |
| `ItemShell` · `app/quote-composer.tsx:39` | 2 | 1 | `app/quote-composer.tsx` ×2 |
| `QuoteComposer` · `app/quote-composer.tsx:49` | 3 | 3 | `app/scale-workspace.tsx`; `app/sections/planes.tsx`; `app/suite.tsx` |
| `RecordAssignees` · `app/record-assignees.tsx:34` | 3 | 2 | `app/productivity-ui.tsx` ×2; `app/suite.tsx` |
| `RecordAssigneesForm` · `app/record-assignees.tsx:39` | 1 | 1 | `app/record-assignees.tsx` |
| `ReportProblemButton` · `app/report-problem.tsx:81` | 1 | 1 | `app/scale-workspace.tsx` |
| `ReportProblemDialog` · `app/report-problem.tsx:42` | 1 | 1 | `app/report-problem.tsx` |
| `Distribution` · `app/reports-workspace.tsx:88` | 2 | 1 | `app/reports-workspace.tsx` ×2 |
| `LiveVisitorsWidget` · `app/reports-workspace.tsx:103` | 1 | 1 | `app/reports-workspace.tsx` |
| `ReportsChart` · `app/reports-workspace.tsx:71` | 1 | 1 | `app/reports-workspace.tsx` |
| `ReportsPanel` · `app/reports-workspace.tsx:140` | 1 | 1 | `app/reports-workspace.tsx` |
| `ReportsWorkspace` · `app/reports-workspace.tsx:102` | 1 | 1 | `app/sections/informes.tsx` |
| `SaveActions` · `app/save-actions.tsx:7` | 16 | 5 | `app/daily-controls.tsx`; `app/inventory-workspace.tsx` ×7; `app/quote-composer.tsx`; `app/sections/pipeline.tsx` ×2; `app/workspace-forms.tsx` ×5 |
| `Home` · `app/scale-workspace.tsx:188` | 1 | 1 | `app/(workspace)/layout.tsx` |
| `SearchField` · `app/search-field.tsx:7` | 4 | 4 | `app/assignee-picker.tsx`; `app/contracts-workspace.tsx`; `app/entity-picker.tsx`; `app/finance-collections.tsx` |
| `ActividadSection` · `app/sections/actividad.tsx:13` | 1 | 1 | `app/scale-workspace.tsx` |
| `ClientesSection` · `app/sections/clientes.tsx:199` | 1 | 1 | `app/scale-workspace.tsx` |
| `ClientLine` · `app/sections/clientes.tsx:68` | 1 | 1 | `app/sections/clientes.tsx` |
| `ClientTile` · `app/sections/clientes.tsx:118` | 1 | 1 | `app/sections/clientes.tsx` |
| `ComisionesSection` · `app/sections/comisiones.tsx:55` | 1 | 1 | `app/scale-workspace.tsx` |
| `ConfiguracionSection` · `app/sections/configuracion.tsx:39` | 1 | 1 | `app/scale-workspace.tsx` |
| `SettingsBlock` · `app/sections/configuracion.tsx:24` | 5 | 1 | `app/sections/configuracion.tsx` ×5 |
| `EquipoSection` · `app/sections/equipo.tsx:12` | 1 | 1 | `app/scale-workspace.tsx` |
| `EstudioSection` · `app/sections/estudio.tsx:12` | 1 | 1 | `app/scale-workspace.tsx` |
| `FinanzasSection` · `app/sections/finanzas.tsx:107` | 1 | 1 | `app/scale-workspace.tsx` |
| `SalariosPanel` · `app/sections/finanzas.tsx:70` | 1 | 1 | `app/sections/finanzas.tsx` |
| `HistorialSection` · `app/sections/historial.tsx:14` | 1 | 1 | `app/scale-workspace.tsx` |
| `InformesSection` · `app/sections/informes.tsx:15` | 1 | 1 | `app/scale-workspace.tsx` |
| `InventarioSection` · `app/sections/inventario.tsx:12` | 1 | 1 | `app/scale-workspace.tsx` |
| `InvitacionesSection` · `app/sections/invitaciones.tsx:12` | 1 | 1 | `app/scale-workspace.tsx` |
| `MetricasSection` · `app/sections/metricas.tsx:25` | 1 | 1 | `app/scale-workspace.tsx` |
| `ClientLine` · `app/sections/mora.tsx:51` | 1 | 1 | `app/sections/mora.tsx` |
| `MoraSection` · `app/sections/mora.tsx:79` | 1 | 1 | `app/scale-workspace.tsx` |
| `PapeleraSection` · `app/sections/papelera.tsx:9` | 1 | 1 | `app/scale-workspace.tsx` |
| `PermisosSection` · `app/sections/permisos.tsx:10` | 1 | 1 | `app/scale-workspace.tsx` |
| `LeadCard` · `app/sections/pipeline.tsx:123` | 1 | 1 | `app/sections/pipeline.tsx` |
| `LeadColumn` · `app/sections/pipeline.tsx:153` | 2 | 1 | `app/sections/pipeline.tsx` ×2 |
| `LeadListRow` · `app/sections/pipeline.tsx:191` | 1 | 1 | `app/sections/pipeline.tsx` |
| `LeadQuickActions` · `app/sections/pipeline.tsx:114` | 2 | 1 | `app/sections/pipeline.tsx` ×2 |
| `MoveStageForm` · `app/sections/pipeline.tsx:673` | 2 | 1 | `app/sections/pipeline.tsx` ×2 |
| `PipelineSection` · `app/sections/pipeline.tsx:214` | 1 | 1 | `app/scale-workspace.tsx` |
| `StageManager` · `app/sections/pipeline.tsx:619` | 1 | 1 | `app/sections/pipeline.tsx` |
| `PlanesSection` · `app/sections/planes.tsx:25` | 1 | 1 | `app/scale-workspace.tsx` |
| `PreferenciasSection` · `app/sections/preferencias.tsx:22` | 1 | 1 | `app/scale-workspace.tsx` |
| `BudgetTile` · `app/sections/presupuestos.tsx:67` | 1 | 1 | `app/sections/presupuestos.tsx` |
| `PresupuestosSection` · `app/sections/presupuestos.tsx:94` | 1 | 1 | `app/scale-workspace.tsx` |
| `PrevisionSection` · `app/sections/prevision.tsx:16` | 1 | 1 | `app/scale-workspace.tsx` |
| `ProduccionSection` · `app/sections/produccion.tsx:57` | 1 | 1 | `app/scale-workspace.tsx` |
| `ProyectosSection` · `app/sections/proyectos.tsx:50` | 1 | 1 | `app/scale-workspace.tsx` |
| `ResumenSection` · `app/sections/resumen.tsx:32` | 1 | 1 | `app/scale-workspace.tsx` |
| `SinAccesoSection` · `app/sections/sin-acceso.tsx:7` | 1 | 1 | `app/scale-workspace.tsx` |
| `StudioCalendar` · `app/studio-workspace.tsx:207` | 1 | 1 | `app/studio-workspace.tsx` |
| `StudioPanel` · `app/studio-workspace.tsx:40` | 1 | 1 | `app/studio-workspace.tsx` |
| `StudioReservationForm` · `app/studio-workspace.tsx:182` | 1 | 1 | `app/studio-workspace.tsx` |
| `StudioWorkspace` · `app/studio-workspace.tsx:39` | 1 | 1 | `app/sections/estudio.tsx` |
| `SubscriptionNotice` · `app/subscription-panel.tsx:246` | 1 | 1 | `app/scale-workspace.tsx` |
| `SubscriptionPanel` · `app/subscription-panel.tsx:100` | 3 | 2 | `app/scale-workspace.tsx` ×2; `app/sections/configuracion.tsx` |
| `ActivityWorkspace` · `app/suite.tsx:130` | 1 | 1 | `app/sections/actividad.tsx` |
| `BudgetActions` · `app/suite.tsx:85` | 2 | 1 | `app/sections/presupuestos.tsx` ×2 |
| `BudgetConsult` · `app/suite.tsx:58` | 1 | 1 | `app/suite.tsx` |
| `CouponRedeem` · `app/suite.tsx:154` | 1 | 1 | `app/sections/configuracion.tsx` |
| `ExchangeRateSettings` · `app/suite.tsx:186` | 1 | 1 | `app/sections/configuracion.tsx` |
| `IntegrationSettings` · `app/suite.tsx:198` | 1 | 1 | `app/sections/configuracion.tsx` |
| `RecordEditor` · `app/suite.tsx:35` | 6 | 4 | `app/client-commercial-summary.tsx`; `app/control-center.tsx`; `app/scale-workspace.tsx` ×2; `app/sections/clientes.tsx` ×2 |
| `SettingsWorkspace` · `app/suite.tsx:166` | 1 | 1 | `app/sections/configuracion.tsx` |
| `PlatformAccess` · `app/superadmin/access.tsx:37` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformAgencies` · `app/superadmin/agencies.tsx:61` | 1 | 1 | `app/superadmin/sections.tsx` |
| `AnnouncementList` · `app/superadmin/announcements.tsx:244` | 1 | 1 | `app/superadmin/announcements.tsx` |
| `PlatformAnnouncements` · `app/superadmin/announcements.tsx:97` | 1 | 1 | `app/superadmin/sections.tsx` |
| `ApplyCouponDialog` · `app/superadmin/apply-coupon-dialog.tsx:32` | 1 | 1 | `app/superadmin/page.tsx` |
| `PlatformAudit` · `app/superadmin/audit.tsx:19` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformCatalog` · `app/superadmin/catalog.tsx:47` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformConfirmDialog` · `app/superadmin/confirm.tsx:36` | 1 | 1 | `app/superadmin/page.tsx` |
| `EdgeAwareMenu` · `app/superadmin/edge-menu.tsx:11` | 5 | 5 | `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx` |
| `ErrorDetailDialog` · `app/superadmin/errors.tsx:199` | 1 | 1 | `app/superadmin/errors.tsx` |
| `ErrorsKpi` · `app/superadmin/errors.tsx:234` | 1 | 1 | `app/superadmin/overview.tsx` |
| `PlatformErrors` · `app/superadmin/errors.tsx:56` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformInquiries` · `app/superadmin/inquiries.tsx:58` | 1 | 1 | `app/superadmin/sections.tsx` |
| `MaintenanceControls` · `app/superadmin/maintenance.tsx:102` | 1 | 1 | `app/superadmin/maintenance.tsx` |
| `PlatformMaintenance` · `app/superadmin/maintenance.tsx:31` | 1 | 1 | `app/superadmin/sections.tsx` |
| `MetricKpi` · `app/superadmin/metric-kpi.tsx:26` | 10 | 2 | `app/superadmin/metrics.tsx` ×6; `app/superadmin/usage.tsx` ×4 |
| `MetricNote` · `app/superadmin/metric-kpi.tsx:10` | 9 | 4 | `app/superadmin/errors.tsx`; `app/superadmin/metric-kpi.tsx`; `app/superadmin/overview.tsx`; `app/superadmin/usage.tsx` ×6 |
| `Sparkline` · `app/superadmin/metric-kpi.tsx:16` | 1 | 1 | `app/superadmin/metric-kpi.tsx` |
| `MetricsBody` · `app/superadmin/metrics.tsx:49` | 1 | 1 | `app/superadmin/metrics.tsx` |
| `PlatformMetrics` · `app/superadmin/metrics.tsx:22` | 1 | 1 | `app/superadmin/overview.tsx` |
| `PlatformOverview` · `app/superadmin/overview.tsx:65` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformPeriodChips` · `app/superadmin/period-chips.tsx:9` | 1 | 1 | `app/superadmin/page.tsx` |
| `PlatformReports` · `app/superadmin/reports.tsx:51` | 1 | 1 | `app/superadmin/sections.tsx` |
| `PlatformSidebar` · `app/superadmin/sidebar.tsx:10` | 1 | 1 | `app/superadmin/page.tsx` |
| `PlatformAdminSkeleton` · `app/superadmin/states.tsx:48` | 1 | 1 | `app/superadmin/page.tsx` |
| `PlatformMore` · `app/superadmin/states.tsx:92` | 7 | 7 | `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx` |
| `PlatformNotices` · `app/superadmin/states.tsx:22` | 1 | 1 | `app/superadmin/page.tsx` |
| `PlatformRedirecting` · `app/superadmin/states.tsx:18` | 1 | 1 | `app/superadmin/page.tsx` |
| `SubscriptionDialog` · `app/superadmin/subscription-dialog.tsx:55` | 1 | 1 | `app/superadmin/page.tsx` |
| `DeltaChip` · `app/superadmin/traffic.tsx:41` | 3 | 1 | `app/superadmin/traffic.tsx` ×3 |
| `PlatformTraffic` · `app/superadmin/traffic.tsx:51` | 1 | 1 | `app/superadmin/sections.tsx` |
| `Source` · `app/superadmin/traffic.tsx:32` | 11 | 1 | `app/superadmin/traffic.tsx` ×11 |
| `Spark` · `app/superadmin/traffic.tsx:36` | 1 | 1 | `app/superadmin/traffic.tsx` |
| `TrafficBody` · `app/superadmin/traffic.tsx:86` | 1 | 1 | `app/superadmin/traffic.tsx` |
| `TrafficKpi` · `app/superadmin/traffic.tsx:47` | 9 | 1 | `app/superadmin/traffic.tsx` ×9 |
| `DataTable` · `app/superadmin/usage-charts.tsx:67` | 2 | 1 | `app/superadmin/usage-charts.tsx` ×2 |
| `Frame` · `app/superadmin/usage-charts.tsx:47` | 2 | 1 | `app/superadmin/usage-charts.tsx` ×2 |
| `Tooltip` · `app/superadmin/usage-charts.tsx:58` | 2 | 1 | `app/superadmin/usage-charts.tsx` ×2 |
| `UsageBarChart` · `app/superadmin/usage-charts.tsx:113` | 4 | 2 | `app/superadmin/traffic.tsx` ×2; `app/superadmin/usage.tsx` ×2 |
| `UsageLineChart` · `app/superadmin/usage-charts.tsx:81` | 1 | 1 | `app/superadmin/usage.tsx` |
| `PlatformUsage` · `app/superadmin/usage.tsx:28` | 1 | 1 | `app/superadmin/sections.tsx` |
| `UsageAgencies` · `app/superadmin/usage.tsx:108` | 1 | 1 | `app/superadmin/usage.tsx` |
| `UsageBody` · `app/superadmin/usage.tsx:68` | 1 | 1 | `app/superadmin/usage.tsx` |
| `UsageUsers` · `app/superadmin/usage.tsx:142` | 1 | 1 | `app/superadmin/usage.tsx` |
| `TabScroller` · `app/tab-scroller.tsx:11` | 3 | 3 | `app/productivity-ui.tsx`; `app/scale-workspace.tsx`; `app/ui-v2.tsx` |
| `TeamAccess` · `app/team-access.tsx:20` | 1 | 1 | `app/team-person-sheet.tsx` |
| `AccessTab` · `app/team-person-sheet.tsx:118` | 1 | 1 | `app/team-person-sheet.tsx` |
| `PayTab` · `app/team-person-sheet.tsx:166` | 1 | 1 | `app/team-person-sheet.tsx` |
| `ProfileTab` · `app/team-person-sheet.tsx:76` | 1 | 1 | `app/team-person-sheet.tsx` |
| `TeamPersonSheet` · `app/team-person-sheet.tsx:197` | 1 | 1 | `app/team-workspace.tsx` |
| `PeopleWorkspace` · `app/team-workspace.tsx:80` | 1 | 1 | `app/operations.tsx` |
| `TextField` · `app/text-field.tsx:20` | 2 | 1 | `app/registro/page.tsx` ×2 |
| `ThemeToggle` · `app/theme-toggle.tsx:26` | 2 | 2 | `app/access-layout.tsx`; `app/scale-workspace.tsx` |
| `ActionMenu` · `app/ui-v2.tsx:72` | 9 | 9 | `app/sections/pipeline.tsx`; `app/suite.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/team-workspace.tsx`; `app/ui-v2.tsx` |
| `BulkBar` · `app/ui-v2.tsx:479` | 8 | 8 | `app/archive-controls.tsx`; `app/inventory-workspace.tsx`; `app/productivity-ui.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx`; `app/team-workspace.tsx` |
| `CardGridSkeleton` · `app/ui-v2.tsx:239` | 3 | 1 | `app/ui-v2.tsx` ×3 |
| `CardSkeleton` · `app/ui-v2.tsx:229` | 1 | 1 | `app/ui-v2.tsx` |
| `CompactCard` · `app/ui-v2.tsx:313` | 2 | 2 | `app/sections/pipeline.tsx`; `app/team-workspace.tsx` |
| `CompactQuickAction` · `app/ui-v2.tsx:355` | 3 | 1 | `app/sections/pipeline.tsx` ×3 |
| `CurrencyField` · `app/ui-v2.tsx:175` | 4 | 4 | `app/client-commercial-lifecycle.tsx`; `app/client-reporting.tsx`; `app/financial-forecast.tsx`; `app/quote-composer.tsx` |
| `DashboardSkeleton` · `app/ui-v2.tsx:286` | 1 | 1 | `app/sections/resumen.tsx` |
| `EmptyBlock` · `app/ui-v2.tsx:395` | 75 | 41 | `app/archive-controls.tsx` ×2; `app/cliente/entregas/page.tsx`; `app/company-settings.tsx`; `app/contracts-workspace.tsx` ×3; `app/employee-tasks.tsx`; `app/finance-balance.tsx`; `app/ia-carga.tsx`; `app/invite-links.tsx` ×3; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/permissions-matrix.tsx`; `app/presence.tsx` ×2; `app/privacy-panel.tsx` ×4; `app/productivity-ui.tsx` ×2; `app/reports-workspace.tsx` ×3; `app/sections/clientes.tsx` ×2; `app/sections/comisiones.tsx` ×4; `app/sections/finanzas.tsx` ×6; `app/sections/invitaciones.tsx`; `app/sections/metricas.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx` ×2; `app/sections/planes.tsx` ×2; `app/sections/presupuestos.tsx` ×2; `app/sections/produccion.tsx` ×2; `app/sections/proyectos.tsx` ×2; `app/suite.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/overview.tsx` ×4; `app/superadmin/reports.tsx`; `app/superadmin/traffic.tsx` ×2; `app/superadmin/usage.tsx` ×4; `app/team-workspace.tsx` ×2; `app/work-checklist.tsx`; `app/work-history.tsx` |
| `EmptyCompact` · `app/ui-v2.tsx:417` | 1 | 1 | `app/productivity-ui.tsx` |
| `EmptyCta` · `app/ui-v2.tsx:406` | 6 | 6 | `app/sections/clientes.tsx`; `app/sections/metricas.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/presupuestos.tsx`; `app/superadmin/catalog.tsx` |
| `ErrorBlock` · `app/ui-v2.tsx:427` | 47 | 35 | `app/account-create-dialog.tsx`; `app/archive-controls.tsx`; `app/company-legal-profile.tsx`; `app/contracts-workspace.tsx`; `app/employee-tasks.tsx`; `app/finance-balance.tsx` ×3; `app/finance-collections.tsx`; `app/finance-history.tsx`; `app/finance-personnel.tsx` ×4; `app/invite-links.tsx`; `app/my-data.tsx`; `app/notifications-ui.tsx`; `app/permissions-matrix.tsx`; `app/privacy-panel.tsx`; `app/project-card.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx` ×2; `app/sections/finanzas.tsx` ×2; `app/sections/metricas.tsx` ×2; `app/sections/mora.tsx`; `app/sections/pipeline.tsx` ×2; `app/sections/planes.tsx` ×2; `app/sections/presupuestos.tsx`; `app/sections/produccion.tsx` ×2; `app/sections/proyectos.tsx`; `app/suite.tsx` ×2; `app/superadmin/announcements.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/maintenance.tsx`; `app/superadmin/metrics.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/traffic.tsx`; `app/superadmin/usage.tsx`; `app/work-history.tsx` |
| `FilterToolbar` · `app/ui-v2.tsx:540` | 24 | 23 | `app/archive-controls.tsx`; `app/contracts-workspace.tsx`; `app/financial-forecast.tsx`; `app/invite-links.tsx`; `app/reports-workspace.tsx`; `app/sections/comisiones.tsx` ×2; `app/sections/finanzas.tsx`; `app/sections/metricas.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/presupuestos.tsx`; `app/studio-workspace.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/traffic.tsx`; `app/superadmin/usage.tsx`; `app/team-workspace.tsx`; `app/work-history.tsx` |
| `Kpi` · `app/ui-v2.tsx:139` | 54 | 18 | `app/control-center.tsx` ×5; `app/inventory-workspace.tsx` ×4; `app/invite-links.tsx` ×3; `app/permissions-matrix.tsx` ×3; `app/privacy-panel.tsx` ×4; `app/productivity-ui.tsx` ×2; `app/reports-workspace.tsx`; `app/sections/clientes.tsx` ×4; `app/sections/comisiones.tsx` ×3; `app/sections/metricas.tsx`; `app/sections/mora.tsx` ×4; `app/sections/pipeline.tsx` ×4; `app/sections/presupuestos.tsx` ×4; `app/sections/proyectos.tsx` ×4; `app/superadmin/errors.tsx`; `app/superadmin/metric-kpi.tsx`; `app/superadmin/overview.tsx` ×4; `app/superadmin/traffic.tsx` ×2 |
| `KpiStrip` · `app/ui-v2.tsx:207` | 20 | 18 | `app/control-center.tsx` ×2; `app/inventory-workspace.tsx`; `app/invite-links.tsx`; `app/permissions-matrix.tsx`; `app/privacy-panel.tsx`; `app/productivity-ui.tsx`; `app/reports-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx`; `app/sections/metricas.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/superadmin/metrics.tsx`; `app/superadmin/overview.tsx`; `app/superadmin/traffic.tsx` ×2; `app/superadmin/usage.tsx` |
| `KpiStripSkeleton` · `app/ui-v2.tsx:216` | 5 | 4 | `app/sections/clientes.tsx`; `app/sections/proyectos.tsx`; `app/superadmin/metrics.tsx`; `app/ui-v2.tsx` ×2 |
| `ListActions` · `app/ui-v2.tsx:607` | 16 | 16 | `app/archive-controls.tsx`; `app/presence.tsx`; `app/privacy-panel.tsx`; `app/scale-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/studio-workspace.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/team-workspace.tsx` |
| `ListGrid` · `app/ui-v2.tsx:557` | 51 | 33 | `app/archive-controls.tsx`; `app/company-settings.tsx`; `app/finance-balance.tsx` ×2; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-personnel.tsx`; `app/financial-forecast.tsx` ×2; `app/invite-links.tsx` ×2; `app/presence.tsx`; `app/privacy-panel.tsx` ×3; `app/productivity-ui.tsx`; `app/reports-workspace.tsx`; `app/sections/clientes.tsx` ×2; `app/sections/comisiones.tsx` ×4; `app/sections/finanzas.tsx` ×3; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/traffic.tsx` ×6; `app/superadmin/usage.tsx` ×3; `app/team-workspace.tsx`; `app/work-history.tsx` |
| `ListPage` · `app/ui-v2.tsx:516` | 24 | 23 | `app/archive-controls.tsx`; `app/finance-balance.tsx`; `app/financial-forecast.tsx`; `app/invite-links.tsx`; `app/permissions-matrix.tsx`; `app/reports-workspace.tsx`; `app/sections/actividad.tsx`; `app/sections/comisiones.tsx`; `app/sections/configuracion.tsx`; `app/sections/finanzas.tsx`; `app/sections/historial.tsx`; `app/sections/inventario.tsx`; `app/sections/metricas.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/preferencias.tsx`; `app/sections/presupuestos.tsx`; `app/sections/produccion.tsx`; `app/sections/proyectos.tsx`; `app/sections/resumen.tsx` ×2; `app/studio-workspace.tsx`; `app/team-workspace.tsx` |
| `ListRow` · `app/ui-v2.tsx:597` | 50 | 33 | `app/archive-controls.tsx`; `app/company-settings.tsx`; `app/finance-balance.tsx` ×2; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-personnel.tsx`; `app/financial-forecast.tsx` ×2; `app/invite-links.tsx` ×2; `app/presence.tsx`; `app/privacy-panel.tsx` ×3; `app/productivity-ui.tsx`; `app/reports-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx` ×4; `app/sections/finanzas.tsx` ×3; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/traffic.tsx` ×6; `app/superadmin/usage.tsx` ×3; `app/team-workspace.tsx`; `app/work-history.tsx` |
| `LoadingBlock` · `app/ui-v2.tsx:360` | 68 | 54 | `app/account-create-dialog.tsx`; `app/archive-controls.tsx`; `app/client-commercial-lifecycle.tsx`; `app/client-reporting.tsx`; `app/company-legal-profile.tsx`; `app/company-settings.tsx`; `app/contracts-workspace.tsx` ×2; `app/daily-controls.tsx`; `app/demo/page.tsx`; `app/employee-tasks.tsx`; `app/finance-balance.tsx` ×2; `app/finance-collections.tsx` ×3; `app/finance-history.tsx`; `app/finance-personnel.tsx` ×2; `app/financial-forecast.tsx` ×2; `app/ia-carga.tsx`; `app/inventory-workspace.tsx` ×2; `app/invite-links.tsx`; `app/my-data.tsx`; `app/my-profile.tsx`; `app/notifications-ui.tsx` ×2; `app/operations.tsx`; `app/permissions-matrix.tsx`; `app/presence.tsx` ×2; `app/privacy-panel.tsx`; `app/productivity-ui.tsx`; `app/project-card.tsx` ×2; `app/reports-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx` ×2; `app/sections/finanzas.tsx` ×2; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/preferencias.tsx`; `app/sections/presupuestos.tsx`; `app/sections/produccion.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx`; `app/subscription-panel.tsx`; `app/suite.tsx` ×2; `app/superadmin/announcements.tsx`; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/errors.tsx` ×2; `app/superadmin/inquiries.tsx`; `app/superadmin/maintenance.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/subscription-dialog.tsx`; `app/superadmin/traffic.tsx`; `app/superadmin/usage.tsx`; `app/team-workspace.tsx`; `app/ui-v2.tsx`; `app/weekly-automatic.tsx`; `app/work-history.tsx` |
| `MoneyText` · `app/ui-v2.tsx:158` | 90 | 24 | `app/client-commercial-lifecycle.tsx` ×2; `app/client-reporting.tsx` ×2; `app/control-center.tsx` ×4; `app/daily-controls.tsx` ×5; `app/finance-balance.tsx` ×8; `app/finance-clients.tsx` ×2; `app/finance-collections.tsx` ×6; `app/finance-history.tsx` ×2; `app/finance-personnel.tsx` ×5; `app/finance-receipt-editor.tsx`; `app/ia-carga.tsx`; `app/inventory-workspace.tsx` ×3; `app/quote-composer.tsx` ×4; `app/sections/clientes.tsx` ×2; `app/sections/comisiones.tsx` ×9; `app/sections/finanzas.tsx` ×10; `app/sections/mora.tsx` ×2; `app/sections/pipeline.tsx` ×6; `app/sections/planes.tsx` ×2; `app/sections/presupuestos.tsx` ×4; `app/suite.tsx` ×6; `app/superadmin/agencies.tsx` ×2; `app/superadmin/catalog.tsx`; `app/ui-v2.tsx` |
| `PageHeader` · `app/ui-v2.tsx:454` | 3 | 3 | `app/contracts-workspace.tsx`; `app/superadmin/page.tsx`; `app/ui-v2.tsx` |
| `SectionLoading` · `app/ui-v2.tsx:375` | 17 | 14 | `app/scale-workspace.tsx`; `app/sections/actividad.tsx`; `app/sections/configuracion.tsx` ×2; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/historial.tsx`; `app/sections/informes.tsx`; `app/sections/inventario.tsx`; `app/sections/invitaciones.tsx`; `app/sections/metricas.tsx` ×2; `app/sections/pipeline.tsx`; `app/sections/prevision.tsx`; `app/sections/produccion.tsx`; `app/sections/resumen.tsx` ×2 |
| `StateChip` · `app/ui-v2.tsx:123` | 131 | 48 | `app/account-security.tsx`; `app/archive-controls.tsx`; `app/company-settings.tsx` ×2; `app/control-center.tsx`; `app/daily-controls.tsx`; `app/employee-tasks.tsx` ×4; `app/finance-clients.tsx` ×2; `app/ia-carga.tsx` ×13; `app/inventory-workspace.tsx` ×4; `app/invitacion/page.tsx`; `app/invite-links.tsx` ×2; `app/my-data.tsx` ×5; `app/my-profile.tsx`; `app/notification-inbox.tsx` ×2; `app/notifications-ui.tsx`; `app/permissions-matrix.tsx`; `app/presence.tsx`; `app/privacy-panel.tsx`; `app/production-board.tsx` ×3; `app/productivity-ui.tsx` ×5; `app/project-card.tsx` ×4; `app/scale-workspace.tsx`; `app/sections/clientes.tsx` ×5; `app/sections/comisiones.tsx` ×3; `app/sections/finanzas.tsx` ×3; `app/sections/mora.tsx` ×4; `app/sections/pipeline.tsx` ×8; `app/sections/preferencias.tsx` ×3; `app/sections/presupuestos.tsx` ×2; `app/sections/resumen.tsx`; `app/status/page.tsx` ×2; `app/studio-workspace.tsx` ×3; `app/suite.tsx`; `app/superadmin/access.tsx` ×3; `app/superadmin/agencies.tsx` ×4; `app/superadmin/announcements.tsx` ×2; `app/superadmin/audit.tsx` ×2; `app/superadmin/catalog.tsx` ×2; `app/superadmin/errors.tsx` ×6; `app/superadmin/inquiries.tsx` ×2; `app/superadmin/maintenance.tsx`; `app/superadmin/overview.tsx` ×3; `app/superadmin/page.tsx`; `app/superadmin/reports.tsx` ×3; `app/superadmin/subscription-dialog.tsx`; `app/superadmin/traffic.tsx`; `app/superadmin/usage.tsx` ×2; `app/team-workspace.tsx` ×6 |
| `TableSkeleton` · `app/ui-v2.tsx:267` | 1 | 1 | `app/ui-v2.tsx` |
| `ViewSwitch` · `app/ui-v2.tsx:170` | 5 | 5 | `app/client-directory-toolbar.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/team-workspace.tsx` |
| `ViewTabs` · `app/ui-v2.tsx:497` | 4 | 3 | `app/inventory-workspace.tsx` ×2; `app/person-sheet.tsx`; `app/sections/produccion.tsx` |
| `UrgencyBadge` · `app/urgency.tsx:14` | 4 | 3 | `app/production-board.tsx`; `app/productivity-ui.tsx`; `app/project-card.tsx` ×2 |
| `UrgencySelect` · `app/urgency.tsx:10` | 2 | 1 | `app/workspace-forms.tsx` ×2 |
| `VersionNotice` · `app/version-notice.tsx:22` | 1 | 1 | `app/scale-workspace.tsx` |
| `WeeklyAutomatic` · `app/weekly-automatic.tsx:31` | 1 | 1 | `app/reports-workspace.tsx` |
| `WhatsAppButton` · `app/whatsapp-button.tsx:8` | 3 | 2 | `app/productivity-ui.tsx`; `app/sections/clientes.tsx` ×2 |
| `WhatsAppIcon` · `app/whatsapp-button.tsx:5` | 3 | 2 | `app/sections/pipeline.tsx`; `app/whatsapp-button.tsx` ×2 |
| `Checklist` · `app/work-checklist.tsx:35` | 1 | 1 | `app/work-checklist.tsx` |
| `WorkChecklist` · `app/work-checklist.tsx:28` | 1 | 1 | `app/productivity-ui.tsx` |
| `InternalTasks` · `app/work-history.tsx:69` | 1 | 1 | `app/sections/resumen.tsx` |
| `WorkHistory` · `app/work-history.tsx:33` | 1 | 1 | `app/sections/historial.tsx` |
| `WorkOrderLinks` · `app/work-order-links.tsx:8` | 1 | 1 | `app/productivity-ui.tsx` |
| `WorkspaceBrand` · `app/workspace-brand.tsx:4` | 10 | 8 | `app/access-layout.tsx`; `app/auth-brand-panel.tsx`; `app/blog/layout.tsx`; `app/loading-screen.tsx`; `app/maintenance-gate.tsx`; `app/scale-workspace.tsx` ×3; `app/superadmin/page.tsx`; `app/superadmin/sidebar.tsx` |
| `WorkspaceFooter` · `app/workspace-footer.tsx:16` | 8 | 7 | `app/access-layout.tsx`; `app/blog/layout.tsx`; `app/cliente/layout.tsx`; `app/error.tsx`; `app/not-found.tsx`; `app/scale-workspace.tsx` ×2; `app/superadmin/page.tsx` |
| `AccountForm` · `app/workspace-forms.tsx:272` | 1 | 1 | `app/account-create-dialog.tsx` |
| `InvoiceForm` · `app/workspace-forms.tsx:409` | 1 | 1 | `app/scale-workspace.tsx` |
| `OrderForm` · `app/workspace-forms.tsx:131` | 1 | 1 | `app/scale-workspace.tsx` |
| `PaymentForm` · `app/workspace-forms.tsx:503` | 1 | 1 | `app/scale-workspace.tsx` |
| `ProjectForm` · `app/workspace-forms.tsx:34` | 1 | 1 | `app/scale-workspace.tsx` |
| `WorkspaceFrame` · `app/workspace-frame.tsx:7` | 1 | 1 | `app/(workspace)/layout.tsx` |
| `GuideStep` · `app/workspace-guide.tsx:29` | 1 | 1 | `app/workspace-guide.tsx` |
| `NewCompany` · `app/workspace-guide.tsx:112` | 1 | 1 | `app/sections/configuracion.tsx` |
| `ScopedWorkspaceGuide` · `app/workspace-guide.tsx:39` | 1 | 1 | `app/workspace-guide.tsx` |
| `WorkspaceGuide` · `app/workspace-guide.tsx:34` | 2 | 2 | `app/scale-workspace.tsx`; `app/sections/resumen.tsx` |
| `WorkspaceSearch` · `app/workspace-search.tsx:92` | 1 | 1 | `app/scale-workspace.tsx` |

## Superficies nativas y bypass de las fachadas

Los tags que implementan un componente base se incluyen aquí; no todos son duplicados. `type` y clases se cuentan sólo cuando son literales: los props dinámicos y Field.type de Editor requieren lectura del consumidor.

### button: 519 sitios, 117 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/acceso-pendiente/page.tsx` | 1 |
| `app/account-security.tsx` | 1 |
| `app/announcement-banner.tsx` | 1 |
| `app/archive-controls.tsx` | 5 |
| `app/assignee-picker.tsx` | 2 |
| `app/client-assign-plan.tsx` | 2 |
| `app/client-directory-toolbar.tsx` | 1 |
| `app/client-editor.tsx` | 1 |
| `app/client-ruc.tsx` | 2 |
| `app/cliente/entregas/[id]/page.tsx` | 4 |
| `app/cliente/entregas/page.tsx` | 1 |
| `app/cliente/ingresar/page.tsx` | 1 |
| `app/cliente/invitacion/page.tsx` | 1 |
| `app/cliente/recuperar/page.tsx` | 1 |
| `app/comment-composer.tsx` | 3 |
| `app/commenting.tsx` | 3 |
| `app/company-legal-profile.tsx` | 1 |
| `app/company-settings.tsx` | 3 |
| `app/contracts-workspace.tsx` | 16 |
| `app/control-center.tsx` | 7 |
| `app/daily-controls.tsx` | 14 |
| `app/deletion-danger-zone.tsx` | 9 |
| `app/demo-toolbar.tsx` | 5 |
| `app/demo/page.tsx` | 1 |
| `app/desktop-sidebar.tsx` | 1 |
| `app/dialog.tsx` | 3 |
| `app/drive-links.tsx` | 2 |
| `app/employee-tasks.tsx` | 14 |
| `app/entity-picker.tsx` | 2 |
| `app/error.tsx` | 1 |
| `app/finance-balance.tsx` | 7 |
| `app/finance-clients.tsx` | 1 |
| `app/finance-collections.tsx` | 11 |
| `app/finance-personnel.tsx` | 1 |
| `app/finance-receipt-editor.tsx` | 3 |
| `app/financial-forecast.tsx` | 4 |
| `app/foto-perfil.tsx` | 1 |
| `app/global-error.tsx` | 1 |
| `app/google-sign-in.tsx` | 1 |
| `app/ia-carga-button.tsx` | 1 |
| `app/ia-carga.tsx` | 30 |
| `app/inventory-workspace.tsx` | 8 |
| `app/invitacion/page.tsx` | 3 |
| `app/invite-links.tsx` | 7 |
| `app/loading-screen.tsx` | 1 |
| `app/maintenance-gate.tsx` | 1 |
| `app/manual.tsx` | 2 |
| `app/mobile-navigation.tsx` | 2 |
| `app/my-data.tsx` | 2 |
| `app/my-profile.tsx` | 2 |
| `app/notification-inbox.tsx` | 11 |
| `app/notifications-ui.tsx` | 3 |
| `app/operations.tsx` | 11 |
| `app/password-field.tsx` | 1 |
| `app/password-panel.tsx` | 1 |
| `app/permissions-matrix.tsx` | 3 |
| `app/person-photo.tsx` | 4 |
| `app/photo-cropper.tsx` | 3 |
| `app/photo-viewer.tsx` | 4 |
| `app/presence.tsx` | 3 |
| `app/privacy-panel.tsx` | 7 |
| `app/production-board.tsx` | 2 |
| `app/productivity-ui.tsx` | 21 |
| `app/profile-controls.tsx` | 2 |
| `app/profile-photo.tsx` | 6 |
| `app/project-card.tsx` | 2 |
| `app/quote-composer.tsx` | 2 |
| `app/record-assignees.tsx` | 4 |
| `app/recuperar-cuenta/page.tsx` | 1 |
| `app/registro/page.tsx` | 7 |
| `app/report-problem.tsx` | 1 |
| `app/reports-workspace.tsx` | 5 |
| `app/save-actions.tsx` | 1 |
| `app/scale-workspace.tsx` | 9 |
| `app/sections/clientes.tsx` | 12 |
| `app/sections/comisiones.tsx` | 12 |
| `app/sections/finanzas.tsx` | 20 |
| `app/sections/mora.tsx` | 5 |
| `app/sections/pipeline.tsx` | 17 |
| `app/sections/planes.tsx` | 2 |
| `app/sections/presupuestos.tsx` | 7 |
| `app/sections/produccion.tsx` | 6 |
| `app/sections/proyectos.tsx` | 6 |
| `app/sections/resumen.tsx` | 2 |
| `app/status/page.tsx` | 1 |
| `app/studio-workspace.tsx` | 4 |
| `app/subscription-panel.tsx` | 4 |
| `app/suite.tsx` | 12 |
| `app/superadmin/access.tsx` | 6 |
| `app/superadmin/agencies.tsx` | 3 |
| `app/superadmin/announcements.tsx` | 4 |
| `app/superadmin/apply-coupon-dialog.tsx` | 1 |
| `app/superadmin/audit.tsx` | 1 |
| `app/superadmin/catalog.tsx` | 3 |
| `app/superadmin/confirm.tsx` | 4 |
| `app/superadmin/errors.tsx` | 6 |
| `app/superadmin/inquiries.tsx` | 2 |
| `app/superadmin/maintenance.tsx` | 1 |
| `app/superadmin/overview.tsx` | 5 |
| `app/superadmin/page.tsx` | 1 |
| `app/superadmin/reports.tsx` | 2 |
| `app/superadmin/sidebar.tsx` | 1 |
| `app/superadmin/states.tsx` | 2 |
| `app/superadmin/subscription-dialog.tsx` | 5 |
| `app/tab-scroller.tsx` | 2 |
| `app/team-access.tsx` | 1 |
| `app/team-person-sheet.tsx` | 2 |
| `app/team-workspace.tsx` | 7 |
| `app/theme-toggle.tsx` | 1 |
| `app/ui-v2.tsx` | 6 |
| `app/verificar-correo/page.tsx` | 1 |
| `app/version-notice.tsx` | 1 |
| `app/work-checklist.tsx` | 7 |
| `app/work-history.tsx` | 2 |
| `app/work-order-links.tsx` | 1 |
| `app/workspace-forms.tsx` | 11 |
| `app/workspace-guide.tsx` | 8 |

Tipos literales: `button`=359, `submit`=13.
### input: 98 sitios, 45 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/archive-controls.tsx` | 1 |
| `app/assignee-picker.tsx` | 1 |
| `app/client-identity.tsx` | 1 |
| `app/cliente/invitacion/page.tsx` | 2 |
| `app/commenting.tsx` | 2 |
| `app/contracts-workspace.tsx` | 2 |
| `app/daily-controls.tsx` | 2 |
| `app/deletion-danger-zone.tsx` | 3 |
| `app/dialog.tsx` | 1 |
| `app/drive-links.tsx` | 3 |
| `app/email-field.tsx` | 1 |
| `app/employee-tasks.tsx` | 8 |
| `app/finance-balance.tsx` | 1 |
| `app/inventory-workspace.tsx` | 8 |
| `app/invitacion/page.tsx` | 1 |
| `app/invite-links.tsx` | 1 |
| `app/operations.tsx` | 2 |
| `app/password-field.tsx` | 1 |
| `app/person-photo.tsx` | 2 |
| `app/phone-field.tsx` | 1 |
| `app/photo-cropper.tsx` | 1 |
| `app/photo-viewer.tsx` | 1 |
| `app/productivity-ui.tsx` | 2 |
| `app/profile-controls.tsx` | 1 |
| `app/profile-photo.tsx` | 2 |
| `app/project-card.tsx` | 1 |
| `app/registro/page.tsx` | 1 |
| `app/scale-workspace.tsx` | 1 |
| `app/search-field.tsx` | 1 |
| `app/sections/clientes.tsx` | 2 |
| `app/sections/pipeline.tsx` | 2 |
| `app/sections/presupuestos.tsx` | 2 |
| `app/studio-workspace.tsx` | 3 |
| `app/subscription-panel.tsx` | 2 |
| `app/superadmin/announcements.tsx` | 3 |
| `app/superadmin/apply-coupon-dialog.tsx` | 1 |
| `app/superadmin/catalog.tsx` | 3 |
| `app/superadmin/confirm.tsx` | 2 |
| `app/superadmin/maintenance.tsx` | 1 |
| `app/superadmin/subscription-dialog.tsx` | 3 |
| `app/team-workspace.tsx` | 1 |
| `app/text-field.tsx` | 1 |
| `app/work-checklist.tsx` | 3 |
| `app/work-order-links.tsx` | 3 |
| `app/workspace-forms.tsx` | 11 |

Tipos literales: `checkbox`=33, `radio`=2, `url`=6, `password`=2, `hidden`=1, `email`=1, `date`=5, `month`=2, `file`=3, `tel`=1, `range`=2, `search`=2, `datetime-local`=4, `text`=1, `time`=1.
### textarea: 23 sitios, 17 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/cliente/entregas/[id]/page.tsx` | 2 |
| `app/comment-composer.tsx` | 1 |
| `app/commenting.tsx` | 1 |
| `app/daily-controls.tsx` | 2 |
| `app/employee-tasks.tsx` | 1 |
| `app/ia-carga.tsx` | 1 |
| `app/inventory-workspace.tsx` | 5 |
| `app/operations.tsx` | 1 |
| `app/report-problem.tsx` | 1 |
| `app/superadmin/announcements.tsx` | 1 |
| `app/superadmin/catalog.tsx` | 1 |
| `app/superadmin/inquiries.tsx` | 1 |
| `app/superadmin/maintenance.tsx` | 1 |
| `app/superadmin/reports.tsx` | 1 |
| `app/superadmin/subscription-dialog.tsx` | 1 |
| `app/work-checklist.tsx` | 1 |
| `app/workspace-forms.tsx` | 1 |
### select: 4 sitios, 3 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/demo-toolbar.tsx` | 2 |
| `app/phone-field.tsx` | 1 |
| `app/privacy-panel.tsx` | 1 |
### table: 2 sitios, 2 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/plan-comparison.tsx` | 1 |
| `app/superadmin/usage-charts.tsx` | 1 |
### form: 46 sitios, 29 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/client-commercial-lifecycle.tsx` | 1 |
| `app/client-identity.tsx` | 1 |
| `app/cliente/entregas/[id]/page.tsx` | 1 |
| `app/cliente/ingresar/page.tsx` | 1 |
| `app/cliente/invitacion/page.tsx` | 1 |
| `app/cliente/recuperar/page.tsx` | 1 |
| `app/comment-composer.tsx` | 1 |
| `app/commenting.tsx` | 1 |
| `app/daily-controls.tsx` | 1 |
| `app/deletion-danger-zone.tsx` | 3 |
| `app/dialog.tsx` | 1 |
| `app/finance-collections.tsx` | 1 |
| `app/financial-forecast.tsx` | 2 |
| `app/ia-carga.tsx` | 1 |
| `app/inventory-workspace.tsx` | 7 |
| `app/invitacion/page.tsx` | 1 |
| `app/operations.tsx` | 1 |
| `app/profile-photo.tsx` | 1 |
| `app/quote-composer.tsx` | 1 |
| `app/recuperar-cuenta/page.tsx` | 1 |
| `app/registro/page.tsx` | 2 |
| `app/scale-workspace.tsx` | 1 |
| `app/sections/pipeline.tsx` | 3 |
| `app/superadmin/announcements.tsx` | 1 |
| `app/superadmin/catalog.tsx` | 1 |
| `app/superadmin/subscription-dialog.tsx` | 2 |
| `app/verificar-correo/page.tsx` | 1 |
| `app/work-order-links.tsx` | 1 |
| `app/workspace-forms.tsx` | 5 |
### fieldset: 23 sitios, 10 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/assignee-picker.tsx` | 1 |
| `app/client-identity.tsx` | 1 |
| `app/commenting.tsx` | 1 |
| `app/employee-tasks.tsx` | 4 |
| `app/entity-picker.tsx` | 1 |
| `app/inventory-workspace.tsx` | 7 |
| `app/registro/page.tsx` | 1 |
| `app/studio-workspace.tsx` | 1 |
| `app/subscription-panel.tsx` | 1 |
| `app/workspace-forms.tsx` | 5 |
### details: 34 sitios, 20 archivos

| Consumidor | Sitios |
| --- | ---: |
| `app/contracts-workspace.tsx` | 3 |
| `app/control-center.tsx` | 3 |
| `app/employee-tasks.tsx` | 2 |
| `app/financial-forecast.tsx` | 2 |
| `app/growth-dashboard.tsx` | 1 |
| `app/inventory-workspace.tsx` | 3 |
| `app/manual.tsx` | 1 |
| `app/operations.tsx` | 1 |
| `app/permissions-matrix.tsx` | 3 |
| `app/profile-photo.tsx` | 1 |
| `app/quote-composer.tsx` | 2 |
| `app/registro/page.tsx` | 1 |
| `app/reports-workspace.tsx` | 1 |
| `app/sections/clientes.tsx` | 1 |
| `app/sections/pipeline.tsx` | 1 |
| `app/sections/proyectos.tsx` | 1 |
| `app/suite.tsx` | 2 |
| `app/superadmin/subscription-dialog.tsx` | 1 |
| `app/superadmin/usage-charts.tsx` | 1 |
| `app/workspace-guide.tsx` | 3 |

## Dependencia UI ya importada por la aplicación

Sólo se registran importaciones y JSX de app; no se abrió el repositorio ni la implementación de OwnCoding. No es una selección de objetos nuevos. Estas 39 entradas/585 sitios explican parte de las rutas paralelas a los wrappers locales.

| Símbolo importado / origen existente | JSX | Archivos | Consumidores |
| --- | ---: | ---: | --- |
| `Aviso` · `owncoding-ui` | 76 | 23 | `app/client-assign-plan.tsx`; `app/client-commercial-lifecycle.tsx` ×3; `app/client-editor.tsx` ×3; `app/client-identity.tsx`; `app/client-reporting.tsx` ×4; `app/daily-controls.tsx` ×4; `app/financial-forecast.tsx` ×3; `app/ia-carga.tsx` ×19; `app/inventory-workspace.tsx` ×13; `app/my-profile.tsx`; `app/productivity-ui.tsx` ×3; `app/quote-composer.tsx`; `app/reports-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx` ×2; `app/sections/finanzas.tsx`; `app/sections/mora.tsx` ×2; `app/sections/pipeline.tsx` ×3; `app/sections/preferencias.tsx`; `app/sections/presupuestos.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx` ×6; `app/superadmin/states.tsx` |
| `AvisoPrivacidad` · `owncoding-ui` | 7 | 7 | `app/client-editor.tsx`; `app/daily-controls.tsx`; `app/ia-carga.tsx`; `app/invitacion/page.tsx`; `app/registro/page.tsx`; `app/scale-workspace.tsx`; `app/sections/pipeline.tsx` |
| `AyudaModulo` · `owncoding-ui` | 1 | 1 | `app/workspace-guide.tsx` |
| `Badge` · `owncoding-ui` | 1 | 1 | `app/ui-v2.tsx` |
| `BancoCombobox` · `owncoding-ui` | 1 | 1 | `app/workspace-forms.tsx` |
| `BancoLogo` · `owncoding-ui` | 1 | 1 | `app/finance-balance.tsx` |
| `BarraProgreso` · `owncoding-ui` | 8 | 5 | `app/control-center.tsx` ×2; `app/financial-forecast.tsx` ×3; `app/inventory-workspace.tsx`; `app/reports-workspace.tsx`; `app/ui-v2.tsx` |
| `BuscadorPersonas` · `owncoding-ui` | 1 | 1 | `app/profile-controls.tsx` |
| `Button` · `owncoding-ui` | 77 | 14 | `app/client-commercial-lifecycle.tsx` ×4; `app/client-directory-toolbar.tsx`; `app/client-reporting.tsx` ×2; `app/daily-controls.tsx` ×3; `app/financial-forecast.tsx` ×2; `app/inventory-workspace.tsx` ×33; `app/quote-composer.tsx` ×8; `app/reports-workspace.tsx` ×2; `app/sections/pipeline.tsx` ×9; `app/sections/planes.tsx` ×2; `app/sections/produccion.tsx` ×2; `app/sections/proyectos.tsx` ×2; `app/studio-workspace.tsx` ×4; `app/work-history.tsx` ×3 |
| `CampanaAvisos` · `owncoding-ui` | 1 | 1 | `app/notification-inbox.tsx` |
| `Card` · `owncoding-ui` | 21 | 7 | `app/daily-controls.tsx`; `app/financial-forecast.tsx` ×5; `app/growth-dashboard.tsx`; `app/inventory-workspace.tsx` ×3; `app/reports-workspace.tsx` ×6; `app/studio-workspace.tsx` ×4; `app/weekly-automatic.tsx` |
| `CeldaMoneda` · `owncoding-ui` | 9 | 1 | `app/inventory-workspace.tsx` ×9 |
| `Checkbox` · `owncoding-ui` | 1 | 1 | `app/ia-carga.tsx` |
| `ChipEstado` · `owncoding-ui` | 1 | 1 | `app/team-access.tsx` |
| `ConsentimientoDatos` · `owncoding-ui` | 2 | 2 | `app/invitacion/page.tsx`; `app/registro/page.tsx` |
| `DataTable` · `owncoding-ui` | 5 | 5 | `app/client-commercial-lifecycle.tsx`; `app/financial-forecast.tsx`; `app/growth-dashboard.tsx`; `app/reports-workspace.tsx`; `app/weekly-automatic.tsx` |
| `EmptyState` · `owncoding-ui` | 19 | 9 | `app/client-commercial-lifecycle.tsx`; `app/client-reporting.tsx`; `app/daily-controls.tsx` ×2; `app/financial-forecast.tsx` ×6; `app/inventory-workspace.tsx` ×3; `app/reports-workspace.tsx`; `app/studio-workspace.tsx` ×3; `app/ui-v2.tsx`; `app/weekly-automatic.tsx` |
| `ErrorState` · `owncoding-ui` | 8 | 7 | `app/daily-controls.tsx`; `app/financial-forecast.tsx` ×2; `app/inventory-workspace.tsx`; `app/reports-workspace.tsx`; `app/studio-workspace.tsx`; `app/ui-v2.tsx`; `app/weekly-automatic.tsx` |
| `FilaDato` · `owncoding-ui` | 36 | 7 | `app/client-reporting.tsx` ×4; `app/financial-forecast.tsx` ×12; `app/inventory-workspace.tsx` ×8; `app/productivity-ui.tsx` ×4; `app/reports-workspace.tsx` ×3; `app/sections/finanzas.tsx` ×3; `app/weekly-automatic.tsx` ×2 |
| `FormField` · `owncoding-ui` | 61 | 9 | `app/client-commercial-lifecycle.tsx` ×9; `app/client-reporting.tsx` ×13; `app/daily-controls.tsx` ×5; `app/financial-forecast.tsx` ×5; `app/ia-carga.tsx` ×15; `app/quote-composer.tsx` ×11; `app/reports-workspace.tsx`; `app/sections/comisiones.tsx`; `app/weekly-automatic.tsx` |
| `IconAction` · `owncoding-ui` | 23 | 8 | `app/daily-controls.tsx` ×2; `app/finance-clients.tsx` ×2; `app/finance-personnel.tsx` ×3; `app/financial-forecast.tsx` ×2; `app/inventory-workspace.tsx` ×6; `app/project-card.tsx`; `app/sections/clientes.tsx` ×2; `app/studio-workspace.tsx` ×5 |
| `Input` · `owncoding-ui` | 59 | 12 | `app/client-commercial-lifecycle.tsx` ×5; `app/client-reporting.tsx` ×6; `app/daily-controls.tsx` ×3; `app/financial-forecast.tsx` ×4; `app/ia-carga.tsx` ×7; `app/inventory-workspace.tsx` ×21; `app/quote-composer.tsx` ×5; `app/reports-workspace.tsx`; `app/sections/comisiones.tsx`; `app/sections/pipeline.tsx` ×4; `app/studio-workspace.tsx`; `app/weekly-automatic.tsx` |
| `Label` · `owncoding-ui` | 42 | 6 | `app/client-directory-toolbar.tsx`; `app/financial-forecast.tsx`; `app/inventory-workspace.tsx` ×31; `app/sections/pipeline.tsx` ×7; `app/studio-workspace.tsx`; `app/ui-v2.tsx` |
| `ListGridToggle` · `owncoding-ui` | 1 | 1 | `app/ui-v2.tsx` |
| `MenuDesplegable` · `owncoding-ui` | 6 | 3 | `app/inventory-workspace.tsx` ×4; `app/production-board.tsx`; `app/ui-v2.tsx` |
| `MoneyInput` · `owncoding-ui` | 9 | 5 | `app/client-commercial-lifecycle.tsx`; `app/client-reporting.tsx` ×2; `app/inventory-workspace.tsx` ×4; `app/profile-controls.tsx`; `app/quote-composer.tsx` |
| `Nota` · `owncoding-ui` | 15 | 11 | `app/client-reporting.tsx`; `app/daily-controls.tsx` ×3; `app/financial-forecast.tsx`; `app/growth-dashboard.tsx`; `app/inventory-workspace.tsx` ×2; `app/productivity-ui.tsx`; `app/reports-workspace.tsx` ×2; `app/studio-workspace.tsx`; `app/superadmin/access.tsx`; `app/weekly-automatic.tsx`; `app/work-history.tsx` |
| `PaletaComandos` · `owncoding-ui` | 1 | 1 | `app/workspace-search.tsx` |
| `ProductFooter` · `owncoding-ui` | 2 | 1 | `app/workspace-footer.tsx` ×2 |
| `SearchField` · `owncoding-ui` | 16 | 15 | `app/archive-controls.tsx`; `app/client-directory-toolbar.tsx`; `app/inventory-workspace.tsx` ×2; `app/invite-links.tsx`; `app/sections/finanzas.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/presupuestos.tsx`; `app/studio-workspace.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/usage.tsx`; `app/team-workspace.tsx` |
| `SegmentedField` · `owncoding-ui` | 9 | 9 | `app/financial-forecast.tsx`; `app/notification-inbox.tsx`; `app/reports-workspace.tsx`; `app/sections/mora.tsx`; `app/sections/presupuestos.tsx`; `app/superadmin/period-chips.tsx`; `app/superadmin/traffic.tsx`; `app/team-workspace.tsx`; `app/ui-v2.tsx` |
| `Select` · `owncoding-ui` | 23 | 13 | `app/client-commercial-lifecycle.tsx`; `app/client-directory-toolbar.tsx`; `app/client-reporting.tsx` ×6; `app/quote-composer.tsx` ×3; `app/sections/pipeline.tsx` ×3; `app/sections/produccion.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/errors.tsx` ×2; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/usage.tsx`; `app/ui-v2.tsx` |
| `SerialField` · `owncoding-ui` | 1 | 1 | `app/inventory-workspace.tsx` |
| `SerialTexto` · `owncoding-ui` | 2 | 1 | `app/inventory-workspace.tsx` ×2 |
| `Skeleton` · `owncoding-ui` | 28 | 3 | `app/control-center.tsx` ×5; `app/superadmin/states.tsx` ×12; `app/ui-v2.tsx` ×11 |
| `Stat` · `owncoding-ui` | 1 | 1 | `app/ui-v2.tsx` |
| `Subtabs` · `owncoding-ui` | 4 | 3 | `app/productivity-ui.tsx` ×2; `app/sections/comisiones.tsx`; `app/sections/finanzas.tsx` |
| `Switch` · `owncoding-ui` | 2 | 2 | `app/quote-composer.tsx`; `app/superadmin/maintenance.tsx` |
| `Textarea` · `owncoding-ui` | 4 | 2 | `app/client-commercial-lifecycle.tsx` ×2; `app/quote-composer.tsx` ×2 |

## Helpers de comportamiento: llamadas importadas

Se cuentan llamadas directas a bindings importados, sin sumar llamadas internas del mismo archivo ni funciones invocadas indirectamente.

| Helper | Llamadas | Archivos | Consumidores |
| --- | ---: | ---: | --- |
| `notify` · `app/feedback.ts` | 79 | 37 | `app/archive-controls.tsx`; `app/bulk-selection.tsx`; `app/client-assign-plan.tsx`; `app/client-identity.tsx`; `app/company-settings.tsx`; `app/inventory-label.tsx`; `app/inventory-workspace.tsx` ×2; `app/invite-links.tsx`; `app/my-data.tsx` ×4; `app/my-profile.tsx`; `app/notifications-ui.tsx`; `app/permissions-matrix.tsx` ×2; `app/privacy-panel.tsx`; `app/productivity-ui.tsx` ×3; `app/report-problem.tsx`; `app/reports-print.tsx`; `app/reports-workspace.tsx`; `app/save-completion.ts`; `app/scale-workspace.tsx` ×7; `app/sections/clientes.tsx` ×3; `app/sections/comisiones.tsx` ×3; `app/sections/finanzas.tsx` ×3; `app/sections/pipeline.tsx` ×4; `app/sections/presupuestos.tsx`; `app/sections/proyectos.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/announcements.tsx` ×5; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/errors.tsx` ×2; `app/superadmin/inquiries.tsx` ×2; `app/superadmin/maintenance.tsx`; `app/superadmin/page.tsx` ×9; `app/superadmin/reports.tsx` ×2; `app/team-person-sheet.tsx` ×4; `app/team-workspace.tsx` ×2; `app/use-board-data.ts` ×2 |
| `notifyMutation` · `app/feedback.ts` | 3 | 3 | `app/operations.tsx`; `app/record-assignees.tsx`; `app/workspace-request.ts` |
| `useDialogPending` · `app/dialog.tsx` | 3 | 3 | `app/operations.tsx`; `app/save-actions.tsx`; `app/sections/pipeline.tsx` |
| `useOverlay` · `app/dialog.tsx` | 2 | 2 | `app/mobile-navigation.tsx`; `app/photo-viewer.tsx` |
| `useSingleFlightSubmit` · `app/use-single-flight-submit.ts` | 6 | 2 | `app/quote-composer.tsx`; `app/workspace-forms.tsx` ×5 |
| `useDenseTableFit` · `app/ui-v2.tsx` | 11 | 11 | `app/presence.tsx`; `app/sections/clientes.tsx`; `app/sections/presupuestos.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx` |
| `emailValid` · `app/field-rules.ts` | 2 | 2 | `app/operations.tsx`; `app/registro/page.tsx` |
| `phoneValid` · `app/field-rules.ts` | 1 | 1 | `app/operations.tsx` |

## Propagación por composición

Cierre transitivo del grafo JSX local, no del grafo de imports de datos. Se sigue el componente que contiene cada JSX y sus propios consumidores, evitando ciclos. Incluye wrappers de negocio y archivos internos; no es una estimación de instancias DOM ni de tráfico. Los componentes dinámicos se revisan en la sección siguiente.

### `app/dialog.tsx#Dialog` — 76 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/account-create-dialog.tsx`; `app/archive-controls.tsx`; `app/client-assign-plan.tsx`; `app/client-commercial-summary.tsx`; `app/client-editor.tsx`; `app/client-identity.tsx`; `app/contracts-workspace.tsx`; `app/control-center.tsx`; `app/daily-controls.tsx`; `app/demo-toolbar.tsx`; `app/dialog.tsx`; `app/employee-tasks.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-history.tsx`; `app/finance-personnel.tsx`; `app/finance-receipt-editor.tsx`; `app/financial-forecast.tsx`; `app/ia-carga.tsx`; `app/inventory-workspace.tsx`; `app/my-data.tsx`; `app/my-profile.tsx`; `app/notification-inbox.tsx`; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/password-panel.tsx`; `app/permissions-matrix.tsx`; `app/person-photo.tsx`; `app/person-sheet.tsx`; `app/photo-cropper.tsx`; `app/presence.tsx`; `app/privacy-panel.tsx`; `app/production-board.tsx`; `app/productivity-ui.tsx`; `app/profile-photo.tsx`; `app/project-card.tsx`; `app/registro/page.tsx`; `app/report-problem.tsx`; `app/scale-workspace.tsx`; `app/sections/actividad.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx`; `app/sections/configuracion.tsx`; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/finanzas.tsx`; `app/sections/inventario.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/planes.tsx`; `app/sections/presupuestos.tsx`; `app/sections/prevision.tsx`; `app/sections/produccion.tsx`; `app/sections/resumen.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/confirm.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/maintenance.tsx`; `app/superadmin/page.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/sections.tsx`; `app/superadmin/subscription-dialog.tsx`; `app/team-access.tsx`; `app/team-person-sheet.tsx`; `app/team-workspace.tsx`; `app/ui-v2.tsx`; `app/work-checklist.tsx`; `app/work-history.tsx`; `app/workspace-guide.tsx`.

### `app/operations.tsx#Editor` — 44 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/client-commercial-summary.tsx`; `app/client-editor.tsx`; `app/company-legal-profile.tsx`; `app/contracts-workspace.tsx`; `app/control-center.tsx`; `app/daily-controls.tsx`; `app/employee-tasks.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-personnel.tsx`; `app/finance-receipt-editor.tsx`; `app/inventory-workspace.tsx`; `app/invite-links.tsx`; `app/my-data.tsx`; `app/my-profile.tsx`; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/password-panel.tsx`; `app/privacy-panel.tsx`; `app/productivity-ui.tsx`; `app/project-card.tsx`; `app/registro/page.tsx`; `app/scale-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx`; `app/sections/configuracion.tsx`; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/finanzas.tsx`; `app/sections/inventario.tsx`; `app/sections/invitaciones.tsx`; `app/sections/mora.tsx`; `app/sections/pipeline.tsx`; `app/sections/produccion.tsx`; `app/sections/resumen.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/team-access.tsx`; `app/team-person-sheet.tsx`; `app/team-workspace.tsx`; `app/work-history.tsx`; `app/workspace-guide.tsx`.

### `app/profile-controls.tsx#SelectCustom` — 67 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/archive-controls.tsx`; `app/client-assign-plan.tsx`; `app/client-commercial-summary.tsx`; `app/client-editor.tsx`; `app/company-legal-profile.tsx`; `app/contracts-workspace.tsx`; `app/control-center.tsx`; `app/daily-controls.tsx`; `app/employee-tasks.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-personnel.tsx`; `app/finance-receipt-editor.tsx`; `app/financial-forecast.tsx`; `app/ia-carga.tsx`; `app/inventory-workspace.tsx`; `app/invite-links.tsx`; `app/my-data.tsx`; `app/my-profile.tsx`; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/password-panel.tsx`; `app/privacy-panel.tsx`; `app/productivity-ui.tsx`; `app/project-card.tsx`; `app/registro/page.tsx`; `app/report-problem.tsx`; `app/reports-workspace.tsx`; `app/scale-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx`; `app/sections/configuracion.tsx`; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/finanzas.tsx`; `app/sections/historial.tsx`; `app/sections/informes.tsx`; `app/sections/inventario.tsx`; `app/sections/invitaciones.tsx`; `app/sections/metricas.tsx`; `app/sections/mora.tsx`; `app/sections/papelera.tsx`; `app/sections/pipeline.tsx`; `app/sections/preferencias.tsx`; `app/sections/presupuestos.tsx`; `app/sections/prevision.tsx`; `app/sections/produccion.tsx`; `app/sections/proyectos.tsx`; `app/sections/resumen.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/apply-coupon-dialog.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/page.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/sections.tsx`; `app/superadmin/subscription-dialog.tsx`; `app/team-access.tsx`; `app/team-person-sheet.tsx`; `app/team-workspace.tsx`; `app/urgency.tsx`; `app/work-history.tsx`; `app/workspace-forms.tsx`; `app/workspace-guide.tsx`.

### `app/foto-perfil.tsx#FotoPerfil` — 63 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/account-create-dialog.tsx`; `app/actor-identity.tsx`; `app/assigned-people.tsx`; `app/assignee-picker.tsx`; `app/client-commercial-summary.tsx`; `app/client-editor.tsx`; `app/client-identity.tsx`; `app/comment-composer.tsx`; `app/commenting.tsx`; `app/control-center.tsx`; `app/daily-controls.tsx`; `app/employee-tasks.tsx`; `app/entity-picker.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-history.tsx`; `app/finance-personnel.tsx`; `app/finance-receipt-editor.tsx`; `app/ia-carga.tsx`; `app/inventory-workspace.tsx`; `app/invite-links.tsx`; `app/loading-screen.tsx`; `app/my-profile.tsx`; `app/notifications-ui.tsx`; `app/operations.tsx`; `app/person-container.tsx`; `app/person-photo.tsx`; `app/photo-viewer.tsx`; `app/presence.tsx`; `app/production-board.tsx`; `app/productivity-ui.tsx`; `app/profile-photo.tsx`; `app/project-card.tsx`; `app/record-assignees.tsx`; `app/reports-workspace.tsx`; `app/scale-workspace.tsx`; `app/sections/actividad.tsx`; `app/sections/clientes.tsx`; `app/sections/configuracion.tsx`; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/finanzas.tsx`; `app/sections/historial.tsx`; `app/sections/informes.tsx`; `app/sections/inventario.tsx`; `app/sections/invitaciones.tsx`; `app/sections/mora.tsx`; `app/sections/produccion.tsx`; `app/sections/resumen.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/sections.tsx`; `app/superadmin/usage.tsx`; `app/team-person-sheet.tsx`; `app/team-workspace.tsx`; `app/weekly-automatic.tsx`; `app/work-checklist.tsx`; `app/work-history.tsx`; `app/workspace-forms.tsx`.

### `app/ui-v2.tsx#ListGrid` — 49 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/archive-controls.tsx`; `app/company-settings.tsx`; `app/finance-balance.tsx`; `app/finance-clients.tsx`; `app/finance-collections.tsx`; `app/finance-personnel.tsx`; `app/financial-forecast.tsx`; `app/invite-links.tsx`; `app/operations.tsx`; `app/presence.tsx`; `app/privacy-panel.tsx`; `app/productivity-ui.tsx`; `app/reports-workspace.tsx`; `app/scale-workspace.tsx`; `app/sections/actividad.tsx`; `app/sections/clientes.tsx`; `app/sections/comisiones.tsx`; `app/sections/configuracion.tsx`; `app/sections/equipo.tsx`; `app/sections/estudio.tsx`; `app/sections/finanzas.tsx`; `app/sections/historial.tsx`; `app/sections/informes.tsx`; `app/sections/invitaciones.tsx`; `app/sections/mora.tsx`; `app/sections/papelera.tsx`; `app/sections/pipeline.tsx`; `app/sections/presupuestos.tsx`; `app/sections/prevision.tsx`; `app/sections/produccion.tsx`; `app/sections/proyectos.tsx`; `app/sections/resumen.tsx`; `app/studio-workspace.tsx`; `app/suite.tsx`; `app/superadmin/access.tsx`; `app/superadmin/agencies.tsx`; `app/superadmin/announcements.tsx`; `app/superadmin/audit.tsx`; `app/superadmin/catalog.tsx`; `app/superadmin/errors.tsx`; `app/superadmin/inquiries.tsx`; `app/superadmin/reports.tsx`; `app/superadmin/sections.tsx`; `app/superadmin/traffic.tsx`; `app/superadmin/usage.tsx`; `app/team-workspace.tsx`; `app/work-history.tsx`; `app/workspace-guide.tsx`.

### `app/search-field.tsx#SearchField` — 17 archivos alcanzados

`app/(workspace)/layout.tsx`; `app/account-create-dialog.tsx`; `app/assignee-picker.tsx`; `app/client-commercial-summary.tsx`; `app/contracts-workspace.tsx`; `app/control-center.tsx`; `app/entity-picker.tsx`; `app/finance-collections.tsx`; `app/finance-receipt-editor.tsx`; `app/productivity-ui.tsx`; `app/record-assignees.tsx`; `app/scale-workspace.tsx`; `app/sections/clientes.tsx`; `app/sections/mora.tsx`; `app/sections/resumen.tsx`; `app/suite.tsx`; `app/workspace-forms.tsx`.


## Imports lazy resueltos al modelo real

Los 26 bindings dynamic(() => import(...).then(...)) se resuelven al export de destino. Por ejemplo, PhotoCropper en dos wrappers sigue siendo una sola implementación en photo-cropper.tsx.

| Consumidor | Binding | Export real |
| --- | --- | --- |
| `app/person-photo.tsx` | `PhotoCropper` | `app/photo-cropper.tsx#PhotoCropper` |
| `app/profile-photo.tsx` | `PhotoCropper` | `app/photo-cropper.tsx#PhotoCropper` |
| `app/scale-workspace.tsx` | `DemoToolbar` | `app/demo-toolbar.tsx#DemoToolbar` |
| `app/scale-workspace.tsx` | `DemoWelcome` | `app/demo-toolbar.tsx#DemoWelcome` |
| `app/scale-workspace.tsx` | `MyProfile` | `app/my-profile.tsx#MyProfile` |
| `app/scale-workspace.tsx` | `IaCargaDialog` | `app/ia-carga.tsx#IaCargaDialog` |
| `app/scale-workspace.tsx` | `ClientEditorDialog` | `app/client-editor.tsx#ClientEditorDialog` |
| `app/scale-workspace.tsx` | `PresenceTracker` | `app/presence.tsx#PresenceTracker` |
| `app/scale-workspace.tsx` | `WorkDetail` | `app/productivity-ui.tsx#WorkDetail` |
| `app/scale-workspace.tsx` | `ClientDetail` | `app/productivity-ui.tsx#ClientDetail` |
| `app/scale-workspace.tsx` | `ContractsWorkspace` | `app/contracts-workspace.tsx#ContractsWorkspace` |
| `app/sections/actividad.tsx` | `UsagePanel` | `app/presence.tsx#UsagePanel` |
| `app/sections/configuracion.tsx` | `DeletionDangerZone` | `app/deletion-danger-zone.tsx#DeletionDangerZone` |
| `app/sections/configuracion.tsx` | `CompanyLegalProfile` | `app/company-legal-profile.tsx#CompanyLegalProfile` |
| `app/sections/equipo.tsx` | `OperationsWorkspace` | `app/operations.tsx#OperationsWorkspace` |
| `app/sections/estudio.tsx` | `StudioWorkspace` | `app/studio-workspace.tsx#StudioWorkspace` |
| `app/sections/historial.tsx` | `WorkHistory` | `app/work-history.tsx#WorkHistory` |
| `app/sections/informes.tsx` | `ReportsWorkspace` | `app/reports-workspace.tsx#ReportsWorkspace` |
| `app/sections/inventario.tsx` | `InventoryWorkspace` | `app/inventory-workspace.tsx#InventoryWorkspace` |
| `app/sections/invitaciones.tsx` | `InviteLinks` | `app/invite-links.tsx#InviteLinks` |
| `app/sections/metricas.tsx` | `GrowthDashboard` | `app/growth-dashboard.tsx#GrowthDashboard` |
| `app/sections/pipeline.tsx` | `LiveVisitors` | `app/live-visitors.tsx#LiveVisitors` |
| `app/sections/prevision.tsx` | `FinancialForecast` | `app/financial-forecast.tsx#FinancialForecast` |
| `app/sections/produccion.tsx` | `WorkPlanner` | `app/productivity-ui.tsx#WorkPlanner` |
| `app/sections/resumen.tsx` | `WorkPlanner` | `app/productivity-ui.tsx#WorkPlanner` |
| `app/sections/resumen.tsx` | `InternalTasks` | `app/work-history.tsx#InternalTasks` |

## Referencias dinámicas revisadas manualmente

| Nombre JSX | Sitios | Resolución / tratamiento |
| --- | --- | --- |
| `BoardPeople.Provider` | `app/presence.tsx:62` | Contexto BoardPeople de presence; infraestructura, no avatar duplicado. |
| `CurrencyContext.Provider` | `app/currency-provider.tsx:11` | Proveedor de moneda; no input monetario ni componente visual nuevo. |
| `DialogContext.Provider` | `app/dialog.tsx:137` | Contexto de cierre/pending/dirty del mismo motor Dialog. |
| `FooterContext.Provider` | `app/dialog.tsx:137` | Destino de portal de acciones del mismo Dialog. |
| `GroupIcon` | `app/scale-workspace.tsx:969`; `app/scale-workspace.tsx:981` | Iconos Lucide seleccionados en NAV_GROUP_ICONS; variante de contenido del disparador. |
| `Icon` | `app/announcement-banner.tsx:58`; `app/equipment-photo.tsx:19`; `app/inventory-workspace.tsx:661`; `app/notification-center.tsx:12`; `app/scale-workspace.tsx:998`; `app/superadmin/sidebar.tsx:22`; `app/theme-toggle.tsx:37` | Mapa de iconos por estado/categoría/módulo/tema en cada consumidor; no siete implementaciones de botón. |
| `Mark` | `app/google-sign-in.tsx:28` | marks[provider] elige GoogleMark/MicrosoftMark/AppleMark dentro de ProviderSignIn; marca SVG, no tres botones distintos. |
| `OverlayContext.Provider` | `app/dialog.tsx:137`; `app/dialog.tsx:139` | Ancestría de overlays del mismo motor Dialog. |
| `PageChromeContext.Provider` | `app/scale-workspace.tsx:1071` | Infraestructura de composición de encabezado/lista. |
| `PageTitleContext.Provider` | `app/scale-workspace.tsx:1070`; `app/scale-workspace.tsx:1116`; `app/ui-v2.tsx:521` | Infraestructura de composición del título; no encabezado adicional que migrar. |
| `Root` | `app/blog-templates.tsx:83` | BlogListTemplate elige section/main según embedded; semántica de documento. |
| `Section` | `app/superadmin/page.tsx:719` | current.component de PLATFORM_SECTIONS en superadmin/page; las 12 entradas concretas ya se inventarían desde superadmin/sections.tsx. |
| `Tag` | `app/blog-templates.tsx:42` | Meta del blog elige p/div; semántica, no componente duplicado. |

## Exportados sin JSX consumidor directo en app

No se declara código muerto: PhotoViewer tiene pruebas de interacciones; SerialTexto tiene pruebas de formato; BlogArticleTemplate tiene pruebas de plantillas. CommentComposer de comment-composer.tsx también conserva una prueba de transparencia y fixture. El modelo activo de comentarios se importa desde commenting.tsx (2 sitios/2 archivos); no confundir ambos exports por el nombre. Verificar compatibilidad y herramientas antes de retirar exports. GoogleMark/MicrosoftMark/AppleMark se seleccionan mediante el mapa marks ya descrito, y las rutas/layouts son montadas por Next.

| Export | Definición | JSX directo app |
| --- | --- | ---: |
| `BlogArticleTemplate` | `app/blog-templates.tsx:144` | 0 |
| `CommentComposer` | `app/comment-composer.tsx:13` | 0 |
| `SerialTexto` | `app/list-format.tsx:37` | 0 |
| `PhotoViewer` | `app/photo-viewer.tsx:19` | 0 |

## Cobertura de archivos TSX

Lista exhaustiva de los 190 archivos TSX del snapshot. Los componentes montados por Next quedan cubiertos aunque no tengan JSX consumidor local.

- `app/(workspace)/[section]/[view]/page.tsx`
- `app/(workspace)/[section]/page.tsx`
- `app/(workspace)/layout.tsx`
- `app/(workspace)/page.tsx`
- `app/acceso-pendiente/page.tsx`
- `app/access-layout.tsx`
- `app/account-create-dialog.tsx`
- `app/account-security.tsx`
- `app/actor-identity.tsx`
- `app/announcement-banner.tsx`
- `app/archive-controls.tsx`
- `app/assigned-people.tsx`
- `app/assignee-picker.tsx`
- `app/auth-brand-panel.tsx`
- `app/blog/[section]/[slug]/page.tsx`
- `app/blog/[section]/page.tsx`
- `app/blog/layout.tsx`
- `app/blog-templates.tsx`
- `app/bulk-selection.tsx`
- `app/client-assign-plan.tsx`
- `app/client-commercial-lifecycle.tsx`
- `app/client-commercial-summary.tsx`
- `app/client-directory-toolbar.tsx`
- `app/client-editor.tsx`
- `app/client-error-reporter.tsx`
- `app/client-identity.tsx`
- `app/client-links.tsx`
- `app/client-reporting.tsx`
- `app/client-ruc.tsx`
- `app/cliente/entregas/[id]/page.tsx`
- `app/cliente/entregas/page.tsx`
- `app/cliente/ingresar/page.tsx`
- `app/cliente/invitacion/page.tsx`
- `app/cliente/layout.tsx`
- `app/cliente/recuperar/page.tsx`
- `app/comment-composer.tsx`
- `app/commenting.tsx`
- `app/company-legal-profile.tsx`
- `app/company-settings.tsx`
- `app/contracts-workspace.tsx`
- `app/control-center.tsx`
- `app/currency-provider.tsx`
- `app/daily-controls.tsx`
- `app/deletion-danger-zone.tsx`
- `app/demo/page.tsx`
- `app/demo-toolbar.tsx`
- `app/desktop-sidebar.tsx`
- `app/dialog.tsx`
- `app/drive-link.tsx`
- `app/drive-links.tsx`
- `app/due-date.tsx`
- `app/email-field.tsx`
- `app/employee-tasks.tsx`
- `app/entity-picker.tsx`
- `app/equipment-photo.tsx`
- `app/error.tsx`
- `app/field-label.tsx`
- `app/finance-balance.tsx`
- `app/finance-clients.tsx`
- `app/finance-collections.tsx`
- `app/finance-history.tsx`
- `app/finance-personnel.tsx`
- `app/finance-receipt-editor.tsx`
- `app/financial-forecast.tsx`
- `app/foto-perfil.tsx`
- `app/global-error.tsx`
- `app/google-sign-in.tsx`
- `app/growth-dashboard.tsx`
- `app/ia-carga-button.tsx`
- `app/ia-carga.tsx`
- `app/inventory-label.tsx`
- `app/inventory-workspace.tsx`
- `app/invitacion/page.tsx`
- `app/invite-links.tsx`
- `app/layout.tsx`
- `app/list-format.tsx`
- `app/live-visitors.tsx`
- `app/loading-screen.tsx`
- `app/maintenance-gate.tsx`
- `app/manual.tsx`
- `app/mobile-navigation.tsx`
- `app/my-data.tsx`
- `app/my-profile.tsx`
- `app/not-found.tsx`
- `app/notification-center.tsx`
- `app/notification-inbox.tsx`
- `app/notifications-ui.tsx`
- `app/operations.tsx`
- `app/password-field.tsx`
- `app/password-panel.tsx`
- `app/permissions-matrix.tsx`
- `app/person-container.tsx`
- `app/person-photo.tsx`
- `app/person-sheet.tsx`
- `app/phone-field.tsx`
- `app/photo-cropper.tsx`
- `app/photo-viewer.tsx`
- `app/plan-comparison.tsx`
- `app/presence.tsx`
- `app/privacidad/page.tsx`
- `app/privacy-panel.tsx`
- `app/production-board.tsx`
- `app/productivity-ui.tsx`
- `app/profile-controls.tsx`
- `app/profile-photo.tsx`
- `app/project-card.tsx`
- `app/quote-composer.tsx`
- `app/record-assignees.tsx`
- `app/recuperar-cuenta/page.tsx`
- `app/registro/page.tsx`
- `app/report-problem.tsx`
- `app/reports-print.tsx`
- `app/reports-workspace.tsx`
- `app/save-actions.tsx`
- `app/scale-workspace.tsx`
- `app/search-field.tsx`
- `app/sections/actividad.tsx`
- `app/sections/clientes.tsx`
- `app/sections/comisiones.tsx`
- `app/sections/configuracion.tsx`
- `app/sections/equipo.tsx`
- `app/sections/estudio.tsx`
- `app/sections/finanzas.tsx`
- `app/sections/historial.tsx`
- `app/sections/informes.tsx`
- `app/sections/inventario.tsx`
- `app/sections/invitaciones.tsx`
- `app/sections/metricas.tsx`
- `app/sections/mora.tsx`
- `app/sections/papelera.tsx`
- `app/sections/permisos.tsx`
- `app/sections/pipeline.tsx`
- `app/sections/planes.tsx`
- `app/sections/preferencias.tsx`
- `app/sections/presupuestos.tsx`
- `app/sections/prevision.tsx`
- `app/sections/produccion.tsx`
- `app/sections/proyectos.tsx`
- `app/sections/resumen.tsx`
- `app/sections/sin-acceso.tsx`
- `app/status/page.tsx`
- `app/studio-workspace.tsx`
- `app/subscription-panel.tsx`
- `app/suite.tsx`
- `app/superadmin/access.tsx`
- `app/superadmin/agencies.tsx`
- `app/superadmin/announcements.tsx`
- `app/superadmin/apply-coupon-dialog.tsx`
- `app/superadmin/audit.tsx`
- `app/superadmin/catalog.tsx`
- `app/superadmin/confirm.tsx`
- `app/superadmin/edge-menu.tsx`
- `app/superadmin/errors.tsx`
- `app/superadmin/inquiries.tsx`
- `app/superadmin/maintenance.tsx`
- `app/superadmin/metric-kpi.tsx`
- `app/superadmin/metrics.tsx`
- `app/superadmin/model.tsx`
- `app/superadmin/overview.tsx`
- `app/superadmin/page.tsx`
- `app/superadmin/period-chips.tsx`
- `app/superadmin/reports.tsx`
- `app/superadmin/sections.tsx`
- `app/superadmin/sidebar.tsx`
- `app/superadmin/states.tsx`
- `app/superadmin/subscription-dialog.tsx`
- `app/superadmin/traffic.tsx`
- `app/superadmin/usage-charts.tsx`
- `app/superadmin/usage.tsx`
- `app/tab-scroller.tsx`
- `app/team-access.tsx`
- `app/team-person-sheet.tsx`
- `app/team-workspace.tsx`
- `app/text-field.tsx`
- `app/theme-toggle.tsx`
- `app/ui-v2.tsx`
- `app/urgency.tsx`
- `app/verificar-correo/page.tsx`
- `app/version-notice.tsx`
- `app/weekly-automatic.tsx`
- `app/whatsapp-button.tsx`
- `app/work-checklist.tsx`
- `app/work-history.tsx`
- `app/work-order-links.tsx`
- `app/workspace-brand.tsx`
- `app/workspace-footer.tsx`
- `app/workspace-forms.tsx`
- `app/workspace-frame.tsx`
- `app/workspace-guide.tsx`
- `app/workspace-search.tsx`
