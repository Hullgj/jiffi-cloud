package main

//import "fmt"
import "strconv"
import "log"
import "time"
import "math"
import (
	"cloud.google.com/go/datastore"
	"golang.org/x/net/context"
	//	appengine "google.golang.org/appengine/datastore"
)

// STRUCTURES

type Task struct {
	UserID   string `json:"createdById" datastore:"createdById"`
	DoneTime string `datastore:"completedBy"`
	DueTime  string `json:"endTime" datastore:"endTime"`
	id       int64  `json:"id" datastore:"-"`
}

type userScore struct {
	UserID string
	Score  float64
}

// QUERYING DATA FROM THE DATASTORE

func createClient(ctx context.Context) *datastore.Client {
	client, err := datastore.NewClient(ctx, "jiffi-cloud")
	if err != nil {
		log.Fatal("Could not create client : ", err)
	}
	return client
}

func queryData(ctx context.Context, client *datastore.Client) []*Task {
	var tasks []*Task

	query := datastore.NewQuery("task").Limit(50)
	keys, _ := client.GetAll(ctx, query, &tasks)

	for i, key := range keys {
		tasks[i].id = key.ID
	}
	return tasks
}

// MAP REDUCE ALGORITHM

func parseCompletedTime(due string, done string) (time.Time, time.Time) {
	dueTime, _ := time.Parse(time.RFC3339, due+":00+00:00")
	var doneTime time.Time
	if done != "" {
		doneTime, _ = time.Parse("02-01-2006", done)
	} else {
		doneTime = time.Now()
	}
	return dueTime, doneTime
}

func getTimeDifference(dueTime time.Time, doneTime time.Time) float64 {
	diff := dueTime.Sub(doneTime)
	return (diff.Hours() / 24)
}

func mapScore(userScoreMap *map[int64]userScore, tasks []*Task) {
	for _, task := range tasks {
		t, _ := time.Parse(time.RFC3339, task.DueTime+":00+00:00")
		if t.After(time.Now()) && task.DoneTime == "" {
			continue
		}
		var score userScore

		score.UserID = task.UserID
		score.Score = getTimeDifference(parseCompletedTime(task.DueTime, task.DoneTime))
		(*userScoreMap)[task.id] = score
	}
}

func reduce(userScoreMap *map[int64]userScore) map[string]float64 {
	reducedMap := make(map[string]float64, 0)

	for _, v := range *userScoreMap {

		if _, ok := reducedMap[v.UserID]; ok {
			reducedMap[v.UserID] += v.Score
		} else {
			reducedMap[v.UserID] = v.Score
		}
	}

	for i := range reducedMap {
		score := 10 / (1 + (math.Pow(math.E, -0.01*(reducedMap[i]))))
		if score >= 0.1 {
			reducedMap[i] = score
		} else {
			reducedMap[i] = 0
		}
	}
	return reducedMap
}

// UPDATE DATABASE

func addUserScoreToDatabase(client *datastore.Client, ctx context.Context, scores map[string]float64) {
	for key, score := range scores {
		var user userScore
		ID, _ := strconv.ParseInt(key, 10, 64)
		user.UserID = key
		user.Score = score
		dataKey := datastore.IDKey("user", ID, nil)
		if _, err := client.Put(ctx, dataKey, &user); err != nil {
			log.Fatal("Can put to the database")
		}
	}
}

func main() {
	ctx := context.Background()
	client := createClient(ctx)
	tasks := queryData(ctx, client)

	var userScoreMap = make(map[int64]userScore, 0)
	mapScore(&userScoreMap, tasks)
	reducedMap := reduce(&userScoreMap)
	addUserScoreToDatabase(client, ctx, reducedMap)
}
