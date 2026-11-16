# Revisão de interface e pedagogia do app

## Como foi feita

Storyboard de 10 telas geradas com um estado de exemplo (usuária nova e usuária com 12 dias de uso), leitura do código do app, revisão parcial anterior feita no celular, conferência independente do código, do banco de questões e das referências.

Substitui a revisão parcial anterior. O revisor não escreveu o app e não rodou código: leu `GLOSSARY.md`, `docs/plano.md`, o texto e as imagens das 10 telas do storyboard e o código em `app/www/` (telas, `sessao.js`, `logica/`). Também conferiu o banco (`app/www/banco/questoes.json`, 467 questões) para contar problemas de texto.

Como citar a evidência: "storyboard 06" é a tela de número 06 (`06-questao-pausada`); "arquivo:linha" é código em `app/www/`; "revisão parcial, item N" é a lista de 17 itens da versão anterior deste arquivo. Quando algo é inferência do revisor e não leitura direta, está escrito "inferência".

Telas do storyboard: 01 apresentação, 02 início (usuária nova), 03 início (12 dias de uso), 04 configurar mini-simulado, 05 configurar simulado completo, 06 questão (mini-simulado pausado), 07 resultado da prova real de 99 questões, 08 resultado de mini-simulado, 09 O que estudar, 10 Ajustes.

---

## 1. Resumo

**Resposta à pergunta central.** Na avaliação do revisor, a maior parte do que falta é interface e retorno de informação (mostrar progresso, mostrar o que aconteceu com cada erro, deixar os resultados encontráveis). Motivação entra pouco, como retorno de progresso: meta do dia que termina, barra de domínio por tópico, contagem de erros corrigidos. Pontos, ranking, medalhas por volume e sequência que zera não têm evidência a favor para uma pessoa que estuda sozinha, com prova marcada. Evitá-los é cautela do revisor, não achado de estudo (seção 5).

**Os 5 achados mais importantes.**

1. **Não existe lugar para ver evolução nem resultados antigos.** O app guarda as últimas 30 sessões (`sessao.js:58`) mas nenhuma tela as lista; o resultado só abre logo depois de terminar (`resultado.js:10`, `questao.js:17`, rotas em `main.js:15`). Depois de duas semanas ela não sabe se melhora (tarefa 6) e, ao tocar "Voltar ao início", fica sem caminho de volta ao resultado da prova real (os dados não se perdem e a rota `#/resultado/<id>` ainda abre, mas nenhuma tela leva a ela) (tarefa 4).
2. **O app promete usar a confiança e não usa.** A apresentação diz que errar com certeza "é o sinal mais importante" (`onboarding.js:6`). O código marca o erro com certeza como destaque (`revisao.js:21`), mas nenhuma tela lê esse campo: a revisão é ordenada só por data (`revisao.js:28`) e o feedback diz apenas "Você errou" (`questao.js:86`). Também não diz se a questão entrou no caderno nem quando volta.
3. **A revisão do dia é um bloco rígido.** São 25 questões, "cerca de 65 minutos" (storyboard 03), sem escolher quantidade, sem botão Pausar (só aparece no modo treino do simulado, `questao.js:81`) e com um "Encerrar" que avisa "as questões não respondidas ficam em branco" (`questao.js:82`). No resultado isso é verdade, mas na revisão as não respondidas continuam vencidas hoje e a tela seguinte parece nota de prova. Começar outra sessão apaga em silêncio uma sessão pausada (`sessao.js:10`).
4. **O resultado de prova longa não aponta o que revisar.** O storyboard 07 mostra nota e ritmo seguidos de 99 cartões recolhidos, sem resumo por tópico, sem "ver só as erradas", sem ligação com O que estudar. Ao encerrar uma revisão ou mini-simulado antes do fim, as questões sem resposta mostram o gabarito completo (`resultado.js:33`).
5. **O diagnóstico por tópico se contradiz na tela.** "Quase lá" aparece para tópico com zero respostas (`dominio.js:8-12`); "Exame Psíquico" é "Base fraca" com "você erra 25%" e "Inclusão de grupos vulnerabilizados" é "Quase lá" com os mesmos 25% (storyboard 09), porque o estado usa a confiança e o texto só mostra erro. Os nomes de tópico do edital ocupam de 2 a 7 linhas por cartão e a lista tem 43 cartões.

---

## 2. As seis tarefas

Nota usada: fácil (chega sem pensar), com esforço (chega, mas gasta toques, rolagem ou leitura), trava (não chega, ou chega sem entender).

### Tarefa 1. Primeira abertura: entender para que serve e começar a estudar

**Caminho atual.** Abre o app, cai na apresentação de 4 passos (`main.js:53`): o que o app faz, confiança, caderno de erros, data da prova (storyboard 01, `onboarding.js:4-9`). São 3 toques em "Próxima", mais a escolha de data pelo seletor do sistema e "Começar". Cai no Início de usuária nova (storyboard 02): primeiro cartão "Revisão do dia" com borda de destaque e o texto "Nada para revisar hoje. Resolva um mini-simulado para alimentar o caderno de erros." Abaixo, "Foque em: Saúde mental e atenção psicossocial. Teorias e técnicas psicoterápicas." com "Treinar este tópico". O toque leva à tela de configuração do mini-simulado (storyboard 04): quantidade, seletor de 43 tópicos, gabarito, cronômetro, apostila, e só no fim "Começar com 10 questões". Primeira questão depois de cerca de 9 toques e 2 a 3 telas de rolagem.

**Onde trava.**
- A apresentação é só texto. Não mostra uma questão, os três botões de confiança nem o resultado do primeiro erro. A usuária lê "Chutei, Dúvida, Certeza" sem ver como é (storyboard 01, `onboarding.js:6`).
- O cartão em destaque do Início novo é o que está vazio (storyboard 02). A ação possível está um cartão abaixo.
- Para começar ela passa por um formulário com 8 campos, quando a primeira ação deveria ser "comece com 10 questões".
- "Foque em" para quem nunca respondeu é só o tópico que mais cai (`dominio.js:42`), sem dizer isso.

**Nota: com esforço.**

### Tarefa 2. Revisão do dia (25 questões, ~65 min) em intervalo curto, e parar no meio

**Caminho atual.** Início (storyboard 03) → "Começar revisão" (1 toque; `inicio.js:17-19`). Cada questão: ler, marcar alternativa, marcar confiança, "Confirmar resposta" (3 toques), ler o feedback, "Próxima questão" (4 toques por questão, mais rolagem; `questao.js:69-88`). A revisão usa feedback a cada questão (`inicio.js:18`).

**Onde trava.**
- Sem escolha de tamanho. Os "65 minutos" vêm do tempo gasto para responder da última vez (`revisao.js:33-38`, `sessao.js:36`), que não inclui a leitura do comentário. A estimativa tende a ficar abaixo do tempo real (inferência a partir do código).
- Parar no meio. Não há botão Pausar: ele só aparece quando `s.modo === 'treino'` (`questao.js:81`), e a revisão e o mini-simulado são criados sem modo (`inicio.js:18`, `mini.js:46`, padrão `null` em `sessao.js:9`). A barra de navegação some durante a questão (`main.js:16`). Saídas: "Encerrar" (vermelho, com aviso de que as não respondidas "ficam em branco") ou o botão voltar do Android.
- "Encerrar" leva a uma tela de resultado de prova (nota "X de 25", "sem resposta"), como se ela tivesse feito um exame. As não respondidas continuam vencidas hoje e ficam na fila.
- O botão voltar deixa a sessão rodando: ao voltar, o Início mostra "Sessão pausada" (storyboard 03), mas o relógio não parou (`sessao.js:25-29` só ajusta ao abrir o app, e `questao.js:42-49` só guarda o instante). O tempo fora entra no tempo da questão e no ritmo, e num mini-simulado com cronômetro pode encerrar a sessão sozinha (`questao.js:35`). Isso precisa de teste no aparelho (inferência a partir do código).
- Com sessão pausada, os cartões abaixo ("Começar revisão", "Montar simulado") iniciam outra sessão por cima da pausada sem aviso (`sessao.js:10`).
- A revisão é uma sessão cronometrada: o relógio "Tempo 00:03 · nesta questão 00:03 de 03:00" aparece também aqui (`questao.js:36-37`).
- Ao terminar as 25, o cartão do Início vira "Nada para revisar hoje. Resolva um mini-simulado…" (`inicio.js:36`), sem fechamento, sem "próxima revisão em N dias".

**Nota: trava para "parar no meio" e com esforço para o resto.** Nota geral: trava.

### Tarefa 3. Retomar o mini-simulado pausado e entender por que errou uma questão

**Caminho atual.** Início → cartão "Sessão pausada: Mini-simulado: misturado: 3 de 10 questões respondidas" → "Continuar" (1 toque; `inicio.js:25-28`, storyboard 03). Abre direto na questão 4 (storyboard 06). Responde, marca confiança, confirma. A tela volta ao topo (`questao.js:77`) e mostra o mesmo enunciado. O aviso "Você errou. Gabarito: B" (`questao.js:86`) fica depois do enunciado inteiro. Abaixo vêm as 5 alternativas, cada uma com o comentário próprio (storyboard 08), o aviso de pegadinha quando é o caso (`comum.js:32-34`), o comentário geral, a referência, "não revisado" e os botões de confirmar e contestar.

**Onde trava.**
- O resultado (acertou ou errou) exige rolar o enunciado.
- A explicação que ela procura são 2 comentários (da alternativa que marcou e da correta). Vêm junto com mais 3 comentários de alternativas que não interessam, o comentário geral e a referência, tudo aberto ao mesmo tempo (`comum.js:23-40`). Em questões longas, são vários comprimentos de tela.
- Na lista de 467 questões, 342 questões têm comentários que começam com "Errada:", 383 com "Correta:" e 15 com "(X) Incorreta" (contagem no banco), então o formato varia (storyboard 07 e 08).
- Depois de sair, não consegue reabrir a questão: não há histórico (achado 1).

**Nota: com esforço.**

### Tarefa 4. Prova real ENARE 2025 cronometrada, depois ver desempenho e o que revisar

**Caminho atual.** Início → "Montar simulado" (card chamado "Simulado completo" com texto "20 questões de conhecimentos gerais e 80 específicas", storyboard 03) → tela 05: "Tipo: Prova real" já marcado, seleção de edição (a 2025/2026 é a segunda da lista), modo prova já marcado, dois campos de tempo ligados entre si → "Começar simulado". Dentro: a mesma tela de questão, 3 toques por questão, sem mapa de questões. Ao fim, resultado (storyboard 07): "44 de 99", "44% de acertos, 10 sem resposta", ritmo e tempo total, e 99 cartões recolhidos.

**Onde trava.**
- O rótulo do cartão no Início descreve o simulado montado, não a prova real (revisão parcial, item 11, confirmado).
- Não há confirmação ao iniciar uma sessão de cerca de 5 horas sem pausa (`simulado.js:46-51`).
- Pular manda a questão ao fim e o contador não muda (`sessao.js:21`, `questao.js:62`). Depois de confirmar, não dá para voltar e mudar a resposta, como se faz na prova de papel. A resposta é gravada no progresso e no caderno na hora (`sessao.js:35-48`).
- O resultado não traz nota por parte (gerais e específicos), nem por tópico, nem "ver as erradas", nem link para O que estudar. Para achar o que revisar ela rola 99 cartões com títulos cortados (storyboard 07, `resultado.js:7`). Os botões "Voltar ao início" e "Fazer outro mini-simulado" ficam no fim da lista (`resultado.js:35-36`).
- Depois de sair da tela, não há caminho de volta ao resultado (achado 1).

**Nota: com esforço para fazer a prova, trava para "ver o que revisar".** Nota geral: trava.

### Tarefa 5. Descobrir em que tópico está pior e treinar só ele

**Caminho atual.** Duas entradas. (a) Início: "Foque em: <tópico>" e "Treinar este tópico" (storyboard 03). (b) "O que estudar" (storyboard 09): lista de cartões em ordem de prioridade, cada um com nome do edital, etiqueta, "Por quê: cai 16% da prova e você erra 45%", ritmo e "Treinar este tópico". Em ambos, o toque abre a configuração do mini-simulado já no tópico (`mini.js:9`, storyboard 04) e ela ainda confirma com "Começar".

**Onde trava.**
- "Pior" não é o que a lista mostra. A ordem é peso do tópico na prova vezes quanto falta de domínio (`dominio.js:42`). "Atuação do psicólogo… erra 100%" fica abaixo de "Saúde mental… erra 45%" (storyboard 09). A tela diz "em ordem de prioridade", mas ela perguntou "onde estou pior" (inferência).
- A etiqueta mistura confiança e erro e se contradiz com a frase ao lado (achado 5).
- A lista tem 43 cartões; os nomes longos fazem cada cartão passar de meia tela (storyboard 09). Não há filtro nem resumo "seus 5 piores".
- O treino do tópico sorteia primeiro questões inéditas (`sorteio.js:8-11`) e não as que ela errou nesse tópico. Isso pode ser desejável, mas não está dito.

**Nota: com esforço.**

### Tarefa 6. Saber, depois de 2 semanas, se está melhorando

**Caminho atual.** Não existe. O Início mostra "Faltam 60 dias" (storyboard 03). O domínio por tópico é a média de todas as respostas desde o início (`dominio.js:4-6`) e a tela mostra "você erra X%" acumulado (`dominio.js:50-51`). Resultados antigos não têm caminho de volta (achado 1). Para comparar duas semanas ela teria que lembrar as notas.

**Onde trava.** Em tudo. Mesmo com sistema melhor, o acumulado desde o primeiro dia muda devagar. Erros de duas semanas atrás pesam o mesmo que acertos de ontem. Um tópico que saiu da lista por ser "dominado" desaparece sem registro (`estudar.js:27`, frase no fim da lista).

**Nota: trava.**

---

## 3. Problemas por gravidade

Carga cognitiva (Sweller, 1988) é o pano de fundo geral para cortar leitura e rolagem; as decisões abaixo são avaliação do revisor. Formato: tela; o que acontece; o que ela esperaria; base; opções com prós e contras; preferência. A base cita heurísticas de Nielsen (1994) e estudos listados na seção 6.

### Bloqueia

**B1. Sem tela de evolução e sem resultados antigos** (todas as telas; tarefas 4 e 6)
- Acontece: o histórico de 30 sessões é guardado e nunca mostrado (`estado.js:11`, `sessao.js:53-58`; busca por `historico` só acha esses usos e `resultado.js:10`). Barra de baixo: Início, O que estudar, Ajustes (`main.js:17`).
- Esperaria: ver "como fui nas últimas semanas" e reabrir uma prova feita.
- Base: visibilidade do estado do sistema e controle do usuário (Nielsen, 1994); retorno sobre "como estou indo" (Hattie & Timperley, 2007); sentir progresso sustenta a motivação por competência (Ryan & Deci, 2000).
- Opções:
  - Quarta aba "Progresso" com lista de sessões (data, nota, tipo) que abrem o resultado, e por tópico a primeira metade versus as últimas respostas. Prós: responde a tarefa 6 e reabre resultados. Contra: tela nova, precisa de regra para "antes e depois".
  - Só lista de sessões dentro de Início ("Últimos resultados"). Pró: barato. Contra: não mostra tendência.
  - Resumo de uma linha no Início ("Esta semana: 62% de acertos, antes 51%"). Pró: aparece sem procurar. Contra: pouco detalhe, números pequenos oscilam.
- Preferência: primeira, com o resumo de uma linha do Início ligando a ela.

**B2. Caderno de erros invisível** (Início, depois de errar; revisão parcial, item 1)
- Acontece: depois de errar, o Início continua com "Nada para revisar hoje" (`inicio.js:36`). Nenhuma tela mostra que a questão entrou nem quando volta. Com a prova em 60 dias o primeiro retorno é em 9 dias (`revisao.js:11-14`, 0,15 × 60); sem data, 7.
- Esperaria: "9 questões no caderno, voltam em 9 dias". Se o Início diz "nada", ela conclui que o app não guardou.
- Base: visibilidade do estado do sistema (Nielsen, 1994); Cepeda et al. (2006, 2008) sobre o espaçamento: o intervalo importa, então a usuária precisa saber quando a questão volta.
- Opções:
  - Linha no Início: "No caderno: 9 questões. Próxima revisão: 25/11." Pró: simples. Contra: não deixa ver quais.
  - Lista do caderno com as questões, data de volta e marca de erro com certeza. Pró: dá controle. Contra: tela nova.
  - Aviso ao fim do mini-simulado e depois de cada confirmação: "Vai voltar em 9 dias". Pró: retorno no momento. Contra: some depois.
- Preferência: primeira e terceira juntas; a lista fica para depois.

**B3. Resultado de prova longa sem resumo nem próximo passo** (storyboard 07, 08; tarefa 4; revisão parcial, item 8)
- Acontece: nota, ritmo e cartões recolhidos com título de 80 caracteres seguido do nome do tópico (`resultado.js:7`). Tocar abre enunciado e alternativas inteiros, também para questões sem resposta (`resultado.js:24-33`). Numa prova terminada isso é esperado; em Encerrar de revisão ou mini-simulado entrega o gabarito sem tentativa. A frase "mais rápido que a prova" aparece com 44% de acertos (storyboard 07) e soa como elogio. Com 99 questões a página é longa e os dois botões de saída ficam no fim.
- Esperaria: um bloco "Onde você perdeu pontos" por tópico, um botão "Ver só as erradas", e um "Revisar agora" que leve ao caderno.
- Base: retorno que diz "para onde ir agora" (Hattie & Timperley, 2007; Shute, 2008).
- Opções:
  - Resumo no topo (nota, acertos por parte, 3 tópicos com mais erros) e filtro Erradas, Chutes, Todas. Prós: serve para 10 ou 99 questões. Contra: tela mais complexa.
  - Linhas compactas (número, acerto ou erro, confiança) que abrem a questão. Pró: cabe muita coisa. Contra: perde o título.
  - Botão "Treinar o tópico em que mais errou" no topo. Pró: leva à ação. Contra: sozinho não resolve a lista longa.
- Preferência: primeira e terceira. Em Encerrar de revisão ou mini-simulado, esconder o gabarito das questões sem resposta atrás de um botão "Ver gabarito". Trocar a frase de ritmo quando o acerto é baixo.

### Atrapalha

**A1. Feedback depois de confirmar** (storyboard 06 e código; revisão parcial, item 2 e parte do 10)
- Acontece: `questao.js:77` volta ao topo; o aviso só vem depois de enunciado e figura (`questao.js:65` e `86`). O texto é o mesmo para "acertou com certeza" e para "errou com certeza". O caderno não é mencionado. O campo de destaque do erro com certeza (`revisao.js:21`) nunca é lido.
- Esperaria: resposta no alto da tela, curta, que diga o que aconteceu com a confiança dela.
- Base: o efeito de hipercorreção (Butterfield & Metcalfe, 2001) mostra que erros cometidos com alta confiança são mais corrigidos depois do retorno do que os de baixa confiança. Priorizá-los na revisão é escolha de design, não achado; Shute (2008) e Hattie & Timperley (2007) pedem retorno específico ("onde está o erro"). Nielsen (1994): visibilidade do estado.
- Opções:
  - Faixa no alto, com 3 formatos: "Acertou com certeza. Não volta para revisão." / "Errou com certeza. Volta em 9 dias (amanhã, se já estava no caderno)." / "Acertou chutando. Volta em 9 dias." Prós: usa a confiança, mostra o caderno. Contra: 3 textos novos.
  - Rolar até o aviso. Pró: não muda a estrutura. Contra: perde o contexto e continua sem falar da confiança.
  - Tela só de resultado com botão "Ver a questão". Pró: clareza. Contra: um toque a mais por questão.
- Preferência: primeira, fixa no alto durante a rolagem.

**A2. Revisão do dia sem cota, sem pausa, com saída enganosa** (tarefa 2)
- Acontece: veja a tarefa 2. A fila é toda a que venceu, em ordem de atraso (`revisao.js:25-30`); não há limite.
- Esperaria: "hoje, 10 de 25" e um jeito de parar e voltar.
- Base: o espaçamento funciona quando a revisão acontece; fila impossível de cumprir leva a pular dias (inferência). Controle do usuário (Nielsen, 1994). Metas específicas e difíceis melhoram o desempenho (Locke & Latham, 2002); o app hoje não define meta nenhuma.
- Opções:
  - Escolher 10, 25 ou todas ao começar. Itens com erro com certeza primeiro, depois os mais atrasados. Prós: cabe no intervalo curto, aplica a hipercorreção. Contra: as que sobram acumulam atraso.
  - Manter 25 e acrescentar Pausar e Continuar. Pró: só um botão. Contra: continua pesado.
  - Cota diária fixa configurável em Ajustes. Pró: previsível. Contra: mais um campo, e some a decisão do dia.
- Preferência: primeira e Pausar em todas as sessões. O botão "Encerrar" da revisão diz "As que faltam continuam vencidas hoje" e, depois de confirmar, volta ao Início com o cartão atualizado, sem tela de nota.

**A3. Nova sessão apaga a pausada e o relógio corre fora da tela** (storyboard 03; `sessao.js:10`, `sessao.js:25-29`)
- Acontece: veja a tarefa 2.
- Esperaria: aviso antes de substituir; tempo parado quando ela sai.
- Base: prevenção de erro e controle do usuário (Nielsen, 1994).
- Opções: confirmar "Você tem uma sessão pausada. Substituir?" (pró: evita perda; contra: um toque); esconder os outros cartões enquanto houver pausada (pró: sem perda; contra: bloqueia quem quer trocar); pausar sempre ao sair da questão em sessões sem prova (pró: tempo certo; contra: código).
- Preferência: confirmar mais pausar ao sair, exceto no modo prova.

**A4. Comentário: tudo aberto, formato desigual** (tarefa 3)
- Acontece: cinco comentários, comentário geral, referência, "não revisado" e dois botões, sempre (`comum.js:23-40`). Formato varia (342 questões com "Errada:", 383 com "Correta:", 15 com "(X) Incorreta" no banco).
- Esperaria: primeiro "por que a sua está errada" e "por que a correta está certa"; o resto sob demanda.
- Base: retorno elaborado funciona quando é específico e dosado (Shute, 2008).
- Opções: abrir só o comentário da sua alternativa e da correta, as outras três em "Ver as outras" (pró: leitura curta; contra: um toque); manter tudo e destacar as duas (pró: simples; contra: não corta carga); resumir em uma frase o comentário geral (pró: rápido; contra: depende do banco).
- Preferência: primeira. Padronizar o texto no banco.

**A5. O que estudar: etiquetas, nomes e falta de sinal de progresso** (storyboard 09; revisão parcial, itens 6 e 7)
- Acontece: o estado só distingue "Já domina" e "Base fraca" com 5 ou mais respostas (`dominio.js:8-12`); tópicos sem respostas aparecem "Quase lá". "Base fraca" depende de confiança (`dominio.js:2`) e o texto mostra só erro. "Por quê: cai 0%… você erra 0%" é possível (`dominio.js:49-51`). Nomes de edital longos, até 7 linhas (storyboard 09 e 04). "Já domina" some da lista e vira uma frase pequena no fim (`estudar.js:27`).
- Esperaria: etiqueta que concorde com o número; nome curto; ver quantos tópicos já domina.
- Base: heurística de coincidência com o mundo real e consistência (Nielsen, 1994). Koriat & Bjork (2005) servem aqui só como analogia (julgamento durante o estudo).
- Opções:
  - Estado "Sem dados ainda" para menos de 5 respostas e frase "erra 25% (e em x% acertou sem certeza)". Prós: honesto, explica a etiqueta. Contra: mais um estado e texto mais longo.
  - Nome curto de cada tópico, edital em "ver detalhe". Pró: lista legível. Contra: dois nomes para manter.
  - Barra "Tópicos dominados: 12 de 43" no topo, com os "domina" recolhidos. Pró: sinal de progresso. Contra: precisa decidir a regra de domínio com mais cuidado.
- Preferência: as três, nessa ordem de importância. Mostrar só os 5 primeiros e "Ver todos".

**A6. Início: dois destaques iguais, cartão vazio como destaque, treino passa por formulário** (storyboard 02, 03; tarefa 1)
- Acontece: em 03, "Sessão pausada" e "Revisão do dia" têm a mesma borda azul e botão azul cheio; o cartão do mini-simulado tem outro botão azul (`inicio.js:25-43`). Em 02 o cartão em destaque é o vazio. "Treinar este tópico" abre a configuração em vez de começar (`inicio.js:41`, `mini.js`).
- Esperaria: uma ação principal por vez, e "Treinar este tópico" que começa.
- Base: design estético e minimalista (Nielsen, 1994).
- Opções: um único botão primário por tela (o mais urgente), os demais discretos (pró: clareza; contra: reordenar); "Treinar este tópico" inicia 10 questões e a configuração fica em "Ajustar" (pró: 1 toque; contra: perde o controle imediato); no Início novo, esconder o cartão da revisão até haver caderno (pró: sem vazio; contra: depois ele aparece de repente).
- Preferência: as três.

**A7. Relógio onde não foi pedido e tempo contado durante a leitura** (storyboard 06; `questao.js:36-37`; revisão parcial, itens 5, 16)
- Acontece: o relógio sobe mesmo sem cronômetro, e "nesta questão 00:03 de 03:00" aparece em mini-simulado e revisão. Depois de confirmar, o tempo continua e entra no total do cronômetro (`questao.js:54`, `marcarQuestaoExibida` não reinicia). A barra azul é progresso de questões, não de tempo.
- Esperaria: relógio só quando ligado; leitura do comentário fora do tempo.
- Base: coincidência com o mundo real e prevenção de erro (Nielsen, 1994). Pressão de tempo em revisão tira atenção do comentário (inferência).
- Opções: esconder o relógio sem cronômetro e guardar o ritmo em silêncio (pró: tela limpa; contra: ritmo "invisível"); parar o relógio no feedback (pró: justo; contra: código); rotular a barra "4 de 10" (pró: óbvio; contra: texto).
- Preferência: as três.

**A8. Simulado: sem mapa, sem voltar, sem confirmação ao iniciar** (tarefa 4; revisão parcial, item 9)
- Acontece: veja a tarefa 4. "Pular" não muda o contador.
- Base: controle do usuário e liberdade (Nielsen, 1994). Fidelidade à prova real, que o glossário define como objetivo do simulado.
- Opções: faixa com mapa de questões (respondida, pulada, pendente) tocável em modo prova (pró: igual à prova; contra: tela mais cheia); contador "7 de 99 · 2 puladas" (pró: barato; contra: sem navegação); confirmar o início ("São 98 questões, 294 minutos, sem pausa") (pró: evita erro; contra: um toque).
- Preferência: contador e confirmação já; mapa depois.

**A9. Questão: confiança e botão abaixo da dobra, cabeçalho grande** (storyboard 06; revisão parcial, item 4)
- Acontece: cabeçalho fixo de cerca de 11% da tela (storyboard 06); alternativas de até 455 caracteres (mediana 87, média 92 no banco); a confiança e "Confirmar" ficam depois das 5 alternativas (`questao.js:72-78`).
- Esperaria: ver o que falta marcar sem rolar.
- Base: design minimalista (Nielsen, 1994); a quantidade de rolagem é avaliação do revisor.
- Opções: confiança e Confirmar fixos no rodapé (pró: sem rolar; contra: cobrem texto); cabeçalho numa linha (pró: ganha espaço; contra: menos legível); manter e enxugar o cabeçalho.
- Preferência: as duas primeiras, com teste no aparelho.

**A10. Confirmar e contestar comentário sem explicação** (storyboard 08; `comum.js:19-20`; revisão parcial, item 10)
- Acontece: depois de confirmar o botão vira azul cheio, igual ao "Próxima questão". Contestar não diz o que acontece.
- Base: coincidência com o mundo real, consistência (Nielsen, 1994).
- Opções: uma linha "Isto ajuda a corrigir o banco" (pró: clareza; contra: texto); estado confirmado discreto (pró: hierarquia; contra: nenhum); mover os dois para o fim do comentário, depois de "Próxima questão".
- Preferência: as duas primeiras.

### Detalhe

**D1. Afirmativas I, II e III numa linha** (revisão parcial, item 3). O CSS preserva quebras (`css/app.css:59`, `white-space: pre-line`), mas o banco não tem nenhuma quebra de linha em enunciados e 28 das 467 questões trazem afirmativas inline (contagem no banco). Solução: inserir quebra antes de cada numeral no banco.

**D2. Caracteres estranhos** (revisão parcial, item 12). 31 questões têm, nas alternativas, o caractere U+F020 (espaço da fonte Symbol, vindo do PDF) (contagem no banco). Solução: limpar no pipeline.

**D3. Início cita 20 + 80, prova real tem 98 ou 99** (storyboard 03 e 05; revisão parcial, item 11). Texto do cartão que cubra os dois tipos; um campo de tempo só.

**D4. Apresentação com metade da tela vazia e sem mapa do app** (storyboard 01; revisão parcial, item 14). A imagem do storyboard 01 mostra o texto no topo. Solução: botões fixos embaixo e um passo com as 4 telas.

**D5. Botão desabilitado sem dizer o que falta** (`questao.js:78`: "Marque a resposta e a confiança"; revisão parcial, item 15). Solução: "Falta marcar a confiança".

**D6. Tópico padrão do mini-simulado** (revisão parcial, item 17). Confirmado por código: `mini.js:9` só troca o tópico quando vem pela ligação "Treinar", e a configuração guarda o último. Solução: abrir no tópico sugerido.

**D7. "Foque em: A. B." parece duas frases** (storyboard 03; revisão parcial, item 7). Nome de edital com ponto no meio. Mesmo remédio de A5.

**D8. Glossário e regra divergem.** `GLOSSARY.md` diz que o caderno devolve "em intervalos crescentes"; o código usa round(0,15 × dias até a prova), entre 1 e 30 dias (7 sem data), para o primeiro erro e para acerto sem certeza; só errar de novo uma questão que já está no caderno a traz no dia seguinte; acerto com certeza tira a questão do caderno (`revisao.js:18-21`). O intervalo encolhe com a aproximação da prova, mas não cresce por questão. Escolher um e corrigir o outro.

**D9. Título do storyboard 08 aparece como "SaÃºde"** no texto da tela. Provável erro de codificação ao gerar o storyboard; verificar no aparelho.

**D10. Ajustes** (storyboard 10; revisão parcial, item 13). O storyboard não permite julgar o seletor de data nem a caixa de lembrete; o código usa campos nativos (`ajustes.js:48, 51-54`), então o aspecto depende do celular. Descartado como defeito do app, a verificar no aparelho. "Rever a apresentação" e "Contestações guardadas: 0" são texto técnico para quem não mantém o banco.

### O que a revisão parcial dizia, item por item

| Item | Veredito | Evidência |
|---|---|---|
| 1 Caderno sem retorno e sem tela | Confirmado | `inicio.js:36`, `main.js:17`. Vira B2 |
| 2 Gabarito fora da tela | Confirmado | `questao.js:65, 77, 86`. Vira A1 |
| 3 Afirmativas numa linha | Confirmado, rebaixado a detalhe | 28 questões; D1 |
| 4 Alternativas longas e confiança abaixo | Confirmado | `questao.js:72-78`, storyboard 06. Vira A9 |
| 5 Tempo sem cronômetro ligado | Confirmado | `questao.js:36-37`. Junto com 16 em A7 |
| 6 "Quase lá" em tudo | Confirmado e ampliado | `dominio.js:8-12`, storyboard 09 (25% de erro com etiquetas diferentes). A5 |
| 7 Nomes longos | Confirmado | storyboard 03, 04, 09. A5 e D7 |
| 8 Tela de resultado | Confirmado e ampliado (gabarito vaza) | `resultado.js:24-33`, storyboard 07. B3 |
| 9 "Pular" sem retorno | Confirmado | `sessao.js:21`, `questao.js:62`. Junto em A8 |
| 10 Confirmar e contestar | Confirmado | `comum.js:19-20`. A10 |
| 11 Cartão do Início vs prova real | Confirmado | storyboard 03 e 05. D3 |
| 12 Caractere estranho | Confirmado, 31 questões | D2 |
| 13 Ajustes | Não confirmável | D10 |
| 14 Apresentação com metade vazia | Parcial: só texto; o vazio visual não foi conferido | D4 |
| 15 Botão desabilitado | Confirmado | `questao.js:78`. D5 |
| 16 Barra e tempo correndo | Confirmado (barra mede questões; tempo corre no feedback) | `questao.js:54, 62-63`. Junto em A7 |
| 17 Tópico padrão | Confirmado | `mini.js:9`. D6 |

Itens novos que a parcial não viu: B1 (sem histórico), B3 (parte do gabarito e falta de resumo por tópico), A2 (revisão sem cota e sem pausa), A3 (sessão pausada apagada, relógio fora da tela), A4 (leitura do comentário), A8 (sem voltar nem mapa).

---

## 4. Pedagogia

### O que o app já faz bem e deve ser mantido

- **Prática de recuperação como centro do app.** Resolver questões é o que o efeito de testagem mostra render mais retenção do que reler (Roediger & Karpicke, 2006). Dunlosky et al. (2013) classificam testes práticos e prática distribuída como de alta utilidade. Todas as sessões são de questões; resumo e releitura não competem.
- **Espaçamento ligado à data da prova.** O intervalo de revisão é 15% dos dias até a prova (`revisao.js:11-14`). Cepeda et al. (2006) e Cepeda et al. (2008) mostram que o intervalo ideal entre estudos cresce com o prazo até o teste e fica numa fração dele. Os 15% do app estão na faixa de Cepeda et al. (2008), que acharam razão ótima de 20 a 40% para teste em 7 dias e de 5 a 10% para 1 ano.
- **Confiança antes do gabarito.** A prática de marcar confiança antes de ver a resposta é a condição para tratar erros com certeza de modo próprio (Butterfield & Metcalfe, 2001). Koriat & Bjork (2005) tratam do julgamento durante o estudo, o que serve só como analogia. Manter, inclusive no simulado.
- **Feedback elaborado por alternativa, com referência e "pegadinha".** Segue o que Shute (2008) recomenda: específico, explicativo e com a fonte. A mensagem "Você caiu na pegadinha…" (`comum.js:32-34`) é retorno que diz onde está o erro.
- **Caderno com saída por acerto com certeza.** A questão só sai quando acerta com certeza (`revisao.js:19`; só faz diferença se já estava no caderno) evita que acertar chutando conte como aprendido, o que se aproxima, por analogia, da ilusão de competência descrita por Koriat & Bjork (2005).
- **Revisão em ordem por atraso mistura tópicos.** A fila mistura assuntos, o que está de acordo com a ideia de dificuldades desejáveis (Bjork, 1994). Dunlosky et al. (2013) classificam a intercalação como de utilidade baixa, então é um bônus, não uma regra.
- **Sorteio com inéditas primeiro** e **ritmo por questão** (comparado ao tempo da prova) preparam para a prova real.
- **Origem sempre visível, aviso de gabarito provisório, apresentação curta** (revisão parcial, final): mantidos.

### O que falta

| Falta | Onde se vê | Base | Opinião do revisor |
|---|---|---|---|
| **Usar a confiança depois de coletá-la.** Mostrar o erro com certeza, ordená-lo primeiro na revisão, resumir calibragem ("das 14 vezes em que marcou certeza, errou 3") | `revisao.js:21` sem leitor; `questao.js:86`; resultado sem confiança agregada | Butterfield & Metcalfe (2001); Metcalfe (2017); Koriat & Bjork (2005) | Alto. É o diferencial do app e hoje não aparece |
| **Retorno sobre o caderno**: entrou, volta em N dias, saiu | Nenhuma tela | Nielsen (1994); Hattie & Timperley (2007): "para onde vou" | Vale fazer |
| **Retorno de "como vai"**: histórico, tendência, domínio recente | B1, tarefa 6 | Hattie & Timperley (2007); Ryan & Deci (2000), competência | Vale fazer |
| **Domínio com memória curta.** O domínio mistura respostas antigas e novas e conta repetições da mesma questão (revisões) como evidência do tópico | `dominio.js:4-6, 34` | Inferência. Acertar uma questão já vista mede lembrar a questão mais do que dominar o tópico | Médio. A lista "O que estudar" pode ficar otimista |
| **Espaçamento por questão**: o intervalo depende só dos dias até a prova; acertar de novo com dúvida repete o mesmo intervalo, e só errar de novo encurta para 1 dia | `revisao.js:18-22` | Cepeda et al. (2006, 2008) | Médio. Boa regra simples; vale testar um intervalo maior depois de um acerto com dúvida |
| **Feedback adaptado**: texto curto quando acerta com certeza, completo quando erra | `comum.js` mostra tudo sempre | Shute (2008) |
| **Retorno atrasado opcional.** O mini-simulado tem "gabarito no fim", mas o resultado entrega tudo de uma vez | `mini.js:34-35`, `resultado.js` | Dunlosky et al. (2013) tratam o tema do momento do retorno com ressalvas; Butler & Roediger (2008) | Baixo a médio; não mexer antes de B3 |
| **Tópico em bloco versus misturado.** O treino por tópico é em bloco | `mini.js` | Bjork (1994); Kornell & Bjork (2008) (evidência com categorias visuais, aplicação aqui é indireta); Rohrer & Taylor (2007) (matemática) | Baixo. Oferecer "70% do tópico, 30% de outros" como opção, não como regra |
| **Metas com data de prova.** Existe a data, mas o app não traduz em "hoje faltam X questões para ficar em dia" | `inicio.js:24` | Locke & Latham (2002) | Vale fazer |

---

## 5. Gamificação

### Critério

O app é de uma pessoa, sozinha, com prova em data fixa. A motivação principal já é de fora do app (passar na prova) e, segundo a teoria da autodeterminação, ela se sustenta melhor quando o app dá sensação de competência e de controle (Ryan & Deci, 2000). As revisões de gamificação acham efeitos positivos de pequenos a médios, que dependem do contexto (Hamari, Koivisto & Sarsa, 2014; Sailer & Homner, 2020). Elas não sustentam a recomendação de evitar pontos ou medalhas. A evidência de dano vem de Hanus & Fox (2015: ranking e medalhas juntos, duas turmas) e Mekler et al. (2017: uma sessão, mais quantidade sem ganho de motivação interna), em contextos diferentes do estudo individual com prazo. Evitar essas mecânicas é cautela do revisor. A definição do termo é "elementos de jogo em contexto que não é jogo" (Deterding et al., 2011), então um progresso bem desenhado e um aviso de meta são, na prática, uma fronteira entre interface e gamificação. Por isso a avaliação do revisor acima: a maior parte é interface e retorno, e motivação entra pouco.

### Mecânicas que o revisor recomenda

1. **Meta do dia com fim claro, ligada à revisão do dia.** "Hoje: 10 de 25" em barra, com tela final "Revisão do dia feita. As 6 que errou voltam em 9 dias. Próxima revisão: amanhã, 7 questões." Efeito esperado: meta específica e difícil melhora o desempenho (Locke & Latham, 2002); o ajuste fino da dificuldade é escolha de design; o fechamento é retorno de competência (Ryan & Deci, 2000). Como ligar: o tamanho da meta é o tamanho da fila escolhido em A2.
2. **Barra de domínio por tópico com antes e depois**, ligada a O que estudar. "Código de Ética: 35% → 52% nas últimas 2 semanas", e "Tópicos dominados: 12 de 43" no topo. Fundamento: retorno de progresso, a necessidade de competência (Ryan & Deci, 2000). A literatura de trabalho de Amabile & Kramer (2011) descreve o mesmo mecanismo (ver avanço motiva), mas é de ambiente de trabalho, então é apoio indireto. Como ligar: o cálculo precisa de janela recente e de respostas por tópico (A5, tabela da seção 4).
3. **Contador de erros corrigidos com certeza.** "Você corrigiu 4 erros que cometeu com certeza." Não é recompensa por volume; é o retorno do que o app quer que ela perceba (Butterfield & Metcalfe, 2001). Como ligar: um erro com certeza que, na revisão, passa a acerto com certeza conta como corrigido.
4. **Semana de estudo em pontos** (sete pontos, um por dia com alguma questão), sem número de sequência e sem zerar. Opinião do revisor: ajuda a manter o hábito sem punir falta. Evidência para esta forma específica não foi encontrada pelo revisor; é hipótese, para testar com ela.

### O que evitar

| Mecânica | Por que evitar | Base |
|---|---|---|
| **Pontos, níveis e XP por questão** | Em um estudo de uma sessão aumentaram a quantidade feita, sem melhorar a motivação interna nem a sensação de competência. Aqui o ganho que importa é entender o erro, e pontos pagam por velocidade e volume | Mekler et al. (2017); Deci, Koestner & Ryan (1999) sobre recompensa extrínseca reduzir motivação interna em tarefas que a pessoa já gosta |
| **Ranking e comparação com outras pessoas** | Pode reduzir motivação e desempenho em quem não está em primeiro; ela estuda sozinha e não há grupo | Hanus & Fox (2015) |
| **Medalhas por volume ou por tempo de uso** | Mesmo problema dos pontos; ficam sem significado em 60 dias | Deci, Koestner & Ryan (1999); cautela do revisor (Hamari e Sailer & Homner não indicam dano) |
| **Sequência (streak) que zera ao faltar um dia** | Pune a falta justo quando ela mais precisa voltar; incentiva fazer uma questão só para "manter" (inferência a partir de Deci et al., 1999 sobre recompensa controladora; o revisor não encontrou estudo específico de sequência para este contexto) | Deci, Koestner & Ryan (1999) |
| **Recompensa por acerto ou por confiança alta** | Contamina o sinal de confiança, que só serve se for honesto: marcar "certeza" para ganhar algo estraga a calibragem. Não pagar por nada que dependa de qual botão de confiança ela aperta | Butterfield & Metcalfe (2001); Koriat & Bjork (2005) |
| **Vidas, corações, escassez artificial** | Tira acesso ao estudo quando há prazo fixo | Inferência |
| **Elogio genérico** ("mais rápido que a prova" com 44% de acertos, "ótimo!") | Retorno dirigido à pessoa e não à tarefa tende a ajudar pouco e às vezes piora | Kluger & DeNisi (1996); Hattie & Timperley (2007) |
| **Pressão de tempo por questão na revisão** | Desvia atenção do comentário | Inferência do revisor |

### Como ligar à revisão do dia e ao progresso por tópico

- **Revisão do dia** é o único lugar de rotina. Meta de tamanho escolhida, ordem (erros com certeza, depois atraso), fim da sessão com "o que muda amanhã", Pausar disponível. Nenhum ponto.
- **Progresso por tópico** é o único placar. A mesma barra de domínio no cartão do tópico, no resumo do resultado (B3) e no Início ("Esta semana subiu: Ética. Caiu: SUS"). A fonte é sempre a lista de respostas, sem inventar métrica nova.
- Nada além disso. Acrescentar só se a usuária pedir.

### Ordem sugerida de trabalho

1. Retorno sobre o caderno e feedback com confiança (B2, A1). Pouco código, muito efeito.
2. Resultado com resumo e histórico (B1, B3).
3. Revisão do dia com cota, pausa e fim (A2, A3).
4. O que estudar sem contradição e com progresso (A5).
5. Meta do dia, barra por tópico, erros corrigidos (seção 5).
6. Detalhes (D1 a D10) em lote.

---

## 6. Referências

- Amabile, T. M., & Kramer, S. J. (2011). *The Progress Principle*. Harvard Business Review Press.
- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. Em J. Metcalfe & A. Shimamura (Orgs.), *Metacognition: Knowing about knowing*. MIT Press.
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. *Memory & Cognition*.
- Butterfield, B., & Metcalfe, J. (2001). Errors committed with high confidence are hypercorrected. *Journal of Experimental Psychology: Learning, Memory, and Cognition*.
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*.
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*.
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*.
- Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining "gamification". *Proceedings of MindTrek*.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*.
- Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? A literature review of empirical studies on gamification. *Proceedings of HICSS*.
- Hanus, M. D., & Fox, J. (2015). Assessing the effects of gamification in the classroom. *Computers & Education*.
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*.
- Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance. *Psychological Bulletin*.
- Koriat, A., & Bjork, R. A. (2005). Illusions of competence in monitoring one's knowledge during study. *Journal of Experimental Psychology: Learning, Memory, and Cognition*.
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science*.
- Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation. *American Psychologist*.
- Mekler, E. D., Brühlmann, F., Tuch, A. N., & Opwis, K. (2017). Towards understanding the effects of individual gamification elements on intrinsic motivation and performance. *Computers in Human Behavior*.
- Metcalfe, J. (2017). Learning from errors. *Annual Review of Psychology*.
- Nielsen, J. (1994). Enhancing the explanatory power of usability heuristics. *Proceedings of CHI '94*.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science*.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. *Instructional Science*.
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*.
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review*.
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research*.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*.

Limites desta revisão: não houve teste com a usuária real; o storyboard mostra o que cabe na tela de 412 x 915 e não o comportamento do aparelho (relógio ao sair da tela, seletor de data). As afirmações marcadas "inferência" são do revisor. As citações estão sem página e sem resultado numérico de propósito.
