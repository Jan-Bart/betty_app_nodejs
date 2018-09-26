import express from 'express';
import {} from 'dotenv/config';
import callBetty from '../controllers/default';

const router = express.Router();

router.post('/', callBetty);
export default router;
