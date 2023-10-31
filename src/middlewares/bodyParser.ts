import express, { Request, Response, NextFunction } from 'express';

const BodyParser = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/api/payments/validate') {
    next();
  } else {
    express.json()(req, res, next);
  }
};

export default BodyParser;
