"""Sorteia 10% (mín. 10) das questões de uma prova extraída e escreve um checklist em markdown.

  uv run python amostra.py <prova-id> [--semente N]
Um agente compara cada item com a página do PDF e marca enunciado, alternativas e gabarito.
"""
import argparse, json, random
from pathlib import Path

DIR = Path(__file__).parent


def sortear(qs, semente=0):
    n = min(len(qs), max(10, round(0.1 * len(qs))))
    return sorted(random.Random(semente).sample(qs, n), key=lambda q: q["origem"]["numero"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prova_id")
    ap.add_argument("--semente", type=int, default=0)
    a = ap.parse_args()
    qs = json.loads((DIR / "dados" / "extraido" / f"{a.prova_id}.json").read_text())
    amostra = sortear(qs, a.semente)
    md = [f"# Amostra de conferência: {a.prova_id}", "",
          f"{len(amostra)} de {len(qs)} questões. Para cada uma, abrir o PDF na página indicada e conferir "
          "enunciado, as 5 alternativas e o gabarito. Anotar o número de cada erro e o que está errado.", ""]
    for q in amostra:
        o = q["origem"]
        md += [f"## Questão {o['numero']} (PDF, página {q.get('pdf_pagina', '?')})", "",
               f"- [ ] enunciado confere  - [ ] alternativas conferem  - [ ] gabarito confere",
               f"- Gabarito extraído: **{q['gabarito']}** ({q['gabarito_status']})", "",
               q["enunciado"], ""]
        md += [f"({'ABCDE'[i]}) {t}" for i, t in enumerate(q["alternativas"])]
        md.append("")
    md += ["## Resultado", "", "Erros encontrados: __ (limite aceito: 1)", ""]
    saida = DIR / "dados" / "extraido" / f"{a.prova_id}.amostra.md"
    saida.write_text("\n".join(md))
    print(f"{saida}: {len(amostra)} questões: {[q['origem']['numero'] for q in amostra]}")


if __name__ == "__main__":
    main()
