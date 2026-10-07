import mongoose from 'mongoose';
const productSchema=new mongoose.Schema({
 barcode:{type:String,index:true,unique:true,sparse:true}, productName:String, brand:String, imageUrl:String, ingredientsText:String,
 analysis:{additives:[{code:String,name:String,purpose:String}],hiddenSugars:[String],oils:[String],baseIngredients:[String],flags:{palmOil:Boolean,hiddenSugar:Boolean,refinedFlour:Boolean}},
 nutrition:{calories:Number,carbohydrates:Number,protein:Number,fat:Number,saturatedFat:Number,sugars:Number,sodium:Number},
 score:{level:String,label:String}, source:String, analyzedAt:{type:Date,default:Date.now}
},{timestamps:true});
export default mongoose.model('Product',productSchema);
