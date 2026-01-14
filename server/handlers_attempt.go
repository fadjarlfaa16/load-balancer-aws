package main

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type initAttemptReq struct {
	QuizID string `json:"quizId"`
}

type saveAnswerReq struct {
	QuestionID string `json:"questionId"`
	Choice     int    `json:"choice"`
}

func (d *AppDeps) HandleInitAttempt(c *fiber.Ctx) error {
	var req initAttemptReq
	if err := c.BodyParser(&req); err != nil || req.QuizID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "quizId is required")
	}

	// 1) load quiz
	out, err := d.DDB.GetItem(c.Context(), &dynamodb.GetItemInput{
		TableName: &d.QuizTable,
		Key: map[string]types.AttributeValue{
			"quizId": &types.AttributeValueMemberS{Value: req.QuizID},
		},
		ConsistentRead: boolPtr(true),
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "getitem quiz error: "+err.Error())
	}
	if out.Item == nil {
		return fiber.NewError(fiber.StatusNotFound, "quiz not found")
	}

	var q Quiz
	if err := attributevalue.UnmarshalMap(out.Item, &q); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "unmarshal quiz error")
	}
	for i := range q.Questions {
		q.Questions[i].Answer = -1
	}

	// 2) create attempt
	user := fmt.Sprintf("%v", c.Locals("user"))
	now := time.Now().UTC().Format(time.RFC3339)

	a := Attempt{
		AttemptID: uuid.NewString(),
		UserID:    user,
		QuizID:    req.QuizID,
		Status:    "IN_PROGRESS",
		Answers:   map[string]int{},
		CreatedAt: now,
		UpdatedAt: now,
	}

	item, err := attributevalue.MarshalMap(a)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "marshal attempt error")
	}

	_, err = d.DDB.PutItem(c.Context(), &dynamodb.PutItemInput{
		TableName: &d.AttemptTable,
		Item:      item,
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "putitem attempt error: "+err.Error())
	}

	// 3) return
	return c.JSON(fiber.Map{
		"attemptId": a.AttemptID,
		"quizId":    a.QuizID,
		"bundle":    q,
	})
}

func (d *AppDeps) HandleSaveAnswer(c *fiber.Ctx) error {
	attemptID := c.Params("id")
	if attemptID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing attempt id")
	}

	var req saveAnswerReq
	if err := c.BodyParser(&req); err != nil || req.QuestionID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "questionId is required")
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// Update answers map: answers.<questionId> = choice
	_, err := d.DDB.UpdateItem(c.Context(), &dynamodb.UpdateItemInput{
		TableName: &d.AttemptTable,
		Key: map[string]types.AttributeValue{
			"attemptId": &types.AttributeValueMemberS{Value: attemptID},
		},
		UpdateExpression:          awsString("SET #ans.#qid = :c, updatedAt = :u"),
		ExpressionAttributeNames:  map[string]string{"#ans": "answers", "#qid": req.QuestionID},
		ExpressionAttributeValues: map[string]types.AttributeValue{":c": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", req.Choice)}, ":u": &types.AttributeValueMemberS{Value: now}},
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "update attempt error: "+err.Error())
	}

	return c.JSON(fiber.Map{"ok": true})
}

func awsString(s string) *string { return &s }

func (d *AppDeps) HandleSubmitAttempt(c *fiber.Ctx) error {
	attemptID := c.Params("id")
	if attemptID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing attempt id")
	}
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := d.DDB.UpdateItem(c.Context(), &dynamodb.UpdateItemInput{
		TableName: &d.AttemptTable,
		Key: map[string]types.AttributeValue{
			"attemptId": &types.AttributeValueMemberS{Value: attemptID},
		},
		UpdateExpression:         awsString("SET #st = :s, updatedAt = :u"),
		ExpressionAttributeNames: map[string]string{"#st": "status"},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":s": &types.AttributeValueMemberS{Value: "SUBMITTED"},
			":u": &types.AttributeValueMemberS{Value: now},
		},
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "submit error: "+err.Error())
	}
	return c.JSON(fiber.Map{"ok": true, "status": "SUBMITTED"})
}

func (d *AppDeps) HandleGetAttemptByID(c *fiber.Ctx) error {
	attemptID := c.Params("id")
	if attemptID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing attempt id")
	}

	out, err := d.DDB.GetItem(c.Context(), &dynamodb.GetItemInput{
		TableName: &d.AttemptTable,
		Key: map[string]types.AttributeValue{
			"attemptId": &types.AttributeValueMemberS{Value: attemptID},
		},
		ConsistentRead: boolPtr(true),
	})
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "getitem attempt error: "+err.Error())
	}
	if out.Item == nil {
		return fiber.NewError(fiber.StatusNotFound, "attempt not found")
	}

	var a Attempt
	if err := attributevalue.UnmarshalMap(out.Item, &a); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "unmarshal attempt error")
	}

	return c.JSON(a)
}
