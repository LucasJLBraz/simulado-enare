# Preparação do banco

Scripts Python (3.12+, `uv`) rodados no PC do autor. O app nunca chama LLM (`docs/adr/0002-llm-so-fora-do-app.md`).
Tudo em `pipeline/`: `uv sync` uma vez, depois `uv run python <script>`.

Chave do Gemini: arquivo `~/.config/simulado-enare/gemini.key` (fora do repo). Modelo: `GEMINI_MODEL` (padrão `gemini-3.8-flash`, conferido em 2026-11-16). Respostas ficam em `dados/cache/`, então reexecutar não reenvia nada e uma cota diária esgotada só pausa o trabalho.

## Adicionar uma prova nova

1. Baixar prova e gabarito em `dados/pdfs/` (ignorado pelo git).
2. Extrair:
   ```
   uv run python extrair.py dados/pdfs/prova.pdf dados/pdfs/gabarito.pdf \
     --origem-json '{"tipo":"oficial","exame":"ENARE","edicao":"2023/2024","banca":"AOCP","prova":"PSICOLOGIA-T01","fonte_url":"https://..."}' \
     --secao-gabarito 'PSICOLOGIA - PROVA\s+1\b'
   ```
   Gabarito sem PDF utilizável: arquivo texto/CSV com `numero,letra` (X ou * para anulada). Parte: pelo título da seção na prova, ou `--especificos-a-partir N`. `--status` se o gabarito não disser preliminar/definitivo. Escreve `dados/extraido/<prova-id>.json` e, se algo falhar na validação, `<prova-id>.rejeitadas.json` (fora do banco). Questões que dependem de figura são rejeitadas.
3. Conferir a amostra: `uv run python amostra.py <prova-id>` gera `dados/extraido/<prova-id>.amostra.md`. Um agente compara com o PDF; mais de 1 erro na amostra, corrigir a extração e repetir.
4. `uv run python classificar.py` (tópicos). Com a cota do LLM esgotada: `--embeddings` classifica o resto pelos vizinhos já classificados.
5. `uv run python comentar.py` (comentários, 5 questões por requisição). `--dry-run` só imprime os prompts.
6. `uv run python montar_banco.py` junta ao `banco/questoes.json`, sobe `versao_banco` em `banco/meta.json` e revalida. Em erro, não grava. Depois `uv run python -m pytest`.
7. Commit de `banco/` e de `dados/extraido/<prova-id>.json`.

Gabarito preliminar entra como `provisorio`. Quando a banca publicar o definitivo, rodar `extrair.py` de novo com o gabarito novo e `montar_banco.py` (os comentários existentes são mantidos).

## Processar contestações

1. Receber o arquivo "Enviar minhas marcações" (`{"contestacoes":[{"id","versao"}]}`).
2. `uv run python comentar.py --refazer contestacoes.json` refaz os comentários contestados em `banco/questoes.json` (versão +1, gabarito intocado). Contestação de versão já superada é ignorada.
3. `uv run python montar_banco.py`, que sobe `versao_banco`, e commit.
