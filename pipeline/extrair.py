"""Extrai questões de um PDF de prova + gabarito da banca para o formato do banco (sem comentário).

uso: uv run python extrair.py prova.pdf gabarito.pdf|gabarito.csv --origem-json '{...}' [opções]
origem-json: {"tipo":"oficial","exame":"ENARE","edicao":"2023/2024","banca":"AOCP","prova":"PSICOLOGIA-T01",
              "fonte_url":"https://..."}   (numero é preenchido por questão)
Gabarito em texto/CSV: uma linha por questão, "numero,letra" (letra A-E, ou X/* para anulada).
"""
import argparse, json, re, sys
from pathlib import Path

import pymupdf

ALT = re.compile(r"^\(([A-E])\)\s*(.*)$")
CABECALHO = r"^((?i:EXAME NACIONAL DE RESIDÊNCIA)|INSTITUTO \w+|PSICOLOGIA|Tipo\s+\d+\s*[–-]\s*Página\s*\d+)\s*$"
PARTE_HEAD = re.compile(r"^Compet[êe]ncias \(Conhecimentos", re.I)
ANULADA = {"X", "*", "ANULADA", "ANULADO"}
DEPENDE_IMG = re.compile(r"\b(figura|imagem|gráfico|grafico|quadro|tabela|ilustra\w*)\b", re.I)
DIR = Path(__file__).parent


def linhas_prova(pdf, cabecalho, esp_a_partir):
    """Lista de (linha, pagina) sem cabeçalhos; marca mudança de parte como ('#parte', gerais|especificos)."""
    doc = pymupdf.open(pdf)
    cab = re.compile(cabecalho)
    com_img = {i + 1 for i, p in enumerate(doc) if p.get_images()}
    out = []
    for i, p in enumerate(doc):
        ls = [l.strip() for l in p.get_text().split("\n")]
        ls = [l for l in ls if l and not cab.match(l)]
        j = 0
        while j < len(ls):
            if PARTE_HEAD.match(ls[j]):  # título de seção ocupa 2 linhas: "...Conhecimentos," + "habilidades, atitudes) Comuns"
                jan = " ".join(ls[j:j + 2])
                m = re.search(r"\)\s*(Comuns|Espec[íi]ficas)", jan)
                if m:
                    out.append(("#parte", "gerais" if m[1] == "Comuns" else "especificos"))
                    j += 2
                    continue
            out.append((ls[j], i + 1))
            j += 1
    return out, com_img


def parse_questoes(linhas, com_img, esp_a_partir):
    qs, cur, esperado, parte = [], None, 1, None
    if any(l == "#parte" for l, _ in linhas):  # ignora capa/instruções antes do 1º título de seção
        i = next(i for i, (l, _) in enumerate(linhas) if l == "#parte")
        linhas = linhas[i:]
    for l, pg in linhas:
        if l == "#parte":
            parte = pg
            continue
        if re.fullmatch(r"\d{1,3}", l) and int(l) == esperado and (cur is None or cur["alts"]):
            cur = {"numero": esperado, "enun": [], "alts": [], "paginas": {pg}, "parte": parte}
            if esp_a_partir:
                cur["parte"] = "especificos" if esperado >= esp_a_partir else "gerais"
            qs.append(cur)
            esperado += 1
            continue
        if cur is None:
            continue
        cur["paginas"].add(pg)
        m = ALT.match(l)
        if m:
            cur["alts"].append([m[2]])
        elif cur["alts"]:
            cur["alts"][-1].append(l)
        else:
            cur["enun"].append(l)
    for q in qs:
        q["enun"] = " ".join(q["enun"])
        q["alts"] = [" ".join(a).strip() for a in q["alts"]]
        q["letras"] = None
        q["img"] = bool(q["paginas"] & com_img) and bool(DEPENDE_IMG.search(q["enun"]))
    return qs


def parse_gabarito(path, secao):
    """Retorna ({numero: letra|'X'}, status|None)."""
    if str(path).lower().endswith(".pdf"):
        doc = pymupdf.open(path)
        txt = "\n".join(p.get_text() for p in doc)
    else:
        txt = Path(path).read_text()
    up = txt.upper()
    status = "provisorio" if "PRELIMINAR" in up or "PROVISÓRIO" in up else ("definitivo" if "DEFINITIVO" in up else None)
    gab = {}
    if secao:  # PDF em blocos: uma fileira de números (20) seguida da fileira de letras
        m = re.search(secao, txt)
        if not m:
            sys.exit(f"seção do gabarito não encontrada: {secao}")
        resto = txt[m.end():]
        fim = re.search(r"\n[^\n]*\bPROVA\s+\d+", resto)
        toks = (resto[:fim.start()] if fim else resto).split()
        toks = [t for t in toks if t != "Página" and not re.fullmatch(r"de|\d+/\d+", t)]
        i = 0
        while i < len(toks):
            nums = []
            while i < len(toks) and toks[i].isdigit():
                nums.append(int(toks[i])); i += 1
            ls = []
            while i < len(toks) and len(ls) < len(nums) and (toks[i].upper() in ANULADA or re.fullmatch(r"[A-E]", toks[i])):
                ls.append("X" if toks[i].upper() in ANULADA else toks[i]); i += 1
            if len(ls) != len(nums):
                break
            gab.update(zip(nums, ls))
    else:
        for n, l in re.findall(r"(?m)^\s*(\d{1,3})\s*[-:;,.\t ]\s*([A-E]|X|\*|ANULAD[AO])\s*$", txt, re.I):
            gab[int(n)] = "X" if l.upper() in ANULADA else l.upper()
    return gab, status


def montar(qs, gab, origem, status):
    ano = origem["edicao"].split("/")[0]
    pid = f"enare-{ano}-{origem['prova'].lower()}"
    ok, rejeitadas, anuladas = [], [], 0
    ids = set()
    for q in qs:
        motivos = []
        if len(q["alts"]) != 5 or not all(q["alts"]):
            motivos.append(f"{len(q['alts'])} alternativas (ou vazia)")
        if not q["enun"]:
            motivos.append("enunciado vazio")
        if q["parte"] not in ("gerais", "especificos"):
            motivos.append("parte indefinida")
        if q["img"]:
            motivos.append("depende de figura/imagem")
        g = gab.get(q["numero"])
        if g == "X":
            anuladas += 1
            continue
        if g is None or g not in "ABCDE":
            motivos.append(f"gabarito ausente/inválido ({g})")
        qid = f"{pid}-{q['numero']:03d}"
        if qid in ids:
            motivos.append("id duplicado")
        ids.add(qid)
        reg = {
            "id": qid,
            "origem": {**{k: v for k, v in origem.items() if k != "fonte_url"}, "numero": q["numero"]},
            "parte": q["parte"], "enunciado": q["enun"], "alternativas": q["alts"],
            "gabarito": g, "gabarito_status": status, "topicos": [],
            "fonte_url": origem.get("fonte_url", ""), "pdf_pagina": min(q["paginas"]),
        }
        (rejeitadas if motivos else ok).append({**reg, "motivos": motivos} if motivos else reg)
    return pid, ok, rejeitadas, anuladas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prova"); ap.add_argument("gabarito")
    ap.add_argument("--origem-json", required=True)
    ap.add_argument("--status", choices=["definitivo", "provisorio"], help="se omitido, detectado no gabarito")
    ap.add_argument("--secao-gabarito", help="regex do título da prova no PDF do gabarito, ex 'PSICOLOGIA - PROVA\\s+1'")
    ap.add_argument("--especificos-a-partir", type=int, help="número da 1ª questão específica (senão, pelo título da seção)")
    ap.add_argument("--cabecalho", default=CABECALHO, help="regex de linhas de cabeçalho/rodapé a descartar")
    ap.add_argument("--saida", default=str(DIR / "dados" / "extraido"))
    a = ap.parse_args()
    origem = json.loads(a.origem_json)
    origem.setdefault("tipo", "oficial")
    linhas, com_img = linhas_prova(a.prova, a.cabecalho, a.especificos_a_partir)
    qs = parse_questoes(linhas, com_img, a.especificos_a_partir)
    gab, st = parse_gabarito(a.gabarito, a.secao_gabarito)
    status = a.status or st
    if not status:
        sys.exit("gabarito sem indicação de definitivo/preliminar: passe --status")
    pid, ok, rej, anul = montar(qs, gab, origem, status)
    out = Path(a.saida); out.mkdir(parents=True, exist_ok=True)
    (out / f"{pid}.json").write_text(json.dumps(ok, ensure_ascii=False, indent=1))
    rp = out / f"{pid}.rejeitadas.json"
    if rej:
        rp.write_text(json.dumps(rej, ensure_ascii=False, indent=1))
    elif rp.exists():
        rp.unlink()
    nums = [q["numero"] for q in qs]
    esperado = max(max(gab, default=0), max(nums, default=0))
    faltam = sorted(set(range(1, esperado + 1)) - set(nums))
    print(f"{pid}: questões lidas={len(qs)} gabarito={len(gab)} anuladas={anul} aceitas={len(ok)} rejeitadas={len(rej)} "
          f"status={status} faltam={faltam or '-'}")
    print(f"  esperado = lidas - anuladas = {len(qs) - anul}; aceitas + rejeitadas = {len(ok) + len(rej)}")
    for r in rej:
        print(f"  rejeitada {r['origem']['numero']}: {'; '.join(r['motivos'])}")


if __name__ == "__main__":
    main()
