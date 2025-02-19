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

router.get("/:patientId", asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  
  const result = await pool.query(
    `SELECT id, to_char(date, 'DD/MM/YYYY HH24:MI') as date 
     FROM sessions 
     WHERE patient_id = $1 
     AND status = 'agendada'
     ORDER BY date ASC`,
    [patientId]
  );
  
  return res.json(result.rows);
}));
export default router;
