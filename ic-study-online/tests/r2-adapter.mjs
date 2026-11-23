import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function bucket(directory){
 const values=new Map();
 if(directory)fs.mkdirSync(directory,{recursive:true});
 const base=key=>path.join(directory,createHash('sha256').update(key).digest('hex'));
 function get(key){
  if(!directory)return values.get(key)||null;
  try{const item=JSON.parse(fs.readFileSync(base(key)+'.json','utf8'));item.bytes=fs.readFileSync(base(key)+'.bin');return item}catch{return null}
 }
 function metadata(item){if(!item)return null;const {bytes,...rest}=item;return {...rest,uploaded:new Date(rest.uploaded)};}
 return {
  async head(key){return metadata(get(key))},
  async get(key){const item=get(key);return item?{...metadata(item),body:new Blob([item.bytes]).stream()}:null},
  async put(key,value,options={}){
   const previous=get(key),condition=options.onlyIf;
   if(condition?.etagMatches&&previous?.etag!==condition.etagMatches)return null;
   if(condition?.etagDoesNotMatch==='*'&&previous)return null;
   const bytes=typeof value==='string'?Buffer.from(value):value instanceof Blob?Buffer.from(await value.arrayBuffer()):Buffer.from(value);
   const etag=createHash('md5').update(bytes).digest('hex'),item={key,bytes,etag,httpEtag:'"'+etag+'"',size:bytes.length,uploaded:new Date().toISOString(),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}};
   if(directory){fs.writeFileSync(base(key)+'.bin',bytes);const {bytes:_,...meta}=item;fs.writeFileSync(base(key)+'.json',JSON.stringify(meta));}else values.set(key,item);
   return metadata(item);
  },
  async delete(key){if(directory){for(const extension of ['.json','.bin'])fs.rmSync(base(key)+extension,{force:true})}else values.delete(key);}
 };
}
