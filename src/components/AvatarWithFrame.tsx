import React from 'react';
import type { User, RankingUser } from '../types';

interface AvatarWithFrameProps {
  user: User | RankingUser;
  sizeClass?: string;
  className?: string;
}

const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({ user, sizeClass = 'w-10 h-10', className = '' }) => {
  const getFrameClass = (plan: User['plan']): string => {
    switch (plan) {
      case 'Artista em Ascensão':
        return 'frame-silver';
      case 'Artista Profissional':
        return 'frame-jade';
      case 'Hitmaker':
        return 'frame-gold';
      case 'Free Flow':
      default:
        return '';
    }
  };

  const frameClass = getFrameClass(user.plan);

  if (!frameClass) {
    // Render without frame for Free Flow and fallbacks
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`avatar-frame ${frameClass} ${className}`}>
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`avatar-image ${sizeClass} object-cover`}
      />
    </div>
  );
};

export default AvatarWithFrame;