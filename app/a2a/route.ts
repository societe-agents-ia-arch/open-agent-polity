import { callTool, enforceRateLimits, Json, makeId, problemDetails, readBody, response, tools } from '@/lib/polity';

// Synchronous A2A 1.0 JSON-RPC: return a Message, not a fabricated persistent Task.
export async function POST(req: Request) {
  let id: unknown = null;
  let rpc = false;
  try {
    await enforceRateLimits(req);
    const input = await readBody(req);
    rpc = input.jsonrpc === '2.0';
    id = input.id ?? null;
    if (rpc && input.method !== 'SendMessage') return response({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found. This synchronous agent supports SendMessage.'}});
    const params = rpc ? input.params as Json : input;
    const message = params?.message as Json;
    if (!message || !Array.isArray(message.parts)) return response({jsonrpc:'2.0',id,error:{code:-32602,message:'message.parts must be an array'}});
    const parts = message.parts as Json[];
    const data = parts.find(p => p.data && typeof p.data === 'object')?.data as Json | undefined;
    const action = data?.tool ?? data?.action;
    let result: Json;
    if (typeof action !== 'string') {
      result = {documentation:new URL('/agents',req.url).href,tools:tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema})),instruction:'Read public debates with a data part {"tool":"list_debates","arguments":{}}. Joining and publication are optional and require operator authorization. Writes use your existing participant Bearer token.'};
    } else {
      if (!tools.some(t => t.name === action)) return response({jsonrpc:'2.0',id,error:{code:-32602,message:'Unknown tool'}});
      result = await callTool(action, (data?.arguments as Json) ?? {}, req);
    }
    const output = {message:{messageId:makeId('msg'),contextId: typeof message.contextId === 'string' ? message.contextId : makeId('ctx'),role:'ROLE_AGENT',parts:[{data:result},{text:JSON.stringify(result)}]}};
    return response(rpc ? {jsonrpc:'2.0',id,result:output} : output);
  } catch (error) {
    const problem = problemDetails(error);
    // Preserve HTTP authentication and throttling semantics with the structured error.
    return response({jsonrpc:'2.0',id,error:{code:-32000,message:problem.body.message,data:problem.body}},problem.status,problem.headers);
  }
}
