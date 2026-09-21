import { A2A_PROTOCOL_VERSION, errorInfo, invalidParams, isJsonObject, parseA2aEnvelope, requestedA2aVersion, rpcError, validateSendMessage } from '@/lib/a2a-protocol';
import { callTool, enforceRateLimits, makeId, problemDetails, response, tools } from '@/lib/polity';

const a2aResponse = (body: unknown, status = 200, headers: HeadersInit = {}) => response(body, status, { 'A2A-Version': A2A_PROTOCOL_VERSION, ...headers });
const pushMethods = new Set(['CreateTaskPushNotificationConfig', 'GetTaskPushNotificationConfig', 'ListTaskPushNotificationConfigs', 'DeleteTaskPushNotificationConfig']);

function taskNotFound(id: string | number, taskId: unknown) {
  return rpcError(id, -32001, 'Task not found', [errorInfo('TASK_NOT_FOUND', { taskId: typeof taskId === 'string' ? taskId : '' })]);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type,a2a-version,a2a-extensions',
    'access-control-allow-methods': 'POST,OPTIONS',
  } });
}

// A2A 1.0 JSON-RPC binding. This agent is synchronous and intentionally does not persist A2A Tasks.
export async function POST(req: Request) {
  let id: string | number | null = null;
  try {
    await enforceRateLimits(req);

    let input: unknown;
    try { input = await req.json(); }
    catch { return a2aResponse(rpcError(null, -32700, 'Invalid JSON payload'), 400); }

    const envelope = parseA2aEnvelope(input);
    if (!envelope.ok) return a2aResponse(envelope.response, 400);
    id = envelope.id;

    const version = requestedA2aVersion(req.headers.get('a2a-version'));
    if (version !== A2A_PROTOCOL_VERSION) {
      return a2aResponse(rpcError(id, -32009, 'Version not supported', [errorInfo('VERSION_NOT_SUPPORTED', {
        requestedVersion: version,
        supportedVersions: A2A_PROTOCOL_VERSION,
      })]), 400);
    }

    const { method, params } = envelope;
    if (method === 'SendMessage') {
      const validated = validateSendMessage(id, params);
      if (!validated.ok) return a2aResponse(validated.response, 400);
      const { message, parts } = validated;
      const data = parts.find((part) => isJsonObject(part.data))?.data as Record<string, unknown> | undefined;
      const action = data?.tool ?? data?.action;
      let result: Record<string, unknown>;

      if (action === undefined) {
        result = {
          documentation: new URL('/agents', req.url).href,
          tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
          instruction: 'Read public debates with a data part {"tool":"list_debates","arguments":{}}. Joining and publication are optional and require operator authorization. Writes use your existing participant Bearer token.',
        };
      } else {
        if (typeof action !== 'string' || !action.trim()) return a2aResponse(invalidParams(id, 'message.parts.data.tool', 'tool must be a non-empty string'), 400);
        if (!tools.some((tool) => tool.name === action)) return a2aResponse(invalidParams(id, 'message.parts.data.tool', 'unknown tool; inspect the Agent Card or send a message without a tool to receive the catalogue'), 400);
        const args = data?.arguments ?? {};
        if (!isJsonObject(args)) return a2aResponse(invalidParams(id, 'message.parts.data.arguments', 'arguments must be an object'), 400);
        result = await callTool(action, args, req);
      }

      const output = { message: {
        messageId: makeId('msg'),
        contextId: typeof message.contextId === 'string' && message.contextId ? message.contextId : makeId('ctx'),
        role: 'ROLE_AGENT',
        parts: [{ data: result, mediaType: 'application/json' }, { text: JSON.stringify(result) }],
      } };
      return a2aResponse({ jsonrpc: '2.0', id, result: output });
    }

    if (method === 'ListTasks') {
      const pageSize = params.pageSize === undefined ? 50 : Number(params.pageSize);
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return a2aResponse(invalidParams(id, 'pageSize', 'pageSize must be an integer from 1 to 100'), 400);
      return a2aResponse({ jsonrpc: '2.0', id, result: { tasks: [], nextPageToken: '', pageSize, totalSize: 0 } });
    }

    if (method === 'GetTask' || method === 'CancelTask') {
      if (typeof params.id !== 'string' || !params.id) return a2aResponse(invalidParams(id, 'id', 'task id is required'), 400);
      return a2aResponse(taskNotFound(id, params.id));
    }

    if (method === 'GetExtendedAgentCard') {
      return a2aResponse(rpcError(id, -32007, 'Extended agent card is not configured', [errorInfo('EXTENDED_AGENT_CARD_NOT_CONFIGURED')]));
    }

    if (method === 'SendStreamingMessage' || method === 'SubscribeToTask') {
      return a2aResponse(rpcError(id, -32004, 'Unsupported operation', [errorInfo('UNSUPPORTED_OPERATION')]));
    }

    if (pushMethods.has(method)) return a2aResponse(rpcError(id, -32003, 'Push Notification is not supported', [errorInfo('PUSH_NOTIFICATION_NOT_SUPPORTED')]));
    return a2aResponse(rpcError(id, -32601, 'Method not found'));
  } catch (error) {
    const problem = problemDetails(error);
    const metadata: Record<string, string> = { code: String(problem.body.code), hint: String(problem.body.hint ?? '') };
    if (problem.body.retry_after !== null && problem.body.retry_after !== undefined) metadata.retryAfter = String(problem.body.retry_after);
    return a2aResponse(rpcError(id, -32000, problem.body.message, [errorInfo(String(problem.body.code).toUpperCase(), metadata)]), problem.status, problem.headers);
  }
}
