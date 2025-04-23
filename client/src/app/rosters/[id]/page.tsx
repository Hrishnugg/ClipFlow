'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

export default function RosterDetail() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState<{
    name: string;
    email: string;
    parentEmail: string;
    nickname: string;
  }>({ name: '', email: '', parentEmail: '', nickname: '' });
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const rosterId = params.id as string;

  const fetchRosterDetails = useCallback(async () => {
    if (!user || !rosterId) return;
    
    try {
      setLoading(true);
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const data = rosterSnap.data();
        
        if (data.userUID !== user.uid) {
          console.error('Unauthorized access to roster');
          router.push('/rosters');
          return;
        }
        
        setRoster({
          id: rosterSnap.id,
          name: data.name,
          userUID: data.userUID,
          students: data.students || []
        });
      } else {
        console.error('Roster not found');
        router.push('/rosters');
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    } finally {
      setLoading(false);
    }
  }, [user, rosterId, router]);
  
  useEffect(() => {
    if (user && rosterId) {
      fetchRosterDetails();
    }
  }, [user, rosterId, fetchRosterDetails]);
  
  const handleAddButtonClick = () => {
    setShowAddForm(true);
  };

  const handleCancelAddStudent = () => {
    setNewStudent({ name: '', email: '', parentEmail: '', nickname: '' });
    setShowAddForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStudent = async () => {
    if (!user || !rosterId || !roster) return;
    
    if (!newStudent.name.trim() || !newStudent.email.trim()) {
      alert('Student Name and Student Email are required fields.');
      return;
    }
    
    try {
      const updatedStudents = [
        ...roster.students,
        {
          name: newStudent.name.trim(),
          email: newStudent.email.trim(),
          parentEmail: newStudent.parentEmail.trim(),
          nickname: newStudent.nickname.trim()
        }
      ];
      
      const rosterRef = doc(db, 'rosters', rosterId);
      await updateDoc(rosterRef, {
        students: updatedStudents
      });
      
      setNewStudent({ name: '', email: '', parentEmail: '', nickname: '' });
      setShowAddForm(false);
      
      fetchRosterDetails();
    } catch (error) {
      console.error('Error adding student to roster:', error);
      alert('Failed to add student to roster. Please try again.');
    }
  };
  
  const handleDeleteStudent = async (index: number) => {
    if (!user || !rosterId || !roster) return;
    
    try {
      const updatedStudents = [...roster.students];
      updatedStudents.splice(index, 1);
      
      const rosterRef = doc(db, 'rosters', rosterId);
      await updateDoc(rosterRef, {
        students: updatedStudents
      });
      
      fetchRosterDetails();
    } catch (error) {
      console.error('Error deleting student from roster:', error);
      alert('Failed to delete student from roster. Please try again.');
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/rosters')}
              className="mr-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Rosters
            </button>
            <h1 className="text-2xl font-bold">{roster?.name || 'Roster Details'}</h1>
          </div>
          {roster && !loading && (
            <button
              onClick={handleAddButtonClick}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
            >
              Add Student
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading roster details...</p>
          </div>
        ) : !roster ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">Roster not found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            {showAddForm && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center flex-wrap">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={newStudent.name}
                      onChange={handleInputChange}
                      placeholder="Student Name *"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={newStudent.email}
                      onChange={handleInputChange}
                      placeholder="Student Email *"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="parentEmail"
                      value={newStudent.parentEmail}
                      onChange={handleInputChange}
                      placeholder="Parent Email"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="nickname"
                      value={newStudent.nickname}
                      onChange={handleInputChange}
                      placeholder="Nickname"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={handleCancelAddStudent}
                    className="px-4 py-2 text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            {roster.students.length === 0 ? (
              <div className="p-8 text-center">
                <p>No students in this roster.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Parent Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nickname
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {roster.students.map((student, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {student.parentEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {student.nickname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <button
                            onClick={() => handleDeleteStudent(index)}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                            aria-label="Delete student"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
