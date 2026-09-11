import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assignedToUser,calendarWeek,filterProductionOrders,isDateOnly,localCalendarDay,productionDueDay} from '../app/production-filter';

test('strict civil dates reject timestamps, normalization and invalid leap dates',()=>{
 for(const value of ['2024-02-29','2000-02-29','2026-09-11','0001-01-01'])assert(isDateOnly(value),value);
 for(const value of [null,undefined,'','2026-9-11','2026-09-31','2026-02-29','1900-02-29','0000-01-01','2026-00-11','2026-13-01','2026-09-00',' 2026-09-11','2026-09-11T00:00:00Z'])assert(!isDateOnly(value),String(value));
 assert.equal(calendarWeek('2026-02-30'),null);
});
test('API civil-date and valid ISO serialization preserve their calendar prefix without shifting zones',()=>{
 for(const value of ['2026-09-07','2026-09-07T00:00:00.000Z','2026-09-07T00:00:00+14:00','2026-09-07T23:59:59-12:00'])assert.equal(productionDueDay(value),'2026-09-07');
 for(const value of ['2026-09-07garbage','2026-09-07Tgarbage','2026-02-30T00:00:00Z','2026-09-07T24:00:00Z','2026-09-07T23:60:00Z','2026-09-07T00:00:60Z','2026-09-07T00:00:00+24:00','2026-09-07T00:00:00+01:60','2026-09-07T00:00:00','2026-09-07T00:00:00Zjunk',null])assert.equal(productionDueDay(value),null,String(value));
});
test('Monday–Sunday ranges cross months, leap days, years and DST without elapsed-hour math',()=>{
 for(const day of ['2026-09-07','2026-09-11','2026-09-13'])assert.deepEqual(calendarWeek(day),{start:'2026-09-07',end:'2026-09-13'});
 assert.deepEqual(calendarWeek('2026-09-14'),{start:'2026-09-14',end:'2026-09-20'});
 assert.deepEqual(calendarWeek('2027-01-01'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(calendarWeek('2024-02-29'),{start:'2024-02-26',end:'2024-03-03'});
 assert.deepEqual(calendarWeek('2026-03-08'),{start:'2026-03-02',end:'2026-03-08'});
 assert.deepEqual(calendarWeek('2026-11-01'),{start:'2026-10-26',end:'2026-11-01'});
 // Constructor components deliberately represent the device's calendar.
 assert.equal(localCalendarDay(new Date(2026,8,13,23,59)), '2026-09-13');
 assert.equal(localCalendarDay(new Date(2026,8,14,0,0)), '2026-09-14');
});
test('mine uses explicit primary/multiple IDs and never names or missing identity',()=>{
 const base={project_id:'1'};
 assert(assignedToUser({...base,assigned_user_id:10},'10'));
 assert(assignedToUser({...base,assigned_user_id:'11',assigned_user_ids:['10']},'10'));
 assert(assignedToUser({...base,assigned_user_ids:[10]},'10'));
 assert(!assignedToUser({...base,assigned_user_id:null},''));
 assert(!assignedToUser({...base,assigned_user_id:''},''));
 assert(!assignedToUser(base,'10'));
 assert(!assignedToUser({...base,assigned_user_ids:['11']},'10'));
 const named={...base,assigned_user_name:'10',client_name:'10'};
 assert(!assignedToUser(named,'10'));
});
test('saved client/mine/week intersect, include all statuses and never mutate input',()=>{
 const projects=[{id:1,client_id:1},{id:2,client_id:2}];
 const orders=[
  {id:'monday',project_id:1,assigned_user_id:'10',due_date:'2026-09-07',status:'published'},
  {id:'sunday',project_id:1,assigned_user_ids:[10],due_date:'2026-09-13',status:'approved'},
  {id:'other-user',project_id:1,assigned_user_id:'11',due_date:'2026-09-10'},
  {id:'other-client',project_id:2,assigned_user_id:'10',due_date:'2026-09-10'},
  {id:'overdue',project_id:1,assigned_user_id:'10',due_date:'2026-09-06'},
  {id:'next-week',project_id:1,assigned_user_id:'10',due_date:'2026-09-14'},
  {id:'undated',project_id:1,assigned_user_id:'10',due_date:null},
  {id:'timestamp',project_id:1,assigned_user_id:'10',due_date:'2026-09-10T00:00:00Z'},
 ];
 const before=JSON.stringify(orders),options={mine:true,week:true,userId:'10',today:'2026-09-11'};
 assert.deepEqual(filterProductionOrders(orders,projects,'1',options).map(o=>o.id),['monday','sunday','timestamp']);
 assert.deepEqual(filterProductionOrders(orders,projects,'',options).map(o=>o.id),['monday','sunday','other-client','timestamp']);
 assert.deepEqual(filterProductionOrders(orders,projects,'1',{...options,userId:''}),[]);
 assert.deepEqual(filterProductionOrders(orders,projects,'1',{...options,today:'invalid'}),[]);
 assert.deepEqual(filterProductionOrders(orders,projects,'3',options),[]);
 assert.equal(filterProductionOrders(orders,projects,''),orders);
 assert.equal(JSON.stringify(orders),before);
});
