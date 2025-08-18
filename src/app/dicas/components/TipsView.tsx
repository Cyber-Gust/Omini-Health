'use client';

import { useState } from 'react';
import Image from "next/image";

/**
 * Base de dados de dicas para médicos em início de carreira e consultório.
 * Estruturado por categorias para facilitar navegação e manutenção.
 * Pode ser versionado e/ou carregado de uma API no futuro.
 */
const tipsData = {
  // ========= COMUNICAÇÃO =========
  'Comunicação Efetiva': [
    {
      title: 'Utilize Perguntas Abertas',
      content:
        "Prefira perguntas abertas para obter mais contexto: 'Pode me contar como começaram os sintomas?' em vez de 'Está com dor?'.",
    },
    {
      title: 'Escuta Ativa e Reformulação',
      content:
        "Demonstre que compreendeu: 'Então a dor piora ao subir escadas e melhora em repouso, certo?'. Isso alinha expectativas e aumenta a confiança.",
    },
    {
      title: 'Evite Jargões',
      content:
        "Traduza termos técnicos: em vez de 'hipertensão não controlada', diga 'sua pressão tem ficado alta e precisa de ajustes'.",
    },
    {
      title: 'Valide Emoções',
      content:
        "Reconheça preocupações: 'Entendo que isso assusta. Vamos por partes e explicar o que vamos fazer agora.'",
    },
    {
      title: 'Encerramento com “Teach-back”',
      content:
        "Peça para o paciente repetir o plano: 'Você pode me dizer como vai tomar o remédio e quando retornar?'. Isso reduz erros.",
    },
  ],

  // ========= ANAMNESE =========
  'Anamnese Otimizada': [
    {
      title: "OPQRST para Dor",
      content:
        "Onset, Piora/Alivia, Qualidade, Irradiação, Severidade (0–10), Tempo/Curso. Documente de forma sucinta e objetiva.",
    },
    {
      title: 'ICE (Ideias, Preocupações, Expectativas)',
      content:
        "Pergunte o que o paciente acha que tem, o que teme e o que espera da consulta. Direciona conduta e adesão.",
    },
    {
      title: 'História Focada',
      content:
        "Comece pelo motivo da consulta, evolua por linha do tempo e feche com antecedentes, medicamentos, alergias e hábitos.",
    },
    {
      title: 'Red Flags na Anamnese',
      content:
        "Procure sinais de gravidade (perda ponderal inexplicada, febre prolongada, dor torácica súbita, déficit neurológico).",
    },
    {
      title: 'Medicações e Alergias',
      content:
        "Registre dose, frequência, início e adesão. Anote alergias e tipo de reação. Isso previne eventos adversos.",
    },
  ],

  // ========= EXAME FÍSICO =========
  'Exame Físico Focado': [
    {
      title: 'Sequência: Inspeção-Palpação-Percussão-Ausculta',
      content:
        'Siga a sistemática, mas adapte ao motivo da consulta. Meça sinais vitais sempre que houver queixa clínica.',
    },
    {
      title: 'Exame Geral Primeiro',
      content:
        'Avalie estado geral, nível de consciência, perfusão periférica, padrão respiratório e coloração da pele.',
    },
    {
      title: 'Use Manobras Validadas',
      content:
        'Ex.: Sinal de Murphy (vesícula), Lasègue (radiculopatia), Ottawa (traumas). Descreva achados de forma objetiva.',
    },
    {
      title: 'Compare Lados',
      content:
        'Em ortopedia e neuro, sempre compare lados para força, sensibilidade, reflexos e amplitude de movimento.',
    },
    {
      title: 'Registre Medidas',
      content:
        'Pressão, frequência, saturação, temperatura, IMC e circunferência abdominal ajudam no acompanhamento.',
    },
  ],

  // ========= SINAIS DE ALERTA =========
  'Sinais de Alarme (Red Flags)': [
    {
      title: 'Dor Torácica',
      content:
        'Irradiação para braço/mandíbula, sudorese, dispneia, náuseas, hipotensão. Considere emergências cardiovasculares.',
    },
    {
      title: 'Dispneia Aguda',
      content:
        'Saturação < 92%, uso de musculatura acessória, cianose, confusão. Não demore para oxigenar e referenciar.',
    },
    {
      title: 'Cefaleia Nova Intensa',
      content:
        '“Pior da vida”, déficit focal, rigidez de nuca, febre, imunossupressão. Avaliar causas graves.',
    },
    {
      title: 'Sangramento/Choque',
      content:
        'Hipotensão, taquicardia, pele fria, confusão. Reanime, identifique fonte e acione suporte.',
    },
    {
      title: 'Déficit Neurológico Súbito',
      content:
        'Face caída, fraqueza em membro, fala alterada (FAST). Tempo é cérebro: fluxo de AVC.',
    },
  ],

  // ========= PRESCRIÇÃO =========
  'Prescrição Segura': [
    {
      title: '5 Certos da Medicação',
      content:
        'Paciente certo, medicamento certo, dose certa, via certa, horário certo. Confirme alergias.',
    },
    {
      title: 'Ajuste por Função Renal/Hepática',
      content:
        'Cheque creatinina/clearance e transaminases para fármacos com eliminação dependente.',
    },
    {
      title: 'Evite Interações',
      content:
        'Revise interações relevantes (ex.: anticoagulantes, macrolídeos, antifúngicos).',
    },
    {
      title: 'Escreva Claramente',
      content:
        'Duração, posologia, orientações (com/sem alimento), e efeitos colaterais comuns.',
    },
    {
      title: 'Revisão da Receita',
      content:
        'Antes de finalizar, releia tudo. Erros simples causam eventos adversos.',
    },
  ],

  // ========= ÉTICA E LEGAL =========
  'Ética e Aspectos Legais': [
    {
      title: 'Consentimento Informado',
      content:
        'Explique riscos/benefícios e alternativas. Registre que o paciente compreendeu e concordou.',
    },
    {
      title: 'Sigilo e LGPD',
      content:
        'Proteja dados pessoais/sensíveis. Use apenas o necessário e controle acesso.',
    },
    {
      title: 'Limites de Competência',
      content:
        'Encaminhe quando necessário. Documente motivo do encaminhamento.',
    },
    {
      title: 'Conflitos de Interesse',
      content:
        'Evite influências comerciais nas decisões clínicas. Transparência é essencial.',
    },
    {
      title: 'Registro Completo',
      content:
        'Prontuário é documento legal. Seja objetivo, cronológico e impessoal.',
    },
  ],

  // ========= SEGURANÇA DO PACIENTE =========
  'Segurança do Paciente': [
    {
      title: 'Identificação Correta',
      content:
        'Use nome completo + data de nascimento. Evita trocas de pacientes/exames.',
    },
    {
      title: 'Checklists Simples',
      content:
        'Padronize fluxos (por ex., dor torácica, asma aguda, alergias). Reduz variabilidade.',
    },
    {
      title: 'Dupla Checagem',
      content:
        'Ex.: resultados críticos, antibióticos endovenosos, anticoagulação.',
    },
    {
      title: 'Notifique Quase-Erros',
      content:
        'Quase falhas ensinam muito. Crie cultura não punitiva para aprendizado.',
    },
    {
      title: 'Aconselhamento de Retorno',
      content:
        'Defina sinais de piora e quando retornar imediatamente. Entregue por escrito.',
    },
  ],

  // ========= PROCEDIMENTOS =========
  'Procedimentos Básicos': [
    {
      title: 'Paramentação e Assepsia',
      content:
        'Lave as mãos, luvas quando indicado, pele com antisséptico. Organize bandeja antes de começar.',
    },
    {
      title: 'Infiltração Local',
      content:
        'Aspire antes de injetar, injete lentamente, explique desconfortos esperados ao paciente.',
    },
    {
      title: 'Suturas Simples',
      content:
        'Irrigue bem, avalie necessidade de profilaxia antitetânica/antibiótica, revisões de curativo.',
    },
    {
      title: 'Retirada de Pontos',
      content:
        'Verifique cicatrização, sinais de infecção, orientações de cuidado domiciliar.',
    },
    {
      title: 'Eletrocardiograma',
      content:
        'Cheque posicionamento de derivações e interprete sistematicamente (ritmo, eixo, intervalos, ST-T).',
    },
  ],

  // ========= URGÊNCIAS COMUNS =========
  'Urgências Comuns no Consultório': [
    {
      title: 'Crise Hipertensiva',
      content:
        'Confirme medida, avalie sintomas/lesão-alvo. Diferencie urgência vs. emergência e direcione fluxo.',
    },
    {
      title: 'Broncoespasmo/Asma',
      content:
        'SABA inalatório, oxigênio conforme saturação, reavaliação frequente e plano de manutenção.',
    },
    {
      title: 'Hipoglicemia',
      content:
        'Se consciente, carboidrato de ação rápida; se grave, glicose EV ou glucagon IM. Reavalie causas.',
    },
    {
      title: 'Reação Alérgica',
      content:
        'Urticária: anti-histamínico; anafilaxia: adrenalina IM, via aérea, acesso venoso e encaminhamento.',
    },
    {
      title: 'Síncope',
      content:
        'Avalie risco (ECG, história). Diferencie vasovagal de causas cardíacas/neurológicas.',
    },
  ],

  // ========= CARDIO =========
  'Cardiologia Essencial': [
    {
      title: 'MAPA/AMPA',
      content:
        'Use medidas fora do consultório para confirmar hipertensão e ajustar tratamento.',
    },
    {
      title: 'Risco Cardiovascular',
      content:
        'Calcule risco global para orientar metas (PA, LDL, A1c) e intervenções.',
    },
    {
      title: 'Dor Torácica Estável',
      content:
        'Characterize com escore (ex.: Diamond-Forrester) e indique testes conforme probabilidade pré-teste.',
    },
    {
      title: 'Insuficiência Cardíaca',
      content:
        'Sinais de congestão, ajuste diurético, educação sobre peso diário e sal.',
    },
    {
      title: 'Aderência',
      content:
        'Simplifique esquemas (1x/dia quando possível) e utilize associações fixas.',
    },
  ],

  // ========= PNEUMO =========
  'Pneumologia (Básico)': [
    {
      title: 'Asma vs. DPOC',
      content:
        'História, espirometria e resposta a broncodilatador. Oriente técnica inalatória.',
    },
    {
      title: 'Tosse Crônica',
      content:
        'Tripé comum: gotejamento pós-nasal, asma/hiperreatividade, DRGE. Investigue sistematicamente.',
    },
    {
      title: 'Rx de Tórax',
      content:
        'Cheque qualidade, linhas/contornos, pulmões, mediastino, diafragma e ossos.',
    },
    {
      title: 'Exacerbação de DPOC',
      content:
        'Broncodilatador, corticoide sistêmico curto, antibiótico se critérios. Reforçar cessação de tabaco.',
    },
    {
      title: 'Oxigenoterapia',
      content:
        'Use alvo de saturação (ex.: 92–96%). Evite hiperóxia em DPOC grave.',
    },
  ],

  // ========= GASTRO =========
  'Gastroenterologia (Básico)': [
    {
      title: 'Dispepsia',
      content:
        'Alarme: perda de peso, vômitos persistentes, sangramento, anemia, disfagia. Teste e trate H. pylori conforme protocolo.',
    },
    {
      title: 'DRGE',
      content:
        'Medidas não farmacológicas (elevar cabeceira, evitar refeições noturnas) + IBP conforme resposta.',
    },
    {
      title: 'Diarréia Aguda',
      content:
        'Hidratação é prioridade. Antibiótico apenas se sinais de invasão, febre alta ou risco específico.',
    },
    {
      title: 'Constipação',
      content:
        'Fibra, líquidos, atividade física, educação evacuatória e laxativos conforme necessidade.',
    },
    {
      title: 'Esteatose',
      content:
        'Controle de peso, atividade física, manejo de DM/Dislipidemia e avaliação de fibrose quando indicado.',
    },
  ],

  // ========= ENDO =========
  'Endocrinologia (Básico)': [
    {
      title: 'Diabetes: Metas',
      content:
        'Personalize A1c, PA e LDL conforme idade/comorbidades. Educação sobre hipoglicemia é essencial.',
    },
    {
      title: 'Insulina: Registros',
      content:
        'Cheque glicemias, técnica e locais de aplicação. Ajuste com base em padrões, não em valores isolados.',
    },
    {
      title: 'Tireoide',
      content:
        'Solicite TSH inicialmente; complemente com T4 livre conforme cenário clínico.',
    },
    {
      title: 'Obesidade',
      content:
        'Abordagem multiprofissional, metas realistas (5–10% de perda em 6 meses) e escolha cuidadosa de fármacos.',
    },
    {
      title: 'Dislipidemia',
      content:
        'Estratifique risco e defina alvo de LDL. Reforce adesão e efeitos de estatinas.',
    },
  ],

  // ========= NEFRO =========
  'Nefrologia (Básico)': [
    {
      title: 'Função Renal',
      content:
        'Acompanhe eGFR e albuminúria para estratificar DRC e ajustar medicações.',
    },
    {
      title: 'Hipercalemia',
      content:
        'Confirme em ECG, trate causas (IECA/ARA + DRC), dieta e resinas quando indicado.',
    },
    {
      title: 'ITUs Recorrentes',
      content:
        'Reveja fatores de risco, higiene miccional, hidratação e necessidade de investigação urológica.',
    },
    {
      title: 'HAS e Rim',
      content:
        'Alvo pressórico individualizado; considere iSGLT2/ARM em DRC com proteinúria.',
    },
    {
      title: 'Hidratação e Contrastados',
      content:
        'Estratifique risco de NTA por contraste e previna com hidratação adequada.',
    },
  ],

  // ========= ORTO =========
  'Ortopedia Básica': [
    {
      title: 'Regra de Ottawa (Tornozelo/Pé)',
      content:
        'Ajuda a decidir necessidade de RX após trauma. Reduz exames desnecessários.',
    },
    {
      title: 'Cervicalgia e Lombalgia',
      content:
        'Sem red flags, evite imagem precoce. Oriente analgesia, mobilidade e retorno gradual.',
    },
    {
      title: 'Entorses',
      content:
        'RICE (repouso, gelo, compressão, elevação), proteção articular e reabilitação funcional.',
    },
    {
      title: 'Ombro Doloroso',
      content:
        'Teste de impacto, manobras do manguito. Reabilitação é pilar do tratamento.',
    },
    {
      title: 'Fraturas Suspeitas',
      content:
        'Imobilize antes de imagens se dor/crepitação deformidade significativa.',
    },
  ],

  // ========= INFECTO =========
  'Infectologia (Básico)': [
    {
      title: 'Antibiótico: Use Quando Indicado',
      content:
        'Evite prescrever para viroses. Siga critérios clínicos e duração adequada.',
    },
    {
      title: 'Febre de Origem Indeterminada',
      content:
        'Revisite história, viagens, exposições, drogas e focos ocultos.',
    },
    {
      title: 'Profilaxias',
      content:
        'Atualize calendário vacinal e oriente profilaxias pós-exposição quando aplicável.',
    },
    {
      title: 'Testes Rápidos',
      content:
        'Conheça limitações de sensibilidade/especificidade e o momento ideal de coleta.',
    },
    {
      title: 'Coleta Correta',
      content:
        'Oriente jejum, horários e acondicionamento para reduzir falsos resultados.',
    },
  ],

  // ========= PEDIATRIA =========
  'Pediatria no Consultório': [
    {
      title: 'Crescimento e Desenvolvimento',
      content:
        'Acompanhe curvas, marcos motores e linguagem. Investigue desvios precocemente.',
    },
    {
      title: 'Febre na Criança',
      content:
        'Idade <3 meses pede atenção especial. Hidratação, sinais de alarme e analgesia.',
    },
    {
      title: 'Asma Infantil',
      content:
        'Eduque cuidadores sobre técnica inalatória e plano de ação escrito.',
    },
    {
      title: 'Antibióticos com Cautela',
      content:
        'Otite, sinusite e faringoamigdalite têm critérios específicos. Evite uso desnecessário.',
    },
    {
      title: 'Vacinação',
      content:
        'Cheque caderneta e oportunidades de atualização em cada visita.',
    },
  ],

  // ========= OBSTETRÍCIA =========
  'Saúde da Mulher e Obstetrícia': [
    {
      title: 'Gestação: Sinais de Alarme',
      content:
        'Sangramento, dor abdominal intensa, cefaleia grave, visão turva, edema súbito, redução de movimentos fetais.',
    },
    {
      title: 'Pré-Natal Básico',
      content:
        'Acompanhe PA, ganho ponderal, exames de rotina e educação sobre sinais de risco.',
    },
    {
      title: 'Planejamento Reprodutivo',
      content:
        'Contracepção personalizada considerando comorbidades e preferências.',
    },
    {
      title: 'Infecções na Gestação',
      content:
        'Escolha antibióticos seguros. Oriente medidas preventivas (toxoplasmose, listeriose).',
    },
    {
      title: 'Puerpério',
      content:
        'Saúde mental, amamentação e retorno gradual às atividades. Investigue sinais de depressão pós-parto.',
    },
  ],

  // ========= GERIATRIA =========
  'Geriatria Prática': [
    {
      title: 'Avaliação Global',
      content:
        'Funcionalidade (ABVD/AIVD), cognição, humor, quedas, polifarmácia e suporte social.',
    },
    {
      title: 'Polifarmácia',
      content:
        'Reveja necessidade e risco/benefício de cada fármaco. Desprescreva quando apropriado.',
    },
    {
      title: 'Quedas',
      content:
        'Rastreie risco, ajuste medicações sedativas, fortaleça e oriente adaptações domiciliares.',
    },
    {
      title: 'Delirium',
      content:
        'Instalação aguda, flutuação, atenção prejudicada. Procure gatilhos (infecção, dor, desidratação).',
    },
    {
      title: 'Metas Individualizadas',
      content:
        'Metas de PA, A1c e LDL podem ser mais conservadoras conforme fragilidade.',
    },
  ],

  // ========= SAÚDE MENTAL =========
  'Saúde Mental no Consultório': [
    {
      title: 'Rastreamento',
      content:
        'Use instrumentos breves (PHQ-9, GAD-7) para subsidiar a avaliação clínica.',
    },
    {
      title: 'Risco de Autoagressão',
      content:
        'Pergunte diretamente e com acolhimento. Defina plano de segurança e rede de apoio.',
    },
    {
      title: 'Tratamento Inicial',
      content:
        'Comece com psicoeducação, higiene do sono, atividade física e psicoterapia quando disponível.',
    },
    {
      title: 'Farmacoterapia',
      content:
        'Inicie baixas doses, ajuste gradual e explique efeitos esperados e colaterais.',
    },
    {
      title: 'Acompanhamento Próximo',
      content:
        'Agende reavaliação precoce ao iniciar/ajustar antidepressivos ou ansiolíticos.',
    },
  ],

  // ========= DERMATO =========
  'Dermatologia (Básico)': [
    {
      title: 'Descrição Lesional',
      content:
        'Tipo (mácula, pápula, placa, vesícula), cor, bordas, distribuição e sintomas (prurido, dor).',
    },
    {
      title: 'Infecções Comuns',
      content:
        'Impetigo, tinea, candidíase: trate conforme agente e localização. Oriente medidas de prevenção.',
    },
    {
      title: 'Eczema/dermatite',
      content:
        'Emolientes regulares, corticoide tópico por tempo limitado e identificar gatilhos.',
    },
    {
      title: 'Câncer de Pele (Sinais ABCDE)',
      content:
        'Assimetria, Bordas, Cor, Diâmetro, Evolução. Encaminhe lesões suspeitas.',
    },
    {
      title: 'Fotoproteção',
      content:
        'FPS adequado, reaplicação, barreiras físicas e educação sobre exposição.',
    },
  ],

  // ========= TELEMEDICINA =========
  'Telemedicina com Segurança': [
    {
      title: 'Confirmação de Identidade',
      content:
        'Valide dados, ambiente privado e consentimento para atendimento remoto.',
    },
    {
      title: 'Limites do Formato',
      content:
        'Defina o que pode e não pode ser resolvido on-line. Oriente sinais de alarme para atendimento presencial.',
    },
    {
      title: 'Documentação',
      content:
        'Registre que a consulta foi remota, qualidade da conexão, exames visuais feitos e plano.',
    },
    {
      title: 'Receitas Digitais',
      content:
        'Siga regras locais e inclua todas as informações obrigatórias.',
    },
    {
      title: 'Privacidade e LGPD',
      content:
        'Use plataforma segura, evite apps pessoais e proteja arquivos compartilhados.',
    },
  ],

  // ========= ROTINA DO CONSULTÓRIO =========
  'Fluxo do Consultório': [
    {
      title: 'Agenda Realista',
      content:
        'Reserve buffers para atrasos e encaixes. Evita efeito cascata e estresse.',
    },
    {
      title: 'Checklist Pré-consulta',
      content:
        'Dados vitais, lista de meds, alergias, exames recentes e motivo da consulta já no triagem.',
    },
    {
      title: 'Pós-consulta',
      content:
        'Entregar plano escrito, orientações de retorno e solicitação de contato em caso de piora.',
    },
    {
      title: 'Comunicação com a Recepção',
      content:
        'Sinais de alarme e prioridades precisam estar alinhados com a equipe.',
    },
    {
      title: 'Indicadores Simples',
      content:
        'Tempo médio de consulta, no-show, reconsultas precoces e satisfação do paciente.',
    },
  ],

  // ========= TRABALHO EM EQUIPE =========
  'Trabalho em Equipe': [
    {
      title: 'Briefings e Debriefings',
      content:
        'Encontros rápidos no início/fim do dia alinham prioridades e aprendizados.',
    },
    {
      title: 'Delegação Clara',
      content:
        'Protocolos e escopo de atuação para cada função (enfermagem, recepção, apoio).',
    },
    {
      title: 'Comunicação SBAR',
      content:
        'Situação, Background, Avaliação, Recomendação — para contatos internos ou referências.',
    },
    {
      title: 'Feedback Respeitoso',
      content:
        'Concreto, objetivo e oportuno. Foque em processo, não em pessoas.',
    },
    {
      title: 'Cultura de Segurança',
      content:
        'Todos podem levantar uma preocupação de segurança sem medo de punição.',
    },
  ],

  // ========= REGISTRO =========
  'Documentação e Prontuário': [
    {
      title: 'Objetividade',
      content:
        'Escreva fatos observáveis, evitando juízos de valor. Siga cronologia do atendimento.',
    },
    {
      title: 'SOAP',
      content:
        'Subjective, Objective, Assessment, Plan. Facilita leitura rápida e continuidade do cuidado.',
    },
    {
      title: 'Anexos',
      content:
        'Digitalize exames importantes e registre interpretação clínica.',
    },
    {
      title: 'Rastreabilidade',
      content:
        'Registre horários e responsáveis por decisões/intervenções relevantes.',
    },
    {
      title: 'Siglas Padronizadas',
      content:
        'Evite abreviações ambíguas; mantenha glossário institucional simples.',
    },
  ],

  // ========= USO DA ORQUESTRA/IA =========
  'Otimização com a Orquestra': [
    {
      title: 'Descreva Achados Objetivos',
      content:
        "Quanto mais dados estruturados no exame físico e HDA, melhor a 'Avaliação' e o 'Plano' sugeridos.",
    },
    {
      title: 'Anexar Exames',
      content:
        'Suba resultados relevantes e transcreva valores-chave (ex.: PA, A1c, LDL) para melhor contexto.',
    },
    {
      title: 'Prompts Focados',
      content:
        'Peça saídas específicas: “Liste 3 hipóteses com sinais de apoio e exames iniciais”.',
    },
    {
      title: 'Verificação Clínica',
      content:
        'Use a IA como apoio, não como substituto. Confirme condutas com guias e bom senso clínico.',
    },
    {
      title: 'Templates Reutilizáveis',
      content:
        'Crie modelos de consultas (HAS, DM, dor lombar) para padronizar e ganhar tempo.',
    },
  ],

  // ========= PROMPTS CLÍNICOS =========
  'Modelos de Prompt (IA Clínica)': [
    {
      title: 'Hipóteses Diferenciais',
      content:
        '“Com base em HDA e exame abaixo, liste 3 DDx prováveis com sinais de apoio e condutas iniciais.”',
    },
    {
      title: 'Educação ao Paciente',
      content:
        '“Gere orientações em linguagem simples sobre [diagnóstico] com sinais de alarme e quando retornar.”',
    },
    {
      title: 'Resumo para Encaminhamento',
      content:
        '“Resuma o caso em até 6 linhas no formato SBAR para encaminhar ao [especialista].”',
    },
    {
      title: 'Checklist de Segurança',
      content:
        '“Crie checklist curto para [procedimento/condição] com passos antes, durante e após.”',
    },
    {
      title: 'Plano em Passos',
      content:
        '“Converta este plano em passos acionáveis com prazos e exames de controle.”',
    },
  ],
};

// categorias disponíveis (chaves do objeto)
const categories = Object.keys(tipsData) as Array<keyof typeof tipsData>;

export default function TipsView() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-64  rounded-lg shadow-md overflow-hidden">
        <Image
          src="/banner-dicas.png"
          alt="Banner da Central de Dicas"
          layout="fill"
          objectFit="cover"

          className="z-0"
          priority
        />
        <div className="relative z-10 flex text-center flex-col justify-center h-full p-6 text-white">
          <h1 className="text-3xl md:text-4xl font-bold drop-shadow-md">Central de Dicas</h1>
          <p className="mt-4 text-lg drop-shadow-md">Sugestões e boas práticas para aprimorar as suas consultas.</p>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Menu de Categorias para Desktop */}
        <aside className="hidden md:block md:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Categorias</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-brand-light/30 text-brand-dark'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Conteúdo das Dicas */}
        <main className="md:col-span-3">
          {/* Seletor de Categorias para Mobile */}
          <div className="md:hidden mb-6">
            <label htmlFor="category-select" className="block text-lg font-semibold mb-2">Categorias</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
              className="w-full rounded-md border-border py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{selectedCategory}</h2>
          </div>

          <div className="space-y-4">
            {(tipsData[selectedCategory] || []).map((tip, index) => (
              <div
                key={`${selectedCategory}-${index}`}
                className="bg-white p-6 rounded-lg shadow-sm border border-border"
              >
                <h3 className="text-md font-semibold text-foreground mb-2">{tip.title}</h3>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{tip.content}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
