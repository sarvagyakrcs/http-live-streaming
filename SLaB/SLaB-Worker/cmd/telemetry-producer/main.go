package main

import (
	"DASH/SLaB/worker/cmd/telemetry-producer/kafkaLib"
	"DASH/SLaB/worker/lib"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/segmentio/kafka-go"
)

// KeyToPartitionBalancer maps key value directly to partition number
type KeyToPartitionBalancer struct{}

func (b *KeyToPartitionBalancer) Balance(msg kafka.Message, partitions ...int) int {
	if len(partitions) == 0 {
		return 0
	}
	// Convert key to int and use as partition index
	keyInt, err := strconv.Atoi(string(msg.Key))
	if err != nil || keyInt < 0 || keyInt >= len(partitions) {
		return partitions[0] // fallback to first partition
	}
	return partitions[keyInt]
}

func main() {
	lib.LoadEnv()
	kafkaBrokerId := lib.GetEnv("KAFKA_BROKER_ID")
	const topic = "telmetry"

	writer := &kafka.Writer{
		Addr:     kafka.TCP(kafkaBrokerId),
		Topic:    topic,
		Balancer: &KeyToPartitionBalancer{},

		// --- Key settings for "true" synchronous writes ---
		BatchSize:    1,
		RequiredAcks: kafka.RequireAll,
	}

	defer func() {
		if err := writer.Close(); err != nil {
			log.Fatalf("failed to close writer: %v", err)
		}
		fmt.Println("Writer closed successfully.")
	}()

	// Create a ticker that ticks every 5 milliseconds
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		kafkaLib.ProduceTelemetry(writer)
	}

}
