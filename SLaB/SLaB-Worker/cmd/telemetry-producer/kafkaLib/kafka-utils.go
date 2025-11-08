package kafkaLib

import (
	"DASH/SLaB/worker/lib"
	"log"
	"net"
	"strconv"

	"github.com/segmentio/kafka-go"
)

func GetClusterControllerAddress() string {
	lib.LoadEnv()
	conn, err := kafka.Dial("tcp", lib.GetEnv("KAFKA_BROKER_ID"))
	if err != nil {
		log.Fatalf("Failed to connect to Kafka: %v", err)
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		log.Fatalf("Failed to get controller: %v", err)
	}
	controllerAddr := net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port))

	return controllerAddr
}
