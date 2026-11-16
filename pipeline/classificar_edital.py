"""Classifica cada questão em 1–2 tópicos do edital (banco/topicos.json) com a Gemini Decisions API.

Pergunta `choice` com os 43 itens do edital como opções. Fica o tópico mais provável e, se houver, o segundo
com probabilidade >= SEGUNDO. Confiança < BAIXA vai para a lista de conferência. Cache como em gemini.py.

Uso: uv run python classificar_edital.py <arquivos de questões .json>
"""
import json, sys, time
from pathlib import Path

import gemini

MODELO = "gemini-decision-1"
SEGUNDO, BAIXA = 0.25, 0.4  # ponytail: limiares a olho; ajustar pela amostra de conferência
TOPICOS = json.loads((Path(__file__).parent.parent / "banco" / "topicos.json").read_text())
CRIT = {t["id"]: f"Item {t['item']} do edital: {t['nome']}" for t in TOPICOS}
INSTR = ("Qual item do conteúdo programático do edital do ENARE (Residência Multiprofissional em Psicologia) "
         "esta questão de prova cobra principalmente?")


def classificar(q):
    txt = q["enunciado"] + "\n" + "\n".join(f"({'ABCDE'[i]}) {a}" for i, a in enumerate(q["alternativas"]))
    arq = gemini.CACHE / f"dec-top-{gemini._chave_cache(MODELO, INSTR, json.dumps(CRIT), txt)}.json"
    if arq.exists():
        return json.loads(arq.read_text())
    r = gemini._com_retry(lambda: gemini.cliente().decisions.create(
        model=MODELO, api_version="v1beta", input=txt,
        questions={"t": {"type": "choice", "instructions": INSTR, "criteria": CRIT}}))
    a = r.answers["t"]
    out = {"choice": a.choice, "confidence": a.confidence, "probabilities": a.probabilities}
    arq.write_text(json.dumps(out))
    time.sleep(1.5)  # ponytail: ritmo fixo para 50K TPM (~1,5K tokens por chamada)
    return out


def main():
    baixas = []
    for arq in map(Path, sys.argv[1:]):
        qs = json.loads(arq.read_text())
        for q in qs:
            r = classificar(q)
            ordem = sorted(r["probabilities"].items(), key=lambda kv: -kv[1])
            dois = ordem[1][1] >= SEGUNDO or r["confidence"] < BAIXA  # incerta: guarda os dois mais prováveis
            q["topicos"] = [ordem[0][0]] + ([ordem[1][0]] if dois else [])
            if r["confidence"] < BAIXA:
                baixas.append(q["id"])
        arq.write_text(json.dumps(qs, ensure_ascii=False, indent=1))
        print(f"{arq.name}: {len(qs)} classificadas")
    print(f"confiança < {BAIXA}: {len(baixas)}")
    (Path(__file__).parent / "dados" / "classificacao_baixa.json").write_text(json.dumps(baixas, indent=1))


if __name__ == "__main__":
    main()
