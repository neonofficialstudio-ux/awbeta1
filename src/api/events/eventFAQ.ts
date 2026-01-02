
// api/events/eventFAQ.ts

interface FAQItem {
    q: string;
    a: string;
}

const DEFAULT_FAQ: FAQItem[] = [
    { q: "Como funciona o ranking?", a: "O ranking é baseado nos pontos (PTS) acumulados ao completar missões do evento. Quanto mais complexa a missão, mais pontos você ganha." },
    { q: "Como envio minha prova?", a: "Clique no botão 'Enviar Prova' no card da missão. Você poderá enviar um link ou fazer upload de um print/foto dependendo do requisito." },
    { q: "O que acontece se eu perder o prazo?", a: "Missões não enviadas dentro do prazo do evento não contabilizam pontos. Fique atento ao cronômetro no topo da página." },
    { q: "Como funcionam os bônus VIP?", a: "Portadores do Golden Pass ganham um multiplicador de 1.5x em todos os pontos, além de acesso a prêmios exclusivos no final do evento." }
];

export const EventFAQ = {
    getFAQ: (eventId: string): FAQItem[] => {
        // In a real implementation, this could fetch event-specific FAQs from DB.
        // For now, it returns the global default, consistent with V7.0 requirements.
        return DEFAULT_FAQ;
    }
};
