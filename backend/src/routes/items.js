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
 // get all items on the feed home screen 
 router.get('/',async(req,res)=>
{
try{  
    const{category} =req.query;//category 
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
    // select all ratings from the posted shopkeeper // 

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
 // Create new item
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = createItemSchema.parse(req.body);
    const userId = req.auth.userId;

    const newItem = await db.transaction(async (tx) => {
      const insertedItems = await tx.insert(items).values({
        userId,
        title: body.title,
        description: body.description,
        quantity: body.quantity,
        unit: body.unit,
        expiryDate: new Date(body.expiryDate),
        imageUrl: body.imageUrl,
        category: body.category || 'Other',
        status: 'AVAILABLE',
        originalPrice: body.originalPrice,
        discountedPrice: body.discountedPrice,
        priceCurrency: body.priceCurrency,
      }).returning();

      const insertedItem = insertedItems[0];

      await tx.insert(locations).values({
        itemId: insertedItem.id,
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        address: body.location.address,
      });

      return insertedItem;
    });

    return res.status(201).json(newItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim an item
router.post('/:id/claim', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const item = await db.query.items.findFirst({
      where: eq(items.id, parseInt(id)),
    });

    if (!item || item.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Item not available' });
    }

    if (item.userId === userId) {
      return res.status(400).json({ error: 'Cannot claim your own item' });
    }

    await db.transaction(async (tx) => {
      await tx.insert(claims).values({
        itemId: item.id,
        claimerId: userId,
        status: 'PENDING',
      });

      await tx.update(items)
        .set({ status: 'CLAIMED' })
        .where(eq(items.id, item.id));
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) an item - only owner
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    console.log(`Delete request - Item ID: ${id}, User ID: ${userId}`);

    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      console.error(`Invalid item ID: ${id}`);
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    
    if (!item) {
      console.log(`Item ${itemId} not found`);
      return res.status(404).json({ error: 'Item not found' });
    }

    console.log(`Item found - Owner: ${item.userId}, Requester: ${userId}`);

    if (item.userId !== userId) {
      console.log(`Authorization failed - Item owner: ${item.userId}, Requester: ${userId}`);
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

    await db.update(items).set({ status: 'DELETED' }).where(eq(items.id, itemId));
    console.log(`Item ${itemId} deleted successfully`);
    
    return res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ 
      error: 'Failed to delete item', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Get items for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    if (type === 'claimed') {
      const userClaims = await db.query.claims.findMany({ 
        where: eq(claims.claimerId, userId), 
        with: { item: true } 
      });
      const claimedItems = (userClaims || []).map(c => c.item).filter(Boolean);
      
      const enriched = await Promise.all(claimedItems.map(async (it) => {
        const full = await db.query.items.findFirst({ 
          where: eq(items.id, it.id), 
          with: { location: true, user: true } 
        });
        return full;
      }));
      return res.json(enriched);
    }

    const sharedAll = await db.query.items.findMany({
      where: eq(items.userId, userId),
      with: { location: true, user: true },
      orderBy: [desc(items.createdAt)],
    });

    const shared = (sharedAll || []).filter(it => it.status !== 'DELETED');
    return res.json(shared);
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;



