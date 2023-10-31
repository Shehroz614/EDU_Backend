import { Request, Response, NextFunction } from 'express';

interface IError extends Error {
  statusCode: number;
}
const ErrorHandler = (err: IError, req: Request, res: Response, next: NextFunction) => {
  const errStatus = err.statusCode || 500;
  const errMsg = err.message || 'Something went wrong';
  res.status(errStatus).json({
    success: false,
    status: errStatus,
    message: errMsg,
    stack: process.env.NODE_ENV === 'development' ? err.stack : {},
  });
};

export default ErrorHandler;
