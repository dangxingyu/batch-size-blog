import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const html=await readFile(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
  const url=match[1].split(/[?#]/)[0];
  if(/^[a-z]+:|^\/\//i.test(url))continue;
  const file=await stat(path.join(root,url));
  if(!file.isFile())throw new Error(`Missing article asset: ${url}`);
}
const destination=path.join(root,'dist');
await rm(destination,{recursive:true,force:true});
await mkdir(destination);
for(const name of ['index.html','batch-size','sitemap.xml'])await cp(path.join(root,name),path.join(destination,name),{recursive:true});
await writeFile(path.join(destination,'.nojekyll'),'');
console.log('Built standalone article with verified local asset links.');
