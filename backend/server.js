import 'dotenv/config'; import express from 'express'; import cors from 'cors'; import { connectDB } from './config/db.js'; import productRoutes from './routes/productRoutes.js';
const app=express(); app.use(cors()); app.use(express.json({limit:'1mb'}));
app.get('/api/health',(req,res)=>res.json({ok:true,name:'Food Label Decoder API'})); app.use('/api/products',productRoutes);
app.use((req,res)=>res.status(404).json({success:false,message:'Route not found'}));
const PORT=process.env.PORT||5000; connectDB().finally(()=>app.listen(PORT,()=>console.log(`API running on http://localhost:${PORT}`)));
