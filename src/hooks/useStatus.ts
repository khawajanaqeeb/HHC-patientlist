import { useState } from 'react';

export function useStatus() {
  const [saveStatus, setSaveStatus] = useState('');
  const [saveStatusColor, setSaveStatusColor] = useState('#ffffff');

  const flashStatus = (msg: string, color = '#ffffff') => {
    setSaveStatus(msg);
    setSaveStatusColor(color);
  };

  return { saveStatus, saveStatusColor, flashStatus };
}
