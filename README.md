# ENARE Psicologia — Simulados, Mini Simulados & Diagnóstico de Foco (Rust)

Aplicação completa escrita em **Rust puro (`std` library, zero dependências externas)** para preparação pessoal para a prova de **Residência Multiprofissional em Psicologia do ENARE (FGV/Ebserh)**.

Contém **todas as 93 questões válidas (não anuladas)** da prova oficial [PSICOLOGIA (PSICOLT01) - Tipo 1 - ENARE 2024/2025 (FGV)](https://mapa-vagas-enare-ebserh.conhecimento.fgv.br/provas-gabaritos/multiuni/Provas/PSICOLOGIA%20(PSICOLT01).pdf), com o [Gabarito Definitivo Oficial da FGV](https://pt.scribd.com/document/798575741/ENARE2024-Gabarito-Definitivo-Multi-Uniprofissional-1), comentadas e classificadas em **8 Eixos Temáticos**.

## Estrutura da Codebase

```text
enare-psicologia-simulado/
├── Cargo.toml            # Manifesto do projeto Cargo (zero crates externas, compila offline)
├── README.md             # Instruções de compilação, uso e arquitetura
└── src/
    ├── main.rs           # Ponto de entrada e roteamento de argumentos (--cli, --port, --export-md)
    ├── models.rs         # Estruturas de dados, Eixos Temáticos e persistência JSON local
    ├── questions.rs      # Banco completo com as 93 questões oficiais do ENARE Psicologia comentadas
    ├── diagnostics.rs    # Motor de diagnóstico ("No que devo focar") e Índice de Prioridade (IPE)
    ├── cli.rs            # Interface interativa de Terminal (ANSI colorida)
    ├── server.rs         # Servidor HTTP local em Rust puro (127.0.0.1:8080) + API REST JSON
    └── ui.html           # Interface Web SPA embutida no binário via include_str!("ui.html")
```

## Como Rodar (Cargo)

Na raiz da pasta `enare-psicologia-simulado/`:

1. **Modo Interface Gráfica Web (Padrão — abre em `http://127.0.0.1:8080`):**
   ```bash
   cargo run --release
   ```
   *(Em outra porta: `cargo run --release -- --port 3000`)*

2. **Modo Terminal Interativo (CLI):**
   ```bash
   cargo run --release -- --cli
   ```

3. **Exportar Relatório de Diagnóstico e Caderno de Erros em Markdown:**
   ```bash
   cargo run --release -- --export-md
   ```

## Persistência de Dados

O aplicativo salva automaticamente todas as suas marcações, histórico de simulados e estatísticas por eixo temático no arquivo `enare_psicologia_progresso.json` no diretório de execução.
