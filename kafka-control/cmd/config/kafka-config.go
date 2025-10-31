package config

import "github.com/segmentio/kafka-go"

var BrokerId = "localhost:9094"

var Topics = []kafka.TopicConfig{
	{
		Topic:             "test-topic",
		NumPartitions:     1,
		ReplicationFactor: 1,
	},
	{
		Topic:             "test-topic-2",
		NumPartitions:     2,
		ReplicationFactor: 1,
	},
}
