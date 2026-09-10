import React, { useEffect, useState } from 'react';
import appletConfig from '../../../firebase-applet-config.json';
import { AlertCircle, Key, Settings, Loader2 } from 'lucide-react';

interface ConfigValidatorProps {
  children: React.ReactNode;
}

export const ConfigValidator: React.FC<ConfigValidatorProps> = ({ children }) => {
  return <>{children}</>;
};
