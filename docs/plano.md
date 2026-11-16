# Plano de implementação

Decisões de produto: `GLOSSARY.md` e `docs/adr/`. Este arquivo diz o que é construído, em que ordem e como cada parte é conferida.

## Partes

1. **Banco de questões** (`banco/`): arquivos JSON que o app lê. Formato abaixo. É a única coisa que as outras partes compartilham.
2. **App** (`app/`): HTML, CSS e JavaScript sem framework e sem etapa de build, em `app/www/`. A lógica (sorteio, caderno de erros, diagnóstico) fica em módulos puros testados com `node --test`.
3. **APK** (`app/`): Capacitor embala `app/www/` num APK. Plugins: notificação local (lembrete diário), filesystem e share (backup e envio de marcações).
4. **Preparação do banco** (`pipeline/`): scripts Python rodados no PC do autor. PyMuPDF extrai as questões, o gabarito vem do PDF da banca, o Gemini free escreve comentários e classifica tópicos com cache em disco, e uma amostra de cada prova é conferida por um agente.

O código Rust antigo vai para `legado/rust/`.

## Formato do banco

`banco/questoes.json`: lista de questões.

```json
{
  "id": "enare-2024-psicolt01-002",
  "origem": {"tipo": "oficial", "exame": "ENARE", "edicao": "2024/2025", "banca": "FGV", "prova": "PSICOLT01", "numero": 2},
  "parte": "gerais",
  "enunciado": "...",
  "alternativas": ["...", "...", "...", "...", "..."],
  "gabarito": "C",
  "gabarito_status": "definitivo",
  "topicos": ["sus-historia"],
  "comentario": {
    "geral": "...",
    "alternativas": ["por que A está errada", "...", "...", "...", "..."],
    "referencia": "Lei 8.080/1990, art. 7º",
    "status": "nao_revisado",
    "versao": 1
  },
  "fonte_url": "https://..."
}
```

- `origem.tipo`: `oficial` ou `apostila`. Questão de apostila usa `{"tipo": "apostila", "material": "<nome>"}`.
- `parte`: `gerais` (SUS e políticas) ou `especificos` (Psicologia).
- `gabarito_status`: `definitivo` ou `provisorio`. Questão anulada não entra no arquivo.
- `comentario.alternativas` pode faltar enquanto o comentário por alternativa não foi gerado.
- `comentario.versao` sobe a cada refação. O app usa a versão para saber que um comentário contestado foi refeito.
- `id` nunca muda depois de publicado, porque o progresso da estudante aponta para ele.

`banco/topicos.json`: lista de tópicos `{"id", "nome", "parte"}`. Enquanto o edital não for extraído, os tópicos são os 8 eixos do código antigo, marcados como provisórios.

`banco/meta.json`: `{"versao_banco", "gerado_em", "formato_prova": {"gerais": 20, "especificos": 80, "minutos": 300}}`.

## Regras do app (fechadas no grilling)

- **Confiança** antes do gabarito: `chutei`, `duvida`, `certeza`.
- **Caderno de erros**: erro com certeza entra com destaque; outros erros e acertos com chutei ou dúvida entram; acerto com certeza sai.
- **Intervalo de revisão**: igual, `round(0,15 × dias até a prova)`, entre 1 e 30 dias. Sem data de prova, 7 dias. Errar de novo traz a questão no dia seguinte.
- **Diagnóstico por tópico**: pontuação por resposta: certeza e acerto = 1, dúvida e acerto = 0,5, chutei e acerto = 0, erro = 0. Domínio = (soma + 1) / (n + 2), para não exagerar com poucas respostas. Prioridade = fração do tópico nas questões oficiais do ENARE × (1 − domínio). Estado: já domina se domínio ≥ 0,8 com n ≥ 5; base fraca se domínio < 0,4 com n ≥ 5; senão quase lá. Já domina sai da lista. Questões de apostila têm diagnóstico separado.
- **Sorteio**: questões inéditas antes de repetir.
- **Simulado**: prova real (edição inteira) ou montado (20 gerais e 80 específicas do ENARE). Modo prova sem pausa, modo treino com pausa. Tempo total e por questão ajustáveis, padrão 3 min por questão. Gabarito só no fim. Avisos aos 30 e 10 minutos finais.
- **Mini-simulado**: N questões escolhido por ela, padrão um tópico, gabarito no fim do bloco ou a cada questão, timer opcional.
- **Questão de apostila**: só entra quando a opção está ligada e sempre com selo.
- **Ritmo**: tempo por questão guardado e comparado ao tempo da prova por questão.
- **Comentário**: botões confirmar e contestar. "Enviar minhas marcações" gera um arquivo com contestações e progresso.
- **Telas**: início com revisão do dia em destaque, mini-simulado, simulado completo, O que estudar. Onboarding de 4 telas. Lembrete diário com horário ajustável.

## Conferência

- Lógica: `node --test` em `app/tests/`, cobrindo intervalo, entrada e saída do caderno, domínio, prioridade e sorteio de inéditas.
- App: abrir `app/www/index.html` no navegador e fazer um mini-simulado e um simulado curto do começo ao fim.
- APK: `./gradlew assembleDebug` gera o APK sem erro; instalar no emulador ou aparelho se houver.
- Banco: toda questão tem 5 alternativas e gabarito A a E; ids únicos; a contagem por prova bate com a prova menos as anuladas; a amostra de conferência não acha mais de 1 erro por prova.
