use std::collections::HashMap;
use std::io::{self, Write};
use std::time::SystemTime;

use crate::diagnostics::{calcular_diagnostico, exportar_relatorio_markdown};
use crate::models::{EixoTematico, ProgressoUsuario, Questao, Rng};

pub fn executar_modo_cli(banco: &[Questao], progresso: &mut ProgressoUsuario) {
    loop {
        println!("\n\x1b[1;36m======================================================================\x1b[0m");
        println!("\x1b[1;37m   ENARE PSICOLOGIA — SIMULADOS & DIAGNÓSTICO DE FOCO (RUST CLI)\x1b[0m");
        println!("   Banco oficial carregado: {} questões válidas ENARE/FGV", banco.len());
        println!("\x1b[1;36m======================================================================\x1b[0m");
        println!("  1) Mini Simulado Rápido (5 questões sorteadas)");
        println!("  2) Mini Simulado Direcionado (10 questões — escolher Eixo Temático)");
        println!("  3) Mini Simulado Inteligente (10 questões — Foco nos Erros e Pontos Fracos)");
        println!("  4) Simulado Padrão ENARE (25 questões — 20% SUS + 80% Psicologia)");
        println!("  5) Simulado Completo ENARE (Todas as {} questões válidas)", banco.len());
        println!("  6) Painel 'No que devo focar' (Diagnóstico por Eixo + Revisão de Erros)");
        println!("  7) Exportar Relatório de Estudo em Markdown (relatorio_foco_enare.md)");
        println!("  0) Sair");
        print!("\nEscolha uma opção: ");
        let _ = io::stdout().flush();

        let mut entrada = String::new();
        if io::stdin().read_line(&mut entrada).is_err() {
            break;
        }
        match entrada.trim() {
            "1" => rodar_simulado_cli(banco, progresso, "Mini Simulado Rápido (5q)", 5, None, false),
            "2" => {
                println!("\nEscolha o Eixo Temático:");
                for (i, eixo) in EixoTematico::todos().iter().enumerate() {
                    println!("  {}) {}", i + 1, eixo.nome());
                }
                print!("Número do eixo (1-8): ");
                let _ = io::stdout().flush();
                let mut e_str = String::new();
                let _ = io::stdin().read_line(&mut e_str);
                if let Ok(idx) = e_str.trim().parse::<usize>() {
                    if idx >= 1 && idx <= EixoTematico::todos().len() {
                        let eixo = EixoTematico::todos()[idx - 1];
                        rodar_simulado_cli(
                            banco,
                            progresso,
                            &format!("Mini Simulado - {}", eixo.codigo()),
                            10,
                            Some(eixo),
                            false,
                        );
                    }
                }
            }
            "3" => rodar_simulado_cli(
                banco,
                progresso,
                "Mini Simulado Inteligente (Erros/Foco)",
                10,
                None,
                true,
            ),
            "4" => rodar_simulado_cli(
                banco,
                progresso,
                "Simulado Padrão ENARE (25q)",
                25,
                None,
                false,
            ),
            "5" => rodar_simulado_cli(
                banco,
                progresso,
                "Simulado Completo ENARE (93q)",
                banco.len(),
                None,
                false,
            ),
            "6" => exibir_diagnostico_cli(banco, progresso),
            "7" => {
                let _ = exportar_relatorio_markdown(banco, progresso);
                println!("\n\x1b[1;32mRelatório salvo com sucesso em 'relatorio_foco_enare.md'!\x1b[0m");
            }
            "0" => break,
            _ => println!("Opção inválida."),
        }
    }
}

fn rodar_simulado_cli(
    banco: &[Questao],
    progresso: &mut ProgressoUsuario,
    titulo: &str,
    qtd: usize,
    filtro_eixo: Option<EixoTematico>,
    foco_erros: bool,
) {
    let mut rng = Rng::new();
    let mut candidatas: Vec<Questao> = banco
        .iter()
        .filter(|q| filtro_eixo.map_or(true, |e| q.eixo == e))
        .cloned()
        .collect();

    rng.shuffle(&mut candidatas);

    if foco_erros {
        let diag = calcular_diagnostico(banco, progresso);
        let mut pesos_eixo = HashMap::new();
        for d in diag {
            pesos_eixo.insert(d.eixo, d.indice_prioridade);
        }
        candidatas.sort_by(|a, b| {
            let erro_a = progresso
                .por_questao
                .get(&a.id)
                .map(|s| s.tentativas > 0 && !s.ultimo_acerto)
                .unwrap_or(false);
            let erro_b = progresso
                .por_questao
                .get(&b.id)
                .map(|s| s.tentativas > 0 && !s.ultimo_acerto)
                .unwrap_or(false);
            erro_b.cmp(&erro_a).then_with(|| {
                let pa = pesos_eixo.get(&a.eixo).copied().unwrap_or(50.0);
                let pb = pesos_eixo.get(&b.eixo).copied().unwrap_or(50.0);
                pb.partial_cmp(&pa).unwrap_or(std::cmp::Ordering::Equal)
            })
        });
    }

    let selecionadas: Vec<Questao> = candidatas.into_iter().take(qtd).collect();
    if selecionadas.is_empty() {
        println!("Nenhuma questão encontrada para o filtro selecionado.");
        return;
    }

    let inicio = SystemTime::now();
    let mut respostas_usuario: Vec<(Questao, char)> = Vec::new();

    for (idx, q) in selecionadas.iter().enumerate() {
        println!(
            "\n\x1b[1;34m----------------------------------------------------------------------\x1b[0m"
        );
        println!(
            "\x1b[1;33m[Questão {}/{}] ({} - Q.{}) | {}\x1b[0m",
            idx + 1,
            selecionadas.len(),
            q.prova,
            q.numero_original,
            q.eixo.nome()
        );
        println!("\x1b[0;36mSubtema: {}\x1b[0m\n", q.subtema);
        println!("{}\n", q.enunciado);

        let letras = ['A', 'B', 'C', 'D', 'E'];
        for (i, alt) in q.alternativas.iter().enumerate() {
            println!("  \x1b[1m({})\x1b[0m {}", letras[i], alt);
        }

        let marcada = loop {
            print!("\nSua resposta (A-E): ");
            let _ = io::stdout().flush();
            let mut resp = String::new();
            let _ = io::stdin().read_line(&mut resp);
            if let Some(c) = resp.trim().chars().next() {
                let up = c.to_ascii_uppercase();
                if matches!(up, 'A' | 'B' | 'C' | 'D' | 'E') {
                    break up;
                }
            }
            println!("Por favor, digite uma letra válida entre A e E.");
        };

        progresso.registrar_resposta(q.id, marcada, q.gabarito);
        respostas_usuario.push((q.clone(), marcada));
    }

    let tempo_s = inicio.elapsed().map(|d| d.as_secs()).unwrap_or(0);
    let acertos = respostas_usuario
        .iter()
        .filter(|(q, m)| *m == q.gabarito)
        .count();
    progresso.registrar_simulado(titulo, selecionadas.len(), acertos, tempo_s);

    let perc = (acertos as f64 / selecionadas.len() as f64) * 100.0;
    println!("\n\x1b[1;36m======================================================================\x1b[0m");
    println!(
        "\x1b[1;37mRESULTADO DO SIMULADO: {}/{} acertos ({:.1}%) | Tempo: {}s\x1b[0m",
        acertos,
        selecionadas.len(),
        perc,
        tempo_s
    );
    println!("\x1b[1;36m======================================================================\x1b[0m");

    let erros: Vec<&(Questao, char)> = respostas_usuario
        .iter()
        .filter(|(q, m)| *m != q.gabarito)
        .collect();

    if erros.is_empty() {
        println!("\n\x1b[1;32mParabéns! Você gabaritou todas as questões deste simulado!\x1b[0m");
    } else {
        println!(
            "\n\x1b[1;31m>>> O QUE VOCÊ ERROU ({} questões) — REVISÃO COMENTADA:\x1b[0m",
            erros.len()
        );
        for (q, m) in erros {
            println!(
                "\n\x1b[1;33m• Q.{} ({}) — {}\x1b[0m",
                q.numero_original, q.subtema, q.eixo.nome()
            );
            println!(
                "  \x1b[1;31mSua marcação: ({})\x1b[0m | \x1b[1;32mGabarito Oficial FGV: ({})\x1b[0m",
                m, q.gabarito
            );
            println!("  \x1b[1mComentário:\x1b[0m {}", q.comentario);
        }
    }

    exibir_diagnostico_cli(banco, progresso);
}

pub fn exibir_diagnostico_cli(banco: &[Questao], progresso: &ProgressoUsuario) {
    let diag = calcular_diagnostico(banco, progresso);
    println!("\n\x1b[1;35m======================================================================\x1b[0m");
    println!("\x1b[1;37m   DIAGNÓSTICO ESTRATÉGICO: NO QUE VOCÊ DEVE FOCAR PARA O ENARE\x1b[0m");
    println!("\x1b[1;35m======================================================================\x1b[0m");

    for d in &diag {
        let badge = match d.nivel_alerta {
            "CRITICO" => "\x1b[1;31m[PRIORIDADE CRÍTICA]\x1b[0m",
            "ATENCAO" => "\x1b[1;33m[REVISÃO DIRECIONADA]\x1b[0m",
            "CONSOLIDADO" => "\x1b[1;32m[DOMÍNIO CONSOLIDADO]\x1b[0m",
            _ => "\x1b[1;36m[AINDA NÃO AVALIADO]\x1b[0m",
        };
        println!("\n{} \x1b[1m{}\x1b[0m", badge, d.eixo.nome());
        println!(
            "   Respondidas: {} | Acertos: {} | Erros: {} | Aproveitamento: {:.1}% | IPE: {:.1}",
            d.respondidas, d.acertos, d.erros, d.taxa_acerto, d.indice_prioridade
        );
        if d.nivel_alerta == "CRITICO" || d.nivel_alerta == "ATENCAO" {
            println!("   \x1b[0;33m-> O que estudar:\x1b[0m {}", d.eixo.trilha_recomendada());
        }
    }
}
