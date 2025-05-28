import React from 'react';
import { PublicDashboard } from './dashboard/PublicDashboard';

export const SimpleCurriculumApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicDashboard />
    </div>
  );
};
