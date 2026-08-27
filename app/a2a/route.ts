import { callTool, handleError, Json, makeId, now, readBody, response, tools } from '@/lib/polity';

export async function POST(req: Request) {
  try {
    const input = await readBody(req); const message = (input.message as Json) ?? ((input.params as Json)?.message as Json) ?? {}; const parts = Array.isArray(message.parts) ? message.parts as Json[] : [];
    const dataPart = parts.find((part) => typeof part.data === 'object')?.data as Json | undefined; const action = dataPart?.tool ?? dataPart?.action; const taskId = makeId('task');
    if (typeof action !== 'string') return response({task:{id:taskId,contextId:String(message.contextId ?? makeId('ctx')),status:{state:'TASK_STATE_INPUT_REQUIRED',timestamp:now(),message:{role:'ROLE_AGENT',messageId:makeId('msg'),parts:[{text:'Send a data part with {tool, arguments}. Available tools: '+tools.map((tool)=>tool.name).join(', ')}]}}}});
    const result = await callTool(action, (dataPart?.arguments as Json) ?? {}, req);
    return response({task:{id:taskId,contextId:String(message.contextId ?? makeId('ctx')),status:{state:'TASK_STATE_COMPLETED',timestamp:now()},artifacts:[{artifactId:makeId('art'),name:`${action} result`,parts:[{data:result},{text:JSON.stringify(result)}]}]}});
  } catch (error) { return handleError(error); }
}
