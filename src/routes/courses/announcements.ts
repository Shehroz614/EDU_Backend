import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';

const router = express.Router();

router.get('');

export default router;
