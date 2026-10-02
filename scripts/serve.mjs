import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.BLOG_PORT||5174);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.pdf':'application/pdf','.csv':'text/csv','.xml':'application/xml'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
    if(!file.startsWith(root)||!((await stat(file)).isFile())){res.writeHead(404).end();return;}
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(bytes);
  }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Article preview: http://127.0.0.1:${port}/`));
