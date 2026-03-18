import express from 'express';
import {z} from zod ;
import {db} from'../db/index.js';
import {items,locations,claims,ratings}  from '../db/schema.js';
import {eq,and,desc} from 'drizzle-orm';


//Zod
const router= express.router()
 const createItemSchema =z.object({
    title:z.string().min(2),
    description:z.string().optional(),
    quantity:z.number().positive(),
    unit:z.string(),
    expiryDate:z.string().datetime(),
    imageUrl:z.string().url().optional(),
    category:z.string().optional(),
    originalPrice:z.number().nonnegative().optional(),
    discountedPrice:z.number().nonnegative().optional(),
    priceCurrency:z.string().optional(),
    location:z.object({
        latitude:z.number(),
        longitude:z.number(),
        address:z.string(),
    }),
 });
 // get all items on the feed home screen item lai display garauna 
 router.get('/',async(req,res)=>
{
try{  
    const{category} =req.query;//category ko query read
    let whereClause =eq(items.status ,'AVAILABLE');

    if(category && category !=='ALL'){
        whereClause = and(whereClause,eq(items.category,category)
    );
    }
    //fetch data from database 

    const allItems = await db.query.items.findMany({
        where: whereClause ,
        with:{
            location : true ,
            user: true,
        },
        orderBy:[desc(items.createdAt)],
    });
    return res.json(allItems)

}catch(error){

    console.error('Get items error:',error);
    res.status(500).json({ error: error.message})

}
});

//get single item 
/// get from (/items/12)
router.get('/:id', async(req,res) =>{
    try{

        const{id} =req.params; //id= "12"

        
    const item = await db.query.items.findfirst({
        where:eq(items.id,parseInt(id)),
        with:{
            location:true,
            user:true,
            claims:true,
        },
    });
      //404 == item not found error 
    if(!item){
        return res.status(404).json({error :'Item not found'});
    }   
    // select all ratings from the posted shopkeeper // mailey banana post gardai mero overall rating   //

    const sellerRatings=  await db 
    .select()
    .from(ratings)
    .where(eq(ratings.ratedUserId,items.userId))

   //yedi shopkeeper sanga rating xa bhaney existing  average rating + ayeko rating 

    // const avgRating = sellerRatings.length > 0 // at least 1  rating xa rey calculate average  rating =0
    // ? sellerRatings.reduce((acc,curr) => acc + curr.rating,0) / sellerRatings.length
    // : 0;
    let avgRating = 0;

   if (sellerRatings.length > 0) {
  let total = 0;

    for (let rating of sellerRatings) {
    total += rating.rating;
  }

  avgRating = total / sellerRatings.length;
  };
  return res.json({
    ...item,
    user:{
        ...item.user,
        rating:{
            average :avgRating,
            count: sellerRatings.length
        }// ram 4.2 20 
    }
  });   
    }catch(error){
        console.error('single item error:',error);
        res.status(500).json({ error: error.message})

    }
}
 );


