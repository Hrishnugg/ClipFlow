'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createTeam, checkTeamNameExists } from '@/firebase/firestore';

const isValidEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

const refreshTeamsList = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refresh-teams'));
  }
};

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState('');
  const [emails, setEmails] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamName(e.target.value);
  };

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
  };

  const handleCreateTeam = async () => {
    if (!user) return;
    
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const teamExists = await checkTeamNameExists(user.uid, teamName);
      if (teamExists) {
        setError('You are already part of a team with the same name. Please choose a different name.');
        setIsCreating(false);
        return;
      }
      
      const memberEmails = emails.trim() ? 
        emails.split(',')
          .map(email => email.trim())
          .filter(email => email !== '' && email.toLowerCase() !== user.email?.toLowerCase()) : 
        [];
      
      const invalidEmails = memberEmails.filter(email => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        setError(`Invalid email format: ${invalidEmails.join(', ')}. Please correct these emails.`);
        setIsCreating(false);
        return;
      }
      
      const result = await createTeam({
        name: teamName,
        members: [...memberEmails, user.email as string], // Include current user
        owner_uid: user.uid,
        createdAt: new Date().toISOString()
      });
      
      if (result.success) {
        setSuccess('Team created successfully!');
        setTeamName('');
        setEmails('');
        
        refreshTeamsList();
      } else {
        setError(result.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('An error occurred while creating the team');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Team</h1>
      </div>
      
      <div className="bg-gray-800 shadow-lg rounded-lg p-8 max-w-md">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p>{success}</p>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Team Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={teamName}
            onChange={handleTeamNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter team name"
            required
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
          <p className="text-sm text-gray-500 mt-1">
            You will automatically be added as a member. No need to include your own email.
          </p>
        </div>
        
        <button
          onClick={handleCreateTeam}
          disabled={!teamName || isCreating}
          className={`px-4 py-2 rounded ${
            teamName && !isCreating
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-blue-400 text-white cursor-not-allowed'
          }`}
        >
          {isCreating ? 'Creating...' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}
