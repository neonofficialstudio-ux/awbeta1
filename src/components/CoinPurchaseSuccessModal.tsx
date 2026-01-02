
import React from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface CoinPurchaseSuccessModalProps {
  packName: string;
  onClose: () => void;
  onNavigate: () => void;
}

const CoinPurchaseSuccessModal: React.FC<CoinPurchaseSuccessModalProps> = ({ packName, onClose, onNavigate }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="compra_confirmada"
        title="Pedido Realizado!"
        message={`Pedido para "${packName}" criado com sucesso.`}
        icon="coin_glow"
        buttonText="Ir para Meus Pedidos"
        onConfirm={onNavigate}
    >
        <div className="bg-[#151515] border border-[#FFD447]/20 p-4 rounded-xl w-full">
            <p className="text-sm text-gray-300 leading-relaxed">
                O link para pagamento já está disponível. Acesse a aba 
                <span className="text-[#FFD447] font-bold mx-1">"Meus Pedidos"</span> 
                para efetuar o pagamento e enviar o comprovante.
            </p>
        </div>
    </DopamineUniversalModal>
  );
};

export default CoinPurchaseSuccessModal;
