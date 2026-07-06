import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DomainError, type DomainErrorCode, type PatScope } from '@my-little-pony/core';
import { editorCapabilities } from './content/editor-schema';
import type { ToolContext, ToolDef } from './tool-context';
import { documentsTools } from './tools/documents-tools';
import { editingTools } from './tools/editing-tools';
import { miscTools } from './tools/misc-tools';

export const ALL_TOOLS: ToolDef[] = [...documentsTools, ...editingTools, ...miscTools];

// Friendly pt-BR messages for the domain errors an agent can trigger.
const ERROR_MESSAGES: Partial<Record<DomainErrorCode, string>> = {
  'document-not-found': 'Documento não encontrado.',
  forbidden: 'Você não tem acesso a este recurso.',
  'slug-taken': 'Este endereço (slug) já está em uso.',
  'invalid-page-config': 'Opções de página inválidas (papel, orientação, margens ou cores).',
  'bad-credentials': 'Senha atual obrigatória ou incorreta para trocar o e-mail.',
  'email-taken': 'Este e-mail já está em uso.',
  'invalid-email': 'E-mail inválido.',
  'invalid-name': 'Nome inválido.',
};

function toErrorText(error: unknown): string {
  if (error instanceof DomainError) return ERROR_MESSAGES[error.code] ?? error.code;
  if (error instanceof Error) return error.message;
  return 'Erro desconhecido.';
}

function okResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/**
 * Builds a per-request MCP server exposing every tool the caller's scopes allow.
 * Tools missing the required scope still register (so agents can discover them)
 * but fail fast with a clear message.
 */
export function buildMcpServer(ctx: ToolContext, scopes: PatScope[]): McpServer {
  const server = new McpServer({ name: 'my-little-pony', version: '1.0.0' });

  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (args: Record<string, unknown>) => {
        if (!scopes.includes(tool.scope)) {
          return errorResult(`Este token não tem o escopo "${tool.scope}" necessário.`);
        }
        try {
          return okResult(await tool.handle(ctx, args ?? {}));
        } catch (error) {
          return errorResult(toErrorText(error));
        }
      },
    );
  }

  // The editor capability catalogue, also exposed as a readable resource.
  server.registerResource(
    'editor-capabilities',
    'mlp://editor/capabilities',
    {
      title: 'Capacidades do editor',
      description: 'Todas as opções do editor e seus valores válidos.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(editorCapabilities()) },
      ],
    }),
  );

  return server;
}
