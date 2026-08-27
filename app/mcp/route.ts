import { processMcp } from '@/lib/mcp';
import { response } from '@/lib/polity';

export async function GET() { return response({ name: 'open-agent-polity', transport: 'streamable-http', protocolVersion: '2025-11-25', documentation: '/agents' }); }
export async function OPTIONS() { return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,mcp-protocol-version', 'access-control-allow-methods': 'GET,POST,OPTIONS' } }); }
export async function POST(req: Request) { return processMcp(req); }
