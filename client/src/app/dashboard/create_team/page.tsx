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
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="glass-card max-w-md w-full py-8">
        <h1 className="text-2xl font-bold mb-6">Create Team</h1>
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
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Team Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={teamName}
            onChange={handleTeamNameChange}
            className="w-full px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            placeholder="Enter team name"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Member Emails (comma separated)
          </label>
          <textarea
            value={emails}
            onChange={handleEmailsChange}
            className="w-full px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
          className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-6 rounded-md shadow hover:shadow-lg transition-all duration-300 ${
            !teamName || isCreating ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isCreating ? 'Creating...' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}
