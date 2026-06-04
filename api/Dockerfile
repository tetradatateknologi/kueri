FROM golang:1.22-alpine AS builder

ENV GOTOOLCHAIN=local

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/api ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
  && adduser -D -u 65532 nonroot

COPY --from=builder --chown=nonroot:nonroot /bin/api /bin/api

USER nonroot

EXPOSE 8080

ENTRYPOINT ["/bin/api"]
