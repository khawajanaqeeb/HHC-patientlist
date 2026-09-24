import { useState, useCallback } from 'react';

export function useStatus() {
  const [saveStatus, setSaveStatus] = useState('');
  const [saveStatusColor, setSaveStatusColor] = useState('#ffffff');

  const flashStatus = useCallback((msg: string, color = '#ffffff') => {
    setSaveStatus(msg);
    setSaveStatusColor(color);
  }, []);

  return { saveStatus, saveStatusColor, flashStatus };
}
