import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {expenseCurrencyCases} from './test-expense-currency-cases.mjs';
const pg=new PGlite(),query=(sql,args=[])=>pg.query(sql,args);
try{
 await pg.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 for(const file of migrationOrder)if(file!=='20261017_expense_currency_precision.sql')await pg.exec(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 await expenseCurrencyCases({query,exec:sql=>pg.exec(sql),connect:async()=>({query,release(){}})});
}finally{await pg.close();}
