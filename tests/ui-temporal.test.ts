import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateCivilDate,validateLocalDateTime,validateMonth,validateTime} from '../app/ui/temporal-value';

test('civil calendar validates days without timezone, rollover or partial coercion',()=>{
 for(const value of ['2024-02-29','2000-02-29','2026-01-31','0001-01-01','9999-12-31'])assert.equal(validateCivilDate(value),true,value);
 for(const value of ['1900-02-29','2026-02-29','2026-04-31','2026-13-01','2026-00-01','2026-01-00','0000-01-01','2026-1-01','2026-01-','2026-01-01Z',' 2026-01-01'])assert.equal(validateCivilDate(value),false,value);
});
test('time uses the application 24 hour HH:mm contract, including midnight',()=>{
 for(const value of ['00:00','12:00','23:59'])assert.equal(validateTime(value),true,value);
 for(const value of ['24:00','12:60','9:30','09:','09:30:00','9 am',''])assert.equal(validateTime(value),false,value);
});
test('local datetimes and months do not accept absolute instants or impossible dates',()=>{
 assert.equal(validateLocalDateTime('2024-02-29T23:59'),true);
 for(const value of ['2026-02-29T10:00','2026-01-01T24:00','2026-01-01T10:00Z','2026-01-01T10:00-03:00'])assert.equal(validateLocalDateTime(value),false,value);
 assert.equal(validateMonth('2026-10'),true);
 for(const value of ['2026-13','2026-1','0000-01','2026-10-01'])assert.equal(validateMonth(value),false,value);
});
