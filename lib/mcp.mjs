import { boundedText,validateInput,decide,SafeError,MODEL } from './jev.mjs';
import { reserveQuota,LIMITS } from './quota.mjs';
const question={oneOf:[{type:'object',properties:{type:{const:'choice'},instructions:{type:'string',minLength:1,maxLength:4000},criteria:{type:'object',minProperties:2,maxProperties:255,additionalProperties:{type:'string'}}},required:['type','instructions','criteria'],additionalProperties:false},{type:'object',properties:{type:{const:'score'},instructions:{type:'string',minLength:1,maxLength:4000},criteria:{type:'array',minItems:2,maxItems:10,items:{type:'string'}}},required:['type','instructions','criteria'],additionalProperties:false},{type:'object',properties:{type:{const:'noul'},instructions:{type:'string',minLength:1,maxLength:4000},criteria:{type:'object',properties:{true:{type:'string'},false:{type:'string'}},required:['true','false'],additionalProperties:false}},required:['type','instructions'],additionalProperties:false}]};
export const TOOLS=[{name:'jev_decide',description:'Use Jev for explicit structured qualitative judgments: classify among named options (choice), score ordered levels (score), or assess a yes/no proposition (noul). Batch 1–10 independent questions about shared supplied text. Sends text to TypeSafe and consumes owner API usage. Not for factual retrieval, arithmetic, secrets, TSA information, or estimating validated real-world event frequencies. Probability and confidence express model judgment, not calibrated truth. Do not call without a concrete decision rubric.',inputSchema:{type:'object',properties:{state:{type:'string',minLength:1,maxLength:24000},questions:{type:'object',minProperties:1,maxProperties:10,propertyNames:{pattern:'^[A-Za-z][A-Za-z0-9_-]{0,63}$'},additionalProperties:question}},required:['state','questions'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:false,openWorldHint:true}},{name:'jev_status',description:'Read whether this private Jev deployment is configured, its model and fixed usage limits. Never reveals the credential and makes no TypeSafe request.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const result=(id,data)=>json({jsonrpc:'2.0',id,result:data});
const rpcError=(id,code,message,status=200)=>json({jsonrpc:'2.0',id,error:{code,message}},status);
const toolResult=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
export async function handleMcp(request,env,dependencies={}) {
 if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
 const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)return rpcError(null,-32000,'Origin not allowed.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))return rpcError(null,-32600,'Use application/json.',415);
 let msg;try{msg=JSON.parse(await boundedText(request,65536));}catch{return rpcError(null,-32700,'Invalid or oversized JSON.',400);}
 if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||typeof msg.method!=='string'||(msg.id!==undefined&&typeof msg.id!=='string'&&typeof msg.id!=='number'))return rpcError(null,-32600,'Invalid JSON-RPC request.');
 const id=msg.id??null;
 if(msg.id===undefined)return new Response(null,{status:202});
 const version=request.headers.get('mcp-protocol-version');if(version&&version!=='2025-06-18')return rpcError(id,-32600,'Unsupported protocol version.',400);
 if(msg.method==='initialize'&&(!msg.params||typeof msg.params.protocolVersion!=='string'||!msg.params.capabilities||typeof msg.params.clientInfo?.name!=='string'||typeof msg.params.clientInfo?.version!=='string'))return rpcError(id,-32602,'Initialization parameters are required.');
 if(msg.method==='initialize')return result(id,{protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'jev-decisions',version:'1.0.0'},instructions:'Jev provides model judgments, not validated event-frequency distributions. Use only non-sensitive personal experiment data.'});
 if(msg.method==='notifications/initialized')return new Response(null,{status:202});
 if(msg.method==='ping')return result(id,{});
 if(msg.method==='tools/list')return result(id,{tools:TOOLS});
 if(msg.method!=='tools/call')return rpcError(id,-32601,'Method not found.');
 // The private Sites boundary authenticates and supplies this header. Never deploy behind an untrusted header-forwarding proxy.
 if(!request.headers.get('oai-authenticated-user-id'))return rpcError(id,-32001,'An authenticated ChatGPT user is required.',401);
 const name=msg.params?.name,args=msg.params?.arguments??{};
 if(name==='jev_status')return result(id,toolResult({configured:Boolean(env.JEV_API_KEY),model:env.JEV_MODEL||MODEL,limits:LIMITS}));
 if(name!=='jev_decide')return rpcError(id,-32602,'Unknown tool.');
 try {
  validateInput(args);
  if(!env.JEV_API_KEY)throw new SafeError('NOT_CONFIGURED','The owner must configure JEV_API_KEY in Sites Settings.',503);
  const usage=await reserveQuota(env.DB,Object.keys(args.questions).length,dependencies.now?.());
  const answer=await decide(args,env,dependencies.fetcher);
  return result(id,toolResult({...answer,local_usage:usage}));
 } catch(e) {const safe=e instanceof SafeError?e:new SafeError('INTERNAL_ERROR','The request could not be completed.',500);return result(id,{isError:true,...toolResult({error:{code:safe.code,message:safe.message},retryAutomatically:false})});}
}
