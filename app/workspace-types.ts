import type {Currency} from './currencies';
import type {SubscriptionState} from './subscription-panel';
import type {AssignedPerson} from './assigned-people';
import type {ProjectAssignee} from './project-card';
import type {Status} from './production-board';

export type Client = {
  lifecycle_status?:string;
  has_recurring_price?:boolean;
  logo_url?:string|null;
  color_key?:string;
  tax_id?:string|null;
  legal_name?:string|null;
  created_at?:string;
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
};
export type Project = {
  urgency?:number|null;
  assignees?:ProjectAssignee[];
  start_date?:string|null;
  due_date?:string|null;
  active?:boolean;
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  drive_url: string | null;
  status: string;
  work_order_count: number;
};
export type WorkOrder = {
  urgency?:number|null;
  assignees?:AssignedPerson[];
  effective_assignees?:AssignedPerson[];
  assignee_source?:'direct'|'project'|null;
  assigned_user_id?:string|null;
  assigned_user_ids?:string[];
  checklist_total?:number;
  checklist_completed?:number;
  updated_at?:string;
  client_logo_url?:string|null;
  client_color_key?:string;
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  client_name: string;
  status: Status;
  description: string | null;
  drive_url: string | null;
  due_date?: string | null;
  due_time?: string | null;
};

export type Account = {
  id: string;
  name: string;
  account_type: "bank" | "cash" | "digital" | "investment";
  currency: Currency;
  balance: string;
  active: boolean;
  institution: string | null;
  account_number: string | null;
  holder_name: string | null;
  custodian_user_id: string | null;
  custodian_email?: string | null;
};
export type PaymentRecord = {
  id: string;
  invoice_number: string;
  client_name: string;
  account_name: string;
  account_type: string;
  currency: Currency;
  amount: string;
  received_on: string;
  reference: string | null;
  received_by_email: string | null;
  actor_name?:string; actor_photo_url?:string; actor_verified?:boolean;
  reversal_id?: string | null;
  reversal_reason?: string | null;
  /** Fecha real de la reversión informada por el API. */
  reversed_on?: string | null;
};
export type Invoice = {
  id: string;
  number: string;
  client_id: string;
  client_name: string;
  status: string;
  currency: Currency;
  total: string;
  paid_amount: string;
  due_on: string | null;
  /** Emisión de la factura y notas libres del registro. */
  issued_on?: string | null;
  notes?: string | null;
};
export type Member = { id: string; email: string; role: string; active?:boolean; created_at: string };
export type Budget = {
  id: string;
  number: string;
  title: string;
  client_name: string;
  currency: Currency;
  status: string;
  subtotal: string;
  total: string;
  item_count: number;
  valid_until: string | null;
};
export type AccountTransfer = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_account_name: string;
  to_account_name: string;
  amount: string;
  received_amount?: string;
  from_currency?: string;
  to_currency?: string;
  transferred_on: string;
  reference: string | null;
  /** Notas, cotización aplicada y fecha de alta informadas por el API. */
  notes?: string | null;
  exchange_rate?: string | number | null;
  created_at?: string;
  created_by_email: string | null;
  actor_name?:string; actor_photo_url?:string; actor_verified?:boolean;
};
export type MetricEvent = { name: string; event_date: string; count: number };
export type ClientPaymentStatus = {
  client_id: string;
  client_name: string;
  currency: Currency | null;
  outstanding_amount: string;
  next_due_on: string | null;
  days_overdue: number;
  payment_status: "up_to_date" | "due_soon" | "late" | "severe";
  invoice_count: number;
  has_invoice: boolean;
};
export type User = {
  subscription?:SubscriptionState;
  id:string;
  organization_id:string;
  full_name?:string|null;
  photo_url?:string|null;
  email: string;
  role: string;
  organization_name: string;
  organization_slug: string;
  demo_owner_user_id?:string|null;
  default_currency?:Currency;
  platform_role?:string|null;
};
export type Summary = {
  active_clients: number;
  active_projects: number;
  open_orders: number;
  unanswered_budgets: number | null;
  unverified_inventory: number | null;
  upcoming_deliveries: number | null;
};

export type ModalKind =
  | "client"
  | "project"
  | "order"
  | "budget"
  | "account"
  | "invoice"
  | "payment"
  | "transfer"
  | null;
