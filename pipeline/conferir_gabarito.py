"""Confere o gabarito extraído com a Gemini Decisions API (nunca troca o gabarito, só sinaliza).

Para cada questão pede ao modelo a alternativa correta (pergunta `choice` A–E). Questão em que o modelo
escolhe outra letra com confiança >= --limiar vai para a lista de suspeitas, para conferência humana/agente.
Concordância abaixo de ~60% numa prova indica erro de extração: calibrado em 2021/2023/2024, gabarito certo
82–95%, gabarito do tipo de prova errado 22%. Também marca a "pegadinha": a alternativa errada mais provável.

Uso: uv run python conferir_gabarito.py dados/extraido/<prova>.json [--limiar 0.7]
"""
import argparse, json, sys, time
from pathlib import Path

import gemini

MODELO = "models/gemini-decision-1"
PEGADINHA_MIN = 0.15  # ponytail: limiar escolhido a olho; calibrar com os erros reais dela quando houver dados
INSTR = ("Esta é uma questão de múltipla escolha de prova de residência em Psicologia no Brasil (SUS, saúde mental, "
         "ética do CFP, psicologia hospitalar, psicopatologia). Qual alternativa responde corretamente à questão?")


def escolher(q):
    """Devolve {'choice', 'confidence', 'probabilities'}; resultado em cache por sha256(modelo, texto)."""
    txt = q["enunciado"] + "\n" + "\n".join(f"({'ABCDE'[i]}) {a}" for i, a in enumerate(q["alternativas"]))
    arq = gemini.CACHE / f"dec-{gemini._chave_cache(MODELO, INSTR, txt)}.json"
    if arq.exists():
        return json.loads(arq.read_text())
    r = gemini._com_retry(lambda: gemini.cliente().decisions.create(
        model=MODELO, api_version="v1beta", input=txt,
        questions={"c": {"type": "choice", "instructions": INSTR,
                         "criteria": {L: f"A alternativa {L} é a correta" for L in "ABCDE"}}}))
    a = r.answers["c"]
    out = {"choice": a.choice, "confidence": a.confidence, "probabilities": a.probabilities}
    arq.write_text(json.dumps(out))
    time.sleep(1.5)  # ponytail: ritmo fixo para caber em 50K TPM; trocar por contador de tokens se pesar
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivos", nargs="+")
    ap.add_argument("--limiar", type=float, default=0.7)
    a = ap.parse_args()
    for arq in map(Path, a.arquivos):
        qs = json.loads(arq.read_text())
        res = [(q, escolher(q)) for q in qs]
        conc = sum(r["choice"] == q["gabarito"] for q, r in res)
        susp = [(q, r) for q, r in res if r["choice"] != q["gabarito"] and r["confidence"] >= a.limiar]
        print(f"{arq.stem}: modelo concorda com o gabarito em {conc}/{len(qs)} ({100 * conc / len(qs):.0f}%); "
              f"suspeitas (outra letra com confiança >= {a.limiar}): {len(susp)}")
        for q, r in susp:
            print(f"  questão {q['origem']['numero']}: gabarito {q['gabarito']}, modelo {r['choice']} ({r['confidence']:.2f})")
        for q, r in res:  # pegadinha: alternativa errada que o modelo acha mais atraente
            erradas = {L: p for L, p in r["probabilities"].items() if L != q["gabarito"]}
            L = max(erradas, key=erradas.get)
            if erradas[L] >= PEGADINHA_MIN:
                q["pegadinha"] = {"letra": L, "atracao": round(erradas[L], 2)}
            else:
                q.pop("pegadinha", None)
        arq.write_text(json.dumps(qs, ensure_ascii=False, indent=1))
        print(f"  pegadinhas marcadas: {sum('pegadinha' in q for q in qs)}")
        (arq.parent / f"{arq.stem}.conferencia.json").write_text(json.dumps(
            {"concordancia": conc / len(qs), "suspeitas": [q["id"] for q, _ in susp]}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
