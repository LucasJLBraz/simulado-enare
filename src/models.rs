use std::collections::HashMap;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

pub const PROGRESS_FILE: &str = "enare_psicologia_progresso.json";
pub const DEFAULT_PORT: u16 = 8080;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum EixoTematico {
    SusLegislacaoRedes,
    AtencaoPrimariaPnhPoliticas,
    EticaDocumentosAvaliacao,
    ReformaPsiquiatricaRapsCaps,
    AlcoolDrogasVulnerabilidades,
    PsicologiaHospitalarPaliativos,
    PsicopatologiaNeuropsicologiaTea,
    TeoriaClinicaPsicanalitica,
}

impl EixoTematico {
    pub fn todos() -> &'static [EixoTematico] {
        &[
            EixoTematico::SusLegislacaoRedes,
            EixoTematico::AtencaoPrimariaPnhPoliticas,
            EixoTematico::EticaDocumentosAvaliacao,
            EixoTematico::ReformaPsiquiatricaRapsCaps,
            EixoTematico::AlcoolDrogasVulnerabilidades,
            EixoTematico::PsicologiaHospitalarPaliativos,
            EixoTematico::PsicopatologiaNeuropsicologiaTea,
            EixoTematico::TeoriaClinicaPsicanalitica,
        ]
    }

    pub fn codigo(&self) -> &'static str {
        match self {
            EixoTematico::SusLegislacaoRedes => "SUS_REDES",
            EixoTematico::AtencaoPrimariaPnhPoliticas => "APS_PNH",
            EixoTematico::EticaDocumentosAvaliacao => "ETICA_CFP",
            EixoTematico::ReformaPsiquiatricaRapsCaps => "RAPS_CAPS",
            EixoTematico::AlcoolDrogasVulnerabilidades => "AD_VIOLENCIA",
            EixoTematico::PsicologiaHospitalarPaliativos => "HOSPITALAR",
            EixoTematico::PsicopatologiaNeuropsicologiaTea => "PSICOPATO_NEURO",
            EixoTematico::TeoriaClinicaPsicanalitica => "PSICANALISE",
        }
    }

    pub fn nome(&self) -> &'static str {
        match self {
            EixoTematico::SusLegislacaoRedes => {
                "1. Legislação do SUS, Redes de Atenção (RAS) e Vigilância"
            }
            EixoTematico::AtencaoPrimariaPnhPoliticas => {
                "2. Atenção Primária (PNAB), eMulti/NASF, PNH, Biossegurança e Segurança do Paciente"
            }
            EixoTematico::EticaDocumentosAvaliacao => {
                "3. Ética Profissional, Resolução CFP nº 06/2019, SATEPSI e Bioética"
            }
            EixoTematico::ReformaPsiquiatricaRapsCaps => {
                "4. Reforma Psiquiátrica, RAPS, CAPS, PTS, Clínica Ampliada e Matriciamento"
            }
            EixoTematico::AlcoolDrogasVulnerabilidades => {
                "5. Álcool e Drogas (Redução de Danos), Violência, Desastres e Saúde do Trabalhador"
            }
            EixoTematico::PsicologiaHospitalarPaliativos => {
                "6. Psicologia Hospitalar, Cuidados Paliativos e Atuação em Saúde"
            }
            EixoTematico::PsicopatologiaNeuropsicologiaTea => {
                "7. Psicopatologia, Avaliação Neuropsicológica e TEA/Desenvolvimento"
            }
            EixoTematico::TeoriaClinicaPsicanalitica => {
                "8. Teoria e Clínica Psicanalítica (Freud, Ferenczi, Balint, Parentalidade e Luto)"
            }
        }
    }

    pub fn peso_enare(&self) -> f64 {
        match self {
            EixoTematico::ReformaPsiquiatricaRapsCaps => 1.35,
            EixoTematico::PsicologiaHospitalarPaliativos => 1.30,
            EixoTematico::PsicopatologiaNeuropsicologiaTea => 1.20,
            EixoTematico::AlcoolDrogasVulnerabilidades => 1.20,
            EixoTematico::AtencaoPrimariaPnhPoliticas => 1.15,
            EixoTematico::EticaDocumentosAvaliacao => 1.10,
            EixoTematico::TeoriaClinicaPsicanalitica => 1.05,
            EixoTematico::SusLegislacaoRedes => 1.00,
        }
    }

    pub fn trilha_recomendada(&self) -> &'static str {
        match self {
            EixoTematico::SusLegislacaoRedes => {
                "Revisar 8ª Conferência Nacional de Saúde (1986), Lei 8.080/90, Decreto 7.508/2011 (COAP e Regiões de Saúde), Portaria de Consolidação nº 3/2017 (RAS e Redes Temáticas) e Resolução CNS nº 588/2018 (Política Nacional de Vigilância em Saúde e financiamento tripartite)."
            }
            EixoTematico::AtencaoPrimariaPnhPoliticas => {
                "Revisar PNAB (infraestrutura das UBS, Consultório na Rua/Sisab, Equipe de Saúde da Família Ribeirinha - Portaria 837/2014), eMulti (Portaria GM/MS 635/2023 e antigo NASF-AB), PNH (Transversalidade), Tecnologias em Saúde (Merhy), Educação Permanente (Portarias 198/2004 e 1.996/2007), NR-32 e Segurança do Paciente (PNSP / RDC 36/2013)."
            }
            EixoTematico::EticaDocumentosAvaliacao => {
                "Revisar Código de Ética Profissional do Psicólogo (Art. 2º vedações e Art. 20 publicidade profissional), SATEPSI (Resolução CFP 09/2018), Resolução CFP nº 06/2019 (Declaração, Atestado, Relatório, Laudo e Parecer Psicológico), Processo Transexualizador e Bioética Principialista (Beauchamp & Childress: autonomia, beneficência, não-maleficência e justiça)."
            }
            EixoTematico::ReformaPsiquiatricaRapsCaps => {
                "Revisar Lei 10.216/2001, Portaria 3.088/2011 (RAPS: objetivos gerais, CAPS, Centros de Convivência, Unidades de Acolhimento), Projeto Terapêutico Singular (PTS: 4 momentos), Apoio Matricial (instrumentos de matriciamento), Acolhimento à Crise no CAPS, Acompanhamento Terapêutico (AT) no território, abordagem do delírio e Desmedicalização."
            }
            EixoTematico::AlcoolDrogasVulnerabilidades => {
                "Revisar Clínica Psicossocial em Álcool e Drogas, Redução de Danos (autonomia e cidadania sem exigir abstinência prévia), Violência Intrafamiliar e Notificação Compulsória pelo ECA (independe de autorização familiar), Emergências e Desastres (prevenção e respeito ao silêncio no pós-desastre), Resiliência em Boris Cyrulnik e Saúde do Trabalhador (CREPOP, Burnout, TEPT, saber operário e ideologia gerencialista em Gaulejac)."
            }
            EixoTematico::PsicologiaHospitalarPaliativos => {
                "Revisar Referências Técnicas do CFP para Atuação em Serviços Hospitalares do SUS (2019), especificidade da Psicologia Hospitalar, Avaliação Psicológica para Cirurgia Bariátrica e Hospitalar, Cuidado à Pessoa Idosa com dor crônica, Cuidados Paliativos (Diretivas Antecipadas de Vontade, Reunião Familiar, Paciente Crônico) e Urgências Subjetivas no hospital."
            }
            EixoTematico::PsicopatologiaNeuropsicologiaTea => {
                "Revisar Semiologia Psicopatológica (alucinação auditiva), DSM-5 e CID-10 (TEA níveis 1, 2 e 3; Deficiência Intelectual; Personalidade Borderline; Transtornos Somatoformes/Hipocondríaco; Codependência no TOC), Intervenções no TEA (ABA e clínica psicanalítica) e Avaliação Neuropsicológica (Anamnese e Funções Executivas)."
            }
            EixoTematico::TeoriaClinicaPsicanalitica => {
                "Revisar Freud ('Luto e Melancolia', Compulsão à Repetição), Sándor Ferenczi (Tato Psicológico = Empatia), Michael Balint ('O médico como remédio'), Parentalidade (pré-história da criança na história infantil dos pais), dinâmica psíquica e ansiedades na gestação, depressão na adolescência (padrão de apego inseguro) e escrita/testemunho no luto."
            }
        }
    }
}

#[derive(Clone)]
pub struct Questao {
    pub id: u32,
    pub numero_original: u32,
    pub prova: &'static str,
    pub competencia: &'static str,
    pub eixo: EixoTematico,
    pub subtema: &'static str,
    pub enunciado: &'static str,
    pub alternativas: [&'static str; 5],
    pub gabarito: char,
    pub comentario: &'static str,
    pub fonte_url: &'static str,
}

#[derive(Clone, Default)]
pub struct EstatisticaQuestao {
    pub tentativas: u32,
    pub acertos: u32,
    pub ultima_marcacao: Option<char>,
    pub ultimo_acerto: bool,
}

#[derive(Clone)]
pub struct RegistroSimulado {
    pub timestamp: u64,
    pub modo: String,
    pub total_questoes: usize,
    pub acertos: usize,
    pub tempo_segundos: u64,
}

#[derive(Default)]
pub struct ProgressoUsuario {
    pub por_questao: HashMap<u32, EstatisticaQuestao>,
    pub historico_simulados: Vec<RegistroSimulado>,
}

impl ProgressoUsuario {
    pub fn carregar() -> Self {
        let Ok(conteudo) = fs::read_to_string(PROGRESS_FILE) else {
            return Self::default();
        };
        Self::desserializar(&conteudo)
    }

    pub fn salvar(&self) {
        let json = self.serializar();
        let _ = fs::write(PROGRESS_FILE, json);
    }

    pub fn registrar_resposta(&mut self, id_questao: u32, marcada: char, gabarito: char) {
        let acertou = marcada.to_ascii_uppercase() == gabarito.to_ascii_uppercase();
        let entry = self.por_questao.entry(id_questao).or_default();
        entry.tentativas += 1;
        if acertou {
            entry.acertos += 1;
        }
        entry.ultima_marcacao = Some(marcada.to_ascii_uppercase());
        entry.ultimo_acerto = acertou;
    }

    pub fn registrar_simulado(
        &mut self,
        modo: &str,
        total_questoes: usize,
        acertos: usize,
        tempo_segundos: u64,
    ) {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        self.historico_simulados.push(RegistroSimulado {
            timestamp: ts,
            modo: modo.to_string(),
            total_questoes,
            acertos,
            tempo_segundos,
        });
        self.salvar();
    }

    fn serializar(&self) -> String {
        let mut out = String::from("{\n  \"questoes\": [\n");
        let mut ids: Vec<&u32> = self.por_questao.keys().collect();
        ids.sort();
        for (i, id) in ids.iter().enumerate() {
            let st = &self.por_questao[id];
            let ult = st.ultima_marcacao.unwrap_or('-');
            out.push_str(&format!(
                "    {{\"id\":{},\"tentativas\":{},\"acertos\":{},\"ultima\":\"{}\",\"ultimo_acerto\":{}}}{}\n",
                id,
                st.tentativas,
                st.acertos,
                ult,
                if st.ultimo_acerto { "true" } else { "false" },
                if i + 1 < ids.len() { "," } else { "" }
            ));
        }
        out.push_str("  ],\n  \"simulados\": [\n");
        for (i, sim) in self.historico_simulados.iter().enumerate() {
            out.push_str(&format!(
                "    {{\"timestamp\":{},\"modo\":\"{}\",\"total\":{},\"acertos\":{},\"tempo_s\":{}}}{}\n",
                sim.timestamp,
                escapar_json(&sim.modo),
                sim.total_questoes,
                sim.acertos,
                sim.tempo_segundos,
                if i + 1 < self.historico_simulados.len() { "," } else { "" }
            ));
        }
        out.push_str("  ]\n}\n");
        out
    }

    fn desserializar(s: &str) -> Self {
        let mut prog = Self::default();
        for line in s.lines() {
            let l = line.trim();
            if l.starts_with("{\"id\":") {
                let id = extrair_u32(l, "\"id\":").unwrap_or(0);
                let tentativas = extrair_u32(l, "\"tentativas\":").unwrap_or(0);
                let acertos = extrair_u32(l, "\"acertos\":").unwrap_or(0);
                let ultima = extrair_str(l, "\"ultima\":\"").and_then(|c| c.chars().next());
                let ultimo_acerto = l.contains("\"ultimo_acerto\":true");
                if id > 0 {
                    prog.por_questao.insert(
                        id,
                        EstatisticaQuestao {
                            tentativas,
                            acertos,
                            ultima_marcacao: ultima.filter(|&c| c != '-'),
                            ultimo_acerto,
                        },
                    );
                }
            } else if l.starts_with("{\"timestamp\":") {
                let timestamp = extrair_u64(l, "\"timestamp\":").unwrap_or(0);
                let modo = extrair_str(l, "\"modo\":\"").unwrap_or_else(|| "Simulado".to_string());
                let total_questoes = extrair_u32(l, "\"total\":").unwrap_or(0) as usize;
                let acertos = extrair_u32(l, "\"acertos\":").unwrap_or(0) as usize;
                let tempo_segundos = extrair_u64(l, "\"tempo_s\":").unwrap_or(0);
                if total_questoes > 0 {
                    prog.historico_simulados.push(RegistroSimulado {
                        timestamp,
                        modo,
                        total_questoes,
                        acertos,
                        tempo_segundos,
                    });
                }
            }
        }
        prog
    }
}

pub fn extrair_u32(s: &str, chave: &str) -> Option<u32> {
    let idx = s.find(chave)? + chave.len();
    let rest = &s[idx..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

pub fn extrair_u64(s: &str, chave: &str) -> Option<u64> {
    let idx = s.find(chave)? + chave.len();
    let rest = &s[idx..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

pub fn extrair_str(s: &str, chave: &str) -> Option<String> {
    let idx = s.find(chave)? + chave.len();
    let rest = &s[idx..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

pub fn escapar_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    out
}

pub struct Rng {
    state: u64,
}

impl Rng {
    pub fn new() -> Self {
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x853c49e6748fea9b);
        Self {
            state: if seed == 0 { 0xdeadbeefcafe1234 } else { seed },
        }
    }

    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    pub fn shuffle<T>(&mut self, slice: &mut [T]) {
        for i in (1..slice.len()).rev() {
            let j = (self.next_u64() as usize) % (i + 1);
            slice.swap(i, j);
        }
    }
}
