/* GMIN IT — reutiliza o editor de evidências do Relatório de Inspeção. */
(function(){'use strict';
const $=s=>document.querySelector(s),rowsEl=$('#reportRows'),titleEl=$('#orderTitle'),statusEl=$('#saveStatus');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const uid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const severityOptions=[{value:'monitorar',label:'Monitorar'},{value:'anormal',label:'Anormal'},{value:'critico',label:'Crítico'},{value:'muito-critico',label:'Muito Crítico'}];
const newRow=(type='empty')=>({id:uid(),type,text:'',items:[],photos:[],command:'',system:'',method:'',assessment:'',severity:'',comment:'',source:''});
const metaEmpty=()=>({tag:'',model:'',notification:'',order:'',priority:'',duration:'',author:'',date:new Date().toISOString().slice(0,10)});
const fresh=()=>({kind:'gmin-work-instruction',version:1,id:uid(),title:'',meta:metaEmpty(),failure:'',work:'',safety:'',plannerNotes:'',labor:[],parts:[],rows:[newRow()],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
let state=fresh(),loading=true,saveTimer=null,saveChain=Promise.resolve(),toastTimer=null,parsed=null;
function toast(msg){const el=$('#toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4500);}
function setStatus(msg,warn=false){statusEl.textContent=msg;statusEl.classList.toggle('warn',warn);}
function saveNow(){if(loading)return Promise.resolve();clearTimeout(saveTimer);state.updatedAt=new Date().toISOString();
const snapshot=JSON.parse(JSON.stringify(state));saveChain=saveChain.catch(()=>{}).then(()=>GMINStorage.save(snapshot)).then(()=>setStatus('● Salvo neste dispositivo')).catch(e=>{console.error(e);setStatus('⚠ Falha ao salvar',true);toast('Falha no armazenamento. Exporte JSON.');});return saveChain;}
function changed(){if(loading)return;setStatus('● Salvando...');clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,400);}
function resizeArea(el,min=90){el.style.height='auto';el.style.height=Math.max(min,el.scrollHeight+2)+'px';}
function resizeTitle(){resizeArea(titleEl,56);}
const safeNum=v=>v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
const formatHH=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
  function photoMarkup(row) {
    return `<div class="photo-grid">${(row.photos || []).map((photo, i) => `
      <div class="photo-item" data-photo-index="${i}">
        <img src="${photo.dataUrl}" alt="${esc(photo.caption || 'Evidência fotográfica')}" data-action="photo-view">
        <div class="photo-footer"><input type="text" data-field="photo-caption" class="photo-caption"
          value="${esc(photo.caption)}" placeholder="Legenda da foto" aria-label="Legenda da foto ${i + 1}">
          <button type="button" data-action="photo-remove" class="remove-photo no-print" aria-label="Remover fotografia">✕</button></div>
      </div>`).join('')}</div>
      <div class="photo-actions no-print" role="group" aria-label="Adicionar fotografias">
        <button type="button" data-action="photo-camera" class="add-photo photo-camera-button">📷 Tirar foto</button>
        <button type="button" data-action="photo-gallery" class="add-photo photo-gallery-button">＋ Escolher da galeria</button>
      </div>
      <input type="file" accept="image/*" capture="environment" class="photo-input photo-camera-input" aria-label="Tirar foto usando a câmera" hidden>
      <input type="file" accept="image/*" multiple class="photo-input photo-gallery-input" aria-label="Selecionar fotografias da galeria ou de arquivos" hidden>`;
  }
  function assessmentMarkup(row) {
    const val = row.assessment || '';
    const statusClass = val === 'ok' ? 'status-ok' : val === 'not-ok' ? 'status-nok' : '';
    const choices = severityOptions.map(opt => `<button type="button" class="severity-pill severity-${opt.value} ${row.severity === opt.value ? 'selected' : ''}"
      data-action="severity" data-value="${opt.value}" aria-pressed="${row.severity === opt.value}">${opt.label}</button>`).join('');
    return { statusClass: val === 'not-ok' && row.severity ? 'severity-' + row.severity : statusClass,
      html: `<div class="row-content assessment-content">
        <div class="block-heading no-print">${row.source ? 'Checklist pré-definido' : 'Avaliação de inspeção'}${row.system ? ` · ${esc(row.system)}` : ''}</div>
        <textarea class="assessment-command" data-field="command" rows="1" placeholder="Descreva o comando da inspeção..." aria-label="Comando da inspeção">${esc(row.command || '')}</textarea>
        ${row.method ? `<div class="inspection-method">Método: ${esc(row.method)}</div>` : ''}
        <div class="assessment-status no-print">
          <button type="button" data-action="assessment-ok" class="answer-button ${val === 'ok' ? 'selected ok' : ''}" aria-pressed="${val === 'ok'}">✓ OK</button>
          <button type="button" data-action="assessment-nok" class="answer-button ${val === 'not-ok' ? 'selected nok' : ''}" aria-pressed="${val === 'not-ok'}">✕ Não OK</button>
        </div>
        ${val === 'ok' ? '<div class="result-caption result-ok">✓ Condição conforme</div>' : ''}
        ${val === 'not-ok' ? `<div class="assessment-details">
          <div class="severity-label">Avaliação da anomalia</div>
          <div class="severity-options no-print">${choices}</div>
          ${row.severity ? `<div class="result-caption result-severity">${esc(severityOptions.find(s => s.value === row.severity)?.label || '')}</div>` : ''}
          <label class="assessment-comment-label">Comentário / evidência observada
            <textarea class="assessment-comment" data-field="comment" rows="2" placeholder="Descreva a condição, local, intensidade e recomendações...">${esc(row.comment || '')}</textarea></label>
          <div class="assessment-photos"><div class="severity-label">Fotografias</div>${photoMarkup(row)}</div>
        </div>` : ''}
      </div>` };
  }
  function rowHTML(row) {
    const menu = `<button type="button" class="row-menu-trigger no-print" data-action="menu" aria-label="Opções da linha" title="Opções">⋯</button>
      <div class="row-menu no-print" hidden><button type="button" data-action="edit">Editar</button>
      <button type="button" data-action="duplicate">Duplicar</button>
      <button type="button" data-action="delete" class="danger">Excluir linha</button></div>`;
    let content = '', statusClass = '';
    if (row.type === 'empty') content = `<div class="choice-group">
      <button type="button" class="choice-button" data-action="choose-text"><span class="choice-icon">▤</span>Adicionar texto</button>
      <button type="button" class="choice-button" data-action="choose-photo"><span class="choice-icon">▧</span>Adicionar foto</button>
      <button type="button" class="choice-button" data-action="choose-list"><span class="choice-icon">☷</span>Adicionar lista</button>
      <button type="button" class="choice-button" data-action="choose-assessment"><span class="choice-icon">◉</span>Avaliação</button></div>`;
    if (row.type === 'text') content = `<div class="row-content"><div class="block-heading no-print">Texto</div>
      <textarea class="text-editor" data-field="text" placeholder="Observações, sintomas, medições ou serviços necessários...">${esc(row.text)}</textarea></div>`;
    if (row.type === 'list') content = `<div class="row-content"><div class="block-heading no-print">Lista</div><div class="list-items">
      ${(row.items || []).map((item, i) => `<div class="list-entry" data-list-index="${i}"><input type="checkbox" data-field="item-done" aria-label="Marcar item como concluído" ${item.done ? 'checked' : ''}>
      <input type="text" data-field="item-text" class="${item.done ? 'checked' : ''}" placeholder="Item da lista" aria-label="Item ${i + 1}" value="${esc(item.text)}">
      <button type="button" class="remove-list-item no-print" data-action="list-remove" aria-label="Excluir item">✕</button></div>`).join('')}
      </div><button type="button" class="add-item no-print" data-action="list-add">＋ Adicionar item</button></div>`;
    if (row.type === 'photo') content = `<div class="row-content"><div class="block-heading no-print">Fotografias</div>${photoMarkup(row)}</div>`;
    if (row.type === 'assessment') { const result = assessmentMarkup(row); content = result.html; statusClass = result.statusClass; }
    return `<div class="row-unit" data-row-id="${esc(row.id)}">
      <button type="button" class="drag-handle no-print" aria-label="Arrastar linha (ou use setas no teclado)" title="Arraste para reordenar" draggable="false">⋮⋮</button>
      <div class="row-card ${row.type === 'empty' ? 'empty' : ''} ${row.type === 'assessment' ? 'assessment-card' : ''} ${statusClass}">${content}${menu}</div>
      <div class="row-add-wrap no-print"><button type="button" class="add-row" data-action="insert" aria-label="Criar linha abaixo" title="Nova linha">+</button></div></div>`;
  }
  function render({ focusId = null } = {}) {
    rowsEl.innerHTML = state.rows.map(rowHTML).join('');
    rowsEl.querySelectorAll('textarea.text-editor,textarea.assessment-command,textarea.assessment-comment').forEach(t => resizeArea(t, t.classList.contains('assessment-command') ? 50 : 76));
    if (focusId) rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(focusId)}"]`)?.querySelector('textarea,input[type=text]')?.focus();
  }
  function getRow(element) { const container = element.closest('.row-unit'); return container && state.rows.find(row => row.id === container.dataset.rowId); }
  function closeMenus() {
    rowsEl.querySelectorAll('.row-menu').forEach(el => { el.hidden = true; });
    $('#projectMenu').hidden = true; $('#projectMenuButton').setAttribute('aria-expanded', 'false');
  }
  function mutateRow(row, fn, focus = false) { fn(row); changed(); render({ focusId: focus ? row.id : null }); }
  function deleteRow(row) {
    const populated = row.type === 'assessment' ? Boolean(row.command || row.assessment || row.comment || row.photos?.length) :
      row.type === 'text' ? Boolean(row.text.trim()) : row.type === 'list' ? row.items.some(item => item.text.trim()) : row.type === 'photo' && row.photos.length;
    if (populated && !confirm('Excluir esta linha e todo o seu conteúdo?')) return;
    state.rows.splice(state.rows.indexOf(row), 1);
    if (!state.rows.length) state.rows.push(newRow());
    changed(); render();
  }
  function duplicate(row) {
    const clone = JSON.parse(JSON.stringify(row)); clone.id = uid();
    state.rows.splice(state.rows.indexOf(row) + 1, 0, clone);
    changed(); render(); toast('Linha duplicada.');
  }
  rowsEl.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action, row = getRow(button); if (!row) return;
    if (action === 'menu') {
      const menu = button.nextElementSibling, wasOpen = !menu.hidden;
      closeMenus(); menu.hidden = wasOpen; return;
    }
    if (action === 'insert') { state.rows.splice(state.rows.indexOf(row) + 1, 0, newRow()); changed(); render(); return; }
    if (action === 'choose-text') { mutateRow(row, r => { r.type = 'text'; r.text = ''; }, true); return; }
    if (action === 'choose-list') { mutateRow(row, r => { r.type = 'list'; r.items = [{ id: uid(), text: '', done: false }]; }, true); return; }
    if (action === 'choose-photo') {
      // Exibe as duas formas de inserir imagem, sem abrir automaticamente o seletor de arquivos.
      mutateRow(row, r => { r.type = 'photo'; r.photos = []; }); return;
    }
    if (action === 'choose-assessment') { mutateRow(row, r => Object.assign(r, { type: 'assessment', command: '', assessment: '', severity: '', comment: '', photos: [] }), true); return; }
    if (action === 'edit') { closeMenus(); rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"]`)?.querySelector('textarea,input[type=text]')?.focus(); return; }
    if (action === 'duplicate') { duplicate(row); return; }
    if (action === 'delete') { deleteRow(row); return; }
    if (action === 'assessment-ok') { mutateRow(row, r => { r.assessment = 'ok'; }); return; }
    if (action === 'assessment-nok') { mutateRow(row, r => { r.assessment = 'not-ok'; }); return; }
    if (action === 'severity') { mutateRow(row, r => { r.severity = button.dataset.value; }); return; }
    if (action === 'list-add') {
      row.items.push({ id: uid(), text: '', done: false }); changed(); render();
      rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .list-entry:last-child [type=text]`)?.focus(); return;
    }
    if (action === 'list-remove') { row.items.splice(Number(button.closest('[data-list-index]').dataset.listIndex), 1); changed(); render(); return; }
    if (action === 'photo-camera') {
      button.closest('.row-unit').querySelector('.photo-camera-input')?.click(); return;
    }
    if (action === 'photo-gallery') {
      button.closest('.row-unit').querySelector('.photo-gallery-input')?.click(); return;
    }
    if (action === 'photo-remove') {
      if (!confirm('Remover esta fotografia?')) return;
      row.photos.splice(Number(button.closest('[data-photo-index]').dataset.photoIndex), 1); changed(); render(); return;
    }
    if (action === 'photo-view') {
      const image = button.getAttribute('src'), win = window.open('', '_blank');
      if (win) { win.document.write(`<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#132b36;display:grid;place-items:center;min-height:100vh"><img alt="Fotografia" src="${image}" style="max-width:98vw;max-height:98vh;object-fit:contain"></body>`); win.document.close(); }
    }
  });
  rowsEl.addEventListener('input', event => {
    const el = event.target, row = getRow(el); if (!row) return;
    if (el.dataset.field === 'text') { row.text = el.value; resizeArea(el); changed(); }
    if (el.dataset.field === 'command') { row.command = el.value; resizeArea(el, 50); changed(); }
    if (el.dataset.field === 'comment') { row.comment = el.value; resizeArea(el, 76); changed(); }
    if (el.dataset.field === 'item-text') {
      const item = row.items[Number(el.closest('[data-list-index]').dataset.listIndex)];
      if (item) { item.text = el.value; changed(); }
    }
    if (el.dataset.field === 'photo-caption') {
      const photo = row.photos[Number(el.closest('[data-photo-index]').dataset.photoIndex)];
      if (photo) { photo.caption = el.value; changed(); }
    }
  });
  rowsEl.addEventListener('change', async event => {
    const el = event.target, row = getRow(el); if (!row) return;
    if (el.dataset.field === 'item-done') {
      const item = row.items[Number(el.closest('[data-list-index]').dataset.listIndex)];
      if (item) { item.done = el.checked; el.closest('.list-entry').querySelector('[type=text]').classList.toggle('checked', el.checked); changed(); }
    }
    if (el.classList.contains('photo-input')) {
      const files = Array.from(el.files || []); el.value = ''; if (!files.length) return;
      setStatus('Processando fotos...'); let count = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try { row.photos.push({ id: uid(), caption: '', ...await encodeImage(file) }); count++; }
        catch (error) { console.error(error); toast(`Falha ao processar ${file.name}`); }
      }
      if (count) { changed(); render(); toast(`${count} fotografia(s) adicionada(s).`); }
    }
  });
  async function encodeImage(file) {
    if (file.size > 35 * 1024 * 1024) throw Error('Fotografia maior que 35 MB');
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), photo = new Image();
      photo.onload = () => { URL.revokeObjectURL(url); resolve(photo); };
      photo.onerror = () => { URL.revokeObjectURL(url); reject(Error('Imagem inválida')); };
      photo.src = url;
    });
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale)), height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/jpeg', .82), width, height };
  }

  // Reordenação por alça: mouse, toque e setas do teclado.
  let dragging = null;
  rowsEl.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle'); if (!handle || event.button !== 0) return;
    const row = getRow(handle); if (!row) return;
    event.preventDefault(); dragging = { id: row.id, pointer: event.pointerId, startY: event.clientY, active: false, target: null, after: false };
    handle.setPointerCapture?.(event.pointerId);
  });
  rowsEl.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.pointer) return;
    if (Math.abs(event.clientY - dragging.startY) > 5) dragging.active = true;
    if (!dragging.active) return;
    rowsEl.querySelectorAll('.row-unit').forEach(el => el.classList.remove('drop-before', 'drop-after', 'dragging'));
    rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(dragging.id)}"]`)?.classList.add('dragging');
    const dest = document.elementFromPoint(event.clientX, event.clientY)?.closest('.row-unit');
    if (!dest || dest.dataset.rowId === dragging.id) return;
    const box = dest.getBoundingClientRect(), after = event.clientY > box.top + box.height / 2;
    dragging.target = dest.dataset.rowId; dragging.after = after;
    dest.classList.add(after ? 'drop-after' : 'drop-before');
  });
  function endDrag(event) {
    if (!dragging || event.pointerId !== dragging.pointer) return;
    const drop = dragging; dragging = null;
    if (drop.active && drop.target) {
      const from = state.rows.findIndex(r => r.id === drop.id);
      if (from >= 0 && state.rows.some(r => r.id === drop.target)) {
        const [moved] = state.rows.splice(from, 1);
        const to = state.rows.findIndex(r => r.id === drop.target) + (drop.after ? 1 : 0);
        state.rows.splice(to, 0, moved); changed();
      }
    }
    render();
  }
  rowsEl.addEventListener('pointerup', endDrag); rowsEl.addEventListener('pointercancel', endDrag);
  rowsEl.addEventListener('keydown', event => {
    if (!event.target.classList.contains('drag-handle') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const row = getRow(event.target), from = state.rows.indexOf(row), to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= state.rows.length) return;
    [state.rows[from], state.rows[to]] = [state.rows[to], state.rows[from]]; changed(); render();
    rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .drag-handle`)?.focus();
  });


function laborTotal(){let total=0,partial=false;
for(const l of state.labor){const n=safeNum(l.count),h=safeNum(l.hours);if(n!==null&&h!==null)total+=n*h;else partial=true;}
$('#laborTotal').textContent='Esforço previsto: '+formatHH(total)+' HH'+(partial?' (parcial)':'')+' · Duração da intervenção: '+(state.meta.duration||'não informada')+' h.';}
function renderLabor(){
$('#laborRows').innerHTML=state.labor.map(l=>`<tr data-labor-id="${esc(l.id)}"><td><input data-labor="role" value="${esc(l.role)}" placeholder="Especialidade"></td><td><input type="number" min="0" step="1" data-labor="count" value="${esc(l.count)}"></td><td><input type="number" min="0" step="0.25" data-labor="hours" value="${esc(l.hours)}"></td><td><strong class="hh-value">${formatHH((safeNum(l.count)||0)*(safeNum(l.hours)||0))}</strong></td><td><button type="button" class="remove-row" data-delete-labor="${esc(l.id)}" title="Excluir">✕</button></td></tr>`).join('')||'<tr><td colspan="5">Sem equipe definida.</td></tr>';laborTotal();}
function renderParts(){
$('#partRows').innerHTML=state.parts.map(p=>`<tr data-part-id="${esc(p.id)}"><td><input data-part="pn" value="${esc(p.pn)}" placeholder="Part Number"></td><td><input data-part="description" value="${esc(p.description)}" placeholder="Descrição"></td><td><input type="number" min="0" step="1" data-part="quantity" value="${esc(p.quantity)}"></td><td><textarea data-part="mechanicComment" placeholder="Orientação específica para a execução">${esc(p.mechanicComment)}</textarea></td><td><button type="button" class="remove-row" data-delete-part="${esc(p.id)}" title="Excluir">✕</button></td></tr>`).join('')||'<tr><td colspan="5">Nenhuma peça.</td></tr>';
$('#plannerRows').innerHTML=state.parts.map(p=>`<tr data-plan-id="${esc(p.id)}"><td><strong data-pn-label>${esc(p.pn||'PN a confirmar')}</strong></td><td><select data-plan="mrp">${['','V1','SD','GO','Outro'].map(v=>`<option value="${v}" ${v===p.mrp?'selected':''}>${v||'—'}</option>`).join('')}</select></td><td><input type="number" min="0" step="1" data-plan="min" value="${esc(p.min)}"></td><td><input type="number" min="0" step="1" data-plan="max" value="${esc(p.max)}"></td><td><textarea data-plan="plannerComment" placeholder="Cadastro, saldo, PR/PO, ETA, reparametrização...">${esc(p.plannerComment)}</textarea></td></tr>`).join('')||'<tr><td colspan="5">Nenhuma peça.</td></tr>';
}
$('#addLabor').addEventListener('click',()=>{state.labor.push({id:uid(),role:'Mecânico',count:1,hours:'',source:''});renderLabor();changed();});
$('#addPart').addEventListener('click',()=>{state.parts.push({id:uid(),pn:'',description:'',quantity:'',mechanicComment:'',plannerComment:'',mrp:'',min:'',max:'',source:''});renderParts();changed();});
$('#laborRows').addEventListener('input',e=>{const el=e.target.closest('[data-labor]');if(!el)return;const row=state.labor.find(x=>x.id===el.closest('[data-labor-id]').dataset.laborId);if(!row)return;row[el.dataset.labor]=el.value;el.closest('tr').querySelector('.hh-value').textContent=formatHH((safeNum(row.count)||0)*(safeNum(row.hours)||0));laborTotal();changed();});
$('#laborRows').addEventListener('click',e=>{const el=e.target.closest('[data-delete-labor]');if(!el)return;state.labor=state.labor.filter(x=>x.id!==el.dataset.deleteLabor);renderLabor();changed();});
$('#partRows').addEventListener('input',e=>{const el=e.target.closest('[data-part]');if(!el)return;const id=el.closest('[data-part-id]').dataset.partId,row=state.parts.find(p=>p.id===id);if(!row)return;row[el.dataset.part]=el.value;if(el.dataset.part==='pn')$('#plannerRows').querySelector(`[data-plan-id="${CSS.escape(id)}"] [data-pn-label]`)?.replaceChildren(document.createTextNode(el.value||'PN a confirmar'));changed();});
$('#partRows').addEventListener('click',e=>{const el=e.target.closest('[data-delete-part]');if(!el)return;state.parts=state.parts.filter(x=>x.id!==el.dataset.deletePart);renderParts();changed();});
function changePlan(e){const el=e.target.closest('[data-plan]');if(!el)return;const row=state.parts.find(p=>p.id===el.closest('[data-plan-id]').dataset.planId);if(row){row[el.dataset.plan]=el.value;changed();}}
$('#plannerRows').addEventListener('input',changePlan);$('#plannerRows').addEventListener('change',changePlan);
document.querySelectorAll('[data-meta]').forEach(el=>{const update=()=>{state.meta[el.dataset.meta]=el.value;laborTotal();changed();};el.addEventListener('input',update);el.addEventListener('change',update);});
titleEl.addEventListener('input',()=>{state.title=titleEl.value;resizeTitle();changed();});
for(const id of ['failure','work','safety','plannerNotes'])$('#'+id).addEventListener('input',e=>{state[id]=e.target.value;changed();});
function hydrate(){titleEl.value=state.title;resizeTitle();document.querySelectorAll('[data-meta]').forEach(el=>el.value=state.meta[el.dataset.meta]??'');for(const id of ['failure','work','safety','plannerNotes'])$('#'+id).value=state[id]||'';renderLabor();renderParts();render();}
function cleanPhoto(p){if(!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(p?.dataUrl||'')))return null;return {id:uid(),dataUrl:p.dataUrl,caption:String(p.caption||'').slice(0,350),width:Math.max(1,Math.min(10000,Number(p.width)||1000)),height:Math.max(1,Math.min(10000,Number(p.height)||750))};}
function normalizeImported(obj){
if(!obj||obj.kind!=='gmin-work-instruction'||!Array.isArray(obj.parts)||!Array.isArray(obj.labor)||!Array.isArray(obj.rows))throw Error('JSON incompatível com a Instrução de Trabalho.');
if(obj.parts.length>2000||obj.labor.length>200||obj.rows.length>1000)throw Error('Projeto excede limites previstos.');
const o=fresh();o.title=String(obj.title||'');o.meta={...metaEmpty(),...(obj.meta||{})};
for(const k of ['failure','work','safety','plannerNotes'])o[k]=String(obj[k]||'');
o.labor=obj.labor.map(x=>({id:uid(),role:String(x.role||''),count:x.count??'',hours:x.hours??'',source:String(x.source||'')}));
o.parts=obj.parts.map(x=>({id:uid(),pn:String(x.pn||''),description:String(x.description||''),quantity:x.quantity??'',mechanicComment:String(x.mechanicComment||''),plannerComment:String(x.plannerComment||''),mrp:String(x.mrp||''),min:x.min??'',max:x.max??'',source:String(x.source||''),conditional:!!x.conditional}));
o.rows=obj.rows.map(x=>({...newRow(['text','list','photo','assessment','empty'].includes(x.type)?x.type:'empty'),text:String(x.text||''),command:String(x.command||''),system:String(x.system||''),method:String(x.method||''),assessment:['ok','not-ok'].includes(x.assessment)?x.assessment:'',severity:severityOptions.some(p=>p.value===x.severity)?x.severity:'',comment:String(x.comment||''),items:(Array.isArray(x.items)?x.items:[]).slice(0,1000).map(i=>({id:uid(),text:String(i.text||''),done:!!i.done})),photos:(Array.isArray(x.photos)?x.photos:[]).slice(0,150).map(cleanPhoto).filter(Boolean)}));if(!o.rows.length)o.rows=[newRow()];return o;
}
$('#backupButton').addEventListener('click',()=>GMINExport.exportFile(state,'planner','json'));
$('#restoreButton').addEventListener('click',()=>$('#restoreInput').click());
$('#restoreInput').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>80*1024*1024)throw Error('JSON acima de 80 MB');const next=normalizeImported(JSON.parse(await file.text()));if(!confirm('Substituir o documento atual pelo arquivo importado?'))return;state=next;hydrate();changed();await saveNow();toast('Instrução restaurada.');}catch(err){toast('Importação falhou: '+err.message);}});
$('#newButton').addEventListener('click',()=>{if(!confirm('Criar nova instrução? Exporte um backup JSON do documento atual antes de continuar.'))return;state=fresh();hydrate();changed();});
document.querySelectorAll('[data-export]').forEach(btn=>btn.addEventListener('click',()=>{const [profile,format]=btn.dataset.export.split(':');try{GMINExport.exportFile(state,profile,format);}catch(err){console.error(err);toast('Erro na exportação: '+err.message);}}));
$('#smartImportButton').addEventListener('click',()=>$('#importDialog').showModal());
$('#closeImport').addEventListener('click',()=>$('#importDialog').close());
$('#importDialog').addEventListener('close',()=>{parsed=null;$('#applyImport').disabled=true;});

function previewCandidate(){
 const p=parsed,pl=$('#parsePreview');
 const labor=p.labor.map((r,i)=>`<div class="preview-line"><input data-preview-labor="${i}" data-prop="count" type="number" min="1" step="1" value="${esc(r.count)}" style="width:60px" aria-label="Profissionais"> <input data-preview-labor="${i}" data-prop="role" value="${esc(r.role)}" style="width:132px" aria-label="Especialidade"> <input data-preview-labor="${i}" data-prop="hours" type="number" min="0" step="0.25" value="${esc(r.hours??'')}" style="width:68px" aria-label="Horas por profissional"> h</div>`).join('')||'<div class="preview-line">Não identificada</div>';
 const parts=p.parts.map((r,i)=>`<div class="preview-line preview-part"><div class="preview-part-fields"><input data-preview-part="${i}" data-prop="pn" value="${esc(r.pn)}" aria-label="Part Number" title="Part Number"><input data-preview-part="${i}" data-prop="description" value="${esc(r.description)}" aria-label="Descrição" title="Descrição"><input data-preview-part="${i}" data-prop="quantity" type="number" min="0" step="1" value="${esc(r.quantity)}" aria-label="Quantidade" title="Quantidade"></div><div class="preview-part-meta"><label><input data-preview-part="${i}" data-prop="conditional" type="checkbox" ${r.conditional?'checked':''}> Material condicional</label>${r.confidence==='baixa'?'<span>⚠ Conferir PN / quantidade</span>':''}</div>${r.mechanicComment?`<input data-preview-part="${i}" data-prop="mechanicComment" value="${esc(r.mechanicComment)}" title="Orientação ao mecânico" aria-label="Orientação ao mecânico">`:''}</div>`).join('')||'<div class="preview-line">Não identificadas</div>';
 pl.innerHTML=`<div class="preview-grid"><div><h3>Equipe (${p.labor.length})</h3><div class="preview-box">${labor}</div></div><div><h3>Peças (${p.parts.length})</h3><div class="preview-box">${parts}</div></div></div><h3>Duração total prevista (horas)</h3><input data-preview-duration type="number" min="0" step="0.25" value="${esc(p.duration??'')}" placeholder="Não informada" style="max-width:160px"><p class="preview-note">Duração de parada não é a soma das HH; deixe em branco quando desconhecida.</p><div class="preview-grid"><div><h3>Condição encontrada / histórico</h3><textarea id="remainingFailure" rows="8" aria-label="Condição encontrada">${esc(p.failure||'')}</textarea></div><div><h3>Comando do serviço / texto remanescente</h3><textarea id="remainingWork" rows="8" aria-label="Instrução de trabalho">${esc(p.work||'')}</textarea></div></div>${p.warnings.map(w=>`<p class="preview-warn">⚠ ${esc(w)}</p>`).join('')}${p.uncertain.length?`<h3>Linhas a revisar (mantidas no texto ou marcadas nas peças)</h3><div class="preview-box">${p.uncertain.map(v=>`<div class="preview-line">${esc(v.line)}</div>`).join('')}</div>`:''}`;
 pl.hidden=false;$('#applyImport').disabled=false;
}
$('#parseButton').addEventListener('click',()=>{const raw=$('#rawImport').value;if(!raw.trim()){toast('Cole o texto antes de analisar.');return;}parsed=GMINParser.parse(raw);previewCandidate();});
$('#parsePreview').addEventListener('input',e=>{
 if(!parsed)return;const el=e.target;
 if(el.hasAttribute('data-preview-labor'))parsed.labor[Number(el.dataset.previewLabor)][el.dataset.prop]=el.value;
 if(el.hasAttribute('data-preview-part')){
   const part=parsed.parts[Number(el.dataset.previewPart)];
   part[el.dataset.prop]=el.dataset.prop==='conditional'?el.checked:el.value;
 }
 if(el.hasAttribute('data-preview-duration'))parsed.duration=el.value;
 if(el.id==='remainingFailure')parsed.failure=el.value;
 if(el.id==='remainingWork')parsed.work=el.value;
});
$('#parsePreview').addEventListener('change',e=>{if(!parsed)return;const el=e.target;if(el.dataset.prop==='conditional')parsed.parts[Number(el.dataset.previewPart)].conditional=el.checked;});
$('#applyImport').addEventListener('click',()=>{
 if(!parsed)return;
 const additive=$('#appendImport').checked;
 if(!additive){state.labor=[];state.parts=[];state.failure='';state.work='';state.meta.duration='';}
 for(const l of parsed.labor)state.labor.push({id:uid(),role:l.role,count:l.count,hours:l.hours??'',source:l.source});
 for(const p of parsed.parts){
   const note=p.conditional
     ?[p.mechanicComment,'MATERIAL CONDICIONAL: confirmar necessidade após inspeção.'].filter(Boolean).join(' ')
     :p.mechanicComment||'';
   state.parts.push({id:uid(),pn:p.pn,description:p.description,quantity:p.quantity,mechanicComment:note,plannerComment:p.conditional?'Item condicional: verificar necessidade em campo.':'',mrp:'',min:'',max:'',source:p.source,conditional:!!p.conditional});
 }
 if(parsed.duration!==null&&parsed.duration!=='')state.meta.duration=String(parsed.duration);
 if(parsed.failure)state.failure=[state.failure,parsed.failure].filter(Boolean).join('\n\n');
 if(parsed.work)state.work=[state.work,parsed.work].filter(Boolean).join('\n\n');
 const msg=`Importados: ${parsed.labor.length} recursos, ${parsed.parts.length} materiais. Confira a prévia e os itens condicionais.`;
 $('#importDialog').close();hydrate();changed();toast(msg);
});
rowsEl.addEventListener('paste',async e=>{const row=getRow(e.target);if(!row||row.type!=='photo')return;const files=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;e.preventDefault();for(const f of files){try{row.photos.push({id:uid(),caption:'Imagem colada',...await encodeImage(f)});}catch(err){toast('Falha ao colar imagem.');}}render();changed();});
window.addEventListener('pagehide',()=>{if(saveTimer)saveNow();});
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installButton').hidden=false;});$('#installButton').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else{toast('No Chrome, abra ⋮ → Instalar aplicativo (se disponível).');}});
async function init(){$('#brandLogo').src=window.GMIN_LOGO_DATA||'';try{const data=await GMINStorage.load();if(data)state=normalizeImported(data);}catch(e){console.warn('Armazenamento indisponível',e);setStatus('⚠ Erro de armazenamento',true);}loading=false;hydrate();setStatus('● Pronto para editar');if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js').catch(console.warn);}
init();
})();