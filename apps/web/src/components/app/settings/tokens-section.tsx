'use client';

import { Check, Copy, KeyRound, Loader2, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { asApiError } from '../../../lib/api-client';
import { relativeDate } from '../../../lib/format-date';
import {
  type AccessToken,
  type CreatedAccessToken,
  createToken,
  listTokens,
  PAT_SCOPES,
  type PatScope,
  revokeToken,
  SCOPE_LABELS,
  updateToken,
} from '../../../lib/tokens-api';

const DEFAULT_SCOPES: PatScope[] = ['documents:read', 'documents:write'];

// Expiry presets → dias (undefined = nunca expira).
const EXPIRY_OPTIONS: { value: string; label: string; days?: number }[] = [
  { value: 'never', label: 'Nunca' },
  { value: '1', label: '1 dia', days: 1 },
  { value: '7', label: '7 dias', days: 7 },
  { value: '30', label: '30 dias', days: 30 },
  { value: '90', label: '3 meses', days: 90 },
];

type DialogState = { mode: 'create' } | { mode: 'edit'; token: AccessToken } | null;

function isExpired(token: AccessToken): boolean {
  return token.expiresAt != null && new Date(token.expiresAt).getTime() <= Date.now();
}

function ScopesPopover({ scopes }: { scopes: PatScope[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 font-normal">
          {scopes.length} {scopes.length === 1 ? 'permissão' : 'permissões'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Permissões deste token</p>
        <ul className="space-y-1.5">
          {scopes.map((scope) => (
            <li key={scope} className="flex items-center justify-between gap-2 text-sm">
              <span>{SCOPE_LABELS[scope] ?? scope}</span>
              <code className="text-[11px] text-muted-foreground">{scope}</code>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function TokensSection() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    listTokens()
      .then(setTokens)
      .catch(() => setTokens([]))
      .finally(() => setLoading(false));
  }, []);

  async function onRevoke(token: AccessToken) {
    if (!window.confirm(`Revogar o token "${token.name}"? Esta ação é permanente.`)) return;
    await revokeToken(token.id);
    setTokens((prev) => prev.filter((t) => t.id !== token.id));
  }

  function upsert(token: AccessToken) {
    setTokens((prev) => {
      const exists = prev.some((t) => t.id === token.id);
      return exists ? prev.map((t) => (t.id === token.id ? token : t)) : [token, ...prev];
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Tokens permitem que agentes externos (Claude Code e outros) operem sua conta pelo servidor
          MCP. Dê a cada token só os escopos necessários e revogue quando não usar mais. O valor do
          token aparece só uma vez — as permissões podem ser editadas depois.
        </p>
        <Button className="shrink-0 gap-1.5" onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="size-4" /> Criar token
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum token ativo. Crie um para conectar um agente externo.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center gap-3 p-3.5 sm:p-4">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-medium">{token.name}</span>
                  <code className="hidden rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
                    {token.prefix}…
                  </code>
                  {isExpired(token) && <Badge variant="destructive">Expirado</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Último uso {token.lastUsedAt ? relativeDate(token.lastUsedAt) : 'nunca'} ·{' '}
                  {token.expiresAt ? `expira ${relativeDate(token.expiresAt)}` : 'sem expiração'}
                </p>
              </div>
              <ScopesPopover scopes={token.scopes} />
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${token.name}`}
                  title="Editar permissões"
                  onClick={() => setDialog({ mode: 'edit', token })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Revogar ${token.name}`}
                  title="Revogar token"
                  onClick={() => onRevoke(token)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        {dialog?.mode === 'create' && (
          <CreateTokenDialog onCreated={upsert} onClose={() => setDialog(null)} />
        )}
        {dialog?.mode === 'edit' && (
          <EditTokenDialog token={dialog.token} onSaved={upsert} onClose={() => setDialog(null)} />
        )}
      </Dialog>
    </div>
  );
}

/** Shared name + scopes fields. */
function TokenFields({
  name,
  setName,
  scopes,
  toggleScope,
}: {
  name: string;
  setName: (v: string) => void;
  scopes: PatScope[];
  toggleScope: (s: PatScope) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="token-name">Nome</Label>
        <Input
          id="token-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Claude Code"
        />
      </div>
      <div className="space-y-2">
        <Label>Escopos</Label>
        <div className="grid gap-2">
          {PAT_SCOPES.map((scope) => (
            <div key={scope} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={`scope-${scope}`}
                checked={scopes.includes(scope)}
                onCheckedChange={() => toggleScope(scope)}
              />
              <Label htmlFor={`scope-${scope}`} className="font-normal">
                {SCOPE_LABELS[scope]} <code className="text-xs text-muted-foreground">{scope}</code>
              </Label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CreateTokenDialog({
  onCreated,
  onClose,
}: {
  onCreated: (token: AccessToken) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<PatScope[]>(DEFAULT_SCOPES);
  const [saving, setSaving] = useState(false);
  const [expiry, setExpiry] = useState('never');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedAccessToken | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: PatScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Dê um nome ao token.');
    if (scopes.length === 0) return setError('Selecione ao menos um escopo.');
    setSaving(true);
    try {
      const expiresInDays = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.days;
      const token = await createToken({ name: name.trim(), scopes, expiresInDays });
      setCreated(token);
      onCreated(token);
    } catch (err) {
      setError(asApiError(err)?.message ?? 'Não foi possível criar o token.');
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token criado</DialogTitle>
          <DialogDescription>
            Copie agora — por segurança, ele não será mostrado de novo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="min-w-0 flex-1 break-all text-sm">{created.token}</code>
          <Button size="icon" variant="ghost" aria-label="Copiar token" onClick={copy}>
            {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" /> Guarde em local seguro. Revogue se vazar.
        </p>
        <DialogFooter>
          <Button onClick={onClose}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Criar token de acesso</DialogTitle>
        <DialogDescription>Escolha um nome, os escopos e a validade.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-5">
        <TokenFields name={name} setName={setName} scopes={scopes} toggleScope={toggleScope} />
        <div className="space-y-2">
          <Label htmlFor="token-expiry">Expiração</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger id="token-expiry" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Depois de expirar, o token para de funcionar automaticamente.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? 'Criando…' : 'Criar token'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditTokenDialog({
  token,
  onSaved,
  onClose,
}: {
  token: AccessToken;
  onSaved: (token: AccessToken) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(token.name);
  const [scopes, setScopes] = useState<PatScope[]>(token.scopes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleScope(scope: PatScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Dê um nome ao token.');
    if (scopes.length === 0) return setError('Selecione ao menos um escopo.');
    setSaving(true);
    try {
      const updated = await updateToken(token.id, { name: name.trim(), scopes });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(asApiError(err)?.message ?? 'Não foi possível salvar o token.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar token</DialogTitle>
        <DialogDescription>
          Ajuste o nome e as permissões. O valor do token permanece o mesmo.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-5">
        <TokenFields name={name} setName={setName} scopes={scopes} toggleScope={toggleScope} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
