package util

import (
	"bufio"
	"context"
	"errors"
	"os"
	"strings"
	"time"
)

// ReadAuthTokenFromStdin reads an authorization token from stdin with a 5-second timeout.
// It reads the first line, trims the trailing newline, and returns an error if the timeout
// is exceeded or the read fails. The token is a security credential and must be treated as such.
func ReadAuthTokenFromStdin() (string, error) {
	// Create a context with a 5-second timeout.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Use a channel to handle the read with timeout.
	type result struct {
		token string
		err   error
	}
	resultCh := make(chan result, 1)

	go func() {
		reader := bufio.NewReader(os.Stdin)
		line, err := reader.ReadString('\n')
		if err != nil {
			resultCh <- result{err: err}
			return
		}

		// Trim the newline.
		token := strings.TrimSuffix(line, "\n")
		if token == "" {
			resultCh <- result{err: errors.New("empty token")}
			return
		}

		resultCh <- result{token: token}
	}()

	select {
	case <-ctx.Done():
		return "", errors.New("token read timeout (5s)")
	case res := <-resultCh:
		if res.err != nil {
			return "", res.err
		}
		return res.token, nil
	}
}
