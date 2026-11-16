"""Dá nota aos comentários com a Gemini Decisions API antes de publicar (nunca reescreve nada).

Para cada questão, duas perguntas sobre (questão + gabarito oficial + comentário):
- qualidade (score 0–3): contradiz o gabarito / vago / justifica o gabarito / justifica e cita a base;
- contradiz (noul): o comentário diz que outra alternativa é a correta?
Questões com contradiz >= 0.5 ou nota < 1.5 vão para refazer.

Uso: uv run python avaliar_comentario.py dados/lotes/lote-*.coment.json
"""
import json, sys, time
from pathlib import Path

import gemini

MODELO = "gemini-decision-1"
PERGUNTAS = {
    "qualidade": {"type": "score",
                  "instructions": "Avalie o COMENTÁRIO como explicação da questão para uma estudante, dado o GABARITO OFICIAL.",
                  "criteria": ["Contradiz o gabarito oficial ou explica outra alternativa como correta.",
                               "Vago ou genérico: não explica por que o gabarito está certo.",
                               "Explica corretamente por que o gabarito está certo e por que as outras estão erradas.",
                               "Explica corretamente e cita a norma, documento ou autor que sustenta o gabarito."]},
    "contradiz": {"type": "noul",
                  "instructions": "O COMENTÁRIO afirma ou dá a entender que a alternativa correta é diferente do GABARITO OFICIAL?"},
}


def avaliar(q, c):
    alts = "\n".join(f"({'ABCDE'[i]}) {a}" for i, a in enumerate(q["alternativas"]))
    com = c["geral"] + "\n" + "\n".join(f"{'ABCDE'[i]}: {t}" for i, t in enumerate(c["alternativas"]))
    txt = f"QUESTÃO:\n{q['enunciado']}\n{alts}\n\nGABARITO OFICIAL: {q['gabarito']}\n\nCOMENTÁRIO:\n{com}\nReferência: {c.get('referencia') or '(nenhuma)'}"
    arq = gemini.CACHE / f"dec-com-{gemini._chave_cache(MODELO, json.dumps(PERGUNTAS), txt)}.json"
    if arq.exists():
        return json.loads(arq.read_text())
    r = gemini._com_retry(lambda: gemini.cliente().decisions.create(model=MODELO, api_version="v1beta", input=txt,
                                                                    questions=PERGUNTAS))
    out = {"nota": r.answers["qualidade"].score, "contradiz": r.answers["contradiz"].noul}
    arq.write_text(json.dumps(out))
    time.sleep(2)  # ponytail: ritmo fixo para 50K TPM (~1K tokens por chamada)
    return out


def main():
    for f in map(Path, sys.argv[1:]):
        lote = {q["id"]: q for q in json.loads(Path(str(f).replace(".coment.json", ".json")).read_text())}
        res = [(c, avaliar(lote[c["id"]], c)) for c in json.loads(f.read_text())]
        ruins = [(c["id"], r) for c, r in res if r["contradiz"] >= 0.5 or r["nota"] < 1.5]
        notas = sorted(r["nota"] for _, r in res)
        print(f"{f.name}: {len(res)} avaliados, nota mediana {notas[len(notas) // 2]:.2f}, refazer {len(ruins)}")
        for i, r in ruins:
            print(f"  {i}: nota {r['nota']:.2f}, contradiz {r['contradiz']:.2f}")
        f.with_suffix(".avaliacao.json").write_text(json.dumps({"refazer": [i for i, _ in ruins]}, indent=1))


if __name__ == "__main__":
    main()
