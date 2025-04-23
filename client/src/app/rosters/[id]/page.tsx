'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
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

  const updateStudentsCollection = async (student: Student, isDelete: boolean = false) => {
    if (!user) return;
    
    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('userUID', '==', user.uid), where('email', '==', student.email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      const now = new Date();
      
      if (!isDelete) {
        if (!querySnapshot.empty) {
          const existingStudent = querySnapshot.docs[0];
          const existingData = existingStudent.data();
          
          if (existingData.name !== student.name) {
            throw new Error(`A student with email ${student.email.toLowerCase()} already exists with a different name (${existingData.name}). Email addresses must be unique across all students.`);
          }
          
          if (!existingData.lastUpdated || now > existingData.lastUpdated.toDate()) {
            await updateDoc(existingStudent.ref, {
              parentEmail: student.parentEmail,
              nickname: student.nickname,
              lastUpdated: now
            });
          }
        } else {
          const studentData = {
            name: student.name,
            email: student.email.toLowerCase(),
            parentEmail: student.parentEmail,
            nickname: student.nickname,
            userUID: user.uid,
            createdAt: now,
            lastUpdated: now
          };
          
          await setDoc(doc(collection(db, 'students')), studentData);
        }
      } else if (!querySnapshot.empty) {
        const rostersRef = collection(db, 'rosters');
        const rosterQuery = query(rostersRef, where('userUID', '==', user.uid));
        const rosterSnapshot = await getDocs(rosterQuery);
        
        let studentExistsInOtherRosters = false;
        rosterSnapshot.forEach((rosterDoc) => {
          if (rosterDoc.id !== rosterId) {
            const rosterData = rosterDoc.data();
            if (rosterData.students && rosterData.students.some((s: Student) => 
              s.email.toLowerCase() === student.email.toLowerCase())) {
              studentExistsInOtherRosters = true;
            }
          }
        });
        
        if (!studentExistsInOtherRosters) {
          const studentDoc = querySnapshot.docs[0];
          
          const videosRef = collection(db, 'videos');
          const videoQuery = query(videosRef, where('userUID', '==', user.uid));
          const videoSnapshot = await getDocs(videoQuery);
          
          const batch = writeBatch(db);
          
          batch.update(studentDoc.ref, { deleted: true });
          
          videoSnapshot.forEach((videoDoc) => {
            const videoData = videoDoc.data();
            
            if (videoData.rosterIds && videoData.rosterIds.length > 0) {
              const associatedRosters = rosterSnapshot.docs
                .filter(rosterDoc => videoData.rosterIds.includes(rosterDoc.id))
                .map(rosterDoc => rosterDoc.data());
              
              const videoHasOtherStudents = associatedRosters.some(rosterData => 
                rosterData.students && rosterData.students.some((s: Student) => 
                  s.email.toLowerCase() !== student.email.toLowerCase()
                )
              );
              
              if (!videoHasOtherStudents) {
                batch.update(videoDoc.ref, { deleted: true });
              }
            }
          });
          
          await batch.commit();
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating students collection:', error);
      return { success: false, error };
    }
  };

  const handleAddStudent = async () => {
    if (!user || !rosterId || !roster) return;
    
    if (!newStudent.name.trim() || !newStudent.email.trim()) {
      alert('Student Name and Student Email are required fields.');
      return;
    }
    
    const studentEmail = newStudent.email.trim().toLowerCase();
    const studentExists = roster.students.some(
      student => student.email.toLowerCase() === studentEmail
    );
    
    if (studentExists) {
      alert('Student already exists in the roster.');
      return;
    }
    
    try {
      const student = {
        name: newStudent.name.trim(),
        email: studentEmail,
        parentEmail: newStudent.parentEmail.trim(),
        nickname: newStudent.nickname.trim()
      };
      
      const result = await updateStudentsCollection(student);
      
      if (result && !result.success) {
        const errorMessage = result.error instanceof Error 
          ? result.error.message 
          : 'Error checking student consistency across rosters';
        alert(errorMessage);
        return;
      }
      
      const updatedStudents = [...roster.students, student];
      
      const rosterRef = doc(db, 'rosters', rosterId);
      await updateDoc(rosterRef, {
        students: updatedStudents
      });
      
      setNewStudent({ name: '', email: '', parentEmail: '', nickname: '' });
      setShowAddForm(false);
      
      fetchRosterDetails();
    } catch (error: any) {
      console.error('Error adding student to roster:', error);
      alert(error.message || 'Failed to add student to roster. Please try again.');
    }
  };
  
  const handleDeleteStudent = async (index: number) => {
    if (!user || !rosterId || !roster) return;
    
    try {
      const student = roster.students[index];
      const updatedStudents = [...roster.students];
      updatedStudents.splice(index, 1);
      
      const rosterRef = doc(db, 'rosters', rosterId);
      await updateDoc(rosterRef, {
        students: updatedStudents
      });
      
      await updateStudentsCollection(student, true);
      
      fetchRosterDetails();
    } catch (error) {
      console.error('Error deleting student from roster:', error);
      alert('Failed to delete student from roster. Please try again.');
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="mb-6">
          <div className="mb-3">
            <button
              onClick={() => router.push('/rosters')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Rosters
            </button>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{roster?.name || 'Roster Details'}</h1>
            {roster && !loading && (
              <button
                onClick={handleAddButtonClick}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
              >
                Add Student
              </button>
            )}
          </div>
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
