"""Gera banco/topicos.json a partir do texto do Anexo III do edital ENARE (itens 1.x básicos e 13.x Psicologia).

Uso: uv run python edital_topicos.py dados/pdfs/2026-edital-anexo3.pdf
"""
import json, re, sys
from pathlib import Path

import pymupdf

RODAPE = re.compile(r"ANEXO III – Conhecimentos.*?Uniprofissional\)\s*\n\s*\d+\s*\n", re.S)


def itens(texto, inicio, fim, prefixo):
    bloco = RODAPE.sub("\n", texto[texto.index(inicio):texto.index(fim, texto.index(inicio) + len(inicio))])
    partes = re.split(rf"\n\s*({prefixo}\.\d+)\.?\s*\n?", "\n" + bloco)
    return [(partes[i], " ".join(partes[i + 1].split())) for i in range(1, len(partes) - 1, 2)]


def main():
    t = "\n".join(p.get_text() for p in pymupdf.open(sys.argv[1]))
    out = []
    for parte, ini, fim, pre in (("gerais", "1. CONHECIMENTOS BÁSICOS", "CONHECIMENTOS, HABILIDADES E ATITUDES ESPEC", "1"),
                                  ("especificos", "13. PSICOLOGIA", "14. SAÚDE COLETIVA", "13")):
        for item, txt in itens(t, ini, fim, pre):
            out.append({"id": f"edital-{item}", "item": item, "nome": txt.rstrip(". "), "parte": parte})
    Path(__file__).parent.parent.joinpath("banco", "topicos.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(len(out), "tópicos:", sum(o["parte"] == "gerais" for o in out), "gerais")


if __name__ == "__main__":
    main()
