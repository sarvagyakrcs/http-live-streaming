package main

import (
	"fmt"
	"log"
	"net"
	"sarvagyakrcs/GoKafkaPlayground/cmd/config"
	"strconv"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	conn, err := kafka.Dial("tcp", config.BrokerId)
	if err != nil {
		log.Fatalf("Failed to connect to Kafka: %v", err)
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		log.Fatalf("Failed to get controller: %v", err)
	}
	controllerAddr := net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port))
	fmt.Printf("Cluster controller is at %s\n", controllerAddr)

	controllerConn, err := kafka.Dial("tcp", controllerAddr)
	if err != nil {
		log.Fatalf("failed to dial controller: %v", err)
	}
	defer controllerConn.Close()

	controllerConn.SetDeadline(time.Now().Add(10 * time.Second))

	// create topics
	err = controllerConn.CreateTopics(config.Topics...)
	if err != nil {
		log.Fatalf("failed to create topics: %v", err)
	}
	fmt.Println("Topics created successfully")
}
