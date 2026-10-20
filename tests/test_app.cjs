const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const parser=require('../js/parser.js');
const good=[
['2 arruelas / 123-1234','123-1234','arruelas',2],
['123-1234 - parafuso - 02und','123-1234','parafuso',2],
['123414151545 - porca - 2','123414151545','porca',2],
['BG01155919 | Válvula contrabalanço | 4','BG01155919','Válvula contrabalanço',4],
['4, Arruela lisa, BG01120998','BG01120998','Arruela lisa',4],
['026044-001 / Arruela Nord-Lock / 2 und','026044-001','Arruela Nord-Lock',2],
['1R1808 - Filtro do motor - 01 und','1R1808','Filtro do motor',1],
['1R-1808 / Filtro de óleo / 1','1R-1808','Filtro de óleo',1],
['TST-26-0229 | Kit manta térmica | 3','TST-26-0229','Kit manta térmica',3]
];
for(const [s,pn,description,quantity] of good){
 const x=parser.parsePart(s,'parts');assert.ok(x,'not parsed: '+s);assert.equal(x.pn,pn,s);assert.equal(x.description,description,s);assert.equal(x.quantity,quantity,s);
}
const workers=[['2 mecânicos / 1 hora','Mecânico',2,1],['Mecânicos: 2','Mecânico',2,null],['Mão-de-obra: 1 eletricista 2 horas','Eletricista',1,2],['1 soldador / 6h','Soldador',1,6],['2 lubrificadores / 3 horas','Lubrificador',2,3]];
for(const [s,role,count,hours] of workers){const x=parser.parseLabor(s,'labor');assert.equal(x.length,1,s);assert.equal(x[0].role,role);assert.equal(x[0].count,count);assert.equal(x[0].hours,hours);}
const parsed=parser.parse('CONDIÇÃO ENCONTRADA:\nVazamento na mangueira.\nMATERIAIS PREVISTOS:\n123-1234 / Arruela / 2 un\nMÃO DE OBRA:\n2 mecânicos / 4 horas\nTEMPO ESTIMADO: 4 horas\nATIVIDADE RECOMENDADA:\nSubstituir mangueira e verificar estanqueidade.');
assert.equal(parsed.parts.length,1);assert.equal(parsed.labor.length,1);assert.equal(parsed.duration,4);assert.match(parsed.work,/Vazamento/);assert.match(parsed.work,/Substituir/);assert.equal(parsed.totalHH,8);
assert.equal(parser.parse('2 mecânicos / 3 horas').duration,null,'duration is distinct from HH');
const state={kind:'gmin-work-instruction',title:'Substituir válvula',meta:{tag:'040-005',model:'CAT 777',order:'123456',notification:'10055',priority:'P1',duration:'2',author:'PCM',date:'2026-10-19'},failure:'Vazamento',work:'Substituir a válvula',safety:'Bloquear sistema',plannerNotes:'PR sigilosa 0001',labor:[{role:'Mecânico',count:2,hours:2}],parts:[{pn:'BG01155919',description:'Válvula',quantity:2,mrp:'V1',min:2,max:4,plannerComment:'Intervenção interna confidencial',mechanicComment:'Aplicar torque conforme manual'}],rows:[{type:'text',text:'Marcação próxima ao cilindro'},{type:'photo',photos:[]}]};
const context={atob,window:{GMIN_LOGO_DATA:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwsB9t8t1zYAAAAASUVORK5CYII='},TextEncoder,Blob,Uint8Array,ArrayBuffer,console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/zip.js'),'utf8'),context);
context.GMINZip=context.window.GMINZip;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/exports.js'),'utf8'),context);
const exp=context.window.GMINExport;
const mechanic=exp.reportHTML(state,{profile:'mechanic'}),planner=exp.reportHTML(state,{profile:'planner'});
assert.match(mechanic,/Aplicar torque/);assert.doesNotMatch(mechanic,/Intervenção interna confidencial/);assert.doesNotMatch(mechanic,/PR sigilosa/);assert.doesNotMatch(mechanic,/MRP/);
assert.match(planner,/Intervenção interna confidencial/);assert.match(planner,/PR sigilosa/);assert.match(planner,/MRP/);
(async()=>{
const docx=Buffer.from(await exp.makeDOCX(state,'planner').arrayBuffer());
assert.match(docx.toString('utf8'),/Intervenção interna confidencial/);
const mechDocx=Buffer.from(await exp.makeDOCX(state,'mechanic').arrayBuffer());
assert.doesNotMatch(mechDocx.toString('utf8'),/Intervenção interna confidencial/);
const xlsx=Buffer.from(await exp.makeXLSX(state).arrayBuffer());
assert.match(xlsx.toString('utf8'),/Intervenção interna confidencial/);
assert.match(xlsx.toString('utf8'),/Planejador/);
console.log('OK — parser, perfis, DOCX, XLSX e isolamento dos comentários.');
})().catch(e=>{console.error(e);process.exitCode=1;});
