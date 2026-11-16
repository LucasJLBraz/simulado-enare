"""Escreve comentarios (geral, por alternativa, referencia) com o Gemini.

  uv run python comentar.py [arquivos.json ...] [--dry-run]     # questões sem comentário (padrão: dados/extraido/*.json)
  uv run python comentar.py --refazer contestacoes.json         # refaz os contestados em banco/questoes.json, versao+1
"""
import argparse, json
from pathlib import Path

import gemini

DIR = Path(__file__).parent
BANCO = DIR.parent / "banco" / "questoes.json"

PROMPT = """Você é professor de Psicologia e Saúde Coletiva preparando estudantes para a prova de Residência Multiprofissional em Psicologia (ENARE).
Para cada questão abaixo, escreva em português do Brasil:
- "geral": explicação curta (3 a 6 frases) do conceito cobrado e de por que a alternativa do gabarito está correta;
- "alternativas": lista com exatamente 5 textos curtos (A a E), cada um dizendo por que aquela alternativa está certa ou errada;
- "referencia": a norma, o documento ou o autor que sustenta o gabarito (ex.: "Lei 8.080/1990, art. 7º"; "Freud, 1917"). Cite só o que você tem certeza que existe; se não houver, escreva "".
Regras: o gabarito oficial é dado e NUNCA deve ser mudado nem questionado. Justifique a alternativa oficial. Não invente número de lei, artigo, página nem citação.
{extra}
Responda só com JSON: uma lista de objetos {{"id": "...", "geral": "...", "alternativas": ["...","...","...","...","..."], "referencia": "..."}}, um por questão, com os mesmos ids.

Questões:
{questoes}
"""


def bloco(q, anterior=None):
    alts = "\n".join(f"({'ABCDE'[i]}) {a}" for i, a in enumerate(q["alternativas"]))
    s = f'id: {q["id"]}\nenunciado: {q["enunciado"]}\n{alts}\ngabarito oficial: {q["gabarito"]}'
    if anterior:
        s += f'\ncomentário anterior (contestado pela estudante como errado ou fraco): {anterior.get("geral", "")}'
    return s


def valido(r, q):
    return (isinstance(r, dict) and r.get("id") == q["id"] and isinstance(r.get("geral"), str) and r["geral"].strip()
            and isinstance(r.get("alternativas"), list) and len(r["alternativas"]) == 5)


def comentar(qs, versao_de, lote, modelo, dry_run, salvar):
    """Gera comentário para qs (lista de dicts, alterada no lugar). versao_de(q) -> versao nova."""
    feitas = 0
    for i in range(0, len(qs), lote):
        grupo = qs[i:i + lote]
        extra = ("ATENÇÃO: alguns comentários anteriores foram contestados. Reescreva com mais cuidado e rigor, "
                 "sem mudar o gabarito.\n" if any(q.get("comentario") for q in grupo) else "")
        prompt = PROMPT.format(extra=extra, questoes="\n\n".join(bloco(q, q.get("comentario")) for q in grupo))
        try:
            resp = gemini.gerar_json(prompt, modelo, dry_run)
        except gemini.CotaEsgotada as e:
            print(f"cota diária esgotada ({e}). {feitas} comentadas; rode de novo amanhã, o cache preserva o resto.")
            salvar()
            return feitas
        if resp is None:
            continue
        por_id = {r.get("id"): r for r in resp if isinstance(r, dict)}
        for q in grupo:
            r = por_id.get(q["id"])
            if not valido(r, q):
                print(f"  resposta inválida/ausente para {q['id']}")
                continue
            q["comentario"] = {"geral": r["geral"].strip(), "alternativas": [a.strip() for a in r["alternativas"]],
                               "referencia": (r.get("referencia") or "").strip(), "status": "nao_revisado",
                               "versao": versao_de(q)}
            feitas += 1
        salvar()
    return feitas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivos", nargs="*")
    ap.add_argument("--refazer", help='JSON {"contestacoes":[{"id","versao"}]} exportado pelo app')
    ap.add_argument("--lote", type=int, default=5, help="questões por requisição")
    ap.add_argument("--modelo")
    ap.add_argument("--dry-run", action="store_true", help="só imprime os prompts")
    a = ap.parse_args()

    if a.refazer:
        banco = json.loads(BANCO.read_text())
        cont = {c["id"]: c.get("versao", 1) for c in json.loads(Path(a.refazer).read_text())["contestacoes"]}
        alvo = [q for q in banco if q["id"] in cont and q.get("comentario", {}).get("versao", 1) <= cont[q["id"]]]
        print(f"{len(cont)} contestadas, {len(alvo)} a refazer (as demais já têm versão mais nova)")
        n = comentar(alvo, lambda q: q["comentario"]["versao"] + 1, a.lote, a.modelo, a.dry_run,
                     lambda: BANCO.write_text(json.dumps(banco, ensure_ascii=False, indent=1)))
        print(f"{n} refeitas. Rode montar_banco.py para subir versao_banco.")
        return
    for arq in map(Path, a.arquivos or sorted((DIR / "dados" / "extraido").glob("*.json"))):
        if arq.name.endswith(".rejeitadas.json"):
            continue
        qs = json.loads(arq.read_text())
        alvo = [q for q in qs if not (q.get("comentario") or {}).get("alternativas")]
        n = comentar(alvo, lambda q: 1, a.lote, a.modelo, a.dry_run,
                     lambda: arq.write_text(json.dumps(qs, ensure_ascii=False, indent=1)))
        print(f"{arq.name}: {n} comentadas, {len(alvo) - n} pendentes")


if __name__ == "__main__":
    main()
