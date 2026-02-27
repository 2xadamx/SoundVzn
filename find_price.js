import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

async function getPriceId() {
    try {
        const productId = 'prod_U1jdMdFo8vc223';
        console.log(`Searching for prices associated with product: ${productId}`);
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        });

        if (prices.data.length > 0) {
            console.log(`FOUND_PRICE_ID=${prices.data[0].id}`);
        } else {
            console.log('NO_PRICE_FOUND');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getPriceId();
