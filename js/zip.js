/* ZIP writer without external dependencies; STORE method, UTF-8 filenames. */
(function(global){'use strict';
  const encoder=new TextEncoder();
  const crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function join(parts){const len=parts.reduce((a,p)=>a+p.length,0),out=new Uint8Array(len);let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}return out;}
  function dosTime(date){return ((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);}
  function dosDate(date){return ((Math.max(1980,date.getFullYear())-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();}
  function header(size){const a=new Uint8Array(size);return [a,new DataView(a.buffer)];}
  function pack(entries){const chunks=[],center=[];let offset=0;const now=new Date();
    for(const entry of entries){let data=typeof entry.data==='string'?encoder.encode(entry.data):entry.data;if(data instanceof ArrayBuffer)data=new Uint8Array(data);if(!(data instanceof Uint8Array))throw new Error('Arquivo ZIP inválido: '+entry.name);
      const name=encoder.encode(entry.name),crc=crc32(data),len=data.length,time=dosTime(now),date=dosDate(now);if(len>0xffffffff)throw new Error('Arquivo muito grande');
      let [local,l]=header(30);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(8,0,true);l.setUint16(10,time,true);l.setUint16(12,date,true);l.setUint32(14,crc,true);l.setUint32(18,len,true);l.setUint32(22,len,true);l.setUint16(26,name.length,true);
      chunks.push(local,name,data);
      let [central,c]=header(46);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(10,0,true);c.setUint16(12,time,true);c.setUint16(14,date,true);c.setUint32(16,crc,true);c.setUint32(20,len,true);c.setUint32(24,len,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      center.push(central,name);offset+=local.length+name.length+data.length;
    }
    const centerBlob=join(center);let [end,v]=header(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centerBlob.length,true);v.setUint32(16,offset,true);
    return new Blob([...chunks,centerBlob,end],{type:'application/zip'});
  }
  global.GMINZip={pack};
})(window);
