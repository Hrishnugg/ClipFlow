'use client';

import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';

const isValidEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

export default function InvitePage() {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState<string | null>(null);
  useAuth(); // Keep authentication check without unused variable

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
    setError(null);
  };

  const handleAddMembers = () => {
    if (!emails.trim()) {
      return;
    }
    
    const emailList = emails.trim().split(',').map(email => email.trim()).filter(email => email !== '');
    
    const invalidEmails = emailList.filter(email => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      setError(`Invalid email format: ${invalidEmails.join(', ')}. Please correct these emails.`);
      return;
    }
    
    console.log('Invite emails:', emailList);
    setEmails('');
    setError(null);
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Invite Members</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Enter email addresses (comma separated)
            </label>
            <textarea
              value={emails}
              onChange={handleEmailsChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="user1@example.com, user2@example.com"
              rows={4}
            />
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <button
            onClick={handleAddMembers}
            disabled={!emails.trim()}
            className={`px-4 py-2 rounded ${
              emails.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-400 text-white cursor-not-allowed'
            }`}
          >
            Add Members
          </button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
