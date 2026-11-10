import React from 'react';
import { StoreOrder } from '../../types';
import { OrderDetailView } from './OrderDetailView';

interface OrderFolderModalProps {
  order: StoreOrder;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export const OrderFolderModal: React.FC<OrderFolderModalProps> = ({ order, onClose, onOrderUpdated }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 flex justify-center">
      <div className="bg-slate-50 rounded-3xl w-full max-w-6xl shadow-2xl p-4 sm:p-6 my-auto relative border border-slate-200">
        <OrderDetailView
          order={order}
          onBack={onClose}
          onOrderUpdated={onOrderUpdated}
        />
      </div>
    </div>
  );
};
