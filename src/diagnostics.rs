use std::fs;
use crate::models::{EixoTematico, ProgressoUsuario, Questao};

pub struct DiagnosticoEixo {
    pub eixo: EixoTematico,
    pub total_banco: usize,
    pub respondidas: u32,
    pub acertos: u32,
    pub erros: u32,
    pub taxa_acerto: f64,
    pub indice_prioridade: f64,
    pub nivel_alerta: &'static str,
}

pub fn calcular_diagnostico(
    banco: &[Questao],
    progresso: &ProgressoUsuario,
) -> Vec<DiagnosticoEixo> {
    let mut resultado = Vec::new();

    for &eixo in EixoTematico::todos() {
        let questoes_eixo: Vec<&Questao> = banco.iter().filter(|q| q.eixo == eixo).collect();
        let total_banco = questoes_eixo.len();
        let mut respondidas = 0u32;
        let mut acertos = 0u32;

        for q in &questoes_eixo {
            if let Some(st) = progresso.por_questao.get(&q.id) {
                respondidas += st.tentativas;
                acertos += st.acertos;
            }
        }

        let erros = respondidas.saturating_sub(acertos);
        let taxa_acerto = if respondidas > 0 {
            (acertos as f64 / respondidas as f64) * 100.0
        } else {
            0.0
        };

        let deficit = if respondidas == 0 {
            65.0
        } else {
            (100.0 - taxa_acerto) + (erros as f64 * 4.5).min(25.0)
        };
        let indice_prioridade = deficit * eixo.peso_enare();

        let nivel_alerta = if respondidas == 0 {
            "NAO_AVALIADO"
        } else if taxa_acerto < 60.0 {
            "CRITICO"
        } else if taxa_acerto < 78.0 {
            "ATENCAO"
        } else {
            "CONSOLIDADO"
        };

        resultado.push(DiagnosticoEixo {
            eixo,
            total_banco,
            respondidas,
            acertos,
            erros,
            taxa_acerto,
            indice_prioridade,
            nivel_alerta,
        });
    }

    resultado.sort_by(|a, b| {
        b.indice_prioridade
            .partial_cmp(&a.indice_prioridade)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    resultado
}

pub fn exportar_relatorio_markdown(banco: &[Questao], progresso: &ProgressoUsuario) -> String {
    let diag = calcular_diagnostico(banco, progresso);
    let mut md = String::from("# Relatório de Diagnóstico e Foco — ENARE Psicologia\n\n");
    md.push_str("## 1. Matriz de Prioridade de Estudo por Eixo Temático\n\n");
    md.push_str("| Prioridade | Eixo Temático | Respondidas | Acertos | Erros | Aproveitamento | IPE |\n");
    md.push_str("| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n");
    for d in &diag {
        md.push_str(&format!(
            "| **{}** | {} | {} | {} | {} | {:.1}% | {:.1} |\n",
            d.nivel_alerta,
            d.eixo.nome(),
            d.respondidas,
            d.acertos,
            d.erros,
            d.taxa_acerto,
            d.indice_prioridade
        ));
    }

    md.push_str("\n## 2. Caderno de Erros Atuais (Questões para Revisar)\n\n");
    let erros: Vec<&Questao> = banco
        .iter()
        .filter(|q| {
            progresso
                .por_questao
                .get(&q.id)
                .map(|s| s.tentativas > 0 && !s.ultimo_acerto)
                .unwrap_or(false)
        })
        .collect();

    if erros.is_empty() {
        md.push_str("Nenhuma questão com erro pendente registrada no momento.\n");
    } else {
        for q in erros {
            let st = &progresso.por_questao[&q.id];
            md.push_str(&format!(
                "### Q.{} ({}) — {}\n- **Subtema:** {}\n- **Sua última marcação:** `({})` | **Gabarito Oficial FGV:** `({})`\n- **Comentário:** {}\n- **O que revisar:** {}\n\n",
                q.numero_original,
                q.prova,
                q.eixo.nome(),
                q.subtema,
                st.ultima_marcacao.unwrap_or('-'),
                q.gabarito,
                q.comentario,
                q.eixo.trilha_recomendada()
            ));
        }
    }

    let _ = fs::write("relatorio_foco_enare.md", &md);
    md
}
