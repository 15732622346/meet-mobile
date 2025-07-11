'use client';

import './mobile.css';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-layout">
      {children}
    </div>
  );
} 