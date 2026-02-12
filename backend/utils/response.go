package utils

import (
	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func ResponseOK(c *gin.Context, message string, data interface{}) {
	c.JSON(200, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func ResponseCreated(c *gin.Context, message string, data interface{}) {
	c.JSON(201, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func ResponseBadRequest(c *gin.Context, message string, errors interface{}) {
	c.JSON(400, APIResponse{
		Success: false,
		Message: message,
		Errors:  errors,
	})
}

func ResponseUnauthorized(c *gin.Context, message string) {
	c.JSON(401, APIResponse{
		Success: false,
		Message: message,
	})
}

func ResponseForbidden(c *gin.Context, message string) {
	c.JSON(403, APIResponse{
		Success: false,
		Message: message,
	})
}

func ResponseNotFound(c *gin.Context, message string) {
	c.JSON(404, APIResponse{
		Success: false,
		Message: message,
	})
}

func ResponseInternalError(c *gin.Context, message string) {
	c.JSON(500, APIResponse{
		Success: false,
		Message: message,
	})
}

func ResponsePaginated(c *gin.Context, message string, data interface{}, page, limit int, total int64) {
	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}
	c.JSON(200, PaginatedResponse{
		Success: true,
		Message: message,
		Data:    data,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}