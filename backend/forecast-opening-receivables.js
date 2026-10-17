// Optional on pre-migration fixtures; registered production startup migrations
// create this canonical view before marking the API ready.
export async function openingReceivableForecast(db, organizationId, month, months) {
 const result={month,months,records:[],undated_records:[]};
 const schema=(await db.query("select to_regclass('agency_opening_receivable_balances') as relation")).rows[0];
 if(!schema?.relation)return result;
 result.records=(await db.query(`select to_char(expected_on,'YYYY-MM') as month,currency,count(*)::int as receivable_count,sum(outstanding_amount)::text as amount from agency_opening_receivable_balances where organization_id=$1 and forecast_included=true and outstanding_amount>0 and expected_on>=$2::date and expected_on<($2::date+($3::int*interval '1 month'))::date group by to_char(expected_on,'YYYY-MM'),currency order by month,currency`,[organizationId,`${month}-01`,months])).rows;
 result.undated_records=(await db.query(`select currency,count(*)::int as receivable_count,sum(outstanding_amount)::text as amount from agency_opening_receivable_balances where organization_id=$1 and forecast_included=true and outstanding_amount>0 and expected_on is null group by currency order by currency`,[organizationId])).rows;
 return result;
}
