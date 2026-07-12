'use client';

import { Bot, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  activateLlmProvider,
  addLlmProvider,
  LLM_PRESETS,
  type LlmPreset,
  type LlmProvider,
  listLlmProviders,
  removeLlmProvider,
} from '../../../lib/llm-providers-api';

export function LlmProvidersSection() {
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listLlmProviders()
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  async function onActivate(provider: LlmProvider) {
    setBusyId(provider.id);
    try {
      await activateLlmProvider(provider.id);
      // Ativação é exclusiva: marca este ativo e os demais inativos.
      setProviders((prev) => prev.map((p) => ({ ...p, isActive: p.id === provider.id })));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(provider: LlmProvider) {
    if (!window.confirm(`Remover o provedor "${provider.label}"? Esta ação é permanente.`)) return;
    setBusyId(provider.id);
    try {
      await removeLlmProvider(provider.id);
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));
    } finally {
      setBusyId(null);
    }
  }

  function onAdded(provider: LlmProvider) {
    // Um provedor novo pode chegar ativo (o primeiro do usuário); reconcilia.
    setProviders((prev) =>
      provider.isActive
        ? [provider, ...prev.map((p) => ({ ...p, isActive: false }))]
        : [provider, ...prev],
    );
    setDialogOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Plugue o modelo que a geração do Explorar usa: OpenAI, OpenRouter (Claude, Gemini e
          outros), Groq ou um servidor local (Ollama, LM Studio). A chave é cifrada no servidor e
          nunca é exibida de volta — para trocá-la, remova e adicione de novo. O provedor{' '}
          <strong>Ativo</strong> é o que responde.
        </p>
        <Button className="shrink-0 gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : providers.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum provedor. Sem um provedor ativo, a geração usa o modelo padrão do servidor.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {providers.map((provider) => (
            <li key={provider.id} className="flex items-center gap-3 p-3.5 sm:p-4">
              <Bot className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-medium">{provider.label}</span>
                  {provider.isActive && <Badge>Ativo</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <code className="text-[11px]">{provider.model}</code> ·{' '}
                  {provider.apiKeyHint ? `chave ${provider.apiKeyHint}` : 'sem chave'} · adicionado{' '}
                  {relativeDate(provider.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!provider.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === provider.id}
                    onClick={() => onActivate(provider)}
                  >
                    Ativar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${provider.label}`}
                  title="Remover provedor"
                  disabled={busyId === provider.id}
                  onClick={() => onRemove(provider)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && <AddProviderDialog onAdded={onAdded} />}
      </Dialog>
    </div>
  );
}

function AddProviderDialog({ onAdded }: { onAdded: (provider: LlmProvider) => void }) {
  const [preset, setPreset] = useState<LlmPreset>(LLM_PRESETS[0]);
  const [label, setLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState(LLM_PRESETS[0].baseUrl);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function onPresetChange(id: string) {
    const next = LLM_PRESETS.find((p) => p.id === id) ?? LLM_PRESETS[0];
    setPreset(next);
    setBaseUrl(next.baseUrl);
    // Sugere um rótulo amigável se o usuário ainda não digitou um.
    setLabel((prev) => (prev.trim() ? prev : next.id === 'custom' ? '' : next.label));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!label.trim()) return setError('Dê um nome ao provedor.');
    if (!model.trim()) return setError('Informe o modelo.');
    if (!baseUrl.trim()) return setError('Informe a URL base do provedor.');
    if (preset.requiresKey && !apiKey.trim()) return setError('Este provedor exige uma chave.');
    setSaving(true);
    try {
      const created = await addLlmProvider({
        label: label.trim(),
        backend: preset.backend,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
      });
      onAdded(created);
    } catch (err) {
      setError(asApiError(err)?.message ?? 'Não foi possível adicionar o provedor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Adicionar provedor de IA</DialogTitle>
        <DialogDescription>
          Escolha um provedor, informe o modelo e a chave. A chave é cifrada e não será exibida
          novamente.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="provider-preset">Provedor</Label>
          <Select value={preset.id} onValueChange={onPresetChange}>
            <SelectTrigger id="provider-preset" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LLM_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset.hint && <p className="text-xs text-muted-foreground">{preset.hint}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-label">Nome</Label>
          <Input
            id="provider-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Claude via OpenRouter"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-baseurl">URL base</Label>
          <Input
            id="provider-baseurl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-model">Modelo</Label>
          <Input
            id="provider-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={preset.modelPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-key">
            Chave de API{' '}
            {!preset.requiresKey && <span className="text-muted-foreground">(opcional)</span>}
          </Label>
          <Input
            id="provider-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={preset.requiresKey ? 'sk-…' : 'deixe em branco se não precisar'}
          />
          <p className="text-xs text-muted-foreground">
            A chave é cifrada no servidor. Depois de salva, não pode ser vista nem copiada — só
            removida.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Adicionando…
              </>
            ) : (
              <>
                <Check className="size-4" /> Adicionar provedor
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
