import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
export function database(file=':memory:'){
 const db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys=ON');
 for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
  db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){db.exec(fs.readFileSync('drizzle/'+name,'utf8'));db.prepare('INSERT INTO local_migrations VALUES (?)').run(name)}
 }
 return {raw:db,prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return db.prepare(sql).get(...this.args)||null},async all(){return {results:db.prepare(sql).all(...this.args)}},async run(){const r=db.prepare(sql).run(...this.args);return {success:true,meta:{changes:r.changes}}}}},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};
}
export function assets(root='dist/client'){
 return {async fetch(request){const name=new URL(request.url).pathname==='/'?'/index.html':new URL(request.url).pathname;if(name.includes('..'))return new Response('not found',{status:404});try{const bytes=fs.readFileSync(root+name);const type=name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.webp')?'image/webp':name.endsWith('.gif')?'image/gif':'application/octet-stream';return new Response(bytes,{headers:{'content-type':type}})}catch{return new Response('not found',{status:404})}}};
}
