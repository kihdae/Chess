'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

export default function ChessGame() {
  useEffect(() => {
    gsap.from('.chess-container', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power2.out'
    });
  }, []);

  return (
    <main className="min-h-screen bg-primary-dark text-light-lavender">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main chess board area */}
          <div className="lg:col-span-8 chess-container bg-secondary-dark rounded-lg p-6 shadow-xl">
            <div className="aspect-square w-full bg-accent-plum rounded-lg">
              {/* Chess board will be mounted here */}
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-light-lavender">Chess Board Loading...</p>
              </div>
            </div>
          </div>

          {/* Side panel for chat and game info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Game information panel */}
            <div className="bg-secondary-dark rounded-lg p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Game Info</h2>
              <div className="space-y-2">
                <p className="text-light-lavender">Turn: White</p>
                <p className="text-light-lavender">Status: In Progress</p>
              </div>
            </div>

            {/* Chat panel */}
            <div className="bg-secondary-dark rounded-lg p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Chat</h2>
              <div className="h-[300px] overflow-y-auto mb-4 space-y-2">
                {/* Chat messages will go here */}
              </div>
              <div className="relative">
                <textarea
                  className="w-full bg-accent-plum rounded p-2 text-light-lavender placeholder-light-lavender/50 resize-none"
                  placeholder="Type your message..."
                  rows={3}
                />
                <button
                  className="absolute bottom-2 right-2 bg-highlight-maroon text-light-lavender px-4 py-1 rounded hover:bg-highlight-maroon/80 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 