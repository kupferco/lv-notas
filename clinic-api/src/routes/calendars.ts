import express, { Router, Request, Response, NextFunction } from "express";
import { googleCalendarService } from "../services/google-calendar.js";

const router: Router = Router();

// Type-safe handler
const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<Response | void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

router.get("/", asyncHandler(async (req, res) => {
  try {
    // Check if we're in development mode (localhost or test email)
    const isLocalhost = req.headers.origin && req.headers.origin.includes('localhost');
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isLocalhost || isDevelopment) {
      // Return mock calendar data for development
      const mockCalendars = [
        {
          id: "primary",
          summary: "Calendário Principal",
          description: "Seu calendário principal do Google",
          accessRole: "owner",
          primary: true
        },
        {
          id: "work-calendar-123",
          summary: "Trabalho - Sessões de Terapia",
          description: "Calendário dedicado para sessões de terapia",
          accessRole: "owner",
          primary: false
        },
        {
          id: "personal-calendar-456",
          summary: "Pessoal",
          description: "Compromissos pessoais",
          accessRole: "owner",
          primary: false
        }
      ];
      
      console.log("Returning mock calendars for development");
      return res.json(mockCalendars);
    }
    
    // Production: use real Google Calendar API
    const calendars = await googleCalendarService.listUserCalendars();
    
    // Filter out calendars that the user cannot write to
    const writableCalendars = calendars.filter(
      calendar => calendar.accessRole === "owner" || calendar.accessRole === "writer"
    );
    
    return res.json(writableCalendars);
  } catch (error) {
    console.error("Error fetching calendars:", error);
    return res.status(500).json({ 
      error: "Erro ao buscar calendários",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
}));

export default router;
