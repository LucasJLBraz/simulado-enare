"""Checagens de validação, mesclagem e extração. Rodar: uv run python -m pytest  (ou python test_validacao.py)."""
import json, tempfile
from pathlib import Path

import comentar, extrair, gemini
from montar_banco import mesclar, validar


def q(i, **kw):
    base = {"id": i, "origem": {"tipo": "oficial", "edicao": "2024/2025", "prova": "P", "numero": int(i[-3:])},
            "parte": "gerais", "enunciado": "e", "alternativas": list("abcde"), "gabarito": "A",
            "gabarito_status": "definitivo", "topicos": []}
    base.update(kw)
    return base


def test_validacao():
    assert validar([q("x-001"), q("x-002")]) == []
    assert validar([q("x-001"), q("x-001")])  # id duplicado
    assert validar([q("x-001", alternativas=list("abcd"))])
    assert validar([q("x-001", gabarito="F")])
    assert validar([q("x-001", topicos=["nao-existe"])], {"sus-redes"})


def test_mesclar_mantem_ids_e_comentario_mais_novo():
    com = lambda v: {"geral": f"v{v}", "referencia": "", "status": "nao_revisado", "versao": v}
    velho = q("x-001", comentario=com(2))
    banco, add, upd = mesclar([velho], [q("x-001", comentario=com(1)), q("x-002", comentario=com(1))])
    assert add == 1 and upd == 0 and banco[0]["comentario"]["versao"] == 2
    banco, add, upd = mesclar([velho], [q("x-001", comentario=com(3), pdf_pagina=4)])
    assert add == 0 and upd == 1 and banco[0]["comentario"]["geral"] == "v3"
    assert [b["id"] for b in banco] == ["x-001"] and "pdf_pagina" not in banco[0]



def test_mesclar_troca_provisorio_por_definitivo():
    banco, _, upd = mesclar([q("x-001", gabarito="B", gabarito_status="provisorio")],
                            [q("x-001", gabarito="C", gabarito_status="definitivo")])
    assert upd == 1 and banco[0]["gabarito"] == "C" and banco[0]["gabarito_status"] == "definitivo"
    banco, _, upd = mesclar([q("x-001", gabarito="B")], [q("x-001", gabarito="C", gabarito_status="provisorio")])
    assert upd == 0 and banco[0]["gabarito"] == "B"

def test_extrair_montar_anulada_e_rejeicao():
    def qq(n, alts=5):
        return {"numero": n, "enun": "texto", "alts": list("abcde")[:alts], "paginas": {1}, "parte": "gerais", "img": False}
    origem = {"tipo": "oficial", "exame": "ENARE", "edicao": "2023/2024", "banca": "X", "prova": "T1"}
    gab = {1: "A", 2: "X", 3: "B", 4: "C"}
    pid, ok, rej, anul = extrair.montar([qq(1), qq(2), qq(3, alts=4), qq(4)], gab, origem, "provisorio")
    assert pid == "enare-2023-t1" and anul == 1
    assert [r["id"] for r in ok] == ["enare-2023-t1-001", "enare-2023-t1-004"]
    assert [r["id"] for r in rej] == ["enare-2023-t1-003"]  # 4 alternativas


def test_gabarito_texto_e_blocos():
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "g.csv"
        f.write_text("1,A\n2,X\n3,e\nGABARITO DEFINITIVO\n")
        g, st = extrair.parse_gabarito(f, None)
        assert g == {1: "A", 2: "X", 3: "E"} and st == "definitivo"


def test_comentar_com_cliente_falso():
    class R:
        def __init__(s, t): s.text = t

    class Fake:
        class models:
            @staticmethod
            def generate_content(model, contents, config):
                ids = [l[4:] for l in contents.split("\n") if l.startswith("id: ")]
                return R(json.dumps([{"id": i, "geral": "g", "alternativas": list("12345"), "referencia": "r"} for i in ids]))

    with tempfile.TemporaryDirectory() as d:
        gemini.CACHE = Path(d)
        gemini.set_cliente(Fake)
        qs = [q("x-001"), q("x-002")]
        n = comentar.comentar(qs, lambda x: 1, 5, "m", False, lambda: None)
        gemini.set_cliente(None)
        assert n == 2 and qs[0]["comentario"]["versao"] == 1 and len(qs[1]["comentario"]["alternativas"]) == 5
        assert len(list(Path(d).glob("*.json"))) == 1  # 1 requisição, em cache


if __name__ == "__main__":
    for nome, f in list(globals().items()):
        if nome.startswith("test_"):
            f()
    print("ok")
