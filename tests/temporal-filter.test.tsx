import React,{useEffect} from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
import {useTemporalFilter} from '../app/use-temporal-filter';
import {validateCivilDate,validateMonth} from '../app/ui/temporal-value';
Object.assign(globalThis,{React});

test('raw edits survive rerenders while query value remains last valid; navigation resets draft explicitly',()=>{
 let field!:ReturnType<typeof useTemporalFilter<string>>;const requests:string[]=[];
 function Consumer({max}:{max:string}){field=useTemporalFilter('2026-09',raw=>validateMonth(raw)&&raw>='1900-01'&&raw<=max?raw:null);useEffect(()=>{requests.push(field[0]);},[field[0]]);return <input value={field[2]} onChange={event=>field[3](event.target.value)}/>;}
 let renderer!:ReturnType<typeof create>;act(()=>{renderer=create(<Consumer max="2026-10"/>);});
 for(const raw of ['', '2','2026-','2026-0','2026-13','1899-12','9998-12']){act(()=>field[3](raw));assert.equal(renderer.root.findByType('input').props.value,raw);assert.equal(field[0],'2026-09');assert.deepEqual(requests,['2026-09']);}
 act(()=>field[3]('2026-10'));assert.deepEqual(requests,['2026-09','2026-10']);
 act(()=>field[3]('2026-'));act(()=>renderer.update(<Consumer max="2026-11"/>));assert.equal(field[2],'2026-');
 act(()=>field[3]('2026-11'));assert.equal(field[0],'2026-11','latest caller policy is used');
 act(()=>field[3]('20'));act(()=>field[1]('2026-09'));assert.equal(field[2],'2026-09','explicit navigation synchronizes raw');act(()=>renderer.unmount());
});

test('an optional date range applies atomically only when both civil values and ordering are valid',()=>{
 type Range={from:string;to:string};let field!:ReturnType<typeof useTemporalFilter<Range>>;const requests:Range[]=[];
 function Consumer(){field=useTemporalFilter({from:'2026-01-01',to:'2026-01-31'},range=>(!range.from||validateCivilDate(range.from))&&(!range.to||validateCivilDate(range.to))&&(!range.from||!range.to||range.from<=range.to)?range:null);useEffect(()=>{requests.push(field[0]);},[field[0]]);return null;}
 let renderer!:ReturnType<typeof create>;act(()=>{renderer=create(<Consumer/>);});
 for(const from of ['2026-','2026-02-30','2026-03-01']){act(()=>field[3](raw=>({...raw,from})));assert.equal(field[2].from,from);assert.equal(requests.length,1);}
 act(()=>field[3](raw=>({...raw,to:'2026-03-31'})));assert.deepEqual(requests.at(-1),{from:'2026-03-01',to:'2026-03-31'});
 act(()=>field[3](raw=>({...raw,from:''})));assert.deepEqual(requests.at(-1),{from:'',to:'2026-03-31'},'empty optional date removes filter');act(()=>renderer.unmount());
});
