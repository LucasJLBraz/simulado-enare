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

## Rodada de UX (decidida em 16/11/2026, a partir de `docs/revisao-ux.md`)

Direção: o que falta é sobretudo interface e retorno ao usuário. Motivação entra só como sinal de progresso, sem pontos, ranking, medalhas ou sequência que zera. Todo número aparece numa frase simples ("Acertou 6 de 10").

Bloco A (caderno, questão, banco):
- Depois de confirmar, faixa fixa no alto com resultado, confiança e o destino real no caderno, pela regra de `logica/revisao.js` (primeiro erro ou acerto sem certeza: volta em N dias; errar de novo: amanhã; acerto com certeza: não volta). Início: "No caderno: N questões. Próxima revisão: dd/mm."
- Comentário abre só na alternativa marcada e na correta; as demais em "Ver as outras alternativas".
- Confiança e Confirmar fixos embaixo; cabeçalho da questão numa linha.
- Sem cronômetro pedido, nenhum tempo na tela (o tempo continua medido). Botão para esconder o relógio em qualquer modo, inclusive prova.
- "Confirmar/Contestar comentário" viram "O comentário me ajudou" / "Acho que o comentário está errado", com frase do que acontece.
- "Pular" diz que a questão volta no fim (já é o comportamento).
- Banco: nome curto (até 4 palavras) para os 43 tópicos, nome do edital ao abrir o tópico; afirmativas I, II, III em linhas próprias; sem U+F020; comentários antigos com prefixo "Correta:/Errada:" (só o prefixo muda). Limpeza por script, reaplicada em toda montagem do banco.
- Detalhes D1 a D10 da revisão.

Bloco B (progresso, revisão do dia, simulado):
- Aba "Progresso": lista das sessões (abre o resultado), antes e depois por tópico (últimas 2 semanas contra o período anterior; menos de 5 respostas: "poucas questões ainda", sem porcentagem), contador de erros com certeza corrigidos. Linha de resumo no Início leva à aba.
- Resultado: resumo por tópico, filtro "só as erradas"; em Encerrar de revisão ou mini, gabarito das não respondidas escondido atrás de "Ver gabarito".
- Revisão do dia: escolher 10, 25 ou todas; erros com certeza primeiro, depois atraso; meta "Hoje: X de N"; tela final com o que muda amanhã. Encerrar diz que as restantes continuam vencidas.
- Pausar em toda sessão menos modo prova; sair da tela pausa; iniciar sessão nova com outra pausada pede confirmação.
- O que estudar: 5 tópicos prioritários e "Ver todos"; etiqueta só com 5 ou mais respostas ("Ainda sem dados" abaixo disso); barra de antes e depois.
- Simulado completo: confirmação antes de começar (questões e duração); contador "respondidas X de N". Mapa de questões fica para depois.

Conferência: testes em `node --test` e `pytest`; um agente independente confere os dois blocos juntos (diff, testes, storyboard gerado por script com estado de exemplo, sem celular). Uma release só no fim.
