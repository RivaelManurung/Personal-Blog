// Package validator wraps go-playground/validator with a small helper that
// turns validation failures into a single user-friendly message.
package validator

import (
	"fmt"
	"strings"

	govalidator "github.com/go-playground/validator/v10"
)

var validate = govalidator.New(govalidator.WithRequiredStructEnabled())

// Struct validates s against its `validate` tags. It returns nil on success
// or an error whose message names the first offending field.
func Struct(s any) error {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	var verrs govalidator.ValidationErrors
	if ok := asValidationErrors(err, &verrs); ok && len(verrs) > 0 {
		msgs := make([]string, 0, len(verrs))
		for _, fe := range verrs {
			msgs = append(msgs, describe(fe))
		}
		return fmt.Errorf("%s", strings.Join(msgs, "; "))
	}
	return err
}

func asValidationErrors(err error, target *govalidator.ValidationErrors) bool {
	if verrs, ok := err.(govalidator.ValidationErrors); ok {
		*target = verrs
		return true
	}
	return false
}

func describe(fe govalidator.FieldError) string {
	field := fe.Field()
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, fe.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, fe.Param())
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}
