'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;
      
      try {
        const studentsQuery = query(collection(db, 'students'));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const studentsData: Student[] = [];
        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          studentsData.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail
          });
        });
        
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]);

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <h1 className="text-2xl font-bold mb-6">Students</h1>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <p>No students found. Upload a roster to add students.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Link 
                href={`/students/${student.id}`} 
                key={student.id}
                className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold">{student.name}</h2>
                <p className="text-gray-600">{student.email}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
