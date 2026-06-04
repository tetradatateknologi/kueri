package http

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v4"
)

type Response struct {
	Data interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func Success(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, Response{Data: data})
}

func InternalError(c echo.Context, message string, err error) error {
	if err != nil {
		slog.Error(message, "error", err)
	}
	return c.JSON(http.StatusInternalServerError, ErrorResponse{
		Error: ErrorBody{Code: "INTERNAL_ERROR", Message: message},
	})
}
