'use client';

import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText: string;
  cancelButtonText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText = 'Cancel'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        <div className="mb-6">
          <p className="text-gray-300">{message}</p>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="relative inline-flex h-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm px-6 py-2 font-medium text-white transition-all duration-300 hover:bg-gray-700/50 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className="relative inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-6 py-2 font-medium text-white transition-all duration-300 hover:from-red-700 hover:to-orange-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
