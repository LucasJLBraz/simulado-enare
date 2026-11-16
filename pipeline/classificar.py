"""Atribui 1-2 tópicos de banco/topicos.json a cada questão (Gemini, com cache).

  uv run python classificar.py [arquivos.json ...] [--dry-run] [--embeddings]
--embeddings: classifica as que sobraram (cota do LLM esgotada) pelo voto dos vizinhos mais próximos
já classificados em banco/questoes.json, usando embeddings do Gemini.
"""
import argparse, json, math
from collections import Counter
from pathlib import Path

import gemini

DIR = Path(__file__).parent
BANCO = DIR.parent / "banco"

PROMPT = """Classifique cada questão da prova de Residência Multiprofissional em Psicologia em 1 ou 2 tópicos da lista.
Tópicos (id: nome [parte]):
{topicos}

Use só ids da lista. Escolha o tópico principal primeiro. Questão da parte "gerais" usa tópicos gerais; "especificos", tópicos específicos.
Responda só com JSON: lista de {{"id": "<id da questão>", "topicos": ["<id do tópico>", ...]}}.

Questões:
{questoes}
"""


def texto(q):
    return q["enunciado"] + " " + " ".join(q["alternativas"])


def valido(topicos_validos, r):
    t = r.get("topicos") if isinstance(r, dict) else None
    return isinstance(t, list) and 1 <= len(t) <= 2 and all(x in topicos_validos for x in t)


def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def vizinhos(q_vec, rotulados, k=5):
    """rotulados: [(vetor, topicos)]. Voto ponderado pela similaridade dos k mais próximos; devolve o tópico mais votado."""
    viz = sorted(rotulados, key=lambda r: -cos(q_vec, r[0]))[:k]
    votos = Counter()
    for v, ts in viz:
        for t in ts:
            votos[t] += cos(q_vec, v)
    return [votos.most_common(1)[0][0]]  # ponytail: 1 tópico só; 2º tópico só pelo LLM


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivos", nargs="*")
    ap.add_argument("--lote", type=int, default=10)
    ap.add_argument("--modelo")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--embeddings", action="store_true")
    a = ap.parse_args()
    topicos = json.loads((BANCO / "topicos.json").read_text())
    validos = {t["id"] for t in topicos}
    lista = "\n".join(f'{t["id"]}: {t["nome"]} [{t["parte"]}]' for t in topicos)

    for arq in map(Path, a.arquivos or sorted((DIR / "dados" / "extraido").glob("*.json"))):
        if arq.name.endswith(".rejeitadas.json"):
            continue
        qs = json.loads(arq.read_text())
        alvo = [q for q in qs if not q.get("topicos")]
        feitas = 0
        if a.embeddings:
            rot = [q for q in json.loads((BANCO / "questoes.json").read_text()) if q.get("topicos")]
            if alvo and rot:
                vr = gemini.embeddings([texto(q) for q in rot])
                va = gemini.embeddings([texto(q) for q in alvo])
                for q, v in zip(alvo, va):
                    q["topicos"] = vizinhos(v, [(x, r["topicos"]) for x, r in zip(vr, rot)])
                    feitas += 1
        else:
            for i in range(0, len(alvo), a.lote):
                grupo = alvo[i:i + a.lote]
                qtxt = "\n\n".join(f'id: {q["id"]}\nparte: {q["parte"]}\n{q["enunciado"]}\n' +
                                   "\n".join(f"({'ABCDE'[j]}) {x}" for j, x in enumerate(q["alternativas"])) for q in grupo)
                try:
                    resp = gemini.gerar_json(PROMPT.format(topicos=lista, questoes=qtxt), a.modelo, a.dry_run)
                except gemini.CotaEsgotada as e:
                    print(f"cota diária esgotada ({e}); use --embeddings para o resto ou rode amanhã.")
                    break
                if resp is None:
                    continue
                por_id = {r.get("id"): r for r in resp if isinstance(r, dict)}
                for q in grupo:
                    r = por_id.get(q["id"])
                    if valido(validos, r):
                        q["topicos"] = r["topicos"]
                        feitas += 1
        if not a.dry_run:
            arq.write_text(json.dumps(qs, ensure_ascii=False, indent=1))
        print(f"{arq.name}: {feitas} classificadas, {len(alvo) - feitas} sem tópico")


if __name__ == "__main__":
    main()
