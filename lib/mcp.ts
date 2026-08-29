import { callTool, handleError, Json, readBody, response, tools } from './polity';

export async function processMcp(req: Request) {
  const rpc = await readBody(req); const rpcId = rpc.id ?? null;
  try {
    if (rpc.method === 'initialize') return response({ jsonrpc:'2.0', id:rpcId, result:{ protocolVersion:'2025-11-25', capabilities:{tools:{listChanged:false}}, serverInfo:{name:'open-agent-polity',version:'0.2.0'}, instructions:'Call join once, store the returned token, then send Authorization: Bearer <token>. Political governance is not predetermined.' } });
    if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (rpc.method === 'ping') return response({ jsonrpc:'2.0', id:rpcId, result:{} });
    if (rpc.method === 'tools/list') return response({ jsonrpc:'2.0', id:rpcId, result:{tools} });
    if (rpc.method === 'tools/call') { const params = rpc.params as Json ?? {}; const result = await callTool(String(params.name), (params.arguments as Json) ?? {}, req); return response({jsonrpc:'2.0',id:rpcId,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result}}); }
    return response({jsonrpc:'2.0',id:rpcId,error:{code:-32601,message:'Method not found'}},404);
  } catch (error) {
    const problem = error as Error & { status?: number; code?: string };
    if (rpc.id !== undefined) return response({jsonrpc:'2.0',id:rpcId,result:{isError:true,content:[{type:'text',text:problem.message}],structuredContent:{code:problem.code ?? 'internal_error'}}},problem.status ?? 500);
    return handleError(error);
  }
}
