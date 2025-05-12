'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RostersLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}
