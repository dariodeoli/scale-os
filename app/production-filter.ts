type ProjectClient = { id: string | number; client_id: string | number };
type ProductionOrder = {project_id:string|number;assigned_user_id?:string|number|null;assigned_user_ids?:(string|number)[];due_date?:string|null};

export function isDateOnly(value:unknown):value is string {
 if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 const leap=year%4===0 && (year%100!==0 || year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return year>=1 && month>=1 && month<=12 && day>=1 && day<=days[month-1];
}
/** Work-order DATE values may arrive as a civil date or as pg/JSON's ISO
 * serialization. Preserve the API's calendar prefix; never shift it to the
 * device timezone. Validate the entire serialization before using its prefix. */
export function productionDueDay(value:unknown):string|null {
 if(isDateOnly(value))return value;
 if(typeof value!=='string')return null;
 const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
 if(!match || !isDateOnly(match[1]) || Number(match[2])>23 || Number(match[3])>59 || Number(match[4])>59
  || Number(match[6]||0)>23 || Number(match[7]||0)>59 || !Number.isFinite(Date.parse(value)))return null;
 return match[1];
}
export function localCalendarDay(now:Date):string {
 return `${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
/** Civil-date arithmetic in UTC avoids DST and elapsed-hour assumptions. The
 * input day comes from the device's local calendar, not from UTC or Asunción. */
export function calendarWeek(day:string):{start:string;end:string}|null {
 if(!isDateOnly(day))return null;
 const date=new Date(`${day}T12:00:00Z`);
 date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 const start=date.toISOString().slice(0,10);
 date.setUTCDate(date.getUTCDate()+6);
 return {start,end:date.toISOString().slice(0,10)};
}
export function assignedToUser(order:ProductionOrder,userId:string):boolean {
 if(!userId.trim())return false;
 return (order.assigned_user_id!=null && String(order.assigned_user_id)===userId)
  || !!order.assigned_user_ids?.some(id=>id!=null && String(id)===userId);
}

/** Filter by stable IDs, never by client names (which can be duplicated). */
export function filterProductionOrders<T extends ProductionOrder>(
  orders: T[],
  projects: ProjectClient[],
  clientId: string,
  options:{mine?:boolean;week?:boolean;userId?:string;today?:string}={},
): T[] {
  if (!clientId && !options.mine && !options.week) return orders;
  const projectIds = new Set(
    projects.filter(project => String(project.client_id) === clientId).map(project => String(project.id)),
  );
  const week=options.week?calendarWeek(options.today??localCalendarDay(new Date())):null;
  return orders.filter(order => {
   const due=options.week?productionDueDay(order.due_date):null;
   return (!clientId || projectIds.has(String(order.project_id)))
    && (!options.mine || assignedToUser(order,options.userId||''))
    && (!options.week || (week!==null && due!==null && due>=week.start && due<=week.end));
  });
}
