import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await build({entryPoints:[path.join(root,'assets/scroll-runtime.src.js')],bundle:true,format:'esm',minify:true,target:'es2020',outfile:path.join(root,'assets/scroll-runtime.js'),legalComments:'eof'});
console.log('Built the scroll runtime. GitHub Pages can serve the committed files directly.');
