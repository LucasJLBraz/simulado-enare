use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::Command;

use crate::cli::executar_modo_cli;
use crate::diagnostics::calcular_diagnostico;
use crate::models::{
    escapar_json, extrair_str, extrair_u32, extrair_u64, ProgressoUsuario, Questao, PROGRESS_FILE,
};

const HTML_INTERFACE: &str = include_str!("ui.html");

fn serializar_questoes_json(banco: &[Questao], progresso: &ProgressoUsuario) -> String {
    let mut out = String::from("[\n");
    for (i, q) in banco.iter().enumerate() {
        let st = progresso.por_questao.get(&q.id).cloned().unwrap_or_default();
        let ult = st.ultima_marcacao.unwrap_or('-');
        out.push_str(&format!(
            "  {{\"id\":{},\"numero_original\":{},\"prova\":\"{}\",\"competencia\":\"{}\",\"eixo_cod\":\"{}\",\"eixo_nome\":\"{}\",\"peso_enare\":{:.2},\"subtema\":\"{}\",\"enunciado\":\"{}\",\"alternativas\":[\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"],\"gabarito\":\"{}\",\"comentario\":\"{}\",\"trilha\":\"{}\",\"fonte_url\":\"{}\",\"tentativas\":{},\"acertos\":{},\"ultima_marcacao\":\"{}\",\"ultimo_acerto\":{}}}{}\n",
            q.id,
            q.numero_original,
            escapar_json(q.prova),
            escapar_json(q.competencia),
            q.eixo.codigo(),
            escapar_json(q.eixo.nome()),
            q.eixo.peso_enare(),
            escapar_json(q.subtema),
            escapar_json(q.enunciado),
            escapar_json(q.alternativas[0]),
            escapar_json(q.alternativas[1]),
            escapar_json(q.alternativas[2]),
            escapar_json(q.alternativas[3]),
            escapar_json(q.alternativas[4]),
            q.gabarito,
            escapar_json(q.comentario),
            escapar_json(q.eixo.trilha_recomendada()),
            escapar_json(q.fonte_url),
            st.tentativas,
            st.acertos,
            ult,
            if st.ultimo_acerto { "true" } else { "false" },
            if i + 1 < banco.len() { "," } else { "" }
        ));
    }
    out.push_str("]\n");
    out
}

fn serializar_diagnostico_json(banco: &[Questao], progresso: &ProgressoUsuario) -> String {
    let diag = calcular_diagnostico(banco, progresso);
    let mut out = String::from("{\n  \"eixos\": [\n");
    for (i, d) in diag.iter().enumerate() {
        out.push_str(&format!(
            "    {{\"codigo\":\"{}\",\"nome\":\"{}\",\"total_banco\":{},\"respondidas\":{},\"acertos\":{},\"erros\":{},\"taxa_acerto\":{:.1},\"indice_prioridade\":{:.1},\"nivel_alerta\":\"{}\",\"trilha\":\"{}\"}}{}\n",
            d.eixo.codigo(),
            escapar_json(d.eixo.nome()),
            d.total_banco,
            d.respondidas,
            d.acertos,
            d.erros,
            d.taxa_acerto,
            d.indice_prioridade,
            d.nivel_alerta,
            escapar_json(d.eixo.trilha_recomendada()),
            if i + 1 < diag.len() { "," } else { "" }
        ));
    }
    out.push_str("  ],\n  \"historico\": [\n");
    for (i, h) in progresso.historico_simulados.iter().rev().take(20).enumerate() {
        let total_hist = progresso.historico_simulados.len().min(20);
        out.push_str(&format!(
            "    {{\"timestamp\":{},\"modo\":\"{}\",\"total\":{},\"acertos\":{},\"tempo_s\":{}}}{}\n",
            h.timestamp,
            escapar_json(&h.modo),
            h.total_questoes,
            h.acertos,
            h.tempo_segundos,
            if i + 1 < total_hist { "," } else { "" }
        ));
    }
    out.push_str("  ]\n}\n");
    out
}

fn processar_submissao_json(
    body: &str,
    banco: &[Questao],
    progresso: &mut ProgressoUsuario,
) -> String {
    let modo = extrair_str(body, "\"modo\":\"").unwrap_or_else(|| "Simulado ENARE".to_string());
    let tempo_s = extrair_u64(body, "\"tempo_s\":").unwrap_or(0);
    let mut total = 0usize;
    let mut acertos = 0usize;

    if let Some(pos) = body.find("\"respostas\":[") {
        let rest = &body[pos + "\"respostas\":[".len()..];
        for item in rest.split('}') {
            if let Some(id) = extrair_u32(item, "\"id\":") {
                if let Some(marc_str) = extrair_str(item, "\"marcada\":\"") {
                    if let Some(marcada) = marc_str.chars().next() {
                        if let Some(q) = banco.iter().find(|q| q.id == id) {
                            total += 1;
                            if marcada.to_ascii_uppercase() == q.gabarito {
                                acertos += 1;
                            }
                            progresso.registrar_resposta(q.id, marcada, q.gabarito);
                        }
                    }
                }
            }
        }
    }

    if total > 0 {
        progresso.registrar_simulado(&modo, total, acertos, tempo_s);
    }

    serializar_diagnostico_json(banco, progresso)
}

fn responder_http(mut stream: TcpStream, status: &str, content_type: &str, body: &str) {
    let header = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        status,
        content_type,
        body.as_bytes().len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(body.as_bytes());
    let _ = stream.flush();
}

pub fn iniciar_servidor_web(porta: u16, banco: Vec<Questao>, mut progresso: ProgressoUsuario) {
    let endereco = format!("127.0.0.1:{}", porta);
    let listener = match TcpListener::bind(&endereco) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Erro ao abrir porta {}: {}. Iniciando modo CLI...", porta, e);
            executar_modo_cli(&banco, &mut progresso);
            return;
        }
    };

    let url = format!("http://{}", endereco);
    println!("\x1b[1;32m======================================================================\x1b[0m");
    println!("\x1b[1;37m  ENARE PSICOLOGIA — SERVIDOR RUST ATIVO EM: {}\x1b[0m", url);
    println!("  • Banco carregado: {} questões oficiais válidas ENARE/FGV", banco.len());
    println!("  • Arquivo de progresso local: {}", PROGRESS_FILE);
    println!("  • Dica: use 'cargo run --release -- --cli' para rodar no terminal");
    println!("\x1b[1;32m======================================================================\x1b[0m");

    let _ = Command::new("xdg-open").arg(&url).spawn();

    for stream_res in listener.incoming() {
        let Ok(mut stream) = stream_res else { continue };
        let mut buffer = [0u8; 65536];
        let Ok(n) = stream.read(&mut buffer) else { continue };
        if n == 0 {
            continue;
        }
        let req = String::from_utf8_lossy(&buffer[..n]);
        let primeira_linha = req.lines().next().unwrap_or("");

        if primeira_linha.starts_with("GET /api/questoes") {
            let json = serializar_questoes_json(&banco, &progresso);
            responder_http(stream, "200 OK", "application/json", &json);
        } else if primeira_linha.starts_with("GET /api/diagnostico") {
            let json = serializar_diagnostico_json(&banco, &progresso);
            responder_http(stream, "200 OK", "application/json", &json);
        } else if primeira_linha.starts_with("POST /api/submeter") {
            let body = req.split("\r\n\r\n").nth(1).unwrap_or("");
            let json = processar_submissao_json(body, &banco, &mut progresso);
            responder_http(stream, "200 OK", "application/json", &json);
        } else if primeira_linha.starts_with("POST /api/resetar") {
            progresso = ProgressoUsuario::default();
            progresso.salvar();
            let json = serializar_diagnostico_json(&banco, &progresso);
            responder_http(stream, "200 OK", "application/json", &json);
        } else {
            responder_http(stream, "200 OK", "text/html", HTML_INTERFACE);
        }
    }
}
