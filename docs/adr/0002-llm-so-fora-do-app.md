# LLM só fora do app

O app nunca chama uma LLM. Comentários, classificação em tópicos e refação de comentários contestados rodam num processo de preparação do banco no computador do autor, com a chave do Gemini guardada só ali, fora do repositório. O resultado de cada chamada fica salvo, e uma questão só volta à LLM quando o comentário dela é contestado. As contestações saem do aparelho junto com o backup de progresso.

Pôr a chave dentro de uma PWA expõe a chave a qualquer pessoa que abra a página, porque todo o código da página é público. Esconder a chave exigiria um servidor intermediário, que custa manutenção. A estudante não é técnica e não deve lidar com chave, cota ou erro de API. O custo da escolha é que um comentário contestado só melhora na próxima atualização do banco, e não na hora.
