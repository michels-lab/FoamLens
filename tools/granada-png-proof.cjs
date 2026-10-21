'use strict';
// Dependency-free PNG structure, integrity and non-blank pixel check for native QA.
// Screenshots come from installed application, never fabricated by this validator.
const zlib=require('node:zlib');
function crc32(b){
 let crc=-1;
 for(let i=0;i<b.length;i++){
  crc^=b[i];
  for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^(-1))>>>0;
}
function imageStatus(data){
 if(!Buffer.isBuffer(data)||data.length<75||data.length>24*1024*1024||
  data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return null;
 let offset=8,width=0,height=0,channels=0,hadIHDR=false,hadIEND=false,ids=[];
 try{
  while(offset+12<=data.length){
   const size=data.readUInt32BE(offset),start=offset+8,end=start+size;
   if(size>24*1024*1024||end+4>data.length)return null;
   const type=data.toString('ascii',offset+4,offset+8);
   if(crc32(data.subarray(offset+4,end))!==data.readUInt32BE(end))return null;
   if(!hadIHDR&&type!=='IHDR')return null;
   if(type==='IHDR'){
    if(hadIHDR||size!==13)return null;
    width=data.readUInt32BE(start);height=data.readUInt32BE(start+4);
    const bit=data[start+8],color=data[start+9];
    if(width<320||height<240||width*height>6*1024*1024||bit!==8||
     ![2,6].includes(color)||data[start+10]!==0||data[start+11]!==0||data[start+12]!==0)return null;
    channels=color===6?4:3;hadIHDR=true;
   }else if(type==='IDAT'){
    if(!hadIHDR||hadIEND)return null;
    ids.push(data.subarray(start,end));
   }else if(type==='IEND'){
    if(size!==0||!ids.length||end+4!==data.length)return null;
    hadIEND=true;break;
   }else if(/^[A-Z]/.test(type)&&type!=='PLTE')return null;
   offset=end+4;
  }
  if(!hadIEND)return null;
  const stride=width*channels,total=(stride+1)*height;
  if(total>30*1024*1024)return null;
  const raw=zlib.inflateSync(Buffer.concat(ids),{maxOutputLength:30*1024*1024});
  if(raw.length!==total)return null;
  const row=Buffer.allocUnsafe(stride),previous=Buffer.alloc(stride);
  let first=null,variety=0,nontransparent=false;
  for(let y=0;y<height;y++){
   const filter=raw[y*(stride+1)];
   if(filter>4)return null;
   const offset=y*(stride+1)+1;
   for(let x=0;x<stride;x++){
    const encoded=raw[offset+x],left=x>=channels?row[x-channels]:0,up=previous[x],ul=x>=channels?previous[x-channels]:0;
    let p=0;
    if(filter===1)p=left;
    else if(filter===2)p=up;
    else if(filter===3)p=Math.floor((left+up)/2);
    else if(filter===4){
     const guess=left+up-ul,da=Math.abs(guess-left),db=Math.abs(guess-up),dc=Math.abs(guess-ul);
     p=da<=db&&da<=dc?left:db<=dc?up:ul;
    }
    row[x]=(encoded+p)&255;
   }
   for(let x=0;x<stride;x+=channels){
    const pixel=((row[x]*257+row[x+1])*257+row[x+2])>>>0;
    if(first===null)first=pixel;
    else if(pixel!==first)variety++;
    if(channels===3||row[x+3]>0)nontransparent=true;
   }
   row.copy(previous);
  }
  return variety>25&&nontransparent?{width,height,diversePixels:true}:null;
 }catch{return null;}
}
module.exports={crc32,imageStatus};
