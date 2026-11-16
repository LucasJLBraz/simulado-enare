"""Migra as 93 questões do código Rust antigo para banco/questoes.json (uso único)."""
import json, re, sys
from pathlib import Path

src = Path(sys.argv[1]).read_text()
models = Path(sys.argv[2]).read_text()

EIXO_ID = {
    "SusLegislacaoRedes": "sus-redes", "AtencaoPrimariaPnhPoliticas": "aps-pnh",
    "EticaDocumentosAvaliacao": "etica-cfp", "ReformaPsiquiatricaRapsCaps": "raps-caps",
    "AlcoolDrogasVulnerabilidades": "ad-violencia", "PsicologiaHospitalarPaliativos": "hospitalar",
    "PsicopatologiaNeuropsicologiaTea": "psicopato-neuro", "TeoriaClinicaPsicanalitica": "psicanalise",
}
s = r'"((?:[^"\\]|\\.)*)"'
pat = re.compile(
    r"numero_original:\s*(\d+),.*?competencia:\s*" + s + r",.*?eixo:\s*EixoTematico::(\w+),.*?"
    r"subtema:\s*" + s + r",.*?enunciado:\s*" + s + r",.*?alternativas:\s*\[(.*?)\],.*?"
    r"gabarito:\s*'([A-E])',.*?comentario:\s*" + s + r",", re.S)
out = []
for m in pat.finditer(src):
    num, comp, eixo, subtema, enun, alts, gab, com = m.groups()
    alts = [a.replace('\\"', '"') for a in re.findall(s, alts)]
    assert len(alts) == 5, num
    out.append({
        "id": f"enare-2024-psicolt01-{int(num):03d}",
        "origem": {"tipo": "oficial", "exame": "ENARE", "edicao": "2024/2025", "banca": "FGV",
                   "prova": "PSICOLT01", "numero": int(num)},
        "parte": "gerais" if "Gerais" in comp else "especificos",
        "enunciado": enun.replace('\\"', '"'), "alternativas": alts, "gabarito": gab,
        "gabarito_status": "definitivo", "topicos": [EIXO_ID[eixo]], "subtema": subtema,
        "comentario": {"geral": com.replace('\\"', '"'), "referencia": "", "status": "nao_revisado", "versao": 1},
        "fonte_url": "https://mapa-vagas-enare-ebserh.conhecimento.fgv.br/provas-gabaritos/multiuni/Provas/PSICOLOGIA%20(PSICOLT01).pdf",
    })
ids = [q["id"] for q in out]
assert len(out) == 93 and len(set(ids)) == 93, (len(out), len(set(ids)))

bloco = models.split("fn nome")[1].split("fn peso_enare")[0]
nomes = {e: re.sub(r"^\d+\. ", "", n) for e, n in re.findall(r"EixoTematico::(\w+)\s*=>\s*\{\s*\"([^\"]+)\"", bloco)}
partes = {e: ("gerais" if e == "SusLegislacaoRedes" else "especificos") for e in EIXO_ID}
topicos = [{"id": i, "nome": nomes.get(e, i), "parte": partes[e], "provisorio": True} for e, i in EIXO_ID.items()]
Path("banco/questoes.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
Path("banco/topicos.json").write_text(json.dumps(topicos, ensure_ascii=False, indent=1))
Path("banco/meta.json").write_text(json.dumps({"versao_banco": 1, "gerado_em": "2026-11-16",
    "formato_prova": {"gerais": 20, "especificos": 80, "minutos": 300}}, indent=1))
print(len(out), "questões;", sum(q["parte"] == "gerais" for q in out), "gerais")
