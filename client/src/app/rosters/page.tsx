'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadRosterModal from '@/components/modals/UploadRosterModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
}

interface Roster {
  id: string;
  name: string;
  userUID: string;
  students: Student[];
}



export default function Rosters() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRosters = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const rostersRef = collection(db, 'rosters');
      const q = query(rostersRef, where('userUID', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const fetchedRosters: Roster[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRosters.push({
          id: doc.id,
          name: data.name,
          userUID: data.userUID,
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

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const parseCSV = (csvText: string): Student[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      const [name, email, parentEmail, nickname = ''] = line.split(',').map(item => item.trim());
      return { name, email, parentEmail, nickname };
    });
  };

  const handleFileUpload = async (rosterName: string, file: File) => {
    if (!user) return;
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvText = e.target?.result as string;
        const students = parseCSV(csvText);
        
        const rosterData = {
          name: rosterName,
          userUID: user.uid,
          students,
          createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'rosters'), rosterData);
        console.log('Roster added with ID:', docRef.id);
        
        fetchRosters();
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading roster:', error);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Rosters</h1>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
          >
            Upload Roster
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading rosters...</p>
          </div>
        ) : rosters.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">No rosters found. Upload a roster to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rosters.map((roster) => (
              <Link 
                href={`/rosters/${roster.id}`} 
                key={roster.id}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{roster.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{roster.students.length} students</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <UploadRosterModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload} 
      />
    </AuthenticatedLayout>
  );
}
