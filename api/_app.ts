import { hook } from '@modern-js/runtime/server';
import { Request, Response, NextFunction } from 'express';
// import cors from 'cors';

export default hook(({ addMiddleware }) => {
  addMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    console.info(`access url: ${req.url}`);
    next();
  });
  // addMiddleware(
  //   cors({
  //     origin: [
  //       'localhost',
  //       'ejfkdev.com',
  //       'replit.app',
  //       'marscode.cn',
  //       'marscode.com',
  //       'mcprev.cn',
  //       'mcprev.com',
  //       'vercel.app',
  //       'baseopendev.com',
  //     ],
  //   }),
  // );
});
