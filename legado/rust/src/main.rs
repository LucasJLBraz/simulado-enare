mod cli;
mod diagnostics;
mod models;
mod questions;
mod server;

use std::env;
use cli::executar_modo_cli;
use diagnostics::exportar_relatorio_markdown;
use models::{ProgressoUsuario, DEFAULT_PORT};
use questions::carregar_banco_questoes;
use server::iniciar_servidor_web;

fn main() {
    let args: Vec<String> = env::args().collect();
    let banco = carregar_banco_questoes();
    let mut progresso = ProgressoUsuario::carregar();

    if args.iter().any(|a| a == "--export-md") {
        exportar_relatorio_markdown(&banco, &progresso);
        println!("Relatório exportado para 'relatorio_foco_enare.md'.");
        return;
    }

    if args.iter().any(|a| a == "--cli") {
        executar_modo_cli(&banco, &mut progresso);
        return;
    }

    let mut porta = DEFAULT_PORT;
    for i in 0..args.len() {
        if args[i] == "--port" && i + 1 < args.len() {
            if let Ok(p) = args[i + 1].parse::<u16>() {
                porta = p;
            }
        }
    }

    iniciar_servidor_web(porta, banco, progresso);
}
