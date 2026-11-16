"""Cliente Gemini compartilhado: chave fora do repo, cache em disco, retry em 429, parada limpa na cota diária."""
import hashlib, json, os, re, sys, time
from pathlib import Path

CHAVE = Path.home() / ".config" / "simulado-enare" / "gemini.key"
CACHE = Path(__file__).parent / "dados" / "cache"
# ponytail: ids de modelo mudam; confirmar o Flash gratuito atual em ai.google.dev/gemini-api/docs/models
MODELO = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
MODELO_EMB = os.environ.get("GEMINI_EMB_MODEL", "gemini-embedding-001")


class CotaEsgotada(Exception):
    """Cota diária do free tier acabou. O progresso está no cache; rode de novo amanhã."""


_cliente = None  # os testes injetam um falso com set_cliente()


def set_cliente(c):
    global _cliente
    _cliente = c


def cliente():
    global _cliente
    if _cliente is None:
        if not CHAVE.exists():
            sys.exit(f"chave do Gemini ausente: crie {CHAVE} com a chave (fora do repositório). Use --dry-run para ver os prompts.")
        from google import genai
        _cliente = genai.Client(api_key=CHAVE.read_text().strip())
    return _cliente


def _chave_cache(*partes):
    return hashlib.sha256("\x00".join(partes).encode()).hexdigest()


def _com_retry(fn, tentativas=6):
    for n in range(tentativas):
        try:
            return fn()
        except Exception as e:
            if getattr(e, "code", None) != 429:
                raise
            s = str(e)
            if "PerDay" in s or "per day" in s.lower():
                raise CotaEsgotada(s[:200]) from e
            m = re.search(r"retry in ([\d.]+)s", s)
            espera = float(m[1]) + 1 if m else min(5 * 2 ** n, 120)
            print(f"  429, espera {espera:.0f}s", file=sys.stderr)
            time.sleep(espera)
    raise CotaEsgotada("429 persistente (limite por minuto) após várias tentativas")


def gerar_json(prompt, modelo=None, dry_run=False):
    """Envia o prompt pedindo JSON; devolve o objeto. Resultado em cache por sha256(modelo, prompt)."""
    modelo = modelo or MODELO
    arq = CACHE / f"{_chave_cache(modelo, prompt)}.json"
    if arq.exists():
        return json.loads(json.loads(arq.read_text())["resposta"])
    if dry_run:
        print(f"--- prompt ({modelo}) ---\n{prompt}\n")
        return None
    from google.genai import types
    r = _com_retry(lambda: cliente().models.generate_content(
        model=modelo, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json")))
    obj = json.loads(r.text)  # JSON inválido falha alto e não vai para o cache
    CACHE.mkdir(parents=True, exist_ok=True)
    arq.write_text(json.dumps({"modelo": modelo, "resposta": r.text}, ensure_ascii=False))
    return obj


def embeddings(textos, modelo=None):
    """Lista de vetores, um por texto, com cache por texto."""
    modelo = modelo or MODELO_EMB
    CACHE.mkdir(parents=True, exist_ok=True)
    arqs = [CACHE / f"emb-{_chave_cache(modelo, t)}.json" for t in textos]
    falta = [i for i, a in enumerate(arqs) if not a.exists()]
    for k in range(0, len(falta), 50):
        lote = falta[k:k + 50]
        r = _com_retry(lambda: cliente().models.embed_content(model=modelo, contents=[textos[i] for i in lote]))
        for i, e in zip(lote, r.embeddings):
            arqs[i].write_text(json.dumps(list(e.values)))
    return [json.loads(a.read_text()) for a in arqs]
