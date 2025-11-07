package config

import "github.com/segmentio/kafka-go"

var BrokerId = "localhost:9094"

var Topics = []kafka.TopicConfig{
	{
		Topic:             "telmetry",
		NumPartitions:     3,
		ReplicationFactor: 1,
	},
	{
		Topic:             "rankings",
		NumPartitions:     1,
		ReplicationFactor: 1,
	},
}
