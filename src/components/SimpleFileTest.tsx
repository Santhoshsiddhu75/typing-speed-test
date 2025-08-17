import React, { useState } from 'react';

const SimpleFileTest: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('🔥 SIMPLE TEST - File input changed');
      console.log('🔥 Event:', e);
      console.log('🔥 Files:', e.target.files);
      
      const file = e.target.files?.[0];
      if (file) {
        console.log('🔥 File selected:', file.name);
        setFileName(file.name);
      } else {
        console.log('🔥 No file selected');
        setFileName('');
      }
    } catch (error) {
      console.error('🔥🔥🔥 ERROR in file handler:', error);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid red', 
      padding: '20px',
      zIndex: 9999
    }}>
      <h3>SIMPLE FILE TEST</h3>
      <input 
        type="file" 
        onChange={handleFileChange}
        accept="image/*"
      />
      <div>Selected: {fileName || 'None'}</div>
    </div>
  );
};

export default SimpleFileTest;