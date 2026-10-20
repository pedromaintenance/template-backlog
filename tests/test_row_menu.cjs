/* UI smoke test without external DOM dependencies: evaluates the actual menu/delete handlers. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

function between(start,end) {
 const a=code.indexOf(start); assert.ok(a>=0, 'Missing '+start);
 const b=code.indexOf(end,a+start.length); assert.ok(b>a, 'Missing '+end);
 return code.slice(a,b);
}

function fakeRow(){
 const classes=new Set();
 const trigger={
   attributes:new Map(),
   setAttribute(name,value){this.attributes.set(name,value)},
 };
 const container={
   classList:{
     toggle(cls,on){if(on)classes.add(cls);else classes.delete(cls)},
     contains(cls){return classes.has(cls)}
   },
 };
 const menu={
   hidden:true,
   previousElementSibling:trigger,
   closest(selector){assert.equal(selector,'.row-unit');return container}
 };
 trigger.nextElementSibling=menu;
 return {menu,trigger,container};
}

const first=fakeRow(),second=fakeRow(),rows=[first,second];
const rowsEl={querySelectorAll(selector){assert.equal(selector,'.row-menu');return rows.map(x=>x.menu)}};
const closeSource=between('function closeMenus(except = null) {','function mutateRow(');
const makeClose=new Function('rowsEl', closeSource+'; return closeMenus;');
const closeMenus=makeClose(rowsEl);
const actionSource=between("if (action === 'menu') {","if (action === 'insert')");
const toggle=new Function('button','closeMenus', "const action='menu';"+actionSource);
assert.match(code,/data-action="delete"/);
assert.match(code,/aria-expanded="false"/);
assert.match(code,/aria-controls="row-menu-/);

toggle(first.trigger,closeMenus);
assert.equal(first.menu.hidden,false,'Three-dot button opens first menu');
assert.equal(first.trigger.attributes.get('aria-expanded'),'true','Open state accessible');
assert.equal(first.container.classList.contains('menu-open'),true,'Open row is layered above siblings');

toggle(second.trigger,closeMenus);
assert.equal(first.menu.hidden,true,'Opening second menu closes first');
assert.equal(second.menu.hidden,false);
assert.equal(first.trigger.attributes.get('aria-expanded'),'false');
toggle(second.trigger,closeMenus);
assert.equal(second.menu.hidden,true,'Clicking three dots again closes its menu');
toggle(first.trigger,closeMenus);
closeMenus();
assert.equal(first.menu.hidden,true,'Outside click/Escape close helper hides menu');

// Test the actual deleteRow logic; content-bearing blocks require user confirmation.
const deleteSource=between('function deleteRow(row) {','function duplicate(row) {');
function createDeleteHarness(decision) {
 const state={rows:[
   {id:'photo-1',type:'photo',photos:[{dataUrl:'data:image/png;base64,AAA'}]},
   {id:'text-2',type:'text',text:'Serviço observado'}
 ]};
 let asked=0,rendered=0,changed=0;
 const confirm=()=>{asked++;return decision};
 const deleteRow=new Function('state','confirm','newRow','changed','render',deleteSource+';return deleteRow;')(
   state,confirm,()=>({type:'empty'}),()=>changed++,()=>rendered++
 );
 return {state,deleteRow,stats:()=>({asked,rendered,changed})};
}
const cancelled=createDeleteHarness(false);
cancelled.deleteRow(cancelled.state.rows[0]);
assert.equal(cancelled.state.rows.length,2,'Declining confirmation preserves photo row');
assert.equal(cancelled.stats().asked,1);
const accepted=createDeleteHarness(true);
accepted.deleteRow(accepted.state.rows[0]);
assert.equal(accepted.state.rows.length,1,'Confirmed delete removes only selected row');
assert.equal(accepted.state.rows[0].id,'text-2','Next block is retained');
assert.equal(accepted.stats().changed,1,'Delete triggers persistence');
assert.equal(accepted.stats().rendered,1,'Delete re-renders evidence blocks');

console.log('OK — three-dot context menu, ARIA, one-at-a-time display and safe row deletion.');
