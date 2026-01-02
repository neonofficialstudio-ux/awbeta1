
import React, { useState } from 'react';

interface FaqItemProps {
    question: string;
    answer: string;
}

export const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`border border-[#2A2D33] bg-[#121212] rounded-2xl overflow-hidden mb-3 transition-all duration-300 hover:border-[#FFD36A]/40 ${isOpen ? 'bg-[#181818] border-[#FFD36A]/30' : ''}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-5 px-6 transition-colors group"
                aria-expanded={isOpen}
            >
                <span className={`font-bold text-sm md:text-base uppercase tracking-wide font-chakra transition-colors ${isOpen ? 'text-[#FFD36A] text-shadow-glow' : 'text-gray-300 group-hover:text-white'}`}>{question}</span>
                <svg className={`w-5 h-5 text-gray-600 transition-transform duration-300 flex-shrink-0 ml-4 ${isOpen ? 'transform rotate-180 text-[#FFD36A]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/5 mt-2 pt-4">
                    <p>{answer}</p>
                </div>
            </div>
        </div>
    );
};

export default FaqItem;
