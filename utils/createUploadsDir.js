import fs from 'fs';
import path from 'path';

const createUploadsDir = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created successfully');
  } else {
    console.log('✅ Uploads directory already exists');
  }
  
  return uploadsDir;
};

export default createUploadsDir;