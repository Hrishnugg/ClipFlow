'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import UploadRosterModal from '../../../components/modals/UploadRosterModal';
import { useAuth } from '../../../context/AuthContext';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { processRoster } from '../../../firebase/students';
import { getUserSelectedTeam } from '../../../firebase/firestore';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
  user_uid?: string;
}

interface Roster {
  id: string;
  name: string;
  userUID: string;
  teamID: string;
  students: Student[];
}

export default function Rosters() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRosters = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const selectedTeam = await getUserSelectedTeam(user.uid);
      
      if (!selectedTeam) {
        setRosters([]);
        return;
      }
      
      const rostersRef = collection(db, 'rosters');
      const q = query(
        rostersRef, 
        where('teamID', '==', selectedTeam)
      );
      const querySnapshot = await getDocs(q);
      
      const fetchedRosters: Roster[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRosters.push({
          id: doc.id,
          name: data.name,
          userUID: data.userUID,
          teamID: data.teamID,
          students: data.students || []
        });
      });
      
      setRosters(fetchedRosters);
    } catch (error) {
      console.error('Error fetching rosters:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchRosters();
    }
  }, [user, fetchRosters]);
  
  useEffect(() => {
    const handleTeamChange = () => {
      fetchRosters();
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [fetchRosters]);
  
  useEffect(() => {
    const fetchSelectedTeam = async () => {
      if (!user) return;
      
      try {
        const userSelectedTeam = await getUserSelectedTeam(user.uid);
        setSelectedTeam(userSelectedTeam);
      } catch (error) {
        console.error('Error fetching selected team:', error);
      }
    };
    
    fetchSelectedTeam();
  }, [user]);

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const parseCSV = (csvText: string): Student[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      const [name, email, parentEmail] = line.split(',').map(item => item.trim());
      return { name, email, parentEmail };
    });
  };

  const handleFileUpload = async (rosterName: string, file: File) => {
    if (!user) return;
    setError(null);
    
    try {
      const selectedTeam = await getUserSelectedTeam(user.uid);
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvText = e.target?.result as string;
        const students = parseCSV(csvText);
        
        const result = await processRoster(students, user.uid, selectedTeam as string);
        
        if (!result.success) {
          setError(result.error || 'Failed to process roster');
          return;
        }
        
        const rosterData = {
          name: rosterName,
          userUID: user.uid,
          teamID: selectedTeam,
          students,
          studentIds: result.studentIds,
          createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'rosters'), rosterData);
        console.log('Roster added with ID:', docRef.id);
        setIsModalOpen(false);
        fetchRosters();
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading roster:', error);
      setError('An error occurred while uploading the roster');
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rosters</h1>
        {selectedTeam ? (
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
          >
            Upload Roster
          </button>
        ) : null}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <p>Loading rosters...</p>
        </div>
      ) : rosters.length === 0 ? (
        <div className="bg-gray-800 shadow-lg rounded-lg p-8 text-center">
          <p className="mb-4">
            {selectedTeam 
              ? "No rosters found. Upload a roster to get started." 
              : "Please create and select a team before uploading a roster."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rosters.map((roster) => (
            <Link 
              href={`/dashboard/rosters/${roster.id}`} 
              key={roster.id}
              className="block"
            >
              <div className="bg-gray-800 shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-semibold mb-2">{roster.name}</h2>
                <p className="text-gray-400">{roster.students.length} students</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      <UploadRosterModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload}
        error={error}
      />
    </div>
  );
}
