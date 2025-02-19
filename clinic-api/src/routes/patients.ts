import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";

const router: Router = Router();

const asyncHandler = (
  handler: (
    req: Request,
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

router.get("/", asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, nome as name FROM patients ORDER BY nome ASC"
  );
  return res.json(result.rows);
}));

export default router;
