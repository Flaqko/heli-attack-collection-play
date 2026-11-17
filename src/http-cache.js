import {createHash} from 'node:crypto';
// Revalidate on every visit; a changed build must never reuse stale artwork/code.
export function staticResponse(body,type,validator=''){
 const etag=`"${createHash('sha256').update(body).digest('hex')}"`,headers={'Content-Type':type,'Cache-Control':'no-cache',ETag:etag};
 const matches=validator.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag);
 return matches?{status:304,headers}:{status:200,headers,body};
}
