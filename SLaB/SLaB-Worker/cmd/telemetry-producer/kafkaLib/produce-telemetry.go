package kafkaLib

import (
	"context"
	"log"
	"math/rand"
	"strconv"
	"time"

	"github.com/segmentio/kafka-go"
)

func random123() int {
	return rand.Intn(3) // returns 0–2
}

func ProduceTelemetry(writer *kafka.Writer) {
	msg := kafka.Message{
		Key:   []byte(strconv.Itoa(random123())),
		Value: []byte(time.Now().Format(time.RFC3339)),
	}

	err := writer.WriteMessages(context.Background(), msg)
	if err != nil {
		log.Printf("failed to write message %v\n", err)
	}
}
