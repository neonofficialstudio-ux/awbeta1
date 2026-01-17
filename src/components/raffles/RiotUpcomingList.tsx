
import React, { useMemo } from 'react';
import type { Raffle } from '../../types';
import RiotUpcomingCard from './RiotUpcomingCard';
import { safeDate } from '../../api/utils/dateSafe';
import { TicketIcon } from '../../constants';

interface RiotUpcomingListProps {
    raffles: Raffle[];
}

const RiotUpcomingList: React.FC<RiotUpcomingListProps> = ({ raffles }) => {
    
    const upcomingRaffles = useMemo(() => {
        const now = new Date();
        return raffles
            .filter(r => {
                if (!r.startsAt || r.status === 'finished') return false;
                const start = safeDate(r.startsAt);
                return start && start > now;
            })
            .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
    }, [raffles]);

    if (upcomingRaffles.length === 0) return null;

    return (
        <div className="mb-16 animate-fade-in-up">
            
            {/* --- RIOT STYLE HEADER --- */}
            <div className="flex items-center gap-4 mb-8 pl-2 relative">
                {/* Vertical Accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FFD34E] to-[#C8AA6E] rounded-full"></div>
                
                <div className="pl-4">
                    <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wide flex items-center gap-3">
                        <TicketIcon className="w-6 h-6 text-[#FFD34E]" />
                        Próximos Eventos
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                         <div className="h-[2px] w-12 bg-[#FFD34E] animate-pulse shadow-[0_0_10px_#FFD34E]"></div>
                         <span className="text-[10px] font-bold text-[#C8AA6E] uppercase tracking-[0.2em]">Agenda de Sorteios</span>
                         <div className="h-[1px] flex-grow bg-gradient-to-r from-[#C8AA6E]/50 to-transparent"></div>
                    </div>
                    <p className="text-xs text-white/50 mt-2 max-w-2xl">
                        Esses eventos já estão programados. Assim que ativarem, você poderá comprar tickets e participar.
                    </p>
                </div>
            </div>

            {/* --- GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2 md:px-0">
                {upcomingRaffles.map(raffle => (
                    <RiotUpcomingCard key={raffle.id} raffle={raffle} />
                ))}
            </div>
        </div>
    );
};

export default RiotUpcomingList;
