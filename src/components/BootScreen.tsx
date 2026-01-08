import React from 'react';
import BootSplash from './BootSplash';

type Props = {
  stage?: string;
};

export default function BootScreen({ stage = 'authentication' }: Props) {
  return (
    <BootSplash
      brand="ARTIST"
      brandAccent="WORLD"
      subtitle="INICIALIZANDO"
      stage={stage}
    />
  );
}
