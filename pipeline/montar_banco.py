"""Junta dados/extraido/*.json ao banco/questoes.json, sobe versao_banco e revalida.

  uv run python montar_banco.py [--dry-run]
Ids nunca mudam. Questão já no banco mantém tudo; só o comentário é trocado se o novo tem versao maior.
"""
import argparse, datetime, json, sys
from collections import Counter
from pathlib import Path

DIR = Path(__file__).parent
BANCO = DIR.parent / "banco"
PARTES = {"gerais", "especificos"}


def validar(qs, topicos_ids=None):
    """Lista de erros (vazia = banco válido)."""
    erros = []
    for q, n in Counter(q["id"] for q in qs).items():
        if n > 1:
            erros.append(f"{q}: id duplicado")
    for q in qs:
        i = q["id"]
        if len(q.get("alternativas", [])) != 5 or not all(q["alternativas"]):
            erros.append(f"{i}: precisa de 5 alternativas não vazias")
        if q.get("gabarito") not in list("ABCDE"):
            erros.append(f"{i}: gabarito {q.get('gabarito')!r} fora de A-E")
        if q.get("gabarito_status") not in ("definitivo", "provisorio"):
            erros.append(f"{i}: gabarito_status inválido")
        if q.get("parte") not in PARTES:
            erros.append(f"{i}: parte inválida")
        if not q.get("enunciado"):
            erros.append(f"{i}: enunciado vazio")
        c = q.get("comentario")
        if c and "alternativas" in c and len(c["alternativas"]) != 5:
            erros.append(f"{i}: comentario.alternativas precisa de 5 itens")
        if topicos_ids is not None:
            for t in q.get("topicos", []):
                if t not in topicos_ids:
                    erros.append(f"{i}: tópico desconhecido {t}")
    por_prova = Counter()
    for q in qs:
        o = q.get("origem", {})
        por_prova[(o.get("tipo"), o.get("edicao"), o.get("prova"), o.get("numero"))] += 1
    for k, n in por_prova.items():
        if n > 1 and k[0] == "oficial":
            erros.append(f"número repetido na prova {k}")
    return erros


def mesclar(existentes, novas):
    """Devolve (banco, adicionadas, comentarios_atualizados). Não altera as entradas."""
    banco = [dict(q) for q in existentes]
    pos = {q["id"]: i for i, q in enumerate(banco)}
    add = upd = 0
    for n in sorted(novas, key=lambda q: q["id"]):
        n = {k: v for k, v in n.items() if k not in ("pdf_pagina", "motivos")}
        if n["id"] not in pos:
            banco.append(n)
            pos[n["id"]] = len(banco) - 1
            add += 1
            continue
        atual = banco[pos[n["id"]]]
        cn, ca = n.get("comentario"), atual.get("comentario")
        if cn and (not ca or cn.get("versao", 1) > ca.get("versao", 1)):
            atual["comentario"] = cn
            upd += 1
    return banco, add, upd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    existentes = json.loads((BANCO / "questoes.json").read_text())
    topicos = {t["id"] for t in json.loads((BANCO / "topicos.json").read_text())}
    novas = []
    for f in sorted((DIR / "dados" / "extraido").glob("*.json")):
        if not f.name.endswith(".rejeitadas.json"):
            novas += json.loads(f.read_text())
    banco, add, upd = mesclar(existentes, novas)
    erros = validar(banco, topicos)
    if erros:
        print(f"{len(erros)} erros; banco NÃO gravado:")
        print("\n".join(erros[:20]))
        sys.exit(1)
    sem_topico = sum(not q.get("topicos") for q in banco)
    sem_com = sum(not q.get("comentario") for q in banco)
    print(f"{add} adicionadas, {upd} comentários atualizados, total {len(banco)}; sem tópico={sem_topico} sem comentário={sem_com}")
    if a.dry_run or (not add and not upd):
        return
    (BANCO / "questoes.json").write_text(json.dumps(banco, ensure_ascii=False, indent=1))
    meta = json.loads((BANCO / "meta.json").read_text())
    meta["versao_banco"] += 1
    meta["gerado_em"] = datetime.date.today().isoformat()
    (BANCO / "meta.json").write_text(json.dumps(meta, indent=1))
    print(f"versao_banco = {meta['versao_banco']}")


if __name__ == "__main__":
    main()
