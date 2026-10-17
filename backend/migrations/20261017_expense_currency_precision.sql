-- Refs #234. Preserve all historical bigint digits while adding currency cents
-- to the existing amount column. The sole dependent application view is rebuilt
-- explicitly; never CASCADE/drop unknown consumers or touch planned expenses.
drop view agency_cash_movements;
alter table agency_expenses alter column amount type numeric(22,2) using amount::numeric(22,2);
create view agency_cash_movements as
 select p.organization_id,p.account_id,'payment'::text as movement_type,p.id as movement_id,p.received_on as booked_on,p.amount,coalesce(p.reference,'') as reference from agency_payments p
 union all select r.organization_id,p.account_id,'reversal',r.id,r.reversed_on,-p.amount,r.reason from agency_payment_reversals r join agency_payments p on p.id=r.payment_id
 union all select t.organization_id,t.from_account_id,'transfer_out',t.id,t.transferred_on,-t.amount,coalesce(t.reference,'') from account_transfers t
 union all select t.organization_id,t.to_account_id,'transfer_in',t.id,t.transferred_on,coalesce(t.received_amount,t.amount),coalesce(t.reference,'') from account_transfers t
 union all select p.organization_id,p.account_id,'payout',p.id,p.paid_on,-p.amount,p.reference from agency_payouts p
 union all select e.organization_id,e.account_id,'expense',e.id,e.paid_on,-e.amount,e.reference from agency_expenses e
 union all select r.organization_id,e.account_id,'expense_reversal',r.id,r.reversed_on,e.amount,r.reason from agency_expense_reversals r join agency_expenses e on e.id=r.expense_id
 union all select o.organization_id,o.account_id,'opening',o.id,o.opened_on,o.amount,o.reason from agency_account_openings o;
