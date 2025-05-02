'use client';

import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState('');
  const [emails, setEmails] = useState('');
  useAuth(); // Keep authentication check without unused variable

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamName(e.target.value);
  };

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
  };

  const handleCreateTeam = () => {
    console.log('Team name:', teamName);
    console.log('Member emails:', emails);
    setTeamName('');
    setEmails('');
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create Team</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={handleTeamNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter team name"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Member Emails (comma separated)
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
            onClick={handleCreateTeam}
            disabled={!teamName || !emails}
            className={`px-4 py-2 rounded ${
              teamName && emails
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-400 text-white cursor-not-allowed'
            }`}
          >
            Create Team
          </button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
