// Preserve the real regression gate; expose bounded diagnostics through GitHub's API.
import {readFileSync} from 'node:fs';
const source=readFileSync(process.argv[2],'utf8'),lines=source.split(/\r?\n/);
const escape=value=>value.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
const command=lines.filter(line=>/^\[\d+\/\d+\]/.test(line)).at(-1)||'Regression command unavailable';
console.log(`::error title=Failing regression command::${escape(command.slice(0,2000))}`);
const tail=lines.slice(-65).map(line=>line.slice(0,1000)).join('\n').slice(-12000);
console.log(`::error title=Regression failure diagnostics::${escape(tail)}`);
