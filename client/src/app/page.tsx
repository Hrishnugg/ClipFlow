'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SignInButton from "@/components/auth/SignInButton";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to ClipFlow</h1>
          <p className="text-xl mb-8">A modern web application for video clip management and sharing</p>
        </div>
        
        <div className="flex flex-col items-center">
          <SignInButton />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Sign in with your Google account to get started
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          © 2025 ClipFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
