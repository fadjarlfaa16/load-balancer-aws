package main

type Quiz struct {
	QuizID    string     `dynamodbav:"quizId" json:"quizId"`
	Title     string     `dynamodbav:"title" json:"title"`
	Questions []Question `dynamodbav:"questions" json:"questions"`
	UpdatedAt string     `dynamodbav:"updatedAt" json:"updatedAt"`
}

type Question struct {
	ID      string   `dynamodbav:"id" json:"id"`
	Text    string   `dynamodbav:"text" json:"text"`
	Options []string `dynamodbav:"options" json:"options"`
	Answer  int      `dynamodbav:"answer" json:"answer"`
}

type Attempt struct {
	AttemptID string         `dynamodbav:"attemptId" json:"attemptId"`
	UserID    string         `dynamodbav:"userId" json:"userId"`
	QuizID    string         `dynamodbav:"quizId" json:"quizId"`
	Status    string         `dynamodbav:"status" json:"status"`
	Answers   map[string]int `dynamodbav:"answers" json:"answers"`
	CreatedAt string         `dynamodbav:"createdAt" json:"createdAt"`
	UpdatedAt string         `dynamodbav:"updatedAt" json:"updatedAt"`
}
