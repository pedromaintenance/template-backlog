/* IndexedDB: one atomic document, including locally resized photos. */
(function(global){'use strict';
const NAME='gmin-instrucoes-v1',STORE='documents',KEY='current';let dbPromise=null;
function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in global))return reject(Error('IndexedDB indisponível'));
  const req=indexedDB.open(NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});return dbPromise;}
async function load(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
async function save(state){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(state,KEY);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error||Error('Falha ao salvar'));t.onabort=()=>reject(t.error||Error('Salvamento cancelado'));});}
global.GMINStorage={load,save};
})(window);
