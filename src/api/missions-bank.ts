// api/missions-bank.ts

// This file provides modular content for generating missions in the admin panel.
export const missionsBank = {
    // Mission titles
    titles: [
        "Conexão com a Comunidade",
        "Bastidores da Criação",
        "Mostre seu Talento",
        "Engajamento Estratégico",
        "Compartilhe sua Jornada",
        "Desafio Criativo",
        "Por Dentro do Estúdio",
    ],

    // Main action of the mission, categorized by duration/effort
    actions: {
        curta: [
            "Mostre seu setup de produção em uma foto/vídeo rápido",
            "Compartilhe uma música que está te inspirando hoje e explique o porquê",
            "Faça um post agradecendo seus seguidores pelo apoio recente",
            "Peça aos seus seguidores para descreverem sua música em uma palavra",
            "Compartilhe um trecho de 5 segundos da sua próxima música"
        ],
        media: [
            "Grave um vídeo curto (até 30s) mostrando uma técnica de produção que você usa",
            "Explique o significado de um trecho da sua letra em um vídeo",
            "Faça uma enquete interativa sobre qual deve ser o tema do seu próximo single",
            "Mostre a evolução de um beat, do início ao resultado final",
            "Faça uma session de Q&A rápida nos stories"
        ],
        longa: [
            "Faça um 'walkthrough' (tour guiado) de 1 minuto do seu projeto de música mais recente",
            "Grave um cover/remix de uma música que te influenciou, mostrando seu estilo",
            "Crie um tutorial rápido de um plugin ou software que você ama usar",
            "Conte a história completa por trás da sua música mais popular em um vídeo",
            "Faça um react de músicas enviadas por seus seguidores"
        ],
        foto: [ // Added specific photo actions
            "Poste uma foto que represente a vibe da sua próxima música",
            "Compartilhe uma foto sua no palco ou no estúdio",
            "Crie uma arte conceitual para um single imaginário",
        ]
    },

    // Contexts to add thematic flavor to the mission
    contexts: [
        "seu processo de composição",
        "a história por trás da sua nova música",
        "uma colaboração dos sonhos",
        "sua maior inspiração musical do momento",
        "um desafio que você superou na sua carreira recentemente",
        "o conceito por trás do seu próximo álbum/EP",
        "como você lida com bloqueio criativo"
    ],

    // Hooks to increase engagement
    hooks: [
        "lançando um desafio para seus seguidores replicarem",
        "convidando para uma live exclusiva que você fará em breve",
        "anunciando um spoiler de um novo projeto",
        "pedindo um feedback sincero sobre um trecho de música",
        "fazendo uma pergunta polêmica para gerar debate"
    ],

    // Suggested platforms for the mission
    platforms: [
        "Instagram Reels",
        "TikTok",
        "YouTube Shorts",
        "Instagram Stories",
        "Instagram Feed",
    ]
};
