package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	deps := LoadDeps()
	port := getenvDefault("PORT", "3000")

	app := fiber.New(fiber.Config{
		AppName:      "Exam API",
		ErrorHandler: customErrorHandler,
	})
	app.Use(logger.New())
	app.Use(cors.New())

	SetupRoutes(app, deps)

	log.Printf("Server running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	log.Printf("Error [%d]: %v", code, err)

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": message,
	})
}
