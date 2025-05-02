'use client';

import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';

export default function InvitePage() {
  const [emails, setEmails] = useState('');
  useAuth(); // Keep authentication check without unused variable

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
  };

  const handleAddMember = () => {
    console.log('Invite emails:', emails);
    setEmails('');
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
          
          <button
            onClick={handleAddMember}
            disabled={!emails}
            className={`px-4 py-2 rounded ${
              emails
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-400 text-white cursor-not-allowed'
            }`}
          >
            Add Member
          </button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
