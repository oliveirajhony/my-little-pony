// Template do e-mail de "Receber por e-mail". HTML seguro para clientes de
// e-mail: layout em tabela, estilos inline, sem imagens externas (bloqueadas
// por padrão) — a marca é tipográfica.

const REPO_URL = 'https://github.com/oliveirajhony/my-little-pony';
const GITHUB_URL = 'https://github.com/oliveirajhony';
const LINKEDIN_URL = 'https://www.linkedin.com/in/oliveirajhony/';

const BRAND = '#2563eb';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const BG = '#f1f5f9';

/** Escapa texto para uso seguro em HTML (título/URL vêm de dados). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type PdfEmailInput = { title: string; downloadUrl: string; documentUrl: string };

export function renderPdfEmail(input: PdfEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const title = escapeHtml(input.title);
  const dl = escapeHtml(encodeURI(input.downloadUrl));
  const doc = escapeHtml(encodeURI(input.documentUrl));

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <!-- Cabeçalho / marca -->
        <tr><td style="padding:22px 28px;border-bottom:1px solid ${LINE};">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:30px;vertical-align:middle;">
              <div style="width:26px;height:26px;background:${BRAND};border-radius:8px;"></div>
            </td>
            <td style="padding-left:10px;vertical-align:middle;font-size:15px;font-weight:700;color:${INK};letter-spacing:-0.2px;">
              my-little-pony
            </td>
          </tr></table>
        </td></tr>

        <!-- Corpo -->
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 8px;font-size:19px;line-height:1.3;color:${INK};">Sua cópia está pronta</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:${MUTED};">
            Você pediu uma cópia do documento <strong style="color:${INK};">${title}</strong>.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>
            <td style="border-radius:10px;background:${BRAND};">
              <a href="${dl}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Baixar o PDF</a>
            </td>
          </tr></table>

          <p style="margin:0 0 4px;font-size:14px;line-height:1.55;color:${MUTED};">
            Ou abra o documento online:
            <a href="${doc}" style="color:${BRAND};text-decoration:none;">ver o documento &rarr;</a>
          </p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">
            O link fica disponível enquanto o documento estiver publicado.
          </p>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:20px 28px;border-top:1px solid ${LINE};text-align:center;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
            Feito com <a href="${REPO_URL}" style="color:${INK};text-decoration:none;font-weight:600;">my-little-pony</a> — um document engine open-source.
          </p>
          <p style="margin:4px 0 10px;font-size:12px;line-height:1.6;color:${MUTED};">
            Projeto idealizado e desenvolvido por <span style="color:${INK};">Jhony Oliveira</span>.
          </p>
          <p style="margin:0;font-size:12px;">
            <a href="${GITHUB_URL}" style="color:${MUTED};text-decoration:none;">GitHub</a>
            <span style="color:${LINE};">&nbsp;·&nbsp;</span>
            <a href="${LINKEDIN_URL}" style="color:${MUTED};text-decoration:none;">LinkedIn</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Sua cópia do documento "${input.title}" está pronta.`,
    '',
    `Baixar o PDF: ${input.downloadUrl}`,
    `Ver o documento: ${input.documentUrl}`,
    '',
    'O link fica disponível enquanto o documento estiver publicado.',
    '',
    'Feito com my-little-pony — um document engine open-source. Por Jhony Oliveira.',
  ].join('\n');

  return { subject: `Seu documento: ${input.title}`, html, text };
}
