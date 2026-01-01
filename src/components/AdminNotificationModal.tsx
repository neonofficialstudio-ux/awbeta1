
import React from 'react';
import type { AdminNotification } from '../types';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface AdminNotificationModalProps {
  notification: AdminNotification;
  onClose: () => void;
}

const AdminNotificationModal: React.FC<AdminNotificationModalProps> = ({ notification, onClose }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="alerta_importante"
        title={notification.title}
        message=""
        icon="message_glow"
        buttonText="Entendido"
        onConfirm={onClose}
    >
        <div className="max-h-60 overflow-y-auto custom-scrollbar w-full bg-[#151515] p-4 rounded-xl border border-gray-800 text-left">
            <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {notification.message}
            </p>
        </div>
    </DopamineUniversalModal>
  );
};

export default AdminNotificationModal;
