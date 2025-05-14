'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getUserSelectedTeam, addMembersToTeam } from '../../../firebase/firestore';

const isValidEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

export default function InvitePage() {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSelectedTeam, setHasSelectedTeam] = useState<boolean | null>(null);
  const { user } = useAuth();

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmails(e.target.value);
    setError(null);
    setSuccess(null);
  };

  const refreshTeamsList = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-teams'));
    }
  };
  
  useEffect(() => {
    const checkSelectedTeam = async () => {
      if (!user) return;
      
      try {
        const selectedTeam = await getUserSelectedTeam(user.uid);
        setHasSelectedTeam(!!selectedTeam);
      } catch (error) {
        console.error('Error checking selected team:', error);
        setHasSelectedTeam(false);
      }
    };
    
    checkSelectedTeam();
  }, [user]);
  
  useEffect(() => {
    const handleTeamChange = async () => {
      if (!user) return;
      
      try {
        const selectedTeam = await getUserSelectedTeam(user.uid);
        setHasSelectedTeam(!!selectedTeam);
      } catch (error) {
        console.error('Error checking selected team:', error);
        setHasSelectedTeam(false);
      }
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [user]);

  const handleAddMembers = async () => {
    if (!emails.trim() || !user) {
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const emailList = emails.trim().split(',')
        .map(email => email.trim())
        .filter(email => email !== '');
      
      const invalidEmails = emailList.filter(email => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        setError(`Invalid email format: ${invalidEmails.join(', ')}. Please correct these emails.`);
        setIsProcessing(false);
        return;
      }
      
      const selectedTeam = await getUserSelectedTeam(user.uid);
      if (!selectedTeam) {
        setError('No team is currently selected. Please select a team first.');
        setIsProcessing(false);
        return;
      }
      
      const result = await addMembersToTeam(selectedTeam, emailList);
      
      if (result.success) {
        setSuccess('Members added successfully!');
        setEmails('');
        
        refreshTeamsList();
      } else {
        if (result.alreadyMembers && result.alreadyMembers.length > 0) {
          setError(`These individuals are already members of the team: ${result.alreadyMembers.join(', ')}`);
        } else {
          setError(result.error || 'Failed to add members');
        }
      }
    } catch (error) {
      console.error('Error adding members:', error);
      setError('An error occurred while adding members');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {hasSelectedTeam === null ? (
        <div className="glass-card max-w-md w-full py-8">
          <h1 className="text-2xl font-bold mb-6">Invite Members</h1>
          <p>Loading...</p>
        </div>
      ) : hasSelectedTeam ? (
        <div className="glass-card max-w-md w-full py-8">
          <h1 className="text-2xl font-bold mb-6">Invite Members</h1>
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
              Enter email addresses (comma separated)
            </label>
            <textarea
              value={emails}
              onChange={handleEmailsChange}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="user1@example.com, user2@example.com"
              rows={4}
            />
          </div>
          
          <button
            onClick={handleAddMembers}
            disabled={!emails.trim() || isProcessing}
            className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-6 rounded-md shadow hover:shadow-lg transition-all duration-300 ${
              !emails.trim() || isProcessing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isProcessing ? 'Adding...' : 'Add Members'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md">
          <div className="text-center">
            <p className="mb-4">You have no teams. Please create a team to get started.</p>
            <a href="/dashboard/create_team" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Create Team
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
