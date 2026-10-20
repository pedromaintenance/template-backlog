/* GMIN IT — parser contextual v2. Sem rede, IA ou inferência silenciosa. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.GMINParser=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const compact=s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim();
const value=s=>Number(String(s).replace(',','.'));
const PN=/\b(?:[A-Z]{1,5}\d[\dA-Z-]{3,}|[A-Z]{2,6}-\d{2,}(?:-\d+)+|\d{1,3}[A-Z]{1,3}-?\d{3,7}|\d{1,6}-\d{3,6}(?:-\d+)?|\d{7,15})\b/giu;
const roles=[
 ['Mecânico',/\bmecanicos?\b|\bmecanicas?\b|\bmec\b|\bmechanics?\b/u],
 ['Eletricista',/\beletricistas?\b|\beletricos?\b|\belet\b/u],
 ['Lubrificador',/\blubrificador(?:es)?\b|\blub\b|\blubr\b/u],
 ['Soldador',/\bsoldador(?:es)?\b|\bsolda\b/u],
 ['Borracheiro',/\bborracheiros?\b|\bpneus?\s*(?:tecnico)?\b/u],
 ['Instrumentista',/\binstrumentistas?\b/u],
 ['Caldeireiro',/\bcaldeireiros?\b/u],
 ['Técnico',/\btecnicos?\b/u],
 ['Operador',/\boperadores?\b/u]
];
const qtyUnit='(?:unidades?|unds?|unid\\.?|und\\.?|un\\.?|pcs?\\.?|pe[cç]as?|p[cç]s?\\.?|jogos?|kits?|pares?)';
const units=new RegExp('^\\s*(\\d{1,4})\\s*'+qtyUnit+'\\s*$','iu');
const numTime=/(\d+(?:[.,]\d+)?)\s*(horas?|hrs?\.?|h\b|minutos?|mins?\.?)/iu;
const headingMap=[
 ['labor',/^(?:ma[oã][-\s]*de[-\s]*obra(?:\s*estimada)?|previs[aã]o\s+de\s+ma[oã][-\s]*de[-\s]*obra|equipe(?:\s*(?:prevista|estimada))?|recursos?\s+humanos?|hh\s*previst[oa]s?|recursos\s+iniciais)$/u],
 ['parts',/^(?:(?:lista|rela[cç][aã]o)\s+de\s+)?(?:material|materiais|pe[cç]as?|sobressalentes?)(?:\s+(?:necess[aá]ri[oa]s?|previst[oa]s?|requerid[oa]s?))?$|^part\s*numbers?$|^pns?$/u],
 ['conditional',/^(?:refer[eê]ncia|material|pe[cç]a)\s+t[eé]cnic[ao]\s+condicional$|^materiais?\s+condicionais?$/u],
 ['failure',/^(?:texto\s+breve|descri[cç][aã]o\s+breve|condi[cç][aã]o\s+encontrada|o\s+que\s+falhou\??|por\s+que\s+falhou\??|hist[oó]rico(?:\s+s[·.]?o[·.]?s[.]?)?|hist[oó]rico\s+de\s+manuten[cç][aã]o\s+relevante|leitura\s+da\s+engenharia|falha\s+observada|sintoma(?:s)?)$/u],
 ['work',/^(?:recomenda[cç][aã]o\s+da\s+engenharia|atividades?\s+recomendadas?|interven[cç][aã]o\s+sugerida|servi[cç]os?\s+a\s+(?:executar|realizar)|instru[cç][aã]o\s+de\s+trabalho|escopo|coleta\s+de\s+amostras|crit[eé]rio\s+para\s+pr[oó]xima\s+tratativa|tipo\s+de\s+servi[cç]o|evid[eê]ncias\s+obrigat[oó]rias|observa[cç][aã]o\s+de\s+engenharia|observa[cç][oõ]es)$/u]
];
function stripLine(raw){
 return String(raw??'').replace(/\r/g,'').trim().replace(/^\s{0,3}(?:#{1,6}\s*)/,'').replace(/^\s*(?:[-*•]\s+|\\-\s+)/,'').replace(/\\([.!_*#])/g,'$1').replace(/\*\*(.*?)\*\*/g,'$1').trim();
}
function identifyHeading(line){
 const v=norm(stripLine(line)).replace(/:$/,'').replace(/\s+/g,' ').trim();
 if(v==='descricao longa'||v==='texto longo'||v==='descrição longa')return 'generic';
 for(const [section,re] of headingMap)if(re.test(v))return section;
 return null;
}
function possiblePNs(s){
 const clean=stripLine(s);
 if(/^(?:relat[oó]rio|laudo|refer[eê]ncia\s+do\s+relat[oó]rio|amostra|an[aá]lise|nota\s+\d|os\s+\d)/iu.test(clean))return [];
 if(/\b(?:relat[oó]rio|fault\s+storage|visionlink)\s+u?\d{2,}/iu.test(clean))return [];
 const matches=[...clean.matchAll(PN)].map(x=>x[0]).filter(x=>!/^(?:U\d{3}-\d+-\d+|20\d{6,})$/iu.test(x));
 return [...new Set(matches)];
}
function timeValue(s){
 const m=String(s).match(numTime);if(!m)return null;
 const n=value(m[1]);if(!Number.isFinite(n)||n<=0||n>10000)return null;
 return /^min/iu.test(m[2])?n/60:n;
}
function standaloneDuration(s){
 if(!/^(?:tempo|dura[cç][aã]o|prazo|interven[cç][aã]o)\b/iu.test(stripLine(s)))return null;
 return timeValue(s);
}
function parseLabor(line,section){
 const raw=stripLine(line).replace(/^ma[oã][-\s]*de[-\s]*obra(?:\s*estimada)?\s*:\s*/iu,'');
 const n=norm(raw);
 if(/\b(?:substituir|inspecionar|verificar|revisar|fotografar|executar)\b/u.test(n)&&section!=='labor')return [];
 const chunks=raw.split(/\s*(?:\+|&|\be\b)\s*(?=\d+\s*(?:mec|eletric|lubr|sold|borracheir|tecnic|operador))/iu);
 const output=[];
 for(const chunk of chunks){
   const normalized=norm(chunk);
   for(const [role,re] of roles){
     const match=re.exec(normalized);if(!match)continue;
     const before=normalized.slice(0,match.index).trim();
     const after=normalized.slice(match.index+match[0].length).trim();
     const left=before.match(/(?:^|[^\d])(\d{1,3})\s*(?:x\s*)?$/u);
     const explicitAfter=after.match(/^[:=\s/(-]*?(\d{1,3})(?!\s*(?:h\b|hrs?\b|horas?\b|min(?:utos?)?\b))(?:\s*(?:profissionais?|pessoas?|tecnicos?|x))?\s*$/u);
     const h=timeValue(after)||timeValue(before);
     // Sem quantidade: "Mecânico: 3h" é um profissional por 3 h, nunca três profissionais.
     const count=left?Number(left[1]):explicitAfter?Number(explicitAfter[1]):h!==null?1:null;
     if(count===null||count<1||count>100)continue;
     // Não converter texto técnico incidental com a palavra "mecânico" em recurso.
     if(!left && !explicitAfter && h===null)continue;
     output.push({role,count,hours:h,source:line.trim(),confidence:(!left&&!explicitAfter)?'media':'alta'});
   }
 }
 return output;
}
function isMetadataLine(s){
 const n=compact(s);
 return /^(?:relatorio|laudo|amostra|analise|data|horimetro|tag|componente|engenharia|e c |e c |nota|os)\b/u.test(n)
 || /^\d{2}\/\d{2}\/\d{4}\b/u.test(s.trim())
 || /(?:^|\s)(?:relat[oó]rio)\s+U\d{2,}/iu.test(s);
}
function readQty(text){
 const s=text.trim();
 let m=s.match(/^(\d{1,4})$/u);
 if(m)return Number(m[1]);
 m=s.match(units);if(m)return Number(m[1]);
 m=s.match(/^(?:qtd|qtde|quantidade)\s*[:=]?\s*(\d{1,4})\s*$/iu);if(m)return Number(m[1]);
 m=s.match(/^[x×]\s*(\d{1,4})$/iu);if(m)return Number(m[1]);
 m=s.match(/^(\d{1,4})\s*[x×]$/iu);if(m)return Number(m[1]);
 return null;
}
function cleanDesc(text){
 return text.replace(/^\s*[-–:,|/]+\s*|\s*[-–:,|/]+\s*$/g,'').replace(/\s{2,}/g,' ').trim();
}
function createPart(pn,description,quantity,source,section,conditional,confidence){
 return {pn:pn||'PN A CONFIRMAR',description:cleanDesc(description),quantity:quantity??'',plannerComment:'',mechanicComment:'',min:'',max:'',mrp:'',source:source.trim(),section,conditional:!!conditional,confidence:confidence||'alta'};
}
function parsePart(line,section='work'){
 const s=stripLine(line);
 if(!s||identifyHeading(s)||isMetadataLine(s))return null;
 // Não extrair PNs de comandos, referências SIS, histórico ou códigos de falha.
 if(/^(?:inspecionar|verificar|remover|substituir|reinstalar|realizar|abastecer|registrar|limpar|abrir|confirmar|utilizar\s+somente|n[aã]o\s+utilizar|quando\s+)/iu.test(s))return null;
 const tokens=s.split(/\s+-\s+|\s*[|;,/]\s*|\t+/u).map(t=>t.trim()).filter(Boolean);
 const pins=possiblePNs(s);
 if(pins.length>1)return null;
 const known=!!pins.length;
 const explicitUnknown=/\b(?:pn|part\s*number)\s+a\s*confirmar\b/iu.test(s);
 let qty=null,desc='',pn=pins[0]||'';
 if(known||explicitUnknown){
  const code=pn||'PN A CONFIRMAR';
  const at=pn?s.toUpperCase().indexOf(pn.toUpperCase()):s.search(/\b(?:pn|part\s*number)\s+a\s*confirmar\b/iu);
  const remaining=cleanDesc(s.slice(0,at)+' '+s.slice(at+code.length));
  const fields=remaining.split(/\s+-\s+|\s*[|;,/]\s*|\t+/u).map(v=>v.trim()).filter(Boolean);
  const descs=[];
  for(const field of fields){
   const q=readQty(field);if(q!==null){qty=q;continue;}
   let m=field.match(new RegExp('^(\\d{1,4})\\s*'+qtyUnit+'?\\s+(.+)$','iu'));
   if(m){qty=Number(m[1]);descs.push(m[2]);continue;}
   m=field.match(new RegExp('^(.+?)\\s+(\\d{1,4})\\s*'+qtyUnit+'\\s*$','iu'));
   if(m){qty=Number(m[2]);descs.push(m[1]);continue;}
   m=field.match(/^(.+?)\s*(?:qtd|quantidade)\s*[:=]?\s*(\d{1,4})$/iu);
   if(m){qty=Number(m[2]);descs.push(m[1]);continue;}
   descs.push(field);
  }
  desc=cleanDesc(descs.join(' / '));
  if(!desc && section!=='parts'&&section!=='conditional')return null;
  if(qty===null&&section!=='parts'&&section!=='conditional')return null;
  if(qty===null&&section==='conditional')return null;
  if(desc.length>180||/[.!?]\s+\w{4}/u.test(desc))return null;
  return createPart(code,desc,qty,s,section,section==='conditional',qty===null||!desc?'baixa':'alta');
 }
 // Peça sem PN: somente seção de materiais (ou amostragem), jamais prosa livre.
 if(section!=='parts'&&section!=='conditional'&&section!=='work')return null;
 const lead=norm(tokens[0]||'');
 const isConsumable=/^(?:ampola|oleo|graxa|fluido|mangueira|junta|filtro|vedacao|anel|retentor|parafuso|arruela|kit\s+de\s+coleta)\b/u.test(lead);
 if(!isConsumable)return null;
 if(section==='work'&&!/ampola\s+avulsa/i.test(s))return null;
 if(tokens.length<2)return null;
 for(let i=tokens.length-1;i>=1;i--){const q=readQty(tokens[i]);if(q!==null){qty=q;tokens.splice(i,1);break;}}
 if(qty===null && section!=='parts')return null;
 const descCandidate=cleanDesc(tokens.join(' / '));
 if(descCandidate.length>180)return null;
 return createPart('PN A CONFIRMAR',descCandidate,qty,s,section,section==='conditional','baixa');
}
function partKey(p){
 if(p.pn!=='PN A CONFIRMAR')return 'pn:'+p.pn.replace(/[^A-Z0-9]/giu,'').toUpperCase();
 const n=compact(p.description);
 if(n.startsWith('ampola avulsa sem rotulo'))return 'sem-pn:ampola avulsa sem rotulo';
 if(n.startsWith('oleo da roda dianteira'))return 'sem-pn:oleo da roda dianteira';
 return 'sem-pn:'+compact(p.description.split('/')[0]);
}
function parse(text){
 const parts=[],labor=[],failure=[],work=[],uncertain=[],warnings=[],duplicates=[];
 let duration=null,section='work',recognized=0;
 let lastPart=null,blank=false;
 const input=String(text||'').replace(/\r\n?/g,'\n').replace(/\\\s*\n/g,'\n');
 const append=(line,destination)=>{
  if(blank && destination.length && destination[destination.length-1]!=='')destination.push('');
  blank=false;destination.push(line);
 };
 const rank=s=>s==='parts'?3:s==='conditional'?2:s==='work'?1:0;
 for(const original of input.split('\n')){
  const line=stripLine(original);
  if(!line){blank=true;continue;}
  const heading=identifyHeading(line);
  if(heading){
    if(heading!=='generic')section=heading;
    if(heading==='failure'||heading==='work')append(line.toUpperCase()+':',heading==='failure'?failure:work);
    lastPart=null;
    continue;
  }
  if(/^[0-9]+\.\s*(?:s[·.]?o[·.]?s\.?|engenharia|amostra(?:\s+(?:da\s+)?engenharia)?)\s*:?$/iu.test(line)){append(line,work);blank=false;continue;}
  const time=standaloneDuration(line);
  if(time!==null){duration=time;recognized++;continue;}
  const staff=parseLabor(line,section);
  if(staff.length){
    for(const l of staff){
      if(!labor.some(x=>x.role===l.role&&x.count===l.count&&x.hours===l.hours))labor.push(l);
    }
    recognized++;lastPart=null;continue;
  }
  let part=parsePart(line,section);
  if(part){
    const key=partKey(part),i=parts.findIndex(p=>partKey(p)===key);
    if(i>=0){
      const existing=parts[i];
      duplicates.push({pn:part.pn,source:line});
      if(existing.quantity!==''&&part.quantity!==''&&Number(existing.quantity)!==Number(part.quantity))warnings.push('Quantidades divergentes de '+existing.pn+': conferir '+existing.quantity+' e '+part.quantity+'.');
      if(rank(part.section)>rank(existing.section)){
        // Manter comentário condicional e origem original quando a lista principal repete o item.
        const comment=existing.mechanicComment;
        parts[i]={...part,mechanicComment:comment||part.mechanicComment};
        lastPart=parts[i];
      }else lastPart=existing;
    }else{parts.push(part);lastPart=part;}
    if(part.confidence==='baixa')uncertain.push({kind:'part',line,reason:'PN ou quantidade precisa de confirmação.'});
    recognized++;continue;
  }
  // Condições complementares de material opcional continuam ligadas ao item.
  if(lastPart?.conditional && /^(?:\(?utilizar\s+somente|somente\s+se|se\s+constatado|apenas\s+se)/iu.test(line)){
    lastPart.mechanicComment=[lastPart.mechanicComment,line.replace(/^\(|\)$/g,'')].filter(Boolean).join(' ');
    append(line,work);continue;
  }
  lastPart=null;
  if(section==='parts'||section==='conditional'||section==='labor'){
    // Não perder nenhuma linha de material/recursos que não pôde ser interpretada.
    uncertain.push({kind:section,line,reason:'Linha preservada para análise técnica.'});
  }
  append(line,section==='failure'?failure:work);
 }
 const totalHH=labor.reduce((n,l)=>n+(l.hours===null?0:l.count*l.hours),0);
 if(labor.some(l=>l.hours===null))warnings.push('Há profissionais sem horas informadas: HH parcial.');
 if(duration===null&&labor.some(l=>l.hours!==null))warnings.push('Duração total não informada; não confundir duração com HH.');
 if(duplicates.length)warnings.push(duplicates.length+' material(is) repetido(s) consolidado(s) sem somar quantidades.');
 if(parts.some(p=>p.conditional))warnings.push('Há peça condicional; validar necessidade após inspeção antes de aprovisionar.');
 if(parts.some(p=>p.quantity===''))warnings.push('Há material sem quantidade definida conforme especificação do equipamento.');
 if(uncertain.length)warnings.push(uncertain.length+' registro(s) com interpretação incompleta, preservados ou sinalizados.');
 return {labor,parts,duration,failure:failure.join('\n').trim(),work:work.join('\n').trim(),uncertain,warnings,totalHH,recognized,duplicates,raw:String(text||'')};
}
return {parse,parseLabor,parsePart,standaloneDuration,possiblePNs,identifyHeading,partKey};
});