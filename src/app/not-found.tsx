"use client";

import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-400 mb-6">Could not find requested resource</p>
      <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline">
        Return Home
      </Link>
    </div>
  );
}
