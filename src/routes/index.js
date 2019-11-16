import express from 'express';
import callBetty from '../controllers/default';

const router = express.Router();

function parsePayload(req, res, next) {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded' || !req.body.payload) {
    return next();
  }

  try {
    req.body.payload = JSON.parse(req.body.payload);
  } catch (e) {
    // do nothing
  }

  return next();
}

router.post('/', parsePayload, callBetty);
export default router;
