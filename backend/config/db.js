import mongoose from 'mongoose';
export async function connectDB(){
  if(!process.env.MONGO_URI){ console.warn('MONGO_URI missing: app will run without cache.'); return; }
  try { await mongoose.connect(process.env.MONGO_URI); console.log('MongoDB connected'); }
  catch(e){ console.error('MongoDB connection failed:', e.message); console.warn('Continuing without database cache.'); }
}
