/* GMIN Instruções — interpretação local, conservadora e auditável de texto livre. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.GMINParser=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const number=s=>Number(String(s).replace(',','.'));
const PN=/\b(?:[A-Z]{1,5}\d[\dA-Z-]{3,}|[A-Z]{1,5}-\d{2,}(?:-\d{2,})+|\d{1,3}[A-Z]{1,3}-?\d{3,7}|\d{1,6}-\d{3,6}(?:-\d+)?|\d{7,15})\b/gi;
const roles=[
  ['Mecânico',/\bmec(?:anicos?|anicas?|s)?\b|\bmechanics?\b/iu],
  ['Eletricista',/\beletricistas?\b|\belet(?:ric)?\b/iu],
  ['Lubrificador',/\blubrificadores?\b|\blub(?:r)?\b/iu],
  ['Soldador',/\bsoldadores?\b|\bsold(?:a)?\b/iu],
  ['Borracheiro',/\bborracheiros?\b|\bpneus?\s*(?:tech|t[eé]cnico)?\b/iu],
  ['Instrumentista',/\binstrumentistas?\b/iu],
  ['Técnico',/\btecnicos?\b/iu],
  ['Caldeireiro',/\bcaldeireiros?\b/iu],
  ['Operador',/\boperadores?\b/iu]
];
const qtyUnits='(?:unidades?|unds?|unid\\.?|und\\.?|un\\.?|pcs?\\.?|pe[cç]as?|p[cç]s?\\.?|jogos?|kits?|pares?)';
const qtyEnd=new RegExp('(?:^|\\s|[(/|;,])(?:q(?:uanti)?d(?:ade)?\\.?\\s*[:=]?\\s*)?(\\d{1,4})(?:\\s*'+qtyUnits+')?\\s*(?:$|[)/|;,])','iu');
const quantityLoose=new RegExp('(?:q(?:uanti)?d(?:ade)?\\.?\\s*[:=]?\\s*)(\\d{1,4})|(?:^|\\s)(\\d{1,4})\\s*'+qtyUnits+'\\b|\\b[x×]\\s*(\\d{1,4})\\b|\\b(\\d{1,4})\\s*[x×]\\b','iu');
const timeRE=/(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?\.?|h\b|minutos?|min\.?)/iu;
const separator=/\s+-\s+|\s*[|;,/]\s*|\t+/u;
const headers=[
 ['parts',/^(?:(?:lista\s*de\s*)?materiais?|pe[cç]as?|sobressalentes?|part\s*numbers?|pns?)\s*(?:previst[oa]s?|necess[aá]ri[oa]s?|requerid[oa]s?)?\s*:?\s*$/iu],
 ['labor',/^(?:m[aã]o[\s-]*de[\s-]*obra|equipe|recursos?\s*humanos?|hh\s*previst[oa]s?)\s*:?\s*$/iu],
 ['work',/^(?:atividades?\s*(?:recomendad[oa]s?|necess[aá]ri[oa]s?)|servi[cç]os?\s*(?:a\s*executar|previst[oa]s?)?|escopo|instru[cç][aã]o\s*de\s*trabalho|condi[cç][aã]o\s*encontrada|sintomas?|falha\s*observada|observa[cç][oõ]es?)\s*:?\s*$/iu]
];
function possiblePNs(s) {
 const arr=[...s.matchAll(PN)].map(m=>m[0]).filter(x=>!/^20\d{6,}$/.test(x));return [...new Set(arr)];
}
function isLaborContext(line){
 const n=norm(line);
 return /ma[oã][-\s]*de[-\s]*obra|equipe|profissionais?|mec|eletric|lubr|sold|borracheir|instrumentist|caldeireir|tecnic|operador/.test(n);
}
function parseLabor(line,section) {
 if(!isLaborContext(line)&&section!=='labor')return [];
 let raw=line.replace(/^\s*(?:m[aã]o[\s-]*de[\s-]*obra|equipe|recursos?\s*humanos?)\s*:\s*/iu,'');
 const entries=[];
 // Separators between multiple professionals must not split "2 mecânicos / 3 horas".
 const chunks=raw.split(/\s*(?:\+|&|\be\b)\s*(?=\d+\s*(?:mec|eletric|lubr|sold|borracheir|tecnic|instrument|caldeireir|operador))/iu);
 for(const chunk of chunks){
  for(const [role,re] of roles) {
   const match=re.exec(chunk);if(!match)continue;
   const before=chunk.slice(0,match.index);
   const after=chunk.slice(match.index+match[0].length);
   const count=(before.match(/(?:^|[^\d])(\d{1,3})\s*(?:x\s*)?$/u)||after.match(/^\s*[:=(]?\s*(\d{1,3})\b/u)||[])[1];
   const duration=(after.match(timeRE)||before.match(timeRE)||[])[1];
   if(count) entries.push({role,count:Number(count),hours:duration?number(duration):null,source:line.trim(),confidence:duration?'alta':'media'});
  }
 }
 // "2 mecânicos / 1 hora" -> 1 hour; "Mecânicos: 2" -> duration undefined.
 return entries.filter(e=>Number.isInteger(e.count)&&e.count>0&&e.count<=100);
}
function standaloneDuration(s){
 const line=norm(s);
 if(!/^(?:tempo|duracao|prazo|intervencao|tempo\s+total|tempo\s+estimado|duracao\s+total)/.test(line))return null;
 const m=s.match(timeRE);if(!m)return null;
 let v=number(m[1]);if(/\bmin(?:uto)?s?\b/i.test(m[0]))v/=60;
 return v>0&&v<10000?v:null;
}
function readQty(text){
 const v=text.trim();let m;
 m=v.match(new RegExp('^(?:q(?:uanti)?d(?:ade)?\\.?\\s*[:=]?\\s*)?(\\d{1,4})\\s*'+qtyUnits+'?\\s*$','iu'));
 if(m)return Number(m[1]);
 m=v.match(/^(?:q(?:uanti)?d(?:ade)?\.?\s*[:=]?\s*)(\d{1,4})\s*$/iu);
 if(m)return Number(m[1]);
 m=v.match(/^(\d{1,4})\s*(?:[x×])\s*$/iu);if(m)return Number(m[1]);
 m=v.match(/^[x×]\s*(\d{1,4})$/iu);if(m)return Number(m[1]);
 m=v.match(/^(\d{1,4})$/);return m?Number(m[1]):null;
}
function parsePart(line,section){
 if(isLaborContext(line)&&/\b(?:horas?|hrs?|h\b)\b/i.test(line))return null;
 const pins=possiblePNs(line);
 const unknown=/\b(?:pn|part\s*number)\s*a\s*confirmar\b/iu.test(line);
 if(pins.length!==1 && !unknown)return null;
 if(pins.length>1)return null;
 const pn=pins[0]||'PN A CONFIRMAR';
 const at=pins[0]?line.toUpperCase().indexOf(pn.toUpperCase()):line.search(/\b(?:pn|part\s*number)\s*a\s*confirmar\b/iu);
 const stripped=line.slice(0,at)+line.slice(at+pn.length);
 const segments=stripped.split(separator).map(s=>s.trim()).filter(Boolean);
 let quantity=null, descParts=[];
 for(const part of segments) {
  const q=readQty(part);
  if(q!==null){quantity=q;continue;}
  let m=part.match(new RegExp('^(\\d{1,4})\\s*'+qtyUnits+'?\\s+(.+)$','iu'));
  if(m && !/\b(?:horas?|hrs?|minutos?)\b/iu.test(m[2])){quantity=Number(m[1]);descParts.push(m[2]);continue;}
  m=part.match(new RegExp('^(.+?)\\s+(?:[-–]?\\s*)?(\\d{1,4})\\s*'+qtyUnits+'\\s*$','iu'));
  if(m){quantity=Number(m[2]);descParts.push(m[1]);continue;}
  m=part.match(/^(.+?)\s+(?:qtd|quantidade)\s*[:=]?\s*(\d{1,4})$/iu);
  if(m){quantity=Number(m[2]);descParts.push(m[1]);continue;}
  descParts.push(part);
 }
 // Handle "2 arruelas / 123-1234" and "123-1234 / arruelas (2)".
 let description=descParts.join(' ').replace(/^(?:[-–:,\/|\s]+)|(?:[-–:,\/|\s]+)$/g,'').trim();
 const rem=description.match(new RegExp('^(.+?)\\s*\\((\\d{1,4})\\s*'+qtyUnits+'?\\)$','iu'));
 if(rem){description=rem[1];quantity=Number(rem[2]);}
 if((description=== '' || quantity===null) && !unknown && section!=='parts')return null;
 const confidence=quantity!==null&&description?'alta':'baixa';
 return {pn,description,quantity:quantity??'',plannerComment:'',mechanicComment:'',min:'',max:'',mrp:'',source:line.trim(),confidence};
}
function parse(text){
 const labor=[],parts=[],work=[],uncertain=[],warnings=[];
 let duration=null,section='work',priorSection='work';
 let recognized=0;
 for(const raw of String(text||'').replace(/\r\n?/g,'\n').split('\n')){
  const line=raw.trim();
  if(!line){if(work.length&&work[work.length-1]!=='')work.push('');continue;}
  let header=headers.find(h=>h[1].test(line));
  if(header){priorSection=section;section=header[0];continue;}
  const explicitDuration=standaloneDuration(line);
  if(explicitDuration!==null){duration=explicitDuration;recognized++;continue;}
  let worker=parseLabor(line,section);
  if(worker.length){labor.push(...worker);recognized++;continue;}
  let item=parsePart(line,section);
  if(item){
   parts.push(item);recognized++;
   if(item.confidence!=='alta')uncertain.push({kind:'part',line,reason:'Quantidade ou descrição ausente: conferir.'});
   continue;
  }
  if(section==='parts'||section==='labor'){
   uncertain.push({kind:section,line,reason:'Formato não reconhecido automaticamente; mantido na instrução.'});
  }
  work.push(line);
 }
 const totalHH=labor.reduce((sum,x)=>sum+(x.hours!==null?x.count*x.hours:0),0);
 if(labor.some(x=>x.hours===null))warnings.push('Algumas especialidades não têm duração informada: HH parcial.');
 if(duration===null&&labor.some(x=>x.hours!==null))warnings.push('Duração total não informada. Não foi inferida pela soma das HH.');
 if(uncertain.length)warnings.push(uncertain.length+' linha(s) sem classificação segura foram preservadas na instrução.');
 return {labor,parts,duration,work:work.join('\n').trim(),uncertain,warnings,totalHH,recognized,raw:String(text||'')};
}
return {parse,parseLabor,parsePart,standaloneDuration,possiblePNs};
});