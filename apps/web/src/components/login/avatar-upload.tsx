'use client';

import { ClipboardPaste, ImageUp, X } from 'lucide-react';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from 'react';
import styles from './avatar-upload.module.css';

/** Seleção de avatar: um arquivo OU uma URL, com um preview local. */
export type AvatarSelection = { file?: File; url?: string; previewUrl: string };

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

type Props = {
  value: AvatarSelection | null;
  onChange: (selection: AvatarSelection | null) => void;
  disabled?: boolean;
};

export function AvatarUpload({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hint, setHint] = useState('');

  function applyFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setHint('Isso não parece uma imagem.');
      return;
    }
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  }

  function applyUrl(url: string) {
    if (!isHttpUrl(url)) {
      setHint('Cole um link de imagem (http/https).');
      return;
    }
    onChange({ url: url.trim(), previewUrl: url.trim() });
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) applyFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    setHint('');
    const file = event.dataTransfer.files?.[0];
    if (file) {
      applyFile(file);
      return;
    }
    const url = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text');
    if (url) applyUrl(url);
  }

  function onPaste(event: ClipboardEvent) {
    const file = event.clipboardData.files?.[0];
    if (file) {
      event.preventDefault();
      applyFile(file);
      return;
    }
    const text = event.clipboardData.getData('text');
    if (text) {
      event.preventDefault();
      applyUrl(text);
    }
  }

  async function pasteLink() {
    setHint('');
    try {
      const text = await navigator.clipboard.readText();
      if (isHttpUrl(text)) applyUrl(text);
      else setHint('Nenhum link de imagem copiado.');
    } catch {
      setHint('Copie um link e tente de novo, ou cole com Ctrl+V.');
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  }

  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: dropzone (arrastar/colar/clicar), mais que um botão */}
      <div
        className={`${styles.zone} ${dragOver ? styles.over : ''} ${disabled ? styles.disabled : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Adicionar foto de perfil: arraste, cole ou clique"
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span className={styles.preview}>
          {value ? (
            // biome-ignore lint/performance/noImgElement: preview local; next/image não se aplica
            <img src={value.previewUrl} alt="Prévia do avatar" className={styles.img} />
          ) : (
            <ImageUp className={styles.previewIcon} />
          )}
        </span>

        <div className={styles.body}>
          <p className={styles.title}>
            {dragOver ? 'Solte aqui' : value ? 'Foto selecionada' : 'Arraste, cole ou clique'}
          </p>
          <p className={styles.hintText}>{hint || 'Imagem ou link · JPG, PNG, WebP'}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={pasteLink} disabled={disabled}>
          <ClipboardPaste className={styles.actionIcon} /> Colar link
        </button>
        {value && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              onChange(null);
              setHint('');
            }}
            disabled={disabled}
          >
            <X className={styles.actionIcon} /> Remover
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.file}
        onChange={onInput}
        disabled={disabled}
      />
    </div>
  );
}
