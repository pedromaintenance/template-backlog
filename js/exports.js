/* Self-contained HTML, PDF print, DOCX and XLSX: no internet or third-party libs. */
(function(global){'use strict';
const UTF8=new TextEncoder(), xmlEscape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const htmlEscape=xmlEscape;
const pad=n=>String(n).padStart(2,'0');
function basename(title){return String(title||'Relatorio_Inspecao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,75)||'Relatorio_Inspecao';}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function dataBytes(uri){const base=uri.split(',')[1]||'';const binary=atob(base),arr=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i);return arr;}
function photoEntries(state){
 const pics=[];
 for(let i=0;i<(state.rows||[]).length;i++){
  const row=state.rows[i];
  if(row.type!=='photo' && !(row.type==='assessment'&&row.assessment==='not-ok'))continue;
  for(let j=0;j<(row.photos||[]).length;j++){
   const photo=row.photos[j];if(!photo.dataUrl?.startsWith('data:image/'))continue;
   const ext=photo.dataUrl.startsWith('data:image/png')?'png':'jpg';
   pics.push({...photo,ref:`foto_${String(i+1).padStart(3,'0')}_${j+1}.${ext}`,block:i+1,ext});
  }
 }
 return pics;
}
function machineLine(state){const m=state.meta||{};return `TAG: ${m.tag||'—'}  |  Modelo: ${m.model||'—'}  |  Horímetro: ${m.hours||'—'} h  |  Odômetro: ${m.odometer||'—'} km`;}
function assessmentTitle(row){return row.assessment==='ok'?'OK':row.assessment==='not-ok'?'Não OK':'Não avaliado';}
const severityLabels={'monitorar':'Monitorar','anormal':'Anormal','critico':'Crítico','muito-critico':'Muito Crítico'};
function severityText(row){return row.assessment==='not-ok'?(severityLabels[row.severity]||'Sem classificação'):'';}
function safeRows(state){return (state.rows||[]).filter(r=>r.type!=='empty');}

function reportHTML(state,{profile='mechanic',print=false}={}){
const planner=profile==='planner',E=htmlEscape,br=s=>E(s||'').replace(/\n/g,'<br>'),m=state.meta||{};
const table=(heads,rows)=>'<div class="tablewrap"><table><thead><tr>'+heads.map(x=>'<th>'+E(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+br(String(c??''))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const labor=table(['Especialidade','Profissionais','Horas / profissional','HH'],(state.labor||[]).map(l=>[l.role,l.count,l.hours,(Number(l.count)||0)*(Number(l.hours)||0)]));
const parts=planner?table(['Part Number','Descrição','Qtd','MRP','MIN','MAX','Anotações do planejador','Orientações para execução'],(state.parts||[]).map(p=>[p.pn,p.description,p.quantity,p.mrp,p.min,p.max,p.plannerComment,p.mechanicComment])):table(['Part Number','Descrição','Qtd','Orientação para o mecânico'],(state.parts||[]).map(p=>[p.pn,p.description,p.quantity,p.mechanicComment]));
const photo=p=>'<figure><img src="'+(p.dataUrl||'')+'" alt="Evidência fotográfica"><figcaption>'+E(p.caption||'')+'</figcaption></figure>';
const blocks=safeRows(state).map(r=>{
if(r.type==='text')return '<div class="evidence text">'+br(r.text)+'</div>';
if(r.type==='list')return '<div class="evidence"><ul>'+(r.items||[]).map(i=>'<li>'+(i.done?'☑ ':'☐ ')+E(i.text)+'</li>').join('')+'</ul></div>';
if(r.type==='photo')return '<div class="evidence photos">'+(r.photos||[]).map(photo).join('')+'</div>';
if(r.type==='assessment'){const level=r.assessment==='ok'?'Conforme':r.assessment==='not-ok'?'Não conforme':'Não avaliado';return '<div class="evidence assessment"><strong>'+br(r.command)+'</strong><p>'+E(level)+(r.assessment==='not-ok'?' · '+E(severityText(r)):'')+'</p>'+(r.assessment==='not-ok'?'<p>'+br(r.comment)+'</p><div class="photos">'+(r.photos||[]).map(photo).join('')+'</div>':'')+'</div>';}
return '';}).join('');
const styles="@page{size:A4;margin:13mm}*{box-sizing:border-box}body{margin:0;background:#edf2f4;color:#1c313d;font:12px/1.55 \"Segoe UI\",Arial,sans-serif}article{max-width:930px;margin:24px auto;padding:50px;background:white;box-shadow:0 8px 28px #10293925}header{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:2px solid #c3942c;padding-bottom:17px}header img{width:172px;max-height:85px;object-fit:contain}header span{text-align:right;font-size:10px;color:#005471;font-weight:700;letter-spacing:.05em}header b{color:#c3942c;font-size:14px}h1{font-size:25px;line-height:1.25;color:#005471;margin:25px 0}h2{font-size:16px;border-left:4px solid #c3942c;padding-left:9px;color:#005471;margin:30px 0 13px}h3{font-size:12px;color:#005471;margin:16px 0 8px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;border:1px solid #d6e4ea;background:#f5f9fa;padding:12px}.meta div{overflow-wrap:anywhere}.text{white-space:normal;overflow-wrap:anywhere;margin:9px 0 15px;font-size:13px}.tablewrap{width:100%;overflow:visible}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px}th{background:#005471;color:#fff;text-align:left;font-weight:700}th,td{border:1px solid #d8e2e6;padding:7px;vertical-align:top;overflow-wrap:anywhere}td{white-space:normal}tr{break-inside:avoid}p.hint{font-size:10px;color:#6d8390}.evidence{break-inside:avoid;margin:14px 0 20px;padding:8px;border:1px solid #e3e8ea}.evidence.text{border:0;padding:0}.evidence ul{padding-left:17px;margin:0}.assessment{border-left:4px solid #c3942c}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.photos figure{margin:0;break-inside:avoid}.photos img{display:block;width:100%;height:auto;max-height:300px;object-fit:contain;border:1px solid #dce5e9}.photos figcaption{font-size:10px;color:#52717f;margin:5px 0 0}footer{color:#78919f;text-align:center;border-top:1px solid #dce5e9;padding-top:14px;margin-top:25px;font-size:9px}@media(max-width:600px){article{margin:0;padding:20px}.meta{grid-template-columns:repeat(2,1fr)}}@media print{body{background:#fff}article{max-width:none;margin:0;padding:0;box-shadow:none}h2{break-after:avoid}thead{display:table-header-group}tr,figure{page-break-inside:avoid}.photos{display:block}.photos figure{display:inline-block;width:46%;vertical-align:top;margin:0 2% 12px 0}}";
const meta=[['Equipamento',m.tag],['Modelo',m.model],['Nota SAP',m.notification],['Ordem SAP',m.order],['Prioridade',m.priority],['Duração',String(m.duration||'—')+' h'],['Elaborado por',m.author],['Data',m.date]].map(v=>'<div><b>'+E(v[0])+':</b> '+E(v[1]||'—')+'</div>').join('');
return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+E(state.title||'Instrução de Trabalho')+'</title><style>'+styles+'</style></head><body><article><header><img src="'+global.GMIN_LOGO_DATA+'" alt="G Mining"><span>ENGENHARIA & MANUTENÇÃO DE MINA<br><b>INSTRUÇÃO DE TRABALHO</b></span></header><h1>'+E(state.title||'Ordem sem título')+'</h1><div class="meta">'+meta+'</div><h2>01 · Mão de obra prevista</h2>'+labor+'<p class="hint">Duração da intervenção e homens-hora são estimativas diferentes.</p><h2>02 · Condição encontrada / falha</h2><div class="text">'+br(state.failure)+'</div><h2>03 · Instrução de Trabalho / serviço</h2><div class="text">'+br(state.work)+'</div>'+(state.safety?'<h3>Cuidados e referências</h3><div class="text">'+br(state.safety)+'</div>':'')+'<h2>04 · Lista de peças</h2>'+parts+(planner&&state.plannerNotes?'<h3>Observações internas do planejamento</h3><div class="text">'+br(state.plannerNotes)+'</div>':'')+'<h2>05 · Evidências de falha, catálogos e avaliações</h2>'+blocks+'<footer>G MINING VENTURES · MINA TOCANTINZINHO · Documento auxiliar — conferir com a OS SAP.</footer></article>'+(print?'<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350))<\/script>':'')+'</body></html>';
}
function printPDF(state,profile){const w=window.open('','_blank');if(!w)throw Error('Janela de impressão bloqueada. Habilite pop-ups.');w.document.open();w.document.write(reportHTML(state,{profile,print:true}));w.document.close();}
function makeDOCX(state,profile='planner'){
  const pictures=photoEntries(state),media=[],rels=[{id:'rId1',type:'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',target:'media/logo.png'}],logo=dataBytes(global.GMIN_LOGO_DATA);media.push({name:'word/media/logo.png',data:logo});
  let picNum=2;for(const p of pictures){p.rid='rId'+picNum++;p.mediaName='word/media/'+p.ref;media.push({name:p.mediaName,data:dataBytes(p.dataUrl)});rels.push({id:p.rid,type:'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',target:'media/'+p.ref});}
  const p=(text,opt={})=>`<w:p><w:pPr>${opt.center?'<w:jc w:val="center"/>':''}${opt.bullet?'<w:ind w:left="360"/>':''}${opt.space?'<w:spacing w:after="150"/>':''}</w:pPr><w:r><w:rPr>${opt.bold?'<w:b/>':''}${opt.color?`<w:color w:val="${opt.color}"/>`:''}${opt.size?`<w:sz w:val="${opt.size}"/>`:''}${opt.strike?'<w:strike/>':''}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
  function drawing(rid,id,width,height,maxW=5000000){const ow=Math.max(1,width||1200),oh=Math.max(1,height||900),maxH=6500000,cx=Math.min(maxW,Math.round(maxH*ow/oh)),cy=Math.round(cx*oh/ow);return `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagem ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Fotografia ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;}
  const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
  const tbl=(heads,rows)=>{const cw=Math.floor(9300/heads.length);
    const cell=(t,bold=false)=>'<w:tc><w:tcPr><w:tcW w:w="'+cw+'" w:type="dxa"/></w:tcPr>'+p(fmt(t),{bold,size:16})+'</w:tc>';
    return '<w:tbl><w:tblPr><w:tblW w:w="9300" w:type="dxa"/><w:tblLayout w:type="autofit"/></w:tblPr>'+[heads,...rows].map((row,i)=>'<w:tr>'+row.map(t=>cell(t,i===0)).join('')+'</w:tr>').join('')+'</w:tbl>';};
  const m=state.meta||{};
  const blocks=[
   drawing('rId1',1,1000,401,2050000),
   p('ENGENHARIA & MANUTENÇÃO DE MINA',{color:'005471',bold:true,size:18}),
   p('INSTRUÇÃO DE TRABALHO',{color:'C3942C',bold:true,size:30,space:true}),
   p(state.title||'Ordem sem título',{color:'005471',bold:true,size:28,space:true}),
   p('TAG: '+fmt(m.tag)+' | Modelo: '+fmt(m.model),{bold:true}),
   p('Nota SAP: '+fmt(m.notification)+' | Ordem SAP: '+fmt(m.order)+' | Prioridade: '+fmt(m.priority),{bold:true}),
   p('Duração prevista: '+fmt(m.duration)+' h | Autor: '+fmt(m.author)+' | Data: '+fmt(m.date),{space:true}),
   p('01. MÃO DE OBRA PREVISTA',{color:'005471',bold:true,size:22,space:true}),
   tbl(['Especialidade','Profissionais','Horas / pessoa','HH'],(state.labor||[]).map(l=>[l.role,l.count,l.hours,(Number(l.count)||0)*(Number(l.hours)||0)])),
   p('Total: '+(state.labor||[]).reduce((a,l)=>a+(Number(l.count)||0)*(Number(l.hours)||0),0)+' HH',{bold:true,space:true}),
   p('02. FALHA / CONDIÇÃO ENCONTRADA',{color:'005471',bold:true,size:22,space:true}),
   ...String(state.failure||'—').split('\n').map(t=>p(t,{space:true})),
   p('03. INSTRUÇÃO DE TRABALHO / SERVIÇO',{color:'005471',bold:true,size:22,space:true}),
   ...String(state.work||'—').split('\n').map(t=>p(t,{space:true})),
   ...(state.safety?[p('CUIDADOS DE EXECUÇÃO',{color:'005471',bold:true,size:20}),...String(state.safety).split('\n').map(t=>p(t,{space:true}))]:[]),
   p('04. LISTA DE PEÇAS',{color:'005471',bold:true,size:22,space:true}),
   profile==='planner'
    ?tbl(['PN','Descrição','Qtd','MRP','MIN','MAX','Anotações PCM','Orientações execução'],(state.parts||[]).map(t=>[t.pn,t.description,t.quantity,t.mrp,t.min,t.max,t.plannerComment,t.mechanicComment]))
    :tbl(['Part Number','Descrição','Qtd','Orientações de execução'],(state.parts||[]).map(t=>[t.pn,t.description,t.quantity,t.mechanicComment])),
   ...(profile==='planner'&&state.plannerNotes?[p('NOTAS DO PLANEJADOR',{color:'005471',bold:true}),...String(state.plannerNotes).split('\n').map(t=>p(t,{space:true}))]:[]),
   p('05. EVIDÊNCIAS FOTOGRÁFICAS E CATÁLOGOS',{color:'005471',bold:true,size:22,space:true})
  ];
  let imageIndex=0;for(const r of safeRows(state)){
    if(r.type==='text'){for(const line of String(r.text||'').split('\n'))blocks.push(p(line,{space:true}));}
    if(r.type==='list')for(const item of r.items||[])blocks.push(p((item.done?'☑ ':'☐ ')+(item.text||''),{space:true,strike:item.done}));
    if(r.type==='assessment'){
      if(r.system)blocks.push(p(r.system.toUpperCase(),{color:'005471',bold:true,size:18}));
      blocks.push(p(r.command||'Comando não preenchido',{bold:true,size:22}));
      const color=r.assessment==='ok'?'00814D':r.severity==='monitorar'?'997700':r.severity==='anormal'?'C46E12':r.severity==='critico'?'BC2727':r.severity==='muito-critico'?'651226':'657A84';
      blocks.push(p(assessmentTitle(r)+(r.assessment==='not-ok'?' — '+severityText(r):''),{color,bold:true,size:20,space:true}));
      if(r.assessment==='not-ok'&&r.comment)for(const line of String(r.comment).split('\n'))blocks.push(p(line,{space:true}));
      if(r.assessment==='not-ok')for(const photo of r.photos||[]){const item=pictures[imageIndex++];if(!item)continue;blocks.push(drawing(item.rid,imageIndex+1,item.width,item.height));if(photo.caption)blocks.push(p(photo.caption,{color:'657A84',size:18,space:true}));}
    }
    if(r.type==='photo')for(const photo of r.photos||[]){const item=pictures[imageIndex++];if(!item)continue;blocks.push(drawing(item.rid,imageIndex+1,item.width,item.height));if(photo.caption)blocks.push(p(photo.caption,{color:'657A84',size:18,space:true}));}
  }
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${blocks.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1100" w:right="1100" w:bottom="1000" w:left="1100"/></w:sectPr></w:body></w:document>`;
  const relXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(r=>`<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join('')}</Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  return GMINZip.pack([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`},{name:'word/document.xml',data:doc},{name:'word/_rels/document.xml.rels',data:relXml},...media]);
}
function makeXLSX(state){
 const photos=photoEntries(state);
 const rows=[['G MINING VENTURES · MINA TZ'],[state.title],[machineLine(state)],
 [`Emitido em ${new Date().toLocaleString('pt-BR')}`],
 ['Ordem','Tipo','Sistema','Comando / Conteúdo','Resultado','Avaliação','Comentário','Foto / Arquivo']];
 let photoIndex=0;
 for(let i=0;i<(state.rows||[]).length;i++){
  const row=state.rows[i],n=i+1;if(row.type==='empty')continue;
  if(row.type==='text')rows.push([n,'Texto','',row.text||'','','','','']);
  if(row.type==='list')for(const item of row.items||[])rows.push([n,'Lista','',item.text||'',item.done?'Marcado':'Pendente','','','']);
  if(row.type==='photo')for(const item of row.photos||[]){const picture=photos[photoIndex++];rows.push([n,'Fotografia','',item.caption||'','','','',picture?.ref||'']);}
  if(row.type==='assessment'){
   const ownPhotos=row.assessment==='not-ok'?(row.photos||[]):[];
   const refs=ownPhotos.map(()=>photos[photoIndex++]?.ref||'');
   rows.push([n,'Avaliação',row.system||'',row.command||'',assessmentTitle(row),severityText(row),row.assessment==='not-ok'?(row.comment||''):'',refs.join('; ')]);
  }
 }
 const sheetPhotos=[['Ordem do bloco','Arquivo','Legenda','Visualização']];
 for(const item of photos)sheetPhotos.push([item.block,item.ref,item.caption||'','']);
 function colId(n){let res='';while(n){n--;res=String.fromCharCode(65+n%26)+res;n=Math.floor(n/26);}return res;}
 function cell(v,col,row,style){const ref=colId(col)+row;if(typeof v==='number')return `<c r="${ref}"${style?' s="'+style+'"':''}><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${style?' s="'+style+'"':''}><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;}
 function sheet(data,isPhotos=false){const body=data.map((vals,i)=>{let cells='';vals.forEach((v,j)=>cells+=cell(v,j+1,i+1,(i===4&&!isPhotos||i===0&&isPhotos)?1:(i===1&&!isPhotos?2:0)));return `<row r="${i+1}"${isPhotos&&i>0?' ht="102" customHeight="1"':''}>${cells}</row>`;}).join('');
 const widths=(isPhotos?[15,31,48,44]:[12,18,27,68,17,20,60,40]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${widths}</cols><sheetData>${body}</sheetData>${isPhotos&&photos.length?'<drawing r:id="rId1"/>':''}</worksheet>`;}
 const entries=[{name:'[Content_Types].xml',data:`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${photos.length?'<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>':''}</Types>`},
 {name:'_rels/.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
 {name:'xl/workbook.xml',data:`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/><sheet name="Fotografias" sheetId="2" r:id="rId2"/></sheets></workbook>`},
 {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
 {name:'xl/styles.xml',data:`<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/></font><font><b/><color rgb="FF005471"/><sz val="16"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF005471"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`},
 {name:'xl/worksheets/sheet1.xml',data:sheet(rows)},{name:'xl/worksheets/sheet2.xml',data:sheet(sheetPhotos,true)}];
 if(photos.length){entries.push({name:'xl/worksheets/_rels/sheet2.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`});
 const shapes=photos.map((p,i)=>{const w=p.width||1000,h=p.height||750,maxW=3700000,maxH=1200000,scale=Math.min(maxW/w,maxH/h);return `<xdr:oneCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${i+1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${Math.round(w*scale)}" cy="${Math.round(h*scale)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="${xmlEscape(p.ref)}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;}).join('');
 entries.push({name:'xl/drawings/drawing1.xml',data:`<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${shapes}</xdr:wsDr>`});
 entries.push({name:'xl/drawings/_rels/drawing1.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${photos.map((p,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${p.ref}"/>`).join('')}</Relationships>`});
 for(const p of photos)entries.push({name:'xl/media/'+p.ref,data:dataBytes(p.dataUrl)});
 }
 return GMINZip.pack(entries);
}
function exportFile(state,type){const name=basename(state.title);if(type==='pdf')return printPDF(state);if(type==='html')return download(new Blob([reportHTML(state)],{type:'text/html;charset=utf-8'}),name+'.html');if(type==='docx')return download(makeDOCX(state),name+'.docx');if(type==='xlsx')return download(makeXLSX(state),name+'.xlsx');throw Error('Formato inválido');}
global.GMINExport={exportFile,reportHTML,makeDOCX,makeXLSX,basename,download};
})(window);
