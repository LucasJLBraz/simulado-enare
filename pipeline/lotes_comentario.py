"""Divide as questões sem comentário por alternativa em lotes para um agente escrever, e aplica o resultado.

  uv run python lotes_comentario.py exportar --tamanho 45   -> dados/lotes/lote-N.json
  uv run python lotes_comentario.py aplicar                 -> lê dados/lotes/lote-N.coment.json e grava

Saída esperada de cada lote: lista de {"id", "geral", "alternativas": [5 textos], "referencia"}.
O gabarito nunca vem do agente: só o comentário é aplicado.
"""
import json, sys
from pathlib import Path

from comentar import valido

DIR = Path(__file__).parent
ARQS = sorted((DIR / "dados" / "extraido").glob("enare-*.json")) + [DIR.parent / "banco" / "questoes.json"]
ARQS = [a for a in ARQS if not a.name.endswith((".rejeitadas.json", ".conferencia.json"))]
LOTES = DIR / "dados" / "lotes"


def pendentes(qs):
    return [q for q in qs if not (q.get("comentario") or {}).get("alternativas")]


def exportar(tamanho):
    LOTES.mkdir(parents=True, exist_ok=True)
    todas = [q for a in ARQS for q in pendentes(json.loads(a.read_text()))]
    campos = ("id", "parte", "enunciado", "alternativas", "gabarito")
    for n, i in enumerate(range(0, len(todas), tamanho), 1):
        lote = [{k: q[k] for k in campos} for q in todas[i:i + tamanho]]
        (LOTES / f"lote-{n}.json").write_text(json.dumps(lote, ensure_ascii=False, indent=1))
    print(f"{len(todas)} questões em {n} lotes em {LOTES}")


def aplicar():
    resp, refazer = {}, set()
    for f in sorted(LOTES.glob("lote-*.coment.json")):
        av = f.with_suffix(".avaliacao.json")
        if not av.exists():
            print(f"  {f.name} sem avaliação (rode avaliar_comentario.py), pulado")
            continue
        refazer |= set(json.loads(av.read_text())["refazer"])
        for r in json.loads(f.read_text()):
            resp[r.get("id")] = r
    resp = {i: r for i, r in resp.items() if i not in refazer}
    ok = ruins = 0
    for a in ARQS:
        qs = json.loads(a.read_text())
        for q in pendentes(qs):
            r = resp.get(q["id"])
            if r is None:
                continue
            if not valido(r, q):
                ruins += 1
                print(f"  inválido: {q['id']}")
                continue
            versao = (q.get("comentario") or {}).get("versao", 1)
            q["comentario"] = {"geral": r["geral"].strip(), "alternativas": [x.strip() for x in r["alternativas"]],
                               "referencia": (r.get("referencia") or "").strip(), "status": "nao_revisado",
                               "versao": versao}
            ok += 1
        a.write_text(json.dumps(qs, ensure_ascii=False, indent=1))
    print(f"{ok} comentários aplicados, {ruins} inválidos")


if __name__ == "__main__":
    {"exportar": lambda: exportar(int(sys.argv[3]) if len(sys.argv) > 3 else 45), "aplicar": aplicar}[sys.argv[1]]()
