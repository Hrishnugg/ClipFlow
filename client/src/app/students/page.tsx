'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('userUID', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const fetchedStudents: Student[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedStudents.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          parentEmail: data.parentEmail || '',
          nickname: data.nickname || ''
        });
      });
      
      setStudents(fetchedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user, fetchStudents]);

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Students</h1>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">No students found. Add students to your rosters to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Link 
                href={`/students/${student.id}`} 
                key={student.id}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{student.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{student.email}</p>
                  {student.nickname && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Nickname: {student.nickname}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
