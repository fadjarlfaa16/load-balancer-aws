package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type tokenPayload struct {
	Sub string `json:"sub"`
	Exp int64  `json:"exp"`
}

func (d *AppDeps) HandleLogin(c *fiber.Ctx) error {
	var req loginReq
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid json")
	}
	if req.Username != d.AppUser || req.Password != d.AppPass {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
	}

	payload := tokenPayload{
		Sub: req.Username,
		Exp: time.Now().Add(2 * time.Hour).Unix(),
	}
	tok, err := signToken(payload, d.TokenSecret)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "token error")
	}

	return c.JSON(fiber.Map{"token": tok, "expiresInSec": 7200})
}

func (d *AppDeps) RequireAuth(c *fiber.Ctx) error {
	auth := c.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return fiber.NewError(fiber.StatusUnauthorized, "missing bearer token")
	}
	tok := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))

	payload, err := verifyToken(tok, d.TokenSecret)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	if time.Now().Unix() > payload.Exp {
		return fiber.NewError(fiber.StatusUnauthorized, "token expired")
	}

	c.Locals("user", payload.Sub)
	return c.Next()
}

func signToken(p tokenPayload, secret string) (string, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(b)

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payload + "." + sig, nil
}

func verifyToken(token, secret string) (tokenPayload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return tokenPayload{}, fmt.Errorf("bad token format")
	}
	payload, sig := parts[0], parts[1]

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payload))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return tokenPayload{}, fmt.Errorf("bad signature")
	}

	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return tokenPayload{}, err
	}

	var p tokenPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return tokenPayload{}, err
	}
	return p, nil
}
