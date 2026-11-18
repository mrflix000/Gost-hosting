export function manifest(runtime,name){
 const safe=name.toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,40)||"my-app";
 if(runtime==="node")return {"package.json":JSON.stringify({name:safe,version:"1.0.0",scripts:{start:"node index.js"}},null,2),"index.js":"console.log('Hello from GHOST HOSTING');\n"};
 if(runtime==="python")return {"requirements.txt":"", "main.py":"print('Hello from GHOST HOSTING')\n"};
 if(runtime==="php")return {"index.php":"<?php\necho 'Hello from GHOST HOSTING';\n"};
 throw Object.assign(new Error("Unsupported runtime"),{status:400});
}
