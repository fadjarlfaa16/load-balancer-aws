package main

import "github.com/gofiber/fiber/v2"

func SetupRoutes(app *fiber.App, deps *AppDeps) {
	// serve frontend from interfaces folder
	app.Static("/", "../interfaces")

	// basic
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Exam API", "version": "1.0.0"})
	})

	api := app.Group("/api")
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "bisa euy"})
	})

	// auth
	api.Post("/login", deps.HandleLogin)

	// protected
	api.Post("/seed", deps.RequireAuth, deps.HandleSeedDummyQuiz)
	api.Get("/quizzes", deps.RequireAuth, deps.HandleGetAllQuizzes)
	api.Get("/quizzes/:id", deps.RequireAuth, deps.HandleGetQuizByID)

	// attempt init
	api.Post("/attempts/init", deps.RequireAuth, deps.HandleInitAttempt)

	api.Put("/attempts/:id/answers", deps.RequireAuth, deps.HandleSaveAnswer)

	api.Post("/attempts/:id/submit", deps.RequireAuth, deps.HandleSubmitAttempt)

	api.Get("/attempts/:id", deps.RequireAuth, deps.HandleGetAttemptByID)

}
