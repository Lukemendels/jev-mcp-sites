// TypeSafe official HTTP API adapter. No SDK, provider URL or headers from callers.
export const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const MODEL = 'jev-1.13.0';
export class SafeError extends Error { constructor(code, message, status=400) { super(message); this.code=code; this.status=status; } }
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (x,max=4000) => typeof x==='string' && x.trim().length>0 && x.length<=max;
export function validateInput(input) {
  if (!object(input) || Object.keys(input).some(k=>!['state','questions'].includes(k))) throw new SafeError('INVALID_INPUT','Only state and questions are accepted.');
  if (!text(input.state,24000) || !object(input.questions)) throw new SafeError('INVALID_INPUT','State must be nonempty text (up to 24000 characters) and questions an object.');
  const entries=Object.entries(input.questions);
  if (!entries.length || entries.length>10) throw new SafeError('INVALID_INPUT','Supply 1–10 independent questions.');
  for (const [id,q] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id) || !object(q) || Object.keys(q).some(k=>!['type','instructions','criteria'].includes(k)) || !text(q.instructions)) throw new SafeError('INVALID_INPUT','Each question needs a safe ID and explicit instructions.');
    if (q.type==='choice') {
      if (!object(q.criteria) || Object.keys(q.criteria).length<2 || Object.keys(q.criteria).length>255 || Object.entries(q.criteria).some(([k,v])=>!text(k,100)||!text(v))) throw new SafeError('INVALID_INPUT','Choice requires 2–255 named criteria with descriptions.');
    } else if (q.type==='score') {
      if (!Array.isArray(q.criteria) || q.criteria.length<2 || q.criteria.length>10 || q.criteria.some(x=>!text(x))) throw new SafeError('INVALID_INPUT','Score requires 2–10 ordered descriptions.');
    } else if (q.type==='noul') {
      if (q.criteria!==undefined && (!object(q.criteria) || Object.keys(q.criteria).sort().join(',')!=='false,true' || !text(q.criteria.true)||!text(q.criteria.false))) throw new SafeError('INVALID_INPUT','Noul criteria, if present, must describe true and false.');
    } else throw new SafeError('INVALID_INPUT','Question type must be choice, score or noul.');
  }
  return input;
}
export async function boundedText(response,limit) {
  if (Number(response.headers.get('content-length'))>limit) throw new SafeError('PAYLOAD_TOO_LARGE','Payload exceeds the supported size.',413);
  const reader=response.body?.getReader(); if(!reader) return '';
  const chunks=[];let n=0;
  try { for(;;) {const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>limit)throw new SafeError('PAYLOAD_TOO_LARGE','Payload exceeds the supported size.',413);chunks.push(value);} }
  finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(n);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}return new TextDecoder().decode(bytes);
}
const sameKeys=(value,keys)=>Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const probability=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
export function validateOutput(data,questions) {
  const bad=()=>{throw new SafeError('INVALID_UPSTREAM_RESPONSE','Jev returned an unexpected response; no result was accepted.',502);};
  if(!object(data)||!object(data.answers)||!sameKeys(data.answers,Object.keys(questions)))bad();
  const answers={};
  for(const [id,q]of Object.entries(questions)) {
    const a=data.answers[id];if(!object(a)||a.type!==q.type)bad();
    if(q.type==='noul'){if(!probability(a.noul))bad();answers[id]={type:'noul',noul:a.noul};continue;}
    if(!object(a.probabilities)||!probability(a.confidence))bad();
    const expected=q.type==='choice'?Object.keys(q.criteria):q.criteria.map((_,i)=>String(i));
    if(!sameKeys(a.probabilities,expected)||Object.values(a.probabilities).some(p=>!probability(p))||Math.abs(Object.values(a.probabilities).reduce((x,y)=>x+y,0)-1)>.01)bad();
    if(q.type==='choice'){if(typeof a.choice!=='string'||!Object.hasOwn(q.criteria,a.choice))bad();answers[id]={type:'choice',choice:a.choice,probabilities:a.probabilities,confidence:a.confidence};}
    else {if(typeof a.score!=='number'||!Number.isFinite(a.score)||a.score<0||a.score>q.criteria.length-1||!object(a.legend)||!sameKeys(a.legend,expected)||q.criteria.some((v,i)=>a.legend[String(i)]!==v))bad();answers[id]={type:'score',score:a.score,legend:a.legend,probabilities:a.probabilities,confidence:a.confidence};}
  }
  if(!object(data.usage)||!Number.isInteger(data.usage.input_tokens)||data.usage.input_tokens<0||!Number.isInteger(data.usage.output_tokens)||data.usage.output_tokens<0)bad();
  return {answers,usage:{input_tokens:data.usage.input_tokens,output_tokens:data.usage.output_tokens}};
}
export async function decide(input,env,fetcher=fetch) {
  validateInput(input);
  if(!env.JEV_API_KEY)throw new SafeError('NOT_CONFIGURED','The owner must configure JEV_API_KEY in Sites Settings.',503);
  let response;
  try { response=await fetcher(ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${env.JEV_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.JEV_MODEL||MODEL,...input}),redirect:'manual',signal:AbortSignal.timeout(20000)}); }
  catch { throw new SafeError('UPSTREAM_UNAVAILABLE','Jev could not be reached or timed out. The outcome may be unknown; no automatic retry was made.',502); }
  if(response.status>=300&&response.status<400){await response.body?.cancel();throw new SafeError('JEV_REDIRECT_BLOCKED','Jev returned a redirect; it was blocked without forwarding credentials.',502);}
  if(!response.ok) { await response.body?.cancel();const codes={401:['JEV_AUTH_FAILED','The configured Jev credential was rejected.'],422:['JEV_VALIDATION_FAILED','Jev rejected the request schema.'],429:['JEV_RATE_LIMITED','Jev rate-limited this request.'],529:['JEV_OVERLOADED','Jev is temporarily overloaded.']}; const [code,msg]=codes[response.status]||['JEV_ERROR','Jev returned an error.'];throw new SafeError(code,msg,502); }
  let data;try{data=JSON.parse(await boundedText(response,262144));}catch{throw new SafeError('INVALID_UPSTREAM_RESPONSE','Jev returned an unreadable or oversized response.',502);}
  return {...validateOutput(data,input.questions),requested_model:env.JEV_MODEL||MODEL,...(typeof data.model==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(data.model)?{model:data.model}:{}),interpretation:'Model judgment probabilities are not validated event frequencies. Confidence measures distribution concentration, not proven accuracy.'};
}
