"""Mini servidor que finge ser o endpoint interno do Nest (para demo/dev).

Serve o contrato GET /internal/documents/{id}/content -> {"content": "<html>"}.
Assim dá para rodar o worker de verdade antes de a Spec 1 (Nest) existir.

Rodar:
    python tools/fake_nest.py           # porta 3001
    python tools/fake_nest.py 3005
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

# Conteúdo por documento (qualquer id desconhecido cai no DEFAULT).
DOCS: dict[str, str] = {
    "demo-cafe": (
        "<html><body>"
        "<h1>História do Café</h1>"
        "<p>A origem do café vem da Etiópia. A lenda conta que o pastor Kaldi "
        "notou suas cabras agitadas após comerem frutos vermelhos de um arbusto.</p>"
        "<h2>Tipos</h2>"
        "<table>"
        "<tr><th>Espécie</th><th>Sabor</th></tr>"
        "<tr><td>Arábica</td><td>suave e aromático</td></tr>"
        "<tr><td>Robusta</td><td>forte e amargo</td></tr>"
        "</table>"
        "</body></html>"
    ),
}

DEFAULT_HTML = (
    "<html><body><h1>Documento de exemplo</h1>"
    "<p>Conteúdo genérico servido pelo Nest fake.</p></body></html>"
)


def _large_html(sections: int = 8) -> str:
    """Documento grande: cada seção vira ~1 chunk (para demo de retomada)."""
    frase = (
        "A história do café atravessa continentes e séculos, do planalto etíope "
        "às cafeterias europeias, moldando economias, culturas e hábitos sociais "
        "de maneiras profundas e duradouras ao longo do tempo. "
    )
    partes = ["<html><body>"]
    for i in range(1, sections + 1):
        partes.append(f"<h2>Seção {i}</h2>")
        partes.append("<p>" + (frase * 6) + f"(bloco {i})</p>")
    partes.append("</body></html>")
    return "".join(partes)


DOCS["demo-grande"] = _large_html(25)


# Documentos-arquivo: id -> (storageKey no MinIO, filename). O binário deve ter
# sido colocado no bucket antes (o Nest real faria isso no upload).
FILE_DOCS: dict[str, tuple[str, str]] = {
    # demo: um PDF que já foi colocado no bucket em uploads/cafe.pdf
    "doc-pdf": ("uploads/cafe.pdf", "cafe.pdf"),
}


def _descriptor(document_id: str) -> dict:
    if document_id in FILE_DOCS:
        storage_key, filename = FILE_DOCS[document_id]
        return {"kind": "file", "storageKey": storage_key, "filename": filename}
    html = DOCS.get(document_id, DEFAULT_HTML)
    return {"kind": "native", "content": html, "filename": "document.html"}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - assinatura do http.server
        if self.path.endswith("/content"):
            parts = self.path.strip("/").split("/")  # internal/documents/{id}/content
            document_id = parts[2] if len(parts) >= 3 else "?"
            body = json.dumps(_descriptor(document_id)).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            print(f"[fake-nest] GET {self.path} -> 200 ({document_id})", flush=True)
        else:
            self.send_response(404)
            self.end_headers()
            print(f"[fake-nest] GET {self.path} -> 404", flush=True)

    def log_message(self, *_args):  # silencia o log padrão (usamos o nosso)
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    print(f"[fake-nest] ouvindo em http://localhost:{port}", flush=True)
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
