export type JsonObject = Record<string, unknown>;
export type JsonRpcId = string | number | null;

export const A2A_PROTOCOL_VERSION = '1.0';

export function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function requestedA2aVersion(value: string | null | undefined) {
  return value?.trim() || '0.3';
}

export function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown[]) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data?.length ? { data } : {}) } };
}

export function errorInfo(reason: string, metadata: Record<string, string> = {}) {
  return { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason, domain: 'a2a-protocol.org', metadata };
}

export function invalidParams(id: JsonRpcId, field: string, description: string) {
  return rpcError(id, -32602, 'Invalid parameters', [{
    '@type': 'type.googleapis.com/google.rpc.BadRequest',
    fieldViolations: [{ field, description }],
  }]);
}

export function parseA2aEnvelope(input: unknown):
  | { ok: true; id: string | number; method: string; params: JsonObject }
  | { ok: false; response: ReturnType<typeof rpcError> } {
  if (!isJsonObject(input)) return { ok: false, response: rpcError(null, -32600, 'Request payload validation error') };
  const rawId = input.id;
  if (!Object.hasOwn(input, 'id') || (typeof rawId !== 'string' && typeof rawId !== 'number')) {
    return { ok: false, response: rpcError(null, -32600, 'Request payload validation error') };
  }
  if (input.jsonrpc !== '2.0' || typeof input.method !== 'string' || !input.method) {
    return { ok: false, response: rpcError(rawId, -32600, 'Request payload validation error') };
  }
  const params = input.params === undefined ? {} : input.params;
  if (!isJsonObject(params)) return { ok: false, response: invalidParams(rawId, 'params', 'params must be an object') };
  return { ok: true, id: rawId, method: input.method, params };
}

export function validateSendMessage(id: JsonRpcId, params: JsonObject):
  | { ok: true; message: JsonObject; parts: JsonObject[] }
  | { ok: false; response: ReturnType<typeof rpcError> } {
  const message = params.message;
  if (!isJsonObject(message)) return { ok: false, response: invalidParams(id, 'message', 'message must be an object') };
  if (typeof message.messageId !== 'string' || !message.messageId.trim()) return { ok: false, response: invalidParams(id, 'message.messageId', 'messageId is required') };
  if (message.role !== 'ROLE_USER') return { ok: false, response: invalidParams(id, 'message.role', 'client messages must use ROLE_USER') };
  if (!Array.isArray(message.parts) || message.parts.length === 0) return { ok: false, response: invalidParams(id, 'message.parts', 'at least one part is required') };

  const parts: JsonObject[] = [];
  for (let index = 0; index < message.parts.length; index++) {
    const part = message.parts[index];
    if (!isJsonObject(part)) return { ok: false, response: invalidParams(id, `message.parts[${index}]`, 'part must be an object') };
    const keys = ['text', 'data', 'url', 'raw'].filter((key) => Object.hasOwn(part, key));
    if (keys.length !== 1) return { ok: false, response: invalidParams(id, `message.parts[${index}]`, 'part must contain exactly one of text, data, url, or raw') };
    const key = keys[0];
    // A2A v1 permits any JSON value (object, array, scalar or null) in a data part.
    // Other content variants are serialized as strings in JSON.
    if (key !== 'data' && typeof part[key] !== 'string') {
      return { ok: false, response: invalidParams(id, `message.parts[${index}].${key}`, `${key} has an invalid value`) };
    }
    parts.push(part);
  }
  return { ok: true, message, parts };
}
