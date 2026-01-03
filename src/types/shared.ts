
import React from 'react';

export type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export type View = 'dashboard' | 'missions' | 'store' | 'inventory' | 'ranking' | 'subscriptions' | 'events' | 'profile' | 'admin' | 'auth' | 'raffles' | 'achievements';

export type Metadata = Record<string, unknown>;

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'levelup' | 'coin';
  title: string;
  message: string;
  duration?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type?: string;
  title: string;
  description: string;
  timestamp: string;
  createdAt?: number;
  read: boolean;
  linkTo?: {
    view: View;
    tab?: string; 
    subTab?: string;
  };
  metadata?: any;
}
