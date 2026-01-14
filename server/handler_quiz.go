package main

import (
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/gofiber/fiber/v2"
)

func (d *AppDeps) HandleSeedDummyQuiz(c *fiber.Ctx) error {
	q := Quiz{
		QuizID: "quiz-1",
		Title:  "Dummy Quiz Cloud Computing",
		Questions: []Question{
			{ID: "q1", Text: "Apa itu Load Balancer?", Options: []string{"Database", "Pembagi traffic", "Cache", "Firewall"}, Answer: 1},
			{ID: "q2", Text: "Apa fungsi Auto Scaling?", Options: []string{"Menambah kapasitas saat beban naik", "Menghapus user", "Mengunci database", "Membuat UI"}, Answer: 0},
		},
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	item, err := attributevalue.MarshalMap(q)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "marshal error")
	}

	_, err = d.DDB.PutItem(c.Context(), &dynamodb.PutItemInput{
		TableName: &d.QuizTable,
		Item:      item,
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "putitem error: "+err.Error())
	}

	return c.JSON(fiber.Map{"ok": true, "seeded": q.QuizID})
}

func (d *AppDeps) HandleGetAllQuizzes(c *fiber.Ctx) error {
	out, err := d.DDB.Scan(c.Context(), &dynamodb.ScanInput{
		TableName: &d.QuizTable,
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "scan error: "+err.Error())
	}

	var quizzes []Quiz
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &quizzes); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "unmarshal error")
	}

	// jangan expose answer dan questions detail, hanya metadata
	type QuizListItem struct {
		QuizID string `json:"quizId"`
		Title  string `json:"title"`
	}

	items := make([]QuizListItem, len(quizzes))
	for i, q := range quizzes {
		items[i] = QuizListItem{
			QuizID: q.QuizID,
			Title:  q.Title,
		}
	}

	return c.JSON(items)
}

func (d *AppDeps) HandleGetQuizByID(c *fiber.Ctx) error {
	quizID := c.Params("id")
	if quizID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing id")
	}

	out, err := d.DDB.GetItem(c.Context(), &dynamodb.GetItemInput{
		TableName: &d.QuizTable,
		Key: map[string]types.AttributeValue{
			"quizId": &types.AttributeValueMemberS{Value: quizID},
		},
		ConsistentRead: boolPtr(true),
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "getitem error: "+err.Error())
	}
	if out.Item == nil {
		return fiber.NewError(fiber.StatusNotFound, "quiz not found")
	}

	var q Quiz
	if err := attributevalue.UnmarshalMap(out.Item, &q); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "unmarshal error")
	}

	// jangan expose answer
	for i := range q.Questions {
		q.Questions[i].Answer = -1
	}

	return c.JSON(q)
}
